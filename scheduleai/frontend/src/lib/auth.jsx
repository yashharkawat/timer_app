import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function getStoredToken() {
  const t = localStorage.getItem('g-token');
  if (!t || isTokenExpired(t)) {
    localStorage.removeItem('g-token');
    localStorage.removeItem('g-user');
    return null;
  }
  return t;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => {
    if (!getStoredToken()) return null;
    try { return JSON.parse(localStorage.getItem('g-user')); } catch { return null; }
  });

  const signIn = (credential, userInfo) => {
    localStorage.setItem('g-token', credential);
    localStorage.setItem('g-user', JSON.stringify(userInfo));
    setToken(credential);
    setUser(userInfo);
  };

  const signOut = () => {
    localStorage.removeItem('g-token');
    localStorage.removeItem('g-user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, signIn, signOut, isSignedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
