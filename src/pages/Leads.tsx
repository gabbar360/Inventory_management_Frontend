import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Globe, User, X, GripVertical, Eye,
  Search, Mail, Phone, Building2, MapPin, Calendar,
  TrendingUp, Users, CheckCircle2, XCircle, Briefcase,
  MessageSquare, ChevronDown, Sparkles, ArrowUpRight,
  LayoutDashboard, List, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLeads, createLead, updateLead, deleteLead, clearError } from '@/slices/leadSlice';
import { Lead } from '@/types';
import { formatDate } from '@/utils';
import Modal from '@/components/Modal';
import Table from '@/components/Table';

// ── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string) => {
  return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'L';
};

// ── Stage Config (Professional Enterprise Color Scheme) ────────────────────
const STAGES: {
  key: Lead['status'];
  label: string;
  icon: React.ReactNode;
  solid: string;
  lightBg: string;
  border: string;
  dot: string;
  count_bg: string;
}[] = [
  {
    key: 'new',
    label: 'New Lead',
    icon: <Sparkles className="h-4 w-4" />,
    solid: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
    count_bg: 'bg-blue-50 text-blue-700',
  },
  {
    key: 'contacted',
    label: 'In Discussion',
    icon: <MessageSquare className="h-4 w-4" />,
    solid: 'bg-amber-600',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-600',
    count_bg: 'bg-amber-50 text-amber-700',
  },
  {
    key: 'converted',
    label: 'Won',
    icon: <CheckCircle2 className="h-4 w-4" />,
    solid: 'bg-emerald-600',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600',
    count_bg: 'bg-emerald-50 text-emerald-700',
  },
  {
    key: 'rejected',
    label: 'Lost',
    icon: <XCircle className="h-4 w-4" />,
    solid: 'bg-slate-600',
    lightBg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'bg-slate-600',
    count_bg: 'bg-slate-50 text-slate-700',
  },
];

const FORM_TYPE_COLORS: Record<string, string> = {
  ContactForm: 'bg-purple-50 text-purple-700 border border-purple-200',
  PartnerForm: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  PartnerFormNew: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  QuoteCartForm: 'bg-orange-50 text-orange-700 border border-orange-200',
  Manual: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const STATUS_OPTIONS: Lead['status'][] = ['new', 'contacted', 'converted', 'rejected'];
const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));
const EMPTY_FORM = { name: '', email: '', phone: '', company: '', country: '', message: '' };

// ── Summary Stats Card ────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  highlightClass: string;
  pct?: string;
}> = ({ icon, label, value, highlightClass, pct }) => (
  <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-5 flex items-center gap-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 group">
    <div className={`w-12 h-12 rounded-lg ${highlightClass} flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:-translate-y-0.5 transition-transform duration-300`}>
      {icon}
    </div>
    <div className="min-w-0 z-10 flex-1">
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
    </div>
    {pct && (
      <div className="ml-auto flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold z-10 border border-emerald-100">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {pct}
      </div>
    )}
  </div>
);

// ── Lead Card ────────────────────────────────────────────────────────────────
const LeadCard: React.FC<{
  lead: Lead;
  onView: (l: Lead) => void;
  onDelete: (l: Lead) => void;
  onStatusChange: (l: Lead, s: Lead['status']) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}> = ({ lead, onView, onDelete, onStatusChange, onDragStart }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const stage = STAGE_MAP[lead.status];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-grab active:cursor-grabbing"
    >
      {/* Top Accent line - Professional solid color */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${stage.solid} rounded-t-lg opacity-90`} />

      <div className="p-4 pt-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="cursor-move text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className={`w-9 h-9 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0 ${stage.solid}`}>
              {getInitials(lead.name)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate leading-tight group-hover:text-blue-700 transition-colors">{lead.name}</p>
              {lead.company && (
                <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3 flex-shrink-0 text-gray-400" />
                  {lead.company}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onView(lead); }} className="p-1.5 rounded-md text-gray-400 hover:text-slate-800 hover:bg-slate-100 transition-all" title="View details">
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(lead); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete Lead">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {lead.source === 'website' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
              <Globe className="h-3 w-3" /> Website
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
              <User className="h-3 w-3" /> Manual
            </span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${FORM_TYPE_COLORS[lead.formType] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
            {lead.formType}
          </span>
        </div>

        {/* Contact Details */}
        {(lead.email || lead.phone) && (
          <div className="space-y-1.5 mb-4 p-2.5 bg-gray-50 rounded-md border border-gray-100">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-700 transition-colors truncate">
                <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-700 transition-colors">
                <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                {lead.phone}
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
            <Calendar className="h-3 w-3 text-gray-400" />
            {formatDate(lead.createdAt)}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors hover:shadow-sm ${stage.count_bg} ${stage.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
              {stage.label}
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>
            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                <div className="absolute right-0 bottom-full mb-2 z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden w-40 animate-in fade-in zoom-in-95 origin-bottom-right">
                  {STATUS_OPTIONS.filter((s) => s !== lead.status).map((s) => {
                    const st = STAGE_MAP[s];
                    return (
                      <button
                        key={s}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-slate-50 transition-colors text-left"
                        onClick={() => { onStatusChange(lead, s); setShowStatusMenu(false); }}
                      >
                        <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const Leads: React.FC = () => {
  const dispatch = useAppDispatch();
  const { leads, loading, error } = useAppSelector((state) => state.leads);

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Lead['status'] | null>(null);
  const [filterSource, setFilterSource] = useState<string>('all');

  const dragLeadId = useRef<string | null>(null);

  useEffect(() => {
    dispatch(fetchLeads({ page: 1, limit: 500 }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const filtered = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase());
    const matchesSource = filterSource === 'all' || l.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const byStage = (status: Lead['status']) => filtered.filter((l) => l.status === status);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, leadId: string) => {
    dragLeadId.current = leadId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, stage: Lead['status']) => {
    e.preventDefault();
    setDragOverCol(stage);
  };

  const onDragLeave = () => setDragOverCol(null);

  const onDrop = async (e: React.DragEvent, stage: Lead['status']) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = dragLeadId.current;
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === stage) return;
    try {
      await dispatch(updateLead({ id, data: { status: stage } })).unwrap();
      toast.success(`Moved to ${STAGE_MAP[stage].label}`);
    } catch {
      // handled by redux
    }
    dragLeadId.current = null;
  };

  // ── Status Quick Change ──────────────────────────────────────────────────────
  const handleStatusChange = async (lead: Lead, status: Lead['status']) => {
    try {
      await dispatch(updateLead({ id: lead.id, data: { status } })).unwrap();
      toast.success(`Moved to ${STAGE_MAP[status].label}`);
    } catch { /* handled */ }
  };

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSubmitting(true);
    try {
      await dispatch(createLead(form)).unwrap();
      toast.success('Lead added successfully');
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!window.confirm(`Are you certain you want to delete lead "${lead.name}"?`)) return;
    try {
      await dispatch(deleteLead(lead.id)).unwrap();
      toast.success('Lead deleted');
    } catch { /* handled */ }
  };

  // ── Metrics ──────────────────────────────────────────────────────────────────
  const convertedCount = leads.filter((l) => l.status === 'converted').length;
  const conversionRate = leads.length > 0 ? Math.round((convertedCount / leads.length) * 100) : 0;

  // ── Table Columns ────────────────────────────────────────────────────────────
  const tableColumns = [
    {
      key: 'name',
      title: 'Lead Information',
      render: (_: any, lead: Lead) => {
        const bg = STAGE_MAP[lead.status]?.solid || 'bg-gray-500';
        return (
          <div className="flex items-center gap-3 py-1">
            <div className={`w-9 h-9 rounded-md ${bg} flex items-center justify-center text-white text-sm font-semibold shadow-sm`}>
              {getInitials(lead.name)}
            </div>
            <div>
              <div className="font-semibold text-gray-900 leading-tight">{lead.name}</div>
              {lead.company && <div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Building2 className="w-3 h-3 text-gray-400"/>{lead.company}</div>}
            </div>
          </div>
        );
      }
    },
    {
      key: 'contact',
      title: 'Contact Details',
      render: (_: any, lead: Lead) => (
        <div className="space-y-1.5">
          {lead.email ? (
            <div className="text-xs text-gray-700 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400"/> {lead.email}</div>
          ) : <div className="text-xs text-gray-400 italic">No email</div>}
          {lead.phone ? (
            <div className="text-xs text-gray-700 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400"/> {lead.phone}</div>
          ) : <div className="text-xs text-gray-400 italic">No phone</div>}
        </div>
      )
    },
    {
      key: 'source',
      title: 'Origin',
      render: (_: any, lead: Lead) => (
         <div className="flex flex-col gap-1.5 items-start">
           {lead.source === 'website' ? (
             <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md"><Globe className="w-3 h-3"/> Website</span>
           ) : (
             <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md"><User className="w-3 h-3"/> Manual</span>
           )}
           <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${FORM_TYPE_COLORS[lead.formType] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{lead.formType}</span>
         </div>
      )
    },
    {
      key: 'status',
      title: 'Current Stage',
      render: (_: any, lead: Lead) => {
        const stage = STAGE_MAP[lead.status];
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-md border ${stage.count_bg} ${stage.border}`}>
             <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
             {stage.label}
          </span>
        );
      }
    },
    {
      key: 'createdAt',
      title: 'Date Added',
      render: (_: any, lead: Lead) => <span className="text-sm text-gray-600">{formatDate(lead.createdAt)}</span>
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right' as const,
      render: (_: any, lead: Lead) => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setViewLead(lead)} className="p-2 text-gray-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all" title="View Lead">
            <Eye className="w-4 h-4"/>
          </button>
          <button onClick={() => handleDelete(lead)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all" title="Delete Lead">
            <Trash2 className="w-4 h-4"/>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center shadow-sm">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lead Pipeline Manager</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="font-semibold text-slate-700">{leads.length} Active Leads</span> &bull; <span className="font-semibold text-emerald-600">{conversionRate}% Conversion</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-4 h-4" /> List
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 w-full sm:w-56 transition-all placeholder:text-gray-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 rounded-md p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="relative group">
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium text-slate-700 cursor-pointer transition-all"
              >
                <option value="all">All Sources</option>
                <option value="website">Website</option>
                <option value="manual">Manual</option>
              </select>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Add */}
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg active:scale-95 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </button>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Pipeline" value={leads.length} highlightClass="bg-slate-800" />
        <StatCard icon={<MessageSquare className="h-5 w-5" />} label="In Discussion" value={leads.filter((l) => l.status === 'contacted').length} highlightClass="bg-amber-600" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Won Leads" value={convertedCount} highlightClass="bg-emerald-600" pct={`${conversionRate}% Rate`} />
        <StatCard icon={<Briefcase className="h-5 w-5" />} label="New Opportunities" value={leads.filter((l) => l.status === 'new').length} highlightClass="bg-blue-600" />
      </div>

      {/* ── Content View ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-32 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-slate-800 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading Pipeline Data...</p>
          </div>
        ) : (
          <>
            {viewMode === 'kanban' ? (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
                {STAGES.map((stage) => {
                  const stageLeads = byStage(stage.key);
                  const isDragTarget = dragOverCol === stage.key;
                  return (
                    <div
                      key={stage.key}
                      className={`rounded-xl border flex flex-col min-h-[400px] transition-all duration-200 ${
                        isDragTarget
                          ? `border-slate-300 bg-slate-50 shadow-md scale-[1.01]`
                          : `border-gray-200 bg-gray-50/50`
                      }`}
                      onDragOver={(e) => onDragOver(e, stage.key)}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => onDrop(e, stage.key)}
                    >
                      {/* Column Header */}
                      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-xl sticky top-0 z-10">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                          <span className="font-semibold text-sm text-slate-800 tracking-wide uppercase">{stage.label}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600`}>
                          {stageLeads.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar">
                        {stageLeads.length === 0 ? (
                          <div className={`flex flex-col items-center justify-center h-40 rounded-lg border border-dashed border-gray-300 transition-all ${isDragTarget ? 'bg-white opacity-100' : 'opacity-60'}`}>
                            <p className="text-sm text-gray-400">Drop cards here</p>
                          </div>
                        ) : (
                          stageLeads.map((lead) => (
                            <LeadCard
                              key={lead.id}
                              lead={lead}
                              onView={setViewLead}
                              onDelete={handleDelete}
                              onStatusChange={handleStatusChange}
                              onDragStart={onDragStart}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-0">
                <Table
                  data={filtered}
                  columns={tableColumns}
                  loading={loading}
                  emptyMessage="No leads match your current filters."
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── View Lead Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={!!viewLead} onClose={() => setViewLead(null)} title="Lead Dossier">
        {viewLead && (() => {
          const st = STAGE_MAP[viewLead.status];
          return (
            <div className="space-y-6">
              {/* Identity Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-[3px] ${st.solid}`} />
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-sm ${st.solid}`}>
                    {getInitials(viewLead.name)}
                  </div>
                  <div className="pt-0.5 flex-1">
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">{viewLead.name}</h2>
                    {viewLead.company && <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1"><Building2 className="w-3.5 h-3.5 text-slate-400"/> {viewLead.company}</p>}
                    
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${st.count_bg} ${st.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                      {viewLead.source === 'website' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md"><Globe className="h-3 w-3" /> Web Request</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md"><User className="h-3 w-3" /> Manually Added</span>
                      )}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${FORM_TYPE_COLORS[viewLead.formType] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{viewLead.formType}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600"><Mail className="w-3.5 h-3.5"/></div>
                      <div>
                        <p className="text-xs text-slate-500">Email Address</p>
                        <p className="text-sm font-medium text-slate-900">{viewLead.email || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600"><Phone className="w-3.5 h-3.5"/></div>
                      <div>
                        <p className="text-xs text-slate-500">Phone Number</p>
                        <p className="text-sm font-medium text-slate-900">{viewLead.phone || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Location & Timeline</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600"><MapPin className="w-3.5 h-3.5"/></div>
                      <div>
                        <p className="text-xs text-slate-500">Country/Region</p>
                        <p className="text-sm font-medium text-slate-900">{viewLead.country || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600"><Calendar className="w-3.5 h-3.5"/></div>
                      <div>
                        <p className="text-xs text-slate-500">Entry Date</p>
                        <p className="text-sm font-medium text-slate-900">{formatDate(viewLead.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message */}
              {viewLead.message && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Inquiry / Note</p>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">"{viewLead.message}"</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => {
                    handleDelete(viewLead);
                    setViewLead(null);
                  }}
                  className="flex items-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> Delete Lead
                </button>
                <button
                  onClick={() => setViewLead(null)}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-5 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Add Lead Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(EMPTY_FORM); }}
        title="Register New Lead"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-2">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-500"/> Lead Entry Details</h3>
            <p className="text-xs text-slate-500 mt-1">Manual entries default to the "New Lead" stage in your pipeline.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder:text-gray-400 transition-shadow shadow-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Jane Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'company', label: 'Organization/Company', ph: 'Acme Corp' },
              { key: 'country', label: 'Country', ph: 'Country' },
              { key: 'email', label: 'Email Address', type: 'email', ph: 'jane@example.com' },
              { key: 'phone', label: 'Phone Number', ph: '+1 234 567 8900' },
            ].map(({ key, label, type, ph }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={type || 'text'}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder:text-gray-400 transition-shadow shadow-sm"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={ph}
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Internal Notes / Message
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder:text-gray-400 transition-shadow shadow-sm resize-none"
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Add relevant context, origin details, or initial requirements..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Finalize Lead
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Leads;
