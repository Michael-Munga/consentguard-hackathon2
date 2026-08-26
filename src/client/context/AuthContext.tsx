import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Pillar, StaffRole } from '../../types/index.js';

export type UserRole = 'beneficiary' | 'compliance_officer' | 'field_officer' | 'analyst';

export interface BeneficiaryUser {
  id: string;
  name: string;
  email?: string | null;
  pillar: Pillar;
  county?: string;
  region: string;
  applied_at: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  pillar_scope: Pillar | null;
}

export type AuthUser = (BeneficiaryUser & { userType: 'beneficiary' }) | (StaffUser & { userType: 'staff' });

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  pillarScope: Pillar | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginBeneficiary: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginStaff: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateStaffProfile: (name: string, email: string) => Promise<{ success: boolean; error?: string }>;
  switchDemoRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'consentguard_token';
const USER_STORAGE_KEY = 'consentguard_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore token and validate session on initial load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Validate token with backend
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          if (res.ok) {
            const data = await res.json();
            if (data.type === 'beneficiary') {
              const u: AuthUser = { ...data.user, userType: 'beneficiary' };
              setUser(u);
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
            } else if (data.type === 'staff') {
              const u: AuthUser = { ...data.user, userType: 'staff' };
              setUser(u);
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
            }
          } else {
            // Token expired or invalid
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
            setToken(null);
          }
        } catch {
          // Network error or invalid storage
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const loginBeneficiary = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/beneficiary/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      const authUser: AuthUser = { ...data.beneficiary, userType: 'beneficiary' };
      setToken(data.token);
      setUser(authUser);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const loginStaff = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      const authUser: AuthUser = { ...data.staff, userType: 'staff' };
      setToken(data.token);
      setUser(authUser);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const updateStaffProfile = async (name: string, email: string): Promise<{ success: boolean; error?: string }> => {
    if (!token || user?.userType !== 'staff') {
      return { success: false, error: 'Staff session required' };
    }

    try {
      const res = await fetch('/api/staff/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Update failed' };
      }

      const updatedUser: AuthUser = { ...data.staff, userType: 'staff' };
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  // Demo Switcher Helper for instant 1-click evaluation
  const switchDemoRole = async (targetRole: UserRole) => {
    if (targetRole === 'beneficiary') {
      await loginBeneficiary('INK-84920', 'Passphrase123!');
    } else if (targetRole === 'compliance_officer') {
      await loginStaff('compliance@inuka.kpc.co.ke', 'Password123!');
    } else if (targetRole === 'field_officer') {
      await loginStaff('field.scholarship@inuka.kpc.co.ke', 'Password123!');
    } else if (targetRole === 'analyst') {
      await loginStaff('analyst@inuka.kpc.co.ke', 'Password123!');
    }
  };

  const role: UserRole | null = user
    ? user.userType === 'beneficiary'
      ? 'beneficiary'
      : user.role
    : null;

  const pillarScope: Pillar | null = user?.userType === 'staff' ? user.pillar_scope : (user?.pillar || null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        pillarScope,
        isAuthenticated: Boolean(user && token),
        isLoading,
        loginBeneficiary,
        loginStaff,
        logout,
        updateStaffProfile,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
