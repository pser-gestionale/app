import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Archive, 
  LayoutDashboard, 
  Info, 
  Check, 
  X, 
  Search, 
  Mail, 
  Download,
  Star,
  Clock,
  AlertTriangle,
  FileText,
  User,
  TrendingUp,
  Send,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ClipboardCheck,
  Bot,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { cn, fmtDate } from '../lib/utils';
import { format, differenceInDays, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { DocumentoControllo } from '../types';

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

const ControlloDocumentale: React.FC = () => {
  const { subaffidamenti, appaltatori, documenti, setDocumenti, addActivity } = useData();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [mode, setMode] = useState<'nuovo' | 'aggiorna'>('nuovo');
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  
  // Custom Lists for dynamic addition/removal
  const [customAppaltatori, setCustomAppaltatori] = useState<string[]>([]);
  const [customResponsabili, setCustomResponsabili] = useState<string[]>(['Pietro De Vito', 'Federica D\'Amato', 'Rosalinda Di Fiore']);

  // Deletion Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'app' | 'resp', name: string } | null>(null);

  // Search Filters for "Aggiorna Esistente"
  const [searchFilters, setSearchFilters] = useState({
    app: '',
    tipo: 'Tutti i tipi',
    stato: 'Tutti gli stati'
  });

  // Form State
  const [selectedApp, setSelectedApp] = useState('');
  const [isNewApp, setIsNewApp] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  
  const [sapContratto, setSapContratto] = useState('');
  const [dataInizio, setDataInizio] = useState('');
  
  const [responsabile, setResponsabile] = useState(user?.nome || '');
  const [isNewResp, setIsNewResp] = useState(false);
  const [newRespName, setNewRespName] = useState('');
  
  const [tipoDoc, setTipoDoc] = useState('DURC');
  const [riferimento, setRiferimento] = useState('');
  const [dataVerifica, setDataVerifica] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFine, setDataFine] = useState('');
  const [esito, setEsito] = useState('Conforme');
  const [giorniAdeguamento, setGiorniAdeguamento] = useState<number | ''>('');
  const [priorita, setPriorita] = useState<'Alta' | 'Media' | 'Bassa'>('Alta');
  const [stelle, setStelle] = useState(5);
  const [hoverStelle, setHoverStelle] = useState(0);
  const [hoverPriorita, setHoverPriorita] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Archivio Filters
  const [archivioSearch, setArchivioSearch] = useState('');
  const [archivioAppFilter, setArchivioAppFilter] = useState('');
  const [archivioEsitoFilter, setArchivioEsitoFilter] = useState('Tutti gli esiti');

  // UI State
  const [showArchivioModal, setShowArchivioModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: 'Ciao! Sono il tuo assistente per il Gestionale Subaffidamenti. Posso aiutarti a compilare il form, spiegare i campi o rispondere a domande sul sistema. Come posso aiutarti?' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [saveNotify, setSaveNotify] = useState(false);

  const today = new Date();

  useEffect(() => {
    if (location.state?.sap) {
      setSapContratto(location.state.sap);
      setMode('aggiorna');
      // In a real app, we would fetch the document details here
    }
  }, [location.state]);

  useEffect(() => {
    if (appaltatori.length > 0 && customAppaltatori.length === 0) {
      setCustomAppaltatori(appaltatori.map(a => a.nome));
    }
  }, [appaltatori, customAppaltatori]);

  useEffect(() => {
    if (showArchivioModal) {
      setArchivioAppFilter(selectedApp || '');
    }
  }, [showArchivioModal, selectedApp]);

  const stats = useMemo(() => {
    const docs = selectedApp ? documenti.filter(d => d.app === selectedApp) : documenti;
    const tot = docs.length;
    const conf = docs.filter(d => d.esito === 'Conforme').length;
    const scad = docs.filter(d => {
      if (!d.scad || !isValidDate(d.scad)) return false;
      const diff = safeDiff(d.scad, today);
      return diff >= 0 && diff <= 30;
    }).length;
    const nc = docs.filter(d => d.esito === 'Non Conforme').length;
    const ver = docs.filter(d => d.esito === 'In Verifica').length;

    return [
      { val: tot, lbl: 'Totale Documenti', color: '#534AB7', icon: FileText, id: 'TOTALE' },
      { val: conf, lbl: 'Conformi', color: '#1D9E75', icon: Check, id: 'CONFORMI' },
      { val: scad, lbl: 'In Scadenza', color: '#F5A800', icon: Clock, id: 'SCADUTI' },
      { val: nc, lbl: 'Non Conformi', color: '#E24B4A', icon: AlertTriangle, id: 'NC' },
      { val: ver, lbl: 'In Verifica', color: '#378ADD', icon: TrendingUp, id: 'VERIFICA' }
    ];
  }, [documenti, selectedApp]);

  const diffGiorni = useMemo(() => {
    if (!dataFine || !dataVerifica) return null;
    return safeDiff(dataFine, dataVerifica);
  }, [dataFine, dataVerifica]);

  const termineAdeguamento = useMemo(() => {
    if (!dataVerifica || !giorniAdeguamento) return null;
    return addDays(new Date(dataVerifica), Number(giorniAdeguamento));
  }, [dataVerifica, giorniAdeguamento]);

  const statoIntervento = useMemo(() => {
    if (esito === 'Non Conforme') return { text: 'Non conforme — intervento richiesto', color: '#f09595' };
    if (esito === 'In Verifica') return { text: 'In verifica — attendere esito', color: '#a89ef8' };
    if (esito === 'Richiesta Informazioni') return { text: 'Richiesta informazioni — in attesa risposta', color: '#EF9F27' };
    if (esito === 'Da Autorizzare') return { text: 'Da autorizzare — in attesa approvazione', color: '#534AB7' };
    if (esito === 'Conforme' && dataFine && dataVerifica) {
      const d = safeDiff(dataFine, dataVerifica);
      if (d < 0) return { text: `Scaduto da ${Math.abs(d)} giorni`, color: '#f09595' };
      if (d <= 30) return { text: `In scadenza — tra ${d} giorni`, color: '#F5A800' };
      return { text: `Valido — scade tra ${d} giorni`, color: '#5DCAA5' };
    }
    return { text: 'Seleziona esito e date per calcolare', color: '#3a5a7a' };
  }, [esito, dataFine, dataVerifica]);

  const filteredAppaltatori = useMemo(() => {
    return appaltatori.map(a => a.nome).sort();
  }, [appaltatori]);

  const appStats = useMemo(() => {
    if (!selectedApp) return null;
    const docs = documenti.filter(d => d.app === selectedApp);
    const tot = docs.length;
    const conf = docs.filter(d => d.esito === 'Conforme').length;
    const scad = docs.filter(d => {
      if (!d.scad || !isValidDate(d.scad)) return false;
      const diff = safeDiff(d.scad, today);
      return diff >= 0 && diff <= 30;
    }).length;
    const nc = docs.filter(d => d.esito === 'Non Conforme').length;
    const ver = docs.filter(d => d.esito === 'In Verifica').length;
    
    return { tot, conf, scad, nc, ver };
  }, [documenti, selectedApp]);

  const filteredArchivio = useMemo(() => {
    return documenti.filter(d => {
      const matchesSearch = !archivioSearch || 
        d.app.toLowerCase().includes(archivioSearch.toLowerCase()) ||
        d.sap.includes(archivioSearch) ||
        d.doc.toLowerCase().includes(archivioSearch.toLowerCase());
      const matchesApp = !archivioAppFilter || d.app === archivioAppFilter;
      const matchesEsito = archivioEsitoFilter === 'Tutti gli esiti' || d.esito === archivioEsitoFilter;
      return matchesSearch && matchesApp && matchesEsito;
    });
  }, [documenti, archivioSearch, archivioAppFilter, archivioEsitoFilter]);

  const handleSave = () => {
    const appToSave = isNewApp ? newAppName.toUpperCase() : selectedApp;
    if (!appToSave || !sapContratto) {
      setSaveNotify(false); alert('Compila i campi obbligatori: Appaltatore e ID SAP');
      return;
    }

    if (isNewApp && !customAppaltatori.includes(appToSave)) {
      setCustomAppaltatori(prev => [...prev, appToSave]);
    }
    
    const newDoc: DocumentoControllo = {
      sap: sapContratto,
      app: appToSave,
      doc: tipoDoc,
      scad: dataFine,
      esito: esito as any,
      termineAdeguamento: termineAdeguamento ? format(termineAdeguamento, 'yyyy-MM-dd') : undefined,
      responsabile: isNewResp ? newRespName : responsabile,
      prio: priorita,
      ts: format(new Date(), 'dd/MM/yyyy HH:mm'),
      utente: user?.nome || 'Pietro De Vito',
      nota: note
    };

    setDocumenti(prev => [newDoc, ...prev]);
    addActivity('insert', 'Controllo Documentale', `Inserito controllo ${tipoDoc} per ${appToSave}`, `Esito: ${esito}, Priorità: ${priorita}`);
    
    setSaveNotify(true);
    setTimeout(() => setSaveNotify(false), 4000);
    
    // Reset form
    if (!isNewApp) setSelectedApp('');
    setNewAppName('');
    setIsNewApp(false);
    setSapContratto('');
    setDataInizio('');
    setRiferimento('');
    setDataFine('');
    setNote('');
    setGiorniAdeguamento('');
    setStelle(5);
    setPriorita('Alta');
    
    alert('Controllo salvato correttamente. Il calendario e le statistiche sono stati aggiornati.');
  };

  const handleRemoveApp = (app: string) => {
    setShowDeleteConfirm({ type: 'app', name: app });
  };

  const handleRemoveResp = (resp: string) => {
    setShowDeleteConfirm({ type: 'resp', name: resp });
  };

  const confirmDelete = () => {
    if (!showDeleteConfirm) return;
    if (showDeleteConfirm.type === 'app') {
      setCustomAppaltatori(prev => prev.filter(a => a !== showDeleteConfirm.name));
      if (selectedApp === showDeleteConfirm.name) setSelectedApp('');
    } else {
      setCustomResponsabili(prev => prev.filter(r => r !== showDeleteConfirm.name));
      if (responsabile === showDeleteConfirm.name) setResponsabile('');
    }
    setShowDeleteConfirm(null);
  };

  const prefillFromAlert = (doc: DocumentoControllo) => {
    setMode('aggiorna');
    setSelectedApp(doc.app);
    setSapContratto(doc.sap);
    setTipoDoc(doc.doc);
    setDataFine(doc.scad || '');
    setEsito(doc.esito);
    setPriorita(doc.prio || 'Alta');
    setStelle(5); // Default or from doc if available
    setNote(doc.nota || '');
    setShowAlertsModal(false);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportCSV = () => {
    const rows = filteredArchivio.map(d => ({
      'ID SAP': d.sap, 'Appaltatore': d.app, 'Documento': d.doc,
      'Esito': d.esito, 'Scadenza': d.scad, 'Priorità': d.prio || '',
      'Responsabile': d.responsabile || d.utente || '', 'Note': d.nota || '',
    }));
    // Dynamic import handled by bundler
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Documenti');
      XLSX.writeFile(wb, `archivio_${selectedApp || 'tutti'}_${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  };

  const handleKpiClick = (id: string) => {
    const newKpi = selectedKpi === id ? null : id;
    setSelectedKpi(newKpi);
    if (newKpi) {
      setTimeout(() => {
        tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const filteredTableDocs = useMemo(() => {
    if (!selectedKpi) return [];
    switch (selectedKpi) {
      case 'TOTALE': return documenti;
      case 'CONFORMI': return documenti.filter(d => d.esito === 'Conforme');
      case 'SCADUTI': return documenti.filter(d => {
        if (!d.scad) return false;
        const diff = safeDiff(d.scad, today);
        return diff >= 0 && diff <= 30;
      });
      case 'NC': return documenti.filter(d => d.esito === 'Non Conforme');
      case 'VERIFICA': return documenti.filter(d => d.esito === 'In Verifica');
      default: return [];
    }
  }, [documenti, selectedKpi, today]);

  const handleSendAI = () => {
    if (!aiInput.trim()) return;
    const newMsgs = [...aiMessages, { role: 'user', text: aiInput }];
    setAiMessages(newMsgs as any);
    setAiInput('');

    const AI_ANSWERS: Record<string, string> = {
      'durc': 'Il DURC (Documento Unico di Regolarità Contributiva) ha validità di 120 giorni dalla data di emissione. Deve essere rinnovato prima della scadenza per mantenere la conformità.',
      'appaltatore': 'Seleziona l\'appaltatore dalla lista a discesa. Se non è presente, clicca + Nuovo per aggiungerlo.',
      'verifica': 'La Data Verifica è il giorno in cui hai effettuato il controllo del documento. I giorni residui vengono calcolati come differenza tra Data Fine Validità e questa data.',
      'priorita': 'Alta (5 stelle): intervento urgente entro 24-48h. Media (3 stelle): entro la settimana. Bassa (1 stella): monitoraggio ordinario.',
      'termine': 'Il Termine Adeguamento è la data entro cui l\'appaltatore deve produrre la documentazione. Si calcola automaticamente come Data Verifica + giorni selezionati.'
    };

    let answer = 'Non ho una risposta specifica per questa domanda nel piano gratuito. Prova a chiedere di: DURC, appaltatore, data verifica, priorità, o termine adeguamento.';
    const q = aiInput.toLowerCase();
    for (const k in AI_ANSWERS) {
      if (q.includes(k)) {
        answer = AI_ANSWERS[k];
        break;
      }
    }

    setTimeout(() => {
      setAiMessages(prev => [...prev, { role: 'bot', text: answer }]);
    }, 400);
  };

  const addSuggNote = (text: string) => {
    const d = format(new Date(), 'dd/MM/yyyy');
    setNote(prev => prev ? `${prev}\n[${d}] ${text}` : `[${d}] ${text}`);
  };

  return (
    <div className="p-5 space-y-5 relative min-h-screen bg-[#07101e] text-[#c8ddf0] text-[13px]">
      {/* TOPBAR */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-lg font-bold text-[#ddeeff] tracking-tight">Controllo Documentale</h1>
          <p className="text-xs text-[#3a5a7a] mt-1">Inserimento nuovo controllo o aggiornamento pratica esistente</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Clock size={14} className="text-[#534AB7]" />
            {format(today, 'EEEE d MMMM yyyy', { locale: it })}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#534AB7] to-[#378ADD] flex items-center justify-center text-[10px] text-white font-bold shadow-md shadow-[#534AB7]/20">
              {user?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'PV'}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[#4a6a8a] font-bold uppercase tracking-tighter leading-none mb-0.5">Responsabile</span>
              <span className="font-semibold text-[#8ab0c8]">{user?.nome || 'Pietro De Vito'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((k, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleKpiClick(k.id)}
            className={cn(
              "bg-[#0f2035] border rounded-xl p-3.5 relative overflow-hidden group transition-all cursor-pointer shadow-xl",
              selectedKpi === k.id ? "border-[#534AB7] bg-[#162840] scale-[1.02]" : "border-white/5 hover:border-[#534AB7]/50"
            )}
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <k.icon size={40} color={k.color} />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${k.color}20` }}>
                <k.icon size={16} style={{ color: k.color }} />
              </div>
              <div className="text-[10px] text-[#3a5a7a] uppercase tracking-widest font-bold">{k.lbl}</div>
            </div>
            <div className="text-xl font-bold text-[#ddeeff] tracking-tight">{k.val}</div>
            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(k.val / (stats[0].val || 1)) * 100}%` }}
                className="h-full rounded-full"
                style={{ backgroundColor: k.color }}
              />
            </div>
            {selectedKpi === k.id && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#534AB7] animate-pulse" />
            )}
          </motion.div>
        ))}
      </div>

      {/* MODE BAR */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-[#0f2035] border border-white/5 rounded-xl p-1 shadow-lg">
          <button 
            onClick={() => setMode('nuovo')}
            className={cn(
              "px-6 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              mode === 'nuovo' ? "bg-[#534AB7] text-[#e8e6f8] shadow-lg shadow-[#534AB7]/30" : "text-[#4a6a8a] hover:text-[#8ab0c8]"
            )}
          >
            <Plus size={14} /> Nuovo Controllo
          </button>
          <button 
            onClick={() => setMode('aggiorna')}
            className={cn(
              "px-6 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              mode === 'aggiorna' ? "bg-[#534AB7] text-[#e8e6f8] shadow-lg shadow-[#534AB7]/30" : "text-[#4a6a8a] hover:text-[#8ab0c8]"
            )}
          >
            <Edit2 size={14} /> Aggiorna Esistente
          </button>
        </div>
        <div className="ml-auto flex gap-3">
          <button 
            onClick={() => setShowArchivioModal(true)}
            className="h-10 px-5 bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-xl text-[#5DCAA5] text-xs font-bold flex items-center gap-2 hover:bg-[#1D9E75]/25 transition-all shadow-lg shadow-[#1D9E75]/10"
          >
            <Archive size={14} /> Archivio Appaltatore
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className="h-10 px-5 bg-[#534AB7]/15 border border-[#534AB7]/35 rounded-xl text-[#a89ef8] text-xs font-bold flex items-center gap-2 hover:bg-[#534AB7]/25 transition-all shadow-lg shadow-[#534AB7]/10"
          >
            <LayoutDashboard size={14} /> Dashboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* FORM CARD */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-[#0f2035] to-[#0a1828] border border-[#534AB7]/35 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#534AB7]/50 to-transparent" />
          
          {saveNotify && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-xl p-4 text-[#5DCAA5] text-sm font-bold flex items-center gap-3 shadow-lg shadow-[#1D9E75]/10"
            >
              <Check size={18} /> Controllo salvato — pannello aggiornato con i nuovi dati
            </motion.div>
          )}

          {mode === 'aggiorna' && (
            <div className="space-y-6">
              <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest border-b border-white/5 pb-2">Cerca pratica esistente</h3>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a5a7a]" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca per appaltatore, ID SAP o documento..." 
                    className="w-full h-11 pl-10 pr-4 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm outline-none focus:border-[#534AB7]/60 transition-all shadow-inner"
                  />
                </div>
                <button className="h-11 px-6 bg-[#534AB7] text-[#e8e6f8] rounded-xl text-sm font-bold hover:bg-[#6358cc] transition-all shadow-lg shadow-[#534AB7]/20">Cerca</button>
              </div>

              <div className="bg-[#0b1a2e]/50 border border-white/5 rounded-2xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#4a6a8a] font-bold uppercase tracking-tighter">Appaltatore</label>
                    <select 
                      value={searchFilters.app}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, app: e.target.value }))}
                      className="w-full h-10 bg-[#07101e] border border-white/10 rounded-xl text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/60"
                    >
                      <option value="">Tutti gli appaltatori</option>
                      {customAppaltatori.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#4a6a8a] font-bold uppercase tracking-tighter">Tipo</label>
                    <select 
                      value={searchFilters.tipo}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, tipo: e.target.value }))}
                      className="w-full h-10 bg-[#07101e] border border-white/10 rounded-xl text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/60"
                    >
                      <option>Tutti i tipi</option>
                      <option>Contrattuale</option>
                      <option>Amministrativo</option>
                      <option>Sicurezza</option>
                      <option>HSE</option>
                      <option>Compliance</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#4a6a8a] font-bold uppercase tracking-tighter">Stato</label>
                    <select 
                      value={searchFilters.stato}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, stato: e.target.value }))}
                      className="w-full h-10 bg-[#07101e] border border-white/10 rounded-xl text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/60"
                    >
                      <option>Tutti gli stati</option>
                      <option>Conforme</option>
                      <option>Non Conforme</option>
                      <option>In Scadenza</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setSearchFilters({ app: '', tipo: 'Tutti i tipi', stato: 'Tutti gli stati' })}
                    className="h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-[#4a6a8a] text-xs font-bold flex items-center gap-2 hover:bg-white/10 transition-all"
                  >
                    <TrendingUp size={14} className="rotate-180" /> Reset
                  </button>
                  <button 
                    onClick={() => setShowArchivioModal(true)}
                    className="h-10 px-4 bg-[#F5A800]/10 border border-[#F5A800]/30 rounded-xl text-[#F5A800] text-xs font-bold flex items-center gap-2 hover:bg-[#F5A800]/20 transition-all"
                  >
                    📁 Vai all'Archivio
                  </button>
                </div>
              </div>

              {/* SEARCH RESULTS TABLE (ALLEGATO 2 STYLE) */}
              <div className="overflow-x-auto border border-white/5 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[9px] font-bold text-[#2a4a6a] uppercase tracking-widest">
                      <th className="p-3">ID SAP</th>
                      <th className="p-3">Appaltatore</th>
                      <th className="p-3">Documento</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Stato</th>
                      <th className="p-3">Scadenza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {documenti.filter(d => {
                      const matchesSearch = !searchQuery || d.app.toLowerCase().includes(searchQuery.toLowerCase()) || d.sap.includes(searchQuery);
                      const matchesApp = !searchFilters.app || d.app === searchFilters.app;
                      return matchesSearch && matchesApp;
                    }).slice(0, 4).map((d, i) => (
                      <tr key={i} className="hover:bg-white/2 transition-colors cursor-pointer group" onClick={() => prefillFromAlert(d)}>
                        <td className="p-3 text-[11px] text-[#378ADD] font-mono font-bold">{d.sap}</td>
                        <td className="p-3 text-[11px] font-bold text-[#8ab0c8]">{d.app}</td>
                        <td className="p-3 text-[11px] text-[#8ab0c8]">{d.doc}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#534AB7]/10 text-[#a89ef8] border border-[#534AB7]/20">Da Autorizzare</span>
                        </td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                            d.esito === 'Conforme' ? "bg-[#1D9E75]/10 text-[#5DCAA5]" : "bg-[#E24B4A]/10 text-[#f09595]"
                          )}>
                            {d.esito}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-[#4a6a8a] font-mono">{fmtDate(d.scad)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="h-px bg-white/5 my-6" />
            </div>
          )}

          {/* SECTION 1: ANAGRAFICA */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest border-b border-white/5 pb-2">Anagrafica Controllo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 group relative">
                <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                  Appaltatore <span className="text-[#E24B4A]">*</span> 
                  <div className="relative group/tooltip">
                    <Info size={14} className="text-[#534AB7] cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                      Seleziona dalla lista o clicca + Nuovo.
                    </div>
                  </div>
                </label>
                {!isNewApp ? (
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <select 
                      value={selectedApp}
                      onChange={(e) => setSelectedApp(e.target.value)}
                      className="h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#534AB7]/60 transition-all cursor-pointer shadow-inner w-full"
                    >
                      <option value="">Seleziona appaltatore...</option>
                      {customAppaltatori.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <button 
                      onClick={() => setIsNewApp(true)}
                      className="h-11 px-4 bg-[#534AB7]/15 border border-[#534AB7]/35 rounded-xl text-[#a89ef8] text-xs font-bold hover:bg-[#534AB7]/25 transition-all whitespace-nowrap"
                    >
                      + Nuovo
                    </button>
                    <button 
                      onClick={() => selectedApp && handleRemoveApp(selectedApp)}
                      className="h-11 px-4 bg-[#E24B4A]/10 border border-[#E24B4A]/30 rounded-xl text-[#f09595] hover:bg-[#E24B4A]/20 transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                      <input 
                        type="text" 
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        placeholder="Ragione sociale" 
                        className="h-11 bg-[#0b1a2e] border border-[#F5A800]/40 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#F5A800]/60 transition-all shadow-inner w-full"
                      />
                      <button 
                        onClick={() => {
                          if (newAppName.trim()) {
                            const upper = newAppName.toUpperCase();
                            if (!customAppaltatori.includes(upper)) {
                              setCustomAppaltatori(prev => [...prev, upper]);
                            }
                            setSelectedApp(upper);
                            setIsNewApp(false);
                            setNewAppName('');
                          }
                        }}
                        className="h-11 px-4 bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-xl text-[#5DCAA5] text-xs font-bold hover:bg-[#1D9E75]/25 transition-all flex items-center gap-2"
                      >
                        <Check size={16} /> Aggiungi
                      </button>
                      <button 
                        onClick={() => setIsNewApp(false)}
                        className="h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-[#4a6a8a] text-xs font-bold hover:bg-white/10 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {newAppName.trim() && (
                      <div className="text-[10px] text-[#5DCAA5] bg-[#1D9E75]/10 rounded-lg px-3 py-1.5 border border-[#1D9E75]/20 font-medium flex items-center gap-2">
                        <Check size={12} /> Nuovo appaltatore — verra registrato al salvataggio
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                  ID SAP Contratto <span className="text-[#E24B4A]">*</span>
                  <div className="relative group/tooltip">
                    <Info size={14} className="text-[#534AB7] cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                      Codice numerico univoco del contratto SAP (es. 3510002364).
                    </div>
                  </div>
                </label>
                <input 
                  type="text" 
                  value={sapContratto}
                  onChange={(e) => setSapContratto(e.target.value)}
                  placeholder="es. 3510002364" 
                  className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#534AB7]/60 transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                  Data Inizio Contratto
                  <div className="relative group/tooltip">
                    <Info size={14} className="text-[#534AB7] cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                      Data di inizio formale del contratto con l'appaltatore.
                    </div>
                  </div>
                </label>
                <input 
                  type="date" 
                  value={dataInizio}
                  onChange={(e) => setDataInizio(e.target.value)}
                  className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#534AB7]/60 transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                  Responsabile Controllo <span className="text-[#E24B4A]">*</span>
                  <div className="relative group/tooltip">
                    <Info size={14} className="text-[#534AB7] cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                      Membro del team PSER responsabile di questo controllo.
                    </div>
                  </div>
                </label>
                {!isNewResp ? (
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <select 
                      value={responsabile}
                      onChange={(e) => setResponsabile(e.target.value)}
                      className="h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#534AB7]/60 transition-all cursor-pointer shadow-inner w-full"
                    >
                      <option value="">Seleziona responsabile...</option>
                      {customResponsabili.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button 
                      onClick={() => setIsNewResp(true)}
                      className="h-11 px-4 bg-[#534AB7]/15 border border-[#534AB7]/35 rounded-xl text-[#a89ef8] text-xs font-bold hover:bg-[#534AB7]/25 transition-all whitespace-nowrap"
                    >
                      + Nuovo
                    </button>
                    <button 
                      onClick={() => responsabile && handleRemoveResp(responsabile)}
                      className="h-11 px-4 bg-[#E24B4A]/10 border border-[#E24B4A]/30 rounded-xl text-[#f09595] hover:bg-[#E24B4A]/20 transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <input 
                      type="text" 
                      value={newRespName}
                      onChange={(e) => setNewRespName(e.target.value)}
                      placeholder="Nome e cognome" 
                      className="h-11 bg-[#0b1a2e] border border-[#F5A800]/40 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#F5A800]/60 transition-all shadow-inner w-full"
                    />
                    <button 
                      onClick={() => {
                        if (newRespName.trim()) {
                          if (!customResponsabili.includes(newRespName)) {
                            setCustomResponsabili(prev => [...prev, newRespName]);
                          }
                          setResponsabile(newRespName);
                          setIsNewResp(false);
                          setNewRespName('');
                        }
                      }}
                      className="h-11 px-4 bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-xl text-[#5DCAA5] text-xs font-bold hover:bg-[#1D9E75]/25 transition-all flex items-center gap-2"
                    >
                      <Check size={16} /> Aggiungi
                    </button>
                    <button 
                      onClick={() => setIsNewResp(false)}
                      className="h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-[#4a6a8a] text-xs font-bold hover:bg-white/10 transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: DOCUMENTO */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest border-b border-white/5 pb-2">Documento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                  Tipologia Documento <span className="text-[#E24B4A]">*</span>
                  <div className="relative group/tooltip">
                    <Info size={14} className="text-[#534AB7] cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                      Raggruppati per categoria: Contrattuale, Amministrativo, Sicurezza, HSE, Compliance.
                    </div>
                  </div>
                </label>
                <select 
                  value={tipoDoc}
                  onChange={(e) => setTipoDoc(e.target.value)}
                  className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#534AB7]/60 transition-all cursor-pointer shadow-inner"
                >
                  <optgroup label="Contrattuale" className="bg-[#0b1a2e]">
                    <option>Verifica Subappalto</option>
                    <option>Modulo richiesta subappalto</option>
                    <option>Dichiarazione Compliance</option>
                    <option>Clausole contrattuali</option>
                    <option>Copia contratto subappalto</option>
                    <option>Allegati Contrattuali</option>
                  </optgroup>
                  <optgroup label="Amministrativo" className="bg-[#0b1a2e]">
                    <option>DURC</option>
                    <option>Dichiarazione CCIAA</option>
                    <option>Certificato CCIAA</option>
                    <option>White List</option>
                    <option>Autocertificazione Pagamento Lavoratori</option>
                    <option>Autodichiarazione Regolarità Retribitiva</option>
                    <option>Antimafia</option>
                    <option>Visura Camerale</option>
                    <option>Protocollo NPA</option>
                    <option>Protocollo di Legalità</option>
                  </optgroup>
                  <optgroup label="Sicurezza" className="bg-[#0b1a2e]">
                    <option>DUVRI / PSC / POS</option>
                    <option>Idoneità tecnico professionale</option>
                    <option>Dichiarazione art 14 Dlgs 81</option>
                    <option>DSAN</option>
                  </optgroup>
                  <optgroup label="HSE" className="bg-[#0b1a2e]">
                    <option>Lista referenze</option>
                    <option>Capacità organizzativa</option>
                    <option>Formazione sicurezza</option>
                    <option>DVR</option>
                    <option>Indice infortuni</option>
                    <option>ISO 9001</option>
                    <option>ISO 14001</option>
                    <option>Polizza RC</option>
                    <option>SOA</option>
                  </optgroup>
                  <optgroup label="Compliance" className="bg-[#0b1a2e]">
                    <option>Verifica rischio controparte</option>
                    <option>Parti correlate</option>
                    <option>Liste di riferimento</option>
                    <option>Verifica Fonti Aperte</option>
                  </optgroup>
                  <optgroup label="Altro" className="bg-[#0b1a2e]">
                    <option>Altro</option>
                  </optgroup>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                  Riferimento Documento
                  <div className="relative group/tooltip">
                    <Info size={14} className="text-[#534AB7] cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                      Numero protocollo o link al documento. Facoltativo.
                    </div>
                  </div>
                </label>
                <input 
                  type="text" 
                  value={riferimento}
                  onChange={(e) => setRiferimento(e.target.value)}
                  placeholder="es. Prot. 2026/0042" 
                  className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#534AB7]/60 transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                  Data Verifica <span className="text-[#E24B4A]">*</span>
                  <div className="relative group/tooltip">
                    <Info size={14} className="text-[#534AB7] cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                      Data in cui è stata effettuata la verifica.
                    </div>
                  </div>
                </label>
                <input 
                  type="date" 
                  value={dataVerifica}
                  onChange={(e) => setDataVerifica(e.target.value)}
                  className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#534AB7]/60 transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                  Data Fine Validità <span className="text-[#E24B4A]">*</span>
                  <div className="relative group/tooltip">
                    <Info size={14} className="text-[#534AB7] cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                      Data di scadenza del documento.
                    </div>
                  </div>
                </label>
                <input 
                  type="date" 
                  value={dataFine}
                  onChange={(e) => setDataFine(e.target.value)}
                  className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#534AB7]/60 transition-all shadow-inner"
                />
              </div>
            </div>
            {diffGiorni !== null && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-3 rounded-xl text-xs font-bold flex items-center gap-3 shadow-lg",
                  diffGiorni < 0 ? "bg-[#E24B4A]/15 text-[#f09595] border border-[#E24B4A]/30" : diffGiorni <= 30 ? "bg-[#F5A800]/15 text-[#F5A800] border border-[#F5A800]/30" : "bg-[#1D9E75]/15 text-[#5DCAA5] border border-[#1D9E75]/30"
                )}
              >
                <Clock size={16} />
                {diffGiorni < 0 ? `Scaduto da ${Math.abs(diffGiorni)} giorni dalla verifica` : diffGiorni === 0 ? 'Scade oggi' : `Scade tra ${diffGiorni} giorni dalla verifica`}
              </motion.div>
            )}
          </div>

          {/* SECTION 3: VERIFICA */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest border-b border-white/5 pb-2">Verifica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                  Esito Verifica <span className="text-[#E24B4A]">*</span>
                  <div className="relative group/tooltip">
                    <Info size={14} className="text-[#534AB7] cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                      Conforme / Non Conforme / Richiesta Informazioni / Da Autorizzare / In Verifica.
                    </div>
                  </div>
                </label>
                <select 
                  value={esito}
                  onChange={(e) => setEsito(e.target.value)}
                  className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#534AB7]/60 transition-all cursor-pointer shadow-inner"
                >
                  <option value="">Seleziona esito...</option>
                  <option>Conforme</option>
                  <option>Non Conforme</option>
                  <option>Richiesta Informazioni</option>
                  <option>Da Autorizzare</option>
                  <option>In Verifica</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                  Stato Intervento
                  <div className="relative group/tooltip">
                    <Info size={14} className="text-[#534AB7] cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                      Calcolato automaticamente da Date ed Esito.
                    </div>
                  </div>
                </label>
                <div 
                  className="h-11 bg-[#0b1a2e] border border-white/5 rounded-xl flex items-center px-4 text-xs font-bold shadow-inner"
                  style={{ color: statoIntervento.color }}
                >
                  {statoIntervento.text}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                Termine Adeguamento
                <div className="relative group/tooltip">
                  <Info size={14} className="text-[#534AB7] cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                    Giorni predefiniti o manuali. Data Verifica + giorni scelti.
                  </div>
                </div>
              </label>
              <div className="flex gap-2 flex-wrap">
                {[30, 60, 90, 120, 180].map(d => (
                  <button 
                    key={d}
                    type="button"
                    onClick={() => setGiorniAdeguamento(d)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[11px] font-bold border transition-all shadow-sm",
                      giorniAdeguamento === d ? "bg-[#534AB7] border-[#534AB7] text-[#e8e6f8] shadow-[#534AB7]/20" : "bg-[#534AB7]/10 border-[#534AB7]/20 text-[#a89ef8] hover:bg-[#534AB7]/20"
                    )}
                  >
                    {d} gg
                  </button>
                ))}
              </div>
              <input 
                type="number" 
                value={giorniAdeguamento}
                onChange={(e) => setGiorniAdeguamento(e.target.value ? Number(e.target.value) : '')}
                placeholder="oppure inserisci giorni manualmente..." 
                className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm px-4 outline-none focus:border-[#534AB7]/60 transition-all shadow-inner"
              />
              {termineAdeguamento ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs text-[#a89ef8] font-bold p-3 bg-[#534AB7]/10 border border-[#534AB7]/25 rounded-xl flex items-center gap-3 shadow-lg"
                >
                  <Calendar size={16} />
                  {format(termineAdeguamento, 'EEEE d MMMM yyyy', { locale: it })}
                </motion.div>
              ) : (
                <div className="text-[10px] text-[#3a5a7a] italic px-1">
                  Seleziona i giorni per calcolare il termine
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: PRIORITA & NOTE */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest border-b border-white/5 pb-2">Priorità & Note</h3>
            <div className="space-y-3">
              <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                Priorità Intervento
                <div className="relative group/tooltip">
                  <Info size={14} className="text-[#534AB7] cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                    Alta (5 stelle): urgente entro 24-48h. Media (3 stelle): entro la settimana. Bassa (1 stella): monitoraggio ordinario.
                  </div>
                </div>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'Alta', label: '🔴 Alta', color: 'bg-[#E24B4A]/20 border-[#E24B4A]/40 text-[#f09595]', baseStars: 5 },
                  { id: 'Media', label: '🟡 Media', color: 'bg-[#F5A800]/15 border-[#F5A800]/35 text-[#F5A800]', baseStars: 3 },
                  { id: 'Bassa', label: '🟢 Bassa', color: 'bg-[#1D9E75]/15 border-[#1D9E75]/35 text-[#5DCAA5]', baseStars: 1 },
                ].map(p => (
                  <div
                    key={p.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all text-center group/prio shadow-lg cursor-pointer",
                      priorita === p.id ? p.color : "bg-white/3 border-white/10 text-[#4a6a8a] hover:border-white/20"
                    )}
                    onClick={() => {
                      setPriorita(p.id as any);
                      setStelle(p.baseStars);
                    }}
                  >
                    <div className="text-[11px] font-bold mb-2 uppercase tracking-wider">{p.label}</div>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star 
                          key={s} 
                          size={14} 
                          onMouseEnter={() => {
                            setHoverStelle(s);
                            setHoverPriorita(p.id);
                          }}
                          onMouseLeave={() => {
                            setHoverStelle(0);
                            setHoverPriorita(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStelle(s);
                            setPriorita(p.id as any);
                          }}
                          className={cn(
                            "transition-all duration-200 cursor-pointer",
                            (hoverPriorita === p.id ? s <= hoverStelle : (priorita === p.id && s <= stelle))
                              ? "fill-[#F5A800] scale-125 text-[#F5A800]" 
                              : "opacity-20 hover:opacity-50"
                          )} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[11px] text-[#4a6a8a] font-bold flex items-center gap-2">
                Note Operative
                <div className="relative group/tooltip">
                  <Info size={14} className="text-[#534AB7] cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#162840] border border-[#534AB7]/40 rounded-xl text-[11px] text-[#a0b8d0] leading-relaxed shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                    Annotazioni libere. Ogni salvataggio aggiunge una riga allo storico con timestamp e nome utente.
                  </div>
                </div>
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { text: 'Email inviata', icon: Mail, color: 'text-[#a89ef8] bg-[#534AB7]/10 border-[#534AB7]/25' },
                  { text: 'Doc. ricevuta', icon: Check, color: 'text-[#5DCAA5] bg-[#1D9E75]/10 border-[#1D9E75]/25' },
                  { text: 'Sollecito', icon: Clock, color: 'text-[#F5A800] bg-[#F5A800]/10 border-[#F5A800]/25' },
                  { text: 'Non conforme', icon: X, color: 'text-[#f09595] bg-[#E24B4A]/10 border-[#E24B4A]/25' },
                  { text: 'Verifica OK', icon: ClipboardCheck, color: 'text-[#378ADD] bg-[#378ADD]/10 border-[#378ADD]/25' },
                ].map(s => (
                  <button 
                    key={s.text}
                    type="button"
                    onClick={() => addSuggNote(s.text)}
                    className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-2 hover:opacity-80 transition-all shadow-sm", s.color)}
                  >
                    <s.icon size={12} /> {s.text}
                  </button>
                ))}
              </div>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Inserisci note, comunicazioni, azioni intraprese..."
                className="w-full min-h-[120px] bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm p-4 outline-none focus:border-[#534AB7]/60 transition-all resize-y shadow-inner leading-relaxed"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-white/5">
            <button 
              onClick={handleSave}
              className="flex-1 h-12 bg-gradient-to-r from-[#534AB7] to-[#6358cc] text-[#e8e6f8] rounded-xl text-sm font-bold shadow-xl shadow-[#534AB7]/20 hover:shadow-[#534AB7]/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
            >
              <Download size={20} /> Salva Controllo
            </button>
            <button 
              onClick={() => {
                setSelectedApp('');
                setSapContratto('');
                setDataInizio('');
                setRiferimento('');
                setDataFine('');
                setNote('');
                setGiorniAdeguamento('');
              }}
              className="h-12 px-6 bg-white/5 border border-white/10 rounded-xl text-[#4a6a8a] text-sm font-bold hover:bg-white/10 hover:text-[#8ab0c8] transition-all shadow-lg"
            >
              <X size={20} /> Pulisci Form
            </button>
          </div>
        </motion.div>

        {/* RIGHT PANEL */}
        <div className="space-y-6">
          {/* DONUT CHART */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#0f2035] border border-white/5 rounded-2xl p-6 shadow-xl group/chart"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-[#ddeeff] uppercase tracking-widest">Distribuzione Stati</h3>
              <div className="flex items-center gap-3">
                {selectedApp && <span className="text-[10px] text-[#534AB7] font-bold bg-[#534AB7]/10 px-2 py-1 rounded-lg border border-[#534AB7]/20 truncate max-w-[100px]">{selectedApp}</span>}
                <button onClick={() => setSelectedApp('')} className="text-[10px] text-[#4a6a8a] hover:text-[#8ab0c8] flex items-center gap-1">
                  <X size={10} /> Reset
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="relative w-32 h-32 flex items-center justify-center group/donut">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                  <circle 
                    cx="50" cy="50" r="40" fill="transparent" stroke="#F5A800" strokeWidth="12" 
                    strokeDasharray={`${(stats[2].val / (stats[0].val || 1)) * 251.2} 251.2`}
                    className="transition-all duration-1000"
                  />
                  <circle 
                    cx="50" cy="50" r="40" fill="transparent" stroke="#378ADD" strokeWidth="12" 
                    strokeDasharray={`${(stats[4].val / (stats[0].val || 1)) * 251.2} 251.2`}
                    strokeDashoffset={`${-((stats[2].val) / (stats[0].val || 1)) * 251.2}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-[#ddeeff]">{stats[0].val}</div>
                  <div className="text-[8px] text-[#3a5a7a] font-bold uppercase tracking-tighter">Totale</div>
                </div>
                
                {/* TOOLTIP ALLEGATO 3 STYLE */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 bg-[#162840] border border-[#534AB7]/40 rounded-xl p-3 shadow-2xl opacity-0 group-hover/donut:opacity-100 transition-all pointer-events-none z-50">
                  <div className="text-[11px] font-bold text-[#F5A800] mb-1">In Scadenza</div>
                  <div className="text-xs text-[#ddeeff] mb-1">{stats[2].val} documenti ({Math.round((stats[2].val / (stats[0].val || 1)) * 100)}%)</div>
                  <div className="text-[10px] text-[#4a6a8a] leading-tight">Documenti in scadenza entro 30 giorni.</div>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {[
                  { label: 'Inviata', val: stats[0].val, color: 'bg-[#F5A800]' },
                  { label: 'Attivata', val: stats[1].val, color: 'bg-[#378ADD]' },
                  { label: 'Autorizzata', val: stats[4].val, color: 'bg-[#1D9E75]' },
                  { label: 'Rigettata', val: stats[3].val, color: 'bg-[#E24B4A]' },
                  { label: 'In Attesa SAP', val: 1, color: 'bg-[#534AB7]' },
                  { label: 'Richiesta Info', val: 1, color: 'bg-[#F5A800]' },
                ].map((l, i) => (
                  <div key={i} className="flex items-center justify-between group/legend">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", l.color)} />
                      <span className="text-[10px] text-[#8ab0c8] group-hover/legend:text-[#ddeeff] transition-colors">{l.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#4a6a8a]">{l.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ALERT CRITICITA */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0f2035] border border-white/5 rounded-2xl p-5 shadow-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest">Alert {selectedApp ? 'Appaltatore' : 'Criticità'}</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowAllAlerts(!showAllAlerts)} className="text-[10px] text-[#534AB7] font-bold hover:underline flex items-center gap-1">
                  <Search size={10} /> {showAllAlerts ? 'Riduci' : 'Vedi tutti'}
                </button>
                <button onClick={() => setShowEmailModal(true)} className="text-[10px] text-[#F5A800] font-bold hover:underline flex items-center gap-1">
                  <Mail size={10} /> Email
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {documenti
                .filter(d => d.esito === 'Non Conforme' && (!selectedApp || d.app === selectedApp))
                .slice(0, showAllAlerts ? 99 : 4)
                .map((d, i) => (
                <div 
                  key={i} 
                  onClick={() => prefillFromAlert(d)}
                  className="p-3 bg-[#E24B4A]/5 border border-[#E24B4A]/20 rounded-xl space-y-1 cursor-pointer hover:bg-[#E24B4A]/10 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold text-[#f09595] group-hover:text-[#E24B4A] transition-colors">{d.doc}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} size={8} className={cn(s <= (d.prio === 'Alta' ? 5 : d.prio === 'Media' ? 3 : 1) ? "fill-[#E24B4A] text-[#E24B4A]" : "text-white/10")} />)}
                    </div>
                  </div>
                  <div className="text-[10px] text-[#8ab0c8]">{d.app}</div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-[9px] text-[#4a6a8a] italic">Scadenza: {fmtDate(d.scad)}</div>
                    <div className="text-[9px] font-bold text-[#E24B4A] uppercase tracking-tighter">{d.prio}</div>
                  </div>
                </div>
              ))}
              {documenti.filter(d => d.esito === 'Non Conforme' && (!selectedApp || d.app === selectedApp)).length === 0 && (
                <div className="text-center py-4 text-[11px] text-[#3a5a7a] italic">Nessuna criticità rilevata</div>
              )}
            </div>
          </motion.div>

          {/* STORICO NOTE */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#0f2035] border border-white/5 rounded-2xl p-5 shadow-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest">Storico Note</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowNotesModal(true)} className="text-[10px] text-[#534AB7] font-bold hover:underline">Vedi tutte</button>
                <button className="text-[10px] text-[#1D9E75] font-bold hover:underline flex items-center gap-1">
                  <Download size={10} /> Export
                </button>
              </div>
            </div>
            <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
              {documenti.filter(d => d.nota).slice(0, 3).map((d, i) => (
                <div key={i} className="pl-6 relative">
                  <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-[#0f2035] border-2 border-[#534AB7] z-10" />
                  <div className="text-[10px] font-bold text-[#8ab0c8] mb-1">{d.ts} - {d.utente}</div>
                  <div className="text-[11px] text-[#4a6a8a] line-clamp-2 leading-relaxed">{d.nota}</div>
                </div>
              ))}
              {documenti.filter(d => d.nota).length === 0 && (
                <div className="text-center py-4 text-[11px] text-[#3a5a7a] italic">Nessuna nota presente</div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* BOTTOM TABLE (FILTERED BY KPI) */}
      <AnimatePresence>
        {selectedKpi && (
          <motion.div 
            ref={tableRef}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="mt-8 bg-[#0f2035] border border-[#534AB7]/30 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#0f2035] to-[#162840]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#534AB7]/20 flex items-center justify-center text-[#a89ef8]">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#ddeeff]">Dettaglio {selectedKpi}</h2>
                  <p className="text-[10px] text-[#4a6a8a]">Visualizzazione filtrata dei documenti</p>
                </div>
              </div>
              <button onClick={() => setSelectedKpi(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#4a6a8a] hover:bg-white/10 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest">
                    <th className="p-4">Appaltatore</th>
                    <th className="p-4">Documento</th>
                    <th className="p-4">Esito</th>
                    <th className="p-4">Scadenza</th>
                    <th className="p-4">Priorità</th>
                    <th className="p-4">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTableDocs.map((d, i) => (
                    <tr key={i} className="hover:bg-white/2 transition-colors group">
                      <td className="p-4 text-xs font-bold text-[#8ab0c8]">{d.app}</td>
                      <td className="p-4 text-xs text-[#8ab0c8]">{d.doc}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                          d.esito === 'Conforme' ? "bg-[#1D9E75]/15 text-[#5DCAA5]" : "bg-[#E24B4A]/15 text-[#f09595]"
                        )}>
                          {d.esito}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-[#4a6a8a] font-mono">{fmtDate(d.scad)}</td>
                      <td className="p-4">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} size={10} className={cn(s <= (d.prio === 'Alta' ? 5 : d.prio === 'Media' ? 3 : 1) ? "fill-[#F5A800] text-[#F5A800]" : "text-white/10")} />)}
                        </div>
                      </td>
                      <td className="p-4">
                        <button onClick={() => prefillFromAlert(d)} className="p-2 rounded-lg bg-[#534AB7]/10 text-[#a89ef8] hover:bg-[#534AB7]/20 transition-all">
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTableDocs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#4a6a8a] italic">Nessun documento trovato per questa categoria</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* AI ASSISTANT PANEL */}
      <AnimatePresence>
        {showAI && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-28 right-8 w-80 bg-[#0f2035] border border-[#534AB7]/40 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="bg-gradient-to-r from-[#534AB7] to-[#378ADD] p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-widest">PSER-AI</div>
                  <div className="text-[10px] text-white/70">Assistente Documentale</div>
                </div>
              </div>
              <button onClick={() => setShowAI(false)} className="text-white/60 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 h-80 overflow-y-auto p-4 space-y-4 bg-[#07101e]/50">
              {aiMessages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed",
                    m.role === 'user' ? "bg-[#534AB7] text-white rounded-tr-none shadow-lg shadow-[#534AB7]/20" : "bg-[#162840] text-[#c8ddf0] rounded-tl-none border border-white/5"
                  )}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-white/5 bg-[#0f2035]">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendAI()}
                  placeholder="Chiedi aiuto..." 
                  className="flex-1 h-10 bg-[#07101e] border border-white/10 rounded-xl px-4 text-xs text-[#c8ddf0] outline-none focus:border-[#534AB7]/60"
                />
                <button 
                  onClick={handleSendAI}
                  className="w-10 h-10 bg-[#534AB7] text-white rounded-xl flex items-center justify-center hover:bg-[#6358cc] transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI ASSISTANT BUTTON */}
      <button 
        onClick={() => setShowAI(!showAI)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-[#534AB7] to-[#378ADD] rounded-full flex items-center justify-center text-white shadow-2xl shadow-[#534AB7]/40 hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <div className="absolute -top-12 right-0 bg-[#162840] border border-[#534AB7]/40 rounded-xl px-4 py-2 text-[11px] text-[#ddeeff] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl">
          Hai bisogno di aiuto? Chiedi a PSER-AI
        </div>
        <Bot size={28} className={cn("transition-transform duration-500", showAI ? "rotate-12" : "")} />
        <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20" />
      </button>

      {/* MODALS (ARCHIVIO, EMAIL, ALERTS, NOTES, DELETE CONFIRM) */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f2035] border border-[#E24B4A]/40 rounded-3xl p-8 max-w-sm w-full relative z-10 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-[#E24B4A]/10 flex items-center justify-center text-[#E24B4A] mx-auto">
                <AlertTriangle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#ddeeff]">Messaggio di Sicurezza</h3>
                <p className="text-sm text-[#4a6a8a]">Sei sicuro di voler rimuovere <span className="text-[#f09595] font-bold">{showDeleteConfirm.name}</span> dalla lista? Questa azione non può essere annullata.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl text-[#4a6a8a] text-sm font-bold hover:bg-white/10 transition-all"
                >
                  Annulla
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 h-12 bg-[#E24B4A] text-white rounded-xl text-sm font-bold hover:bg-[#f25c5c] transition-all shadow-lg shadow-[#E24B4A]/20"
                >
                  Conferma
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showArchivioModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowArchivioModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0f2035] border border-[#534AB7]/40 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#0f2035] to-[#162840]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#1D9E75]/20 flex items-center justify-center text-[#5DCAA5]">
                    <Archive size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#ddeeff]">Archivio Appaltatore</h2>
                    <p className="text-xs text-[#3a5a7a]">Consulta lo storico completo dei controlli</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleExportCSV}
                    className="h-10 px-4 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-xl text-[#5DCAA5] text-xs font-bold flex items-center gap-2 hover:bg-[#1D9E75]/20 transition-all"
                  >
                    <Download size={14} /> CSV
                  </button>
                  <button 
                    onClick={() => {
                      setArchivioSearch('');
                      setArchivioAppFilter('');
                      setArchivioEsitoFilter('Tutti gli esiti');
                    }}
                    className="h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-[#4a6a8a] text-xs font-bold hover:bg-white/10 transition-all"
                  >
                    Reset
                  </button>
                  <button onClick={() => setShowArchivioModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#4a6a8a] hover:bg-white/10 hover:text-[#ddeeff] transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3a5a7a]" />
                    <input 
                      type="text" 
                      value={archivioSearch}
                      onChange={(e) => setArchivioSearch(e.target.value)}
                      placeholder="Cerca documento..." 
                      className="w-full h-11 pl-11 pr-4 bg-[#07101e] border border-white/10 rounded-xl text-[#c8ddf0] text-xs outline-none focus:border-[#534AB7]/60 shadow-inner"
                    />
                  </div>
                  <select 
                    value={archivioAppFilter}
                    onChange={(e) => setArchivioAppFilter(e.target.value)}
                    className="h-11 bg-[#07101e] border border-white/10 rounded-xl text-[#c8ddf0] text-xs px-4 outline-none focus:border-[#534AB7]/60 shadow-inner"
                  >
                    <option value="">Tutti gli appaltatori</option>
                    {filteredAppaltatori.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <select 
                    value={archivioEsitoFilter}
                    onChange={(e) => setArchivioEsitoFilter(e.target.value)}
                    className="h-11 bg-[#07101e] border border-white/10 rounded-xl text-[#c8ddf0] text-xs px-4 outline-none focus:border-[#534AB7]/60 shadow-inner"
                  >
                    <option>Tutti gli esiti</option>
                    <option>Conforme</option>
                    <option>Non Conforme</option>
                    <option>Richiesta Informazioni</option>
                    <option>Da Autorizzare</option>
                    <option>In Verifica</option>
                  </select>
                </div>
                <div className="border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest">
                        <th className="p-4">ID SAP</th>
                        <th className="p-4">Appaltatore</th>
                        <th className="p-4">Documento</th>
                        <th className="p-4">Esito</th>
                        <th className="p-4">Scadenza</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredArchivio.map((d, i) => (
                        <tr key={i} className="hover:bg-white/2 transition-colors group cursor-pointer" onClick={() => prefillFromAlert(d)}>
                          <td className="p-4 text-xs text-[#378ADD] font-mono font-bold">{d.sap}</td>
                          <td className="p-4 text-xs font-bold text-[#8ab0c8]">{d.app}</td>
                          <td className="p-4 text-xs text-[#8ab0c8]">{d.doc}</td>
                          <td className="p-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider",
                              d.esito === 'Conforme' ? "bg-[#1D9E75]/15 text-[#5DCAA5]" : d.esito === 'Non Conforme' ? "bg-[#E24B4A]/15 text-[#f09595]" : "bg-[#F5A800]/15 text-[#F5A800]"
                            )}>
                              {d.esito}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-[#4a6a8a] font-mono">{fmtDate(d.scad)}</td>
                        </tr>
                      ))}
                      {filteredArchivio.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-[#3a5a7a] italic">Nessun record trovato</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="text-[10px] text-[#3a5a7a] font-bold uppercase tracking-widest text-right">{filteredArchivio.length} record trovati</div>
              </div>
            </motion.div>
          </div>
        )}

        {showEmailModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmailModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0f2035] border border-[#534AB7]/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#534AB7]/20 flex items-center justify-center text-[#a89ef8]">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#ddeeff]">Generatore Alert Email/PEC</h2>
                    <p className="text-xs text-[#3a5a7a]">Invia un sollecito formale all'appaltatore</p>
                  </div>
                </div>
                <button onClick={() => setShowEmailModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#4a6a8a] hover:bg-white/10 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="p-6 bg-[#07101e] border border-white/5 rounded-2xl space-y-6 shadow-inner">
                  <div className="space-y-4 text-xs text-[#c8ddf0] font-mono leading-relaxed">
                    <p>Oggetto: Sollecito documentazione — PSER</p>
                    <p>Egregio {selectedApp || '[Appaltatore]'},</p>
                    <p>comunichiamo le seguenti criticità documentali:</p>
                    <ul className="space-y-2 list-none">
                      <li>— {tipoDoc} (Scaduto da {Math.abs(safeDiff(dataFine || today, today))} giorni)</li>
                      <li>— DURC (Scade tra 4 giorni)</li>
                      <li>— Certificato CCIAA (Scade tra 18 giorni)</li>
                    </ul>
                    <p>Si richiede di procedere con urgenza.</p>
                    <div className="pt-4 border-t border-white/5">
                      <p>Cordiali saluti,</p>
                      <p className="font-bold text-[#ddeeff]">{user?.name || 'Pietro De Vito'} — PSER</p>
                      <p className="text-[#4a6a8a]">Data: {format(new Date(), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button className="h-12 bg-[#534AB7] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#6358cc] transition-all shadow-lg shadow-[#534AB7]/20">
                    <Mail size={16} /> Invia via Outlook
                  </button>
                  <button className="h-12 bg-[#378ADD] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#479ae6] transition-all shadow-lg shadow-[#378ADD]/20">
                    <ShieldCheck size={16} /> Invia via PEC
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showAlertsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAlertsModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0f2035] border border-[#E24B4A]/40 rounded-3xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#E24B4A]/20 flex items-center justify-center text-[#f09595]">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#ddeeff]">Alert — {selectedApp || 'Tutti gli Appaltatori'}</h2>
                    <p className="text-xs text-[#3a5a7a]">Documenti non conformi o in scadenza</p>
                  </div>
                </div>
                <button onClick={() => setShowAlertsModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#4a6a8a] hover:bg-white/10 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest">
                        <th className="p-4">Documento</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4">Scadenza</th>
                        <th className="p-4">Stato</th>
                        <th className="p-4">Giorni</th>
                        <th className="p-4">Priorità</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {documenti.filter(d => d.esito === 'Non Conforme' && (!selectedApp || d.app === selectedApp)).map((d, i) => {
                        const diff = safeDiff(d.scad, today);
                        return (
                          <tr key={i} className="hover:bg-white/2 transition-colors group cursor-pointer" onClick={() => prefillFromAlert(d)}>
                            <td className="p-4 text-xs font-bold text-[#ddeeff]">{d.doc}</td>
                            <td className="p-4 text-xs text-[#4a6a8a]">Sicurezza</td>
                            <td className="p-4 text-xs text-[#8ab0c8] font-mono">{fmtDate(d.scad)}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E24B4A]/10 text-[#f09595] border border-[#E24B4A]/20">Scaduto</span>
                            </td>
                            <td className="p-4 text-xs font-bold text-[#E24B4A] font-mono">{diff}gg</td>
                            <td className="p-4">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                d.prio === 'Alta' ? "bg-[#E24B4A]/10 text-[#f09595]" : d.prio === 'Media' ? "bg-[#F5A800]/10 text-[#F5A800]" : "bg-[#1D9E75]/10 text-[#5DCAA5]"
                              )}>
                                {d.prio}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showNotesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotesModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0f2035] border border-[#378ADD]/40 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#0f2035] to-[#162840]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#378ADD]/20 flex items-center justify-center text-[#378ADD]">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#ddeeff]">Storico Note Completo</h2>
                    <p className="text-xs text-[#3a5a7a]">Tutte le annotazioni operative registrate</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="h-10 px-4 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-xl text-[#5DCAA5] text-xs font-bold flex items-center gap-2 hover:bg-[#1D9E75]/20 transition-all">
                    <Download size={14} /> Excel
                  </button>
                  <button className="h-10 px-4 bg-[#E24B4A]/10 border border-[#E24B4A]/30 rounded-xl text-[#f09595] text-xs font-bold flex items-center gap-2 hover:bg-[#E24B4A]/20 transition-all">
                    <FileText size={14} /> PDF
                  </button>
                  <button onClick={() => setShowNotesModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#4a6a8a] hover:bg-white/10 transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                {documenti.filter(d => d.nota).map((d, i) => (
                  <div key={i} className="relative pl-8 before:absolute before:left-3 before:top-2 before:bottom-0 before:w-px before:bg-white/5">
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-[#0f2035] border-2 border-[#378ADD] flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-[#378ADD]" />
                    </div>
                    <div className="bg-white/2 border border-white/5 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="text-xs font-bold text-[#ddeeff]">{d.utente}</div>
                        <div className="text-[10px] text-[#4a6a8a] font-mono">{d.ts}</div>
                      </div>
                      <div className="text-[11px] text-[#8ab0c8] font-bold uppercase tracking-wider">{d.app} - {d.doc}</div>
                      <div className="text-sm text-[#4a6a8a] leading-relaxed italic">"{d.nota}"</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ControlloDocumentale;
