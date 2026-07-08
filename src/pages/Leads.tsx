import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Globe, User, X, GripVertical, Eye,
  Mail, Phone, Building2, MapPin, Calendar,
  TrendingUp, Users, CheckCircle2, XCircle, Briefcase,
  MessageSquare, ChevronDown, Sparkles, ArrowUpRight,
  LayoutDashboard, List, Filter, Search, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLeads, createLead, updateLead, deleteLead, clearError } from '@/slices/leadSlice';
import { Lead } from '@/types';
import { formatDate } from '@/utils';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import Pagination from '@/components/Pagination';

// ── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string) => {
  return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'L';
};

// ── Stage Config ────────────────────────────────────────────────────────────
const STAGES: {
  key: Lead['status'];
  label: string;
  icon: React.ReactNode;
  solid: string;
  lightBg: string;
  border: string;
  dot: string;
  count_bg: string;
  barColor: string;
}[] = [
  {
    key: 'new',
    label: 'New Lead',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    solid: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    count_bg: 'bg-blue-50 text-blue-700',
    barColor: '#2563eb',
  },
  {
    key: 'contacted',
    label: 'In Discussion',
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    solid: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    count_bg: 'bg-amber-50 text-amber-700',
    barColor: '#f59e0b',
  },
  {
    key: 'converted',
    label: 'Won',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    solid: 'bg-emerald-600',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    count_bg: 'bg-emerald-50 text-emerald-700',
    barColor: '#059669',
  },
  {
    key: 'rejected',
    label: 'Lost',
    icon: <XCircle className="h-3.5 w-3.5" />,
    solid: 'bg-slate-500',
    lightBg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    count_bg: 'bg-slate-100 text-slate-600',
    barColor: '#64748b',
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

// ── Lead Card (Kanban) ────────────────────────────────────────────────────────
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
      className="group relative bg-white rounded border border-gray-200 shadow-sm hover:shadow hover:border-gray-300 transition-all duration-150 cursor-grab active:cursor-grabbing"
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t" style={{ backgroundColor: stage.barColor }} />

      <div className="p-3 pt-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="cursor-move text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            <div className={`w-7 h-7 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${stage.solid}`}>
              {getInitials(lead.name)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-gray-900 truncate leading-tight group-hover:text-primary-700 transition-colors">{lead.name}</p>
              {lead.company && (
                <p className="text-[10px] text-gray-500 truncate flex items-center gap-0.5 mt-0.5">
                  <Building2 className="h-2.5 w-2.5 flex-shrink-0 text-gray-400" />
                  {lead.company}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onView(lead); }} className="p-1 rounded text-gray-400 hover:text-slate-700 hover:bg-slate-100 transition-all" title="View">
              <Eye className="h-3 w-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(lead); }} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1 mb-2.5">
          {lead.source === 'website' ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
              <Globe className="h-2.5 w-2.5" /> Website
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">
              <User className="h-2.5 w-2.5" /> Manual
            </span>
          )}
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${FORM_TYPE_COLORS[lead.formType] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
            {lead.formType}
          </span>
        </div>

        {/* Contact */}
        {(lead.email || lead.phone) && (
          <div className="space-y-1 mb-2.5 px-2 py-1.5 bg-gray-50 rounded border border-gray-100">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-primary-700 transition-colors truncate">
                <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-primary-700 transition-colors">
                <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                {lead.phone}
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Calendar className="h-2.5 w-2.5" />
            {formatDate(lead.createdAt)}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${stage.count_bg} ${stage.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
              {stage.label}
              <ChevronDown className="h-2.5 w-2.5 opacity-60" />
            </button>
            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                <div className="absolute right-0 bottom-full mb-1.5 z-50 bg-white rounded shadow-lg border border-gray-200 overflow-hidden w-36">
                  {STATUS_OPTIONS.filter((s) => s !== lead.status).map((s) => {
                    const st = STAGE_MAP[s];
                    return (
                      <button
                        key={s}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => { onStatusChange(lead, s); setShowStatusMenu(false); }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
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
  const { leads, pagination, loading, error } = useAppSelector((state) => state.leads);

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Lead['status'] | null>(null);
  const [filterSource, setFilterSource] = useState<string>('all');

  const dragLeadId = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchQuery); }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('list');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [viewMode, debouncedSearch, filterSource]);

  const fetchLeadsData = () => {
    if (viewMode === 'list') {
      dispatch(fetchLeads({ page: currentPage, limit: 10, search: debouncedSearch || undefined, source: filterSource !== 'all' ? filterSource : undefined }));
    } else {
      dispatch(fetchLeads({ page: 1, limit: 500, search: debouncedSearch || undefined, source: filterSource !== 'all' ? filterSource : undefined }));
    }
  };

  useEffect(() => {
    fetchLeadsData();
    const interval = setInterval(fetchLeadsData, 30000);
    return () => clearInterval(interval);
  }, [dispatch, viewMode, currentPage, debouncedSearch, filterSource]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  const byStage = (status: Lead['status']) => leads.filter((l) => l.status === status);

  const onDragStart = (e: React.DragEvent, leadId: string) => {
    dragLeadId.current = leadId;
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent, stage: Lead['status']) => { e.preventDefault(); setDragOverCol(stage); };
  const onDragLeave = () => setDragOverCol(null);
  const onDrop = async (e: React.DragEvent, stage: Lead['status']) => {
    e.preventDefault(); setDragOverCol(null);
    const id = dragLeadId.current;
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === stage) return;
    try { await dispatch(updateLead({ id, data: { status: stage } })).unwrap(); toast.success(`Moved to ${STAGE_MAP[stage].label}`); } catch { }
    dragLeadId.current = null;
  };

  const handleStatusChange = async (lead: Lead, status: Lead['status']) => {
    try { await dispatch(updateLead({ id: lead.id, data: { status } })).unwrap(); toast.success(`Moved to ${STAGE_MAP[status].label}`); } catch { }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSubmitting(true);
    try {
      await dispatch(createLead(form)).unwrap();
      toast.success('Lead added');
      setShowModal(false); setForm(EMPTY_FORM);
    } catch { } finally { setSubmitting(false); }
  };

  const handleDelete = async (lead: Lead) => {
    if (!window.confirm(`Delete lead "${lead.name}"?`)) return;
    try { await dispatch(deleteLead(lead.id)).unwrap(); toast.success('Lead deleted'); } catch { }
  };

  // ── Metrics ──────────────────────────────────────────────────────────────────
  const totalLeads = pagination?.stats?.total ?? leads.length;
  const newCount = pagination?.stats?.new ?? leads.filter((l) => l.status === 'new').length;
  const contactedCount = pagination?.stats?.contacted ?? leads.filter((l) => l.status === 'contacted').length;
  const convertedCount = pagination?.stats?.converted ?? leads.filter((l) => l.status === 'converted').length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;

  // ── Table Columns ────────────────────────────────────────────────────────────
  const tableColumns = [
    {
      key: 'name', title: 'Lead',
      render: (_: any, lead: Lead) => {
        const bg = STAGE_MAP[lead.status]?.solid || 'bg-gray-500';
        return (
          <div className="flex items-center gap-2.5 py-0.5">
            <div className={`w-7 h-7 rounded ${bg} flex items-center justify-center text-white text-[10px] font-bold`}>
              {getInitials(lead.name)}
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-xs">{lead.name}</div>
              {lead.company && <div className="text-[10px] text-gray-500 flex items-center gap-0.5 mt-0.5"><Building2 className="w-2.5 h-2.5 text-gray-400" />{lead.company}</div>}
            </div>
          </div>
        );
      }
    },
    {
      key: 'contact', title: 'Contact',
      render: (_: any, lead: Lead) => (
        <div className="space-y-1">
          {lead.email ? <div className="text-[10px] text-gray-700 flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{lead.email}</div> : <div className="text-[10px] text-gray-400 italic">No email</div>}
          {lead.phone ? <div className="text-[10px] text-gray-700 flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{lead.phone}</div> : <div className="text-[10px] text-gray-400 italic">No phone</div>}
        </div>
      )
    },
    {
      key: 'source', title: 'Origin',
      render: (_: any, lead: Lead) => (
        <div className="flex flex-col gap-1 items-start">
          {lead.source === 'website'
            ? <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded"><Globe className="w-2.5 h-2.5" /> Website</span>
            : <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded"><User className="w-2.5 h-2.5" /> Manual</span>}
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${FORM_TYPE_COLORS[lead.formType] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{lead.formType}</span>
        </div>
      )
    },
    {
      key: 'status', title: 'Stage',
      render: (_: any, lead: Lead) => {
        const stage = STAGE_MAP[lead.status];
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${stage.count_bg} ${stage.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
            {stage.label}
          </span>
        );
      }
    },
    {
      key: 'createdAt', title: 'Date',
      render: (_: any, lead: Lead) => <span className="text-xs text-gray-600">{formatDate(lead.createdAt)}</span>
    },
    {
      key: 'actions', title: '', align: 'right' as const,
      render: (_: any, lead: Lead) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setViewLead(lead)} className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-all" title="View">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(lead)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-3">
      {/* ── Odoo-style Page Header ── */}
      <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* Left: Breadcrumb + Title */}
          <div>
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
              <span className="hover:text-primary-600 cursor-pointer">CRM</span>
              <span>/</span>
              <span className="font-semibold text-gray-700">Leads Pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-600 flex-shrink-0" />
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Leads</h1>
              <span className="text-xs text-gray-400 font-normal">
                — <span className="font-semibold text-gray-600">{totalLeads}</span> total
                {conversionRate > 0 && <> · <span className="text-emerald-600 font-semibold">{conversionRate}% won</span></>}
              </span>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* View Toggle */}
            <div className="hidden md:flex bg-gray-100 border border-gray-300 rounded p-0.5">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${viewMode === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[120px] md:w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 w-full transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="relative flex-1 min-w-[110px] md:w-auto">
              <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="appearance-none pl-6 pr-6 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-gray-700 cursor-pointer w-full"
              >
                <option value="all">All Sources</option>
                <option value="website">Website</option>
                <option value="manual">Manual</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>

            {/* New Lead Button */}
            <button
              onClick={() => setShowModal(true)}
              className="odoo-btn-primary flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Lead</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Compact Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: <Users className="h-4 w-4" />, label: 'Total Pipeline', value: totalLeads, color: 'text-slate-700', iconBg: 'bg-slate-100 text-slate-600', border: 'border-slate-200' },
          { icon: <Sparkles className="h-4 w-4" />, label: 'New Leads', value: newCount, color: 'text-blue-700', iconBg: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
          { icon: <MessageSquare className="h-4 w-4" />, label: 'In Discussion', value: contactedCount, color: 'text-amber-700', iconBg: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
          { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Won', value: convertedCount, color: 'text-emerald-700', iconBg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200', extra: conversionRate > 0 ? `${conversionRate}% rate` : undefined },
        ].map((stat) => (
          <div key={stat.label} className={`bg-white border ${stat.border} rounded shadow-sm p-3 flex items-center gap-3 hover:shadow transition-shadow`}>
            <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${stat.iconBg}`}>
              {stat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-baseline gap-1.5">
                <p className={`text-xl font-bold ${stat.color} leading-none`}>{stat.value}</p>
                {stat.extra && (
                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                    <ArrowUpRight className="h-3 w-3" />{stat.extra}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Content View ── */}
      <div className="bg-white rounded border border-gray-200 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 gap-2.5">
            <div className="w-8 h-8 rounded-full border-4 border-gray-100 border-t-primary-600 animate-spin" />
            <p className="text-xs text-gray-500">Loading pipeline...</p>
          </div>
        ) : (
          <>
            {viewMode === 'kanban' ? (
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
                {STAGES.map((stage) => {
                  const stageLeads = byStage(stage.key);
                  const isDragTarget = dragOverCol === stage.key;
                  return (
                    <div
                      key={stage.key}
                      className={`rounded border flex flex-col min-h-[350px] transition-all duration-150 ${
                        isDragTarget ? 'border-primary-300 bg-primary-50/30 shadow-sm scale-[1.005]' : 'border-gray-200 bg-gray-50/50'
                      }`}
                      onDragOver={(e) => onDragOver(e, stage.key)}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => onDrop(e, stage.key)}
                    >
                      {/* Column Header */}
                      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-white rounded-t">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                          <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">{stage.label}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500">
                          {stageLeads.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto max-h-[65vh]">
                        {stageLeads.length === 0 ? (
                          <div className={`flex flex-col items-center justify-center h-32 rounded border border-dashed border-gray-300 transition-all ${isDragTarget ? 'bg-white' : 'opacity-50'}`}>
                            <p className="text-xs text-gray-400">Drop here</p>
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
              <div>
                <Table data={leads} columns={tableColumns} loading={loading} emptyMessage="No leads match your filters." />
                {pagination && pagination.totalPages > 1 && (
                  <div className="border-t border-gray-200 p-3">
                    <Pagination currentPage={currentPage} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setCurrentPage} loading={loading} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── View Lead Modal ── */}
      <Modal isOpen={!!viewLead} onClose={() => setViewLead(null)} title="Lead Details">
        {viewLead && (() => {
          const st = STAGE_MAP[viewLead.status];
          return (
            <div className="space-y-4">
              {/* Banner */}
              <div className="bg-gray-50 border border-gray-200 rounded p-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: st.barColor }} />
                <div className="flex items-start gap-3 pt-1">
                  <div className={`w-10 h-10 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${st.solid}`}>
                    {getInitials(viewLead.name)}
                  </div>
                  <div className="pt-0.5 flex-1">
                    <h2 className="text-sm font-bold text-gray-900">{viewLead.name}</h2>
                    {viewLead.company && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3 text-gray-400" />{viewLead.company}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${st.count_bg} ${st.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                      {viewLead.source === 'website'
                        ? <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded"><Globe className="h-2.5 w-2.5" /> Website</span>
                        : <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded"><User className="h-2.5 w-2.5" /> Manual</span>}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${FORM_TYPE_COLORS[viewLead.formType] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{viewLead.formType}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded p-3 bg-white">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500"><Mail className="w-3 h-3" /></div>
                      <div>
                        <p className="text-[10px] text-gray-400">Email</p>
                        <p className="text-xs font-medium text-gray-800">{viewLead.email || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500"><Phone className="w-3 h-3" /></div>
                      <div>
                        <p className="text-[10px] text-gray-400">Phone</p>
                        <p className="text-xs font-medium text-gray-800">{viewLead.phone || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border border-gray-200 rounded p-3 bg-white">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Details</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500"><MapPin className="w-3 h-3" /></div>
                      <div>
                        <p className="text-[10px] text-gray-400">Country</p>
                        <p className="text-xs font-medium text-gray-800">{viewLead.country || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500"><Calendar className="w-3 h-3" /></div>
                      <div>
                        <p className="text-[10px] text-gray-400">Date Added</p>
                        <p className="text-xs font-medium text-gray-800">{formatDate(viewLead.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {viewLead.message && (
                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Note / Message</p>
                  <p className="text-xs text-gray-700 leading-relaxed">"{viewLead.message}"</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => { handleDelete(viewLead); setViewLead(null); }}
                  className="flex items-center gap-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded text-xs font-medium transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                <button
                  onClick={() => setViewLead(null)}
                  className="odoo-btn-secondary text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Add Lead Modal ── */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setForm(EMPTY_FORM); }} title="New Lead">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded p-2.5 mb-1">
            <p className="text-[10px] text-gray-500 flex items-center gap-1.5"><Briefcase className="w-3 h-3 text-gray-400" /> Manual leads default to the "New Lead" stage.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jane Doe" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'company', label: 'Company', ph: 'Acme Corp' },
              { key: 'country', label: 'Country', ph: 'India' },
              { key: 'email', label: 'Email', type: 'email', ph: 'jane@example.com' },
              { key: 'phone', label: 'Phone', ph: '+91 98765 43210' },
            ].map(({ key, label, type, ph }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input
                  type={type || 'text'}
                  className="w-full"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={ph}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes / Message</label>
            <textarea
              className="w-full"
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Add context, origin details, or requirements..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }} className="odoo-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="odoo-btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Plus className="w-3.5 h-3.5" /> Add Lead</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Leads;
