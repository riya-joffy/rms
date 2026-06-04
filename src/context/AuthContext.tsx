'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../lib/firebase/auth';
import { dbService, isFirebaseActive } from '../lib/firebase/db';
import { useRouter } from 'next/navigation';
import { isAdminRole } from '../lib/roles';

interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  refreshUsers: () => void;
  addUser: (userData: Omit<User, 'id'>, password: string) => Promise<void>;
  updateUser: (userId: string, updatedData: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load session and keep user directory in sync (Firestore or localStorage)
  useEffect(() => {
    try {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      setUsers(dbService.getUsers());
    } catch (err) {
      console.error('Failed to load auth session', err);
    } finally {
      setLoading(false);
    }

    const unsubscribeUsers = dbService.subscribeUsers((allUsers) => {
      setUsers(allUsers);
    });

    return () => unsubscribeUsers();
  }, []);

  // Listen for status changes of the logged in user to force instant logout if disabled
  useEffect(() => {
    if (user) {
      const liveUser = users.find((u) => u.id === user.id);
      if (liveUser && liveUser.status === 'disabled') {
        console.log("[AuthContext] Active session user was disabled, forcing logout.");
        logout();
      }
    }
  }, [users, user]);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const authenticatedUser = await authService.login(email, password);
      setUser(authenticatedUser);
      setUsers(dbService.getUsers());
      return authenticatedUser;
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    if (!user || !isAdminRole(user.role)) return;

    const dbUsers = dbService.getUsers();
    const targetUser = dbUsers.find(u => u.id === userId);
    if (!targetUser) return;

    const newStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    await dbService.updateUserStatus(userId, newStatus, user.name);
    if (!isFirebaseActive()) {
      setUsers(dbService.getUsers());
    }
    
    // If the active user has their account disabled, force logout
    if (user.id === userId && newStatus === 'disabled') {
      await logout();
    }
  };

  const refreshUsers = () => {
    setUsers(dbService.getUsers());
  };

  const addUser = async (userData: Omit<User, 'id'>, password: string) => {
    if (!user || !isAdminRole(user.role)) return;
    await dbService.addUser(userData, user.name, password);
    setUsers(dbService.getUsers());
  };

  const updateUser = async (userId: string, updatedData: Partial<User>) => {
    if (!user || !isAdminRole(user.role)) return;
    await dbService.updateUser(userId, updatedData, user.name);
    if (!isFirebaseActive()) {
      setUsers(dbService.getUsers());
    }
  };

  const deleteUser = async (userId: string) => {
    if (!user || !isAdminRole(user.role)) return;
    if (user.id === userId) {
      throw new Error("You cannot delete your own admin account.");
    }
    await dbService.deleteUser(userId, user.name);
    if (!isFirebaseActive()) {
      setUsers(dbService.getUsers());
    }
  };

  const sendPasswordReset = async (email: string) => {
    await authService.sendPasswordReset(email);
  };

  const resendVerificationEmail = async (email: string, password: string) => {
    await authService.resendVerificationEmail(email, password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        loading,
        login,
        logout,
        toggleUserStatus,
        refreshUsers,
        addUser,
        updateUser,
        deleteUser,
        sendPasswordReset,
        resendVerificationEmail
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
