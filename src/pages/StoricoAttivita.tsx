import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import {
  Download, Trash2, Plus, RefreshCw,
  FileText, LogIn, Upload, X, Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const EV_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  insert: { label: 'Inserimento',   cls: 'bg-[#1D9E75]/15 text-[#5DCAA5]',  icon: Plus },
  update: { label: 'Aggiornamento', cls: 'bg-[#F5A800]/12 text-[#F5A800]',  icon: RefreshCw },
  delete: { label: 'Eliminazione',  cls: 'bg-[#E24B4A]/12 text-[#f09595]',  icon: Trash2 },
  import: { label: 'Importazione',  cls: 'bg-[#534AB7]/15 text-[#a89ef8]',  icon: Upload },
  login:  { label: 'Login',         cls: 'bg-[#378ADD]/12 text-[#85B7EB]',  icon: LogIn },
  export: { label: 'Export',        cls: 'bg-[#1D9E75]/10 text-[#5DCAA5]',  icon: Download },
};
const COLORS = ['#534AB7','#378ADD','#1D9E75','#E24B4A','#F5A800'];

const StoricoAttivita: React.FC = () => {
  const { activityLog, setActivityLog, subaffidamenti } = useData();
  const { user } = useAuth();

  const [tipoFilter,   setTipoFilter]   = useState('');
  const [utenteFilter, setUtenteFilter] = useState('');
  const [foglioFilter, setFoglioFilter] = useState('');
  const [dal, setDal] = useState('');
  const [al,  setAl]  = useState('');
  const [searchQ, setSearchQ] = useState('');

  // ── auto-genera log di esempio se vuoto ──────────────────────────
  const ensureLog = () => {
    if (activityLog.length > 0) return activityLog;
    const now = new Date();
    const u = user?.nome || 'Pietro De Vito';
    const sample = subaffidamenti.slice(0, 10).map((d, i) => {
      const ts = new Date(now.getTime() - (10 - i) * 86400000);
      return {
        ts: ts.toISOString(),
        tsDisplay: ts.toLocaleString('it-IT'),
        utente: u,
        tipo: 'insert' as const,
        foglio: 'Subaffidamenti',
        desc: `Inserita pratica ${d.id}`,
        detail: `${d.appaltatore || d.app} — ${d.subfornitore || d.sub}`,
      };
    });
    setActivityLog(sample);
    return sample;
  };

  const log = useMemo(() => ensureLog(), [activityLog, subaffidamenti]);

  const utenti = useMemo(() => Array.from(new Set(log.map(l => l.utente))).sort(), [log]);

  const filteredLog = useMemo(() => {
    return log.filter(l => {
      if (tipoFilter   && l.tipo   !== tipoFilter)   return false;
      if (utenteFilter && l.utente !== utenteFilter) return false;
      if (foglioFilter && l.foglio !== foglioFilter) return false;
      const date = new Date(l.ts);
      if (dal && isBefore(date, startOfDay(new Date(dal)))) return false;
      if (al  && isAfter(date,  endOfDay(new Date(al))))   return false;
      if (searchQ) {
        const q = searchQ.toLowerCase();
        if (!(l.desc + l.detail + l.utente + l.foglio).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [log, tipoFilter, utenteFilter, foglioFilter, dal, al, searchQ]);

  const stats = useMemo(() => [
    { val: log.length,                                          lbl: 'Totale eventi',  col: '#a89ef8' },
    { val: log.filter(l => l.tipo === 'insert').length,         lbl: 'Inserimenti',    col: '#1D9E75' },
    { val: log.filter(l => l.tipo === 'update').length,         lbl: 'Aggiornamenti',  col: '#F5A800' },
    { val: log.filter(l => l.tipo === 'import').length,         lbl: 'Importazioni',   col: '#534AB7' },
    { val: log.filter(l => l.tipo === 'login').length,          lbl: 'Login',          col: '#378ADD' },
    { val: utenti.length,                                       lbl: 'Utenti attivi',  col: '#5DCAA5' },
  ], [log, utenti]);

  const handleExportCSV = () => {
    const rows = filteredLog.map(l => ({
      'Data/Ora': l.tsDisplay,
      'Utente':   l.utente,
      'Tipo':     EV_CONFIG[l.tipo]?.label || l.tipo,
      'Foglio':   l.foglio,
      'Descrizione': l.desc,
      'Dettaglio': l.detail,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Storico');
    XLSX.writeFile(wb, `storico_pser_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const resetAll = () => {
    setTipoFilter(''); setUtenteFilter(''); setFoglioFilter('');
    setDal(''); setAl(''); setSearchQ('');
  };

  return (
    <div className="p-5 space-y-5">
      {/* TOPBAR */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-lg font-bold text-[#ddeeff] tracking-tight">Storico Attività</h1>
          <p className="text-xs text-[#3a5a7a] mt-1">Log completo di tutte le operazioni eseguite nel sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            {format(new Date(), 'dd MMMM yyyy', { locale: it })}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-[#1e3550] flex items-center justify-center text-[10px] text-[#8ab0c8] font-semibold">
              {user?.nome?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
            </div>
            {user?.nome}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-6 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-[#0f2035] border border-white/5 rounded-xl p-3.5 text-center">
            <div className="text-2xl font-bold font-mono" style={{ color: s.col }}>{s.val}</div>
            <div className="text-[9px] text-[#3a5a7a] uppercase tracking-widest mt-1.5 font-bold">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 flex gap-3 flex-wrap items-end">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
          <label className="text-[9px] text-[#3a5a7a] uppercase tracking-widest font-bold">Cerca</label>
          <input
            type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Cerca in desc, utente, foglio..."
            className="h-9 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/40"
          />
        </div>
        {[
          { label: 'Tipo evento', val: tipoFilter, set: setTipoFilter,
            opts: Object.entries(EV_CONFIG).map(([k,v]) => ({ v: k, l: v.label })) },
          { label: 'Utente', val: utenteFilter, set: setUtenteFilter,
            opts: utenti.map(u => ({ v: u, l: u })) },
          { label: 'Foglio', val: foglioFilter, set: setFoglioFilter,
            opts: ['Dashboard','Subaffidamenti','Controllo Documentale','Anagrafica','Importazione','Sistema'].map(f=>({v:f,l:f})) },
        ].map(f => (
          <div key={f.label} className="flex flex-col gap-1.5">
            <label className="text-[9px] text-[#3a5a7a] uppercase tracking-widest font-bold">{f.label}</label>
            <select value={f.val} onChange={e => f.set(e.target.value)}
              className="h-9 min-w-[140px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/40 cursor-pointer">
              <option value="">Tutti</option>
              {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        ))}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-[#3a5a7a] uppercase tracking-widest font-bold">Dal</label>
          <input type="date" value={dal} onChange={e => setDal(e.target.value)}
            className="h-9 min-w-[130px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-[#3a5a7a] uppercase tracking-widest font-bold">Al</label>
          <input type="date" value={al} onChange={e => setAl(e.target.value)}
            className="h-9 min-w-[130px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/40" />
        </div>
        <button onClick={resetAll} className="h-9 px-4 bg-white/5 border border-white/10 rounded-lg text-[#6a8aaa] text-xs font-medium hover:bg-white/10 transition-all">↺ Reset</button>
        <div className="ml-auto flex gap-2">
          <button onClick={handleExportCSV} className="h-9 px-4 bg-[#534AB7] text-[#e8e6f8] rounded-lg text-xs font-bold hover:bg-[#6358cc] transition-all flex items-center gap-2">
            <Download size={14}/> Export CSV
          </button>
          <button onClick={() => { if(confirm('Svuotare tutto lo storico?')) setActivityLog([]); }}
            className="h-9 px-4 bg-[#E24B4A]/10 border border-[#E24B4A]/25 rounded-lg text-[#f09595] text-xs font-bold hover:bg-[#E24B4A]/20 transition-all flex items-center gap-2">
            <Trash2 size={14}/> Svuota
          </button>
        </div>
      </div>

      <div className="text-[11px] text-[#3a5a7a] font-medium">{filteredLog.length} eventi trovati</div>

      {/* TABLE */}
      <div className="bg-[#0f2035] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-[#2a4a6a] uppercase tracking-wider sticky top-0 bg-[#0f2035] z-10">
                {['Data/Ora','Utente','Tipo','Foglio','Descrizione','Dettaglio'].map(h => (
                  <th key={h} className="py-3 px-4 font-bold border-b border-white/10">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredLog.length > 0 ? filteredLog.slice(0, 300).map((l, i) => {
                const config = EV_CONFIG[l.tipo] || { label: l.tipo, cls: 'bg-white/5 text-[#5a7a9a]', icon: FileText };
                const initials = l.utente.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || '?';
                const color = COLORS[i % COLORS.length];
                return (
                  <tr key={i} className="group hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#3a5a7a] whitespace-nowrap">{l.tsDisplay}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ backgroundColor: `${color}22`, color }}>
                          {initials}
                        </div>
                        <span className="text-[#ddeeff] font-medium">{l.utente}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('pill flex items-center gap-1.5 w-fit text-[10px]', config.cls)}>
                        <config.icon size={10}/> {config.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#3a5a7a] font-medium">{l.foglio}</td>
                    <td className="py-3 px-4 text-[#a0b8d0]">{l.desc}</td>
                    <td className="py-3 px-4 text-[#3a5a7a] text-[11px] italic">{l.detail}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="py-20 text-center text-[#3a5a7a] text-sm">Nessun evento registrato</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StoricoAttivita;
