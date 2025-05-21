// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import {
  auth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
} from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { signOut } from 'firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const loginAnonymously = async (): Promise<void> => {
    try {
      await signInAnonymously(auth);
      setError(null);
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      setError('Anonymous sign-in failed');
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError(null);
    } catch (error: any) {
      console.error('Email sign-in failed:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setError('User or password do not match');
      } else {
        setError('Failed to sign in');
      }
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<void> => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      setError(null);
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setError('Google sign-in failed');
    }
  };

  return {
    user,
    loading,
    error,
    loginAnonymously,
    loginWithEmail,
    loginWithGoogle,
  };
};
