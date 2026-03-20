import api from './client';
import type { PaginatedResponse } from '@/types/student';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string | null;
  action: string;
  tableName: string;
  recordId: string | null;
  oldData: unknown;
  newData: unknown;
  createdAt: string;
}

export async function listAuditLogs(params: { action?: string; tableName?: string; page?: number; limit?: number } = {}): Promise<PaginatedResponse<AuditLog>> {
  const { data } = await api.get('/audit-logs', { params: { limit: 20, ...params } });
  return data;
}
