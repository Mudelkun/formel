import api from './client';
import type { CursorPaginatedResponse } from '@/types/student';

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

export async function listAuditLogs(params: { action?: string; tableName?: string; cursor?: string; limit?: number } = {}): Promise<CursorPaginatedResponse<AuditLog>> {
  const { data } = await api.get('/audit-logs', { params: { limit: 20, ...params } });
  return data;
}
