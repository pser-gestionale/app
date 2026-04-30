import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, IS_PROD } from '../lib/supabase';
import {
  Search, Plus, Mail, Phone, Edit2, Trash2, X, Check,
  Building2, User, FileDown, BookUser, ChevronLeft,
  Briefcase, Link2, Send, Shield, AlertTriangle, UserCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { differenceInDays, format } from 'date-fns';
import * as XLSX from 'xlsx';

/* ─── Types ─── */
interface RubricaContatto {
  id: string;
  nome: string;
  cognome: string;
  azienda: string;
  ruolo: string;
  emails: string[];
  telefono: string;
  tipo: 'appaltatore' | 'interno_pser';
  id_contratto?: string;
  oggetto_pratica?: string;
  created_at: string;
  updated_at: string;
}
interface CCPredefinito { id: string; nome: string; email: string; ruolo?: string; }
type ContattoForm = Omit<RubricaContatto, 'id' | 'created_at' | 'updated_at'>;
type ModalTab = 'appaltatore' | 'interno_pser' | 'cc';

const EMPTY_FORM: ContattoForm = {
  nome: '', cognome: '', azienda: '', ruolo: '',
  emails: [], telefono: '', tipo: 'appaltatore',
  id_contratto: '', oggetto_pratica: '',
};

/* ─── Constants ─── */
const TIPO_CFG = {
  appaltatore:  { label: 'Appaltatore', color: '#F5A800', bg: 'bg-[#F5A800]/15', border: 'border-[#F5A800]/30', text: 'text-[#F5A800]' },
  interno_pser: { label: 'PSER',        color: '#378ADD', bg: 'bg-[#378ADD]/15', border: 'border-[#378ADD]/30', text: 'text-[#378ADD]' },
} as const;

const ENI_AZIENDE = [
  'Eni Plenitude S.p.A.', 'Eni Plenitude Renewables Italy S.r.l.',
  'Eni S.p.A.', 'Versalis S.p.A.', 'Saipem S.p.A.', 'Saipem Americas S.A.',
  'Eni gas e luce S.p.A.', 'Novamont S.p.A.', 'Eni Rewind S.p.A.',
  'Eni Trading & Shipping S.p.A.', 'Eniservizi S.p.A.', 'Syndial S.p.A.',
  'Eni Congo S.A.', 'Eni Mediterranea Idrocarburi S.p.A.', 'Snamprogetti S.p.A.',
  'Eni Corporate University S.p.A.',
];

const RUOLI_APPALTATORE = [
  // Direzione
  'Amministratore Delegato', 'Direttore Generale', 'Direttore Tecnico',
  'Direttore Operativo', 'Direttore Finanziario (CFO)', 'Direttore Commerciale',
  // HSE / HSEQ
  'HSEQ DEPT.', 'Responsabile HSEQ', 'Responsabile HSE',
  'Responsabile Qualità', 'Responsabile Ambiente',
  'RSPP (Resp. Prevenzione e Protezione)', 'Medico Competente',
  'RLS (Rapp. Lavoratori per la Sicurezza)',
  'Coord. Sicurezza in Fase Esecutiva', 'Coord. Sicurezza in Fase di Progettazione',
  // Contratti / Acquisti / Gare
  'Contract Manager', 'Responsabile Contratti', 'Responsabile Acquisti',
  'Responsabile Procurement', 'Ufficio Gare e Appalti', 'Referente Subappalti',
  // Progetto / Cantiere
  'Project Manager', 'Project Engineer', 'Site Manager', 'Construction Manager',
  'Field Supervisor', 'Capo Cantiere', 'Responsabile Operativo', 'Responsabile Manutenzione',
  'Ingegnere di Progetto', 'Referente Tecnico',
  // Compliance / Legale
  'Referente Compliance', 'Responsabile Legale', 'Ufficio Legale',
  'Referente Assicurazioni', 'Responsabile Anticorruzione',
  // Amministrazione / HR
  'Responsabile Amministrativo', 'Contabilità e Amministrazione',
  'Responsabile Risorse Umane', 'Resp. Relazioni Industriali',
  // Altro
  'Referente DURC', 'Referente Formazione', 'Responsabile IT', 'Responsabile Logistica',
];

const RUOLI_PSER = [
  // Ruoli contrattuali Eni PSER
  'Contract Holder (CHC)', 'Contract Holder Collaborator (CHC)',
  'Resp. Project Service - PSER', 'Contract Manager', 'Responsabile Contratti',
  'Resp. Subaffidamenti', 'Resp. Procurement', 'Supply Chain Manager',
  'Category Manager', 'Vendor Manager',
  // Direzione / Asset / Operations
  'Asset Manager', 'Plant Manager', 'Operations Manager', 'Facility Manager',
  'Project Manager', 'Project Engineer', 'Responsabile Pianificazione',
  'Responsabile Tecnico', 'Field Operations Manager', 'Responsabile Esercizio',
  'Production Manager', 'Maintenance Manager', 'Turnaround Manager',
  // HSE / QHSE / Ambiente
  'HSEQ DEPT.', 'Responsabile HSEQ', 'Responsabile HSE', 'Funzione QHSE',
  'Referente Sicurezza', 'Referente Ambientale', 'Responsabile Ambiente',
  'Responsabile Qualità', 'Safety Coordinator', 'Environmental Coordinator',
  'Process Safety Manager',
  // Legale / Compliance / Risk
  'Responsabile Compliance', 'Compliance Officer', 'Referente Legale',
  'Funzione Legale', 'Risk Manager', 'Responsabile Anticorruzione',
  'Data Protection Officer (DPO)', 'Referente Privacy',
  // Finance / Amministrazione
  'Amministratore', 'Responsabile Amministrativo', 'Controller',
  'Budget Manager', 'CFO / Direttore Finanziario', 'Cost Controller',
  // Ingegneria / Manutenzione
  'Ingegnere di Progetto', 'Ingegnere di Manutenzione', 'Ingegnere di Processo',
  'Reliability Engineer', 'Integrity Manager', 'Discipline Engineer',
  // HR / Sistemi / Formazione
  'HR Business Partner', 'Responsabile Risorse Umane', 'Responsabile IT',
  'Referente Formazione', 'Learning & Development',
];

const RUOLI_CC = [
  // Management
  'Amministratore Delegato', 'Direttore Generale', 'Direttore Tecnico',
  'Direttore Operativo', 'Asset Manager', 'Plant Manager', 'Operations Manager',
  // Contratti / Procurement
  'Contract Holder (CHC)', 'Contract Holder Collaborator (CHC)',
  'Resp. Project Service - PSER', 'Contract Manager', 'Responsabile Contratti',
  'Resp. Subaffidamenti', 'Responsabile Procurement', 'Supply Chain Manager',
  // HSE / HSEQ
  'HSEQ DEPT.', 'Responsabile HSEQ', 'Responsabile HSE', 'Funzione QHSE',
  'Referente Sicurezza', 'Safety Coordinator', 'Responsabile Ambiente',
  'RSPP (Resp. Prevenzione e Protezione)', 'Process Safety Manager',
  // Qualità / Compliance / Legale
  'Responsabile Qualità', 'Responsabile Compliance', 'Compliance Officer',
  'Referente Legale', 'Risk Manager', 'Responsabile Anticorruzione',
  // Progetto / Cantiere
  'Project Manager', 'Project Engineer', 'Site Manager', 'Field Supervisor',
  'Responsabile Operativo', 'Construction Manager',
  // Amministrazione / Finance
  'Responsabile Amministrativo', 'CFO / Direttore Finanziario', 'Controller',
  'Contabilità e Amministrazione',
  // Referenti specifici
  'Referente DURC', 'Referente Assicurazioni', 'Referente Formazione',
  'Ufficio Gare e Appalti', 'Responsabile Acquisti',
];

const AVATAR_COLORS = ['#534AB7', '#378ADD', '#1D9E75', '#F5A800', '#E24B4A', '#a89ef8'];
const avatarColor = (s: string) => AVATAR_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initials    = (c: RubricaContatto) => ((c.nome[0] || '') + (c.cognome[0] || '')).toUpperCase() || '??';
const fmtDate     = (s?: string) => { try { return s ? format(new Date(s), 'dd/MM/yyyy') : '—'; } catch { return '—'; } };

const capWords = (s: string) => s.replace(/(?:^|[\s'-])\S/g, c => c.toUpperCase());

const formatPhone = (v: string): string => {
  const raw = v.trim();
  if (!raw || raw.startsWith('+')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('39') && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith('3') || digits.startsWith('0')) return `+39 ${raw}`;
  return raw;
};

/* ─── LocalStorage (DEV) ─── */
const LS_CONTATTI = 'pser_rubrica_contatti';
const LS_CC       = 'pser_rubrica_cc';
const loadLS  = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const saveLS  = <T,>(k: string, d: T[]) => localStorage.setItem(k, JSON.stringify(d));

/* ─── Supabase (PROD) ─── */
const mapRow = (r: Record<string, unknown>): RubricaContatto => ({
  id: r.id as string, nome: r.nome as string, cognome: r.cognome as string,
  azienda: (r.azienda as string) || '', ruolo: (r.ruolo as string) || '',
  emails: (r.emails as string[]) || [], telefono: (r.telefono as string) || '',
  tipo: (r.tipo as RubricaContatto['tipo']) || 'appaltatore',
  id_contratto: (r.id_contratto as string) || '',
  oggetto_pratica: (r.oggetto_pratica as string) || '',
  created_at: r.created_at as string, updated_at: r.updated_at as string,
});
const dbLoadContatti   = async () => { const { data, error } = await supabase.from('rubrica_contatti').select('*').order('cognome'); if (error) throw error; return (data || []).map(mapRow); };
const dbLoadCC         = async () => { const { data, error } = await supabase.from('rubrica_cc_predefiniti').select('*').order('nome'); if (error) throw error; return (data || []) as CCPredefinito[]; };
const dbInsert         = async (form: ContattoForm, uid?: string) => { const { data, error } = await supabase.from('rubrica_contatti').insert({ ...form, created_by: uid }).select().single(); if (error) throw error; return mapRow(data as Record<string, unknown>); };
const dbUpdate         = async (id: string, patch: Partial<ContattoForm>) => { const { error } = await supabase.from('rubrica_contatti').update(patch).eq('id', id); if (error) throw error; };
const dbDelete         = async (id: string) => { const { error } = await supabase.from('rubrica_contatti').delete().eq('id', id); if (error) throw error; };
const dbInsertCC       = async (cc: { nome: string; email: string; ruolo?: string }) => { const { data, error } = await supabase.from('rubrica_cc_predefiniti').insert(cc).select().single(); if (error) throw error; return data as CCPredefinito; };
const dbDeleteCC       = async (id: string) => { const { error } = await supabase.from('rubrica_cc_predefiniti').delete().eq('id', id); if (error) throw error; };
const dbUpdateCC       = async (id: string, patch: { nome: string; email: string; ruolo?: string }) => { const { error } = await supabase.from('rubrica_cc_predefiniti').update(patch).eq('id', id); if (error) throw error; };

/* ─── Sollecito log helpers (salva voce in soll_log condiviso) ─── */
const saveSollLog = (entry: {
  id: string; praticaId: string; appaltatore: string;
  documento: string; azione: string; ts: string; gestitoDa: string; note?: string;
}) => {
  // localStorage (DEV + fallback)
  try {
    const prev = JSON.parse(localStorage.getItem('pser_soll_log') || '[]');
    localStorage.setItem('pser_soll_log', JSON.stringify([entry, ...prev].slice(0, 2000)));
  } catch {}
  // Supabase (PROD)
  if (IS_PROD) {
    void supabase.from('soll_log').insert({
      id: entry.id, pratica_id: entry.praticaId, appaltatore: entry.appaltatore,
      documento: entry.documento, azione: entry.azione, ts: entry.ts,
      gestito_da: entry.gestitoDa, note: entry.note ?? null,
    });
  }
};

/* ─── Sollecito ─── */
interface DocScad { documento: string; dataFineValidita?: string; praticaId: string; }
const calcStato = (d?: string): 'scaduto' | 'in_scadenza' | 'ok' | 'nr' => {
  if (!d) return 'nr';
  try { const diff = differenceInDays(new Date(d), new Date()); return diff < 0 ? 'scaduto' : diff <= 30 ? 'in_scadenza' : 'ok'; } catch { return 'nr'; }
};

/* CC sempre presenti per ogni sollecito (override da ccList se stessa persona già aggiunta con email reale) */
const DEFAULT_CC_ENTRIES: { id: string; nome: string; email: string }[] = [
  { id: '__ros', nome: 'Rosalinda Di Fiore',     email: 'rosalinda.difiore@pser.local' },
  { id: '__fed', nome: 'Federica Damato',         email: 'federica.damato@pser.local' },
  { id: '__pol', nome: 'Antonino Angelo Polito',  email: 'antoninoangelo.polito@pser.local' },
];

const buildInitialBody = (azienda: string, contratto: string, praticaId: string): string => {
  const docs = loadLS<DocScad>('pser_doc_scadenze')
    .filter(d => praticaId ? d.praticaId === praticaId && (calcStato(d.dataFineValidita) === 'scaduto' || calcStato(d.dataFineValidita) === 'in_scadenza') : false);
  const docsStr = docs.length > 0
    ? docs.map(d => `• ${d.documento}${d.dataFineValidita ? ` – Scadenza: ${fmtDate(d.dataFineValidita)}` : ''}`).join('\n')
    : '• (nessun documento con scadenza registrata)';
  return `Spett.le ${azienda || '___'},\n\nin riferimento al contratto n. ${contratto || '___'}, si comunica di aver inviato su EniSpace richiesta di aggiornamento dei seguenti documenti scaduti o in scadenza:\n\n${docsStr}\n\nSi richiede cortese riscontro nei tempi previsti.\n\nCordiali saluti,`;
};

/* ─── ConfirmModal ─── */
interface ConfirmModalProps { title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; }
const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, confirmLabel = 'Elimina', onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div className="bg-[#0c1b2e] border border-white/12 rounded-2xl w-full max-w-sm shadow-[0_32px_80px_rgba(0,0,0,0.8)] p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-[#E24B4A]/15 border border-[#E24B4A]/30 flex items-center justify-center flex-shrink-0">
          <Trash2 size={15} className="text-[#E24B4A]"/>
        </div>
        <h3 className="text-base font-bold text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-400 mb-6 leading-relaxed">{message}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 h-10 rounded-xl border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition-colors">Annulla</button>
        <button onClick={onConfirm} className="flex-1 h-10 rounded-xl bg-[#E24B4A]/80 hover:bg-[#E24B4A] text-sm text-white font-semibold transition-colors">{confirmLabel}</button>
      </div>
    </div>
  </div>
);

/* ─── KpiModal ─── */
type KpiType = 'totale' | 'aziende' | 'conEmail' | 'recenti';
interface KpiModalProps { tipo: KpiType; contatti: RubricaContatto[]; onSelect: (id: string) => void; onClose: () => void; }
const KpiModal: React.FC<KpiModalProps> = ({ tipo, contatti, onSelect, onClose }) => {
  const [search, setSearch] = useState('');

  const { title, list } = useMemo(() => {
    const titles: Record<KpiType, string> = {
      totale:   'Tutti i contatti',
      aziende:  'Contatti per azienda',
      conEmail: 'Contatti con email',
      recenti:  'Aggiunti questo mese',
    };
    let l = contatti;
    if (tipo === 'conEmail') l = contatti.filter(c => c.emails.length > 0);
    if (tipo === 'recenti') { const m = new Date(); m.setDate(1); m.setHours(0,0,0,0); l = contatti.filter(c => new Date(c.created_at) >= m); }
    const q = search.toLowerCase();
    if (q) l = l.filter(c => `${c.nome} ${c.cognome} ${c.azienda} ${c.emails.join(' ')}`.toLowerCase().includes(q));
    return { title: titles[tipo], list: l };
  }, [tipo, contatti, search]);

  const grouped = useMemo(() => {
    if (tipo !== 'aziende') return null;
    const map = new Map<string, RubricaContatto[]>();
    list.forEach(c => { const a = c.azienda || '—'; if (!map.has(a)) map.set(a, []); map.get(a)!.push(c); });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tipo, list]);

  const renderRow = (c: RubricaContatto) => (
    <button key={c.id} onClick={() => { onSelect(c.id); onClose(); }}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0">
      <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-[11px]"
        style={{ width: 32, height: 32, background: avatarColor(c.cognome || c.nome) }}>
        {((c.nome[0] || '') + (c.cognome[0] || '')).toUpperCase() || '??'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-200">{c.cognome} {c.nome}</span>
          <span className={cn('px-1.5 py-px rounded-full text-[9px] font-bold border', TIPO_CFG[c.tipo].bg, TIPO_CFG[c.tipo].border, TIPO_CFG[c.tipo].text)}>{TIPO_CFG[c.tipo].label}</span>
        </div>
        <div className="text-[10px] text-gray-500 truncate">{c.azienda || c.ruolo || '—'}</div>
        {c.emails.length > 0 && <div className="text-[10px] text-[#a89ef8] truncate">{c.emails[0]}</div>}
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0c1b2e] border border-white/12 rounded-2xl w-full max-w-md shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col h-[560px] max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-white">{title}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#a89ef8]/20 text-[#a89ef8]">{tipo === 'aziende' ? (grouped?.length ?? 0) + ' az.' : list.length}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors"><X size={15}/></button>
        </div>
        <div className="px-4 py-2.5 border-b border-white/5 flex-shrink-0">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca…"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#a89ef8]/50"/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.length === 0
            ? <p className="text-center text-xs text-gray-600 mt-10">Nessun risultato</p>
            : grouped
              ? grouped.map(([az, items]) => (
                <div key={az}>
                  <div className="px-4 py-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between sticky top-0 bg-[#0c1b2e]">
                    <span className="truncate">{az}</span>
                    <span className="text-gray-700 flex-shrink-0 ml-2">{items.length}</span>
                  </div>
                  {items.map(c => renderRow(c))}
                </div>
              ))
              : list.map(c => renderRow(c))
          }
        </div>
      </div>
    </div>
  );
};

/* ─── EmailAutocomplete ─── */
interface EmailSuggestion { email: string; nome: string; cognome: string; }
interface EmailAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (email: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  suggestions: EmailSuggestion[];
  placeholder?: string;
  inputClassName?: string;
}
const EmailAutocomplete: React.FC<EmailAutocompleteProps> = ({ value, onChange, onSelect, onKeyDown, suggestions, placeholder, inputClassName }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = suggestions.filter(s =>
    value.length > 0 && (s.email.includes(value) || `${s.nome} ${s.cognome}`.toLowerCase().includes(value.toLowerCase()))
  ).slice(0, 8);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <input value={value}
        onChange={e => { onChange(e.target.value.toLowerCase()); setOpen(true); }}
        onFocus={() => { if (value) setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0f2035] border border-white/15 rounded-xl shadow-2xl max-h-44 overflow-y-auto">
          {filtered.map(s => (
            <button key={s.email} type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(s.email); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-[#a89ef8]/10 transition-colors border-b border-white/5 last:border-0 first:rounded-t-xl last:rounded-b-xl">
              <div className="text-[11px] font-semibold text-gray-200">{s.cognome} {s.nome}</div>
              <div className="text-[10px] text-[#a89ef8]">{s.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Avatar ─── */
const Avatar: React.FC<{ c: RubricaContatto; size?: number }> = ({ c, size = 40 }) => (
  <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
    style={{ width: size, height: size, background: avatarColor(c.cognome || c.nome), fontSize: size * 0.34 }}>
    {initials(c)}
  </div>
);

const TypeBadge: React.FC<{ tipo: RubricaContatto['tipo'] }> = ({ tipo }) => {
  const cfg = TIPO_CFG[tipo];
  return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0', cfg.bg, cfg.border, cfg.text)}>{cfg.label}</span>;
};

/* ─── Custom dropdown (evita il datalist bianco del browser) ─── */
interface CustomDropdownProps {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}
const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, onChange, suggestions, placeholder, className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = suggestions.filter(s => !value || s.toLowerCase().includes(value.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={cn('w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none focus:border-[#534AB7]/60 transition-all', className)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0f2035] border border-white/15 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {filtered.map(s => (
            <button key={s} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-[#a89ef8]/10 hover:text-white transition-colors first:rounded-t-xl last:rounded-b-xl">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Smart Ruolo Input ─── */
interface RuoloInputProps { value: string; onChange: (v: string) => void; tipo: RubricaContatto['tipo']; }
const RuoloInput: React.FC<RuoloInputProps> = ({ value, onChange, tipo }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lista = tipo === 'interno_pser' ? RUOLI_PSER : RUOLI_APPALTATORE;
  const filtered = lista.filter(r => !value || r.toLowerCase().includes(value.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="es. Referente DURC"
        className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none focus:border-[#534AB7]/60 transition-all"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0f2035] border border-white/15 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {filtered.length > 0
            ? filtered.map(r => (
              <button key={r} type="button"
                onMouseDown={e => { e.preventDefault(); onChange(r); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-[#a89ef8]/10 hover:text-white transition-colors first:rounded-t-xl last:rounded-b-xl">
                {r}
              </button>
            ))
            : <div className="px-3 py-2 text-xs text-gray-600 italic">Nessun suggerimento — il testo digitato è valido</div>
          }
        </div>
      )}
    </div>
  );
};

/* ─── PraticaDropdown — filtra per azienda, cross-fill id↔oggetto ─── */
interface PraticaItem { id: string; idContratto: string; oggetto: string; appaltatore: string; }
interface PraticaDropdownProps {
  label: string;
  icon: React.ReactNode;
  field: 'idContratto' | 'oggetto';
  value: string;
  pratiche: PraticaItem[];
  onChange: (v: string) => void;
  onSelect: (item: PraticaItem) => void;
  placeholder?: string;
}
const PraticaDropdown: React.FC<PraticaDropdownProps> = ({ label, icon, field, value, pratiche, onChange, onSelect, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = pratiche.filter(p => {
    const v = value.toLowerCase();
    return !v || p.idContratto.toLowerCase().includes(v) || p.oggetto.toLowerCase().includes(v) || p.appaltatore.toLowerCase().includes(v);
  });

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
        {icon} {label}
      </label>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none focus:border-[#534AB7]/60 transition-all"
      />
      {open && pratiche.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0f2035] border border-white/15 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-3 py-2 text-xs text-gray-600 italic">Nessuna pratica — il testo digitato verrà salvato così</div>
            : filtered.map(p => (
              <button key={p.id} type="button"
                onMouseDown={e => { e.preventDefault(); onSelect(p); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 hover:bg-[#a89ef8]/10 transition-colors border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#a89ef8] flex-shrink-0">{p.idContratto || p.id}</span>
                  {p.appaltatore && <span className="text-[10px] text-gray-500 truncate">· {p.appaltatore}</span>}
                </div>
                {p.oggetto && <div className="text-xs text-gray-300 truncate mt-0.5">{p.oggetto}</div>}
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
};

/* ─── ContattoModal (3 tab: Appaltatore | PSER | CC) ─── */
interface ContattoModalProps {
  initial: ContattoForm;
  initialTab: ModalTab;
  aziendeSuggerite: string[];
  subaffidamenti: ReturnType<typeof useData>['subaffidamenti'];
  ccList: CCPredefinito[];
  canEditCC: boolean;
  onSave: (f: ContattoForm) => void;
  onAddCC: (cc: { nome: string; email: string; ruolo?: string }) => Promise<void>;
  onUpdateCC: (id: string, cc: { nome: string; email: string; ruolo?: string }) => Promise<void>;
  onDeleteCC: (id: string) => Promise<void>;
  onClose: () => void;
}

const ContattoModal: React.FC<ContattoModalProps> = ({
  initial, initialTab, aziendeSuggerite, subaffidamenti, ccList, canEditCC,
  onSave, onAddCC, onUpdateCC, onDeleteCC, onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  const [form, setForm] = useState<ContattoForm>(initial);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // CC state
  const [ccNome, setCcNome]   = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [ccRuolo, setCcRuolo] = useState('');
  const [ccErr, setCcErr]     = useState('');
  const [ccSaving, setCcSaving] = useState(false);
  const [ccDeleteConfirm, setCcDeleteConfirm] = useState<string | null>(null);
  const [ccEditingId,     setCcEditingId]     = useState<string | null>(null);

  const setField = useCallback((k: keyof ContattoForm, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  }, []);

  const pratiche = useMemo<PraticaItem[]>(() => {
    const all = subaffidamenti.map(s => ({
      id: s.id,
      idContratto: ((s as Record<string, unknown>).idSapContratto || (s as Record<string, unknown>).idSap || s.id) as string,
      oggetto: (((s as Record<string, unknown>).oggettoRichiesta || (s as Record<string, unknown>).oggetto) || '') as string,
      appaltatore: (((s as Record<string, unknown>).appaltatore || (s as Record<string, unknown>).app || '') as string).trim(),
    }));
    if (!form.azienda) return all;
    const az = form.azienda.toLowerCase();
    const matched = all.filter(p => p.appaltatore.toLowerCase() === az);
    return matched.length > 0 ? matched : all;
  }, [subaffidamenti, form.azienda]);

  const handleTabChange = (tab: ModalTab) => {
    setActiveTab(tab);
    if (tab !== 'cc') setForm(f => ({ ...f, tipo: tab }));
  };

  const azSuggestions = activeTab === 'interno_pser' ? ENI_AZIENDE : aziendeSuggerite;

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setEmailError('Formato non valido'); return; }
    if (form.emails.includes(e)) { setEmailError('Email già presente'); return; }
    setField('emails', [...form.emails, e]);
    setEmailInput(''); setEmailError('');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim())    e.nome    = 'Campo obbligatorio';
    if (!form.cognome.trim()) e.cognome = 'Campo obbligatorio';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleAddCC = async () => {
    if (!ccNome.trim()) { setCcErr('Nome obbligatorio'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ccEmail.trim())) { setCcErr('Email non valida'); return; }
    setCcSaving(true); setCcErr('');
    try { await onAddCC({ nome: ccNome.trim(), email: ccEmail.trim().toLowerCase(), ruolo: ccRuolo.trim() || undefined }); setCcNome(''); setCcEmail(''); setCcRuolo(''); }
    catch { setCcErr('Errore nel salvataggio'); }
    finally { setCcSaving(false); }
  };

  const handleUpdateCCLocal = async () => {
    if (!ccEditingId) return;
    if (!ccNome.trim()) { setCcErr('Nome obbligatorio'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ccEmail.trim())) { setCcErr('Email non valida'); return; }
    setCcSaving(true); setCcErr('');
    try {
      await onUpdateCC(ccEditingId, { nome: ccNome.trim(), email: ccEmail.trim().toLowerCase(), ruolo: ccRuolo.trim() || undefined });
      setCcEditingId(null); setCcNome(''); setCcEmail(''); setCcRuolo('');
    } catch { setCcErr('Errore nel salvataggio'); }
    finally { setCcSaving(false); }
  };

  const startEditCC = (cc: CCPredefinito) => {
    setCcEditingId(cc.id); setCcNome(cc.nome); setCcEmail(cc.email); setCcRuolo(cc.ruolo || '');
    setCcDeleteConfirm(null); setCcErr('');
  };

  const isFormTab = activeTab !== 'cc';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0c1b2e] border border-white/12 rounded-2xl w-full max-w-lg shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col h-[680px] max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-bold text-white">
            {initial.nome ? 'Modifica Contatto' : 'Nuovo Contatto'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors">
            <X size={16}/>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex px-6 pt-4 gap-2">
          {(['appaltatore', 'interno_pser', 'cc'] as ModalTab[]).map(tab => {
            const labels: Record<ModalTab, string> = { appaltatore: 'Appaltatore', interno_pser: 'PSER', cc: 'CC Predefiniti' };
            const colors: Record<ModalTab, string> = {
              appaltatore:  'bg-[#F5A800]/20 border-[#F5A800]/50 text-[#F5A800]',
              interno_pser: 'bg-[#378ADD]/20 border-[#378ADD]/50 text-[#378ADD]',
              cc:           'bg-[#a89ef8]/20 border-[#a89ef8]/50 text-[#a89ef8]',
            };
            const inactive = 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/8 hover:text-gray-300';
            return (
              <button key={tab} onClick={() => handleTabChange(tab)}
                className={cn('flex-1 py-2 rounded-xl border text-xs font-semibold transition-all',
                  activeTab === tab ? colors[tab] : inactive)}>
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── FORM TAB (Appaltatore / PSER) ── */}
          {isFormTab && (
            <>
              {/* Nome + Cognome */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <User size={11}/> Nome *
                  </label>
                  <input
                    value={form.nome}
                    onChange={e => setField('nome', capWords(e.target.value))}
                    placeholder="es. Mario"
                    className={cn('w-full bg-[#0b1a2e] border rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none transition-all',
                      errors.nome ? 'border-[#E24B4A]/60' : 'border-white/10 focus:border-[#534AB7]/60')}
                  />
                  {errors.nome && <p className="text-[10px] text-[#E24B4A] mt-0.5">{errors.nome}</p>}
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <User size={11}/> Cognome *
                  </label>
                  <input
                    value={form.cognome}
                    onChange={e => setField('cognome', capWords(e.target.value))}
                    placeholder="es. Rossi"
                    className={cn('w-full bg-[#0b1a2e] border rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none transition-all',
                      errors.cognome ? 'border-[#E24B4A]/60' : 'border-white/10 focus:border-[#534AB7]/60')}
                  />
                  {errors.cognome && <p className="text-[10px] text-[#E24B4A] mt-0.5">{errors.cognome}</p>}
                </div>
              </div>

              {/* Azienda */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Building2 size={11}/> {activeTab === 'interno_pser' ? 'Ente / Consociata Eni' : 'Azienda / Appaltatore'}
                </label>
                <CustomDropdown
                  value={form.azienda}
                  onChange={v => setField('azienda', v)}
                  suggestions={azSuggestions}
                  placeholder={activeTab === 'interno_pser' ? 'es. Versalis S.p.A.' : 'es. Rossi Costruzioni S.r.l.'}
                />
              </div>

              {/* Ruolo */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Briefcase size={11}/> Ruolo / Qualifica
                </label>
                <RuoloInput value={form.ruolo} onChange={v => setField('ruolo', v)} tipo={form.tipo}/>
              </div>

              {/* Telefono */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Phone size={11}/> Telefono
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={e => setField('telefono', e.target.value)}
                  onBlur={e => setField('telefono', formatPhone(e.target.value))}
                  placeholder="+39 02 1234567"
                  className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none focus:border-[#534AB7]/60 transition-all"
                />
              </div>

              {/* Campi specifici Appaltatore */}
              {activeTab === 'appaltatore' && (
                <div className="space-y-3">
                  <PraticaDropdown
                    label="ID Contratto"
                    icon={<Link2 size={11}/>}
                    field="idContratto"
                    value={form.id_contratto || ''}
                    pratiche={pratiche}
                    onChange={v => setField('id_contratto', v)}
                    onSelect={p => { setField('id_contratto', p.idContratto); setField('oggetto_pratica', p.oggetto); }}
                    placeholder="es. 4600012345 — o scrivi liberamente"
                  />
                  <PraticaDropdown
                    label="Oggetto Pratica"
                    icon={<Briefcase size={11}/>}
                    field="oggetto"
                    value={form.oggetto_pratica || ''}
                    pratiche={pratiche}
                    onChange={v => setField('oggetto_pratica', v)}
                    onSelect={p => { setField('id_contratto', p.idContratto); setField('oggetto_pratica', p.oggetto); }}
                    placeholder="es. Servizi di manutenzione — o scrivi liberamente"
                  />
                </div>
              )}

              {/* Email list */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Mail size={11}/> Email
                </label>
                {form.emails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.emails.map(em => (
                      <span key={em} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#534AB7]/15 border border-[#534AB7]/30 text-[#a89ef8] text-[11px]">
                        {em}
                        <button type="button" onClick={() => setField('emails', form.emails.filter(x => x !== em))}
                          className="hover:opacity-70 transition-opacity"><X size={10}/></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={emailInput}
                    onChange={e => { setEmailInput(e.target.value.toLowerCase()); setEmailError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                    placeholder="aggiungi@email.it"
                    className={cn('flex-1 bg-[#0b1a2e] border rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none transition-all',
                      emailError ? 'border-[#E24B4A]/60' : 'border-white/10 focus:border-[#534AB7]/60')}
                  />
                  <button type="button" onClick={addEmail}
                    className="px-3 py-2 rounded-xl bg-[#534AB7]/80 hover:bg-[#534AB7] text-white transition-colors flex-shrink-0">
                    <Plus size={13}/>
                  </button>
                </div>
                {emailError && <p className="text-[10px] text-[#E24B4A] mt-0.5">{emailError}</p>}
              </div>
            </>
          )}

          {/* ── CC TAB ── */}
          {activeTab === 'cc' && (
            <div className="space-y-2">
              {!canEditCC && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#378ADD]/10 border border-[#378ADD]/20 text-[#5a9fd4] text-xs">
                  <Shield size={12}/> Lista in sola lettura — solo l'amministratore può modificarla.
                </div>
              )}

              {/* Lista CC */}
              {ccList.length === 0
                ? <p className="text-xs text-gray-600 text-center py-6">Nessun CC predefinito</p>
                : ccList.map(cc => (
                  <div key={cc.id} className={cn('flex items-center gap-3 px-3 py-2.5 border rounded-xl transition-colors',
                    ccEditingId === cc.id ? 'bg-[#534AB7]/10 border-[#534AB7]/30' : 'bg-white/3 border-white/8')}>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-200">{cc.nome}</div>
                      {cc.ruolo && <div className="text-[10px] text-[#a89ef8]">{cc.ruolo}</div>}
                      <div className="text-[10px] text-gray-500">{cc.email}</div>
                    </div>
                    {canEditCC && (
                      ccDeleteConfirm === cc.id ? (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={async () => { await onDeleteCC(cc.id); setCcDeleteConfirm(null); }}
                            className="px-2 py-1 rounded-lg bg-[#E24B4A]/80 text-white text-[10px] font-semibold hover:bg-[#E24B4A] transition-colors">Elimina</button>
                          <button onClick={() => setCcDeleteConfirm(null)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-colors"><X size={11}/></button>
                        </div>
                      ) : (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => startEditCC(cc)} title="Modifica"
                            className="p-1.5 rounded-lg hover:bg-[#534AB7]/15 text-gray-600 hover:text-[#a89ef8] transition-colors"><Edit2 size={12}/></button>
                          <button onClick={() => { setCcDeleteConfirm(cc.id); setCcEditingId(null); }} title="Elimina"
                            className="p-1.5 rounded-lg hover:bg-[#E24B4A]/15 text-gray-600 hover:text-[#E24B4A] transition-colors"><Trash2 size={12}/></button>
                        </div>
                      )
                    )}
                  </div>
                ))
              }

              {/* Form aggiungi / modifica */}
              {canEditCC && (
                <div className="pt-3 border-t border-white/8 space-y-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    {ccEditingId ? <><Edit2 size={10}/> Modifica CC</> : <><Plus size={10}/> Aggiungi CC</>}
                  </div>
                  {ccErr && <p className="text-[10px] text-[#E24B4A]">{ccErr}</p>}

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <User size={11}/> Nome e Cognome *
                    </label>
                    <input value={ccNome} onChange={e => setCcNome(capWords(e.target.value))} placeholder="es. Mario Rossi"
                      className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none focus:border-[#534AB7]/60 transition-all"/>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Mail size={11}/> Email *
                    </label>
                    <input value={ccEmail} onChange={e => setCcEmail(e.target.value.toLowerCase())} placeholder="email@esempio.it"
                      className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none focus:border-[#534AB7]/60 transition-all"/>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Briefcase size={11}/> Ruolo / Funzione
                    </label>
                    <CustomDropdown value={ccRuolo} onChange={setCcRuolo} suggestions={RUOLI_CC} placeholder="es. Contract Manager"/>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {ccEditingId && (
                      <button onClick={() => { setCcEditingId(null); setCcNome(''); setCcEmail(''); setCcRuolo(''); setCcErr(''); }}
                        className="flex-1 h-10 rounded-xl border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition-colors">
                        Annulla
                      </button>
                    )}
                    <button onClick={ccEditingId ? handleUpdateCCLocal : handleAddCC} disabled={ccSaving}
                      className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#534AB7] to-[#6358cc] text-sm text-white font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                      {ccSaving ? 'Salvataggio…' : ccEditingId ? <><Check size={13}/> Salva modifiche</> : <><Plus size={13}/> Aggiungi</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-white/8">
          {isFormTab ? (
            <>
              <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition-colors">Annulla</button>
              <button onClick={() => validate() && onSave(form)}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#534AB7] to-[#6358cc] text-sm text-white font-semibold shadow-lg shadow-[#534AB7]/20 hover:shadow-[#534AB7]/40 transition-all flex items-center justify-center gap-2">
                <Check size={14}/> Salva
              </button>
            </>
          ) : (
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition-colors">Chiudi</button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── SollecitoModal ─── */
interface SollecitoModalProps {
  contact: RubricaContatto;
  contatti: RubricaContatto[];
  ccList: CCPredefinito[];
  subaffidamenti: ReturnType<typeof useData>['subaffidamenti'];
  praticaPreselezionata?: string | null;
  onClose: () => void;
}
const SollecitoModal: React.FC<SollecitoModalProps> = ({ contact, contatti, ccList, subaffidamenti, praticaPreselezionata, onClose }) => {
  const { user } = useAuth();

  /* ── TO ── */
  const [toEmails, setToEmails] = useState<string[]>([...contact.emails]);
  const [toInput,  setToInput]  = useState('');
  const [toError,  setToError]  = useState('');

  /* ── CC: merge DEFAULT (hardcoded) + ccList dal DB, dedup per nome ── */
  const mergedCC = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; nome: string; email: string }[] = [];
    // I 3 default sempre nell'ordine fisso (Rosalinda → Federica → Polito)
    // Se la persona è già nel DB con email reale, usiamo quella
    DEFAULT_CC_ENTRIES.forEach(d => {
      const firstName = d.nome.split(' ')[0].toLowerCase();
      const dbEntry = ccList.find(cc => cc.nome.toLowerCase().includes(firstName));
      const entry = dbEntry ? { id: dbEntry.id, nome: dbEntry.nome, email: dbEntry.email } : d;
      const k = entry.email.toLowerCase();
      if (!seen.has(k)) { seen.add(k); result.push(entry); }
    });
    // Eventuali altri CC dal DB non già inclusi
    ccList.forEach(c => {
      const k = c.email.toLowerCase();
      if (!seen.has(k)) { seen.add(k); result.push({ id: c.id, nome: c.nome, email: c.email }); }
    });
    return result;
  }, [ccList]);

  const [ccActive,        setCcActive]        = useState<Set<string>>(() => new Set(mergedCC.map(c => c.email)));
  const [ccExtra,         setCcExtra]         = useState<{ id: string; email: string }[]>([]);
  const [practiceLinked,  setPracticeLinked]  = useState<RubricaContatto[]>([]);
  const [ccInput,  setCcInput]  = useState('');
  const [ccError,  setCcError]  = useState('');

  /* ── Pratica ── */
  const [praticaId, setPraticaId] = useState(praticaPreselezionata || '');
  const praticheFiltrate = useMemo(() => {
    if (!contact.azienda) return subaffidamenti;
    const az = contact.azienda.toLowerCase();
    const match = subaffidamenti.filter(s => ((s as Record<string,unknown>).appaltatore as string || (s as Record<string,unknown>).app as string || '').toLowerCase() === az);
    return match.length > 0 ? match : subaffidamenti;
  }, [contact.azienda, subaffidamenti]);

  /* ── Contratto / Oggetto / Subject / Body ── */
  const [contratto, setContratto] = useState(contact.id_contratto || '');
  const [subject,   setSubject]   = useState(`Sollecito Aggiornamento Documenti – Contratto ${contact.id_contratto || '___'}`);
  const [body,      setBody]      = useState(() => buildInitialBody(contact.azienda, contact.id_contratto || '', ''));
  const [showBody,  setShowBody]  = useState(true);

  /* ── Quando pratica cambia → auto-compila tutto + trova contatti collegati ── */
  useEffect(() => {
    if (!praticaId) { setPracticeLinked([]); return; }
    const p = subaffidamenti.find(s => s.id === praticaId);
    if (!p) return;
    const pr  = p as Record<string, unknown>;
    const az  = ((pr.appaltatore || pr.app || '') as string).trim() || contact.azienda;
    const ctr = (pr.idSapContratto || pr.idSap || p.id || '') as string;
    setContratto(ctr);
    setSubject(`Sollecito Aggiornamento Documenti – Contratto ${ctr}`);
    setBody(buildInitialBody(az, ctr, p.id));
    // Contatti in rubrica legati all'azienda di questa pratica
    const linked = az
      ? contatti.filter(c => c.azienda && c.azienda.toLowerCase() === az.toLowerCase() && c.emails.length > 0)
      : [];
    setPracticeLinked(linked);
    // Auto-attiva le loro email nel CC
    if (linked.length > 0) {
      setCcActive(prev => {
        const n = new Set(prev);
        linked.forEach(c => { if (c.emails[0]) n.add(c.emails[0]); });
        return n;
      });
    }
  }, [praticaId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Suggerimenti email da rubrica ── */
  const emailSuggestions = useMemo<EmailSuggestion[]>(() => {
    const seen = new Set<string>();
    const result: EmailSuggestion[] = [];
    contatti.forEach(c => c.emails.forEach(em => {
      if (!seen.has(em)) { seen.add(em); result.push({ email: em, nome: c.nome, cognome: c.cognome }); }
    }));
    ccList.forEach(cc => {
      if (!seen.has(cc.email)) {
        seen.add(cc.email);
        const parts = cc.nome.trim().split(' ');
        result.push({ email: cc.email, nome: parts.slice(1).join(' '), cognome: parts[0] });
      }
    });
    return result;
  }, [contatti, ccList]);

  /* ── Helpers TO ── */
  const addTo = (emailOverride?: string) => {
    const e = (emailOverride ?? toInput).trim().toLowerCase();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { if (!emailOverride) setToError('Formato email non valido'); return; }
    if (toEmails.includes(e)) { if (!emailOverride) setToError('Email già presente'); return; }
    setToEmails(p => [...p, e]); setToInput(''); setToError('');
  };

  /* ── Helpers CC extra ── */
  const addCC = (emailOverride?: string) => {
    const e = (emailOverride ?? ccInput).trim().toLowerCase();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { if (!emailOverride) setCcError('Formato email non valido'); return; }
    if ([...mergedCC, ...ccExtra].some(c => c.email === e)) { if (!emailOverride) setCcError('Email già presente'); return; }
    const id = `__x_${Date.now()}`;
    setCcExtra(p => [...p, { id, email: e }]);
    setCcActive(p => { const n = new Set(p); n.add(e); return n; });
    setCcInput(''); setCcError('');
  };

  /* ── Send ── */
  const handleSend = () => {
    if (toEmails.length === 0) { setToError('Aggiungi almeno un email destinatario'); return; }
    const to = toEmails.join(',');
    const ccEmails = [
      ...mergedCC.filter(c => ccActive.has(c.email)).map(c => c.email),
      ...practiceLinked.filter(c => c.emails.length > 0 && ccActive.has(c.emails[0])).map(c => c.emails[0]),
      ...ccExtra.filter(c => ccActive.has(c.email)).map(c => c.email),
    ];
    const cc  = [...new Set(ccEmails)].join(',');
    const url = `mailto:${encodeURIComponent(to)}?${cc ? `cc=${encodeURIComponent(cc)}&` : ''}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Salva voce nel log solleciti (visibile in Gestione Solleciti)
    saveSollLog({
      id: crypto.randomUUID(),
      praticaId: praticaId || '',
      appaltatore: contact.azienda || '',
      documento: 'Sollecito via Rubrica',
      azione: 'outlook',
      ts: new Date().toISOString(),
      gestitoDa: user?.nome || 'Utente',
      note: `A: ${to}${cc ? ` | CC: ${cc}` : ''} | Oggetto: ${subject}`,
    });
    window.location.href = url;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0c1b2e] border border-white/12 rounded-2xl w-full max-w-lg shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Send size={15} className="text-[#a89ef8]"/>
            <h2 className="text-base font-bold text-white">Invia Sollecito</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors"><X size={16}/></button>
        </div>

        {/* Corpo scrollabile */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* A: */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Mail size={10}/> A:</div>
            <div className="bg-white/3 border border-white/8 rounded-xl px-3 py-2.5 min-h-[44px]">
              {toEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {toEmails.map(em => (
                    <span key={em} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#a89ef8]/15 border border-[#a89ef8]/25 text-[#a89ef8] text-[11px]">
                      {em}
                      <button type="button" onClick={() => setToEmails(p => p.filter(x => x !== em))} className="hover:opacity-70 ml-0.5"><X size={9}/></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-center">
                <EmailAutocomplete
                  value={toInput}
                  onChange={v => { setToInput(v); setToError(''); }}
                  onSelect={email => addTo(email)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTo(); } }}
                  suggestions={emailSuggestions}
                  placeholder={toEmails.length === 0 ? 'Digita email o nome destinatario…' : 'aggiungi altro destinatario…'}
                  inputClassName="bg-transparent text-sm text-[#c8ddf0] outline-none placeholder-gray-600 w-full"
                />
                {toInput && (
                  <button type="button" onClick={() => addTo()} className="p-1.5 rounded-lg bg-[#534AB7]/60 text-white hover:bg-[#534AB7] transition-colors flex-shrink-0"><Plus size={11}/></button>
                )}
              </div>
              {toError && <p className="text-[10px] text-[#E24B4A] mt-1">{toError}</p>}
              {/* Suggeriti dalla pratica selezionata */}
              {practiceLinked.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5">
                  <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Link2 size={9}/> Contatti per questa pratica:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {practiceLinked.map(c => {
                      const email = c.emails[0];
                      const added = toEmails.includes(email);
                      return (
                        <button key={c.id} type="button" onClick={() => { if (!added) addTo(email); }} disabled={added}
                          title={email}
                          className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] transition-all',
                            added
                              ? 'bg-[#1D9E75]/15 border-[#1D9E75]/30 text-[#1D9E75] cursor-default'
                              : 'bg-[#F5A800]/8 border-[#F5A800]/20 text-[#F5A800] hover:bg-[#F5A800]/20 hover:border-[#F5A800]/40')}>
                          {added ? <Check size={9}/> : <Plus size={9}/>}
                          {c.cognome} {c.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CC: */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserCheck size={10}/> CC:
              <span className="text-gray-700 normal-case text-[9px]">clicca per attivare/disattivare</span>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl px-3 py-2.5">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {/* CC fissi: Rosalinda, Federica, Polito + eventuali altri dal DB */}
                {mergedCC.map(cc => {
                  const active = ccActive.has(cc.email);
                  return (
                    <button key={cc.id} type="button"
                      onClick={() => setCcActive(p => { const n = new Set(p); active ? n.delete(cc.email) : n.add(cc.email); return n; })}
                      title={cc.email}
                      className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all',
                        active ? 'bg-[#378ADD]/15 border-[#378ADD]/30 text-[#378ADD] hover:bg-[#378ADD]/25'
                               : 'bg-white/3 border-white/10 text-gray-600 opacity-40 hover:opacity-60')}>
                      {cc.nome}
                    </button>
                  );
                })}

                {/* CC da pratica: contatti dell'azienda della pratica selezionata */}
                {practiceLinked.length > 0 && (
                  <>
                    <div className="w-full text-[9px] text-gray-700 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                      <Link2 size={8}/> Da pratica:
                    </div>
                    {practiceLinked.map(c => {
                      const email  = c.emails[0];
                      const active = ccActive.has(email);
                      return (
                        <button key={c.id} type="button"
                          onClick={() => setCcActive(p => { const n = new Set(p); active ? n.delete(email) : n.add(email); return n; })}
                          title={email}
                          className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all',
                            active ? 'bg-[#F5A800]/15 border-[#F5A800]/30 text-[#F5A800] hover:bg-[#F5A800]/25'
                                   : 'bg-white/3 border-white/10 text-gray-600 opacity-40 hover:opacity-60')}>
                          {c.cognome} {c.nome}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* CC extra: aggiunti manualmente */}
                {ccExtra.map(cc => {
                  const active = ccActive.has(cc.email);
                  return (
                    <button key={cc.id} type="button"
                      onClick={() => setCcActive(p => { const n = new Set(p); active ? n.delete(cc.email) : n.add(cc.email); return n; })}
                      title={cc.email}
                      className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all',
                        active ? 'bg-[#534AB7]/15 border-[#534AB7]/30 text-[#a89ef8] hover:bg-[#534AB7]/25'
                               : 'bg-white/3 border-white/10 text-gray-600 opacity-40 hover:opacity-60')}>
                      {cc.email}
                      <span className="ml-0.5 hover:text-[#E24B4A]"
                        onMouseDown={e => { e.stopPropagation(); setCcExtra(p => p.filter(c => c.id !== cc.id)); setCcActive(p => { const n = new Set(p); n.delete(cc.email); return n; }); }}>
                        <X size={9}/>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 items-center border-t border-white/5 pt-2">
                <EmailAutocomplete
                  value={ccInput}
                  onChange={v => { setCcInput(v); setCcError(''); }}
                  onSelect={email => addCC(email)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCC(); } }}
                  suggestions={emailSuggestions}
                  placeholder="aggiungi altro CC…"
                  inputClassName="bg-transparent text-sm text-[#c8ddf0] outline-none placeholder-gray-700 w-full"
                />
                {ccInput && (
                  <button type="button" onClick={() => addCC()} className="p-1.5 rounded-lg bg-[#534AB7]/60 text-white hover:bg-[#534AB7] transition-colors flex-shrink-0"><Plus size={11}/></button>
                )}
              </div>
              {ccError && <p className="text-[10px] text-[#E24B4A] mt-1">{ccError}</p>}
            </div>
          </div>

          {/* Pratica di riferimento */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Pratica di riferimento</label>
            <select value={praticaId} onChange={e => setPraticaId(e.target.value)}
              className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none focus:border-[#534AB7]/60 appearance-none">
              <option value="">— Nessuna (compila manualmente sotto) —</option>
              {praticheFiltrate.map(s => {
                const p = s as Record<string,unknown>;
                const az = ((p.appaltatore || p.app || '') as string).trim();
                const ogg = (p.oggettoRichiesta || p.oggetto || '') as string;
                return (
                  <option key={s.id} value={s.id}>
                    {s.id}{az ? ` · ${az}` : ''}{ogg ? ` · ${ogg}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* ID Contratto — auto-fill da pratica, modificabile */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Link2 size={10}/> ID Contratto</label>
            <input value={contratto} onChange={e => setContratto(e.target.value)}
              placeholder="es. 4600012345"
              className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none focus:border-[#534AB7]/60 transition-all"/>
          </div>

          {/* Oggetto email */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Oggetto email</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-sm text-[#c8ddf0] px-3 py-2.5 outline-none focus:border-[#534AB7]/60 transition-all"/>
          </div>

          {/* Corpo (collassabile) */}
          <div>
            <button type="button" onClick={() => setShowBody(p => !p)}
              className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5 hover:text-gray-300 transition-colors">
              <span>{showBody ? '▾' : '▸'}</span> Corpo email {showBody ? '(nascondi)' : '(mostra / modifica)'}
            </button>
            {showBody && (
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={9}
                className="mt-2 w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-xs text-[#c8ddf0] px-3 py-2.5 outline-none focus:border-[#534AB7]/60 transition-all resize-none font-mono leading-relaxed"/>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-white/8 flex-shrink-0">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition-colors">Annulla</button>
          <button onClick={handleSend} disabled={toEmails.length === 0 && !toInput.trim()}
            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#378ADD] to-[#4a9de8] text-sm text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-[#378ADD]/30 transition-all flex items-center justify-center gap-2">
            <Mail size={14}/> Apri Outlook
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const Rubrica: React.FC = () => {
  const { subaffidamenti } = useData();
  const { user }           = useAuth();
  const [params]           = useSearchParams();

  const [contatti,   setContatti]   = useState<RubricaContatto[]>([]);
  const [ccList,     setCcList]     = useState<CCPredefinito[]>([]);
  const [loadingDB,  setLoadingDB]  = useState(IS_PROD);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search,     setSearch]     = useState('');
  const [filterTipo, setFilterTipo] = useState<RubricaContatto['tipo'] | ''>('');
  const [filterAz,   setFilterAz]   = useState(params.get('azienda') || '');
  const [modal,      setModal]      = useState<{ open: boolean; editing: RubricaContatto | null; tab: ModalTab }>({ open: false, editing: null, tab: 'appaltatore' });
  const [sollecitoContact, setSollecitoContact] = useState<RubricaContatto | null>(null);
  const [kpiModal,         setKpiModal]         = useState<KpiType | null>(null);
  const [deleteConfirm,    setDeleteConfirm]    = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  const canEditCC = user?.nome === 'Pietro De Vito';

  /* ── Load data ── */
  useEffect(() => {
    if (IS_PROD) {
      Promise.all([dbLoadContatti(), dbLoadCC()])
        .then(([c, cc]) => { setContatti(c); setCcList(cc); })
        .catch(console.error)
        .finally(() => setLoadingDB(false));
    } else {
      setContatti(loadLS<RubricaContatto>(LS_CONTATTI));
      setCcList(loadLS<CCPredefinito>(LS_CC));
    }
  }, []);

  /* ── Realtime ── */
  useEffect(() => {
    if (!IS_PROD) return;
    const ch = supabase.channel('rubrica_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rubrica_contatti' }, () => { dbLoadContatti().then(setContatti).catch(console.error); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rubrica_cc_predefiniti' }, () => { dbLoadCC().then(setCcList).catch(console.error); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  /* ── Persist DEV ── */
  useEffect(() => { if (!IS_PROD) saveLS(LS_CONTATTI, contatti); }, [contatti]);
  useEffect(() => { if (!IS_PROD) saveLS(LS_CC, ccList); }, [ccList]);

  const selected = useMemo(() => contatti.find(c => c.id === selectedId) ?? null, [contatti, selectedId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contatti
      .filter(c =>
        (!q || `${c.nome} ${c.cognome} ${c.azienda} ${c.ruolo} ${c.emails.join(' ')}`.toLowerCase().includes(q)) &&
        (!filterTipo || c.tipo === filterTipo) &&
        (!filterAz   || c.azienda.toLowerCase() === filterAz.toLowerCase())
      )
      .sort((a, b) => `${a.cognome}${a.nome}`.localeCompare(`${b.cognome}${b.nome}`));
  }, [contatti, search, filterTipo, filterAz]);

  const grouped = useMemo(() => {
    const map = new Map<string, RubricaContatto[]>();
    filtered.forEach(c => { const l = (c.cognome[0] || c.nome[0] || '#').toUpperCase(); if (!map.has(l)) map.set(l, []); map.get(l)!.push(c); });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const aziendeSuggerite = useMemo(() => {
    const s = new Set<string>();
    subaffidamenti.forEach(p => { const a = (p.appaltatore || p.app || '').trim(); if (a) s.add(a); });
    contatti.forEach(c => { if (c.azienda) s.add(c.azienda); });
    return [...s].sort();
  }, [subaffidamenti, contatti]);

  const linkedPratiche = useMemo(() => {
    if (!selected?.azienda) return [];
    const az = selected.azienda.toLowerCase();
    return subaffidamenti.filter(s => (s.appaltatore || s.app || '').trim().toLowerCase() === az);
  }, [selected, subaffidamenti]);

  const kpi = useMemo(() => {
    const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0);
    return {
      totale:   contatti.length,
      aziende:  new Set(contatti.map(c => c.azienda).filter(Boolean)).size,
      conEmail: contatti.filter(c => c.emails.length > 0).length,
      recenti:  contatti.filter(c => new Date(c.created_at) >= m).length,
    };
  }, [contatti]);

  /* ── CRUD ── */
  const handleSave = useCallback(async (form: ContattoForm) => {
    if (modal.editing) {
      if (IS_PROD) await dbUpdate(modal.editing.id, form);
      setContatti(prev => prev.map(c => c.id === modal.editing!.id ? { ...c, ...form, updated_at: new Date().toISOString() } : c));
    } else {
      if (IS_PROD) {
        const uid = (await supabase.auth.getUser()).data.user?.id;
        const n = await dbInsert(form, uid);
        setContatti(prev => [...prev, n]); setSelectedId(n.id);
      } else {
        const now = new Date().toISOString();
        const n: RubricaContatto = { ...form, id: crypto.randomUUID(), created_at: now, updated_at: now };
        setContatti(prev => [...prev, n]); setSelectedId(n.id);
      }
    }
    setModal({ open: false, editing: null, tab: 'appaltatore' });
  }, [modal.editing]);

  const handleDelete = useCallback(async (id: string) => {
    if (IS_PROD) await dbDelete(id);
    setContatti(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDeleteConfirm(null);
  }, [selectedId]);

  const handleAddEmail = useCallback(async () => {
    if (!selected) return;
    const e = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setEmailError('Formato non valido'); return; }
    if (selected.emails.includes(e)) { setEmailError('Email già presente'); return; }
    const newEmails = [...selected.emails, e];
    if (IS_PROD) await dbUpdate(selected.id, { emails: newEmails });
    setContatti(prev => prev.map(c => c.id === selected.id ? { ...c, emails: newEmails, updated_at: new Date().toISOString() } : c));
    setEmailInput(''); setEmailError('');
  }, [selected, emailInput]);

  const handleRemoveEmail = useCallback(async (email: string) => {
    if (!selected) return;
    const newEmails = selected.emails.filter(e => e !== email);
    if (IS_PROD) await dbUpdate(selected.id, { emails: newEmails });
    setContatti(prev => prev.map(c => c.id === selected.id ? { ...c, emails: newEmails, updated_at: new Date().toISOString() } : c));
  }, [selected]);

  const handleAddCC = useCallback(async (cc: { nome: string; email: string; ruolo?: string }) => {
    if (IS_PROD) { const n = await dbInsertCC(cc); setCcList(prev => [...prev, n]); }
    else { setCcList(prev => [...prev, { ...cc, id: crypto.randomUUID() }]); }
  }, []);

  const handleDeleteCC = useCallback(async (id: string) => {
    if (IS_PROD) await dbDeleteCC(id);
    setCcList(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleUpdateCC = useCallback(async (id: string, cc: { nome: string; email: string; ruolo?: string }) => {
    if (IS_PROD) await dbUpdateCC(id, cc);
    setCcList(prev => prev.map(c => c.id === id ? { ...c, ...cc } : c));
  }, []);

  const exportExcel = useCallback(() => {
    const rows = contatti.map(c => ({
      'Cognome': c.cognome, 'Nome': c.nome, 'Tipo': TIPO_CFG[c.tipo].label,
      'Azienda': c.azienda, 'Ruolo': c.ruolo,
      'Email': c.emails.join('; '), 'Telefono': c.telefono,
      'ID Contratto': c.id_contratto || '', 'Oggetto Pratica': c.oggetto_pratica || '',
      'Aggiunto': fmtDate(c.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [16, 14, 14, 28, 22, 34, 16, 18, 26, 12].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Rubrica');
    XLSX.writeFile(wb, `Rubrica_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  }, [contatti]);

  if (loadingDB) return (
    <div className="flex h-full bg-[#07101e] items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-[#534AB7]/20 border-t-[#534AB7] rounded-full animate-spin"/>
    </div>
  );

  /* ─── Render ─── */
  return (
    <div className="flex h-full bg-[#07101e]">

      {/* ═══ LEFT PANEL ═══ */}
      <div className="w-[300px] flex-shrink-0 border-r border-white/8 flex flex-col">
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookUser size={15} className="text-[#a89ef8]"/>
              <h2 className="text-sm font-semibold text-white">Rubrica</h2>
              {contatti.length > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#a89ef8]/20 text-[#a89ef8]">{contatti.length}</span>}
            </div>
            <div className="flex gap-1">
              {contatti.length > 0 && (
                <button onClick={exportExcel} title="Esporta Excel"
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors">
                  <FileDown size={11}/> XLS
                </button>
              )}
              <button onClick={() => setModal({ open: true, editing: null, tab: 'appaltatore' })}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#534AB7]/80 hover:bg-[#534AB7] text-white border border-[#534AB7] transition-colors">
                <Plus size={11}/> Nuovo
              </button>
            </div>
          </div>

          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#a89ef8]/50"
              placeholder="Cerca nome, email, azienda…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>

          <div className="flex gap-1.5">
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value as typeof filterTipo)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-gray-400 focus:outline-none min-w-0">
              <option value="">Tutti i tipi</option>
              <option value="appaltatore">Appaltatore</option>
              <option value="interno_pser">PSER</option>
            </select>
            <select value={filterAz} onChange={e => setFilterAz(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-gray-400 focus:outline-none min-w-0">
              <option value="">Tutte le aziende</option>
              {aziendeSuggerite.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {(filterTipo || filterAz) && (
            <button onClick={() => { setFilterTipo(''); setFilterAz(''); }}
              className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              <X size={10}/> Reset filtri
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {contatti.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 px-4 text-center">
              <BookUser size={32} className="text-gray-700"/>
              <p className="text-xs text-gray-500">Nessun contatto</p>
              <button onClick={() => setModal({ open: true, editing: null, tab: 'appaltatore' })}
                className="px-3 py-1.5 rounded-lg bg-[#534AB7]/80 text-xs text-white hover:bg-[#534AB7] transition-colors">
                Aggiungi il primo
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-gray-600 mt-8">Nessun risultato</p>
          ) : (
            grouped.map(([letter, items]) => (
              <div key={letter}>
                <div className="px-4 py-1 text-[10px] font-bold text-gray-700 uppercase tracking-widest sticky top-0 bg-[#07101e]">{letter}</div>
                {items.map(c => (
                  <button key={c.id} onClick={() => { setSelectedId(c.id); setEmailInput(''); setEmailError(''); }}
                    className={cn('w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left border-l-2',
                      selectedId === c.id ? 'bg-[#a89ef8]/10 border-[#a89ef8]' : 'hover:bg-white/5 border-transparent')}>
                    <Avatar c={c} size={34}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-200 truncate">{c.cognome} {c.nome}</span>
                        <TypeBadge tipo={c.tipo}/>
                      </div>
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">{c.azienda || c.ruolo || '—'}</div>
                    </div>
                    {c.emails.length > 0 && (
                      <div className="w-4 h-4 rounded-full bg-[#378ADD]/10 flex items-center justify-center flex-shrink-0">
                        <Mail size={8} className="text-[#378ADD]"/>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col p-6">
            {contatti.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mb-8">
                {([
                  { label: 'Totale Contatti', val: kpi.totale,   color: '#a89ef8', tipo: 'totale'   as KpiType },
                  { label: 'Aziende',         val: kpi.aziende,  color: '#378ADD', tipo: 'aziende'  as KpiType },
                  { label: 'Con Email',        val: kpi.conEmail, color: '#1D9E75', tipo: 'conEmail' as KpiType },
                  { label: 'Questo mese',      val: kpi.recenti,  color: '#F5A800', tipo: 'recenti'  as KpiType },
                ] as const).map(k => (
                  <button key={k.label} onClick={() => setKpiModal(k.tipo)}
                    className="bg-white/3 border border-white/8 rounded-2xl p-4 text-left hover:bg-white/5 hover:border-white/15 transition-all group cursor-pointer">
                    <div className="text-2xl font-bold" style={{ color: k.color }}>{k.val}</div>
                    <div className="text-[10px] text-gray-500 mt-1 group-hover:text-gray-400 transition-colors flex items-center gap-1">
                      {k.label} <span className="opacity-0 group-hover:opacity-60 transition-opacity text-[8px]">▸</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <BookUser size={48} className="text-gray-700 opacity-30"/>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-400">
                  {contatti.length > 0 ? 'Seleziona un contatto' : 'La rubrica è vuota'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {contatti.length > 0 ? 'Clicca un nome a sinistra per vedere i dettagli' : 'Aggiungi il primo contatto per iniziare'}
                </p>
              </div>
              {contatti.length === 0 && (
                <button onClick={() => setModal({ open: true, editing: null, tab: 'appaltatore' })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#534AB7] to-[#6358cc] text-sm text-white font-semibold shadow-lg shadow-[#534AB7]/20 transition-all">
                  <Plus size={14}/> Aggiungi Contatto
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Back button */}
            <div className="px-6 pt-4 pb-0">
              <button onClick={() => setSelectedId(null)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#a89ef8] transition-colors group">
                <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform"/>
                Vista generale
              </button>
            </div>
            {/* Header contatto */}
            <div className="px-6 py-5 border-b border-white/8">
              <div className="flex items-start gap-5">
                <Avatar c={selected} size={60}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white">{selected.cognome} {selected.nome}</h2>
                    <TypeBadge tipo={selected.tipo}/>
                  </div>
                  {selected.ruolo   && <p className="text-sm text-gray-400 mt-0.5">{selected.ruolo}</p>}
                  {selected.azienda && <div className="flex items-center gap-1.5 mt-1"><Building2 size={11} className="text-gray-600"/><span className="text-xs text-gray-400">{selected.azienda}</span></div>}
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  <button onClick={() => setSollecitoContact(selected)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#378ADD]/15 border border-[#378ADD]/30 text-[#378ADD] text-xs font-semibold hover:bg-[#378ADD]/25 transition-colors">
                    <Send size={13}/> Invia Sollecito
                  </button>
                  <button onClick={() => setModal({ open: true, editing: selected, tab: selected.tipo })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors">
                    <Edit2 size={13}/> Modifica
                  </button>
                  <button onClick={() => setDeleteConfirm(selected.id)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-500 hover:bg-[#E24B4A]/15 hover:text-[#E24B4A] hover:border-[#E24B4A]/30 transition-colors">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 grid grid-cols-2 gap-6">
              {/* Colonna sinistra */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Informazioni</h3>
                  <div className="bg-white/3 border border-white/8 rounded-xl divide-y divide-white/5">
                    {[
                      { icon: <Briefcase size={13}/>, label: 'Ruolo',    value: selected.ruolo },
                      { icon: <Building2 size={13}/>, label: 'Azienda',  value: selected.azienda },
                      { icon: <Phone size={13}/>,     label: 'Telefono', value: selected.telefono },
                      ...(selected.tipo === 'appaltatore' ? [
                        { icon: <Link2 size={13}/>,     label: 'ID Contratto',    value: selected.id_contratto || '' },
                        { icon: <Briefcase size={13}/>, label: 'Oggetto Pratica', value: selected.oggetto_pratica || '' },
                      ] : []),
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-gray-600 flex-shrink-0">{row.icon}</span>
                        <span className="text-[10px] text-gray-600 w-24 flex-shrink-0">{row.label}</span>
                        <span className="text-xs text-gray-300 truncate">{row.value || <span className="text-gray-700 italic">—</span>}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email con gestione immediata */}
                <div>
                  <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Mail size={10}/> Email
                    <span className="px-1.5 py-px rounded-full bg-white/5 text-gray-500 font-normal">{selected.emails.length}</span>
                  </h3>
                  <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
                    {selected.emails.length === 0
                      ? <p className="px-4 py-3 text-xs text-gray-600 italic">Nessun email registrato</p>
                      : selected.emails.map(em => (
                        <div key={em} className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 last:border-0">
                          <Mail size={12} className="text-[#378ADD] flex-shrink-0"/>
                          <span className="flex-1 text-xs text-gray-200 truncate">{em}</span>
                          <button onClick={() => handleRemoveEmail(em)}
                            className="p-1 rounded hover:bg-[#E24B4A]/15 text-gray-600 hover:text-[#E24B4A] transition-colors flex-shrink-0"><X size={11}/></button>
                        </div>
                      ))
                    }
                    <div className="px-3 py-2.5 border-t border-white/5 flex gap-2 items-center">
                      <input value={emailInput}
                        onChange={e => { setEmailInput(e.target.value.toLowerCase()); setEmailError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); } }}
                        placeholder="nuova@email.it"
                        className={cn('flex-1 bg-[#0b1a2e] border rounded-lg text-xs text-[#c8ddf0] px-2.5 py-1.5 outline-none transition-all',
                          emailError ? 'border-[#E24B4A]/60' : 'border-white/10 focus:border-[#534AB7]/60')}/>
                      <button onClick={handleAddEmail}
                        className="p-1.5 rounded-lg bg-[#534AB7]/80 hover:bg-[#534AB7] text-white transition-colors flex-shrink-0"><Plus size={12}/></button>
                    </div>
                    {emailError && <p className="px-4 pb-2 text-[10px] text-[#E24B4A]">{emailError}</p>}
                  </div>
                </div>

                <div className="text-[10px] text-gray-700 space-y-0.5">
                  <div>Aggiunto il {fmtDate(selected.created_at)}</div>
                  {selected.created_at !== selected.updated_at && <div>Aggiornato il {fmtDate(selected.updated_at)}</div>}
                </div>
              </div>

              {/* Colonna destra: pratiche collegate */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Link2 size={10}/> Pratiche collegate
                  {linkedPratiche.length > 0 && <span className="px-1.5 py-px rounded-full bg-[#a89ef8]/20 text-[#a89ef8]">{linkedPratiche.length}</span>}
                </h3>
                {linkedPratiche.length === 0 ? (
                  <div className="bg-white/3 border border-white/8 rounded-xl p-5 flex flex-col items-center gap-2">
                    <Link2 size={24} className="text-gray-700 opacity-30"/>
                    <p className="text-xs text-gray-600 text-center">
                      {selected.azienda ? `Nessun subaffidamento per "${selected.azienda}"` : "Aggiungi un'azienda per vedere le pratiche"}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
                    {linkedPratiche.slice(0, 10).map((p, i) => (
                      <div key={p.id} className={cn('flex items-center gap-3 px-4 py-2.5', i < linkedPratiche.length - 1 && 'border-b border-white/5')}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-[#a89ef8]">{p.id}</span>
                            <span className="px-1.5 py-px rounded text-[9px] bg-white/5 text-gray-500 border border-white/8">{p.stato}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">{p.oggettoRichiesta || p.oggetto || '—'}</div>
                        </div>
                        <button onClick={() => setSollecitoContact(selected)} title="Invia sollecito"
                          className="p-1.5 rounded-lg hover:bg-[#378ADD]/15 text-gray-600 hover:text-[#378ADD] transition-colors flex-shrink-0">
                          <Send size={12}/>
                        </button>
                      </div>
                    ))}
                    {linkedPratiche.length > 10 && (
                      <div className="px-4 py-2 text-[10px] text-gray-600 text-center border-t border-white/5">+{linkedPratiche.length - 10} altre</div>
                    )}
                  </div>
                )}

                <div className="mt-4 bg-white/3 border border-white/8 rounded-xl p-3 flex items-center gap-3">
                  {selected.tipo === 'interno_pser' ? <UserCheck size={16} className="text-[#378ADD]"/> : <Building2 size={16} className="text-[#F5A800]"/>}
                  <div>
                    <div className="text-xs font-semibold" style={{ color: TIPO_CFG[selected.tipo].color }}>Contatto {TIPO_CFG[selected.tipo].label}</div>
                    <div className="text-[10px] text-gray-600">{selected.tipo === 'interno_pser' ? 'Personale interno Eni / Consociata' : 'Referente azienda appaltatrice'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODALS ═══ */}
      {modal.open && (
        <ContattoModal
          initial={modal.editing
            ? { nome: modal.editing.nome, cognome: modal.editing.cognome, azienda: modal.editing.azienda, ruolo: modal.editing.ruolo, emails: [...modal.editing.emails], telefono: modal.editing.telefono, tipo: modal.editing.tipo, id_contratto: modal.editing.id_contratto || '', oggetto_pratica: modal.editing.oggetto_pratica || '' }
            : EMPTY_FORM}
          initialTab={modal.tab}
          aziendeSuggerite={aziendeSuggerite}
          subaffidamenti={subaffidamenti}
          ccList={ccList}
          canEditCC={canEditCC}
          onSave={handleSave}
          onAddCC={handleAddCC}
          onUpdateCC={handleUpdateCC}
          onDeleteCC={handleDeleteCC}
          onClose={() => setModal({ open: false, editing: null, tab: 'appaltatore' })}
        />
      )}

      {sollecitoContact && (
        <SollecitoModal
          contact={sollecitoContact}
          contatti={contatti}
          ccList={ccList}
          subaffidamenti={subaffidamenti}
          praticaPreselezionata={params.get('pratica')}
          onClose={() => setSollecitoContact(null)}
        />
      )}

      {kpiModal && (
        <KpiModal
          tipo={kpiModal}
          contatti={contatti}
          onSelect={id => { setSelectedId(id); setKpiModal(null); }}
          onClose={() => setKpiModal(null)}
        />
      )}

      {deleteConfirm && selected && (
        <ConfirmModal
          title="Elimina contatto?"
          message={`Stai per eliminare ${selected.cognome} ${selected.nome}. L'azione è irreversibile.`}
          confirmLabel="Sì, elimina"
          onConfirm={() => { handleDelete(deleteConfirm); setDeleteConfirm(null); }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default Rubrica;
