// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import {
  auth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
} from '../firebaseConfig';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

const ERROR_MESSAGES = {
  anonymous: 'Anonymous sign-in failed',
  email: 'User or password do not match',
  google: 'Google sign-in failed',
  default: 'Failed to sign in',
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  const loginAnonymously = useCallback(async (): Promise<void> => {
    try {
      await signInAnonymously(auth);
      setError(null);
    } catch (error: any) {
      console.error('Anonymous sign-in failed:', error.code, error.message);
      setError(ERROR_MESSAGES.anonymous);
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError(null);
    } catch (error: any) {
      console.error('Email sign-in failed:', error.code, error.message);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setError(ERROR_MESSAGES.email);
      } else {
        setError(ERROR_MESSAGES.default);
      }
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<void> => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      setError(null);
    } catch (error: any) {
      console.error('Google sign-in failed:', error.code, error.message);
      setError(ERROR_MESSAGES.google);
    }
  }, []);

  return {
    user,
    loading,
    error,
    loginAnonymously,
    loginWithEmail,
    loginWithGoogle,
    logout,
  };
};
