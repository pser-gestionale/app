import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, ChevronDown, ChevronRight, Mail, Check, Edit2,
  Download, FileText, CheckCircle2, X, Filter, Activity,
  Clock, FileDown, Phone, AlertTriangle, CalendarCheck, UserCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { differenceInDays, format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';
import * as XLSX from 'xlsx';

/* ─── Catalogo fisso 23 documenti ─── */
const CATALOGO: { categoria: string; documento: string }[] = [
  { categoria: 'Contrattuale',   documento: 'Verifica Subappalto' },
  { categoria: 'Contrattuale',   documento: 'Modulo richiesta subappalto' },
  { categoria: 'Contrattuale',   documento: 'Dichiarazione Compliance' },
  { categoria: 'Contrattuale',   documento: 'Clausole contrattuali' },
  { categoria: 'Contrattuale',   documento: 'Copia contratto subappalto' },
  { categoria: 'Amministrativo', documento: 'Autocertificazione Pagamento Lavoratori' },
  { categoria: 'Amministrativo', documento: 'DURC' },
  { categoria: 'Amministrativo', documento: 'Dichiarazione CCIAA' },
  { categoria: 'Amministrativo', documento: 'White List' },
  { categoria: 'Amministrativo', documento: 'Certificato CCIAA' },
  { categoria: 'Amministrativo', documento: 'Autodichiarazione Regolarità Retribitiva' },
  { categoria: 'Sicurezza',      documento: 'DUVRI / PSC / POS' },
  { categoria: 'Sicurezza',      documento: 'Idoneità tecnico professionale' },
  { categoria: 'Sicurezza',      documento: 'Dichiarazione art 14 Dlgs 81' },
  { categoria: 'HSE',            documento: 'Lista referenze' },
  { categoria: 'HSE',            documento: 'Capacità organizzativa' },
  { categoria: 'HSE',            documento: 'Formazione sicurezza' },
  { categoria: 'HSE',            documento: 'DVR' },
  { categoria: 'HSE',            documento: 'Indice infortuni' },
  { categoria: 'Compliance',     documento: 'Verifica rischio controparte' },
  { categoria: 'Compliance',     documento: 'Parti correlate' },
  { categoria: 'Compliance',     documento: 'Liste di riferimento' },
  { categoria: 'Compliance',     documento: 'Verifica Fonti Aperte' },
];
const CATEGORIE = [...new Set(CATALOGO.map(c => c.categoria))];

/* ─── Types ─── */
interface DocScadenza {
  id: string;
  praticaId: string;
  sap: string;
  appaltatore: string;
  categoria: string;
  documento: string;
  dataFineValidita?: string;
  statoSollecito: 'da_aggiornare' | 'gia_contattato' | 'in_attesa' | 'aggiornato';
  dataUltimoSollecito?: string;
  gestitoDa?: string;
  note?: string;
}

interface SollecitoLog {
  id: string;
  praticaId: string;
  appaltatore: string;
  documento: string;
  azione: 'outlook' | 'aggiornato' | 'gia_contattato' | 'in_attesa' | 'da_aggiornare' | 'data_aggiornata';
  ts: string;
  gestitoDa: string;
  note?: string;
}

interface StoricoEntry {
  id: string;
  tipo: 'contatto' | 'aggiornato_standalone';
  azione: 'outlook' | 'gia_contattato' | 'aggiornato';
  documento: string;
  ts: string;
  gestitoDa: string;
  note?: string;
  statoContatto?: 'in_attesa' | 'risposto';
  giorniAttesa?: number;
  dataRisposta?: string;
  giorniRisposta?: number;
  praticaId?: string;
  appaltatore?: string;
}

type StatoScadenza  = 'scaduto' | 'in_scadenza' | 'ok' | 'non_registrato';
type StatoSollecito = DocScadenza['statoSollecito'];

/* ─── Config display ─── */
const SCAD_CFG: Record<StatoScadenza, { label: string; color: string; hex: string; dotCls: string; rowCls: string }> = {
  scaduto:        { label: 'Scaduto',     color: '#E24B4A', hex: '#E24B4A', dotCls: 'bg-[#E24B4A]', rowCls: 'bg-[#E24B4A]/4' },
  in_scadenza:    { label: 'In scadenza', color: '#F5A800', hex: '#F5A800', dotCls: 'bg-[#F5A800]', rowCls: 'bg-[#F5A800]/4' },
  ok:             { label: 'OK',          color: '#1D9E75', hex: '#1D9E75', dotCls: 'bg-[#1D9E75]', rowCls: '' },
  non_registrato: { label: 'Non reg.',    color: '#6B7280', hex: '#6B7280', dotCls: 'bg-gray-500',  rowCls: '' },
};
const SOLL_CFG: Record<StatoSollecito, { label: string; color: string; hex: string }> = {
  da_aggiornare:  { label: 'Da aggiornare',  color: '#E24B4A', hex: '#E24B4A' },
  gia_contattato: { label: 'Già contattato', color: '#378ADD', hex: '#378ADD' },
  in_attesa:      { label: 'In attesa',      color: '#F5A800', hex: '#F5A800' },
  aggiornato:     { label: 'Aggiornato',     color: '#1D9E75', hex: '#1D9E75' },
};
const AZIONE_CFG: Record<SollecitoLog['azione'], {
  label: string; desc: string; color: string; bg: string; border: string;
  Icon: React.FC<{ size?: number; className?: string }>;
}> = {
  outlook:        { label: 'Outlook inviato',     desc: 'Sollecito inviato via email',      color: '#378ADD', bg: 'bg-[#378ADD]/15', border: 'border-[#378ADD]/30', Icon: Phone },
  aggiornato:     { label: 'Documento aggiornato',desc: 'Documento rinnovato e registrato', color: '#1D9E75', bg: 'bg-[#1D9E75]/15', border: 'border-[#1D9E75]/30', Icon: CheckCircle2 },
  gia_contattato: { label: 'Già contattato',      desc: 'Appaltatore già contattato',       color: '#378ADD', bg: 'bg-[#378ADD]/15', border: 'border-[#378ADD]/30', Icon: UserCheck },
  in_attesa:      { label: 'In attesa risposta',  desc: 'In attesa di aggiornamento',       color: '#F5A800', bg: 'bg-[#F5A800]/15', border: 'border-[#F5A800]/30', Icon: Clock },
  da_aggiornare:  { label: 'Da aggiornare',       desc: 'Documento da aggiornare',          color: '#E24B4A', bg: 'bg-[#E24B4A]/15', border: 'border-[#E24B4A]/30', Icon: AlertTriangle },
  data_aggiornata:{ label: 'Data aggiornata',     desc: 'Fine validità aggiornata',         color: '#a89ef8', bg: 'bg-[#a89ef8]/15', border: 'border-[#a89ef8]/30', Icon: CalendarCheck },
};

/* ─── Helpers ─── */
const calcStato = (data?: string): StatoScadenza => {
  if (!data) return 'non_registrato';
  try {
    const d = differenceInDays(new Date(data), new Date());
    if (d < 0)   return 'scaduto';
    if (d <= 30) return 'in_scadenza';
    return 'ok';
  } catch { return 'non_registrato'; }
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: it }); } catch { return d; }
};
const fmtDateTime = (d?: string) => {
  if (!d) return '—';
  try { return format(new Date(d), 'HH:mm', { locale: it }); } catch { return ''; }
};
const toInputDate = (d?: string) => {
  if (!d) return '';
  try { return format(new Date(d), 'yyyy-MM-dd'); } catch { return ''; }
};
const parseDate = (s?: string) => {
  if (!s) return 0;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [mm, dd, yyyy] = s.split('/');
    return new Date(`${yyyy}-${mm}-${dd}`).getTime();
  }
  return new Date(s).getTime() || 0;
};
const dayLabel = (ts: string) => {
  const d = new Date(ts);
  if (isToday(d))     return 'OGGI';
  if (isYesterday(d)) return 'IERI';
  return format(d, 'dd/MM/yyyy');
};

const LS_SCAD  = 'pser_doc_scadenze';
const LS_VISTE = 'pser_pratiche_viste';
const LS_LOG   = 'pser_soll_log';

const loadArr = <T,>(key: string): T[] => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const loadSet = (key: string): Set<string> => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
};

/* ─── Storico logic helpers (shared between global and per-pratica views) ─── */
const buildStoricoEntries = (logs: SollecitoLog[]): StoricoEntry[] => {
  const display: StoricoEntry[] = [];
  const aggiornatiUsati = new Set<string>();

  logs
    .filter(l => l.azione === 'outlook' || l.azione === 'gia_contattato')
    .forEach(contatto => {
      const risposta = logs.find(l =>
        l.azione === 'aggiornato' &&
        l.documento === contatto.documento &&
        l.praticaId === contatto.praticaId &&
        new Date(l.ts) > new Date(contatto.ts)
      );
      if (risposta) aggiornatiUsati.add(risposta.id);
      const giorniAttesa = Math.floor((Date.now() - new Date(contatto.ts).getTime()) / 86_400_000);
      const giorniRisposta = risposta
        ? Math.floor((new Date(risposta.ts).getTime() - new Date(contatto.ts).getTime()) / 86_400_000)
        : undefined;
      display.push({
        id: contatto.id, tipo: 'contatto',
        azione: contatto.azione as 'outlook' | 'gia_contattato',
        documento: contatto.documento, ts: contatto.ts,
        gestitoDa: contatto.gestitoDa, note: contatto.note,
        statoContatto: risposta ? 'risposto' : 'in_attesa',
        giorniAttesa: risposta ? undefined : giorniAttesa,
        dataRisposta: risposta?.ts, giorniRisposta,
        praticaId: contatto.praticaId, appaltatore: contatto.appaltatore,
      });
    });

  logs
    .filter(l => l.azione === 'aggiornato' && !aggiornatiUsati.has(l.id))
    .forEach(agg => {
      display.push({
        id: agg.id, tipo: 'aggiornato_standalone', azione: 'aggiornato',
        documento: agg.documento, ts: agg.ts,
        gestitoDa: agg.gestitoDa, note: agg.note,
        praticaId: agg.praticaId, appaltatore: agg.appaltatore,
      });
    });

  display.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return display;
};

const toStoricoGroups = (entries: StoricoEntry[]): [string, StoricoEntry[]][] => {
  const groups = new Map<string, StoricoEntry[]>();
  entries.forEach(e => {
    const lbl = dayLabel(e.ts);
    if (!groups.has(lbl)) groups.set(lbl, []);
    groups.get(lbl)!.push(e);
  });
  return [...groups.entries()];
};

/* ─── PDF print helper ─── */
const openPrint = (html: string) => {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.print(); }, 400);
};

const PDF_BASE_STYLE = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',sans-serif;font-size:11px;color:#1a202c;padding:32px;background:#fff}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #534AB7}
  .hdr h1{font-size:18px;font-weight:700;color:#0f172a}
  .hdr .sub{font-size:10px;color:#64748b;margin-top:4px}
  .hdr .meta{text-align:right;font-size:10px;color:#94a3b8}
  .kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
  .kpi-card{border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px}
  .kpi-card .num{font-size:22px;font-weight:700}
  .kpi-card .lbl{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
  .sec{margin-bottom:20px}
  .sec-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#534AB7;border-left:3px solid #534AB7;padding-left:8px;margin-bottom:8px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  thead th{background:#0f172a;color:#fff;padding:7px 9px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.05em}
  tbody td{padding:7px 9px;border-bottom:1px solid #f1f5f9}
  tbody tr:nth-child(even){background:#f8fafc}
  .badge{display:inline-block;padding:2px 7px;border-radius:20px;font-size:8px;font-weight:700;color:#fff}
  .footer{margin-top:28px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between}
  @page{margin:14mm;size:A4}
`;

/* ─── Storico card (shared renderer) ─── */
interface StoricoCardProps {
  entry: StoricoEntry;
  showPratica?: boolean;
  onGotoPratica?: (id: string) => void;
}

const StoricoCard: React.FC<StoricoCardProps> = ({ entry, showPratica, onGotoPratica }) => {
  const isContatto = entry.tipo === 'contatto';
  const IconComp   = entry.azione === 'outlook' ? Phone : entry.azione === 'gia_contattato' ? UserCheck : CheckCircle2;
  const iconColor  = isContatto ? '#378ADD' : '#1D9E75';
  const iconBg     = isContatto ? 'bg-[#378ADD]/15' : 'bg-[#1D9E75]/15';
  const iconBorder = isContatto ? 'border-[#378ADD]/30' : 'border-[#1D9E75]/30';
  const azioneLabel = entry.azione === 'outlook' ? 'Outlook inviato' : entry.azione === 'gia_contattato' ? 'Già contattato' : 'Documento aggiornato';

  return (
    <div className="flex gap-4">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border', iconBg, iconBorder)}>
        <IconComp size={16} style={{ color: iconColor }}/>
      </div>
      <div className="flex-1 bg-white/3 border border-white/8 rounded-xl px-4 py-3 hover:bg-white/5 transition-colors mb-1">
        {/* Riga 1: documento + tipo + ora */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold text-white truncate">{entry.documento}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/6 text-gray-400 border border-white/10 flex-shrink-0">
              {azioneLabel}
            </span>
            {showPratica && entry.praticaId && (
              <button
                onClick={() => onGotoPratica?.(entry.praticaId!)}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#a89ef8]/15 text-[#a89ef8] border border-[#a89ef8]/20 flex-shrink-0 hover:bg-[#a89ef8]/25 transition-colors"
                title="Apri pratica"
              >
                {entry.praticaId}
              </button>
            )}
          </div>
          <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">{fmtDateTime(entry.ts)}</span>
        </div>
        {/* Appaltatore (solo vista globale) */}
        {showPratica && entry.appaltatore && (
          <div className="text-[10px] text-gray-600 mb-1.5">{entry.appaltatore}</div>
        )}
        {/* Riga 2: utente + stato contatto */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#a89ef8]/25 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-[#a89ef8]">{(entry.gestitoDa || 'U')[0].toUpperCase()}</span>
            </div>
            <span className="text-[11px] text-gray-500">{entry.gestitoDa}</span>
            {entry.note && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-[11px] text-gray-600 italic truncate max-w-[160px]">{entry.note}</span>
              </>
            )}
          </div>
          {isContatto && (
            entry.statoContatto === 'risposto' ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1D9E75]/15 border border-[#1D9E75]/30 flex-shrink-0">
                <CheckCircle2 size={11} className="text-[#1D9E75]"/>
                <span className="text-[10px] font-semibold text-[#1D9E75]">
                  Risposto {entry.giorniRisposta === 0 ? 'stesso giorno' : `dopo ${entry.giorniRisposta} ${entry.giorniRisposta === 1 ? 'giorno' : 'giorni'}`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5A800]/15 border border-[#F5A800]/30 flex-shrink-0">
                <Clock size={11} className="text-[#F5A800]"/>
                <span className="text-[10px] font-semibold text-[#F5A800]">
                  In attesa {entry.giorniAttesa === 0 ? 'da oggi' : `da ${entry.giorniAttesa} ${entry.giorniAttesa === 1 ? 'giorno' : 'giorni'}`}
                </span>
              </div>
            )
          )}
        </div>
        {/* Riga 3: data risposta */}
        {isContatto && entry.statoContatto === 'risposto' && entry.dataRisposta && (
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5">
            <CalendarCheck size={11} className="text-[#1D9E75]"/>
            <span className="text-[10px] text-gray-500">
              Aggiornato il <span className="text-[#1D9E75] font-semibold">{fmtDate(entry.dataRisposta)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Timeline renderer ─── */
interface StoricoTimelineProps {
  gruppi: [string, StoricoEntry[]][];
  showPratica?: boolean;
  onGotoPratica?: (id: string) => void;
  emptyText?: string;
  emptySubtext?: string;
}

const StoricoTimeline: React.FC<StoricoTimelineProps> = ({ gruppi, showPratica, onGotoPratica, emptyText, emptySubtext }) => {
  if (gruppi.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-600">
        <Phone size={36} className="opacity-20"/>
        <p className="text-sm">{emptyText ?? 'Nessun contatto registrato'}</p>
        {emptySubtext && <p className="text-xs text-gray-700">{emptySubtext}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {gruppi.map(([giorno, entries]) => (
        <div key={giorno}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{giorno}</span>
            <div className="flex-1 h-px bg-white/8"/>
            <span className="text-[10px] text-gray-600">
              {entries.length} {entries.length === 1 ? 'contatto' : 'contatti'}
            </span>
          </div>
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-white/8"/>
            <div className="space-y-3">
              {entries.map(entry => (
                <StoricoCard key={entry.id} entry={entry} showPratica={showPratica} onGotoPratica={onGotoPratica}/>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Component ─── */
const GestioneSolleciti: React.FC = () => {
  const { subaffidamenti, documenti } = useData();
  const { user } = useAuth();

  const [docScadenze,   setDocScadenze]   = useState<DocScadenza[]>(() => loadArr<DocScadenza>(LS_SCAD));
  const [praticheViste, setPraticheViste] = useState<Set<string>>(() => loadSet(LS_VISTE));
  const [sollLog,       setSollLog]       = useState<SollecitoLog[]>(() => loadArr<SollecitoLog>(LS_LOG));
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [expandedApps,  setExpandedApps]  = useState<Set<string>>(new Set());
  const [searchApp,     setSearchApp]     = useState('');
  const [fStato,        setFStato]        = useState<StatoScadenza | ''>('');
  const [fSollecito,    setFSollecito]    = useState<StatoSollecito | ''>('');
  const [fCategoria,    setFCategoria]    = useState('');
  const [editingKey,    setEditingKey]    = useState<string | null>(null);
  const [editDate,      setEditDate]      = useState('');
  const [editNote,      setEditNote]      = useState('');
  const [rightTab,        setRightTab]        = useState<'documenti' | 'storico'>('documenti');
  const [expandedStorico, setExpandedStorico] = useState<Set<string>>(new Set());

  useEffect(() => { localStorage.setItem(LS_SCAD,  JSON.stringify(docScadenze));        }, [docScadenze]);
  useEffect(() => { localStorage.setItem(LS_VISTE, JSON.stringify([...praticheViste])); }, [praticheViste]);
  useEffect(() => { localStorage.setItem(LS_LOG,   JSON.stringify(sollLog));            }, [sollLog]);

  const selectedPratica = useMemo(
    () => subaffidamenti.find(s => s.id === selectedId) ?? null,
    [subaffidamenti, selectedId]
  );

  /* ─── Appaltatori raggruppati ─── */
  const appaltatoriGruppi = useMemo(() => {
    const map = new Map<string, typeof subaffidamenti>();
    subaffidamenti.forEach(s => {
      const app = (s.appaltatore || s.app || '').trim();
      if (!app) return;
      if (!map.has(app)) map.set(app, []);
      map.get(app)!.push(s);
    });
    const result: { app: string; pratiche: typeof subaffidamenti }[] = [];
    map.forEach((pratiche, app) => {
      pratiche.sort((a, b) => parseDate(b.dataCreazione || b.inserito) - parseDate(a.dataCreazione || a.inserito));
      result.push({ app, pratiche });
    });
    return result.sort((a, b) => a.app.localeCompare(b.app));
  }, [subaffidamenti]);

  const countsPerPratica = useMemo(() => {
    const map = new Map<string, { scaduti: number; in_sc: number }>();
    subaffidamenti.forEach(s => {
      let scaduti = 0, in_sc = 0;
      CATALOGO.forEach(({ documento }) => {
        const rec = docScadenze.find(d => d.praticaId === s.id && d.documento === documento);
        const st  = calcStato(rec?.dataFineValidita);
        if (st === 'scaduto')     scaduti++;
        if (st === 'in_scadenza') in_sc++;
      });
      map.set(s.id, { scaduti, in_sc });
    });
    return map;
  }, [subaffidamenti, docScadenze]);

  const countsPerApp = useMemo(() => {
    const map = new Map<string, { scaduti: number; in_sc: number }>();
    appaltatoriGruppi.forEach(({ app, pratiche }) => {
      let sc = 0, ins = 0;
      pratiche.forEach(p => { const c = countsPerPratica.get(p.id); if (c) { sc += c.scaduti; ins += c.in_sc; } });
      map.set(app, { scaduti: sc, in_sc: ins });
    });
    return map;
  }, [appaltatoriGruppi, countsPerPratica]);

  const filteredApps = useMemo(() => {
    if (!searchApp.trim()) return appaltatoriGruppi;
    const q = searchApp.toLowerCase();
    return appaltatoriGruppi.filter(g =>
      g.app.toLowerCase().includes(q) ||
      g.pratiche.some(p => p.id.includes(q) || (p.oggettoRichiesta || '').toLowerCase().includes(q))
    );
  }, [appaltatoriGruppi, searchApp]);

  /* ─── Docs con stato per pratica selezionata ─── */
  const docsConStato = useMemo(() => {
    if (!selectedPratica) return [];
    const sap = selectedPratica.idSapContratto || selectedPratica.idSap || '';
    return CATALOGO.map(({ categoria, documento }) => {
      const saved   = docScadenze.find(d => d.praticaId === selectedPratica.id && d.documento === documento);
      const fromDoc = !saved
        ? documenti.find(d => d.sap === sap && d.doc.toLowerCase().includes(documento.split(' ')[0].toLowerCase()))
        : undefined;
      const dataFineValidita = saved?.dataFineValidita || fromDoc?.scad;
      const statoSollecito: StatoSollecito = saved?.statoSollecito ?? (fromDoc ? 'gia_contattato' : 'da_aggiornare');
      return { categoria, documento, dataFineValidita, statoScadenza: calcStato(dataFineValidita), statoSollecito, note: saved?.note, gestitoDa: saved?.gestitoDa, dataUltimoSollecito: saved?.dataUltimoSollecito };
    });
  }, [selectedPratica, docScadenze, documenti]);

  const kpi = useMemo(() => ({
    scaduti: docsConStato.filter(d => d.statoScadenza === 'scaduto').length,
    in_sc:   docsConStato.filter(d => d.statoScadenza === 'in_scadenza').length,
    ok:      docsConStato.filter(d => d.statoScadenza === 'ok').length,
    non_reg: docsConStato.filter(d => d.statoScadenza === 'non_registrato').length,
  }), [docsConStato]);

  const filteredDocs = useMemo(() =>
    docsConStato.filter(d =>
      (!fStato     || d.statoScadenza  === fStato) &&
      (!fSollecito || d.statoSollecito === fSollecito) &&
      (!fCategoria || d.categoria      === fCategoria)
    ), [docsConStato, fStato, fSollecito, fCategoria]);

  const groupedDocs = useMemo(() => {
    const map = new Map<string, typeof filteredDocs>();
    filteredDocs.forEach(d => { if (!map.has(d.categoria)) map.set(d.categoria, []); map.get(d.categoria)!.push(d); });
    return map;
  }, [filteredDocs]);

  /* ─── Storico per-pratica (usato nel tab Storico quando una pratica è aperta) ─── */
  const storicoGruppi = useMemo(() => {
    if (!selectedPratica) return [] as [string, StoricoEntry[]][];
    return toStoricoGroups(buildStoricoEntries(sollLog.filter(l => l.praticaId === selectedPratica.id)));
  }, [sollLog, selectedPratica]);

  const storicoCount = useMemo(
    () => storicoGruppi.reduce((s, [, es]) => s + es.length, 0),
    [storicoGruppi]
  );

  /* ─── Storico globale: raggruppato per pratica (vista senza pratica selezionata) ─── */
  const storicoGlobale = useMemo(() => {
    const entries = buildStoricoEntries(sollLog);
    const map = new Map<string, StoricoEntry[]>();
    entries.forEach(e => {
      if (!e.praticaId) return;
      if (!map.has(e.praticaId)) map.set(e.praticaId, []);
      map.get(e.praticaId)!.push(e);
    });
    return [...map.entries()]
      .map(([praticaId, praticaEntries]) => {
        const p = subaffidamenti.find(s => s.id === praticaId);
        return {
          praticaId,
          oggetto:     p?.oggettoRichiesta || p?.oggetto || '—',
          appaltatore: (p?.appaltatore || p?.app || '').trim(),
          entries: praticaEntries,
          lastTs: Math.max(...praticaEntries.map(e => new Date(e.ts).getTime())),
        };
      })
      .sort((a, b) => b.lastTs - a.lastTs);
  }, [sollLog, subaffidamenti]);

  /* ─── Actions ─── */
  const addLog = useCallback((praticaId: string, appaltatore: string, documento: string, azione: SollecitoLog['azione'], note?: string) => {
    const entry: SollecitoLog = {
      id: crypto.randomUUID(),
      praticaId, appaltatore, documento, azione,
      ts: new Date().toISOString(),
      gestitoDa: user?.nome || 'Utente',
      note,
    };
    setSollLog(prev => [entry, ...prev]);
  }, [user]);

  const selectPratica = useCallback((id: string) => {
    setSelectedId(id);
    setPraticheViste(prev => { const n = new Set(prev); n.add(id); return n; });
    setEditingKey(null);
    setFStato(''); setFSollecito(''); setFCategoria('');
    setRightTab('documenti');
    // Expand the appaltatore so the pratica is visible
    const app = subaffidamenti.find(s => s.id === id);
    if (app) {
      const appName = (app.appaltatore || app.app || '').trim();
      if (appName) setExpandedApps(prev => { const n = new Set(prev); n.add(appName); return n; });
    }
  }, [subaffidamenti]);

  const toggleApp = useCallback((app: string) => {
    setExpandedApps(prev => { const n = new Set(prev); n.has(app) ? n.delete(app) : n.add(app); return n; });
  }, []);

  const upsertDoc = useCallback((documento: string, patch: Partial<DocScadenza>) => {
    if (!selectedPratica) return;
    const sap = selectedPratica.idSapContratto || selectedPratica.idSap || '';
    const app = (selectedPratica.appaltatore || selectedPratica.app || '').trim();
    const cat = CATALOGO.find(c => c.documento === documento)?.categoria || '';
    setDocScadenze(prev => {
      const idx = prev.findIndex(d => d.praticaId === selectedPratica.id && d.documento === documento);
      const base: DocScadenza = idx >= 0 ? prev[idx] : { id: crypto.randomUUID(), praticaId: selectedPratica.id, sap, appaltatore: app, categoria: cat, documento, statoSollecito: 'da_aggiornare' };
      const next: DocScadenza = { ...base, ...patch, gestitoDa: user?.nome };
      if (idx >= 0) { const arr = [...prev]; arr[idx] = next; return arr; }
      return [...prev, next];
    });
  }, [selectedPratica, user]);

  const saveDoc = useCallback((documento: string) => {
    if (!selectedPratica) return;
    upsertDoc(documento, { dataFineValidita: editDate || undefined, note: editNote || undefined });
    addLog(selectedPratica.id, (selectedPratica.appaltatore || selectedPratica.app || '').trim(), documento, 'data_aggiornata');
    setEditingKey(null);
  }, [upsertDoc, editDate, editNote, addLog, selectedPratica]);

  const updateSollecito = useCallback((documento: string, stato: StatoSollecito) => {
    if (!selectedPratica) return;
    const app = (selectedPratica.appaltatore || selectedPratica.app || '').trim();
    upsertDoc(documento, {
      statoSollecito: stato,
      ...(stato === 'in_attesa' || stato === 'aggiornato' ? { dataUltimoSollecito: new Date().toISOString() } : {}),
    });
    addLog(selectedPratica.id, app, documento, stato as SollecitoLog['azione']);
  }, [upsertDoc, addLog, selectedPratica]);

  const sendOutlook = useCallback((documento: string) => {
    if (!selectedPratica) return;
    const app = (selectedPratica.appaltatore || selectedPratica.app || '').trim();
    const sub = encodeURIComponent(`Sollecito aggiornamento — ${documento} — Pratica ${selectedPratica.id}`);
    const bod = encodeURIComponent(`Gentile ${app},\n\ncon la presente si sollecita l'aggiornamento del documento "${documento}" relativo alla pratica n. ${selectedPratica.id}${selectedPratica.oggettoRichiesta ? ` (${selectedPratica.oggettoRichiesta})` : ''}.\n\nSi prega di procedere al caricamento del documento aggiornato tempestivamente.\n\nCordiali saluti`);
    window.location.href = `mailto:?subject=${sub}&body=${bod}`;
    upsertDoc(documento, { statoSollecito: 'in_attesa', dataUltimoSollecito: new Date().toISOString() });
    addLog(selectedPratica.id, app, documento, 'outlook');
  }, [selectedPratica, upsertDoc, addLog]);

  /* ─── Exports ─── */
  const exportPDFPratica = useCallback(() => {
    if (!selectedPratica) return;
    const id  = selectedPratica.id;
    const app = selectedPratica.appaltatore || selectedPratica.app || '';
    const ogg = selectedPratica.oggettoRichiesta || selectedPratica.oggetto || '—';
    const sap = selectedPratica.idSapContratto || selectedPratica.idSap || '—';

    const sections = CATEGORIE.map(cat => {
      const docs = docsConStato.filter(d => d.categoria === cat);
      if (!docs.length) return '';
      const rows = docs.map(d => {
        const sc = SCAD_CFG[d.statoScadenza];
        const sl = SOLL_CFG[d.statoSollecito];
        return `<tr>
          <td>${d.documento}</td>
          <td style="color:${sc.hex};font-weight:600;font-family:monospace">${fmtDate(d.dataFineValidita)}</td>
          <td><span class="badge" style="background:${sc.hex}">${sc.label}</span></td>
          <td><span class="badge" style="background:${sl.hex}">${sl.label}</span></td>
          <td style="color:#64748b;font-size:9px">${fmtDate(d.dataUltimoSollecito)}</td>
        </tr>`;
      }).join('');
      return `<div class="sec">
        <div class="sec-title">${cat}</div>
        <table><thead><tr><th>Documento</th><th>Fine Validità</th><th>Stato</th><th>Sollecito</th><th>Ultimo Sollecito</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    }).join('');

    openPrint(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pratica ${id}</title>
      <style>${PDF_BASE_STYLE}</style></head><body>
      <div class="hdr">
        <div class="header-left">
          <h1>📋 Report Documenti — Pratica ${id}</h1>
          <div class="sub">${app} &nbsp;·&nbsp; ${ogg} &nbsp;·&nbsp; SAP: ${sap}</div>
        </div>
        <div class="meta">Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}<br/>PSER Gestionale v2.2</div>
      </div>
      <div class="kpi">
        <div class="kpi-card"><div class="num" style="color:#E24B4A">${kpi.scaduti}</div><div class="lbl">Scaduti</div></div>
        <div class="kpi-card"><div class="num" style="color:#F5A800">${kpi.in_sc}</div><div class="lbl">In scadenza</div></div>
        <div class="kpi-card"><div class="num" style="color:#1D9E75">${kpi.ok}</div><div class="lbl">OK</div></div>
        <div class="kpi-card"><div class="num" style="color:#6B7280">${kpi.non_reg}</div><div class="lbl">Non registrati</div></div>
      </div>
      ${sections}
      <div class="footer"><span>PSER Gestionale Subaffidamenti — Documento riservato</span><span>Pratica ${id} — ${app}</span></div>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
    </body></html>`);
  }, [selectedPratica, docsConStato, kpi]);

  const exportExcelPratica = useCallback(() => {
    if (!selectedPratica) return;
    const rows = docsConStato.map(d => ({
      'ID Pratica':      selectedPratica.id,
      'Appaltatore':     selectedPratica.appaltatore || selectedPratica.app || '',
      'Oggetto':         selectedPratica.oggettoRichiesta || selectedPratica.oggetto || '',
      'SAP Contratto':   selectedPratica.idSapContratto || selectedPratica.idSap || '',
      'Categoria':       d.categoria,
      'Documento':       d.documento,
      'Fine Validità':   fmtDate(d.dataFineValidita),
      'Stato Scadenza':  SCAD_CFG[d.statoScadenza].label,
      'Stato Sollecito': SOLL_CFG[d.statoSollecito].label,
      'Data Sollecito':  fmtDate(d.dataUltimoSollecito),
      'Gestito Da':      d.gestitoDa || '',
      'Note':            d.note || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [8,18,28,14,14,32,14,14,16,14,14,20].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Documenti');
    XLSX.writeFile(wb, `Pratica_${selectedPratica.id}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  }, [docsConStato, selectedPratica]);

  const exportPDFAll = useCallback(() => {
    const totalScaduti  = subaffidamenti.reduce((s, p) => s + (countsPerPratica.get(p.id)?.scaduti || 0), 0);
    const totalInSc     = subaffidamenti.reduce((s, p) => s + (countsPerPratica.get(p.id)?.in_sc   || 0), 0);
    const totalDocs     = subaffidamenti.length * CATALOGO.length;
    const totalOk       = [...docScadenze].filter(d => calcStato(d.dataFineValidita) === 'ok').length;

    const cards = appaltatoriGruppi.map(({ app, pratiche }) =>
      pratiche.map(p => {
        const sap = p.idSapContratto || p.idSap || '—';
        const docs = CATALOGO.map(({ categoria, documento }) => {
          const saved   = docScadenze.find(d => d.praticaId === p.id && d.documento === documento);
          const fromDoc = !saved ? documenti.find(d => d.sap === (p.idSapContratto || p.idSap || '') && d.doc.toLowerCase().includes(documento.split(' ')[0].toLowerCase())) : undefined;
          const dfv     = saved?.dataFineValidita || fromDoc?.scad;
          const stato   = calcStato(dfv);
          const soll: StatoSollecito = saved?.statoSollecito ?? (fromDoc ? 'gia_contattato' : 'da_aggiornare');
          const sc = SCAD_CFG[stato]; const sl = SOLL_CFG[soll];
          return `<tr><td>${categoria}</td><td>${documento}</td>
            <td style="color:${sc.hex};font-weight:600;font-family:monospace">${fmtDate(dfv)}</td>
            <td><span class="badge" style="background:${sc.hex}">${sc.label}</span></td>
            <td><span class="badge" style="background:${sl.hex}">${sl.label}</span></td></tr>`;
        }).join('');
        return `<div class="sec">
          <div class="sec-title">${app} — Pratica ${p.id} &nbsp;|&nbsp; ${p.oggettoRichiesta || p.oggetto || '—'} &nbsp;|&nbsp; SAP: ${sap}</div>
          <table><thead><tr><th>Categoria</th><th>Documento</th><th>Fine Validità</th><th>Stato</th><th>Sollecito</th></tr></thead>
          <tbody>${docs}</tbody></table></div>`;
      }).join('')
    ).join('');

    openPrint(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Riepilogo Documenti</title>
      <style>${PDF_BASE_STYLE} .sec-title{font-size:9px;background:#f8fafc;padding:6px 8px;border-radius:4px;margin-bottom:6px;border-left:3px solid #534AB7;color:#334155}</style>
      </head><body>
      <div class="hdr">
        <div>
          <h1>📋 Riepilogo Documenti — Tutte le Pratiche</h1>
          <div class="sub">${subaffidamenti.length} pratiche · ${appaltatoriGruppi.length} appaltatori</div>
        </div>
        <div class="meta">Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}<br/>PSER Gestionale v2.2</div>
      </div>
      <div class="kpi">
        <div class="kpi-card"><div class="num" style="color:#E24B4A">${totalScaduti}</div><div class="lbl">Scaduti totali</div></div>
        <div class="kpi-card"><div class="num" style="color:#F5A800">${totalInSc}</div><div class="lbl">In scadenza</div></div>
        <div class="kpi-card"><div class="num" style="color:#1D9E75">${totalOk}</div><div class="lbl">OK</div></div>
        <div class="kpi-card"><div class="num" style="color:#6B7280">${totalDocs}</div><div class="lbl">Documenti totali</div></div>
      </div>
      ${cards}
      <div class="footer"><span>PSER Gestionale Subaffidamenti — Documento riservato — Audit Report</span><span>${format(new Date(), 'dd/MM/yyyy')}</span></div>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
    </body></html>`);
  }, [subaffidamenti, appaltatoriGruppi, countsPerPratica, docScadenze, documenti]);

  const exportExcelAll = useCallback(() => {
    const rows: Record<string, string>[] = [];
    subaffidamenti.forEach(s => {
      const sap = s.idSapContratto || s.idSap || '';
      const app = (s.appaltatore || s.app || '').trim();
      CATALOGO.forEach(({ categoria, documento }) => {
        const saved   = docScadenze.find(d => d.praticaId === s.id && d.documento === documento);
        const fromDoc = !saved ? documenti.find(d => d.sap === sap && d.doc.toLowerCase().includes(documento.split(' ')[0].toLowerCase())) : undefined;
        const dfv     = saved?.dataFineValidita || fromDoc?.scad;
        const stato   = calcStato(dfv);
        const soll: StatoSollecito = saved?.statoSollecito ?? (fromDoc ? 'gia_contattato' : 'da_aggiornare');
        rows.push({
          'ID Pratica': s.id, 'Appaltatore': app,
          'Oggetto': s.oggettoRichiesta || s.oggetto || '',
          'SAP Contratto': sap, 'Categoria': categoria, 'Documento': documento,
          'Fine Validità': fmtDate(dfv),
          'Stato Scadenza': SCAD_CFG[stato].label,
          'Stato Sollecito': SOLL_CFG[soll].label,
          'Gestito Da': saved?.gestitoDa || '',
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [8,20,30,14,14,32,14,14,16,14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riepilogo');
    XLSX.writeFile(wb, `Riepilogo_Documenti_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  }, [subaffidamenti, docScadenze, documenti]);

  /* ─── Export Storico Globale ─── */
  const exportStoricoExcel = useCallback(() => {
    const rows: Record<string, string>[] = [];
    storicoGlobale.forEach(({ praticaId, oggetto, appaltatore, entries }) => {
      entries.forEach(e => {
        const azioneLabel = e.azione === 'outlook' ? 'Outlook inviato' : e.azione === 'gia_contattato' ? 'Già contattato' : 'Documento aggiornato';
        const statoLabel  = e.tipo === 'contatto'
          ? (e.statoContatto === 'risposto' ? 'Risposto' : 'In attesa')
          : '—';
        rows.push({
          'ID Pratica':   praticaId,
          'Appaltatore':  appaltatore,
          'Oggetto':      oggetto,
          'Documento':    e.documento,
          'Azione':       azioneLabel,
          'Data':         fmtDate(e.ts),
          'Ora':          fmtDateTime(e.ts),
          'Gestito Da':   e.gestitoDa,
          'Stato':        statoLabel,
          'Giorni Attesa': e.giorniAttesa != null ? String(e.giorniAttesa) : '—',
          'Giorni Risposta': e.giorniRisposta != null ? String(e.giorniRisposta) : '—',
          'Note':         e.note || '',
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [12, 22, 32, 32, 20, 12, 8, 16, 12, 14, 16, 24].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Storico Solleciti');
    XLSX.writeFile(wb, `Storico_Solleciti_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  }, [storicoGlobale]);

  const exportStoricoPDF = useCallback(() => {
    const totContatti  = storicoGlobale.reduce((s, g) => s + g.entries.length, 0);
    const totInAttesa  = storicoGlobale.reduce((s, g) => s + g.entries.filter(e => e.statoContatto === 'in_attesa').length, 0);
    const totRisposto  = storicoGlobale.reduce((s, g) => s + g.entries.filter(e => e.statoContatto === 'risposto').length, 0);
    const totPratiche  = storicoGlobale.length;

    const azioneColor = (a: string) => a === 'aggiornato' ? '#1D9E75' : '#378ADD';
    const statoColor  = (e: StoricoEntry) => {
      if (e.tipo !== 'contatto') return '#6B7280';
      return e.statoContatto === 'risposto' ? '#1D9E75' : '#F5A800';
    };
    const statoLabel = (e: StoricoEntry) => {
      if (e.tipo !== 'contatto') return '—';
      if (e.statoContatto === 'risposto') return e.giorniRisposta === 0 ? 'Risposto (stesso gg)' : `Risposto dopo ${e.giorniRisposta}gg`;
      return e.giorniAttesa === 0 ? 'In attesa (oggi)' : `In attesa da ${e.giorniAttesa}gg`;
    };

    const sections = storicoGlobale.map(({ praticaId, oggetto, appaltatore, entries }) => {
      const rows = entries.map(e => {
        const az = e.azione === 'outlook' ? 'Outlook inviato' : e.azione === 'gia_contattato' ? 'Già contattato' : 'Doc. aggiornato';
        return `<tr>
          <td>${fmtDate(e.ts)} ${fmtDateTime(e.ts)}</td>
          <td style="max-width:180px;overflow:hidden">${e.documento}</td>
          <td><span class="badge" style="background:${azioneColor(e.azione)}">${az}</span></td>
          <td><span class="badge" style="background:${statoColor(e)}">${statoLabel(e)}</span></td>
          <td style="color:#64748b;font-size:9px">${e.gestitoDa}</td>
          <td style="color:#64748b;font-size:9px;font-style:italic">${e.note || ''}</td>
        </tr>`;
      }).join('');
      return `<div class="sec">
        <div class="sec-title">${praticaId} &nbsp;—&nbsp; ${appaltatore} &nbsp;|&nbsp; ${oggetto}</div>
        <table><thead><tr><th>Data/Ora</th><th>Documento</th><th>Azione</th><th>Stato</th><th>Gestito Da</th><th>Note</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    }).join('');

    openPrint(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Storico Solleciti</title>
      <style>${PDF_BASE_STYLE}
        .sec-title{font-size:9px;background:#f8fafc;padding:6px 8px;border-radius:4px;margin-bottom:6px;border-left:3px solid #534AB7;color:#334155;font-weight:700}
      </style></head><body>
      <div class="hdr">
        <div>
          <h1>📞 Storico Solleciti — Registro Completo</h1>
          <div class="sub">Tutte le pratiche · Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
        </div>
        <div class="meta">PSER Gestionale v2.2<br/>Documento riservato</div>
      </div>
      <div class="kpi">
        <div class="kpi-card"><div class="num" style="color:#534AB7">${totPratiche}</div><div class="lbl">Pratiche con contatti</div></div>
        <div class="kpi-card"><div class="num" style="color:#378ADD">${totContatti}</div><div class="lbl">Contatti totali</div></div>
        <div class="kpi-card"><div class="num" style="color:#F5A800">${totInAttesa}</div><div class="lbl">In attesa risposta</div></div>
        <div class="kpi-card"><div class="num" style="color:#1D9E75">${totRisposto}</div><div class="lbl">Risposti</div></div>
      </div>
      ${sections}
      <div class="footer"><span>PSER Gestionale Subaffidamenti — Storico Solleciti</span><span>${format(new Date(), 'dd/MM/yyyy')}</span></div>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
    </body></html>`);
  }, [storicoGlobale]);

  /* ─── Render ─── */
  return (
    <div className="flex h-full bg-[#07101e]">

      {/* ═══ PANNELLO SINISTRO ═══ */}
      <div className="w-[300px] flex-shrink-0 border-r border-white/8 flex flex-col">
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Appaltatori</h2>
            <div className="flex gap-1">
              <button onClick={exportExcelAll} title="Excel riepilogativo" className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10"><FileDown size={11}/> XLS</button>
              <button onClick={exportPDFAll}   title="PDF audit completo"  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10"><FileText size={11}/> PDF</button>
            </div>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#a89ef8]/50"
              placeholder="Cerca appaltatore o pratica..." value={searchApp} onChange={e => setSearchApp(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {filteredApps.map(({ app, pratiche }) => {
            const expanded = expandedApps.has(app);
            const c = countsPerApp.get(app) || { scaduti: 0, in_sc: 0 };
            return (
              <div key={app}>
                <button onClick={() => toggleApp(app)} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                  {expanded ? <ChevronDown size={13} className="text-gray-500 flex-shrink-0"/> : <ChevronRight size={13} className="text-gray-500 flex-shrink-0"/>}
                  <span className="flex-1 text-xs font-medium text-gray-200 truncate">{app}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    {c.scaduti > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E24B4A]/20 text-[#E24B4A]">{c.scaduti}</span>}
                    {c.in_sc   > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F5A800]/20 text-[#F5A800]">{c.in_sc}</span>}
                  </div>
                </button>
                {expanded && pratiche.map(p => {
                  const isSelected = selectedId === p.id;
                  const vista = praticheViste.has(p.id);
                  const pc    = countsPerPratica.get(p.id) || { scaduti: 0, in_sc: 0 };
                  return (
                    <button key={p.id} onClick={() => selectPratica(p.id)}
                      className={cn('w-full flex items-start gap-2 pl-8 pr-3 py-2 transition-colors text-left border-l-2',
                        isSelected ? 'bg-[#a89ef8]/10 border-[#a89ef8]' : 'hover:bg-white/5 border-transparent')}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-semibold text-gray-300">{p.id}</span>
                          {vista && <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] flex-shrink-0" title="Già controllata"/>}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate mt-0.5">{p.oggettoRichiesta || p.oggetto || p.unitaGestore || p.unitaGest || '—'}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 mt-0.5">
                        {pc.scaduti > 0 && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-[#E24B4A]/20 text-[#E24B4A]">{pc.scaduti}</span>}
                        {pc.in_sc   > 0 && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-[#F5A800]/20 text-[#F5A800]">{pc.in_sc}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {filteredApps.length === 0 && <p className="text-center text-xs text-gray-600 mt-8">Nessun risultato</p>}
        </div>
      </div>

      {/* ═══ PANNELLO DESTRO ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedPratica ? (
          /* ── Vista Globale: raggruppata per pratica, collassabile ── */
          <>
            {/* Header con export */}
            <div className="px-5 py-3 border-b border-white/8 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Activity size={15} className="text-[#a89ef8] flex-shrink-0"/>
                <h2 className="text-sm font-semibold text-white">Storico Solleciti</h2>
                {storicoGlobale.length > 0 && (
                  <>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#a89ef8]/20 text-[#a89ef8]">
                      {storicoGlobale.length} pratiche
                    </span>
                    <span className="text-[10px] text-gray-600 hidden sm:block">
                      · {storicoGlobale.reduce((s, g) => s + g.entries.length, 0)} contatti totali
                    </span>
                  </>
                )}
              </div>
              {storicoGlobale.length > 0 && (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={exportStoricoExcel}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors border border-white/10">
                    <FileDown size={12}/> Excel
                  </button>
                  <button onClick={exportStoricoPDF}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors border border-white/10">
                    <FileText size={12}/> PDF
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {storicoGlobale.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-600">
                  <Phone size={36} className="opacity-20"/>
                  <p className="text-sm">Nessun contatto registrato</p>
                  <p className="text-xs text-gray-700">Seleziona una pratica e inizia a tracciare i solleciti</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {storicoGlobale.map(({ praticaId, oggetto, appaltatore, entries }) => {
                    const isOpen = expandedStorico.has(praticaId);
                    const inAttesa = entries.some(e => e.statoContatto === 'in_attesa');
                    return (
                      <div key={praticaId} className="border border-white/8 rounded-xl overflow-hidden">
                        {/* Header collassabile */}
                        <div className="flex items-center">
                          <button
                            onClick={() => setExpandedStorico(prev => {
                              const n = new Set(prev);
                              n.has(praticaId) ? n.delete(praticaId) : n.add(praticaId);
                              return n;
                            })}
                            className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-white/3 hover:bg-white/6 transition-colors text-left"
                          >
                            {isOpen
                              ? <ChevronDown size={13} className="text-gray-500 flex-shrink-0"/>
                              : <ChevronRight size={13} className="text-gray-500 flex-shrink-0"/>
                            }
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-[#a89ef8] text-xs">{praticaId}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#a89ef8]/10 text-[#a89ef8] border border-[#a89ef8]/20">
                                  {entries.length} {entries.length === 1 ? 'contatto' : 'contatti'}
                                </span>
                                {inAttesa && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#F5A800]/15 text-[#F5A800] border border-[#F5A800]/20">
                                    In attesa
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                <span className="text-gray-400 font-medium">{appaltatore}</span>
                                {oggetto !== '—' && <><span className="mx-1 text-gray-700">·</span><span>{oggetto}</span></>}
                              </div>
                            </div>
                          </button>
                          {/* Bottone apri pratica */}
                          <button
                            onClick={() => selectPratica(praticaId)}
                            title="Apri pratica"
                            className="px-3 py-2.5 bg-white/3 hover:bg-[#a89ef8]/10 border-l border-white/8 text-gray-600 hover:text-[#a89ef8] transition-colors flex-shrink-0"
                          >
                            <ChevronRight size={13}/>
                          </button>
                        </div>

                        {/* Card storico espandibili */}
                        {isOpen && (
                          <div className="px-4 pt-2 pb-3 space-y-2.5 border-t border-white/8 relative">
                            <div className="absolute left-9 top-0 bottom-0 w-px bg-white/8"/>
                            {entries.map(entry => (
                              <StoricoCard key={entry.id} entry={entry} showPratica={false}/>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── Vista per-pratica ── */
          <>
            {/* Header pratica */}
            <div className="px-5 py-3 border-b border-white/8 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button onClick={() => setSelectedId(null)} className="text-gray-500 hover:text-gray-300 transition-colors" title="Torna alla vista globale">
                    <ChevronRight size={14} className="rotate-180"/>
                  </button>
                  <span className="text-lg font-bold text-white font-mono">{selectedPratica.id}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/8 text-gray-400 border border-white/10">{selectedPratica.stato}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-gray-500">
                  <span className="font-medium text-gray-400">{selectedPratica.appaltatore || selectedPratica.app}</span>
                  {(selectedPratica.oggettoRichiesta || selectedPratica.oggetto) && <><span className="text-gray-700">·</span><span className="truncate max-w-xs">{selectedPratica.oggettoRichiesta || selectedPratica.oggetto}</span></>}
                  {(selectedPratica.idSapContratto || selectedPratica.idSap) && <><span className="text-gray-700">·</span><span>SAP {selectedPratica.idSapContratto || selectedPratica.idSap}</span></>}
                  {(selectedPratica.dataCreazione || selectedPratica.inserito) && <><span className="text-gray-700">·</span><span>Creata {fmtDate(selectedPratica.dataCreazione || selectedPratica.inserito)}</span></>}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={exportExcelPratica} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors border border-white/10"><FileDown size={12}/> Excel</button>
                <button onClick={exportPDFPratica}   className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors border border-white/10"><Download size={12}/> PDF</button>
              </div>
            </div>

            {/* KPI strip */}
            <div className="px-5 py-3 border-b border-white/8 grid grid-cols-4 gap-3">
              {([
                { label: 'Scaduti',        key: 'scaduto'        as StatoScadenza, val: kpi.scaduti, color: '#E24B4A' },
                { label: 'In scadenza',    key: 'in_scadenza'    as StatoScadenza, val: kpi.in_sc,   color: '#F5A800' },
                { label: 'OK',             key: 'ok'             as StatoScadenza, val: kpi.ok,      color: '#1D9E75' },
                { label: 'Non registrati', key: 'non_registrato' as StatoScadenza, val: kpi.non_reg, color: '#6B7280' },
              ]).map(k => (
                <button key={k.key} onClick={() => setFStato(fStato === k.key ? '' : k.key)}
                  className={cn('rounded-xl p-3 text-left transition-all border', fStato === k.key ? 'border-white/20 bg-white/8' : 'border-white/5 bg-white/3 hover:bg-white/6')}>
                  <div className="text-2xl font-bold" style={{ color: k.color }}>{k.val}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{k.label}</div>
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="px-5 border-b border-white/8 flex items-center gap-1">
              {([
                { key: 'documenti', label: 'Documenti',         icon: <FileText size={12}/> },
                { key: 'storico',   label: 'Storico Solleciti', icon: <Activity size={12}/> },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setRightTab(t.key)}
                  className={cn('flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
                    rightTab === t.key ? 'border-[#a89ef8] text-white' : 'border-transparent text-gray-500 hover:text-gray-300')}>
                  {t.icon}{t.label}
                  {t.key === 'storico' && storicoCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-[#a89ef8]/20 text-[#a89ef8]">
                      {storicoCount}
                    </span>
                  )}
                </button>
              ))}
              {rightTab === 'documenti' && (
                <div className="ml-auto flex items-center gap-2 py-2">
                  <Filter size={12} className="text-gray-500"/>
                  <select className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-gray-300 focus:outline-none" value={fCategoria} onChange={e => setFCategoria(e.target.value)}>
                    <option value="">Tutte le categorie</option>
                    {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-gray-300 focus:outline-none" value={fStato} onChange={e => setFStato(e.target.value as StatoScadenza | '')}>
                    <option value="">Tutti gli stati</option>
                    <option value="scaduto">Scaduto</option>
                    <option value="in_scadenza">In scadenza</option>
                    <option value="ok">OK</option>
                    <option value="non_registrato">Non registrato</option>
                  </select>
                  <select className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-gray-300 focus:outline-none" value={fSollecito} onChange={e => setFSollecito(e.target.value as StatoSollecito | '')}>
                    <option value="">Tutti i solleciti</option>
                    <option value="da_aggiornare">Da aggiornare</option>
                    <option value="gia_contattato">Già contattato</option>
                    <option value="in_attesa">In attesa</option>
                    <option value="aggiornato">Aggiornato</option>
                  </select>
                  {(fStato || fSollecito || fCategoria) && (
                    <button onClick={() => { setFStato(''); setFSollecito(''); setFCategoria(''); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"><X size={11}/> Reset</button>
                  )}
                </div>
              )}
            </div>

            {/* ── Tab: Documenti ── */}
            {rightTab === 'documenti' && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                {[...groupedDocs.entries()].map(([cat, docs]) => (
                  <div key={cat}>
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">{cat}</h3>
                    <div className="rounded-xl border border-white/8 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/3 border-b border-white/8 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                            <th className="text-left py-2 px-3">Documento</th>
                            <th className="text-left py-2 px-3 w-32">Fine Validità</th>
                            <th className="text-left py-2 px-3 w-28">Stato</th>
                            <th className="text-left py-2 px-3 w-36">Sollecito</th>
                            <th className="py-2 px-3 w-24"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {docs.map(doc => {
                            const key       = `${selectedPratica.id}::${doc.documento}`;
                            const isEditing = editingKey === key;
                            const scCfg     = SCAD_CFG[doc.statoScadenza];
                            const slCfg     = SOLL_CFG[doc.statoSollecito];
                            return (
                              <tr key={doc.documento} className={cn('border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors', scCfg.rowCls)}>
                                <td className="py-2.5 px-3 text-gray-300 font-medium">{doc.documento}</td>
                                <td className="py-2.5 px-3">
                                  {isEditing
                                    ? <input type="date" autoFocus className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none" value={editDate} onChange={e => setEditDate(e.target.value)}/>
                                    : <span style={{ color: scCfg.color }} className="font-mono tabular-nums">{fmtDate(doc.dataFineValidita)}</span>
                                  }
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="flex items-center gap-1.5">
                                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', scCfg.dotCls)}/>
                                    <span style={{ color: scCfg.color }} className="text-[10px] font-semibold">{scCfg.label}</span>
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <select className="bg-transparent border border-white/10 rounded px-1.5 py-0.5 text-[10px] focus:outline-none hover:border-white/25 transition-colors cursor-pointer"
                                    style={{ color: slCfg.color }} value={doc.statoSollecito}
                                    onChange={e => updateSollecito(doc.documento, e.target.value as StatoSollecito)}>
                                    <option value="da_aggiornare">Da aggiornare</option>
                                    <option value="gia_contattato">Già contattato</option>
                                    <option value="in_attesa">In attesa</option>
                                    <option value="aggiornato">Aggiornato</option>
                                  </select>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center justify-end gap-0.5">
                                    {isEditing ? (
                                      <>
                                        <button onClick={() => saveDoc(doc.documento)} className="p-1.5 rounded hover:bg-[#1D9E75]/20 text-[#1D9E75] transition-colors" title="Salva"><Check size={13}/></button>
                                        <button onClick={() => setEditingKey(null)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 transition-colors" title="Annulla"><X size={13}/></button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => { setEditingKey(key); setEditDate(toInputDate(doc.dataFineValidita)); setEditNote(doc.note || ''); }}
                                          className="p-1.5 rounded hover:bg-white/10 text-gray-600 hover:text-gray-300 transition-colors" title="Modifica data fine validità"><Edit2 size={12}/></button>
                                        <button onClick={() => sendOutlook(doc.documento)}
                                          className="p-1.5 rounded hover:bg-[#378ADD]/20 text-gray-600 hover:text-[#378ADD] transition-colors" title="Invia sollecito Outlook"><Mail size={12}/></button>
                                        <button onClick={() => updateSollecito(doc.documento, 'aggiornato')}
                                          className="p-1.5 rounded hover:bg-[#1D9E75]/20 text-gray-600 hover:text-[#1D9E75] transition-colors" title="Segna aggiornato"><CheckCircle2 size={12}/></button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tab: Storico Solleciti (per-pratica) ── */}
            {rightTab === 'storico' && (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <StoricoTimeline
                  gruppi={storicoGruppi}
                  showPratica={false}
                  emptyText="Nessun contatto registrato per questa pratica"
                  emptySubtext='Invia un Outlook o segna "Già contattato" per iniziare a tracciare'
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GestioneSolleciti;

// Suppress unused import warning for AZIONE_CFG (used in future export features)
void AZIONE_CFG;
