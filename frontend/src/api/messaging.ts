import api from './client';

export async function sendMessage(input: { contactId: string; subject: string; body: string }): Promise<{ success: boolean; to: string }> {
  const { data } = await api.post('/messages/send', input);
  return data;
}

export type RecipientType = 'all' | 'class_group' | 'outstanding_balance';
export type MessageType = 'payment_reminder' | 'custom';

export interface BulkPreviewStudent {
  id: string;
  name: string;
  amountRemaining: number | null;
  contactEmails: string[];
  hasContacts: boolean;
}

export interface BulkPreviewResult {
  totalStudents: number;
  willNotify: number;
  skipped: number;
  students: BulkPreviewStudent[];
}

export interface BulkPreviewParams {
  recipientType: RecipientType;
  classGroupId?: string;
  dueDateBefore?: string;
  sendToAllContacts?: boolean;
}

export interface BulkMessageInput {
  recipients: {
    type: RecipientType;
    classGroupId?: string;
    dueDateBefore?: string;
  };
  message: {
    type: MessageType;
    subject?: string;
    body?: string;
  };
  sendToAllContacts: boolean;
  excludedStudentIds: string[];
}

export interface BulkJobStatus {
  id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  total: number;
  sent: number;
  failed: number;
  startedAt: string;
  finishedAt: string | null;
  errors: { studentName?: string; email?: string; reason: string }[];
}

export async function getBulkPreview(params: BulkPreviewParams): Promise<BulkPreviewResult> {
  const { data } = await api.get('/messages/bulk-preview', {
    params: {
      ...params,
      sendToAllContacts: params.sendToAllContacts ? 'true' : 'false',
    },
  });
  return data;
}

export async function sendBulkMessages(input: BulkMessageInput): Promise<{ jobId: string }> {
  const { data } = await api.post('/messages/send-bulk', input);
  return data;
}

export async function getBulkJobStatus(jobId: string): Promise<BulkJobStatus> {
  const { data } = await api.get(`/messages/bulk-status/${jobId}`);
  return data;
}

export async function sendStudentPaymentReminder(studentId: string): Promise<{ success: boolean; to: string }> {
  const { data } = await api.post(`/messages/send-payment-reminder/${studentId}`);
  return data;
}
