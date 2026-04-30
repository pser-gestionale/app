import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  X, 
  FileSpreadsheet, 
  FileText, 
  Mail,
  ArrowUpRight,
  Calendar as CalendarIcon,
  MessageSquare,
  ChevronRight,
  Download,
  ExternalLink,
  Info,
  Send,
  User,
  Archive,
  Star,
  Pin,
  RotateCcw,
  ChevronLeft,
  Plus,
  Bell,
  Sun,
  Trash2,
  Edit2,
  Euro,
  BarChart3,
  LayoutGrid,
  Activity,
  ShieldCheck,
  Zap,
  GanttChartSquare,
  FileUp,
  Eye
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  Cell
} from 'recharts';
import { cn, fmtDate } from '../lib/utils';
import { format, differenceInDays, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Subaffidamento } from '../types';

const parseEuro = (val: string | undefined | null): number =>
  parseFloat((val || '0').replace(/,/g, '')) || 0;

const isValidDate = (d: any) => {
  if (!d) return false;
  const date = new Date(d);
  return date instanceof Date && !isNaN(date.getTime());
};

const safeFormat = (d: any, fmt: string, options?: any) => {
  if (!isValidDate(d)) return '—';
  return format(new Date(d), fmt, options);
};

const safeDiff = (d1: any, d2: any) => {
  if (!isValidDate(d1) || !isValidDate(d2)) return 0;
  return differenceInDays(new Date(d1), new Date(d2));
};

const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="text-[#534AB7] font-bold">{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
};

const Dashboard: React.FC = () => {
  const { subaffidamenti, appaltatori, documenti, followUps, activityLog, settings, addActivity, setSubaffidamenti } = useData();
  const { user, logout } = useAuth();
  
  const [appSearch, setAppSearch] = useState('');
  const [contrattoSearch, setContrattoSearch] = useState('');
  const [showAppDropdown, setShowAppDropdown] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [statoFilter, setStatoFilter] = useState<string>('');
  const [criticiRange, setCriticiRange] = useState<30 | 60>(60);

  // Modals state
  const [showTuttiModal, setShowTuttiModal] = useState(false);
  const [showUltimiModal, setShowUltimiModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCriticiModal, setShowCriticiModal] = useState(false);
  const [showArchivioModal, setShowArchivioModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllBarChart, setShowAllBarChart] = useState(false);
  const [showGantt, setShowGantt] = useState(false);
  const [showPendenzeModal, setShowPendenzeModal] = useState(false);
  const [showTableModal, setShowTableModal]       = useState(false);
  const [sortCol, setSortCol]                     = useState<string>('');
  const [sortDir, setSortDir]                     = useState<'asc' | 'desc'>('asc');
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredStato, setHoveredStato] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedEventForAction, setSelectedEventForAction] = useState<any>(null);
  
  // Custom Events State
  const [customEvents, setCustomEvents] = useState<any[]>(() => {
    const saved = localStorage.getItem('pser_custom_events');
    return saved ? JSON.parse(saved) : [];
  });

  const [newEvent, setNewEvent] = useState({
    title: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    notes: '',
    createdBy: '',
    createdAt: ''
  });
  
  // Modal Filters
  const [modalAppSearch, setModalAppSearch] = useState('');
  const [modalTipoFilter, setModalTipoFilter] = useState('');
  const [modalStatoFilter, setModalStatoFilter] = useState('');

  // Detail Panel
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [selectedPendenza, setSelectedPendenza] = useState<any | null>(null);

  // Soglie modal
  const [selectedSoglia, setSelectedSoglia] = useState<any | null>(null);

  // Trend window + chart ref
  const [trendWindow, setTrendWindow] = useState<'3M' | '6M' | '1A' | 'ALL'>('1A');
  const trendChartRef1 = useRef<HTMLDivElement>(null);
  const trendChartRef2 = useRef<HTMLDivElement>(null);

  // Worklist
  const [worklistTab, setWorklistTab]           = useState<'Tutti' | 'Autorizzate' | 'Inviate' | 'Scadute' | 'Richiesta info' | 'Attivate' | 'Archivio'>('Tutti');
  const [worklistAppSearch, setWorklistAppSearch] = useState('');
  const [worklistIdSearch, setWorklistIdSearch]   = useState('');
  const [worklistTipo, setWorklistTipo]           = useState('');
  const [worklistStato, setWorklistStato]         = useState('');
  const [worklistDensity, setWorklistDensity]     = useState<'compact' | 'normal' | 'large'>('normal');
  const [worklistDots, setWorklistDots]           = useState<string | null>(null);
  const [quickEdit, setQuickEdit]                 = useState<{ id: string; stato: string } | null>(null);

  const today = new Date();

  const stats = useMemo(() => {
    const tot = subaffidamenti.length;
    const sub = subaffidamenti.filter(d => d.tipo === 'Subappalto').length;
    const con = subaffidamenti.filter(d => d.tipo === 'Subcontratto').length;
    const crit = subaffidamenti.filter(d => {
      const isRigettata = d.stato === 'Rigettata';
      const isScaduta = d.stato === 'Scaduta';
      const isNearScadenza = d.scadenza && isValidDate(d.scadenza) && safeDiff(d.scadenza, today) <= criticiRange;
      return isRigettata || isScaduta || isNearScadenza;
    }).length;
    const ok = subaffidamenti.filter(d => d.stato === 'Autorizzata' || d.stato === 'Attivata').length;
    
    // Pratiche Lavorate (Processed Practices) - e.g., anything not in 'Inviata' state
    const lavorate = subaffidamenti.filter(d => d.stato !== 'Inviata').length;
    const lavoratePct = tot ? Math.round((lavorate / tot) * 100) : 0;

    return {
      tot,
      sub,
      subPct: tot ? Math.round((sub / tot) * 100) : 0,
      con,
      conPct: tot ? Math.round((con / tot) * 100) : 0,
      crit,
      ok,
      okPct: tot ? Math.round((ok / tot) * 100) : 0,
      lavorate,
      lavoratePct
    };
  }, [subaffidamenti, criticiRange]);

  const filteredData = useMemo(() => {
    return subaffidamenti.filter(d => {
      const matchApp = !selectedApp || (d.appaltatore || d.app) === selectedApp;
      const matchTipo = !tipoFilter || d.tipo === tipoFilter;
      const matchStato = !statoFilter || d.stato === statoFilter;
      const matchContratto = !contrattoSearch || d.id.toLowerCase().includes(contrattoSearch.toLowerCase());
      return matchApp && matchTipo && matchStato && matchContratto;
    });
  }, [subaffidamenti, selectedApp, tipoFilter, statoFilter, contrattoSearch]);

  const appList = useMemo(() => {
    return Array.from(new Set(subaffidamenti.map(d => d.appaltatore || d.app))).sort();
  }, [subaffidamenti]);

  const filteredAppList = useMemo(() => {
    if (!appSearch) return appList.slice(0, 10);
    return appList.filter(a => a.toLowerCase().includes(appSearch.toLowerCase())).slice(0, 10);
  }, [appList, appSearch]);

  const alerts = useMemo(() => {
    const baseSub = selectedApp ? subaffidamenti.filter(d => (d.appaltatore || d.app) === selectedApp) : subaffidamenti;
    const subAlerts = baseSub.filter(d => {
      if (!d.scadenza || !isValidDate(d.scadenza)) return d.stato === 'Rigettata';
      const diff = safeDiff(d.scadenza, today);
      return d.stato === 'Rigettata' || d.stato === 'Scaduta' || diff <= 30;
    }).map(d => ({ ...d, _type: 'sub' as const }));

    const baseDoc = selectedApp ? documenti.filter(d => (d.appaltatore || d.app) === selectedApp) : documenti;
    const docAlerts = baseDoc.filter(d => {
      if (!d.scad || !isValidDate(d.scad)) return false;
      const diff = safeDiff(d.scad, today);
      return diff <= 30 || d.esito === 'Non Conforme';
    }).map(d => ({ ...d, _type: 'doc' as const }));

    return [...subAlerts, ...docAlerts].sort((a, b) => {
      const dateA = (a as any).scadenza || (a as any).scad;
      const dateB = (b as any).scadenza || (b as any).scad;
      const timeA = isValidDate(dateA) ? new Date(dateA).getTime() : 0;
      const timeB = isValidDate(dateB) ? new Date(dateB).getTime() : 0;
      return timeA - timeB;
    });
  }, [subaffidamenti, documenti, selectedApp, today]);

  const recenti = useMemo(() => {
    const base = selectedApp ? subaffidamenti.filter(d => (d.appaltatore || d.app) === selectedApp) : subaffidamenti;
    return [...base].sort((a, b) => {
      const timeA = isValidDate(a.inserito) ? new Date(a.inserito).getTime() : 0;
      const timeB = isValidDate(b.inserito) ? new Date(b.inserito).getTime() : 0;
      return timeB - timeA;
    }).slice(0, 5);
  }, [subaffidamenti, selectedApp]);

  const virtuousApps = useMemo(() => {
    return (Array.from(new Set(subaffidamenti.map(d => d.appaltatore || d.app))) as string[]).filter(app => {
      const hasCritici = subaffidamenti.some(d => {
        if ((d.appaltatore || d.app) !== app) return false;
        const isRigettata = d.stato === 'Rigettata';
        const isScaduta = d.stato === 'Scaduta';
        const isNearScadenza = d.scadenza && isValidDate(d.scadenza) && safeDiff(d.scadenza, today) <= criticiRange;
        return isRigettata || isScaduta || isNearScadenza;
      });
      return !hasCritici;
    });
  }, [subaffidamenti, today, criticiRange]);

  const barChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    if (selectedApp) {
      // If app selected, show its sub-contracts
      const appData = subaffidamenti.filter(d => (d.appaltatore || d.app) === selectedApp);
      appData.forEach(d => {
        counts[d.sub] = (counts[d.sub] || 0) + 1;
      });
    } else {
      // If no app selected, show top appaltatori WITHOUT criticalities
      virtuousApps.forEach(app => {
        const count = subaffidamenti.filter(d => (d.appaltatore || d.app) === app).length;
        counts[app] = count;
      });
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return {
      display: sorted.slice(0, 4),
      all: sorted
    };
  }, [subaffidamenti, selectedApp, virtuousApps]);

  const donutData = useMemo(() => {
    const counts: Record<string, number> = {};
    // Donut always shows total distribution (filtered only by appaltatore if selected)
    const baseData = selectedApp ? subaffidamenti.filter(d => (d.appaltatore || d.app) === selectedApp) : subaffidamenti;
    baseData.forEach(d => {
      counts[d.stato] = (counts[d.stato] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [subaffidamenti, selectedApp]);

  // ADVANCED FEATURES LOGIC
  const contractorScores = useMemo(() => {
    const scores: Record<string, { score: number, details: string[] }> = {};
    
    appList.forEach(app => {
      const appDocs = documenti.filter(d => (d.appaltatore || d.app) === app);
      const appSubs = subaffidamenti.filter(d => (d.appaltatore || d.app) === app);
      
      let baseScore = 85; // Starting point
      const details = [];

      // 1. Document Compliance
      const expiredDocs = appDocs.filter(d => d.esito === 'Scaduto' || d.esito === 'Non Conforme').length;
      if (expiredDocs > 0) {
        baseScore -= expiredDocs * 5;
        details.push(`${expiredDocs} documenti critici`);
      } else {
        baseScore += 5;
        details.push('Compliance documentale eccellente');
      }

      // 2. Rejection Rate
      const rejections = appSubs.filter(d => d.stato === 'Rigettata').length;
      if (rejections > 0) {
        baseScore -= rejections * 10;
        details.push(`${rejections} pratiche rigettate`);
      }

      // 3. SAP Sync
      const pendingSap = appSubs.filter(d => d.stato === 'In Attesa SAP').length;
      if (pendingSap > 3) {
        baseScore -= 5;
        details.push('Ritardi sincronizzazione SAP');
      }

      scores[app] = { 
        score: Math.max(0, Math.min(100, baseScore)),
        details: details.slice(0, 2)
      };
    });
    
    return scores;
  }, [subaffidamenti, documenti, appList]);

  const predictiveAlerts = useMemo(() => {
    return subaffidamenti.filter(d => {
      const max = parseEuro(d.importoMaxSub);
      const cur = parseEuro(d.importoEur);
      if (max <= 0) return false;
      const pct = (cur / max) * 100;
      return pct >= 50;
    }).map(d => {
      const max = parseEuro(d.importoMaxSub);
      const cur = parseEuro(d.importoEur);
      const pct = (cur / max) * 100;
      return { ...d, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [subaffidamenti]);

  /* ── pendenze documentali ───────────────────────────────── */
  const STATI_ESCLUSI_PENDENZE = ['Rigettata', 'Scaduta', 'Chiusa', 'Annullata'];
  const pendenze = useMemo(() => {
    const praticheValidate = new Set(
      followUps.filter(f => f.stato === 'validato').map(f => f.praticaId)
    );
    return subaffidamenti
      .filter(s =>
        s.allegatiScaduti === true &&
        !STATI_ESCLUSI_PENDENZE.includes(s.stato) &&
        !praticheValidate.has(s.id)
      )
      .map(s => {
        const sap = s.idSapContratto || s.idSap || '';
        const docsForPratica = sap ? documenti.filter(d => d.sap === sap) : [];
        const critici = docsForPratica.filter(d => {
          const scaduta = d.scad && isValidDate(d.scad) && safeDiff(d.scad, today) <= 0;
          const nonConf = ['Non Conforme', 'Richiesta Informazioni', 'Scaduto'].includes(d.esito);
          return scaduta || nonConf;
        });
        return { ...s, _docsTotal: docsForPratica.length, _docsCritici: critici, _criticiCount: critici.length };
      })
      .sort((a, b) => b._criticiCount - a._criticiCount);
  }, [subaffidamenti, documenti, followUps, today]);

  const CC_PEND = 'rosalinda.difiore@ren.eniplenitude.com,federica.damato@ren.eniplenitude.com,antoninoangelo.polito@ren.eniplenitude.com';
  const openPendenzaEmail = (client: 'gmail' | 'outlook', p: typeof pendenze[0]) => {
    const app = p.appaltatore || p.app || '';
    const docsText = p._docsCritici.length > 0
      ? p._docsCritici.map((d: any) => `  • ${d.doc}: ${d.esito}`).join('\n')
      : '  • Allegati Contrattuali: Scaduto';
    const subject = `Richiesta aggiornamento documenti — ${app}`;
    const body = `Gentile ${app},\n\nin riferimento al contratto ${p.idSapContratto || p.idSap || p.id}, si segnalano i seguenti documenti non conformi che necessitano di aggiornamento:\n\n${docsText}\n\nSi prega di provvedere all'aggiornamento della documentazione entro i termini contrattualmente previsti, caricando i file aggiornati sul portale aziendale.\n\nPer qualsiasi chiarimento siamo a disposizione.\n\nCordiali saluti,\nPietro De Vito\nPSER — Gestione Subaffidamenti`;
    if (client === 'gmail') window.open(`https://mail.google.com/mail/?view=cm&cc=${encodeURIComponent(CC_PEND)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    else window.open(`https://outlook.office.com/mail/deeplink/compose?cc=${encodeURIComponent(CC_PEND)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const addCalendarEventDash = (title: string, notes: string, color: string, label: string) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const startTime = format(now, 'HH:mm');
    const endTime = format(new Date(now.getTime() + 30 * 60000), 'HH:mm');
    const event = { id: Date.now().toString(), title, startDate: todayStr, endDate: todayStr, startTime, endTime, notes, label, color, createdBy: user?.nome || 'Sistema', createdAt: now.toISOString() };
    const saved = localStorage.getItem('pser_custom_events');
    const events: any[] = saved ? JSON.parse(saved) : [];
    localStorage.setItem('pser_custom_events', JSON.stringify([...events, event]));
  };

  const handleSollecitaPendenza = (p: typeof pendenze[0]) => {
    openPendenzaEmail('outlook', p);
    addCalendarEventDash(
      `Sollecito inviato: ${p.appaltatore || p.app}`,
      `SAP: ${p.idSapContratto || p.idSap || p.id} | Doc critici: ${p._criticiCount}`,
      '#0078D4',
      'Sollecito Outlook'
    );
    navigate('/storico', { state: { praticaId: p.id } });
    setShowPendenzeModal(false);
  };

  const handleExportPendenzeExcel = () => {
    const ws = XLSX.utils.json_to_sheet(pendenze.map(p => ({
      'ID Pratica': p.id,
      'Appaltatore': p.appaltatore || p.app,
      'Subfornitore': p.subfornitore || p.sub || '',
      'SAP Contratto': p.idSapContratto || p.idSap || '',
      'Stato': p.stato,
      'Doc Critici N.': p._criticiCount,
      'Documenti Critici': p._docsCritici.map((d: any) => `${d.doc}: ${d.esito}`).join(' | '),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pendenze');
    XLSX.writeFile(wb, `Pendenze_Documentali_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleExportPendenzePDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = pendenze.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.appaltatore || p.app}</td>
        <td>${p.subfornitore || p.sub || '—'}</td>
        <td>${p.idSapContratto || p.idSap || '—'}</td>
        <td>${p.stato}</td>
        <td>${p._criticiCount}</td>
        <td style="font-size:10px">${p._docsCritici.map((d: any) => `${d.doc}: ${d.esito}`).join('<br>')}</td>
      </tr>`).join('');
    win.document.write(`<html><head><title>Pendenze Documentali</title><style>
      body{font-family:Inter,sans-serif;padding:40px;color:#1a202c}
      h2{color:#E24B4A;margin-bottom:4px}p{color:#64748b;font-size:12px;margin-top:0}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th{background:#0f172a;color:#fff;text-align:left;padding:10px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
      td{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#4a5568;vertical-align:top}
      tr:nth-child(even){background:#f8fafc}
      .footer{margin-top:30px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
    </style></head><body>
      <h2>⚠ Pendenze Documentali</h2>
      <p>${pendenze.length} pratiche con allegati scaduti — esportato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      <table><thead><tr>
        <th>ID</th><th>Appaltatore</th><th>Subfornitore</th><th>SAP</th><th>Stato</th><th>N. Critici</th><th>Documenti Critici</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">PSER — Gestione Subaffidamenti · Pietro De Vito</div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const handleSetRI = (id: string) => {
    setSubaffidamenti(prev => prev.map(s => s.id === id ? { ...s, stato: 'Richiesta Informazioni' } : s));
    addActivity('update', 'Dashboard', 'Stato aggiornato a Richiesta Informazioni', `Pratica ${id}`);
  };

  const handleExportChartPNG = (ref: React.RefObject<HTMLDivElement | null>) => {
    const container = ref.current;
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const rect = svg.getBoundingClientRect();
    canvas.width  = rect.width  || 800;
    canvas.height = rect.height || 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f2035';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `trend_subappalti_${format(new Date(), 'yyyy-MM-dd')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  const cumulativeData = useMemo(() => {
    type MonthEntry = { key: string; name: string; sub: number; budget: number };
    const monthly: Record<string, MonthEntry> = {};

    subaffidamenti.forEach(d => {
      const raw = d.inserito || d.dataCreazione;
      if (!raw) return;
      const date = new Date(raw);
      if (isNaN(date.getTime())) return;
      const key = format(date, 'yyyy-MM');
      const name = format(date, 'MMM yy', { locale: it });
      if (!monthly[key]) monthly[key] = { key, name, sub: 0, budget: 0 };
      monthly[key].sub    += parseEuro(d.importoEur || d.importoRichiestoEuro);
      monthly[key].budget += parseEuro(d.importoMaxSub || d.importoMassimoSubappaltabile);
    });

    const sorted = Object.values(monthly).sort((a, b) => a.key.localeCompare(b.key));

    // Running cumulative sums
    let cumSub = 0;
    let cumBudget = 0;
    const cumulative = sorted.map(m => {
      cumSub    += m.sub;
      cumBudget += m.budget;
      return { name: m.name, sub: Math.round(cumSub / 1000), budget: Math.round(cumBudget / 1000) };
    });

    // Filter by trendWindow
    const windowMap: Record<string, number> = { '3M': 3, '6M': 6, '1A': 12, 'ALL': 9999 };
    const months = windowMap[trendWindow] ?? 12;
    return cumulative.slice(-months);
  }, [subaffidamenti, trendWindow]);

  const ARCHIVIO_STATI = ['Rigettata', 'Scaduta', 'Chiusa', 'Annullata'];

  // Aggregazione soglia per appaltatore: somma importi richiesti vs massimo subappaltabile
  const appaltatoreAgg = useMemo(() => {
    const map = new Map<string, { totalCommitted: number; maxSub: number }>();
    subaffidamenti.forEach(d => {
      const key = (d.appaltatore || d.app || '').trim();
      if (!key) return;
      const committed = parseEuro(d.importoRichiestoEuro || d.importoEur);
      const max       = parseEuro(d.importoMassimoSubappaltabile || d.importoMaxSub);
      const prev = map.get(key) || { totalCommitted: 0, maxSub: 0 };
      map.set(key, {
        totalCommitted: prev.totalCommitted + committed,
        maxSub: Math.max(prev.maxSub, max), // prende il massimo tra le righe (stesso tetto contrattuale)
      });
    });
    return map;
  }, [subaffidamenti]);

  const worklistCounts = useMemo(() => ({
    Tutti:           subaffidamenti.filter(d => !ARCHIVIO_STATI.includes(d.stato)).length,
    Autorizzate:     subaffidamenti.filter(d => d.stato === 'Autorizzata').length,
    Inviate:         subaffidamenti.filter(d => d.stato === 'Inviata').length,
    Scadute:         subaffidamenti.filter(d => d.stato === 'Scaduta').length,
    'Richiesta info': subaffidamenti.filter(d => d.stato === 'Richiesta Informazioni').length,
    Attivate:        subaffidamenti.filter(d => d.stato === 'Attivata').length,
    Archivio:        subaffidamenti.filter(d => ARCHIVIO_STATI.includes(d.stato)).length,
  }), [subaffidamenti]);

  const worklistData = useMemo(() => {
    const tabStatoMap: Record<string, string[]> = {
      'Autorizzate':     ['Autorizzata'],
      'Inviate':         ['Inviata'],
      'Scadute':         ['Scaduta'],
      'Richiesta info':  ['Richiesta Informazioni'],
      'Attivate':        ['Attivata'],
      'Archivio':        ARCHIVIO_STATI,
    };
    let data = worklistTab === 'Tutti'
      ? subaffidamenti.filter(d => !ARCHIVIO_STATI.includes(d.stato))
      : worklistTab === 'Archivio'
        ? subaffidamenti.filter(d => ARCHIVIO_STATI.includes(d.stato))
        : subaffidamenti.filter(d => (tabStatoMap[worklistTab] || []).includes(d.stato));

    if (worklistAppSearch) data = data.filter(d => (d.appaltatore || d.app || '').toLowerCase().includes(worklistAppSearch.toLowerCase()));
    if (worklistIdSearch)  data = data.filter(d => d.id.toLowerCase().includes(worklistIdSearch.toLowerCase()));
    if (worklistTipo)      data = data.filter(d => d.tipo === worklistTipo);
    if (worklistStato)     data = data.filter(d => d.stato === worklistStato);
    // Ordina per data creazione decrescente (più recente prima)
    // Gestisce sia mm/dd/yyyy (sito aziendale) che yyyy-MM-dd
    const parseCreazione = (s: string | undefined) => {
      if (!s) return 0;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [mm, dd, yyyy] = s.split('/');
        return new Date(`${yyyy}-${mm}-${dd}`).getTime();
      }
      return new Date(s).getTime() || 0;
    };
    return [...data].sort((a, b) => parseCreazione(b.dataCreazione || b.inserito) - parseCreazione(a.dataCreazione || a.inserito));
  }, [subaffidamenti, worklistTab, worklistAppSearch, worklistIdSearch, worklistTipo, worklistStato]);

  const complianceHealth = useMemo(() => {
    const tot = documenti.length;
    const ok = documenti.filter(d => d.esito === 'Conforme').length;
    const warn = documenti.filter(d => d.esito === 'In Scadenza').length;
    const crit = documenti.filter(d => d.esito === 'Scaduto' || d.esito === 'Non Conforme').length;
    
    return {
      score: tot ? Math.round((ok / tot) * 100) : 100,
      ok, warn, crit, tot
    };
  }, [documenti]);

  const handleExcelImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      const newRows = json.map((row: any) => ({
        id: String(row['ID'] || Math.random().toString(36).substr(2, 9)),
        stato: String(row['Stato'] || 'Inviata'),
        tipo: (String(row['Tipologia'] || 'Subappalto')) as 'Subappalto' | 'Subcontratto',
        appaltatore: String(row['Appaltatore'] || ''),
        subfornitore: String(row['Subfornitore'] || ''),
        app: String(row['Appaltatore'] || ''),
        sub: String(row['Subfornitore'] || ''),
        oggetto: String(row['Oggetto'] || ''),
        oggettoRichiesta: String(row['Oggetto Richiesta'] || ''),
        idSapContratto: String(row['ID SAP Contratto'] || ''),
        idSap: String(row['ID SAP Contratto'] || ''),
        unitaGestore: String(row['Unità gestore'] || ''),
        unitaGest: String(row['Unità gestore'] || ''),
        importoRichiestoEuro: String(row['Importo richiesto in euro'] || '0'),
        importoEur: String(row['Importo richiesto in euro'] || '0'),
        importoMassimoSubappaltabile: String(row['Importo massimo subappaltabile in valuta'] || '0'),
        importoMaxSub: String(row['Importo massimo subappaltabile in valuta'] || '0'),
        dataCreazione: format(new Date(), 'yyyy-MM-dd'),
        inserito: format(new Date(), 'yyyy-MM-dd'),
        dataInizio: String(row['Data Inizio'] || ''),
        inizio: String(row['Data Inizio'] || ''),
        dataFine: String(row['Data Fine'] || ''),
        scadenza: String(row['Data Fine'] || ''),
      })) as Subaffidamento[];

      setSubaffidamenti(prev => [...newRows, ...prev]);
      addActivity('import', 'Importazione Rapida', `Importate ${newRows.length} pratiche via Drag&Drop`, `Dashboard aggiornata`);
    };
    reader.readAsArrayBuffer(file);
  };

  const STATO_COLORS: Record<string, string> = {
    'Autorizzata': '#1D9E75',
    'Attivata': '#378ADD',
    'Inviata': '#F5A800',
    'Richiesta Informazioni': '#EF9F27',
    'Rigettata': '#E24B4A',
    'In Attesa SAP': '#534AB7',
    'Conclusa': '#0F6E56',
    'In Modifica': '#BA7517',
    'Da Autorizzare': '#EF9F27',
    'Da Attivare': '#534AB7',
    'Scaduta': '#A32D2D',
    'Da Rigettare': '#A32D2D',
  };

  const STATO_DESCRIPTIONS: Record<string, string> = {
    'Attivata': 'Pratiche operative lavori in corso.',
    'Autorizzata': 'Pratiche approvate formalmente. Tutto in regola.',
    'Inviata': 'Pratiche in attesa di prima revisione.',
    'Rigettata': 'Pratiche con criticità bloccanti.',
    'Scaduta': 'Contratti oltre il termine di validità.',
    'In Attesa SAP': 'In attesa di sincronizzazione gestionale.',
    'Conclusa': 'Pratiche terminate con successo.',
    'Richiesta Informazioni': 'In attesa di integrazioni documentali.',
    'In Modifica': 'Pratiche in fase di revisione dati.',
    'Da Autorizzare': 'Pratiche pronte per approvazione finale.',
    'Da Attivare': 'Pratiche autorizzate in attesa di avvio.',
    'Da Rigettare': 'Pratiche non conformi in fase di chiusura.',
  };

  const STATO_CLS: Record<string, string> = {
    'Autorizzata': 'bg-[#1D9E75]/15 text-[#5DCAA5]',
    'Attivata': 'bg-[#378ADD]/15 text-[#85B7EB]',
    'Inviata': 'bg-[#F5A800]/12 text-[#F5A800]',
    'Richiesta Informazioni': 'bg-[#EF9F27]/15 text-[#EF9F27]',
    'Rigettata': 'bg-[#E24B4A]/15 text-[#f09595]',
    'In Attesa SAP': 'bg-[#534AB7]/15 text-[#a89ef8]',
    'Conclusa': 'bg-[#1D9E75]/10 text-[#1D9E75]',
  };

  const BAR_COLORS = ['#534AB7', '#378ADD', '#1D9E75', '#F5A800', '#E24B4A'];

  const foundContract = useMemo(() => {
    if (!contrattoSearch || contrattoSearch.length < 3) return null;
    const found = subaffidamenti.find(d => d.id.toLowerCase().includes(contrattoSearch.toLowerCase()) || d.idSap?.toLowerCase().includes(contrattoSearch.toLowerCase()));
    if (found && found.id.toLowerCase() === contrattoSearch.toLowerCase()) return null;
    return found;
  }, [subaffidamenti, contrattoSearch]);

  const economicStats = useMemo(() => {
    if (!selectedDetail || selectedDetail._type === 'doc') return null;
    const valContratto = parseEuro(selectedDetail.importoMaxSub) || 1000; // Fallback for demo
    const valSub = parseEuro(selectedDetail.importoEur) || 500; // Fallback for demo
    const soglia = valContratto > 0 ? (valSub / valContratto) * 100 : 0;
    const residuo = Math.max(0, 100 - soglia);
    return { valContratto, valSub, soglia, residuo };
  }, [selectedDetail]);

  const navigate = useNavigate();
  const worklistRef = useRef<HTMLDivElement>(null);

  const handleKpiClick = (mode: 'all' | 'subappalto' | 'subcontratto' | 'critici' | 'attivi' | 'docs') => {
    setWorklistAppSearch('');
    setWorklistIdSearch('');
    setWorklistStato('');
    if (mode === 'docs') {
      navigate('/storico');
      return;
    }
    if (mode === 'subappalto') { setWorklistTipo('Subappalto'); setWorklistTab('Tutti'); }
    else if (mode === 'subcontratto') { setWorklistTipo('Subcontratto'); setWorklistTab('Tutti'); }
    else if (mode === 'attivi') { setWorklistTipo(''); setWorklistTab('Autorizzate'); }
    else if (mode === 'critici') { setWorklistTipo(''); setWorklistTab('Scadute'); }
    else { setWorklistTipo(''); setWorklistTab('Tutti'); }
    setTimeout(() => worklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const handleRowClick = (record: any) => {
    setSelectedDetail(record);
  };

  const handleSaveEvent = () => {
    if (!newEvent.title) return;
    
    const eventData = {
      ...newEvent,
      createdBy: newEvent.createdBy || user?.nome || 'Sistema',
      createdAt: newEvent.createdAt || new Date().toISOString()
    };

    if (editingEventId) {
      const updated = customEvents.map(e => e.id === editingEventId ? { ...eventData, id: editingEventId } : e);
      setCustomEvents(updated);
      localStorage.setItem('pser_custom_events', JSON.stringify(updated));
    } else {
      const event = {
        ...eventData,
        id: Date.now().toString(),
      };
      const updated = [...customEvents, event];
      setCustomEvents(updated);
      localStorage.setItem('pser_custom_events', JSON.stringify(updated));
    }
    
    setShowAddEventModal(false);
    setEditingEventId(null);
    setNewEvent({
      title: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      notes: '',
      createdBy: '',
      createdAt: ''
    });
  };

  const handleDeleteEvent = (id: string) => {
    const updated = customEvents.filter(e => e.id !== id);
    setCustomEvents(updated);
    localStorage.setItem('pser_custom_events', JSON.stringify(updated));
  };

  const handleEditEvent = (event: any) => {
    setNewEvent({
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      notes: event.notes,
      createdBy: event.createdBy,
      createdAt: event.createdAt
    });
    setEditingEventId(event.id);
    setShowAddEventModal(true);
  };

  const handleEventClick = (event: any) => {
    if (event.tipo === 'custom') {
      setSelectedEventForAction(event);
    } else if (event.tipo === 'doc_scad' || event.tipo === 'doc_adeguamento') {
      navigate('/controllo-documentale', { state: { sap: event.sap } });
    } else {
      navigate('/subaffidamenti', { state: { selectedId: event.idSap } });
    }
  };

  const handleAddEventClick = () => {
    setNewEvent({
      title: '',
      startDate: selectedCalDay || format(new Date(), 'yyyy-MM-dd'),
      endDate: selectedCalDay || format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      notes: '',
      createdBy: user?.nome || 'Sistema',
      createdAt: new Date().toISOString()
    });
    setEditingEventId(null);
    setShowAddEventModal(true);
  };

  const handleExportExcel = (data: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(data.map((d: any) => ({
      ID: d.id,
      Appaltatore: d.appaltatore || d.app,
      Subfornitore: d.subfornitore || d.sub,
      Tipo: d.tipo,
      Stato: d.stato,
      Inizio: d.inizio,
      Scadenza: d.scadenza,
      Oggetto: d.oggetto,
      Importo: d.importoEur
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subaffidamenti');
    XLSX.writeFile(workbook, `Export_Subaffidamenti_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleGeneraReportBulk = (title: string, data: Subaffidamento[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const cards = data.map((d, idx) => {
      const sap = d.idSapContratto || d.idSap || '';
      const docsLine = documenti
        .filter(doc => doc.sap === sap || doc.app === (d.appaltatore || d.app))
        .map(doc => `${doc.doc}: ${doc.esito} — scad. ${doc.scad || '—'}`)
        .join('\n');
      const importoVal = d.importoRichiestoEuro || d.importoEur
        ? `€ ${parseEuro(d.importoRichiestoEuro || d.importoEur).toLocaleString('it-IT')}`
        : '—';
      return `
        <div class="card${idx < data.length - 1 ? ' break' : ''}">
          <h2>Report Pratica ${d.id} — ${d.appaltatore || d.app || '—'}</h2>
          <div class="grid">
            <div class="cell"><div class="lbl">Subfornitore</div><div class="val">${d.subfornitore || d.sub || '—'}</div></div>
            <div class="cell"><div class="lbl">Tipo</div><div class="val">${d.tipo || '—'}</div></div>
            <div class="cell"><div class="lbl">Stato</div><div class="val">${d.stato || '—'}</div></div>
            <div class="cell"><div class="lbl">Scadenza</div><div class="val">${safeFormat(d.scadenza, 'dd/MM/yyyy')}</div></div>
            <div class="cell"><div class="lbl">SAP Contratto</div><div class="val">${sap || '—'}</div></div>
            <div class="cell"><div class="lbl">Importo</div><div class="val">${importoVal}</div></div>
          </div>
          ${docsLine ? `<div class="lbl" style="margin-bottom:6px">Documenti</div><pre>${docsLine}</pre>` : ''}
        </div>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${title}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',sans-serif;font-size:11px;color:#1a2a3a;padding:24px;background:#fff}
        .report-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:12px;border-bottom:3px solid #534AB7}
        .report-header h1{font-size:18px;font-weight:700;color:#0f172a}
        .report-header span{font-size:10px;color:#6a8aaa;background:#f1f5f9;border-radius:20px;padding:4px 12px}
        .card{margin-bottom:28px;padding:20px;border:1px solid #e2e8f0;border-radius:10px}
        .card h2{font-size:14px;font-weight:700;border-bottom:2px solid #534AB7;padding-bottom:8px;margin-bottom:14px;color:#0f172a}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
        .cell{border:1px solid #e8edf3;border-radius:6px;padding:8px 12px}
        .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#6a8aaa;font-weight:700;margin-bottom:2px}
        .val{font-size:11px;font-weight:600;color:#1a2a3a}
        pre{background:#f7f9fc;border:1px solid #e8edf3;border-radius:6px;padding:10px;font-size:10px;white-space:pre-wrap;color:#2a4a6a}
        .break{page-break-after:always}
        .footer{margin-top:32px;font-size:9px;color:#9ab0c8;border-top:1px solid #e2e8f0;padding-top:10px}
        @page{margin:15mm;size:A4}
      </style>
    </head><body>
      <div class="report-header">
        <h1>📋 ${title}</h1>
        <span>${data.length} pratiche — Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
      </div>
      ${cards}
      <div class="footer">PSER Gestionale Subaffidamenti — Documento riservato</div>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
    </body></html>`);
    printWindow.document.close();
  };

  const handleExportPDF = (title: string, data: any[]) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const tableRows = data.map((d: any) => {
        const agg = appaltatoreAgg.get((d.appaltatore || d.app || '').trim());
        const importoVal = parseEuro(d.importoEur || d.importoRichiestoEuro);
        const massimoVal = agg?.maxSub || 0;
        const sogliaPct  = agg && agg.maxSub ? Math.min(100, Math.round((agg.totalCommitted / agg.maxSub) * 100)) : null;
        const sogliaColor = sogliaPct === null ? '#999' : sogliaPct >= 70 ? '#E24B4A' : sogliaPct >= 40 ? '#F5A800' : '#1D9E75';
        return `
        <tr>
          <td>${d.id}</td>
          <td>${d.appaltatore || d.app}</td>
          <td>${d.subfornitore || d.sub || '—'}</td>
          <td>${d.tipo}</td>
          <td>${d.stato}</td>
          <td>${d.scadenza || '—'}</td>
          <td>${d.scadenza ? safeDiff(d.scadenza, today) : '—'}</td>
          <td>${importoVal ? '€ ' + importoVal.toLocaleString('it-IT') : '—'}</td>
          <td>${massimoVal ? '€ ' + massimoVal.toLocaleString('it-IT') : '—'}</td>
          <td style="color:${sogliaColor};font-weight:700">${sogliaPct !== null ? sogliaPct + '%' : '—'}</td>
        </tr>`;
      }).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a202c; }
              .header { display: flex; align-items: center; gap: 10px; margin-bottom: 30px; color: #534AB7; font-weight: bold; font-size: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #0f172a; color: white; text-align: left; padding: 12px 15px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
              td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #4a5568; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header"><span>📋</span> ${title}</div>
            <table>
              <thead>
                <tr>
                  <th>ID Contratto</th>
                  <th>Appaltatore</th>
                  <th>Subfornitore</th>
                  <th>Tipo</th>
                  <th>Stato</th>
                  <th>Scadenza</th>
                  <th>Giorni</th>
                  <th>Importo (€)</th>
                  <th>Massimo Sub. (€)</th>
                  <th>Soglia %</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div class="footer">Generato il ${format(new Date(), 'dd/MM/yyyy')} — PSER Gestionale Subaffidamenti v2.0</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const memoData = useMemo(() => {
    if (!selectedApp) return null;
    const appData = subaffidamenti.filter(d => (d.appaltatore || d.app) === selectedApp);
    const tot = appData.length;
    const sub = appData.filter(d => d.tipo === 'Subappalto').length;
    const con = appData.filter(d => d.tipo === 'Subcontratto').length;
    const crit = appData.filter(d => d.stato === 'Rigettata' || d.stato === 'Da Rigettare' || d.stato === 'Scaduta').length;
    const aut = appData.filter(d => d.stato === 'Autorizzata' || d.stato === 'Attivata').length;
    
    const subStati: Record<string, number> = {};
    appData.filter(d => d.tipo === 'Subappalto').forEach(d => subStati[d.stato] = (subStati[d.stato] || 0) + 1);
    const conStati: Record<string, number> = {};
    appData.filter(d => d.tipo === 'Subcontratto').forEach(d => conStati[d.stato] = (conStati[d.stato] || 0) + 1);

    const subDetailParts = Object.entries(subStati).map(([s, n]) => `${n} ${n === 1 ? 'subappalto' : 'subappalti'} in stato ${s}`);
    const conDetailParts = Object.entries(conStati).map(([s, n]) => `${n} ${n === 1 ? 'subcontratto' : 'subcontratti'} in stato ${s}`);

    const summary = [...subDetailParts, ...conDetailParts].join('. ') + '.';
    const subBoxDetail = Object.entries(subStati).map(([s, n]) => `${n} ${s}`).join(', ');
    const conBoxDetail = Object.entries(conStati).map(([s, n]) => `${n} ${s}`).join(', ');

    return { tot, sub, con, crit, aut, summary, subBoxDetail, conBoxDetail };
  }, [subaffidamenti, selectedApp]);

  // AI Agent logic
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Ciao! Sono il tuo assistente per il Gestionale Subaffidamenti. Posso aiutarti a interpretare i dati, trovare criticita o rispondere a domande sul sistema. Come posso aiutarti?' }
  ]);
  const [aiInput, setAiInput] = useState('');

  const [isAiLoading, setIsAiLoading] = useState(false);

  const sendAI = async (msg?: string) => {
    const text = msg || aiInput;
    if (!text.trim()) return;
    
    setAiMessages(prev => [...prev, { role: 'user', text }]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const context = `
        Sei un assistente esperto del sistema PSER (Gestione Subaffidamenti).
        Ti comporti come un collega di lavoro reale, propositivo e professionale.
        
        STATISTICHE ATTUALI:
        - Totale Subaffidamenti: ${stats.tot}
        - Subappalti: ${stats.sub}
        - Subcontratti: ${stats.con}
        - Pratiche Critiche: ${stats.crit}
        - Pratiche Lavorate: ${stats.lavorate} (${stats.lavoratePct}%)
        
        PAGINA ATTUALE: Dashboard
        UTENTE: ${user?.nome || 'Utente'}
        DATA ODIERNA: ${format(today, 'dd/MM/yyyy')}

        DATI RECENTI:
        ${recenti.map(r => `- ${r.id}: ${r.app} -> ${r.sub} (${r.stato})`).join('\n')}

        ALERT ATTUALI:
        ${alerts.slice(0, 5).map(a => `- ${a._type === 'sub' ? 'Contratto' : 'Documento'}: ${a.app} (${(a as any).stato || (a as any).esito})`).join('\n')}

        ISTRUZIONI:
        - Rispondi in italiano in modo naturale.
        - Sii proattivo: se vedi criticità, suggerisci cosa fare.
        - Se l'utente chiede di scadenze, usa i dati forniti.
        - Non limitarti a rispondere, consiglia azioni concrete (es. "Dovremmo contattare l'appaltatore X per il contratto Y che scade tra 5 giorni").
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: context + "\n\nDOMANDA UTENTE: " + text }] }
        ],
      });

      const botText = response.text || "Mi dispiace, non sono riuscito a elaborare la richiesta.";
      setAiMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setAiMessages(prev => [...prev, { role: 'bot', text: "Si è verificato un errore nella comunicazione con l'assistente AI." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Calendar logic
  const [calDate, setCalDate] = useState(new Date());
  const [calProx, setCalProx] = useState(false);

  const calEvents = useMemo(() => {
    const ev: Record<string, any[]> = {};
    
    // Subaffidamenti
    subaffidamenti.forEach(d => {
      if (d.scadenza) {
        const k = d.scadenza;
        ev[k] = ev[k] || [];
        ev[k].push({ 
          tipo: 'fine', 
          nome: `${d.appaltatore || d.app} — ${d.subfornitore || d.sub}`, 
          color: '#E24B4A', 
          label: 'Scadenza Contratto',
          idSap: d.idSap || d.id,
          oggetto: d.oggetto,
          appaltatore: d.appaltatore || d.app,
          stato: d.stato,
          data: d.scadenza
        });
      }
      if (d.inizio) {
        const k = d.inizio;
        ev[k] = ev[k] || [];
        ev[k].push({ 
          tipo: 'inizio', 
          nome: `${d.appaltatore || d.app} — ${d.subfornitore || d.sub}`, 
          color: '#1D9E75', 
          label: 'Inizio Contratto',
          idSap: d.idSap || d.id,
          oggetto: d.oggetto,
          appaltatore: d.appaltatore || d.app,
          stato: d.stato,
          data: d.inizio
        });
      }
    });

    // Documenti (Controllo Documentale)
    documenti.forEach(d => {
      if (d.scad) {
        const k = d.scad;
        ev[k] = ev[k] || [];
        ev[k].push({
          tipo: 'doc_scad',
          nome: `${d.app} — ${d.doc}`,
          color: '#F5A800',
          label: 'Scadenza Documento',
          tipologia: d.doc,
          responsabile: d.responsabile || d.utente,
          data: d.scad,
          sap: d.sap
        });
      }
      if (d.termineAdeguamento) {
        const k = d.termineAdeguamento;
        ev[k] = ev[k] || [];
        ev[k].push({
          tipo: 'doc_adeguamento',
          nome: `${d.app} — ${d.doc}`,
          color: '#534AB7',
          label: 'Termine Adeguamento',
          tipologia: d.doc,
          responsabile: d.responsabile || d.utente,
          data: d.termineAdeguamento,
          sap: d.sap
        });
      }
    });

    return ev;
  }, [subaffidamenti, documenti]);

  const allNotifications = useMemo(() => {
    const list: any[] = [];
    
    // 1. System Alerts (Subaffidamenti)
    subaffidamenti.forEach(d => {
      if (d.stato === 'Rigettata') {
        list.push({
          id: `sub-rig-${d.id}`,
          type: 'alert',
          title: 'Pratica Rigettata',
          desc: `${d.appaltatore || d.app} — ${d.subfornitore || d.sub}`,
          date: d.inserito || today.toISOString(),
          target: 'subaffidamenti',
          targetId: d.id,
          color: '#E24B4A'
        });
      }
      if (d.scadenza) {
        const diff = safeDiff(d.scadenza, today);
        if (diff >= 0 && diff <= 30) {
          list.push({
            id: `sub-scad-${d.id}`,
            type: 'warning',
            title: 'Contratto in Scadenza',
            desc: `${d.appaltatore || d.app} — ${d.subfornitore || d.sub}`,
            date: d.scadenza,
            target: 'subaffidamenti',
            targetId: d.id,
            color: '#F5A800'
          });
        }
      }
    });

    // 2. Document Alerts (Controllo Documentale)
    documenti.forEach((d, idx) => {
      if (d.scad) {
        const diff = safeDiff(d.scad, today);
        if (diff <= 30) {
          list.push({
            id: `doc-scad-${idx}`,
            type: 'warning',
            title: 'Documento in Scadenza',
            desc: `${d.app} — ${d.doc}`,
            date: d.scad,
            target: 'controllo',
            targetId: d.sap,
            color: '#F5A800'
          });
        }
      }
    });

    // 3. Custom Events
    customEvents.forEach(ce => {
      list.push({
        id: ce.id,
        type: 'event',
        title: ce.title,
        desc: `Creato da: ${ce.createdBy || 'Sistema'}`,
        date: ce.startDate,
        target: 'choice',
        event: ce,
        color: '#534AB7',
        createdBy: ce.createdBy,
        createdAt: ce.createdAt
      });
    });

    return list.sort((a, b) => {
      const timeA = isValidDate(a.date) ? new Date(a.date).getTime() : 0;
      const timeB = isValidDate(b.date) ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  }, [subaffidamenti, documenti, customEvents]);

  const calendarDays = useMemo(() => {
    const yr = calDate.getFullYear();
    const mo = calDate.getMonth();
    const firstDay = new Date(yr, mo, 1).getDay();
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    const padding = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    for (let i = 0; i < padding; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = format(new Date(yr, mo, d), 'yyyy-MM-dd');
      const dayEvents = [...(calEvents[dateStr] || [])];
      
      // Add custom events
      customEvents.forEach(ce => {
        if (ce.startDate === dateStr) {
          dayEvents.push({
            tipo: 'custom',
            label: ce.label || 'Evento',
            nome: ce.title,
            color: ce.color || '#F5A800'
          });
        }
      });

      days.push({ day: d, dateStr, events: dayEvents });
    }
    return days;
  }, [calDate, calEvents, customEvents]);

  const upcomingEvents = useMemo(() => {
    const ts = format(today, 'yyyy-MM-dd');
    const all: any[] = [];
    
    // System events
    (Object.entries(calEvents) as [string, any[]][]).forEach(([date, evs]) => {
      if (calProx ? date >= ts : date === ts) {
        evs.forEach(e => all.push({ date, ...e }));
      }
    });

    // Custom events
    customEvents.forEach(ce => {
      if (calProx ? ce.startDate >= ts : ce.startDate === ts) {
        all.push({
          date: ce.startDate,
          tipo: 'custom',
          label: ce.label || 'Evento',
          nome: ce.title,
          color: ce.color || '#F5A800'
        });
      }
    });

    return all.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  }, [calEvents, calProx, customEvents]);

  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));

  const selectedDayEvents = useMemo(() => {
    const day = selectedCalDay || format(new Date(), 'yyyy-MM-dd');
    const all: any[] = [];
    
    // System events
    if (calEvents[day]) {
      calEvents[day].forEach(e => all.push({ date: day, ...e }));
    }

    // Custom events
    customEvents.forEach(ce => {
      if (ce.startDate === day) {
        all.push({
          id: ce.id,
          date: ce.startDate,
          tipo: 'custom',
          label: ce.label || 'Evento',
          nome: ce.title,
          color: ce.color || '#F5A800',
          raw: ce
        });
      }
    });

    return all;
  }, [calEvents, customEvents, selectedCalDay]);

  return (
    <div 
      className="p-5 space-y-5 relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
          handleExcelImport(file);
        }
      }}
    >
      {/* DRAG OVERLAY */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#534AB7]/20 backdrop-blur-md z-[1000] flex items-center justify-center p-12"
          >
            <div className="w-full max-w-2xl border-4 border-dashed border-[#534AB7] rounded-3xl p-20 text-center bg-[#0f2035]/90 shadow-2xl">
              <FileUp size={80} className="mx-auto text-[#534AB7] mb-6 animate-bounce" />
              <h2 className="text-3xl font-bold text-[#ddeeff] mb-4">Rilascia il file Excel qui</h2>
              <p className="text-[#8ab0c8]">Il sistema aggiornerà automaticamente anagrafiche, scadenze e importi.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOPBAR */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-base font-semibold text-[#ddeeff]">Dashboard</h1>
          <p className="text-xs text-[#3a5a7a] mt-1">Panoramica generale — aggiornata in tempo reale</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* MAIL */}
          <button
            onClick={() => setShowEmailModal(true)}
            className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#8ab0c8] hover:bg-white/10 hover:text-[#378ADD] transition-all"
          >
            <Mail size={18} />
          </button>

          {/* NOTIFICATIONS */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#8ab0c8] hover:bg-white/10 hover:text-[#378ADD] transition-all relative"
            >
              <Bell size={18} />
              {allNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#E24B4A] rounded-full shadow-[0_0_8px_#E24B4A] text-[10px] font-bold text-white flex items-center justify-center border border-[#0f2035]">
                  {allNotifications.length}
                </span>
              )}
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 bg-[#0f2035] border border-white/10 rounded-2xl shadow-2xl z-[600] overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-white/5 bg-white/2 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#ddeeff] uppercase tracking-widest">Notifiche Scadenze</span>
                    <span className="text-[10px] text-[#3a5a7a] bg-white/5 px-2 py-0.5 rounded">{allNotifications.length}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {allNotifications.length > 0 ? allNotifications.map((a, i) => (
                      <div 
                        key={a.id || i} 
                        onClick={() => {
                          if (a.target === 'choice') {
                            setSelectedEventForAction(a.event);
                          } else if (a.target === 'controllo') {
                            navigate('/controllo-documentale', { state: { sap: a.targetId } });
                          } else {
                            navigate('/subaffidamenti', { state: { selectedId: a.targetId } });
                          }
                          setShowNotifications(false);
                        }}
                        className="p-4 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full mt-1.5 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: a.color, color: a.color }}></div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-0.5">
                              <div className="text-[10px] font-bold uppercase" style={{ color: a.color }}>{a.title}</div>
                              <div className="text-[9px] text-[#2a4a6a] font-mono">{safeFormat(a.date, 'dd/MM/yy')}</div>
                            </div>
                            <div className="text-xs font-bold text-[#ddeeff] group-hover:text-[#378ADD] transition-colors">{a.desc}</div>
                            {a.createdBy && (
                              <div className="text-[9px] text-[#5a7a9a] mt-1 flex items-center gap-1.5">
                                <User size={8} /> Creato da: <span className="text-[#8ab0c8]">{a.createdBy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="p-10 text-center text-xs text-[#3a5a7a] italic">Nessuna notifica</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SUN / THEME TOGGLE */}
          <button className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#8ab0c8] hover:bg-white/10 hover:text-[#f5c842] transition-all">
            <Sun size={18} />
          </button>

          {/* DATE CHIP */}
          <div className="h-10 flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-[#8ab0c8] font-medium whitespace-nowrap capitalize">
            {format(today, 'EEEE d MMM yyyy', { locale: it })}
          </div>

          {/* USER AVATAR */}
          <div className="flex items-center gap-2 text-[11px] text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#534AB7] to-[#378ADD] flex items-center justify-center text-[10px] text-white font-bold shadow-[0_0_10px_rgba(83,74,183,0.4)]">
              {user?.nome?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <span className="text-[#c8ddf0] font-medium">{user?.nome}</span>
          </div>
        </div>
      </div>

      {/* ROW 2: CHARTS */}

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'TOTALE SUBAFFIDAMENTI', value: stats.tot, trend: 'tutti i tipi', color: '#F5A800', mode: 'all', glow: 'shadow-[0_0_15px_rgba(245,168,0,0.15)]' },
          { label: 'SUBAPPALTI', value: stats.sub, trend: `${stats.subPct}% del totale`, color: '#378ADD', mode: 'subappalto', glow: 'shadow-[0_0_15px_rgba(55,138,221,0.15)]' },
          { label: 'SUBCONTRATTI', value: stats.con, trend: `${stats.conPct}% del totale`, color: '#1D9E75', mode: 'subcontratto', glow: 'shadow-[0_0_15px_rgba(29,158,117,0.15)]' },
          { 
            label: 'RIGETTATI / CRITICI', 
            value: stats.crit, 
            trend: 'da gestire', 
            color: '#E24B4A', 
            mode: 'critici', 
            glow: 'shadow-[0_0_15px_rgba(226,75,74,0.15)]',
            extra: (
              <div className="flex items-center gap-1 mt-2 pr-8">
                <button 
                  onClick={(e) => { e.stopPropagation(); setCriticiRange(30); }}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-bold transition-all",
                    criticiRange === 30 ? "bg-[#E24B4A] text-white" : "bg-white/5 text-[#E24B4A] border border-[#E24B4A]/30"
                  )}
                >
                  30gg
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setCriticiRange(60); }}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-bold transition-all",
                    criticiRange === 60 ? "bg-[#E24B4A] text-white" : "bg-white/5 text-[#E24B4A] border border-[#E24B4A]/30"
                  )}
                >
                  60gg
                </button>
              </div>
            )
          },
          { label: 'AUTORIZZATI / ATTIVI', value: stats.ok, trend: `${stats.okPct}% conformi`, color: '#534AB7', mode: 'attivi', glow: 'shadow-[0_0_15px_rgba(83,74,183,0.15)]' },
          { label: 'PRATICHE LAVORATE', value: stats.lavorate, trend: `${stats.lavoratePct}% gestite`, color: '#a89ef8', mode: 'all', glow: 'shadow-[0_0_15_rgba(168,158,248,0.15)]' },
        ].map((kpi, i) => (
          <motion.div 
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.02, boxShadow: `0 0 25px ${kpi.color}33` }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
            className={cn(
              "bg-[#0f2035] border border-white/5 rounded-xl p-4 border-t-2 relative group overflow-hidden cursor-pointer transition-all",
              kpi.glow
            )}
            style={{ borderTopColor: kpi.color }}
            onClick={() => handleKpiClick(kpi.mode as any)}
          >
            <div className="text-[9px] text-[#3a5a7a] uppercase tracking-[0.15em] font-bold mb-3 leading-tight">{kpi.label}</div>
            <div className="text-3xl font-bold text-[#ddeeff] leading-none mb-2">{kpi.value}</div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-medium" style={{ color: kpi.color }}>{kpi.trend}</div>
              {kpi.extra}
            </div>
            <div className="absolute bottom-4 right-4 w-7 h-7 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-xs text-[#6a8aaa] opacity-40 group-hover:opacity-100 group-hover:bg-[#534AB7]/20 group-hover:text-[#a89ef8] transition-all">
              <ArrowUpRight size={14} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ADVANCED ANALYSIS & COMPLIANCE SECTION - hidden, content moved to ROW A and ROW B */}
      <div className="hidden grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PREDICTIVE ALERTS */}
        <div className="bg-[#0f2035] border border-white/10 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-[#ddeeff] uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} className="text-[#F5A800]" /> Alert Predittivi Soglie
            </h3>
            <span className="text-[9px] text-[#3a5a7a] bg-white/5 px-2 py-0.5 rounded">Soglia &gt; 50%</span>
          </div>
          <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
            {predictiveAlerts.length > 0 ? predictiveAlerts.map(a => (
              <div key={a.id} className="bg-white/3 border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:bg-[#534AB7]/10 transition-all cursor-pointer" onClick={() => handleRowClick(a)}>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-[#ddeeff] group-hover:text-[#a89ef8]">{a.app}</div>
                  <div className="text-[9px] text-[#3a5a7a] font-mono">{a.idSap || a.id}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className={cn("text-xs font-bold", a.pct >= 80 ? "text-[#E24B4A]" : "text-[#F5A800]")}>
                    {Math.round(a.pct)}%
                  </div>
                  <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className={cn("h-full", a.pct >= 80 ? "bg-[#E24B4A]" : "bg-[#F5A800]")} style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-xs text-[#3a5a7a] italic">Nessun alert soglia rilevato</div>
            )}
          </div>
        </div>

        {/* CUMULATIVE CHART */}
        <div className="bg-[#0f2035] border border-white/10 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-[10px] font-bold text-[#ddeeff] uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-[#534AB7]" /> Trend Cumulativo Subappalti
            </h3>
            <div className="flex items-center gap-1">
              {(['3M','6M','1A','ALL'] as const).map(w => (
                <button key={w} onClick={() => setTrendWindow(w)}
                  className={cn('text-[9px] font-bold px-2 py-0.5 rounded transition-all border',
                    trendWindow === w
                      ? 'bg-[#534AB7] border-[#534AB7] text-white'
                      : 'border-white/10 text-[#3a5a7a] hover:text-[#8ab0c8] hover:border-white/20 bg-transparent')}>
                  {w}
                </button>
              ))}
              <button onClick={() => handleExportChartPNG(trendChartRef1)}
                className="text-[9px] font-bold px-2 py-0.5 rounded border border-white/10 text-[#3a5a7a] hover:text-[#8ab0c8] hover:border-white/20 bg-transparent transition-all ml-1">
                PNG
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-1">
            <span className="flex items-center gap-1.5 text-[9px] text-[#6a8aaa] uppercase font-bold">
              <span className="w-5 h-0.5 bg-[#534AB7] inline-block rounded" /> Importo SUB (€ 000)
            </span>
            <span className="flex items-center gap-1.5 text-[9px] text-[#6a8aaa] uppercase font-bold">
              <span className="w-5 h-0.5 border-t-2 border-dashed border-[#1D9E75] inline-block" /> Budget NORM. (€ 000)
            </span>
          </div>
          <div className="h-[200px] w-full" ref={trendChartRef1}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="gradSub1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#534AB7" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#534AB7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradBudget1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#ffffff06" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#3a5a7a',fontSize:9}} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{fill:'#2a4a6a',fontSize:8}} width={36} />
                <RechartsTooltip
                  contentStyle={{backgroundColor:'#0d1f36',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',fontSize:'10px',padding:'8px 12px'}}
                  itemStyle={{color:'#ddeeff'}}
                  formatter={(v: any, name: string) => [`€ ${Number(v).toLocaleString('it')}k`, name === 'sub' ? 'Importo SUB' : 'Budget NORM.']}
                />
                <Area type="monotone" dataKey="budget" stroke="#1D9E75" strokeWidth={1.5} strokeDasharray="6 4" fillOpacity={1} fill="url(#gradBudget1)" />
                <Area type="monotone" dataKey="sub"    stroke="#534AB7" strokeWidth={2}   fillOpacity={1} fill="url(#gradSub1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* COMPLIANCE & SCORING */}
        <div className="bg-[#0f2035] border border-white/10 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-[#ddeeff] uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#1D9E75]" /> Salute Documentale & Rating
            </h3>
          </div>
          
          <div className="flex items-center gap-6 bg-white/3 border border-white/5 rounded-2xl p-4">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="36" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle cx="40" cy="40" r="36" fill="transparent" stroke="#1D9E75" strokeWidth="6" strokeDasharray={226} strokeDashoffset={226 - (226 * complianceHealth.score / 100)} strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-[#ddeeff] leading-none">{complianceHealth.score}%</span>
                <span className="text-[8px] text-[#3a5a7a] font-bold uppercase mt-0.5">Health</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 gap-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#3a5a7a] font-bold uppercase">Conformi</span>
                <span className="text-[#1D9E75] font-bold">{complianceHealth.ok}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#3a5a7a] font-bold uppercase">In Scadenza</span>
                <span className="text-[#F5A800] font-bold">{complianceHealth.warn}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#3a5a7a] font-bold uppercase">Critici</span>
                <span className="text-[#E24B4A] font-bold">{complianceHealth.crit}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-[9px] text-[#3a5a7a] font-bold uppercase tracking-widest">Top Contractor Rating</div>
            <div className="space-y-2">
              {appList.slice(0, 3).map(app => {
                const data = contractorScores[app] || { score: 0, details: [] };
                return (
                  <div key={app} className="bg-white/2 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#534AB7]/10 flex items-center justify-center text-[10px] font-bold text-[#a89ef8]">
                        {app.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-[#ddeeff] truncate max-w-[120px]">{app}</div>
                        <div className="text-[8px] text-[#3a5a7a]">{data.details[0] || 'Nessuna criticità'}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={cn("text-xs font-bold", data.score >= 80 ? "text-[#1D9E75]" : data.score >= 50 ? "text-[#F5A800]" : "text-[#E24B4A]")}>
                        {data.score}/100
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={6} fill={s <= Math.round(data.score / 20) ? "currentColor" : "none"} className={s <= Math.round(data.score / 20) ? "text-[#F5A800]" : "text-white/10"} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS & ACTIONS */}
      <div className="bg-[#0f2035] border border-white/10 rounded-xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-end justify-between gap-3 flex-nowrap">
          <div className="flex items-end gap-3 flex-1">
            <div className="flex flex-col gap-1 relative flex-1 max-w-[220px]">
              <label className="text-[9px] text-[#2a4a6a] uppercase tracking-widest font-bold">Appaltatore</label>
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a5a7a] group-focus-within:text-[#534AB7] transition-colors" />
                <input
                  type="text"
                  value={appSearch}
                  onChange={(e) => {
                    setAppSearch(e.target.value);
                    setShowAppDropdown(true);
                    if (!e.target.value) setSelectedApp(null);
                  }}
                  onFocus={() => setShowAppDropdown(true)}
                  onBlur={() => setTimeout(() => setShowAppDropdown(false), 200)}
                  placeholder="Cerca appaltatore.."
                  className="w-full h-10 pl-10 pr-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-xs outline-none focus:border-[#534AB7]/50 focus:ring-1 focus:ring-[#534AB7]/30 transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a5a7a] pointer-events-none group-focus-within:text-[#534AB7] transition-colors">
                  <ChevronRight size={14} className="rotate-90" />
                </div>
                <AnimatePresence>
                  {showAppDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-11 left-0 right-0 bg-[#0f2035] border border-[#534AB7]/35 rounded-xl z-[100] max-h-64 overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.5)] custom-scrollbar"
                    >
                      {filteredAppList.length > 0 ? (
                        filteredAppList.map(app => (
                          <div
                            key={app}
                            onMouseDown={() => {
                              setSelectedApp(app);
                              setAppSearch(app);
                              setShowAppDropdown(false);
                            }}
                            className="p-3 text-xs text-[#c8ddf0] cursor-pointer border-b border-white/5 hover:bg-[#534AB7]/20 hover:text-[#a89ef8] transition-colors"
                          >
                            {highlightMatch(app, appSearch)}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-xs text-[#3a5a7a] text-center">Nessun risultato</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex flex-col gap-1 min-w-[160px] relative">
              <label className="text-[9px] text-[#2a4a6a] uppercase tracking-widest font-bold">Contratto</label>
              <div className="relative group">
                <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a5a7a] group-focus-within:text-[#534AB7] transition-colors" />
                <input
                  type="text"
                  value={contrattoSearch}
                  onChange={(e) => setContrattoSearch(e.target.value)}
                  placeholder="Cerca ID contratto.."
                  className="w-full h-10 pl-10 pr-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-xs outline-none focus:border-[#534AB7]/50 focus:ring-1 focus:ring-[#534AB7]/30 transition-all"
                />
                {contrattoSearch && (
                  <button 
                    onClick={() => setContrattoSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3a5a7a] hover:text-[#E24B4A] transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              <AnimatePresence>
                {foundContract && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={() => {
                      setContrattoSearch(foundContract.id);
                      handleRowClick(foundContract);
                    }}
                    className="absolute top-16 left-0 right-0 bg-[#0f2035] border border-[#534AB7]/40 rounded-xl p-3 z-[110] shadow-2xl cursor-pointer hover:bg-[#162840] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-bold text-[#534AB7] uppercase tracking-wider">Anteprima Pratica</div>
                      <div className="text-[9px] px-1.5 py-0.5 rounded bg-[#534AB7]/20 text-[#a89ef8] font-mono">{foundContract.id}</div>
                    </div>
                    <div className="text-xs text-[#ddeeff] font-bold mb-1 truncate">{foundContract.sub}</div>
                    <div className="text-[10px] text-[#6a8aaa] truncate">{foundContract.app}</div>
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                      <div className="text-[9px] text-[#3a5a7a] uppercase font-bold">{foundContract.stato}</div>
                      <ArrowUpRight size={12} className="text-[#534AB7] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[9px] text-[#2a4a6a] uppercase tracking-widest font-bold">Tipo</label>
              <select 
                value={tipoFilter}
                onChange={e => setTipoFilter(e.target.value)}
                className="h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#8ab0c8] text-xs px-3 outline-none focus:border-[#534AB7]/50 transition-all cursor-pointer"
              >
                <option value="">Tutti i tipi</option>
                <option value="Subappalto">Subappalto</option>
                <option value="Subcontratto">Subcontratto</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-[155px]">
              <label className="text-[9px] text-[#2a4a6a] uppercase tracking-widest font-bold">Stato</label>
              <select 
                value={statoFilter}
                onChange={e => setStatoFilter(e.target.value)}
                className="h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#8ab0c8] text-xs px-3 outline-none focus:border-[#534AB7]/50 transition-all cursor-pointer"
              >
                <option value="">Tutti gli stati</option>
                {Object.keys(STATO_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowGantt(!showGantt)}
                className={cn(
                  "h-10 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all border",
                  showGantt ? "bg-[#534AB7] text-white border-[#534AB7]" : "bg-white/5 text-[#6a8aaa] border-white/10 hover:bg-white/10"
                )}
              >
                <GanttChartSquare size={16} />
                <span className="hidden sm:inline">{showGantt ? 'Vista Tabella' : 'Vista Timeline'}</span>
              </button>
              <button 
                onClick={() => {
                  setSelectedApp(null);
                  setAppSearch('');
                  setContrattoSearch('');
                  setTipoFilter('');
                  setStatoFilter('');
                  setWorklistTab('Tutti');
                  setWorklistTipo('');
                }}
                className="h-10 px-4 bg-[#534AB7]/10 border border-[#534AB7]/30 rounded-xl text-[#a89ef8] text-xs font-bold hover:bg-[#534AB7]/20 transition-all flex items-center gap-2"
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowArchivioModal(true)}
            className="h-10 px-4 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-xl text-[#5DCAA5] text-xs font-bold hover:bg-[#1D9E75]/20 transition-all flex items-center gap-2 shrink-0"
          >
            <Archive size={14} /> Vai all'Archivio
          </button>
        </div>
      </div>

      {/* MEMO APPALTATORE - MOVED OUTSIDE FOR BETTER VISIBILITY */}
      <AnimatePresence>
        {selectedApp && memoData && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#0f2035] border border-[#F5A800]/20 rounded-2xl p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#F5A800]/5 flex items-center justify-center text-red-500 shrink-0">
                  <Pin size={24} fill="currentColor" className="rotate-45" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-[#F5A800] uppercase tracking-tight">{selectedApp}</h3>
                    <span className="text-[11px] text-[#F5A800]/60 font-bold">
                      {memoData.tot} pratiche totali in archivio
                    </span>
                  </div>
                  <p className="text-sm text-[#8ab0c8] leading-relaxed max-w-4xl pt-2">
                    {appaltatori.find(a => a.nome === selectedApp)?.note || 'Nessuna nota disponibile per questo appaltatore.'}
                  </p>
                  <div className="text-sm text-[#8ab0c8] pt-2">
                     {memoData.summary}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setSelectedApp(null);
                    setAppSearch('');
                  }}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#6a8aaa] hover:bg-white/10 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
              {[
                { label: 'TOTALE', val: memoData.tot, color: '#6a8aaa' },
                { label: 'SUBAPPALTI', val: memoData.sub, sub: memoData.subBoxDetail, color: '#378ADD' },
                { label: 'SUBCONTRATTI', val: memoData.con, sub: memoData.conBoxDetail, color: '#1D9E75' },
                { label: 'CRITICI', val: memoData.crit, color: '#E24B4A' },
                { label: 'ATTIVI', val: memoData.aut, color: '#5DCAA5' },
              ].map(k => (
                <div key={k.label} className="bg-[#162840] border border-white/5 rounded-xl p-4 flex flex-col gap-1 shadow-inner">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold" style={{ color: k.color }}>{k.val}</span>
                  </div>
                  <div className="text-[9px] text-[#3a5a7a] font-bold uppercase tracking-widest">{k.label}</div>
                  {k.sub && <div className="text-[9px] text-[#3a5a7a] truncate mt-0.5">{k.sub}</div>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedDetail && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-6"
            onClick={e => e.target === e.currentTarget && setSelectedDetail(null)}
          >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="bg-[#0d1f36] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* MODAL HEADER */}
            <div className="px-6 py-4 border-b border-white/5 bg-[#0b1a2e]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#534AB7]/25 border border-[#534AB7]/40 text-[#a89ef8] font-mono shrink-0">
                    ID {selectedDetail.id || selectedDetail.sap || '—'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#ddeeff] truncate">
                      {selectedDetail._type === 'doc'
                        ? `${selectedDetail.doc} — ${selectedDetail.app || selectedDetail.appaltatore}`
                        : `${selectedDetail.appaltatore || selectedDetail.app} → ${selectedDetail.subfornitore || selectedDetail.sub || '—'}`
                      }
                    </div>
                    <div className="text-[10px] text-[#3a5a7a] mt-0.5">
                      {selectedDetail._type === 'doc'
                        ? `SAP ${selectedDetail.sap} · Esito: ${selectedDetail.esito}`
                        : `${selectedDetail.tipo} · scade il ${safeFormat(selectedDetail.scadenza, 'dd/MM/yyyy')}`
                      }
                    </div>
                    {!selectedDetail._type || selectedDetail._type !== 'doc' ? (() => {
                      const ogg = selectedDetail.oggettoRichiesta || selectedDetail.oggetto;
                      return ogg ? (
                        <div className="text-[10px] text-[#5a8aaa] mt-1 italic leading-snug line-clamp-2" title={ogg}>
                          {ogg}
                        </div>
                      ) : null;
                    })() : null}
                  </div>
                  <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0', STATO_CLS[selectedDetail.stato || selectedDetail.esito] || 'bg-white/5 text-[#5a7a9a] border-white/10')}>
                    {selectedDetail.stato || selectedDetail.esito}
                  </span>
                </div>
                <button onClick={() => setSelectedDetail(null)} className="shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#6a8aaa] hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            {/* MODAL BODY */}
            <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-4">
              {(() => {
                const isDoc = selectedDetail._type === 'doc';
                const sap = isDoc ? selectedDetail.sap : (selectedDetail.idSapContratto || selectedDetail.idSap || '');
                const docsForPratica = sap ? documenti.filter(d => d.sap === sap) : [];
                const criticiDocs = docsForPratica.filter(d =>
                  ['Non Conforme', 'Richiesta Informazioni', 'Scaduto'].includes(d.esito) ||
                  (d.scad && isValidDate(d.scad) && safeDiff(d.scad, today) <= 0)
                );
                const importoVal = parseEuro(selectedDetail.importoRichiestoEuro || selectedDetail.importoEur);
                const maxVal = parseEuro(selectedDetail.importoMassimoSubappaltabile || selectedDetail.importoMaxSub);
                const sogliaPct = maxVal > 0 ? Math.min(100, (importoVal / maxVal) * 100) : 0;
                const residuoVal = Math.max(0, maxVal - importoVal);
                const initials = (selectedDetail.utente || user?.nome || 'S').split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase();
                const timeline = activityLog.filter(l =>
                  l.detail?.includes(selectedDetail.id) || l.detail?.includes(sap) ||
                  l.desc?.includes(selectedDetail.appaltatore || selectedDetail.app || '____')
                ).slice(0, 6);

                return <>
                  {/* 3 CARDS */}
                  <div className={cn('grid gap-3', isDoc ? 'grid-cols-2' : 'grid-cols-3')}>
                    {/* IMPORTO */}
                    {!isDoc && (
                      <div className="bg-[#0f2035] border border-white/8 rounded-xl p-4">
                        <div className="text-[9px] text-[#534AB7] uppercase tracking-widest font-bold flex items-center gap-1.5 mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#534AB7]" /> Importo
                        </div>
                        {importoVal > 0 ? <>
                          <div className="text-xl font-bold text-[#ddeeff] font-mono mb-1">
                            € {importoVal.toLocaleString('it-IT')}
                          </div>
                          {maxVal > 0 && <>
                            <div className="text-[10px] text-[#3a5a7a] mb-2">
                              {sogliaPct.toFixed(1)}% soglia · Residuo € {residuoVal.toLocaleString('it-IT')}
                            </div>
                            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', sogliaPct > 80 ? 'bg-[#E24B4A]' : 'bg-[#F5A800]')}
                                style={{ width: `${sogliaPct}%` }} />
                            </div>
                          </>}
                        </> : <div className="text-[11px] text-[#3a5a7a] italic">Dati non disponibili</div>}
                      </div>
                    )}

                    {/* SCADENZE */}
                    <div className="bg-[#0f2035] border border-white/8 rounded-xl p-4">
                      <div className="text-[9px] text-[#378ADD] uppercase tracking-widest font-bold flex items-center gap-1.5 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#378ADD]" /> Scadenze
                      </div>
                      {(() => {
                        const mainDate = isDoc ? selectedDetail.scad : selectedDetail.scadenza;
                        const diff = mainDate && isValidDate(mainDate) ? safeDiff(mainDate, today) : null;
                        return <>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock size={12} className="text-[#F5A800] shrink-0" />
                            <span className="text-[11px] font-mono text-[#c8ddf0]">{safeFormat(mainDate, 'dd/MM/yyyy')}</span>
                            {diff !== null && (
                              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', diff < 0 ? 'bg-[#E24B4A]/15 text-[#f09595]' : diff <= 30 ? 'bg-[#F5A800]/15 text-[#F5A800]' : 'bg-[#1D9E75]/15 text-[#5DCAA5]')}>
                                {diff >= 0 ? '+' : ''}{diff}gg
                              </span>
                            )}
                          </div>
                          {docsForPratica.slice(0, 3).map((d, i) => (
                            <div key={i} className="text-[10px] text-[#4a6a8a] mt-1">
                              {d.doc}: <span className="text-[#6a8aaa] font-mono">{d.scad ? safeFormat(d.scad, 'dd/MM/yyyy') : '—'}</span>
                            </div>
                          ))}
                        </>;
                      })()}
                    </div>

                    {/* DOCUMENTI */}
                    <div className="bg-[#0f2035] border border-white/8 rounded-xl p-4">
                      <div className="text-[9px] text-[#1D9E75] uppercase tracking-widest font-bold flex items-center gap-1.5 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" /> Documenti
                      </div>
                      {docsForPratica.length > 0 ? <>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {docsForPratica.slice(0, 6).map((d, i) => {
                            const col = d.esito === 'Conforme' ? '#1D9E75' : d.esito === 'Non Conforme' || d.esito === 'Scaduto' ? '#E24B4A' : '#F5A800';
                            return (
                              <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                                style={{ color: col, borderColor: `${col}40`, backgroundColor: `${col}18` }}>
                                {d.doc.length > 8 ? d.doc.slice(0, 8) + '…' : d.doc}
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-[10px] text-[#3a5a7a]">
                          {docsForPratica.length} doc{docsForPratica.length > 1 ? 's' : ''}
                          {criticiDocs.length > 0 && <span className="text-[#f09595] ml-1">· {criticiDocs.length} critico/i</span>}
                        </div>
                      </> : <div className="text-[10px] text-[#2a4a6a] italic">Nessun documento inserito</div>}
                    </div>
                  </div>

                  {/* TIMELINE */}
                  <div className="bg-[#0f2035] border border-white/8 rounded-xl p-4">
                    <div className="text-[9px] text-[#a89ef8] uppercase tracking-widest font-bold flex items-center gap-1.5 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a89ef8]" /> Timeline
                    </div>
                    {timeline.length > 0 ? (
                      <div className="space-y-0">
                        {timeline.map((l, i) => (
                          <div key={i} className={cn('flex items-start gap-3 py-2.5', i < timeline.length - 1 ? 'border-b border-white/5' : '')}>
                            <span className="text-[10px] text-[#2a4a6a] font-mono whitespace-nowrap w-[110px] shrink-0 mt-0.5">{l.tsDisplay}</span>
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#534AB7] to-[#378ADD] flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                              {l.utente?.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase() || 'S'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-[#c8ddf0] font-medium">{l.desc}</div>
                              <div className="text-[10px] text-[#3a5a7a] mt-0.5">{l.utente}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#2a4a6a] italic py-2">Nessuna attività registrata per questa pratica</div>
                    )}
                  </div>
                </>;
              })()}
            </div>

            {/* MODAL FOOTER */}
            <div className="px-5 py-4 border-t border-white/5 bg-[#0b1a2e] flex gap-3">
              <button
                onClick={() => { navigate('/storico', { state: { praticaId: selectedDetail.id } }); setSelectedDetail(null); }}
                className="flex-1 h-10 bg-[#534AB7] text-white rounded-xl text-xs font-bold hover:bg-[#6358cc] transition-all flex items-center justify-center gap-2"
              >
                <Edit2 size={13} /> Gestisci in Solleciti
              </button>
              <button
                onClick={() => {
                  const d = selectedDetail;
                  const sap = d.idSapContratto || d.idSap || '';
                  const docsLine = documenti.filter(doc => doc.sap === sap).map(doc => `${doc.doc}: ${doc.esito} — scad. ${doc.scad || '—'}`).join('\n');
                  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report ${d.id}</title>
                  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;font-size:11px;color:#1a2a3a;padding:24px}
                  h1{font-size:16px;font-weight:700;border-bottom:2px solid #534AB7;padding-bottom:8px;margin-bottom:16px}
                  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
                  .cell{border:1px solid #e8edf3;border-radius:6px;padding:8px 12px}
                  .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#6a8aaa;font-weight:700;margin-bottom:2px}
                  .val{font-size:11px;font-weight:600}
                  pre{background:#f7f9fc;border:1px solid #e8edf3;border-radius:6px;padding:10px;font-size:10px;white-space:pre-wrap}
                  @page{margin:15mm;size:A4}</style></head><body>
                  <h1>Report Pratica ${d.id} — ${d.appaltatore || d.app}</h1>
                  <div class="grid">
                    <div class="cell"><div class="lbl">Subfornitore</div><div class="val">${d.subfornitore || d.sub || '—'}</div></div>
                    <div class="cell"><div class="lbl">Tipo</div><div class="val">${d.tipo || '—'}</div></div>
                    <div class="cell"><div class="lbl">Stato</div><div class="val">${d.stato || '—'}</div></div>
                    <div class="cell"><div class="lbl">Scadenza</div><div class="val">${safeFormat(d.scadenza, 'dd/MM/yyyy')}</div></div>
                    <div class="cell"><div class="lbl">SAP Contratto</div><div class="val">${sap || '—'}</div></div>
                    <div class="cell"><div class="lbl">Importo</div><div class="val">${d.importoRichiestoEuro || d.importoEur ? `€ ${parseEuro(d.importoRichiestoEuro || d.importoEur).toLocaleString('it-IT')}` : '—'}</div></div>
                  </div>
                  ${docsLine ? `<div class="lbl" style="margin-bottom:6px">Documenti</div><pre>${docsLine}</pre>` : ''}
                  <div style="margin-top:16px;font-size:9px;color:#9ab0c8">Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')} — PSER Gestionale</div>
                  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
                  </body></html>`;
                  const w = window.open('', '_blank', 'width=900,height=700');
                  if (w) { w.document.write(html); w.document.close(); }
                }}
                className="h-10 px-4 bg-[#1D9E75]/15 border border-[#1D9E75]/30 rounded-xl text-[#5DCAA5] text-xs font-bold hover:bg-[#1D9E75]/25 transition-all flex items-center gap-2"
              >
                <Download size={13} /> Genera report
              </button>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEZIONI ROW A + ROW B - ordinate visivamente con flex */}
      <div className="flex flex-col gap-5">

      {/* ROW B: ULTIMI INSERITI | TREND | DISTRIBUZIONE */}
      <div className="grid grid-cols-3 gap-4 order-2">
        <div className="bg-[#0f2035] border border-white/5 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-semibold text-[#7a9ab8] flex items-center gap-2">
              <Clock size={14} /> Ultimi Inseriti
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#378ADD] text-white">RECENTI</span>
              <button
                onClick={() => navigate('/subaffidamenti')}
                className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10 transition-all"
              >
                Vedi ATT
              </button>
              <button
                onClick={() => navigate('/storico')}
                className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10 transition-all"
              >
                Vedi STO
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {recenti.length > 0 ? recenti.map((d, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0 last:pb-0 group cursor-pointer" onClick={() => handleRowClick(d)}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#8ab0c8] font-medium truncate group-hover:text-[#ddeeff] transition-colors">{d.appaltatore || d.app}</div>
                  <div className="text-[10px] text-[#2a4a6a] mt-0.5 truncate">{d.subfornitore || d.sub} • {d.tipo}</div>
                </div>
                <span className={cn("pill shrink-0", STATO_CLS[d.stato] || "bg-white/5 text-[#5a7a9a]")}>
                  {d.stato.replace('Richiesta Informazioni', 'Rich. Info')}
                </span>
              </div>
            )) : (
              <div className="text-center py-10 text-xs text-[#2a4a6a]">Nessun dato</div>
            )}
          </div>
        </div>

        <div className="bg-[#0f2035] border border-white/10 rounded-xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-[10px] font-bold text-[#ddeeff] uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-[#534AB7]" /> Trend Cumulativo Subappalti
            </h3>
            <div className="flex items-center gap-1">
              {(['3M','6M','1A','ALL'] as const).map(w => (
                <button key={w} onClick={() => setTrendWindow(w)}
                  className={cn('text-[9px] font-bold px-2 py-0.5 rounded transition-all border',
                    trendWindow === w
                      ? 'bg-[#534AB7] border-[#534AB7] text-white'
                      : 'border-white/10 text-[#3a5a7a] hover:text-[#8ab0c8] hover:border-white/20 bg-transparent')}>
                  {w}
                </button>
              ))}
              <button onClick={() => handleExportChartPNG(trendChartRef2)}
                className="text-[9px] font-bold px-2 py-0.5 rounded border border-white/10 text-[#3a5a7a] hover:text-[#8ab0c8] hover:border-white/20 bg-transparent transition-all ml-1">
                PNG
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-1">
            <span className="flex items-center gap-1.5 text-[9px] text-[#6a8aaa] uppercase font-bold">
              <span className="w-5 h-0.5 bg-[#534AB7] inline-block rounded" /> Importo SUB (€ 000)
            </span>
            <span className="flex items-center gap-1.5 text-[9px] text-[#6a8aaa] uppercase font-bold">
              <span className="w-5 h-0.5 border-t-2 border-dashed border-[#1D9E75] inline-block" /> Budget NORM. (€ 000)
            </span>
          </div>
          <div className="h-[220px] w-full" ref={trendChartRef2}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="gradSub2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#534AB7" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#534AB7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradBudget2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#ffffff06" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#3a5a7a',fontSize:9}} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{fill:'#2a4a6a',fontSize:8}} width={36} />
                <RechartsTooltip
                  contentStyle={{backgroundColor:'#0d1f36',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',fontSize:'10px',padding:'8px 12px'}}
                  itemStyle={{color:'#ddeeff'}}
                  formatter={(v: any, name: string) => [`€ ${Number(v).toLocaleString('it')}k`, name === 'sub' ? 'Importo SUB' : 'Budget NORM.']}
                />
                <Area type="monotone" dataKey="budget" stroke="#1D9E75" strokeWidth={1.5} strokeDasharray="6 4" fillOpacity={1} fill="url(#gradBudget2)" />
                <Area type="monotone" dataKey="sub"    stroke="#534AB7" strokeWidth={2}   fillOpacity={1} fill="url(#gradSub2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0f2035] border border-white/5 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-semibold text-[#7a9ab8] flex items-center gap-2">
              Distribuzione Stati
              {selectedApp && <span className="text-[#534AB7] font-bold">— {selectedApp}</span>}
              <span className="text-[#534AB7] font-bold">—{' '}
                {worklistTab === 'Tutti' && !worklistTipo ? 'TOTALE' :
                 worklistTipo === 'Subappalto' ? 'SUBAPPALTI' :
                 worklistTipo === 'Subcontratto' ? 'SUBCONTRATTI' :
                 worklistTab.toUpperCase()}
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <div className="text-[9px] text-[#3a5a7a] bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-tighter">
                {worklistData.length} {worklistData.length === 1 ? 'pratica' : 'pratiche'}
              </div>
              <button
                onClick={() => {
                  setStatoFilter('');
                  setSelectedApp(null);
                  setAppSearch('');
                  setTipoFilter('');
                  setWorklistTab('Tutti');
                  setWorklistTipo('');
                  setWorklistAppSearch('');
                  setWorklistIdSearch('');
                  setWorklistStato('');
                }}
                className="text-[9px] text-[#534AB7] hover:underline flex items-center gap-1"
              >
                ↺ Reset
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div 
              className="relative w-32 h-32 shrink-0"
              onMouseMove={(e) => {
                setMousePos({ x: e.clientX, y: e.clientY });
              }}
            >
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                {/* Track background */}
                <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="22" />
                
                {(() => {
                  let offset = 0;
                  const circ = 2 * Math.PI * 44;
                  const totalDonutCount = selectedApp ? subaffidamenti.filter(d => (d.appaltatore || d.app) === selectedApp).length : subaffidamenti.length;
                  return donutData.map(([stato, cnt]) => {
                    const pct = cnt / (totalDonutCount || 1);
                    const gap = 0; // zero gap
                    const dash = Math.max(0, pct * circ - gap);
                    const currentOffset = offset;
                    offset += pct * circ;
                    return (
                      <motion.circle
                        key={stato}
                        initial={{ strokeDasharray: `0 ${circ}` }}
                        animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        cx="60" cy="60" r="44"
                        fill="none"
                        stroke={STATO_COLORS[stato] || '#444'}
                        strokeWidth="22"
                        strokeDashoffset={-currentOffset}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setHoveredStato(stato)}
                        onMouseLeave={() => setHoveredStato(null)}
                        onClick={() => {
                          setWorklistStato(stato);
                          setWorklistTab('Tutti');
                          setTimeout(() => worklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
                        }}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden">
                <div className="flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-[#ddeeff] leading-none">
                    {selectedApp ? subaffidamenti.filter(d => (d.appaltatore || d.app) === selectedApp).length : subaffidamenti.length}
                  </div>
                  <div className="text-[8px] text-[#3a5a7a] font-bold uppercase tracking-widest mt-1">
                    Totale
                  </div>
                </div>
              </div>

              {/* DYNAMIC MOUSE-FOLLOWING TOOLTIP */}
              <AnimatePresence>
                {hoveredStato && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                      left: mousePos.x + 20,
                      top: mousePos.y + 20
                    }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="fixed pointer-events-none z-[1000] min-w-[200px] bg-[#0b1a2e]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
                    style={{ left: mousePos.x + 20, top: mousePos.y + 20 }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATO_COLORS[hoveredStato] }} />
                      <div className="text-[10px] font-bold text-[#ddeeff] uppercase tracking-wider">{hoveredStato}</div>
                    </div>
                    <div className="text-[11px] text-[#c8ddf0] font-mono mb-1">
                      {(() => {
                        const totalDonutCount = selectedApp ? subaffidamenti.filter(d => (d.appaltatore || d.app) === selectedApp).length : subaffidamenti.length;
                        const count = (selectedApp ? subaffidamenti.filter(d => (d.appaltatore || d.app) === selectedApp) : subaffidamenti).filter(d => d.stato === hoveredStato).length;
                        return (
                          <>
                            {count} {count === 1 ? 'pratica' : 'pratiche'} 
                            <span className="text-[#5a7a9a] ml-1.5">({Math.round((count / (totalDonutCount || 1)) * 100)}%)</span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="text-[9px] text-[#5a7a9a] leading-relaxed italic border-t border-white/5 pt-1.5 mt-1.5">
                      {STATO_DESCRIPTIONS[hoveredStato]}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex-1 space-y-2">
              {donutData.map(([stato, cnt]) => (
                <div key={stato} className="flex items-center justify-between group cursor-pointer" onClick={() => {
                  setWorklistStato(stato);
                  setWorklistTab('Tutti');
                  setTimeout(() => worklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
                }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATO_COLORS[stato] }} />
                    <span className="text-[10px] text-[#7a9ab8] group-hover:text-[#ddeeff] transition-colors">{stato}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#ddeeff]">{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROW A: SCADENZE & SOGLIE CONTRATTI */}
      <div className="grid grid-cols-2 gap-4 order-1">
        {/* ── PENDENZE DOCUMENTALI ── */}
        <div className="bg-[#0f2035] border border-white/5 rounded-xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.2)] flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-[#ddeeff] flex items-center gap-2">
              <AlertTriangle size={15} className="text-[#E24B4A]" /> Pendenze Documentali
            </h3>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-bold',
                pendenze.length > 0 ? 'text-[#f09595] bg-[#E24B4A]/10' : 'text-[#5DCAA5] bg-[#1D9E75]/10'
              )}>
                {pendenze.length} {pendenze.length === 1 ? 'pratica' : 'pratiche'}
              </span>
              {pendenze.length > 0 && (
                <>
                  <button
                    onClick={handleExportPendenzeExcel}
                    className="text-[9px] px-2 py-1 rounded-lg border border-[#1D9E75]/30 text-[#5DCAA5] bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 transition-all flex items-center gap-1"
                  >
                    <Download size={9} /> Excel
                  </button>
                  <button
                    onClick={handleExportPendenzePDF}
                    className="text-[9px] px-2 py-1 rounded-lg border border-[#534AB7]/30 text-[#a89ef8] bg-[#534AB7]/10 hover:bg-[#534AB7]/20 transition-all flex items-center gap-1"
                  >
                    <Download size={9} /> PDF
                  </button>
                  <button
                    onClick={() => setShowPendenzeModal(true)}
                    className="text-[9px] px-2 py-1 rounded-lg border border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1"
                  >
                    <ArrowUpRight size={10} /> Vedi tutti
                  </button>
                </>
              )}
            </div>
          </div>

          {pendenze.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 size={28} className="text-[#1D9E75] mb-2 opacity-60" />
              <div className="text-xs text-[#2a4a6a]">Nessuna pendenza documentale</div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[280px] custom-scrollbar">
              {pendenze.slice(0, 8).map((p, idx) => (
                <div
                  key={p.id}
                  className={cn('flex items-center justify-between py-2 px-1.5 rounded-lg transition-colors group', idx < pendenze.length - 1 && idx < 7 ? 'border-b border-white/5' : '')}
                >
                  <div
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:bg-white/[0.03] py-0.5 rounded"
                    onClick={() => setSelectedPendenza(p)}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 bg-[#E24B4A] shadow-[0_0_6px_#E24B4A]" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#c8ddf0] truncate max-w-[160px] group-hover:text-[#ddeeff] transition-colors">
                        {p.appaltatore || p.app}
                      </div>
                      <div className="text-[10px] text-[#4a6a8a] truncate max-w-[160px]">
                        {p._criticiCount} doc. critico/i
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleSollecitaPendenza(p)}
                      className="text-[9px] font-bold px-2 py-1 rounded-lg border border-[#0078D4]/30 text-[#378ADD] bg-[#0078D4]/10 hover:bg-[#0078D4]/20 transition-all flex items-center gap-1 whitespace-nowrap"
                    >
                      <Send size={9} /> Sollecita
                    </button>
                    <button
                      onClick={() => { navigate('/storico', { state: { praticaId: p.id } }); }}
                      className="text-[9px] font-bold px-2 py-1 rounded-lg border border-[#534AB7]/30 text-[#a89ef8] bg-[#534AB7]/10 hover:bg-[#534AB7]/20 transition-all whitespace-nowrap"
                    >
                      → Gestisci
                    </button>
                  </div>
                </div>
              ))}
              {pendenze.length > 8 && (
                <button onClick={() => setShowPendenzeModal(true)} className="w-full text-center text-[10px] text-[#534AB7] hover:text-[#a89ef8] transition-colors font-medium py-2">
                  + {pendenze.length - 8} altre pratiche
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#0f2035] border border-white/5 rounded-xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-[#ddeeff] flex items-center gap-2">
              <Zap size={15} className="text-[#F5A800]" /> Soglie Contratti
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#F5A800] bg-[#F5A800]/10 px-2 py-0.5 rounded-full font-bold">{predictiveAlerts.length} in allerta</span>
              <button
                onClick={() => handleExportPDF('Report Soglie Contratti', predictiveAlerts)}
                className="text-[9px] px-2 py-1 rounded-lg border border-[#F5A800]/30 text-[#F5A800] bg-[#F5A800]/10 hover:bg-[#F5A800]/20 transition-all flex items-center gap-1"
              >
                <Download size={9} /> PDF
              </button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar">
            {predictiveAlerts.length > 0 ? predictiveAlerts.map(a => (
              <div key={a.id} className="flex items-center gap-3 py-2 px-2.5 rounded-lg border border-white/5 hover:bg-[#534AB7]/10 transition-all cursor-pointer group" onClick={() => setSelectedSoglia(a)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-bold text-[#a89ef8] font-mono shrink-0">{a.idSap || a.id}</span>
                    <span className={cn("text-[9px] font-bold ml-auto shrink-0", a.pct >= 80 ? "text-[#E24B4A]" : a.pct >= 60 ? "text-[#F5A800]" : "text-[#1D9E75]")}>
                      {a.pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[10px] font-medium text-[#7a9ab8] group-hover:text-[#ddeeff] transition-colors truncate mb-1">{a.app || a.appaltatore}</div>
                  <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", a.pct >= 80 ? "bg-[#E24B4A]" : a.pct >= 60 ? "bg-[#F5A800]" : "bg-[#1D9E75]")} style={{ width: `${Math.min(a.pct, 100)}%` }} />
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-xs text-[#3a5a7a] italic">Nessuna soglia superata</div>
            )}
          </div>
        </div>
      </div>

      </div>{/* end flex wrapper ROW A + ROW B */}

      {/* DETAIL PANEL (Removed from here) */}

      {/* ═══════════════════ WORKLIST SUBAFFIDAMENTI ═══════════════════ */}
      <div ref={worklistRef} className="mx-6 mb-6 bg-[#0d1f36] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-[#ddeeff] flex items-center gap-2">
              <LayoutGrid size={15} className="text-[#378ADD]" />
              {worklistStato ? worklistStato :
               worklistTab === 'Archivio' ? 'Archivio' :
               worklistTipo === 'Subappalto' ? 'Subappalti' :
               worklistTipo === 'Subcontratto' ? 'Subcontratti' :
               worklistTab !== 'Tutti' ? worklistTab :
               'Tutti i Subaffidamenti'}
            </h3>
            <span className="text-[10px] font-bold text-[#a89ef8] bg-[#534AB7]/15 border border-[#534AB7]/25 px-2.5 py-0.5 rounded-full">
              {worklistData.length} risultati
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Appaltatore */}
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#3a5a7a]" />
              <input value={worklistAppSearch} onChange={e => setWorklistAppSearch(e.target.value)}
                placeholder="Appaltatore..." className="pl-6 pr-3 h-7 text-[10px] bg-white/5 border border-white/10 rounded-lg text-[#c8ddf0] placeholder-[#2a4a6a] focus:outline-none focus:border-[#534AB7]/50 w-36" />
            </div>
            {/* Search ID */}
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#3a5a7a]" />
              <input value={worklistIdSearch} onChange={e => setWorklistIdSearch(e.target.value)}
                placeholder="ID contratto..." className="pl-6 pr-3 h-7 text-[10px] bg-white/5 border border-white/10 rounded-lg text-[#c8ddf0] placeholder-[#2a4a6a] focus:outline-none focus:border-[#534AB7]/50 w-32" />
            </div>
            {/* Tipo dropdown */}
            <select value={worklistTipo} onChange={e => setWorklistTipo(e.target.value)}
              className="h-7 px-2.5 text-[10px] bg-[#0d1f36] border border-white/10 rounded-lg text-[#8ab0c8] focus:outline-none focus:border-[#534AB7]/50">
              <option value="">Tutti i tipi</option>
              <option value="Subappalto">Subappalto</option>
              <option value="Subcontratto">Subcontratto</option>
            </select>
            {/* Stato dropdown */}
            <select value={worklistStato} onChange={e => setWorklistStato(e.target.value)}
              className="h-7 px-2.5 text-[10px] bg-[#0d1f36] border border-white/10 rounded-lg text-[#8ab0c8] focus:outline-none focus:border-[#534AB7]/50">
              <option value="">Tutti gli stati</option>
              {['Inviata','Autorizzata','In Attesa SAP','Da Autorizzare','Attivata','In Modifica','Richiesta Informazioni','Rigettata','Scaduta','Chiusa','Annullata'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {/* Reset */}
            <button onClick={() => { setWorklistAppSearch(''); setWorklistIdSearch(''); setWorklistTipo(''); setWorklistStato(''); setWorklistTab('Tutti'); }}
              className="h-7 px-2.5 text-[9px] rounded-lg border border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1.5">
              <RotateCcw size={10} /> Reset
            </button>
            {/* Excel */}
            <button onClick={() => handleExportExcel(worklistData)}
              className="h-7 px-2.5 text-[9px] rounded-lg border border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1.5">
              <FileSpreadsheet size={10} /> Excel
            </button>
            {/* PDF */}
            <button onClick={() => handleExportPDF(worklistStato || (worklistTab !== 'Tutti' ? worklistTab : worklistTipo || 'Tutti i Subaffidamenti'), worklistData)}
              className="h-7 px-2.5 text-[9px] rounded-lg border border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1.5">
              <Download size={10} /> PDF
            </button>
            {/* Genera report bulk */}
            <button
              onClick={() => handleGeneraReportBulk(
                worklistStato || (worklistTab !== 'Tutti' ? worklistTab : worklistTipo || 'Tutti i Subaffidamenti'),
                worklistData
              )}
              className="h-7 px-3 text-[9px] font-bold rounded-lg border border-[#1D9E75]/40 text-[#5DCAA5] bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 transition-all flex items-center gap-1.5"
            >
              <Download size={10} /> Genera report
            </button>
            {/* Timeline toggle */}
            <button onClick={() => setShowGantt(!showGantt)}
              className={cn('h-7 px-2.5 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5',
                showGantt
                  ? 'bg-[#534AB7]/30 border-[#534AB7]/50 text-[#a89ef8]'
                  : 'border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10')}>
              <GanttChartSquare size={10} /> Timeline
            </button>
            {/* Archivio toggle */}
            <button onClick={() => setWorklistTab(worklistTab === 'Archivio' ? 'Tutti' : 'Archivio')}
              className={cn('h-7 px-3 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5',
                worklistTab === 'Archivio'
                  ? 'bg-[#F5A800]/15 border-[#F5A800]/30 text-[#F5A800]'
                  : 'border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10')}>
              <Archive size={10} /> Archivio
            </button>
            {/* Density */}
            <div className="flex items-center gap-0.5 ml-1">
              {(['compact','normal','large'] as const).map(d => (
                <button key={d} onClick={() => setWorklistDensity(d)}
                  className={cn('w-6 h-6 rounded text-[9px] font-bold border transition-all',
                    worklistDensity === d ? 'bg-[#534AB7]/30 border-[#534AB7]/50 text-[#a89ef8]' : 'border-white/10 text-[#3a5a7a] bg-transparent hover:bg-white/5')}>
                  C
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 overflow-x-auto">
          {(['Tutti','Autorizzate','Inviate','Scadute','Richiesta info','Attivate'] as const).map(tab => (
            <button key={tab} onClick={() => setWorklistTab(tab)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition-all border',
                worklistTab === tab
                  ? 'bg-[#534AB7]/20 border-[#534AB7]/40 text-[#a89ef8]'
                  : 'border-transparent text-[#3a5a7a] hover:text-[#8ab0c8] hover:bg-white/5')}>
              {tab}
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-mono',
                worklistTab === tab ? 'bg-[#534AB7]/30 text-[#a89ef8]' : 'bg-white/5 text-[#2a4a6a]')}>
                {worklistCounts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Gantt Timeline View */}
        {showGantt && (
          <div className="p-5 border-b border-white/5">
            <div className="overflow-x-auto custom-scrollbar pb-3">
              <div className="min-w-[900px] space-y-3" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <div className="grid grid-cols-[220px_1fr] border-b border-white/5 pb-2">
                  <div className="text-[9px] text-[#2a4a6a] font-bold uppercase tracking-wider">Appaltatore / Subfornitore</div>
                  <div className="grid grid-cols-12 gap-0">
                    {['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'].map(m => (
                      <div key={m} className="text-center text-[8px] text-[#2a4a6a] font-bold uppercase border-l border-white/5">{m}</div>
                    ))}
                  </div>
                </div>
                {worklistData.map((d, i) => {
                  const iniDate = d.dataInizio || d.inizio || d.dataInizioContratto;
                  const endDate = d.scadenza || d.dataFine || d.dataFineContratto;
                  const startMonth = iniDate && isValidDate(iniDate) ? new Date(iniDate).getMonth() : 0;
                  const endMonth   = endDate && isValidDate(endDate) ? new Date(endDate).getMonth() : 11;
                  const left = startMonth / 12;
                  const width = Math.max(1 / 12, (endMonth - startMonth + 1) / 12);
                  const barColor = d.tipo === 'Subappalto' ? '#534AB7' : '#1D9E75';
                  return (
                    <div key={d.id || i} className="grid grid-cols-[220px_1fr] items-center group hover:bg-white/[0.02] transition-colors py-1">
                      <div className="pr-3 truncate">
                        <div className="text-[10px] font-bold text-[#c8ddf0] truncate">{d.appaltatore || d.app}</div>
                        <div className="text-[8px] text-[#3a5a7a] truncate">{d.subfornitore || d.sub || '—'}</div>
                      </div>
                      <div className="h-6 relative bg-white/[0.02] rounded">
                        {Array.from({length:12}).map((_,idx) => (
                          <div key={idx} className="absolute top-0 bottom-0 border-l border-white/5" style={{left:`${(idx/12)*100}%`}} />
                        ))}
                        <div
                          className="absolute top-1 bottom-1 rounded cursor-pointer hover:brightness-125 transition-all"
                          style={{ left:`${left*100}%`, width:`${width*100}%`, background: barColor, opacity: 0.75 }}
                          title={`${safeFormat(iniDate,'dd/MM/yyyy')} → ${safeFormat(endDate,'dd/MM/yyyy')}`}
                          onClick={() => handleRowClick(d)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-[8px] text-[#3a5a7a] font-bold uppercase"><span className="w-3 h-3 rounded bg-[#534AB7]/70" /> Subappalto</span>
              <span className="flex items-center gap-1.5 text-[8px] text-[#3a5a7a] font-bold uppercase"><span className="w-3 h-3 rounded bg-[#1D9E75]/70" /> Subcontratto</span>
              <span className="text-[8px] text-[#2a4a6a] italic ml-auto">{worklistData.length} pratiche · scroll per vedere tutte</span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/8">
                {([
                  { key: 'id',       label: 'ID' },
                  { key: 'app',      label: 'Appaltatore' },
                  { key: 'sub',      label: 'Subfornitore' },
                  { key: 'tipo',     label: 'Tipo' },
                  { key: 'stato',    label: 'Stato' },
                  { key: 'scadenza', label: 'Scadenza' },
                ] as const).map(col => (
                  <th key={col.key}
                    onClick={() => { setSortCol(col.key); setSortDir(d => sortCol === col.key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); }}
                    className="py-2.5 px-3 text-[9px] text-[#2a4a6a] uppercase tracking-wider font-bold cursor-pointer hover:text-[#6a8aaa] transition-colors select-none">
                    <span className="flex items-center gap-1">
                      {col.label}
                      <span className="text-[8px]">{sortCol === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                    </span>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-[9px] text-[#2a4a6a] uppercase tracking-wider font-bold">Valore</th>
                <th className="py-2.5 px-3 text-[9px] text-[#2a4a6a] uppercase tracking-wider font-bold">Soglia</th>
                <th className="py-2.5 px-3 text-[9px] text-[#2a4a6a] uppercase tracking-wider font-bold">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {worklistData.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-[#2a4a6a] text-xs italic">Nessun risultato</td></tr>
              ) : (() => {
                const pageSize = worklistDensity === 'compact' ? 20 : worklistDensity === 'normal' ? 10 : 6;
                let sorted = [...worklistData];
                if (sortCol) {
                  sorted.sort((a: any, b: any) => {
                    const va = sortCol === 'id' ? a.id : sortCol === 'app' ? (a.appaltatore||a.app||'') : sortCol === 'sub' ? (a.subfornitore||a.sub||'') : sortCol === 'tipo' ? (a.tipo||'') : sortCol === 'stato' ? (a.stato||'') : (a.scadenza||'');
                    const vb = sortCol === 'id' ? b.id : sortCol === 'app' ? (b.appaltatore||b.app||'') : sortCol === 'sub' ? (b.subfornitore||b.sub||'') : sortCol === 'tipo' ? (b.tipo||'') : sortCol === 'stato' ? (b.stato||'') : (b.scadenza||'');
                    const cmp = String(va||'').localeCompare(String(vb||''), 'it', { numeric: true });
                    return sortDir === 'asc' ? cmp : -cmp;
                  });
                }
                return sorted.slice(0, pageSize).map((d, i) => {
                const diff = d.scadenza && isValidDate(d.scadenza) ? safeDiff(d.scadenza, today) : null;
                const rowPy = worklistDensity === 'compact' ? 'py-2' : worklistDensity === 'large' ? 'py-4' : 'py-3';
                return (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition-colors group">
                    <td className={cn(rowPy, "px-3 text-[11px] font-bold text-[#a89ef8] font-mono whitespace-nowrap")}>{d.id}</td>
                    <td className={cn(rowPy, "px-3 text-xs text-[#c8ddf0] font-medium max-w-[180px] truncate")}>{d.appaltatore || d.app}</td>
                    <td className={cn(rowPy, "px-3 text-xs text-[#8ab0c8] max-w-[160px] truncate")}>{d.subfornitore || d.sub || '—'}</td>
                    <td className={cn(rowPy, "px-3")}>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-[#8ab0c8] whitespace-nowrap">{d.tipo}</span>
                    </td>
                    <td className={cn(rowPy, "px-3")}>
                      <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap',
                        STATO_CLS[d.stato] ? STATO_CLS[d.stato] + ' border-transparent' : 'bg-white/5 text-[#5a7a9a] border-white/10')}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'currentColor' }} />
                        {d.stato.replace('Richiesta Informazioni', 'Rich. Info')}
                      </span>
                    </td>
                    <td className={cn(rowPy, "px-3 text-[11px] text-[#5a7a9a] font-mono whitespace-nowrap")}>
                      {safeFormat(d.scadenza, 'dd/MM/yyyy')}
                      {diff !== null && (
                        <div className={cn('text-[9px] font-bold mt-0.5',
                          diff < 0 ? 'text-[#f09595]' : diff <= 30 ? 'text-[#F5A800]' : 'text-[#3a5a7a]')}>
                          {diff >= 0 ? '+' : ''}{diff}gg
                        </div>
                      )}
                    </td>
                    <td className={cn(rowPy, "px-3 text-[11px] font-bold text-[#c8ddf0] whitespace-nowrap")}>
                      {(() => {
                        const v = parseEuro(d.importoEur || d.importoRichiestoEuro);
                        if (!v) return <span className="text-[#3a5a7a]">—</span>;
                        return <span>€ {v.toLocaleString('it-IT')}</span>;
                      })()}
                    </td>
                    <td className={cn(rowPy, "px-3 min-w-[100px]")}>
                      {(() => {
                        const key = (d.appaltatore || d.app || '').trim();
                        const agg = appaltatoreAgg.get(key);
                        if (!agg || !agg.maxSub) return <span className="text-[#3a5a7a] text-[10px]">—</span>;
                        const pct = Math.min(100, Math.round((agg.totalCommitted / agg.maxSub) * 100));
                        const barColor = pct >= 70 ? '#E24B4A' : pct >= 40 ? '#F5A800' : '#1D9E75';
                        return (
                          <div className="relative group flex items-center gap-2 cursor-default">
                            <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                            </div>
                            <span className="text-[10px] font-bold shrink-0" style={{ color: barColor }}>{pct}%</span>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 pointer-events-none">
                              <div className="bg-[#0d1f36] border border-white/15 rounded-lg px-3 py-2 shadow-xl text-[10px] whitespace-nowrap">
                                <div className="text-[#8ab0c8]">Impegnato: <span className="text-[#c8ddf0] font-bold">€ {agg.totalCommitted.toLocaleString('it-IT')}</span></div>
                                <div className="text-[#8ab0c8]">Massimo: <span className="text-[#c8ddf0] font-bold">€ {agg.maxSub.toLocaleString('it-IT')}</span></div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className={cn(rowPy, "px-3")}>
                      <div className="flex items-center gap-1">
                        {/* Eye — dettaglio */}
                        <button onClick={() => handleRowClick(d)} title="Visualizza dettaglio"
                          className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-[#4a6a8a] hover:bg-[#534AB7]/20 hover:text-[#a89ef8] hover:border-[#534AB7]/30 transition-all flex items-center justify-center">
                          <Eye size={11} />
                        </button>
                        {/* Pencil — quick edit stato */}
                        <button onClick={() => setQuickEdit(quickEdit?.id === d.id ? null : { id: d.id, stato: d.stato })} title="Modifica stato"
                          className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-[#4a6a8a] hover:bg-[#1D9E75]/20 hover:text-[#5DCAA5] hover:border-[#1D9E75]/30 transition-all flex items-center justify-center">
                          <Edit2 size={11} />
                        </button>
                        {/* 3 punti — azioni rapide */}
                        <div className="relative">
                          <button onClick={() => setWorklistDots(worklistDots === d.id ? null : d.id)} title="Altre azioni"
                            className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-[#4a6a8a] hover:bg-white/10 transition-all flex items-center justify-center">
                            <span className="text-[11px] font-bold leading-none tracking-tight">···</span>
                          </button>
                          {worklistDots === d.id && (
                            <div className="absolute right-0 top-7 z-50 bg-[#0d1f36] border border-white/15 rounded-xl shadow-2xl w-44 py-1 overflow-hidden">
                              <button onClick={() => { navigate('/storico', { state: { praticaId: d.id } }); setWorklistDots(null); }}
                                className="w-full px-3 py-2.5 text-[10px] text-left text-[#a89ef8] hover:bg-[#534AB7]/15 flex items-center gap-2 border-b border-white/5">
                                <Bell size={11} /> Vai a Solleciti
                              </button>
                              <button onClick={() => {
                                const app = d.appaltatore || d.app || '';
                                const sap = d.idSapContratto || d.idSap || d.id;
                                const cc = 'rosalinda.difiore@ren.eniplenitude.com,federica.damato@ren.eniplenitude.com,antoninoangelo.polito@ren.eniplenitude.com';
                                const subj = encodeURIComponent(`Pratica ${sap} — ${app}`);
                                const body = encodeURIComponent(`Gentile ${app},\n\nfacciamo seguito alla pratica di subaffidamento n. ${sap}.\n\nCordiali saluti,\nPietro De Vito\nPSER — Gestione Subaffidamenti`);
                                window.open(`https://outlook.office.com/mail/deeplink/compose?cc=${encodeURIComponent(cc)}&subject=${subj}&body=${body}`, '_blank');
                                setWorklistDots(null);
                              }} className="w-full px-3 py-2.5 text-[10px] text-left text-[#378ADD] hover:bg-[#378ADD]/10 flex items-center gap-2 border-b border-white/5">
                                <Mail size={11} /> Outlook
                              </button>
                              <button onClick={() => { handleSetRI(d.id); setWorklistDots(null); }}
                                className="w-full px-3 py-2.5 text-[10px] text-left text-[#F5A800] hover:bg-[#F5A800]/10 flex items-center gap-2">
                                <Info size={11} /> → Richiesta Info
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Quick edit stato inline */}
                      {quickEdit?.id === d.id && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <select value={quickEdit.stato}
                            onChange={e => setQuickEdit(q => q ? { ...q, stato: e.target.value } : q)}
                            className="h-6 text-[9px] bg-[#0b1a2e] border border-[#534AB7]/40 rounded-lg text-[#c8ddf0] px-1.5 outline-none flex-1 min-w-0">
                            {['Inviata','Autorizzata','In Attesa SAP','Da Autorizzare','Attivata','In Modifica','Richiesta Informazioni','Rigettata','Scaduta','Chiusa','Annullata'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <button onClick={() => {
                            setSubaffidamenti(prev => prev.map(s => s.id === quickEdit.id ? { ...s, stato: quickEdit.stato } : s));
                            addActivity('update', 'Dashboard', `Stato aggiornato: ${quickEdit.stato}`, `Pratica ${quickEdit.id}`);
                            setQuickEdit(null);
                          }} className="h-6 px-1.5 rounded-md bg-[#1D9E75]/20 border border-[#1D9E75]/40 text-[#5DCAA5] text-[9px] font-bold hover:bg-[#1D9E75]/30 transition-all shrink-0">
                            ✓
                          </button>
                          <button onClick={() => setQuickEdit(null)} className="h-6 px-1.5 rounded-md bg-white/5 border border-white/10 text-[#4a6a8a] text-[9px] hover:bg-white/10 transition-all shrink-0">
                            ✕
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              });
              })()}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {worklistData.length > (worklistDensity === 'compact' ? 20 : worklistDensity === 'normal' ? 10 : 6) && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-[#2a4a6a]">
              Mostrando {worklistDensity === 'compact' ? 20 : worklistDensity === 'normal' ? 10 : 6} di {worklistData.length} pratiche
            </span>
            <button onClick={() => setShowTableModal(true)}
              className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1.5">
              <ChevronRight size={12} /> Vedi tutte ({worklistData.length})
            </button>
          </div>
        )}
      </div>

      {/* FLOATING BUTTONS */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-3 z-[400]">
        <motion.button 
          whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(55,138,221,0.4)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCalendarModal(true)}
          className="w-14 h-14 rounded-full bg-[#0f2035] border border-[#378ADD]/40 flex items-center justify-center text-2xl shadow-2xl transition-all"
        >
          📅
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1, boxShadow: '0 0 25px rgba(83,74,183,0.5)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAIChat(!showAIChat)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[#534AB7] to-[#378ADD] flex items-center justify-center text-3xl shadow-2xl transition-all"
        >
          🤖
        </motion.button>
      </div>

      {/* AI CHAT */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 bg-[#0e1c33] border border-[#534AB7]/35 rounded-2xl overflow-hidden shadow-2xl z-[401] flex flex-col"
          >
            <div className="p-4 bg-[#111f38] border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#534AB7] to-[#378ADD] flex items-center justify-center text-white">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#ddeeff]">Assistente PSER</div>
                  <div className="text-[8px] text-[#5DCAA5] font-bold uppercase tracking-widest">Online</div>
                </div>
              </div>
              <button onClick={() => setShowAIChat(false)} className="text-[#6a8aaa] hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="h-64 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0b1525]/50">
              {aiMessages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] p-3 text-xs leading-relaxed",
                    m.role === 'user' 
                      ? "bg-[#534AB7]/25 text-[#c8ddf0] rounded-2xl rounded-tr-none" 
                      : "bg-[#162840] text-[#a0b8d0] rounded-2xl rounded-tl-none border border-white/5"
                  )}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#162840] text-[#a0b8d0] rounded-2xl rounded-tl-none border border-white/5 p-3 text-xs flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#534AB7] rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-[#534AB7] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-[#534AB7] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-white/5 bg-[#0b1525]">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isAiLoading && sendAI()}
                  placeholder="Scrivi una domanda..."
                  disabled={isAiLoading}
                  className="flex-1 h-9 bg-black/20 border border-white/10 rounded-xl px-3 text-xs text-[#c8ddf0] outline-none focus:border-[#534AB7]/50 disabled:opacity-50"
                />
                <button 
                  onClick={() => sendAI()}
                  disabled={isAiLoading}
                  className="w-9 h-9 bg-[#534AB7] text-white rounded-xl flex items-center justify-center hover:bg-[#6358cc] transition-all disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {['Analisi criticità', 'Prossime scadenze', 'Riepilogo pratiche', 'Consigliami azioni'].map(q => (
                  <button 
                    key={q}
                    onClick={() => sendAI(q)}
                    disabled={isAiLoading}
                    className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] text-[#5a7a9a] hover:bg-white/10 hover:text-[#8ab0c8] transition-all disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL TABELLA COMPLETA */}
      <AnimatePresence>
        {showTableModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-6"
            onClick={e => e.target === e.currentTarget && setShowTableModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="bg-[#0f2035] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0d1f36]">
                <div className="flex items-center gap-3">
                  <LayoutGrid size={16} className="text-[#378ADD]" />
                  <span className="text-sm font-bold text-[#ddeeff]">
                    {worklistStato || (worklistTab !== 'Tutti' ? worklistTab : worklistTipo || 'Tutti i Subaffidamenti')}
                  </span>
                  <span className="text-[10px] font-bold text-[#a89ef8] bg-[#534AB7]/15 border border-[#534AB7]/25 px-2.5 py-1 rounded-full">
                    {worklistData.length} pratiche
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleExportPDF(worklistStato || (worklistTab !== 'Tutti' ? worklistTab : worklistTipo || 'Tutti i Subaffidamenti'), worklistData)}
                    className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1.5">
                    <Download size={12} /> PDF
                  </button>
                  <button onClick={() => handleExportExcel(worklistData)}
                    className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1.5">
                    <FileSpreadsheet size={12} /> Excel
                  </button>
                  <button onClick={() => setShowTableModal(false)} className="ml-1 text-[#3a5a7a] hover:text-[#a0b8d0] transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              {/* table */}
              <div className="overflow-y-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/8 sticky top-0 bg-[#0d1f36] z-10">
                      {([
                        { key: 'id',       label: 'ID' },
                        { key: 'app',      label: 'Appaltatore' },
                        { key: 'sub',      label: 'Subfornitore' },
                        { key: 'tipo',     label: 'Tipo' },
                        { key: 'stato',    label: 'Stato' },
                        { key: 'scadenza', label: 'Scadenza' },
                      ] as const).map(col => (
                        <th key={col.key}
                          onClick={() => { setSortCol(col.key); setSortDir(d => sortCol === col.key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); }}
                          className="py-3 px-4 text-[9px] text-[#2a4a6a] uppercase tracking-wider font-bold cursor-pointer hover:text-[#6a8aaa] transition-colors select-none"
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            <span className="text-[8px]">{sortCol === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                          </span>
                        </th>
                      ))}
                      <th className="py-3 px-4 text-[9px] text-[#2a4a6a] uppercase tracking-wider font-bold">Valore</th>
                      <th className="py-3 px-4 text-[9px] text-[#2a4a6a] uppercase tracking-wider font-bold">Soglia</th>
                      <th className="py-3 px-4 text-[9px] text-[#2a4a6a] uppercase tracking-wider font-bold">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let sorted = [...worklistData];
                      if (sortCol) {
                        sorted.sort((a: any, b: any) => {
                          const va = sortCol === 'id' ? a.id : sortCol === 'app' ? (a.appaltatore||a.app||'') : sortCol === 'sub' ? (a.subfornitore||a.sub||'') : sortCol === 'tipo' ? (a.tipo||'') : sortCol === 'stato' ? (a.stato||'') : (a.scadenza||'');
                          const vb = sortCol === 'id' ? b.id : sortCol === 'app' ? (b.appaltatore||b.app||'') : sortCol === 'sub' ? (b.subfornitore||b.sub||'') : sortCol === 'tipo' ? (b.tipo||'') : sortCol === 'stato' ? (b.stato||'') : (b.scadenza||'');
                          const cmp = String(va||'').localeCompare(String(vb||''), 'it', { numeric: true });
                          return sortDir === 'asc' ? cmp : -cmp;
                        });
                      }
                      return sorted.map((d: any, i: number) => {
                        const diff = d.scadenza && isValidDate(d.scadenza) ? safeDiff(d.scadenza, today) : null;
                        const statoCls = STATO_CLS[d.stato] ? STATO_CLS[d.stato] + ' border-transparent' : 'bg-white/5 text-[#5a7a9a] border-white/10';
                        return (
                          <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition-colors group">
                            <td className="py-3 px-4 text-xs font-bold text-[#a89ef8] font-mono">{d.id}</td>
                            <td className="py-3 px-4 text-xs text-[#c8ddf0] font-medium max-w-[180px] truncate">{d.appaltatore || d.app}</td>
                            <td className="py-3 px-4 text-xs text-[#8ab0c8] max-w-[160px] truncate">{d.subfornitore || d.sub || '—'}</td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/8 border border-white/10 text-[#8ab0c8]">{d.tipo}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border', statoCls)}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'currentColor' }} />
                                {d.stato?.replace('Richiesta Informazioni', 'Rich. Info') || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[11px] text-[#5a7a9a] font-mono whitespace-nowrap">
                              {safeFormat(d.scadenza, 'dd/MM/yyyy')}
                              {diff !== null && (
                                <div className={cn('text-[9px] font-bold mt-0.5', diff < 0 ? 'text-[#f09595]' : diff <= 30 ? 'text-[#F5A800]' : 'text-[#3a5a7a]')}>
                                  {diff >= 0 ? '+' : ''}{diff}gg
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-[11px] font-bold text-[#c8ddf0] whitespace-nowrap">
                              {(() => { const v = parseEuro(d.importoEur || d.importoRichiestoEuro); return v ? <span>€ {v.toLocaleString('it-IT')}</span> : <span className="text-[#3a5a7a]">—</span>; })()}
                            </td>
                            <td className="py-3 px-4 min-w-[100px]">
                              {(() => {
                                const key = (d.appaltatore || d.app || '').trim();
                                const agg = appaltatoreAgg.get(key);
                                if (!agg || !agg.maxSub) return <span className="text-[#3a5a7a] text-[10px]">—</span>;
                                const pct = Math.min(100, Math.round((agg.totalCommitted / agg.maxSub) * 100));
                                const barColor = pct >= 70 ? '#E24B4A' : pct >= 40 ? '#F5A800' : '#1D9E75';
                                return (
                                  <div className="relative group flex items-center gap-2 cursor-default">
                                    <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                                    </div>
                                    <span className="text-[10px] font-bold shrink-0" style={{ color: barColor }}>{pct}%</span>
                                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                      <div className="bg-[#0d1f36] border border-white/15 rounded-lg px-3 py-2 shadow-xl text-[10px] whitespace-nowrap">
                                        <div className="text-[#8ab0c8]">Impegnato: <span className="text-[#c8ddf0] font-bold">€ {agg.totalCommitted.toLocaleString('it-IT')}</span></div>
                                        <div className="text-[#8ab0c8]">Massimo: <span className="text-[#c8ddf0] font-bold">€ {agg.maxSub.toLocaleString('it-IT')}</span></div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <button onClick={() => { handleRowClick(d); setShowTableModal(false); }} title="Visualizza dettaglio"
                                  className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-[#4a6a8a] hover:bg-[#534AB7]/20 hover:text-[#a89ef8] hover:border-[#534AB7]/30 transition-all flex items-center justify-center">
                                  <Eye size={11} />
                                </button>
                                <button onClick={() => setQuickEdit(quickEdit?.id === d.id ? null : { id: d.id, stato: d.stato })} title="Modifica stato"
                                  className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-[#4a6a8a] hover:bg-[#1D9E75]/20 hover:text-[#5DCAA5] hover:border-[#1D9E75]/30 transition-all flex items-center justify-center">
                                  <Edit2 size={11} />
                                </button>
                                <button onClick={() => { navigate('/storico', { state: { praticaId: d.id } }); setShowTableModal(false); }} title="Vai a Solleciti"
                                  className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-[#4a6a8a] hover:bg-[#F5A800]/20 hover:text-[#F5A800] hover:border-[#F5A800]/30 transition-all flex items-center justify-center">
                                  <Bell size={11} />
                                </button>
                              </div>
                              {quickEdit?.id === d.id && (
                                <div className="mt-1.5 flex items-center gap-1">
                                  <select value={quickEdit.stato} onChange={e => setQuickEdit(q => q ? { ...q, stato: e.target.value } : q)}
                                    className="h-6 text-[9px] bg-[#0b1a2e] border border-[#534AB7]/40 rounded-lg text-[#c8ddf0] px-1.5 outline-none flex-1 min-w-0">
                                    {['Inviata','Autorizzata','In Attesa SAP','Da Autorizzare','Attivata','In Modifica','Richiesta Informazioni','Rigettata','Scaduta','Chiusa','Annullata'].map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => { setSubaffidamenti(prev => prev.map(s => s.id === quickEdit.id ? { ...s, stato: quickEdit.stato } : s)); addActivity('update', 'Dashboard', `Stato: ${quickEdit.stato}`, `Pratica ${quickEdit.id}`); setQuickEdit(null); }}
                                    className="h-6 px-1.5 rounded-md bg-[#1D9E75]/20 border border-[#1D9E75]/40 text-[#5DCAA5] text-[9px] font-bold hover:bg-[#1D9E75]/30 transition-all">✓</button>
                                  <button onClick={() => setQuickEdit(null)} className="h-6 px-1.5 rounded-md bg-white/5 border border-white/10 text-[#4a6a8a] text-[9px] hover:bg-white/10 transition-all">✕</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PENDENZE DOCUMENTALI */}
      <AnimatePresence>
        {showPendenzeModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-6"
            onClick={e => e.target === e.currentTarget && setShowPendenzeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[#0f2035] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0d1f36]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E24B4A]/15 flex items-center justify-center text-[#f09595]">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#ddeeff]">Pendenze Documentali</h2>
                    <p className="text-[10px] text-[#3a5a7a]">{pendenze.length} pratiche con allegati scaduti</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleExportPendenzeExcel} className="h-8 px-3 bg-[#1D9E75]/12 border border-[#1D9E75]/30 rounded-lg text-[11px] font-bold text-[#5DCAA5] hover:bg-[#1D9E75]/25 transition-all flex items-center gap-1.5">
                    <Download size={12} /> Excel
                  </button>
                  <button onClick={handleExportPendenzePDF} className="h-8 px-3 bg-[#534AB7]/12 border border-[#534AB7]/30 rounded-lg text-[11px] font-bold text-[#a89ef8] hover:bg-[#534AB7]/25 transition-all flex items-center gap-1.5">
                    <Download size={12} /> PDF
                  </button>
                  <button onClick={() => setShowPendenzeModal(false)} className="text-[#3a5a7a] hover:text-[#a0b8d0] transition-colors ml-1">
                    <X size={20} />
                  </button>
                </div>
              </div>
              {/* table */}
              <div className="overflow-y-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] text-[#2a4a6a] uppercase tracking-wider sticky top-0 bg-[#0d1f36] border-b border-white/8">
                      {['ID Pratica', 'Appaltatore', 'Subfornitore', 'SAP Contratto', 'Stato', 'Documenti Critici', 'Azioni'].map(h => (
                        <th key={h} className="py-3 px-4 font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendenze.map((p) => {
                      const statoColor =
                        p.stato === 'Richiesta Informazioni' ? '#F5A800' :
                        p.stato === 'Autorizzata' ? '#1D9E75' :
                        p.stato === 'Attivata' ? '#378ADD' :
                        p.stato === 'In Modifica' ? '#a89ef8' : '#6a8aaa';
                      return (
                        <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-xs font-bold text-[#a89ef8] font-mono">{p.id}</td>
                          <td className="py-3 px-4 text-xs text-[#c8ddf0] font-medium max-w-[160px] truncate">{p.appaltatore || p.app}</td>
                          <td className="py-3 px-4 text-xs text-[#6a8aaa] max-w-[140px] truncate">{p.subfornitore || p.sub || '—'}</td>
                          <td className="py-3 px-4 text-[11px] text-[#5a7a9a] font-mono">{p.idSapContratto || p.idSap || '—'}</td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border" style={{ color: statoColor, borderColor: `${statoColor}40`, backgroundColor: `${statoColor}15` }}>
                              {p.stato}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {p._criticiCount > 0 ? (
                              <div>
                                <span className="text-[10px] font-bold text-[#f09595] bg-[#E24B4A]/10 px-2 py-0.5 rounded-full border border-[#E24B4A]/25">
                                  {p._criticiCount} critico/i
                                </span>
                                <div className="text-[9px] text-[#4a6a8a] mt-1 space-y-0.5">
                                  {p._docsCritici.slice(0, 3).map((d: any, i: number) => (
                                    <div key={i} className="truncate max-w-[180px]">· {d.doc} <span style={{ color: d.esito === 'Non Conforme' ? '#E24B4A' : '#F5A800' }}>({d.esito})</span></div>
                                  ))}
                                  {p._criticiCount > 3 && <div className="text-[#3a5a7a]">+ {p._criticiCount - 3} altri</div>}
                                </div>
                              </div>
                            ) : p._docsTotal > 0 ? (
                              <span className="text-[10px] text-[#3a5a7a]">{p._docsTotal} doc{p._docsTotal > 1 ? 's' : ''} — nessun critico</span>
                            ) : (
                              <span className="text-[10px] text-[#2a4a6a] italic">Nessun documento inserito</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {p.stato !== 'Richiesta Informazioni' && (
                                <button
                                  onClick={() => handleSetRI(p.id)}
                                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#F5A800]/30 text-[#F5A800] bg-[#F5A800]/10 hover:bg-[#F5A800]/20 transition-all whitespace-nowrap"
                                >
                                  → RI
                                </button>
                              )}
                              <button
                                onClick={() => handleSollecitaPendenza(p)}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#0078D4]/30 text-[#378ADD] bg-[#0078D4]/10 hover:bg-[#0078D4]/20 transition-all whitespace-nowrap flex items-center gap-1"
                              >
                                <Send size={10} /> Sollecita
                              </button>
                              <button
                                onClick={() => { navigate('/storico', { state: { praticaId: p.id } }); setShowPendenzeModal(false); }}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#534AB7]/30 text-[#a89ef8] bg-[#534AB7]/10 hover:bg-[#534AB7]/20 transition-all whitespace-nowrap"
                              >
                                → Gestisci
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL SOGLIE CONTRATTI DETTAGLIO */}
      <AnimatePresence>
        {selectedSoglia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[600] flex items-center justify-center p-6"
            onClick={e => e.target === e.currentTarget && setSelectedSoglia(null)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[#0d1f36] border border-white/12 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <GanttChartSquare size={15} className="text-[#534AB7]" />
                  <span className="text-sm font-bold text-[#ddeeff]">Soglie Contratti</span>
                  <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border',
                    selectedSoglia.pct >= 80 ? 'bg-[#E24B4A]/15 border-[#E24B4A]/30 text-[#f09595]' : 'bg-[#F5A800]/15 border-[#F5A800]/30 text-[#F5A800]')}>
                    {selectedSoglia.pct >= 80 ? '🔴 IN ALLERTA' : '⚠ ATTENZIONE'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { handleExportPDF('Soglia Contratto', [selectedSoglia]); }}
                    className="text-[9px] px-2.5 py-1 rounded-lg border border-white/10 text-[#6a8aaa] bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1">
                    <Download size={10} /> PDF
                  </button>
                  <button onClick={() => setSelectedSoglia(null)} className="text-[#3a5a7a] hover:text-white transition-colors"><X size={18} /></button>
                </div>
              </div>
              <div className="p-6 space-y-5">
                {/* SAP + Name */}
                <div>
                  <div className="text-[10px] font-bold text-[#534AB7] font-mono tracking-wider mb-1">{selectedSoglia.idSap || selectedSoglia.id}</div>
                  <div className="text-sm font-bold text-[#c8ddf0] leading-snug">{selectedSoglia.appaltatore || selectedSoglia.app}</div>
                  <div className="text-[10px] text-[#4a6a8a] mt-1">{selectedSoglia.subfornitore || selectedSoglia.sub}</div>
                </div>
                {/* Big % */}
                <div className="flex items-end justify-between">
                  <div>
                    <div className={cn('text-5xl font-black tabular-nums leading-none',
                      selectedSoglia.pct >= 80 ? 'text-[#E24B4A]' : selectedSoglia.pct >= 60 ? 'text-[#F5A800]' : 'text-[#1D9E75]')}>
                      {Math.round(selectedSoglia.pct)}%
                    </div>
                    <div className="text-[10px] text-[#3a5a7a] uppercase font-bold tracking-widest mt-1">Utilizzata</div>
                  </div>
                  <div className="text-right text-[9px] text-[#3a5a7a] space-y-1">
                    <div>Soglia alert: <span className="text-[#F5A800] font-bold">50%</span></div>
                    <div>Soglia critica: <span className="text-[#E24B4A] font-bold">80%</span></div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-3 bg-white/8 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${Math.min(selectedSoglia.pct, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn('h-full rounded-full',
                      selectedSoglia.pct >= 80 ? 'bg-[#E24B4A]' : selectedSoglia.pct >= 60 ? 'bg-[#F5A800]' : 'bg-[#1D9E75]')} />
                </div>
                {/* KPI row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Usato', value: parseEuro(selectedSoglia.importoEur || selectedSoglia.importoRichiestoEuro), color: 'text-[#c8ddf0]' },
                    { label: 'Residuo', value: Math.max(0, parseEuro(selectedSoglia.importoMaxSub) - parseEuro(selectedSoglia.importoEur || selectedSoglia.importoRichiestoEuro)), color: 'text-[#5DCAA5]' },
                    { label: 'Max', value: parseEuro(selectedSoglia.importoMaxSub), color: 'text-[#a89ef8]' },
                  ].map(k => (
                    <div key={k.label} className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
                      <div className="text-[8px] text-[#3a5a7a] uppercase font-bold mb-1">{k.label}</div>
                      <div className={cn('text-xs font-bold font-mono', k.color)}>
                        €{k.value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Footer action */}
                <button onClick={() => { handleRowClick(selectedSoglia); setSelectedSoglia(null); }}
                  className="w-full h-9 rounded-xl bg-[#534AB7]/20 border border-[#534AB7]/35 text-[#a89ef8] text-[11px] font-bold hover:bg-[#534AB7]/35 transition-all flex items-center justify-center gap-2">
                  <Eye size={12} /> Vedi dettaglio pratica
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PENDENZA DETAIL MODAL */}
      <AnimatePresence>
        {selectedPendenza && (() => {
          const p = selectedPendenza;
          const sap = p.idSapContratto || p.idSap || '';
          const docsAll = sap ? documenti.filter(d => d.sap === sap) : [];
          const docsCritici = docsAll.filter(d => ['Non Conforme', 'Richiesta Informazioni', 'Scaduto'].includes(d.esito));
          const docsOk = docsAll.filter(d => !['Non Conforme', 'Richiesta Informazioni', 'Scaduto'].includes(d.esito));
          const importoVal = parseEuro(p.importoRichiestoEuro || p.importoEur);
          const maxVal = parseEuro(p.importoMassimoSubappaltabile || p.importoMaxSub);
          const sogliaPct = maxVal > 0 ? Math.min(100, (importoVal / maxVal) * 100) : 0;
          const CC_FISSI = 'rosalinda.difiore@ren.eniplenitude.com,federica.damato@ren.eniplenitude.com,antoninoangelo.polito@ren.eniplenitude.com';
          const docsText = docsCritici.map(d => `  • ${d.doc}: ${d.esito}${d.scad ? ` (scad. ${fmtDate(d.scad)})` : ''}`).join('\n');
          const subject = `Richiesta aggiornamento documenti — ${p.appaltatore || p.app}`;
          const body = `Gentile ${p.appaltatore || p.app},\n\nin riferimento al contratto SAP ${sap}, si segnalano i seguenti documenti non conformi:\n\n${docsText}\n\nSi prega di provvedere all'aggiornamento entro i termini contrattuali.\n\nCordiali saluti,\nPietro De Vito — PSER Gestione Subaffidamenti`;
          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[520] flex items-center justify-center p-6"
              onClick={e => e.target === e.currentTarget && setSelectedPendenza(null)}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 12 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="bg-[#0d1f36] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
              >
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-white/5 bg-[#0b1a2e] flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#534AB7]/25 border border-[#534AB7]/40 text-[#a89ef8] font-mono shrink-0">
                        SAP {sap || p.id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E24B4A]/15 border border-[#E24B4A]/30 text-[#f09595] shrink-0">
                        {docsCritici.length} doc. critico/i
                      </span>
                    </div>
                    <div className="text-base font-bold text-[#ddeeff] truncate">{p.appaltatore || p.app}</div>
                    <div className="text-[11px] text-[#4a6a8a] mt-0.5">{p.subfornitore || p.sub || '—'} · {p.tipo}</div>
                  </div>
                  <button onClick={() => setSelectedPendenza(null)} className="shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#6a8aaa] hover:bg-white/10 transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {/* BODY */}
                <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-4">
                  {/* SOGLIA */}
                  {maxVal > 0 && (
                    <div className="bg-[#0f2035] border border-white/8 rounded-xl p-4">
                      <div className="text-[9px] text-[#534AB7] uppercase tracking-widest font-bold flex items-center gap-1.5 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#534AB7]" /> Soglia Contratto
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <div>
                          <span className="text-xl font-bold text-[#ddeeff] font-mono">€ {importoVal.toLocaleString('it-IT')}</span>
                          <span className="text-[11px] text-[#3a5a7a] ml-2">/ € {maxVal.toLocaleString('it-IT')} max</span>
                        </div>
                        <span className={cn('text-sm font-bold', sogliaPct >= 80 ? 'text-[#E24B4A]' : sogliaPct >= 60 ? 'text-[#F5A800]' : 'text-[#1D9E75]')}>
                          {sogliaPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(sogliaPct, 100)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={cn('h-full rounded-full', sogliaPct >= 80 ? 'bg-[#E24B4A]' : sogliaPct >= 60 ? 'bg-[#F5A800]' : 'bg-[#1D9E75]')} />
                      </div>
                    </div>
                  )}

                  {/* DOCUMENTI CRITICI */}
                  {docsCritici.length > 0 && (
                    <div className="bg-[#0f2035] border border-[#E24B4A]/20 rounded-xl p-4">
                      <div className="text-[9px] text-[#E24B4A] uppercase tracking-widest font-bold flex items-center gap-1.5 mb-3">
                        <AlertTriangle size={10} /> Documenti da Regolarizzare
                      </div>
                      <div className="space-y-2">
                        {docsCritici.map((d, i) => {
                          const cfg = d.esito === 'Scaduto' ? { color: '#f09595', bg: 'bg-[#E24B4A]/10', border: 'border-[#E24B4A]/25' }
                            : d.esito === 'Non Conforme' ? { color: '#f09595', bg: 'bg-[#E24B4A]/10', border: 'border-[#E24B4A]/25' }
                            : { color: '#F5A800', bg: 'bg-[#F5A800]/10', border: 'border-[#F5A800]/25' };
                          return (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                              <div className="text-xs font-semibold text-[#c8ddf0]">{d.doc}</div>
                              <div className="flex items-center gap-2">
                                {d.scad && <span className="text-[10px] text-[#3a5a7a] font-mono">{fmtDate(d.scad)}</span>}
                                <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', cfg.bg, cfg.border)} style={{ color: cfg.color }}>
                                  {d.esito}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ALTRI DOCUMENTI */}
                  {docsOk.length > 0 && (
                    <div className="bg-[#0f2035] border border-white/8 rounded-xl p-4">
                      <div className="text-[9px] text-[#1D9E75] uppercase tracking-widest font-bold flex items-center gap-1.5 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" /> Altri Documenti ({docsOk.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {docsOk.map((d, i) => (
                          <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/25 text-[#5DCAA5]">
                            {d.doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* FOOTER */}
                <div className="px-5 py-4 border-t border-white/5 bg-[#0b1a2e] flex gap-2.5">
                  <button
                    onClick={() => {
                      window.open(`https://outlook.office.com/mail/deeplink/compose?cc=${encodeURIComponent(CC_FISSI)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                    }}
                    className="flex-1 h-11 bg-gradient-to-r from-[#0078D4] to-[#106EBE] text-white rounded-xl text-xs font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <Mail size={14} /> Invia Sollecito via Outlook
                  </button>
                  <button
                    onClick={() => { navigate('/storico', { state: { praticaId: p.id } }); setSelectedPendenza(null); }}
                    className="h-11 px-4 bg-[#534AB7]/20 border border-[#534AB7]/35 text-[#a89ef8] rounded-xl text-xs font-bold hover:bg-[#534AB7]/35 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Edit2 size={13} /> Gestisci in Solleciti
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* MODALS */}
      <AnimatePresence>
        {(showTuttiModal || showUltimiModal || showCriticiModal || showArchivioModal || showCalendarModal || showEmailModal || showAllBarChart) && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "bg-[#0f2035] border border-white/10 rounded-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-all duration-300",
                showCalendarModal || showEmailModal ? "max-w-sm" : "max-w-4xl"
              )}
            >
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/2">
                <h2 className="text-sm font-bold text-[#ddeeff] flex items-center gap-2.5">
                  {showTuttiModal && <><ExternalLink size={16} /> Tutti i Subaffidamenti</>}
                  {showUltimiModal && <><Clock size={16} /> Ultimi Inseriti</>}
                  {showCriticiModal && <><AlertTriangle size={16} className="text-[#E24B4A]" /> Tutte le Criticità</>}
                  {showArchivioModal && <><Archive size={16} /> Archivio Completo</>}
                  {showCalendarModal && <><span className="text-lg">📅</span> Calendario Scadenze</>}
                  {showEmailModal && <><Mail size={16} /> INVIA EMAIL</>}
                  {showAllBarChart && <><BarChart3 size={16} /> {selectedApp ? `Tutti i Subfornitori di ${selectedApp}` : 'Tutti gli Appaltatori Virtuosi'}</>}
                </h2>
                <button 
                  onClick={() => {
                    setShowTuttiModal(false);
                    setShowUltimiModal(false);
                    setShowCriticiModal(false);
                    setShowArchivioModal(false);
                    setShowCalendarModal(false);
                    setShowEmailModal(false);
                    setShowAllBarChart(false);
                  }} 
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#6a8aaa] hover:bg-white/10 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar">
                {/* Modal Content */}
                {showTuttiModal && (
                  <div className="space-y-4 mb-6">
                    <div className="flex items-end gap-3 flex-wrap bg-white/3 p-4 rounded-xl border border-white/5">
                      <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <label className="text-[10px] text-[#2a4a6a] uppercase tracking-wider font-bold">Cerca Appaltatore</label>
                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#3a5a7a]" />
                          <input 
                            type="text"
                            value={modalAppSearch}
                            onChange={e => setModalAppSearch(e.target.value)}
                            placeholder="Nome appaltatore..."
                            className="w-full h-8 pl-8 pr-2.5 bg-black/20 border border-white/10 rounded-lg text-xs text-[#c8ddf0] outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#2a4a6a] uppercase tracking-wider font-bold">Tipo</label>
                        <select 
                          value={modalTipoFilter}
                          onChange={e => setModalTipoFilter(e.target.value)}
                          className="h-8 bg-black/20 border border-white/10 rounded-lg text-xs text-[#8ab0c8] px-2 outline-none"
                        >
                          <option value="">Tutti</option>
                          <option value="Subappalto">Subappalto</option>
                          <option value="Subcontratto">Subcontratto</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#2a4a6a] uppercase tracking-wider font-bold">Stato</label>
                        <select 
                          value={modalStatoFilter}
                          onChange={e => setModalStatoFilter(e.target.value)}
                          className="h-8 bg-black/20 border border-white/10 rounded-lg text-xs text-[#8ab0c8] px-2 outline-none"
                        >
                          <option value="">Tutti</option>
                          {Object.keys(STATO_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <button 
                        onClick={() => {
                          setModalAppSearch('');
                          setModalTipoFilter('');
                          setModalStatoFilter('');
                        }}
                        className="h-8 px-3 bg-white/5 border border-white/10 rounded-lg text-[10px] text-[#6a8aaa] hover:bg-white/10"
                      >
                        ↺ Reset
                      </button>
                    </div>
                  </div>
                )}

                {showEmailModal ? (
                  <div className="space-y-5">
                    <p className="text-sm text-[#7a9ab8] leading-relaxed">
                      Apre il tuo client email predefinito con oggetto e corpo precompilati per le pratiche in scadenza.
                    </p>
                    {(() => {
                      const pratiche = alerts.slice(0, 10);
                      const subject = encodeURIComponent('Sollecito documentazione e scadenze — PSER');
                      const body = encodeURIComponent(
                        `Egregio ${selectedApp || 'Appaltatore'},\n\ncomunichiamo quanto segue in riferimento alle pratiche di subaffidamento in corso:\n\nSCADENZE IMMINENTI:\n${pratiche.map(d => `  • ${(d as any).appaltatore || (d as any).app || ''} — ${(d as any).sub || (d as any).subfornitore || ''}`).join('\n')}\n\nSi richiede cortesemente di procedere con urgenza all'aggiornamento della documentazione richiesta.\n\nCordiali saluti,\n${user?.nome}\nPSER — Gestione Subaffidamenti`
                      );
                      return (
                        <>
                          <div className="space-y-3">
                            <button
                              onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank')}
                              className="w-full h-12 flex items-center justify-center gap-3 bg-[#E24B4A]/15 border border-[#E24B4A]/40 rounded-xl text-[#f09595] text-sm font-bold hover:bg-[#E24B4A]/25 transition-all"
                            >
                              <Mail size={16} /> Apri con Gmail / Client Email
                            </button>
                            <button
                              onClick={() => window.open(`https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${body}`, '_blank')}
                              className="w-full h-12 flex items-center justify-center gap-3 bg-[#378ADD]/15 border border-[#378ADD]/40 rounded-xl text-[#7ac0f0] text-sm font-bold hover:bg-[#378ADD]/25 transition-all"
                            >
                              <Mail size={16} /> Apri con Outlook
                            </button>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#3a5a7a] uppercase tracking-widest mb-3">
                              Pratiche incluse ({pratiche.length})
                            </div>
                            <div className="space-y-1.5">
                              {pratiche.map((d, i) => (
                                <div key={i} className="text-xs text-[#8ab0c8]">
                                  • {(d as any).appaltatore || (d as any).app || '—'} — {(d as any).sub || (d as any).subfornitore || '—'}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : showCalendarModal ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))}
                          className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#8ab0c8] hover:bg-white/10 transition-all"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <div className="text-lg font-bold text-[#ddeeff] min-w-[140px] text-center">
                          {format(calDate, 'MMMM yyyy', { locale: it })}
                        </div>
                        <button 
                          onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))}
                          className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#8ab0c8] hover:bg-white/10 transition-all"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      
                      <select 
                        value={calDate.getFullYear()}
                        onChange={(e) => setCalDate(new Date(parseInt(e.target.value), calDate.getMonth(), 1))}
                        className="h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#8ab0c8] text-sm px-4 outline-none focus:border-[#534AB7]/50 transition-all cursor-pointer"
                      >
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 text-center mb-2">
                      {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
                        <div key={d} className="text-[10px] text-[#3a5a7a] font-bold uppercase py-1 tracking-widest">{d}</div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2">
                      {calendarDays.map((day, i) => {
                        if (!day) return <div key={`empty-${i}`} className="aspect-square" />;
                        const isToday = day.dateStr === format(new Date(), 'yyyy-MM-dd');
                        const isSelected = day.dateStr === selectedCalDay;
                        const hasEvents = day.events.length > 0;
                        const hasFine = day.events.some(e => e.tipo === 'fine');
                        const hasInizio = day.events.some(e => e.tipo === 'inizio');
                        
                        return (
                          <motion.div 
                            key={day.dateStr}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => setSelectedCalDay(day.dateStr)}
                            className={cn(
                              "aspect-square rounded-xl flex flex-col items-center justify-center text-sm cursor-pointer transition-all relative border",
                              isSelected ? "bg-[#534AB7] border-[#534AB7] text-white font-bold shadow-[0_0_15px_rgba(83,74,183,0.4)]" :
                              isToday ? "bg-white/10 border-[#534AB7]/50 text-[#ddeeff] font-bold" : 
                              hasFine ? "bg-[#E24B4A]/10 border-[#E24B4A]/30 text-[#f09595]" :
                              hasInizio ? "bg-[#1D9E75]/10 border-[#1D9E75]/30 text-[#5DCAA5]" :
                              hasEvents ? "bg-[#F5A800]/10 border-[#F5A800]/30 text-[#F5A800]" :
                              "bg-white/3 border-transparent text-[#8ab0c8] hover:bg-white/5 hover:border-white/10"
                            )}
                          >
                            {day.day}
                            {hasEvents && (
                              <div className="absolute bottom-2 flex gap-1">
                                {Array.from(new Set(day.events.map(e => e.color))).slice(0, 3).map((c, idx) => (
                                  <div key={idx} className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: c, color: c }} />
                                ))}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between mb-5">
                        <div className="text-[10px] font-bold text-[#3a5a7a] uppercase tracking-[0.2em]">
                          {selectedCalDay ? `Eventi del ${safeFormat(selectedCalDay, 'dd/MM', { locale: it })}` : 'Eventi di oggi'}
                        </div>
                      </div>
                      <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {selectedDayEvents.length > 0 ? selectedDayEvents.map((e, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleEventClick(e)}
                            className="flex items-start gap-4 p-3 bg-white/3 rounded-xl border border-white/5 hover:bg-white/5 transition-all group cursor-pointer"
                          >
                            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: e.color, color: e.color }} />
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <div className="text-[10px] text-[#3a5a7a] font-bold uppercase">{safeFormat(e.date, 'dd MMMM yyyy', { locale: it })}</div>
                                <div className="flex gap-1">
                                  {e.tipo === 'custom' && (
                                    <>
                                      <button 
                                        onClick={(ev) => { ev.stopPropagation(); handleEditEvent(e.raw); }}
                                        className="p-1 hover:text-[#378ADD] text-[#5a7a9a] transition-colors"
                                      >
                                        <Edit2 size={10} />
                                      </button>
                                      <button 
                                        onClick={(ev) => { ev.stopPropagation(); handleDeleteEvent(e.id); }}
                                        className="p-1 hover:text-[#E24B4A] text-[#5a7a9a] transition-colors"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </>
                                  )}
                                  <div className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-[#5a7a9a] group-hover:text-[#8ab0c8]">{e.label}</div>
                                </div>
                              </div>
                              <div className="text-xs font-bold text-[#ddeeff] group-hover:text-[#378ADD] transition-colors">{e.nome}</div>
                              {e.desc && <div className="text-[10px] text-[#5a7a9a] mt-0.5">{e.desc}</div>}
                              {e.responsabile && (
                                <div className="text-[9px] text-[#5DCAA5] mt-1 flex items-center gap-1">
                                  <User size={8} /> Resp: {e.responsabile}
                                </div>
                              )}
                              {e.tipo === 'custom' && e.raw?.createdBy && (
                                <div className="text-[9px] text-[#8ab0c8] mt-1 flex items-center gap-1">
                                  <User size={8} /> Creato da: {e.raw.createdBy}
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-8 text-xs text-[#3a5a7a] italic">nessun evento per oggi</div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={handleAddEventClick}
                        className="flex-1 h-12 bg-[#F5A800]/10 border border-[#F5A800]/30 rounded-xl text-[#F5A800] text-xs font-bold hover:bg-[#F5A800]/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> + Crea Evento
                      </button>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] text-[#2a4a6a] uppercase tracking-wider">
                        <th className="pb-3 px-3 font-semibold">ID</th>
                        <th className="pb-3 px-3 font-semibold">Appaltatore</th>
                        <th className="pb-3 px-3 font-semibold">Subfornitore</th>
                        <th className="pb-3 px-3 font-semibold">Stato</th>
                        <th className="pb-3 px-3 font-semibold">Scadenza</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {(showTuttiModal 
                        ? subaffidamenti.filter(d => {
                            const mApp = !modalAppSearch || (d.appaltatore || d.app || '').toLowerCase().includes(modalAppSearch.toLowerCase());
                            const mTipo = !modalTipoFilter || d.tipo === modalTipoFilter;
                            const mStato = !modalStatoFilter || d.stato === modalStatoFilter;
                            return mApp && mTipo && mStato;
                          })
                        : showAllBarChart
                          ? selectedApp 
                            ? subaffidamenti.filter(d => (d.appaltatore || d.app) === selectedApp)
                            : subaffidamenti.filter(d => virtuousApps.includes(d.appaltatore || d.app || ''))
                        : showUltimiModal ? recenti : showCriticiModal ? alerts : subaffidamenti).map((d, i) => (
                        <tr 
                          key={i} 
                          className="border-t border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => handleRowClick(d)}
                        >
                          <td className="py-3 px-3 font-mono text-[#4a9fe8]">{d.id}</td>
                          <td className="py-3 px-3 text-[#a0b8d0]">{d.appaltatore || d.app}</td>
                          <td className="py-3 px-3 text-[#c8ddf0]">{d.sub}</td>
                          <td className="py-3 px-3">
                            <span className={cn("pill", STATO_CLS[d.stato] || "bg-white/5 text-[#5a7a9a]")}>{d.stato}</span>
                          </td>
                          <td className="py-3 px-3 text-[#6a8aaa]">{fmtDate(d.scadenza)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ADD EVENT MODAL */}
      <AnimatePresence>
        {showAddEventModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-[#0f2035] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/2">
                <h2 className="text-sm font-bold text-[#ddeeff] flex items-center gap-2.5">
                  <Plus size={16} className="text-[#F5A800]" /> {editingEventId ? 'Modifica Evento' : '+ Crea Evento'}
                </h2>
                <button 
                  onClick={() => { setShowAddEventModal(false); setEditingEventId(null); }} 
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#6a8aaa] hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#3a5a7a] uppercase font-bold tracking-widest">Titolo *</label>
                  <input 
                    type="text"
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="Titolo evento..."
                    className="w-full h-10 bg-black/20 border border-white/10 rounded-xl px-4 text-xs text-[#c8ddf0] outline-none focus:border-[#534AB7]/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#3a5a7a] uppercase font-bold tracking-widest">Data inizio *</label>
                    <input 
                      type="date"
                      value={newEvent.startDate}
                      onChange={e => setNewEvent({...newEvent, startDate: e.target.value})}
                      className="w-full h-10 bg-black/20 border border-white/10 rounded-xl px-4 text-xs text-[#c8ddf0] outline-none focus:border-[#534AB7]/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#3a5a7a] uppercase font-bold tracking-widest">Data fine</label>
                    <input 
                      type="date"
                      value={newEvent.endDate}
                      onChange={e => setNewEvent({...newEvent, endDate: e.target.value})}
                      className="w-full h-10 bg-black/20 border border-white/10 rounded-xl px-4 text-xs text-[#c8ddf0] outline-none focus:border-[#534AB7]/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#3a5a7a] uppercase font-bold tracking-widest">Ora inizio</label>
                    <input 
                      type="time"
                      value={newEvent.startTime}
                      onChange={e => setNewEvent({...newEvent, startTime: e.target.value})}
                      className="w-full h-10 bg-black/20 border border-white/10 rounded-xl px-4 text-xs text-[#c8ddf0] outline-none focus:border-[#534AB7]/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#3a5a7a] uppercase font-bold tracking-widest">Ora fine</label>
                    <input 
                      type="time"
                      value={newEvent.endTime}
                      onChange={e => setNewEvent({...newEvent, endTime: e.target.value})}
                      className="w-full h-10 bg-black/20 border border-white/10 rounded-xl px-4 text-xs text-[#c8ddf0] outline-none focus:border-[#534AB7]/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#3a5a7a] uppercase font-bold tracking-widest">Note</label>
                  <textarea 
                    value={newEvent.notes}
                    onChange={e => setNewEvent({...newEvent, notes: e.target.value})}
                    placeholder="Note..."
                    rows={3}
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-xs text-[#c8ddf0] outline-none focus:border-[#534AB7]/50 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowAddEventModal(false)}
                    className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl text-[#6a8aaa] text-xs font-bold hover:bg-white/10 transition-all"
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={handleSaveEvent}
                    className="flex-1 h-11 bg-[#534AB7] text-white rounded-xl text-xs font-bold hover:bg-[#6358cc] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(83,74,183,0.3)]"
                  >
                    💾 Salva
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* NAVIGATION CHOICE MODAL */}
      <AnimatePresence>
        {selectedEventForAction && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[600] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0f2035] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-[#ddeeff]">Scegli Destinazione</h3>
                <button onClick={() => setSelectedEventForAction(null)} className="text-[#6a8aaa] hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-[#8ab0c8] mb-6">Dove vuoi andare per gestire questo evento?</p>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    navigate('/controllo-documentale');
                    setSelectedEventForAction(null);
                    setShowCalendarModal(false);
                  }}
                  className="w-full h-12 bg-[#534AB7]/20 border border-[#534AB7]/40 rounded-xl text-[#a89ef8] text-sm font-bold hover:bg-[#534AB7]/30 transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={18} /> Controllo Documentale
                </button>
                <button 
                  onClick={() => {
                    navigate('/subaffidamenti');
                    setSelectedEventForAction(null);
                    setShowCalendarModal(false);
                  }}
                  className="w-full h-12 bg-[#1D9E75]/20 border border-[#1D9E75]/40 rounded-xl text-[#5DCAA5] text-sm font-bold hover:bg-[#1D9E75]/30 transition-all flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet size={18} /> Subaffidamenti
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
