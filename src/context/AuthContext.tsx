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
  toggleUserStatus: (userId: string) => void;
  refreshUsers: () => void;
  addUser: (userData: Omit<User, 'id'>, password: string) => Promise<void>;
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

  const toggleUserStatus = (userId: string) => {
    if (!user || !isAdminRole(user.role)) return;

    const dbUsers = dbService.getUsers();
    const targetUser = dbUsers.find(u => u.id === userId);
    if (!targetUser) return;

    const newStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    dbService.updateUserStatus(userId, newStatus, user.name);
    if (!isFirebaseActive()) {
      setUsers(dbService.getUsers());
    }
    
    // If the active user has their account suspended, force logout
    if (user.id === userId && newStatus === 'suspended') {
      logout();
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
        addUser
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
