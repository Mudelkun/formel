import api from './client';

export interface SchoolSettings {
  id: string;
  schoolName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpdateSettingsInput {
  schoolName?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  currency?: string;
}

export async function getSettings(): Promise<SchoolSettings> {
  const { data } = await api.get('/settings');
  return data;
}

export async function updateSettings(input: UpdateSettingsInput): Promise<SchoolSettings> {
  const { data } = await api.patch('/settings', input);
  return data;
}
