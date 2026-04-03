import api from './client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'secretary' | 'teacher' | 'accountant';
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

interface VerificationRequiredResponse {
  requiresVerification: true;
  sessionToken: string;
}

export type LoginApiResponse = AuthResponse | VerificationRequiredResponse;

export function isVerificationRequired(res: LoginApiResponse): res is VerificationRequiredResponse {
  return (res as VerificationRequiredResponse).requiresVerification === true;
}

export async function loginApi(email: string, password: string): Promise<LoginApiResponse> {
  const { data } = await api.post<LoginApiResponse>('/auth/login', { email, password });
  return data;
}

export async function verifyDeviceApi(sessionToken: string, code: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/verify-device', { sessionToken, code });
  return data;
}

export async function refreshApi(): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/refresh');
  return data;
}

export async function logoutApi(): Promise<void> {
  await api.post('/auth/logout');
}
