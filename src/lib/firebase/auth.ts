import { User } from '../../types';
import { dbService } from './db';

// Real Firebase Auth dependencies
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, updateDoc, where, limit } from 'firebase/firestore';
import { auth, db } from './firebase';

const SESSION_KEY = 'rms_auth_session';

// Helper to determine if real Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  return !!apiKey && apiKey !== 'YOUR_API_KEY_HERE';
};

export const authService = {
  /**
   * Log in user - supports real Firebase Auth and Local Fallback
   */
  login: async (email: string, password: string): Promise<User> => {
    if (!isFirebaseConfigured()) {
      // FALLBACK TO MOCK LOCAL STORAGE
      console.log("[AuthService] Running in Mock Local Storage Fallback Mode.");
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = dbService.getUsers();
          const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

          if (!user) {
            reject(new Error('Invalid email or password.'));
            return;
          }

          if (password !== 'password' && password !== 'admin') {
            reject(new Error('Invalid credentials. Password is "password".'));
            return;
          }

          if (user.status === 'suspended') {
            reject(new Error('Your account is suspended. Please contact your system administrator.'));
            return;
          }

          user.lastActive = new Date().toISOString();
          const updatedUsers = users.map(u => u.id === user.id ? user : u);
          localStorage.setItem('rms_db_users', JSON.stringify(updatedUsers));
          localStorage.setItem(SESSION_KEY, JSON.stringify(user));
          
          dbService.addLog({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: 'User Logged In',
            details: `User ${user.name} (${user.role}) logged in successfully (Mock Mode).`
          });

          resolve(user);
        }, 600);
      });
    }

    // LIVE FIREBASE AUTHENTICATION MODE
    console.log("[AuthService] Authenticating via live Firebase Auth...");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;

      // Fetch accompanying role and account details from Firestore 'users' collection
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      let userDocSnap = await getDoc(userDocRef);
      let resolvedUserDocId = firebaseUser.uid;

      if (!userDocSnap.exists() && firebaseUser.email) {
        const usersByEmailQuery = query(
          collection(db, 'users'),
          where('email', '==', firebaseUser.email),
          limit(1)
        );
        const usersByEmailSnapshot = await getDocs(usersByEmailQuery);

        if (!usersByEmailSnapshot.empty) {
          userDocSnap = usersByEmailSnapshot.docs[0];
          resolvedUserDocId = userDocSnap.id;
          console.warn('[AuthService] Firebase user profile found by email fallback under users/', resolvedUserDocId);
        }
      }

      if (!userDocSnap.exists()) {
        await firebaseSignOut(auth);
        throw new Error('Your user profile was not found in Firestore users/. Add a users/{uid} document or a matching email record.');
      }

      const userData = userDocSnap.data() as Omit<User, 'id'>;

      if (userData.status === 'suspended') {
        await firebaseSignOut(auth);
        throw new Error('Your account is suspended. Please contact your system administrator.');
      }

      const appUser: User = {
        ...userData,
        id: resolvedUserDocId,
      };

      // Record activity and last active timestamp in live Firestore
      const lastActiveUserDocRef = doc(db, 'users', resolvedUserDocId);
      await updateDoc(lastActiveUserDocRef, {
        lastActive: new Date().toISOString()
      });

      // Cache session in LocalStorage for sync dashboard checks
      localStorage.setItem(SESSION_KEY, JSON.stringify(appUser));

      // Log in system logs
      await dbService.addLog({
        userId: appUser.id,
        userName: appUser.name,
        userRole: appUser.role,
        action: 'User Logged In',
        details: `User ${appUser.name} (${appUser.role}) logged in successfully via Firebase Auth.`
      });

      return appUser;
    } catch (error: any) {
      console.error("[AuthService] Live login failure:", error);
      let errorMsg = error.message || 'Authentication failed.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = 'Invalid email address or password combination.';
      }
      throw new Error(errorMsg);
    }
  },

  /**
   * Log out user - clears sessions and authentications
   */
  logout: async (): Promise<void> => {
    const currentUser = authService.getCurrentUser();
    
    if (currentUser) {
      try {
        await dbService.addLog({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'User Logged Out',
          details: `User ${currentUser.name} (${currentUser.role}) logged out.`
        });
      } catch (e) {
        console.warn("Log tracking failed on logout", e);
      }
    }

    localStorage.removeItem(SESSION_KEY);

    if (isFirebaseConfigured()) {
      await firebaseSignOut(auth);
    }
  },

  /**
   * Returns active cached session user
   */
  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (!session) return null;
      
      const sessionUser = JSON.parse(session) as User;
      
      // If mock, we verify against local database
      if (!isFirebaseConfigured()) {
        const users = dbService.getUsers();
        const dbUser = users.find(u => u.id === sessionUser.id);
        if (!dbUser || dbUser.status === 'suspended') {
          localStorage.removeItem(SESSION_KEY);
          return null;
        }
        return dbUser;
      }
      
      return sessionUser;
    } catch {
      return null;
    }
  }
};
