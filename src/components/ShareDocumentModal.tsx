import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import Button from './Button';
import { emailService, DocType } from '@/services/emailService';

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: DocType;
  docId: string | number;
  docLabel: string;           // e.g. "Quote-001" or "Invoice-INV-002"
  defaultEmail?: string;      // pre-fill customer/vendor email
  onSuccess?: () => void;
}

const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
  isOpen,
  onClose,
  docType,
  docId,
  docLabel,
  defaultEmail = '',
  onSuccess,
}) => {
  const [to, setTo] = useState(defaultEmail);
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(`${docLabel} from Vegnar Global`);
  const [message, setMessage] = useState(`Please find the attached document: ${docLabel}.\n\nRegards,\nVegnar Global Team`);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setTo(defaultEmail);
    setCc('');
    setSubject(`${docLabel} from Vegnar Global`);
    setMessage(`Please find the attached document: ${docLabel}.\n\nRegards,\nVegnar Global Team`);
  }, [defaultEmail, docLabel, docId]);

  const handleSend = async () => {
    if (!to.trim()) return toast.error('Recipient email is required');
    if (!subject.trim()) return toast.error('Subject is required');

    setSending(true);
    try {
      await emailService.sendDocument({ to: to.trim(), cc: cc.trim() || undefined, subject, message, docType, docId });
      toast.success(`${docLabel} sent to ${to}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share ${docLabel} via Email`} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">CC</label>
          <input
            type="email"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc@example.com"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Subject <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} loading={sending}>
            <Mail className="h-4 w-4 mr-1" /> Send
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareDocumentModal;
