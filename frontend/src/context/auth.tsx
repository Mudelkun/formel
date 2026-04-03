import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type User, loginApi, verifyDeviceApi, refreshApi, logoutApi, isVerificationRequired } from '@/api/auth';
import { setAccessToken } from '@/api/client';

interface PendingVerification {
  sessionToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  pendingVerification: PendingVerification | null;
  login: (email: string, password: string) => Promise<void>;
  verifyDevice: (code: string) => Promise<void>;
  cancelVerification: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  useEffect(() => {
    refreshApi()
      .then(({ accessToken, user }) => {
        setAccessToken(accessToken);
        setUser(user);
      })
      .catch(() => {
        // No valid refresh token — stay logged out
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginApi(email, password);
    if (isVerificationRequired(result)) {
      setPendingVerification({ sessionToken: result.sessionToken });
      return;
    }
    setAccessToken(result.accessToken);
    setUser(result.user);
  }, []);

  const verifyDevice = useCallback(async (code: string) => {
    if (!pendingVerification) throw new Error('No pending verification');
    const { accessToken, user } = await verifyDeviceApi(pendingVerification.sessionToken, code);
    setPendingVerification(null);
    setAccessToken(accessToken);
    setUser(user);
  }, [pendingVerification]);

  const cancelVerification = useCallback(() => {
    setPendingVerification(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, pendingVerification, login, verifyDevice, cancelVerification, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
