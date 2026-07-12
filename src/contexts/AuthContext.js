import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  changeCurrentUserPassword,
  loginWithEmail,
  logout as firebaseLogout,
  reauthenticateWithPassword,
  registerWithEmail,
  subscribeToAuthChanges,
} from '../services/firebase/authService';
import { ensureUserProfile } from '../services/firebase/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileReadyUid, setProfileReadyUid] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setUser(nextUser);
      setProfileReadyUid((currentUid) =>
        currentUid === nextUser?.uid ? currentUid : null
      );
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setProfileLoading(false);
      return;
    }

    let isCurrent = true;
    setProfileLoading(true);
    ensureUserProfile(user.uid, {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
    })
      .catch((error) => {
        console.warn('Failed to initialize user profile.', error);
      })
      .finally(() => {
        if (isCurrent) {
          setProfileReadyUid(user.uid);
          setProfileLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [user?.displayName, user?.email, user?.uid]);

  async function login(email, password) {
    return loginWithEmail(email, password);
  }

  async function register(email, password) {
    return registerWithEmail(email, password);
  }

  async function logout() {
    await firebaseLogout();
  }

  async function changePassword(currentPassword, newPassword) {
    return changeCurrentUserPassword(currentPassword, newPassword);
  }

  async function confirmPassword(password) {
    return reauthenticateWithPassword(password);
  }

  const value = useMemo(
    () => {
      const waitingForProfile =
        Boolean(user?.uid) && profileReadyUid !== user.uid;

      return {
        user,
        loading: loading || profileLoading || waitingForProfile,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        changePassword,
        confirmPassword,
      };
    },
    [loading, profileLoading, profileReadyUid, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
