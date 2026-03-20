import api from './client';

export async function sendMessage(input: { contactId: string; subject: string; body: string }): Promise<{ success: boolean; to: string }> {
  const { data } = await api.post('/messages/send', input);
  return data;
}
