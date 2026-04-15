import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Plus, 
  List, 
  Search, 
  Info, 
  Download, 
  Trash2, 
  Check, 
  X,
  Archive,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Subaffidamento } from '../types';
import * as XLSX from 'xlsx';

const GestioneSubaffidamenti: React.FC = () => {
  const { subaffidamenti, appaltatori, addActivity, setSubaffidamenti } = useData();
  const { user } = useAuth();
  const location = useLocation();
  
  const [tab, setTab] = useState<'nuovo' | 'elenco' | 'dettaglio'>('nuovo');
  const [tipo, setTipo] = useState<'Subappalto' | 'Subcontratto'>('Subappalto');
  const [formData, setFormData] = useState<Partial<Subaffidamento>>({
    id: '',
    oggetto: '',
    app: '',
    sub: '',
    attivita: '',
    oggRich: '',
    stato: 'Inviata',
    inizio: '',
    fine: '',
    note: ''
  });
  
  const [elencoFilters, setElencoFilters] = useState({
    app: '',
    tipo: '',
    stato: '',
    search: ''
  });

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.selectedId) {
      setSelectedRecordId(location.state.selectedId);
      setTab('dettaglio');
    }
  }, [location.state]);

  const today = new Date();

  const stats = useMemo(() => {
    const tot = subaffidamenti.length;
    const sub = subaffidamenti.filter(d => d.tipo === 'Subappalto').length;
    const con = subaffidamenti.filter(d => d.tipo === 'Subcontratto').length;
    const crit = subaffidamenti.filter(d => d.stato === 'Rigettata' || d.stato === 'Scaduta').length;
    const ok = subaffidamenti.filter(d => d.stato === 'Autorizzata' || d.stato === 'Attivata').length;
    return [
      { val: tot, lbl: 'Totale Pratiche', color: '#F5A800' },
      { val: sub, lbl: 'Subappalti', color: '#378ADD' },
      { val: con, lbl: 'Subcontratti', color: '#1D9E75' },
      { val: crit, lbl: 'Critici/Rigettati', color: '#E24B4A' },
      { val: ok, lbl: 'Autorizzati/Attivi', color: '#534AB7' }
    ];
  }, [subaffidamenti]);

  const STATI_ALL = ['Inviata', 'Richiesta Informazioni', 'In Attesa SAP', 'Autorizzata', 'Attivata', 'Rigettata', 'Da Rigettare', 'Scaduta'];

  const filteredElenco = useMemo(() => {
    return subaffidamenti.filter(d => {
      const matchApp = !elencoFilters.app || (d.appaltatore || d.app) === elencoFilters.app;
      const matchTipo = !elencoFilters.tipo || d.tipo === elencoFilters.tipo;
      const matchStato = !elencoFilters.stato || d.stato === elencoFilters.stato;
      const matchSearch = !elencoFilters.search || 
        (d.id + (d.appaltatore || d.app) + (d.subfornitore || d.sub) + (d.oggetto || '') + (d.attivita || '')).toLowerCase().includes(elencoFilters.search.toLowerCase());
      return matchApp && matchTipo && matchStato && matchSearch;
    });
  }, [subaffidamenti, elencoFilters]);

  const STATI_SUB = ['Inviata', 'Autorizzata', 'Richiesta Informazioni', 'In Attesa SAP', 'In Modifica', 'Da Autorizzare', 'Da Attivare', 'Rigettata', 'Da Rigettare', 'Scaduta', 'Conclusa', 'Attivata'];
  const STATI_CON = ['Inviata', 'Attivata', 'In Attesa SAP', 'In Modifica', 'Da Autorizzare', 'Da Attivare', 'Rigettata', 'Da Rigettare', 'Scaduta', 'Conclusa'];

  const STATO_CLS: Record<string, string> = {
    'Autorizzata': 'bg-[#1D9E75]/15 text-[#1D9E75]',
    'Attivata': 'bg-[#378ADD]/15 text-[#378ADD]',
    'Inviata': 'bg-[#F5A800]/12 text-[#F5A800]',
    'Richiesta Informazioni': 'bg-[#EF9F27]/15 text-[#EF9F27]',
    'Rigettata': 'bg-[#E24B4A]/15 text-[#E24B4A]',
    'In Attesa SAP': 'bg-[#534AB7]/15 text-[#a89ef8]',
    'Conclusa': 'bg-[#1D9E75]/15 text-[#0F6E56]',
  };

  const handleSaveNuovo = () => {
    if (!formData.id || !formData.app || !formData.sub || !formData.attivita) {
      alert('Compila tutti i campi obbligatori');
      return;
    }
    const newRecord = {
      ...formData,
      tipo,
      inserito: new Date().toISOString().split('T')[0]
    } as Subaffidamento;
    
    setSubaffidamenti(prev => [newRecord, ...prev]);
    addActivity('insert', 'Subaffidamenti', `Inserita pratica ${newRecord.id}`, `${newRecord.appaltatore || newRecord.app} — ${newRecord.subfornitore || newRecord.sub}`);
    alert('Subaffidamento salvato correttamente');
    setFormData({ id: '', oggetto: '', app: '', sub: '', attivita: '', oggRich: '', stato: 'Inviata', inizio: '', fine: '', note: '' });
  };

  const selectedRecord = useMemo(() => {
    return subaffidamenti.find(d => d.id === selectedRecordId) || null;
  }, [subaffidamenti, selectedRecordId]);

  return (
    <div className="p-5 space-y-5">
      {/* TOPBAR */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold text-[#ddeeff]">Gestione Subaffidamenti</h1>
          <p className="text-xs text-[#3a5a7a] mt-1">Inserimento, ricerca e aggiornamento pratiche</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="h-9 px-3.5 bg-[#551382]/15 border border-[#551382]/35 rounded-lg text-[#85B7EB] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#551382]/25">
            <Archive size={14} /> Archivio
          </button>
          <div className="text-[11px] text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 font-medium">
            {format(today, 'EEEE d MMMM yyyy', { locale: it })}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <div className="w-6.5 h-6.5 rounded-full bg-[#1e3550] flex items-center justify-center text-[10px] text-[#8ab0c8] font-semibold">
              {user?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            {user?.nome}
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-5 gap-2.5">
        {stats.map((k, i) => (
          <div key={i} className="bg-[#0f2035] border border-white/5 rounded-xl p-3.5 border-t-2" style={{ borderTopColor: k.color }}>
            <div className="text-lg font-semibold text-[#ddeeff] leading-none">{k.val}</div>
            <div className="text-[10px] text-[#3a5a7a] uppercase tracking-wider mt-1.5 font-medium">{k.lbl}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="flex bg-[#0f2035] border border-white/10 rounded-xl p-1 w-fit">
        {[
          { id: 'nuovo', label: 'Nuovo Subaffidamento', icon: Plus },
          { id: 'elenco', label: 'Elenco & Filtri', icon: List },
          { id: 'dettaglio', label: 'Dettaglio & Aggiorna', icon: Search },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={cn(
              "px-5.5 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2",
              tab === t.id ? "bg-[#534AB7] text-[#e8e6f8]" : "text-[#4a6a8a] hover:bg-white/5 hover:text-[#8ab0c8]"
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* PANE NUOVO */}
      {tab === 'nuovo' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0f2035] border border-white/10 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-[#ddeeff]">Inserimento nuovo subaffidamento</h2>
            <span className="text-[10px] text-[#2a4a6a]">Tutti i campi <span className="text-[#E24B4A]">*</span> sono obbligatori</span>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest border-b border-white/5 pb-2">Tipo Subaffidamento</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setTipo('Subappalto')}
                className={cn(
                  "p-3.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2.5",
                  tipo === 'Subappalto' ? "bg-[#378ADD]/20 border-[#378ADD]/50 text-[#85B7EB]" : "bg-white/3 border-white/10 text-[#5a7a9a] hover:border-white/20"
                )}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#378ADD]" /> Subappalto
              </button>
              <button 
                onClick={() => setTipo('Subcontratto')}
                className={cn(
                  "p-3.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2.5",
                  tipo === 'Subcontratto' ? "bg-[#1D9E75]/20 border-[#1D9E75]/50 text-[#5DCAA5]" : "bg-white/3 border-white/10 text-[#5a7a9a] hover:border-white/20"
                )}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" /> Subcontratto
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest border-b border-white/5 pb-2">Anagrafica Contratto</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5">ID Contratto SAP <span className="text-[#E24B4A]">*</span> <Info size={12} className="text-[#534AB7]" /></label>
                <input type="text" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="es. 2510019733" className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-sm px-3 outline-none focus:border-[#534AB7]/60 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5">Oggetto Contratto <Info size={12} className="text-[#534AB7]" /></label>
                <input type="text" value={formData.oggetto} onChange={e => setFormData({...formData, oggetto: e.target.value})} placeholder="es. Contratto Aperto RTI WSP EPRI" className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-sm px-3 outline-none focus:border-[#534AB7]/60 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5">Appaltatore <span className="text-[#E24B4A]">*</span> <Info size={12} className="text-[#534AB7]" /></label>
                <select value={formData.app} onChange={e => setFormData({...formData, app: e.target.value})} className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-sm px-3 outline-none focus:border-[#534AB7]/60 transition-all cursor-pointer">
                  <option value="">Seleziona appaltatore...</option>
                  {appaltatori.map(a => <option key={a.nome} value={a.nome}>{a.nome}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5">Subfornitore <span className="text-[#E24B4A]">*</span> <Info size={12} className="text-[#534AB7]" /></label>
                <input type="text" value={formData.sub} onChange={e => setFormData({...formData, sub: e.target.value})} placeholder="es. Geotest SRL" className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-sm px-3 outline-none focus:border-[#534AB7]/60 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5">Attività / Categoria <span className="text-[#E24B4A]">*</span> <Info size={12} className="text-[#534AB7]" /></label>
                <input type="text" value={formData.attivita} onChange={e => setFormData({...formData, attivita: e.target.value})} placeholder="es. BESS, Opere Civili" className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-sm px-3 outline-none focus:border-[#534AB7]/60 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5">Oggetto Richiesta <Info size={12} className="text-[#534AB7]" /></label>
                <input type="text" value={formData.oggRich} onChange={e => setFormData({...formData, oggRich: e.target.value})} placeholder="es. Installazione impianti fotovoltaici" className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-sm px-3 outline-none focus:border-[#534AB7]/60 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5">Data Inizio <Info size={12} className="text-[#534AB7]" /></label>
                <input type="date" value={formData.inizio} onChange={e => setFormData({...formData, inizio: e.target.value})} className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-sm px-3 outline-none focus:border-[#534AB7]/60 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5">Data Fine / Scadenza <Info size={12} className="text-[#534AB7]" /></label>
                <input type="date" value={formData.fine} onChange={e => setFormData({...formData, fine: e.target.value})} className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-sm px-3 outline-none focus:border-[#534AB7]/60 transition-all" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest border-b border-white/5 pb-2">Stato Iniziale <span className="text-[#E24B4A]">*</span></h3>
            <div className="flex flex-wrap gap-2">
              {(tipo === 'Subappalto' ? STATI_SUB : STATI_CON).map(s => (
                <button
                  key={s}
                  onClick={() => setFormData({...formData, stato: s})}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-[11px] font-medium border transition-all",
                    formData.stato === s ? "bg-[#534AB7]/20 border-[#534AB7]/60 text-[#a89ef8]" : "bg-white/3 border-white/10 text-[#5a7a9a] hover:bg-white/5"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-5 border-t border-white/5">
            <button onClick={handleSaveNuovo} className="flex-1 h-11 bg-[#534AB7] text-[#e8e6f8] rounded-lg text-sm font-bold shadow-lg shadow-[#534AB7]/20 hover:bg-[#6358cc] transition-all">
              Salva Subaffidamento
            </button>
            <button onClick={() => setFormData({ id: '', oggetto: '', app: '', sub: '', attivita: '', oggRich: '', stato: 'Inviata', inizio: '', fine: '', note: '' })} className="h-11 px-5 bg-white/5 border border-white/10 rounded-lg text-[#6a8aaa] text-xs font-medium hover:bg-white/10 transition-all">
              Pulisci Form
            </button>
          </div>
        </motion.div>
      )}

      {/* PANE ELENCO */}
      {tab === 'elenco' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0f2035] border border-white/10 rounded-xl p-4">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-sm font-semibold text-[#ddeeff]">Elenco Subaffidamenti</h2>
            <div className="flex gap-2">
              <button onClick={() => {
                  const rows = filteredElenco.map(d => ({
                    ID: d.id, Appaltatore: d.appaltatore || d.app,
                    Subfornitore: d.subfornitore || d.sub,
                    Tipo: d.tipo, Stato: d.stato,
                    'ID SAP': d.idSapContratto || d.idSap,
                    'Oggetto': d.oggetto, 'Attività': d.attivita,
                    'Data Inizio': d.dataInizio || d.inizio,
                    'Data Fine': d.dataFine || d.scadenza,
                    'Importo (€)': d.importoRichiestoEuro || d.importoEur,
                  }));
                  const ws = XLSX.utils.json_to_sheet(rows);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Subaffidamenti');
                  XLSX.writeFile(wb, 'subaffidamenti_export.xlsx');
                }} className="text-[10px] px-3 py-1.5 rounded-lg border border-[#1D9E75]/30 text-[#5DCAA5] bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 transition-all flex items-center gap-1.5">
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>

          <div className="flex gap-3 mb-6 items-end flex-wrap">
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#2a4a6a] uppercase tracking-wider font-bold">Appaltatore</label>
              <select 
                value={elencoFilters.app}
                onChange={e => setElencoFilters({...elencoFilters, app: e.target.value})}
                className="h-9 min-w-[180px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/50"
              >
                <option value="">Tutti gli appaltatori</option>
                {appaltatori.map(a => <option key={a.nome} value={a.nome}>{a.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#2a4a6a] uppercase tracking-wider font-bold">Tipo</label>
              <select 
                value={elencoFilters.tipo}
                onChange={e => setElencoFilters({...elencoFilters, tipo: e.target.value})}
                className="h-9 min-w-[130px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/50"
              >
                <option value="">Tutti i tipi</option>
                <option>Subappalto</option>
                <option>Subcontratto</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#2a4a6a] uppercase tracking-wider font-bold">Stato</label>
              <select 
                value={elencoFilters.stato}
                onChange={e => setElencoFilters({...elencoFilters, stato: e.target.value})}
                className="h-9 min-w-[160px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/50"
              >
                <option value="">Tutti gli stati</option>
                {STATI_ALL.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[220px]">
              <label className="text-[10px] text-[#2a4a6a] uppercase tracking-wider font-bold">Cerca</label>
              <input 
                type="text" 
                value={elencoFilters.search}
                onChange={e => setElencoFilters({...elencoFilters, search: e.target.value})}
                placeholder="ID, appaltatore, subfornitore..." 
                className="w-full h-9 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/50"
              />
            </div>
            <button 
              onClick={() => setElencoFilters({ app: '', tipo: '', stato: '', search: '' })}
              className="h-9 px-4 bg-white/5 border border-white/10 rounded-lg text-[#6a8aaa] text-xs font-medium hover:bg-white/10 transition-all"
            >
              ↺ Reset
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-[#2a4a6a] uppercase tracking-wider">
                  <th className="pb-3 px-3 font-semibold">ID SAP</th>
                  <th className="pb-3 px-3 font-semibold">Appaltatore</th>
                  <th className="pb-3 px-3 font-semibold">Subfornitore</th>
                  <th className="pb-3 px-3 font-semibold">Tipo</th>
                  <th className="pb-3 px-3 font-semibold">Stato</th>
                  <th className="pb-3 px-3 font-semibold">Attività</th>
                  <th className="pb-3 px-3 font-semibold text-center">Giorni</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredElenco.map((d, i) => {
                  const diff = d.fine ? differenceInDays(new Date(d.fine), today) : null;
                  return (
                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors cursor-pointer border-t border-white/5" onClick={() => { setSelectedRecordId(d.id); setTab('dettaglio'); }}>
                      <td className="py-3.5 px-3 font-mono text-[#4a9fe8]">{d.id}</td>
                      <td className="py-3.5 px-3 text-[#a0b8d0] font-medium">{d.appaltatore || d.app}</td>
                      <td className="py-3.5 px-3 text-[#c8ddf0]">{d.subfornitore || d.sub}</td>
                      <td className="py-3.5 px-3">
                        <span className={cn("pill", d.tipo === 'Subappalto' ? 'bg-[#378ADD]/15 text-[#85B7EB]' : 'bg-[#1D9E75]/15 text-[#5DCAA5]')}>
                          {d.tipo}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={cn("pill", STATO_CLS[d.stato] || "bg-white/5 text-[#5a7a9a]")}>
                          {d.stato}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#5a7a9a] truncate max-w-[120px]">{d.attivita}</td>
                      <td className="py-3.5 px-3 text-center">
                        {diff !== null ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                            diff < 0 ? "bg-[#E24B4A]/12 text-[#f09595]" : diff <= 30 ? "bg-[#F5A800]/12 text-[#F5A800]" : "bg-[#1D9E75]/12 text-[#5DCAA5]"
                          )}>
                            {diff >= 0 ? '+' : ''}{diff}gg
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-[11px] text-[#2a4a6a] font-medium">
            {filteredElenco.length} pratiche trovate
          </div>
        </motion.div>
      )}

      {/* PANE DETTAGLIO */}
      {tab === 'dettaglio' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0f2035] border border-white/10 rounded-xl p-4">
          {!selectedRecord ? (
            <div className="text-center py-16 space-y-4">
              <div className="text-4xl opacity-20">🔍</div>
              <p className="text-sm text-[#3a5a7a]">Cerca una pratica nell'elenco per visualizzarne i dettagli e aggiornare lo stato</p>
              <button onClick={() => setTab('elenco')} className="text-[#534AB7] text-xs font-bold hover:underline uppercase tracking-wider">Vai all'elenco</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4.5 p-4.5 bg-[#0b1a2e] rounded-xl border border-white/5">
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-[#ddeeff]">{selectedRecord.appaltatore || selectedRecord.app} — {selectedRecord.subfornitore || selectedRecord.sub}</h2>
                  <p className="text-[11px] text-[#3a5a7a] mt-1 font-mono">{selectedRecord.id} • {selectedRecord.oggetto || 'Nessun oggetto'}</p>
                </div>
                <span className={cn("pill px-4 py-1.5 text-xs", STATO_CLS[selectedRecord.stato] || "bg-white/5 text-[#5a7a9a]")}>
                  {selectedRecord.stato}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'Tipo', val: selectedRecord.tipo },
                  { key: 'Attività', val: selectedRecord.attivita },
                  { key: 'Oggetto Richiesta', val: selectedRecord.oggRich || '—' },
                  { key: 'Data Inizio', val: selectedRecord.inizio ? format(new Date(selectedRecord.inizio), 'dd/MM/yyyy') : '—' },
                  { key: 'Data Fine', val: selectedRecord.fine ? format(new Date(selectedRecord.fine), 'dd/MM/yyyy') : '—' },
                  { key: 'Importo', val: selectedRecord.importoEur ? `€ ${Number(selectedRecord.importoEur).toLocaleString('it-IT')}` : '—' },
                ].map(f => (
                  <div key={f.key} className="bg-[#0b1a2e] rounded-lg p-3.5 border border-white/3">
                    <div className="text-[9px] text-[#2a4a6a] uppercase tracking-widest mb-1">{f.key}</div>
                    <div className="text-xs text-[#a0b8d0] font-medium">{f.val}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-[#2a4a6a] uppercase tracking-widest border-b border-white/5 pb-2">Aggiorna Stato</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedRecord.tipo === 'Subappalto' ? STATI_SUB : STATI_CON).map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        const oldStato = selectedRecord.stato;
                        setSubaffidamenti(prev => prev.map(d => d.id === selectedRecord.id ? { ...d, stato: s } : d));
                        addActivity('update', 'Subaffidamenti', `Aggiornato stato pratica ${selectedRecord.id}`, `${oldStato} → ${s}`);
                        alert(`Stato aggiornato a ${s}`);
                      }}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-[11px] font-medium border transition-all",
                        selectedRecord.stato === s ? "bg-[#534AB7]/20 border-[#534AB7]/60 text-[#a89ef8]" : "bg-white/3 border-white/10 text-[#5a7a9a] hover:bg-white/5"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex gap-3">
                <button className="h-10 px-5 bg-white/5 border border-white/10 rounded-lg text-[#6a8aaa] text-xs font-medium hover:bg-white/10 transition-all" onClick={() => setSelectedRecordId(null)}>Chiudi Dettaglio</button>
                <button className="h-10 px-5 bg-[#E24B4A]/10 border border-[#E24B4A]/25 rounded-lg text-[#f09595] text-xs font-medium hover:bg-[#E24B4A]/20 transition-all flex items-center gap-2 ml-auto">
                  <Trash2 size={14} /> Elimina Pratica
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default GestioneSubaffidamenti;
