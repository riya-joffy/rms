import { User } from '../../types';
import { dbService } from './db';
import { resolveUserRole, normalizeRole } from '../roles';

// Real Firebase Auth dependencies
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, where, limit } from 'firebase/firestore';
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

          const credentials = (() => {
            try {
              const raw = localStorage.getItem('rms_user_credentials');
              return raw ? (JSON.parse(raw) as Record<string, string>) : {};
            } catch {
              return {};
            }
          })();
          const storedPassword = credentials[email.toLowerCase()];

          if (storedPassword) {
            if (password !== storedPassword) {
              reject(new Error('Invalid email or password.'));
              return;
            }
          } else if (password !== 'password' && password !== 'admin') {
            reject(new Error('Invalid email or password.'));
            return;
          }

          if (user.status === 'disabled') {
            reject(new Error('Your account has been disabled. Contact admin.'));
            return;
          }

          if (user.emailVerified === false) {
            const err = new Error('Your email address is not verified. Please verify your email to log in.');
            (err as any).code = 'auth/email-not-verified';
            reject(err);
            return;
          }

          const sessionUser: User = {
            ...user,
            role: resolveUserRole(user.role, user.email),
            lastActive: new Date().toISOString(),
          };
          const updatedUsers = users.map((u) => (u.id === user.id ? sessionUser : u));
          localStorage.setItem('rms_db_users', JSON.stringify(updatedUsers));
          localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
          
          dbService.addLog({
            userId: sessionUser.id,
            userName: sessionUser.name,
            userRole: sessionUser.role,
            action: 'User Logged In',
            details: `User ${sessionUser.name} (${sessionUser.role}) logged in successfully (Mock Mode).`
          });

          resolve(sessionUser);
        }, 600);
      });
    }

    // LIVE FIREBASE AUTHENTICATION MODE
    console.log("[AuthService] Authenticating via live Firebase Auth...");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser.emailVerified) {
        await firebaseSignOut(auth);
        const err = new Error('Your email address is not verified. Please verify your email to log in.');
        (err as any).code = 'auth/email-not-verified';
        throw err;
      }

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
      const resolvedEmail = (firebaseUser.email || userData.email || '').trim();
      const resolvedRole = resolveUserRole(userData.role, resolvedEmail);

      if (userData.status === 'disabled') {
        await firebaseSignOut(auth);
        throw new Error('Your account has been disabled. Contact admin.');
      }

      const appUser: User = {
        ...userData,
        id: firebaseUser.uid,
        email: resolvedEmail,
        role: resolvedRole,
      };

      // Keep canonical profile at Firebase Auth UID (fixes legacy docs with wrong id/role)
      await setDoc(
        doc(db, 'users', firebaseUser.uid),
        {
          ...appUser,
          lastActive: new Date().toISOString(),
        },
        { merge: true }
      );

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
        if (!dbUser || dbUser.status === 'disabled') {
          localStorage.removeItem(SESSION_KEY);
          return null;
        }
        return dbUser;
      }
      
      return {
        ...sessionUser,
        role: resolveUserRole(sessionUser.role, sessionUser.email),
      };
    } catch {
      return null;
    }
  },

  resendVerificationEmail: async (email: string, password: string): Promise<void> => {
    if (!isFirebaseConfigured()) {
      console.log("[AuthService] Mock Mode: Simulated resending verification email.");
      const users = dbService.getUsers();
      const userIndex = users.findIndex(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (userIndex !== -1) {
        users[userIndex].emailVerified = true;
        localStorage.setItem('rms_db_users', JSON.stringify(users));
      }
      return;
    }
    
    // Live Firebase mode
    try {
      const tempCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(tempCredential.user);
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("[AuthService] Live resend verification email failure:", error);
      throw new Error(error.message || 'Failed to resend verification email.');
    }
  },

  sendPasswordReset: async (email: string): Promise<void> => {
    if (!isFirebaseConfigured()) {
      console.log("[AuthService] Mock Mode: Simulated password reset email to", email);
      const users = dbService.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) {
        throw new Error('A user with this email address was not found.');
      }
      return;
    }

    // Live Firebase mode - Query Firestore to ensure user exists to bypass silent failure
    try {
      const usersByEmailQuery = query(
        collection(db, 'users'),
        where('email', '==', email.trim().toLowerCase()),
        limit(1)
      );
      const usersByEmailSnapshot = await getDocs(usersByEmailQuery);
      if (usersByEmailSnapshot.empty) {
        throw new Error('A user with this email address was not found.');
      }

      await sendPasswordResetEmail(auth, email.trim());
    } catch (error: any) {
      console.error("[AuthService] Reset password failure:", error);
      let errorMsg = error.message || 'Failed to send password reset email.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        errorMsg = 'A user with this email address was not found.';
      }
      throw new Error(errorMsg);
    }
  }
};
