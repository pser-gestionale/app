import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, FileText, FileSpreadsheet, Search, X,
  BarChart3, AlertTriangle, CheckCircle2, Calendar, Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, differenceInDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Subaffidamento } from '../types';

const STATO_COL: Record<string, string> = {
  'Autorizzata': '#1D9E75', 'Attivata': '#378ADD', 'Inviata': '#F5A800',
  'Rigettata': '#E24B4A', 'Scaduta': '#A32D2D', 'In Attesa SAP': '#534AB7',
  'Richiesta Informazioni': '#EF9F27', 'Conclusa': '#0F6E56',
};

const parseEuro = (val: string | undefined | null): number =>
  parseFloat((val || '0').replace(/,/g, '')) || 0;

const ReportExport: React.FC = () => {
  const { subaffidamenti, appaltatori, addActivity } = useData();
  const { user } = useAuth();

  const [appSearch,    setAppSearch]    = useState('');
  const [showAppDd,    setShowAppDd]    = useState(false);
  const [selectedApp,  setSelectedApp]  = useState<string | null>(null);
  const [tipoFilter,   setTipoFilter]   = useState('');
  const [statoFilter,  setStatoFilter]  = useState('');
  const [dal,          setDal]          = useState('');
  const [al,           setAl]           = useState('');
  const [modalData,    setModalData]    = useState<any[]>([]);
  const [modalTitle,   setModalTitle]   = useState('');
  const [modalColor,   setModalColor]   = useState('#534AB7');
  const [showModal,    setShowModal]    = useState(false);
  const [selectedCols, setSelectedCols] = useState<string[]>(['id','appaltatore','subfornitore','tipo','stato','dataInizio','dataFine','oggettoRichiesta']);

  const today = new Date();

  const appList = useMemo(() =>
    Array.from(new Set(subaffidamenti.map(d => d.appaltatore || d.app || ''))).filter(Boolean).sort(),
    [subaffidamenti]);

  const filteredAppList = useMemo(() =>
    appSearch ? appList.filter(a => a.toLowerCase().includes(appSearch.toLowerCase())).slice(0,10) : appList.slice(0,10),
    [appList, appSearch]);

  const filteredData = useMemo(() => {
    return subaffidamenti.filter(d => {
      if (selectedApp && (d.appaltatore || d.app) !== selectedApp) return false;
      if (tipoFilter  && d.tipo !== tipoFilter)   return false;
      if (statoFilter && d.stato !== statoFilter) return false;
      const date = new Date(d.scadenza || d.dataFine || '');
      if (dal && isBefore(date, startOfDay(new Date(dal)))) return false;
      if (al  && isAfter(date,  endOfDay(new Date(al))))   return false;
      return true;
    });
  }, [subaffidamenti, selectedApp, tipoFilter, statoFilter, dal, al]);

  const appaltatoreAgg = useMemo(() => {
    const map = new Map<string, { totalCommitted: number; maxSub: number }>();
    subaffidamenti.forEach(d => {
      const key = (d.appaltatore || d.app || '').trim();
      if (!key) return;
      const committed = parseEuro(d.importoRichiestoEuro || d.importoEur);
      const max = parseEuro(d.importoMassimoSubappaltabile || d.importoMaxSub);
      const prev = map.get(key) || { totalCommitted: 0, maxSub: 0 };
      map.set(key, { totalCommitted: prev.totalCommitted + committed, maxSub: Math.max(prev.maxSub, max) });
    });
    return map;
  }, [subaffidamenti]);

  const COLUMNS = [
    { id: 'id',              label: 'ID Contratto' },
    { id: 'appaltatore',     label: 'Appaltatore' },
    { id: 'subfornitore',    label: 'Subfornitore' },
    { id: 'tipo',            label: 'Tipo' },
    { id: 'stato',           label: 'Stato' },
    { id: 'dataInizio',      label: 'Data Inizio' },
    { id: 'dataFine',        label: 'Data Fine' },
    { id: 'oggettoRichiesta',label: 'Oggetto Richiesta' },
    { id: 'importoRichiestoEuro',        label: 'Importo (€)' },
    { id: 'importoMassimoSubappaltabile',label: 'Massimo Sub. (€)' },
    { id: '__soglia__',      label: 'Soglia (%)' },
    { id: 'unitaGestore',    label: 'Unità Gestore' },
    { id: 'idSapContratto',  label: 'ID SAP Contratto' },
    { id: 'statoQualifica',  label: 'Stato Qualifica' },
  ];

  const openReport = (name: string, data: Subaffidamento[], color: string) => {
    setModalTitle(name + (selectedApp ? ` — ${selectedApp}` : '') + ` (${data.length})`);
    setModalData(data);
    setModalColor(color);
    setShowModal(true);
  };

  const openAppReport = (data: Subaffidamento[]) => {
    const apps: Record<string, any> = {};
    data.forEach(d => {
      const k = d.appaltatore || d.app || '?';
      if (!apps[k]) apps[k] = { nome: k, tot: 0, aut: 0, att: 0, inv: 0, crit: 0, scad30: 0 };
      apps[k].tot++;
      if (d.stato === 'Autorizzata') apps[k].aut++;
      if (d.stato === 'Attivata')    apps[k].att++;
      if (d.stato === 'Inviata')     apps[k].inv++;
      if (d.stato === 'Rigettata' || d.stato === 'Scaduta') apps[k].crit++;
      const df = differenceInDays(new Date(d.scadenza || d.dataFine || ''), today);
      if (df >= 0 && df <= 30) apps[k].scad30++;
    });
    setModalTitle(`Report per Appaltatore (${Object.keys(apps).length})`);
    setModalData(Object.values(apps));
    setModalColor('#378ADD');
    setShowModal(true);
  };

  const REPORTS = [
    { id:'tutti',        icon: FileSpreadsheet, name: 'Tutti i Subaffidamenti',  color:'#534AB7',
      fn: () => openReport('Tutti i Subaffidamenti', filteredData, '#534AB7') },
    { id:'critiche',     icon: AlertTriangle,   name: 'Pratiche Critiche',        color:'#E24B4A',
      fn: () => openReport('Pratiche Critiche', filteredData.filter(d => d.stato === 'Rigettata' || d.stato === 'Scaduta' || d.stato === 'Da Rigettare'), '#E24B4A') },
    { id:'scadenze',     icon: Calendar,        name: 'Scadenze Imminenti',       color:'#F5A800',
      fn: () => openReport('Scadenze Imminenti', filteredData.filter(d => { const df = differenceInDays(new Date(d.scadenza || d.dataFine || ''), today); return df >= 0 && df <= 30; }), '#F5A800') },
    { id:'autorizzate',  icon: CheckCircle2,    name: 'Pratiche Autorizzate',     color:'#1D9E75',
      fn: () => openReport('Pratiche Autorizzate', filteredData.filter(d => d.stato === 'Autorizzata' || d.stato === 'Attivata'), '#1D9E75') },
    { id:'appaltatori',  icon: BarChart3,       name: 'Per Appaltatore',          color:'#378ADD',
      fn: () => openAppReport(filteredData) },
    { id:'mensile',      icon: Calendar,        name: 'Inseriti questo mese',     color:'#8b5cf6',
      fn: () => { const m = today.getMonth(); const y = today.getFullYear(); openReport('Report Mensile', filteredData.filter(d => { const dt = new Date(d.inserito || d.dataCreazione || ''); return dt.getMonth() === m && dt.getFullYear() === y; }), '#8b5cf6'); } },
  ];

  const exportCSV = (data: any[], title: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0,30));
    XLSX.writeFile(wb, `${title.replace(/[^a-zA-Z0-9]/g,'_')}_${format(new Date(),'yyyyMMdd')}.xlsx`);
    addActivity('export', 'Report', `Esportato: ${title}`, `${data.length} record`);
  };

  const exportPDF = (data: Subaffidamento[], title: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = data.map(d => {
      const df = d.scadenza || d.dataFine;
      const diff = df ? differenceInDays(new Date(df), today) : null;
      const color = diff === null ? '#666' : diff < 0 ? '#E24B4A' : diff <= 30 ? '#F5A800' : '#1D9E75';
      const agg = appaltatoreAgg.get((d.appaltatore || d.app || '').trim());
      const importoVal = parseEuro(d.importoRichiestoEuro || d.importoEur);
      const massimoVal = agg?.maxSub || 0;
      const sogliaPct = agg && agg.maxSub ? Math.min(100, Math.round((agg.totalCommitted / agg.maxSub) * 100)) : null;
      const sogliaColor = sogliaPct === null ? '#999' : sogliaPct >= 70 ? '#E24B4A' : sogliaPct >= 40 ? '#F5A800' : '#1D9E75';
      return `<tr>
        <td>${d.id}</td>
        <td>${d.appaltatore || d.app || ''}</td>
        <td>${d.subfornitore || d.sub || ''}</td>
        <td>${d.tipo}</td>
        <td style="color:${STATO_COL[d.stato] || '#999'};font-weight:600">${d.stato}</td>
        <td>${df ? format(new Date(df), 'dd/MM/yyyy') : '—'}</td>
        <td style="color:${color};font-weight:600">${diff !== null ? (diff >= 0 ? '+' : '') + diff + 'gg' : '—'}</td>
        <td>${importoVal ? '€ ' + importoVal.toLocaleString('it-IT') : '—'}</td>
        <td>${massimoVal ? '€ ' + massimoVal.toLocaleString('it-IT') : '—'}</td>
        <td style="color:${sogliaColor};font-weight:700">${sogliaPct !== null ? sogliaPct + '%' : '—'}</td>
      </tr>`;
    }).join('');
    w.document.write(`<html><head><title>${title}</title><style>
      body{font-family:sans-serif;padding:30px;color:#1a202c}
      h2{color:#534AB7;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#0f172a;color:white;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase}
      td{padding:10px 12px;border-bottom:1px solid #e2e8f0}
      tr:nth-child(even) td{background:#f8fafc}
      .footer{margin-top:30px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
    </style></head><body>
      <h2>📋 ${title}</h2>
      <table><thead><tr><th>ID</th><th>Appaltatore</th><th>Subfornitore</th><th>Tipo</th><th>Stato</th><th>Scadenza</th><th>Giorni</th><th>Importo (€)</th><th>Massimo Sub. (€)</th><th>Soglia %</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Generato il ${format(new Date(),'dd/MM/yyyy HH:mm')} — PSER Gestionale Subaffidamenti v2.0</div>
    </body></html>`);
    w.document.close();
    w.print();
    addActivity('export', 'Report', `PDF: ${title}`, `${data.length} record`);
  };

  const kpiStats = useMemo(() => [
    { val: filteredData.length, lbl: 'Pratiche', col: '#a89ef8' },
    { val: filteredData.filter(d => d.tipo === 'Subappalto').length,  lbl: 'Subappalti',   col: '#85B7EB' },
    { val: filteredData.filter(d => d.tipo === 'Subcontratto').length, lbl: 'Subcontratti', col: '#5DCAA5' },
    { val: filteredData.filter(d => d.stato === 'Autorizzata' || d.stato === 'Attivata').length, lbl: 'Aut./Attivate', col: '#1D9E75' },
    { val: filteredData.filter(d => d.stato === 'Rigettata' || d.stato === 'Scaduta').length, lbl: 'Critiche', col: '#E24B4A' },
    { val: filteredData.filter(d => { const df = differenceInDays(new Date(d.scadenza || d.dataFine || ''), today); return df >= 0 && df <= 30; }).length, lbl: 'Scad. 30gg', col: '#F5A800' },
  ], [filteredData]);

  return (
    <div className="p-5 space-y-5">
      {/* TOPBAR */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-lg font-bold text-[#ddeeff] tracking-tight">Report & Export</h1>
          <p className="text-xs text-[#3a5a7a] mt-1">Genera report aggregati ed esporta i dati del sistema</p>
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

      {/* KPI */}
      <div className="grid grid-cols-6 gap-2.5">
        {kpiStats.map((k, i) => (
          <div key={i} className="bg-[#0f2035] border border-white/5 rounded-xl p-3.5">
            <div className="text-2xl font-bold font-mono" style={{ color: k.col }}>{k.val}</div>
            <div className="text-[9px] text-[#3a5a7a] uppercase tracking-widest mt-1 font-bold">{k.lbl}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="bg-[#0f2035] border border-white/10 rounded-xl p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1.5 relative min-w-[220px]">
            <label className="text-[10px] text-[#3a5a7a] uppercase tracking-widest font-bold">Appaltatore</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#3a5a7a]"/>
              <input type="text" value={appSearch}
                onChange={e => { setAppSearch(e.target.value); setShowAppDd(true); }}
                onFocus={() => setShowAppDd(true)}
                onBlur={() => setTimeout(() => setShowAppDd(false), 200)}
                placeholder="Cerca appaltatore..."
                className="w-full h-9 pl-8 pr-3 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs outline-none focus:border-[#534AB7]/40"/>
              {showAppDd && (
                <div className="absolute top-10 left-0 right-0 bg-[#0f2035] border border-[#534AB7]/35 rounded-lg z-[100] max-h-52 overflow-y-auto shadow-2xl">
                  <div className="p-2 text-xs text-[#4a6a8a] cursor-pointer hover:bg-white/5 border-b border-white/5"
                    onMouseDown={() => { setSelectedApp(null); setAppSearch(''); }}>Tutti gli appaltatori</div>
                  {filteredAppList.map(app => (
                    <div key={app} onMouseDown={() => { setSelectedApp(app); setAppSearch(app); }}
                      className="p-2.5 text-xs text-[#c8ddf0] cursor-pointer border-b border-white/5 hover:bg-[#534AB7]/15 hover:text-[#a89ef8]">{app}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {[
            { label:'Tipo', val: tipoFilter, set: setTipoFilter, opts: ['Subappalto','Subcontratto'] },
            { label:'Stato', val: statoFilter, set: setStatoFilter, opts: Object.keys(STATO_COL) },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#3a5a7a] uppercase tracking-widest font-bold">{f.label}</label>
              <select value={f.val} onChange={e => f.set(e.target.value)}
                className="h-9 min-w-[140px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/40 cursor-pointer">
                <option value="">Tutti</option>
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {[{ label:'Dal', val:dal, set:setDal }, { label:'Al', val:al, set:setAl }].map(f => (
            <div key={f.label} className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#3a5a7a] uppercase tracking-widest font-bold">{f.label}</label>
              <input type="date" value={f.val} onChange={e => f.set(e.target.value)}
                className="h-9 min-w-[130px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/40"/>
            </div>
          ))}
          <button onClick={() => { setSelectedApp(null); setAppSearch(''); setTipoFilter(''); setStatoFilter(''); setDal(''); setAl(''); }}
            className="h-9 px-4 bg-white/5 border border-white/10 rounded-lg text-[#6a8aaa] text-xs font-medium hover:bg-white/10 transition-all">↺ Reset</button>
        </div>
      </div>

      {/* REPORT GRID */}
      <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#ddeeff] flex items-center gap-2"><FileText size={16}/> Report Predefiniti</h2>
          <p className="text-[11px] text-[#3a5a7a] mt-1">Clicca su un report per aprire la preview. Poi esporta in CSV o PDF.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORTS.map(r => (
            <motion.div key={r.id} whileHover={{ y: -2 }} onClick={r.fn}
              className="bg-[#0b1828] border border-white/5 rounded-xl p-4 cursor-pointer hover:border-[#534AB7]/40 transition-all relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: r.color }}/>
              <r.icon size={24} className="mb-3" style={{ color: r.color }}/>
              <h3 className="text-xs font-bold text-[#ddeeff] mb-1">{r.name}</h3>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1.5">
                  <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#1D9E75]/15 text-[#5DCAA5] font-bold uppercase">CSV</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#E24B4A]/15 text-[#f09595] font-bold uppercase">PDF</span>
                </div>
                <span className="text-[10px] font-bold" style={{ color: r.color }}>Apri →</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CUSTOM EXPORT */}
      <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#ddeeff] flex items-center gap-2"><Settings size={16}/> Export Personalizzato</h2>
          <p className="text-[11px] text-[#3a5a7a] mt-1">Scegli le colonne, poi esporta i {filteredData.length} record filtrati.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {COLUMNS.map(c => (
            <button key={c.id} onClick={() => setSelectedCols(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
              className={cn('h-7 px-3 rounded-lg text-[10px] font-bold transition-all border',
                selectedCols.includes(c.id) ? 'bg-[#534AB7]/20 border-[#534AB7]/50 text-[#a89ef8]' : 'bg-white/3 border-white/10 text-[#3a5a7a] hover:border-white/20')}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2.5 flex-wrap items-center">
          <button onClick={() => {
            const rows = filteredData.map(d => {
              const agg = appaltatoreAgg.get((d.appaltatore || d.app || '').trim());
              const out: any = {};
              selectedCols.forEach(col => {
                const colDef = COLUMNS.find(c => c.id === col);
                if (col === '__soglia__') {
                  out['Soglia (%)'] = agg && agg.maxSub ? Math.min(100, Math.round((agg.totalCommitted / agg.maxSub) * 100)) : '';
                } else {
                  out[colDef?.label || col] = (d as any)[col] || (d as any)[col.replace('appaltatore','app').replace('subfornitore','sub')] || '';
                }
              });
              return out;
            });
            exportCSV(rows, 'Export_Personalizzato');
          }} className="h-9 px-4 bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-lg text-[#5DCAA5] text-xs font-bold hover:bg-[#1D9E75]/25 transition-all flex items-center gap-2">
            <Download size={14}/> CSV
          </button>
          <button onClick={() => exportPDF(filteredData, 'Export Personalizzato')}
            className="h-9 px-4 bg-[#E24B4A]/10 border border-[#E24B4A]/25 rounded-lg text-[#f09595] text-xs font-bold hover:bg-[#E24B4A]/20 transition-all flex items-center gap-2">
            <FileText size={14}/> PDF
          </button>
          <span className="text-[11px] text-[#3a5a7a] font-medium">{filteredData.length} record · {selectedCols.length} colonne selezionate</span>
        </div>
      </div>

      {/* MODAL REPORT */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
              className="bg-[#0f2035] border border-white/10 rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between" style={{ borderTopColor: modalColor, borderTopWidth: 3 }}>
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-[#ddeeff]">{modalTitle}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    const isApp = modalData[0]?.tot !== undefined;
                    if (isApp) exportCSV(modalData, modalTitle);
                    else exportCSV(modalData.map(d => {
                      const agg = appaltatoreAgg.get((d.appaltatore || d.app || '').trim());
                      const sogliaPct = agg && agg.maxSub ? Math.min(100, Math.round((agg.totalCommitted / agg.maxSub) * 100)) : null;
                      return {
                        ID: d.id, Appaltatore: d.appaltatore || d.app,
                        Subfornitore: d.subfornitore || d.sub,
                        Tipo: d.tipo, Stato: d.stato,
                        'Data Fine': d.dataFine || d.scadenza,
                        'Importo (€)': parseEuro(d.importoRichiestoEuro || d.importoEur) || '',
                        'Massimo Subapp. (€)': agg?.maxSub || '',
                        'Soglia (%)': sogliaPct !== null ? sogliaPct : '',
                      };
                    }), modalTitle);
                  }} className="h-8 px-3 bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-lg text-[#5DCAA5] text-[11px] font-bold hover:bg-[#1D9E75]/25 flex items-center gap-1.5">
                    <Download size={12}/> CSV
                  </button>
                  {modalData[0]?.tot === undefined && (
                    <button onClick={() => exportPDF(modalData, modalTitle)}
                      className="h-8 px-3 bg-[#E24B4A]/10 border border-[#E24B4A]/25 rounded-lg text-[#f09595] text-[11px] font-bold hover:bg-[#E24B4A]/20 flex items-center gap-1.5">
                      <FileText size={12}/> PDF
                    </button>
                  )}
                  <button onClick={() => setShowModal(false)}
                    className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-[#6a8aaa] hover:bg-white/10">
                    <X size={16}/>
                  </button>
                </div>
              </div>
              <div className="overflow-auto custom-scrollbar flex-1 p-5">
                {modalData.length === 0 ? (
                  <div className="text-center py-16 text-[#3a5a7a] text-sm">Nessun dato per questo report con i filtri correnti</div>
                ) : modalData[0]?.tot !== undefined ? (
                  /* Report per appaltatore */
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-[10px] text-[#2a4a6a] uppercase tracking-wider">
                        {['Appaltatore','Totale','Aut.','Attivate','Inv.','Critiche','Scad. 30gg'].map(h => (
                          <th key={h} className="pb-3 px-3 font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((a, i) => (
                        <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
                          <td className="py-3 px-3 font-bold text-[#ddeeff]">{a.nome}</td>
                          <td className="py-3 px-3 font-mono text-[#a89ef8]">{a.tot}</td>
                          <td className="py-3 px-3 font-mono text-[#1D9E75]">{a.aut}</td>
                          <td className="py-3 px-3 font-mono text-[#378ADD]">{a.att}</td>
                          <td className="py-3 px-3 font-mono text-[#F5A800]">{a.inv}</td>
                          <td className="py-3 px-3 font-mono text-[#E24B4A]">{a.crit}</td>
                          <td className="py-3 px-3 font-mono text-[#F5A800]">{a.scad30}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  /* Report standard */
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-[10px] text-[#2a4a6a] uppercase tracking-wider">
                        {['ID','Appaltatore','Subfornitore','Tipo','Stato','Data Fine','Giorni'].map(h => (
                          <th key={h} className="pb-3 px-3 font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(modalData as Subaffidamento[]).map((d, i) => {
                        const df = d.dataFine || d.scadenza;
                        const diff = df ? differenceInDays(new Date(df), today) : null;
                        return (
                          <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 px-3 font-mono text-[#4a9fe8]">{d.id}</td>
                            <td className="py-3 px-3 text-[#a0b8d0] font-medium max-w-[160px] truncate">{d.appaltatore || d.app}</td>
                            <td className="py-3 px-3 text-[#c8ddf0] max-w-[160px] truncate">{d.subfornitore || d.sub}</td>
                            <td className="py-3 px-3">
                              <span className={cn('pill', d.tipo === 'Subappalto' ? 'bg-[#378ADD]/15 text-[#85B7EB]' : 'bg-[#1D9E75]/15 text-[#5DCAA5]')}>{d.tipo}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: STATO_COL[d.stato] || '#999', backgroundColor: `${STATO_COL[d.stato] || '#999'}18` }}>{d.stato}</span>
                            </td>
                            <td className="py-3 px-3 text-[#6a8aaa]">{df ? format(new Date(df),'dd/MM/yyyy') : '—'}</td>
                            <td className="py-3 px-3">
                              {diff !== null ? (
                                <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold font-mono',
                                  diff < 0 ? 'bg-[#E24B4A]/12 text-[#f09595]' : diff <= 30 ? 'bg-[#F5A800]/12 text-[#F5A800]' : 'bg-[#1D9E75]/12 text-[#5DCAA5]')}>
                                  {diff >= 0 ? '+' : ''}{diff}gg
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportExport;
