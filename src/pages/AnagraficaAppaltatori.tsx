import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Grid, 
  List as ListIcon, 
  Archive, 
  FileSpreadsheet, 
  X,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  Trash2,
  Download,
  Building2,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Appaltatore } from '../types';
import * as XLSX from 'xlsx';

const SETTORI_PREDEFINITI = [
  'Energia','Ingegneria','Sicurezza','Ambiente','Costruzioni','Servizi',
  'Petrolchimico','Meccanico','Elettrico','Telecomunicazioni','Informatica',
  'Logistica','Consulenza','Chimico','Farmaceutico','Alimentare',
  'Trasporti','Idrico','Nucleare','Minerario'
];

const AnagraficaAppaltatori: React.FC = () => {
  const { appaltatori, subaffidamenti, documenti, addActivity } = useData();
  const { user } = useAuth();
  
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [settoreFilter, setSettoreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAppIdx, setSelectedAppIdx] = useState<number | null>(null);

  const today = new Date();

  const settori = useMemo(() => Array.from(new Set(appaltatori.map(a => a.settore))).sort(), [appaltatori]);

  const getSubStats = (name: string) => {
    const subs = subaffidamenti.filter(d => (d.appaltatore || d.app) === name);
    const attivi = subs.filter(d => d.stato === 'Autorizzata' || d.stato === 'Attivata').length;
    const crit = subs.filter(d => d.stato === 'Rigettata' || d.stato === 'Scaduta').length;
    return { tot: subs.length, attivi, crit };
  };

  const getDocStats = (name: string) => {
    const docs = documenti.filter(d => d.app === name);
    const tot = docs.length;
    const conf = docs.filter(d => d.esito === 'Conforme').length;
    const health = tot ? Math.round((conf / tot) * 100) : 100;
    return { tot, conf, health };
  };

  const filteredAppaltatori = useMemo(() => {
    return appaltatori.filter(a => {
      const matchSearch = !search || (a.nome + a.settore + a.referente + a.sede).toLowerCase().includes(search.toLowerCase());
      const matchSettore = !settoreFilter || a.settore === settoreFilter;
      
      const stats = getSubStats(a.nome);
      const docs = getDocStats(a.nome);
      const matchStatus = !statusFilter || 
        (statusFilter === 'attivo' && stats.attivi > 0) ||
        (statusFilter === 'alert' && docs.health < 70) ||
        (statusFilter === 'critico' && stats.crit > 0);
        
      return matchSearch && matchSettore && matchStatus;
    });
  }, [appaltatori, search, settoreFilter, statusFilter, subaffidamenti, documenti]);

  const selectedApp = selectedAppIdx !== null ? filteredAppaltatori[selectedAppIdx] : null;

  const COLORS = ['#534AB7', '#378ADD', '#1D9E75', '#E24B4A', '#F5A800', '#EF9F27', '#a89ef8', '#5DCAA5', '#85B7EB'];
  const getColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  return (
    <div className="p-5 space-y-5 flex flex-col min-h-screen">
      {/* TOPBAR */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-[#ddeeff] tracking-tight">Anagrafica Appaltatori</h1>
          <p className="text-xs text-[#3a5a7a] mt-1">Registro completo — <span className="text-[#a89ef8] font-semibold">{appaltatori.length}</span> appaltatori attivi nel sistema</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="text-[11px] text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 font-medium">
            {format(today, 'dd MMMM yyyy', { locale: it })}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <div className="w-6.5 h-6.5 rounded-full bg-[#1e3550] flex items-center justify-center text-[10px] text-[#8ab0c8] font-semibold">
              {user?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            {user?.nome}
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Appaltatori totali', val: appaltatori.length, sub: 'in archivio PSER', color: '#378ADD' },
          { label: 'Con pratiche attive', val: appaltatori.filter(a => getSubStats(a.nome).attivi > 0).length, sub: 'Autorizzati / Attivati', color: '#1D9E75' },
          { label: 'Con alert documenti', val: appaltatori.filter(a => getDocStats(a.nome).health < 70).length, sub: 'Scaduti o in scadenza', color: '#F5A800' },
          { label: 'Con pratiche critiche', val: appaltatori.filter(a => getSubStats(a.nome).crit > 0).length, sub: 'Rigettate o scadute', color: '#E24B4A' },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#0f2035] border border-white/5 rounded-xl p-4.5 border-t-2 relative overflow-hidden group cursor-pointer"
            style={{ borderTopColor: s.color }}
          >
            <div className="text-xl font-bold text-[#ddeeff] leading-none" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[10px] text-[#3a5a7a] uppercase tracking-wider mt-2.5 font-bold">{s.label}</div>
            <div className="text-[11px] text-[#3a5a7a] mt-1 opacity-70">{s.sub}</div>
            <div className="absolute bottom-2.5 right-2.5 w-5.5 h-5.5 bg-white/5 border border-white/10 rounded-md flex items-center justify-center text-[10px] text-[#3a5a7a] group-hover:text-[#a89ef8] transition-colors">↗</div>
          </motion.div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a5a7a]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca appaltatore, settore, referente..."
            className="w-full h-10 pl-9 pr-3 bg-[#0f2035] border border-white/10 rounded-xl text-[#c8ddf0] text-sm outline-none focus:border-[#534AB7]/50 transition-all"
          />
        </div>
        <select 
          value={settoreFilter}
          onChange={e => setSettoreFilter(e.target.value)}
          className="h-10 bg-[#0f2035] border border-white/10 rounded-xl text-[#7a9ab8] text-xs px-3.5 outline-none cursor-pointer focus:border-[#534AB7]/50"
        >
          <option value="">Tutti i settori</option>
          {settori.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 bg-[#0f2035] border border-white/10 rounded-xl text-[#7a9ab8] text-xs px-3.5 outline-none cursor-pointer focus:border-[#534AB7]/50"
        >
          <option value="">Tutti gli stati</option>
          <option value="attivo">Con pratiche attive</option>
          <option value="alert">Con alert</option>
          <option value="critico">Con pratiche critiche</option>
        </select>
        <button 
          onClick={() => { setSearch(''); setSettoreFilter(''); setStatusFilter(''); }}
          className="h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-[#7a9ab8] text-xs font-medium hover:bg-white/10 transition-all"
        >
          ↺ Reset
        </button>
        <div className="flex bg-[#0f2035] border border-white/10 rounded-xl p-1">
          <button onClick={() => setView('grid')} className={cn("p-2 rounded-lg transition-all", view === 'grid' ? "bg-[#534AB7]/25 text-[#a89ef8]" : "text-[#3a5a7a] hover:text-[#7a9ab8]")}><Grid size={16} /></button>
          <button onClick={() => setView('list')} className={cn("p-2 rounded-lg transition-all", view === 'list' ? "bg-[#534AB7]/25 text-[#a89ef8]" : "text-[#3a5a7a] hover:text-[#7a9ab8]")}><ListIcon size={16} /></button>
        </div>
        <button className="h-10 px-4.5 bg-[#534AB7] text-[#e8e6f8] rounded-xl text-xs font-bold shadow-lg shadow-[#534AB7]/20 hover:bg-[#6358cc] hover:-translate-y-0.5 transition-all flex items-center gap-2">
          <Plus size={16} /> Nuovo Appaltatore
        </button>
        <button className="h-10 px-4 bg-[#378ADD]/15 border border-[#378ADD]/35 rounded-xl text-[#85B7EB] text-xs font-bold hover:bg-[#378ADD]/25 transition-all flex items-center gap-2">
          <Archive size={16} /> Archivio
        </button>
        <button onClick={() => {
          const rows = filteredAppaltatori.map(a => ({
            Nome: a.nome, Settore: a.settore, Tipo: a.tipo,
            Referente: a.referente, Email: a.email, Telefono: a.tel,
            PIVA: a.piva, Sede: a.sede,
            'Data Inizio': a.dataInizio || '', 'Data Fine': a.dataFine || '',
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Anagrafica');
          XLSX.writeFile(wb, 'anagrafica_appaltatori.xlsx');
        }} className="h-10 px-4 bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-xl text-[#5DCAA5] text-xs font-bold hover:bg-[#1D9E75]/25 transition-all flex items-center gap-2">
          <FileSpreadsheet size={16} /> CSV
        </button>
        <span className="text-[11px] text-[#3a5a7a] ml-auto font-medium">{filteredAppaltatori.length} / {appaltatori.length}</span>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1">
        {filteredAppaltatori.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#3a5a7a] space-y-4">
            <Building2 size={64} className="opacity-20" />
            <div className="text-center">
              <p className="text-base font-medium text-[#7a9ab8]">Nessun appaltatore trovato</p>
              <p className="text-xs">Modifica i filtri o aggiungi un nuovo appaltatore</p>
            </div>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAppaltatori.map((a, i) => {
              const sub = getSubStats(a.nome);
              const docs = getDocStats(a.nome);
              const color = getColor(a.nome);
              const initials = a.nome.split(' ').filter(p => p.length > 2).slice(0, 2).map(n => n[0]).join('').toUpperCase() || a.nome.slice(0, 2);
              
              return (
                <motion.div
                  key={a.nome}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setSelectedAppIdx(i)}
                  className="bg-[#0f2035] border border-white/10 rounded-2xl p-5 cursor-pointer hover:border-[#534AB7]/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-[#534AB7] transition-all duration-500" />
                  
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0" style={{ backgroundColor: `${color}22`, color }}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-[#c8ddf0] truncate group-hover:text-white transition-colors" title={a.nome}>{a.nome}</div>
                      <div className="text-[10px] text-[#3a5a7a] uppercase tracking-wider font-semibold mt-0.5">{a.settore} • {a.tipo}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    <div className="bg-white/3 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-[#378ADD] font-mono leading-none">{sub.tot}</div>
                      <div className="text-[8px] text-[#3a5a7a] uppercase mt-1 font-bold">Sub.</div>
                    </div>
                    <div className="bg-white/3 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-[#1D9E75] font-mono leading-none">{sub.attivi}</div>
                      <div className="text-[8px] text-[#3a5a7a] uppercase mt-1 font-bold">Attivi</div>
                    </div>
                    <div className="bg-white/3 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold font-mono leading-none" style={{ color: docs.health >= 70 ? '#1D9E75' : docs.health >= 40 ? '#F5A800' : '#E24B4A' }}>{docs.health}%</div>
                      <div className="text-[8px] text-[#3a5a7a] uppercase mt-1 font-bold">Conf.</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[9px] font-bold text-[#3a5a7a] uppercase tracking-widest">
                      <span>Salute documentale</span>
                      <span style={{ color: docs.health >= 70 ? '#1D9E75' : docs.health >= 40 ? '#F5A800' : '#E24B4A' }}>{docs.health}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${docs.health}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: docs.health >= 70 ? '#1D9E75' : docs.health >= 40 ? '#F5A800' : '#E24B4A' }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <div className="flex gap-1.5">
                      {sub.attivi > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#1D9E75]/15 text-[#1D9E75] font-bold uppercase">Attivo</span>}
                      {docs.health < 70 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#F5A800]/15 text-[#F5A800] font-bold uppercase">Alert</span>}
                      {sub.crit > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#E24B4A]/15 text-[#E24B4A] font-bold uppercase">Critico</span>}
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-[#3a5a7a] font-medium">{a.referente.split(' ')[0]}</div>
                      {a.dataFine && <div className="text-[8px] text-[#3a5a7a] mt-0.5">Fine: {format(new Date(a.dataFine), 'dd/MM/yy')}</div>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAppaltatori.map((a, i) => {
              const sub = getSubStats(a.nome);
              const docs = getDocStats(a.nome);
              const color = getColor(a.nome);
              const initials = a.nome.split(' ').filter(p => p.length > 2).slice(0, 2).map(n => n[0]).join('').toUpperCase() || a.nome.slice(0, 2);

              return (
                <motion.div
                  key={a.nome}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.01 }}
                  onClick={() => setSelectedAppIdx(i)}
                  className="bg-[#0f2035] border border-white/10 rounded-xl p-3.5 cursor-pointer hover:border-[#534AB7]/30 hover:bg-[#111f38] transition-all flex items-center gap-4 group"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: `${color}22`, color }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#c8ddf0] group-hover:text-white transition-colors truncate">{a.nome}</div>
                    <div className="text-[10px] text-[#3a5a7a] mt-0.5">{a.settore} • {a.sede || '—'}</div>
                  </div>
                  <div className="text-[10px] text-[#7a9ab8] w-32 truncate">{a.referente || '—'}</div>
                  <div className="text-[10px] text-[#5a7a9a] w-24">{a.dataFine ? `Fine: ${format(new Date(a.dataFine), 'dd/MM/yy')}` : '—'}</div>
                  <div className="flex gap-4 items-center">
                    <div className="text-center w-12">
                      <div className="text-sm font-bold text-[#378ADD] font-mono leading-none">{sub.tot}</div>
                      <div className="text-[8px] text-[#3a5a7a] uppercase mt-1">Sub.</div>
                    </div>
                    <div className="text-center w-12">
                      <div className="text-sm font-bold text-[#1D9E75] font-mono leading-none">{sub.attivi}</div>
                      <div className="text-[8px] text-[#3a5a7a] uppercase mt-1">Attivi</div>
                    </div>
                    <div className="text-center w-12">
                      <div className="text-sm font-bold font-mono leading-none" style={{ color: docs.health >= 70 ? '#1D9E75' : docs.health >= 40 ? '#F5A800' : '#E24B4A' }}>{docs.health}%</div>
                      <div className="text-[8px] text-[#3a5a7a] uppercase mt-1">Conf.</div>
                    </div>
                    <div className="w-16 flex justify-end">
                      {sub.crit > 0 ? <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#E24B4A]/15 text-[#E24B4A] font-bold uppercase">Critico</span> :
                       docs.health < 70 ? <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#F5A800]/15 text-[#F5A800] font-bold uppercase">Alert</span> :
                       <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#1D9E75]/15 text-[#1D9E75] font-bold uppercase">OK</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL PANEL */}
      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppIdx(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-[#0b1828] border-l border-[#534AB7]/30 z-[201] flex flex-col shadow-2xl"
            >
              <div className="p-5 pb-4 border-b border-white/5 relative">
                <button 
                  onClick={() => setSelectedAppIdx(null)}
                  className="absolute top-5 right-5 w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-[#6a8aaa] hover:bg-white/10 transition-all"
                >
                  <X size={16} />
                </button>
                
                <div className="flex items-center gap-4.5 mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0" style={{ backgroundColor: `${getColor(selectedApp.nome)}22`, color: getColor(selectedApp.nome) }}>
                    {selectedApp.nome.split(' ').filter(p => p.length > 2).slice(0, 2).map(n => n[0]).join('').toUpperCase() || selectedApp.nome.slice(0, 2)}
                  </div>
                  <div className="min-w-0 pr-8">
                    <h2 className="text-base font-bold text-[#ddeeff] leading-tight tracking-tight">{selectedApp.nome}</h2>
                    <p className="text-xs text-[#3a5a7a] mt-1 font-medium uppercase tracking-wider">{selectedApp.settore} • {selectedApp.tipo}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {getSubStats(selectedApp.nome).attivi > 0 && <span className="px-2.5 py-1 rounded-full bg-[#1D9E75]/15 text-[#1D9E75] text-[10px] font-bold uppercase tracking-wider border border-[#1D9E75]/20">{getSubStats(selectedApp.nome).attivi} attivi</span>}
                  {getDocStats(selectedApp.nome).health < 70 && <span className="px-2.5 py-1 rounded-full bg-[#F5A800]/15 text-[#F5A800] text-[10px] font-bold uppercase tracking-wider border border-[#F5A800]/20">Alert doc.</span>}
                  {getSubStats(selectedApp.nome).crit > 0 && <span className="px-2.5 py-1 rounded-full bg-[#E24B4A]/15 text-[#E24B4A] text-[10px] font-bold uppercase tracking-wider border border-[#E24B4A]/20">Critico</span>}
                  {selectedApp.tipo === 'RTI' && <span className="px-2.5 py-1 rounded-full bg-[#378ADD]/15 text-[#85B7EB] text-[10px] font-bold uppercase tracking-wider border border-[#378ADD]/20">RTI</span>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white/3 border border-white/5 rounded-xl p-3.5 text-center">
                    <div className="text-lg font-bold text-[#378ADD] font-mono leading-none">{getSubStats(selectedApp.nome).tot}</div>
                    <div className="text-[9px] text-[#3a5a7a] uppercase tracking-widest mt-1.5 font-bold">Pratiche</div>
                  </div>
                  <div className="bg-white/3 border border-white/5 rounded-xl p-3.5 text-center">
                    <div className="text-lg font-bold text-[#1D9E75] font-mono leading-none">{getSubStats(selectedApp.nome).attivi}</div>
                    <div className="text-[9px] text-[#3a5a7a] uppercase tracking-widest mt-1.5 font-bold">Attive</div>
                  </div>
                  <div className="bg-white/3 border border-white/5 rounded-xl p-3.5 text-center">
                    <div className="text-lg font-bold font-mono leading-none" style={{ color: getDocStats(selectedApp.nome).health >= 70 ? '#1D9E75' : '#E24B4A' }}>{getDocStats(selectedApp.nome).health}%</div>
                    <div className="text-[9px] text-[#3a5a7a] uppercase tracking-widest mt-1.5 font-bold">Salute</div>
                  </div>
                </div>

                {/* SALUTE DOCUMENTALE */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest">Salute Documentale</h3>
                  </div>
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="relative w-28 h-28">
                      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                        <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
                        <motion.circle
                          initial={{ strokeDasharray: "0 302" }}
                          animate={{ strokeDasharray: `${(getDocStats(selectedApp.nome).health / 100) * 302} 302` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          cx="60" cy="60" r="48" fill="none" 
                          stroke={getDocStats(selectedApp.nome).health >= 70 ? '#1D9E75' : getDocStats(selectedApp.nome).health >= 40 ? '#F5A800' : '#E24B4A'}
                          strokeWidth="14" strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-xl font-bold text-[#ddeeff] font-mono">{getDocStats(selectedApp.nome).health}%</div>
                        <div className="text-[8px] text-[#3a5a7a] uppercase font-bold">conformità</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DATI ANAGRAFICI */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest">Dati Anagrafici</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: 'Ragione Sociale', val: selectedApp.nome, icon: Building2 },
                      { label: 'Referente', val: selectedApp.referente, icon: ChevronRight },
                      { label: 'Email', val: selectedApp.email, icon: Mail },
                      { label: 'Telefono', val: selectedApp.tel, icon: Phone },
                      { label: 'Partita IVA', val: selectedApp.piva, icon: FileText },
                      { label: 'Sede', val: selectedApp.sede, icon: MapPin },
                    ].map(f => (
                      <div key={f.label} className="space-y-1">
                        <div className="text-[9px] text-[#3a5a7a] uppercase tracking-widest font-bold flex items-center gap-1.5">
                          <f.icon size={10} /> {f.label}
                        </div>
                        <div className="text-sm text-[#a0b8d0] font-medium pl-4">{f.val || '—'}</div>
                      </div>
                    ))}
                    {selectedApp.note && (
                      <div className="bg-[#F5A800]/5 border border-[#F5A800]/20 rounded-xl p-3.5 space-y-1.5">
                        <div className="text-[9px] text-[#F5A800] uppercase tracking-widest font-bold">Note</div>
                        <div className="text-xs text-[#F5A800]/80 leading-relaxed italic">{selectedApp.note}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* DATE CONTRATTO */}
                {(selectedApp.dataInizio || selectedApp.dataFine) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest">Date Contratto</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/3 rounded-xl p-3.5 border border-white/5">
                        <div className="text-[9px] text-[#3a5a7a] uppercase tracking-widest font-bold flex items-center gap-1.5 mb-1">
                          <Calendar size={10} /> Inizio
                        </div>
                        <div className="text-sm text-[#1D9E75] font-bold font-mono">{selectedApp.dataInizio ? format(new Date(selectedApp.dataInizio), 'dd/MM/yyyy') : '—'}</div>
                      </div>
                      <div className="bg-white/3 rounded-xl p-3.5 border border-white/5">
                        <div className="text-[9px] text-[#3a5a7a] uppercase tracking-widest font-bold flex items-center gap-1.5 mb-1">
                          <Calendar size={10} /> Fine
                        </div>
                        <div className="text-sm text-[#E24B4A] font-bold font-mono">{selectedApp.dataFine ? format(new Date(selectedApp.dataFine), 'dd/MM/yyyy') : '—'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/5 flex gap-2.5 bg-black/20">
                <button className="flex-1 h-11 bg-[#534AB7] text-[#e8e6f8] rounded-xl text-xs font-bold hover:bg-[#6358cc] transition-all flex items-center justify-center gap-2">
                  <Edit3 size={14} /> Modifica
                </button>
                <button className="h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-[#6a8aaa] hover:bg-white/10 transition-all">
                  <Download size={16} />
                </button>
                <button className="h-11 px-4 bg-[#E24B4A]/10 border border-[#E24B4A]/25 rounded-xl text-[#f09595] hover:bg-[#E24B4A]/20 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnagraficaAppaltatori;
