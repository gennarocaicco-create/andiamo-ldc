import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined); // undefined = pas encore su
  const [profile, setProfile] = useState(null); // document users/{uid}

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) setProfile(null);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return undefined;
    const unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
      setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return unsubscribeProfile;
  }, [firebaseUser]);

  const loading = firebaseUser === undefined;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  const isOwner = profile?.role === 'owner';

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, isAdmin, isOwner }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return context;
}
