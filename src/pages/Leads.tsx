import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Globe, User, X, GripVertical, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLeads, createLead, updateLead, deleteLead, clearError } from '@/slices/leadSlice';
import { Lead } from '@/types';
import { formatDate } from '@/utils';
import Button from '@/components/Button';
import Modal from '@/components/Modal';

const STAGES: { key: Lead['status']; label: string; color: string; headerColor: string }[] = [
  { key: 'new', label: 'New', color: 'bg-blue-50 border-blue-200', headerColor: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-yellow-50 border-yellow-200', headerColor: 'bg-yellow-500' },
  { key: 'converted', label: 'Converted', color: 'bg-green-50 border-green-200', headerColor: 'bg-green-500' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-50 border-red-200', headerColor: 'bg-red-500' },
];

const FORM_TYPE_COLORS: Record<string, string> = {
  ContactForm: 'bg-purple-100 text-purple-700',
  PartnerForm: 'bg-indigo-100 text-indigo-700',
  PartnerFormNew: 'bg-indigo-100 text-indigo-700',
  QuoteCartForm: 'bg-orange-100 text-orange-700',
  Manual: 'bg-gray-100 text-gray-700',
};

const EMPTY_FORM = { name: '', email: '', phone: '', company: '', country: '', message: '' };

const Leads: React.FC = () => {
  const dispatch = useAppDispatch();
  const { leads, loading, error } = useAppSelector((state) => state.leads);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [viewLead, setViewLead] = useState<Lead | null>(null);

  const dragLeadId = useRef<string | null>(null);
  const dragOverStage = useRef<Lead['status'] | null>(null);

  useEffect(() => {
    dispatch(fetchLeads({ page: 1, limit: 200 }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const filtered = search
    ? leads.filter(
        (l) =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.email?.toLowerCase().includes(search.toLowerCase()) ||
          l.company?.toLowerCase().includes(search.toLowerCase())
      )
    : leads;

  const byStage = (status: Lead['status']) => filtered.filter((l) => l.status === status);

  // ── Drag & Drop ──────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, leadId: string) => {
    dragLeadId.current = leadId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, stage: Lead['status']) => {
    e.preventDefault();
    dragOverStage.current = stage;
  };

  const onDrop = async (e: React.DragEvent, stage: Lead['status']) => {
    e.preventDefault();
    const id = dragLeadId.current;
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === stage) return;
    try {
      await dispatch(updateLead({ id, data: { status: stage } })).unwrap();
      toast.success(`Moved to ${stage}`);
    } catch {
      // handled by redux
    }
    dragLeadId.current = null;
    dragOverStage.current = null;
  };

  // ── Manual Add ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSubmitting(true);
    try {
      await dispatch(createLead(form)).unwrap();
      toast.success('Lead added');
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch {
      // handled by redux
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!window.confirm(`Delete lead "${lead.name}"?`)) return;
    try {
      await dispatch(deleteLead(lead.id)).unwrap();
      toast.success('Lead deleted');
    } catch {
      // handled by redux
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">{leads.length} total leads</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-sm w-48"
          />
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex justify-center py-20 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {STAGES.map((stage) => {
            const stageLeads = byStage(stage.key);
            return (
              <div
                key={stage.key}
                className={`rounded-xl border-2 ${stage.color} flex flex-col min-h-[200px]`}
                onDragOver={(e) => onDragOver(e, stage.key)}
                onDrop={(e) => onDrop(e, stage.key)}
              >
                {/* Column Header */}
                <div className={`${stage.headerColor} rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                  <span className="text-white font-semibold text-sm">{stage.label}</span>
                  <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-2 flex-1">
                  {stageLeads.length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-6">Drop here</div>
                  )}
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, lead.id)}
                      className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    >
                      {/* Card Top */}
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <GripVertical className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                          <span className="font-medium text-sm text-gray-900 truncate">{lead.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewLead(lead); }}
                            className="text-gray-300 hover:text-blue-500 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Source Badge */}
                      <div className="flex items-center gap-1 mb-2">
                        {lead.source === 'website' ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                            <Globe className="h-3 w-3" /> Website
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            <User className="h-3 w-3" /> Manual
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FORM_TYPE_COLORS[lead.formType] || 'bg-gray-100 text-gray-600'}`}>
                          {lead.formType}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-0.5 text-xs text-gray-500">
                        {lead.email && <div className="truncate">✉ {lead.email}</div>}
                        {lead.phone && <div>📞 {lead.phone}</div>}
                        {lead.company && <div className="truncate">🏢 {lead.company}</div>}
                        {lead.country && <div>🌍 {lead.country}</div>}
                        {lead.message && (
                          <div className="mt-1 text-gray-400 italic line-clamp-2">"{lead.message}"</div>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-gray-300">{formatDate(lead.createdAt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Lead Modal */}
      <Modal isOpen={!!viewLead} onClose={() => setViewLead(null)} title="Lead Details">
        {viewLead && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {viewLead.source === 'website' ? (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  <Globe className="h-3 w-3" /> Website
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  <User className="h-3 w-3" /> Manual
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FORM_TYPE_COLORS[viewLead.formType] || 'bg-gray-100 text-gray-600'}`}>
                {viewLead.formType}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 capitalize">
                {viewLead.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-700">
              <div><span className="text-gray-400 text-xs block">Name</span>{viewLead.name}</div>
              {viewLead.email && <div><span className="text-gray-400 text-xs block">Email</span>{viewLead.email}</div>}
              {viewLead.phone && <div><span className="text-gray-400 text-xs block">Phone</span>{viewLead.phone}</div>}
              {viewLead.company && <div><span className="text-gray-400 text-xs block">Company</span>{viewLead.company}</div>}
              {viewLead.country && <div><span className="text-gray-400 text-xs block">Country</span>{viewLead.country}</div>}
              <div><span className="text-gray-400 text-xs block">Created</span>{formatDate(viewLead.createdAt)}</div>
            </div>
            {viewLead.message && (
              <div>
                <span className="text-gray-400 text-xs block mb-1">Message</span>
                <p className="text-gray-700 bg-gray-50 rounded p-2 text-sm italic">"{viewLead.message}"</p>
              </div>
            )}
            <div className="flex justify-end pt-1">
              <Button variant="ghost" onClick={() => setViewLead(null)}><X className="h-4 w-4 mr-1" /> Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Lead Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setForm(EMPTY_FORM); }} title="Add Lead Manually">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input className="input w-full" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input className="input w-full" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input className="input w-full" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="India" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea className="input w-full resize-none" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Notes or message..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Add Lead'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Leads;
