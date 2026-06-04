import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, sendEmailVerification } from 'firebase/auth';

/**
 * Creates a Firebase Auth account using a secondary app instance
 * so the currently logged-in admin session is not replaced.
 */
export async function createAuthUser(email: string, password: string): Promise<string> {
  const config = getApp().options;
  const secondaryApp =
    getApps().find((app) => app.name === 'Secondary') ?? initializeApp(config, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    const uid = credential.user.uid;
    
    // Automatically trigger verification email
    try {
      await sendEmailVerification(credential.user);
      console.log('[Auth] Sent Firebase verification email to', email);
    } catch (verifError) {
      console.error('[Auth] Failed to send verification email during creation:', verifError);
    }

    await signOut(secondaryAuth);
    return uid;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/email-already-in-use') {
      throw new Error('A user with this email already exists.');
    }
    if (code === 'auth/weak-password') {
      throw new Error('Password is too weak. Use at least 6 characters.');
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    }
    const message = error instanceof Error ? error.message : 'Failed to create login account.';
    throw new Error(message);
  }
}
