import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseWorker } from './supabase';

export interface AuthUser {
  id: number;
  mobile: string;
  name: string;
  role: 'admin' | 'worker';
  device_id?: string;
  is_active: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (mobile: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  sendOTP: (mobile: string) => Promise<void>;
  verifyOTP: (mobile: string, otp: string) => Promise<void>;
  setPIN: (pin: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('authToken');

      if (userJson && token) {
        setUser(JSON.parse(userJson));
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (mobile: string) => {
    try {
      await supabaseWorker.sendOTP(mobile);
    } catch (error) {
      throw error;
    }
  };

  const verifyOTP = async (mobile: string, otp: string) => {
    try {
      const otpRecord = await supabaseWorker.verifyOTP(mobile, otp);
      // Get or create user
      const userData = await supabaseWorker.getOrCreateUser(mobile, mobile);
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('authToken', `token_${userData.id}`);
    } catch (error) {
      throw error;
    }
  };

  const setPIN = async (pin: string) => {
    if (!user) throw new Error('No user logged in');
    try {
      // In a real app, this would hash the PIN and store it securely
      await AsyncStorage.setItem(`pin_${user.id}`, pin);
    } catch (error) {
      throw error;
    }
  };

  const login = async (mobile: string, pin: string) => {
    try {
      // Verify PIN
      const storedPin = await AsyncStorage.getItem(`pin_${mobile}`);
      if (storedPin !== pin) {
        throw new Error('Invalid PIN');
      }

      const userData = await supabaseWorker.getOrCreateUser(mobile, mobile);
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('authToken', `token_${userData.id}`);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('authToken');
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    sendOTP,
    verifyOTP,
    setPIN,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
