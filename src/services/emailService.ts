import api from '@/utils/api';

export type DocType =
  | 'quote'
  | 'invoice'
  | 'salesOrder'
  | 'purchaseOrder'
  | 'orderDispatch'
  | 'paymentMade'
  | 'paymentReceived';

export interface SendDocumentPayload {
  to: string;
  cc?: string;
  subject: string;
  message?: string;
  docType: DocType;
  docId: string | number;
}

export interface SendLedgerPayload {
  to: string;
  cc?: string;
  subject: string;
  message?: string;
  ledgerType: 'customer' | 'vendor';
  entityId: string | number;
  startDate?: string;
  endDate?: string;
}

export const emailService = {
  sendDocument: async (payload: SendDocumentPayload) => {
    const response = await api.post('/email/send-document', payload);
    return response.data;
  },
  sendLedger: async (payload: SendLedgerPayload) => {
    const response = await api.post('/email/send-ledger', payload);
    return response.data;
  },
};
