import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Info,
  Euro,
  ArrowRightLeft,
  SkipForward,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Subaffidamento } from '../types';

type DupAction = 'update' | 'skip';

interface ParsedRow extends Partial<Subaffidamento> {
  _status: 'new' | 'dup_same' | 'dup_changed';
  _existingIdx: number | null;
  _changedFields: { field: string; oldVal: string; newVal: string }[];
  _dupAction?: DupAction;
}

const FIELD_LABELS: Record<string, string> = {
  stato: 'Stato',
  appaltatore: 'Appaltatore',
  subfornitore: 'Subfornitore',
  oggetto: 'Oggetto',
  oggettoRichiesta: 'Oggetto Richiesta',
  dataInizio: 'Data Inizio',
  dataFine: 'Data Fine',
  importoRichiestoEuro: 'Importo (€)',
  statoQualifica: 'Stato Qualifica',
  statoAnagrafica: 'Stato Anagrafica',
  statoPerProvvedimento: 'Stato Provvedimento',
  allegati: 'Allegati',
  protocolloNpa: 'Protocollo NPA',
  esitoProtocolloNpa: 'Esito NPA',
};

const CHECKED_FIELDS = Object.keys(FIELD_LABELS);

const mapRow = (row: any): Partial<Subaffidamento> => ({
  id: String(row['ID'] || ''),
  stato: String(row['Stato'] || ''),
  versione: Number(row['Versione']) || undefined,
  idSapContratto: String(row['ID SAP Contratto'] || ''),
  idSap: String(row['ID SAP Contratto'] || ''),
  unitaGestore: String(row['Unità gestore'] || ''),
  unitaGest: String(row['Unità gestore'] || ''),
  unitaProcuratore: String(row['Unità Procuratore/Approvvigionante'] || ''),
  societaCommittente: String(row['Società Committente'] || ''),
  socComm: String(row['Società Committente'] || ''),
  oggetto: String(row['Oggetto'] || ''),
  dataInizioContratto: String(row['Data Inizio Contratto'] || ''),
  dataFineContratto: String(row['Data Fine Contratto'] || ''),
  valuta: String(row['Valuta'] || ''),
  appaltatore: String(row['Appaltatore'] || ''),
  app: String(row['Appaltatore'] || ''),
  codiceSapAppaltatore: String(row['Codice SAP Appaltatore'] || ''),
  subfornitore: String(row['Subfornitore'] || ''),
  sub: String(row['Subfornitore'] || ''),
  codiceSapSubfornitore: String(row['Codice SAP Subfornitore'] || ''),
  gm: String(row['GM'] || ''),
  descrizioneGm: String(row['Descrizione GM'] || ''),
  noteAppaltatore: String(row['Note Appaltatore'] || ''),
  oggettoRichiesta: String(row['Oggetto Richiesta'] || ''),
  tipo: (String(row['Tipologia'] || 'Subappalto')) as 'Subappalto' | 'Subcontratto',
  dataCreazione: String(row['Data Creazione'] || ''),
  inserito: String(row['Data Creazione'] || format(new Date(), 'yyyy-MM-dd')),
  dataInizio: String(row['Data Inizio'] || ''),
  inizio: String(row['Data Inizio'] || ''),
  dataFine: String(row['Data Fine'] || ''),
  scadenza: String(row['Data Fine'] || ''),
  primaDataAutorizzazione: String(row['Prima data di Autorizzazione'] || ''),
  contractHolder: String(row['Contract Holder'] || ''),
  importoRichiestoValuta: String(row['Importo richiesto in valuta'] || ''),
  importoRichiestoEuro: String(row['Importo richiesto in euro'] || ''),
  importoEur: String(row['Importo richiesto in euro'] || ''),
  importoMassimoSubappaltabile: String(row['Importo massimo subappaltabile in valuta'] || ''),
  importoMaxSub: String(row['Importo massimo subappaltabile in valuta'] || ''),
  residuoSubappaltabile: String(row['Residuo subappaltabile in valuta'] || ''),
  residuoSub: String(row['Residuo subappaltabile in valuta'] || ''),
  statoQualifica: String(row['Stato Qualifica'] || ''),
  statoAnagrafica: String(row['Stato Anagrafica'] || ''),
  statoPerProvvedimento: String(row['Stato Per Provvedimento'] || ''),
  statoProv: String(row['Stato Per Provvedimento'] || ''),
  allegati: String(row['Allegati'] || ''),
  antimafia: String(row['Antimafia'] || ''),
  nominativiChecklist: String(row['Nominativi Checklist'] || ''),
  richiestoNullaosta: row['Richiesto nullaosta'] === true || row['Richiesto nullaosta'] === 'TRUE',
  dataUltimoAggiornamento: String(row['Data Ultimo Aggiornamento'] || ''),
  allegatiScaduti: row['Allegati Scaduti'] === true || row['Allegati Scaduti'] === 'TRUE',
  protocolloNpa: String(row['Protocollo NPA'] || ''),
  esitoProtocolloNpa: String(row['Esito Protocollo NPA'] || ''),
  motivazioneProtocollo: String(row['Motivazione Protocollo'] || ''),
  ch: String(row['CH'] || ''),
  cam: String(row['CAM'] || ''),
  ca: String(row['CA'] || ''),
  chc: String(row['CHC'] || ''),
  cc: String(row['CC'] || ''),
});

const ImportaExcel: React.FC = () => {
  const { subaffidamenti, setSubaffidamenti, addActivity } = useData();
  const { user } = useAuth();

  const [step, setStep] = useState<'upload' | 'preview' | 'review' | 'importing' | 'success'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [summaryStats, setSummaryStats] = useState({ nuovi: 0, aggiornati: 0, mantenuti: 0, saltati: 0, appaltatori: 0, documenti: 0 });
  const [importLog, setImportLog] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<DupAction | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      // Costruisce l'indice per ricerca rapida
      const existingById: Record<string, { idx: number; record: Subaffidamento }> = {};
      subaffidamenti.forEach((s, idx) => {
        existingById[s.id] = { idx, record: s };
      });

      const rows: ParsedRow[] = json.map((rawRow: any) => {
        const mapped = mapRow(rawRow);
        const rowId = mapped.id || '';
        const existing = existingById[rowId];

        if (!existing) {
          return { ...mapped, _status: 'new', _existingIdx: null, _changedFields: [] };
        }

        // Calcola campi cambiati
        const changedFields: { field: string; oldVal: string; newVal: string }[] = [];
        for (const field of CHECKED_FIELDS) {
          const newVal = String((mapped as any)[field] || '').trim();
          const oldVal = String((existing.record as any)[field] || '').trim();
          if (newVal && oldVal !== newVal) {
            changedFields.push({
              field,
              oldVal: oldVal || '—',
              newVal,
            });
          }
        }

        const status = changedFields.length === 0 ? 'dup_same' : 'dup_changed';
        return {
          ...mapped,
          _status: status,
          _existingIdx: existing.idx,
          _changedFields: changedFields,
          _dupAction: status === 'dup_same' ? 'skip' : undefined,
        };
      });

      setParsedRows(rows);
      setBulkAction(null);
      setStep('preview');
    };
    reader.readAsArrayBuffer(file);
  };

  const setRowAction = (i: number, action: DupAction) => {
    setParsedRows(prev => prev.map((r, idx) => idx === i ? { ...r, _dupAction: action } : r));
  };

  const applyBulkAction = (action: DupAction) => {
    setBulkAction(action);
    setParsedRows(prev =>
      prev.map(r =>
        r._status === 'dup_changed' || r._status === 'dup_same'
          ? { ...r, _dupAction: action }
          : r
      )
    );
  };

  // Righe che ancora non hanno una decisione (solo dup_changed non ha default)
  const pendingDecisions = useMemo(
    () => parsedRows.filter(r => r._status === 'dup_changed' && !r._dupAction).length,
    [parsedRows]
  );

  const previewStats = useMemo(() => {
    const nuovi = parsedRows.filter(r => r._status === 'new').length;
    const dupSame = parsedRows.filter(r => r._status === 'dup_same').length;
    const dupChanged = parsedRows.filter(r => r._status === 'dup_changed').length;
    return { nuovi, dupSame, dupChanged, totale: parsedRows.length };
  }, [parsedRows]);

  const doImport = () => {
    setStep('importing');
    let count = 0;

    const interval = setInterval(() => {
      count += 12;
      setProgress(Math.min(count, 100));
      if (count >= 100) {
        clearInterval(interval);

        let nuovi = 0, aggiornati = 0, mantenuti = 0, saltati = 0;
        const log: string[] = [];

        setSubaffidamenti(prev => {
          const updated = [...prev];
          for (const row of parsedRows) {
            const { _status, _existingIdx, _dupAction, _changedFields, ...record } = row;
            if (_status === 'new') {
              updated.unshift(record as Subaffidamento);
              nuovi++;
              log.push(`— Inserito: ${record.id}`);
            } else if (_status === 'dup_same') {
              mantenuti++;
              log.push(`— Mantenuto: ${record.id} (nessuna modifica)`);
            } else if (_status === 'dup_changed') {
              if (_dupAction === 'update' && _existingIdx !== null) {
                updated[_existingIdx] = { ...updated[_existingIdx], ...record } as Subaffidamento;
                aggiornati++;
                log.push(`— Aggiornato: ${record.id} (${_changedFields.length} campi)`);
              } else {
                saltati++;
                log.push(`— Saltato: ${record.id}`);
              }
            }
          }
          return updated;
        });

        setSummaryStats({ nuovi, aggiornati, mantenuti, saltati, appaltatori: 0, documenti: 0 });
        setImportLog(log);
        addActivity('import', 'Importazione Excel', `Import: ${nuovi} nuovi, ${aggiornati} aggiornati, ${mantenuti} mantenuti, ${saltati} saltati`, `File elaborato — ${parsedRows.length} righe totali`);
        setStep('success');
      }
    }, 80);
  };

  const STATUS_LABELS = {
    new: { label: 'NUOVO', cls: 'bg-[#1D9E75]/15 text-[#5DCAA5]' },
    dup_same: { label: 'IDENTICO', cls: 'bg-white/8 text-[#4a6a8a]' },
    dup_changed: { label: 'AGGIORNATO', cls: 'bg-[#F5A800]/12 text-[#F5A800]' },
  };

  return (
    <div className="p-5 space-y-5">
      {/* TOPBAR */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-base font-semibold text-[#ddeeff]">Importa da Excel</h1>
          <p className="text-xs text-[#3a5a7a] mt-1">Carica il file elaborato dal portale aziendale — il sistema rileva automaticamente nuovi record e aggiornamenti.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#8ab0c8] hover:bg-white/10 transition-all">
            <FileText size={18} />
          </button>
          <div className="h-10 flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-[#8ab0c8] font-medium whitespace-nowrap capitalize">
            {format(new Date(), 'EEEE d MMM yyyy', { locale: it })}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#534AB7] to-[#378ADD] flex items-center justify-center text-[10px] text-white font-bold shadow-[0_0_10px_rgba(83,74,183,0.4)]">
              {user?.nome?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <span className="text-[#c8ddf0] font-medium">{user?.nome}</span>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      {step !== 'importing' && (
        <div className="flex items-center gap-0">
          {[
            { id: 'upload',  label: 'Carica File',  n: 1 },
            { id: 'preview', label: 'Anteprima',     n: 2 },
            { id: 'review',  label: 'Riepilogo',     n: 3 },
            { id: 'success', label: 'Completato',    n: 4 },
          ].map((s, i, arr) => {
            const order = ['upload','preview','review','success'];
            const curIdx = order.indexOf(step);
            const sIdx = order.indexOf(s.id);
            const done = sIdx < curIdx;
            const active = sIdx === curIdx;
            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all',
                    done ? 'bg-[#1D9E75] border-[#1D9E75] text-white' :
                    active ? 'bg-[#534AB7] border-[#534AB7] text-white shadow-[0_0_12px_rgba(83,74,183,0.4)]' :
                    'bg-white/5 border-white/10 text-[#3a5a7a]'
                  )}>
                    {done ? <Check size={12} /> : s.n}
                  </div>
                  <span className={cn('text-[11px] font-bold whitespace-nowrap', active ? 'text-[#ddeeff]' : done ? 'text-[#1D9E75]' : 'text-[#3a5a7a]')}>
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className={cn('flex-1 h-px mx-3', sIdx < curIdx ? 'bg-[#1D9E75]/40' : 'bg-white/8')} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* STEP: UPLOAD */}
      {step === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f2035] border border-white/10 rounded-xl p-6 space-y-6"
        >
          <div>
            <h2 className="text-sm font-bold text-[#ddeeff]">Seleziona il file Excel</h2>
            <p className="text-xs text-[#3a5a7a] mt-1">
              Trascina il file .xlsx esportato dal portale aziendale o clicca per selezionarlo.
            </p>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-[#534AB7]/30 rounded-xl p-10 text-center relative bg-[#534AB7]/3 hover:bg-[#534AB7]/8 transition-all group cursor-pointer"
          >
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".xlsx,.xls"
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload size={40} className="mx-auto mb-4 text-[#534AB7]/50 group-hover:text-[#534AB7] transition-colors" />
            <h3 className="text-sm font-bold text-[#ddeeff] mb-1">Trascina il file qui</h3>
            <p className="text-xs text-[#3a5a7a]">
              Formati supportati: <strong>.xlsx</strong> • <strong>.xls</strong>
            </p>
            <button className="mt-5 h-10 px-5 bg-[#534AB7] text-[#e8e6f8] rounded-xl text-xs font-bold shadow-lg shadow-[#534AB7]/20 hover:bg-[#6358cc] transition-all">
              Scegli file
            </button>
          </div>

          {/* Legenda comportamento duplicati */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                icon: <Check size={16} />,
                color: '#1D9E75',
                title: 'Record nuovo',
                desc: 'ID non presente nel sistema — viene inserito automaticamente.',
              },
              {
                icon: <ArrowRightLeft size={16} />,
                color: '#F5A800',
                title: 'Record aggiornato',
                desc: 'Stesso ID ma uno o più campi sono cambiati — puoi scegliere di aggiornare o saltare.',
              },
              {
                icon: <SkipForward size={16} />,
                color: '#4a6a8a',
                title: 'Record identico',
                desc: 'Stesso ID, dati invariati — viene saltato automaticamente.',
              },
            ].map(item => (
              <div
                key={item.title}
                className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-2"
              >
                <div style={{ color: item.color }}>{item.icon}</div>
                <h4 className="text-xs font-bold text-[#ddeeff]">{item.title}</h4>
                <p className="text-[10px] text-[#3a5a7a] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#534AB7]/8 border border-[#534AB7]/20 rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-bold text-[#a89ef8] flex items-center gap-2 uppercase tracking-widest">
              <Info size={14} /> Colonne riconosciute automaticamente
            </div>
            <div className="flex flex-wrap gap-2">
              {['ID', 'Stato', 'ID SAP Contratto', 'Appaltatore', 'Subfornitore', 'Tipologia', 'Data Inizio', 'Data Fine', 'Importo', 'Contract Holder', 'CH', 'CAM'].map(c => (
                <span key={c} className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[#3a5a7a] font-medium">{c}</span>
              ))}
              <span className="text-[10px] text-[#3a5a7a] font-medium italic">+39 altre colonne</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP: PREVIEW */}
      {step === 'preview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

          {/* Riepilogo contatori */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Totale righe', val: previewStats.totale, color: '#a89ef8', bg: 'bg-[#534AB7]/10' },
              { label: 'Nuovi record', val: previewStats.nuovi, color: '#5DCAA5', bg: 'bg-[#1D9E75]/10' },
              { label: 'Con modifiche', val: previewStats.dupChanged, color: '#F5A800', bg: 'bg-[#F5A800]/10' },
              { label: 'Identici (skip)', val: previewStats.dupSame, color: '#4a6a8a', bg: 'bg-white/5' },
            ].map(s => (
              <div key={s.label} className={cn('border border-white/8 rounded-xl p-3.5 flex items-center gap-3', s.bg)}>
                <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[10px] text-[#3a5a7a] font-bold uppercase tracking-wider leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Azioni bulk per duplicati */}
          {previewStats.dupChanged > 0 && (
            <div className="bg-[#F5A800]/8 border border-[#F5A800]/25 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#F5A800] flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {previewStats.dupChanged} record con modifiche rilevate
                </div>
                <div className="text-[10px] text-[#3a5a7a]">
                  {pendingDecisions > 0
                    ? `${pendingDecisions} ancora senza decisione — usa le azioni rapide o gestisci riga per riga`
                    : 'Tutte le decisioni sono state prese'}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-[#3a5a7a] font-medium">Azione massiva:</span>
                <button
                  onClick={() => applyBulkAction('update')}
                  className={cn(
                    'h-8 px-3.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5',
                    bulkAction === 'update'
                      ? 'bg-[#F5A800] border-[#F5A800] text-[#07101e]'
                      : 'border-[#F5A800]/40 text-[#F5A800] hover:bg-[#F5A800]/15'
                  )}
                >
                  <CheckCheck size={12} /> Aggiorna tutti
                </button>
                <button
                  onClick={() => applyBulkAction('skip')}
                  className={cn(
                    'h-8 px-3.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5',
                    bulkAction === 'skip'
                      ? 'bg-white/20 border-white/30 text-[#ddeeff]'
                      : 'border-white/15 text-[#6a8aaa] hover:bg-white/8'
                  )}
                >
                  <SkipForward size={12} /> Salta tutti
                </button>
              </div>
            </div>
          )}

          {/* Tabella preview */}
          <div className="bg-[#0f2035] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#ddeeff]">Anteprima — {previewStats.totale} righe</h2>
              <span className="text-[10px] text-[#3a5a7a]">Clicca su una riga con modifiche per vedere il dettaglio</span>
            </div>

            <div className="overflow-x-auto max-h-[460px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-[#2a4a6a] uppercase tracking-wider sticky top-0 bg-[#0f2035] z-10">
                    <th className="py-2.5 px-4 font-bold border-b border-white/8">Stato import</th>
                    <th className="py-2.5 px-4 font-bold border-b border-white/8">ID</th>
                    <th className="py-2.5 px-4 font-bold border-b border-white/8">Appaltatore</th>
                    <th className="py-2.5 px-4 font-bold border-b border-white/8">Subfornitore</th>
                    <th className="py-2.5 px-4 font-bold border-b border-white/8">Stato pratica</th>
                    <th className="py-2.5 px-4 font-bold border-b border-white/8">Importo (€)</th>
                    <th className="py-2.5 px-4 font-bold border-b border-white/8">Azione</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-white/5">
                  {parsedRows.map((row, i) => {
                    const statusInfo = STATUS_LABELS[row._status];
                    const isExpanded = expandedRow === i;
                    const hasChanges = row._status === 'dup_changed';

                    return (
                      <React.Fragment key={i}>
                        <tr
                          className={cn(
                            'transition-colors',
                            hasChanges ? 'cursor-pointer hover:bg-[#F5A800]/5' : '',
                            row._status === 'new' ? 'bg-[#1D9E75]/4' : '',
                            row._status === 'dup_same' ? 'opacity-50' : '',
                            isExpanded ? 'bg-[#F5A800]/8' : ''
                          )}
                          onClick={() => hasChanges && setExpandedRow(isExpanded ? null : i)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', statusInfo.cls)}>
                                {statusInfo.label}
                              </span>
                              {hasChanges && (
                                <span className="text-[9px] text-[#F5A800] font-mono">
                                  {row._changedFields.length} modif.
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#4a9fe8]">{row.id}</td>
                          <td className="py-3 px-4 text-[#a0b8d0] max-w-[200px] truncate" title={row.appaltatore}>
                            {row.appaltatore}
                          </td>
                          <td className="py-3 px-4 text-[#c8ddf0] max-w-[200px] truncate" title={row.subfornitore}>
                            {row.subfornitore}
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full',
                              row.stato === 'Scaduta' ? 'bg-[#E24B4A]/12 text-[#f09595]' :
                              row.stato === 'In Attesa SAP' ? 'bg-[#534AB7]/15 text-[#a89ef8]' :
                              'bg-[#F5A800]/12 text-[#F5A800]'
                            )}>
                              {row.stato}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#F5A800]">
                            {row.importoRichiestoEuro || row.importoEur || '—'}
                          </td>
                          <td className="py-3 px-4">
                            {row._status === 'new' && (
                              <span className="text-[10px] text-[#5DCAA5] font-bold flex items-center gap-1">
                                <Check size={11} /> Inserisci
                              </span>
                            )}
                            {row._status === 'dup_same' && (
                              <span className="text-[10px] text-[#4a6a8a] font-bold flex items-center gap-1">
                                <SkipForward size={11} /> Salta
                              </span>
                            )}
                            {row._status === 'dup_changed' && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={e => { e.stopPropagation(); setRowAction(i, 'update'); }}
                                  className={cn(
                                    'h-7 px-2.5 rounded-lg text-[10px] font-bold border transition-all',
                                    row._dupAction === 'update'
                                      ? 'bg-[#F5A800] border-[#F5A800] text-[#07101e]'
                                      : 'border-[#F5A800]/35 text-[#F5A800] hover:bg-[#F5A800]/15'
                                  )}
                                >
                                  Aggiorna
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setRowAction(i, 'skip'); }}
                                  className={cn(
                                    'h-7 px-2.5 rounded-lg text-[10px] font-bold border transition-all',
                                    row._dupAction === 'skip'
                                      ? 'bg-white/15 border-white/25 text-[#ddeeff]'
                                      : 'border-white/12 text-[#6a8aaa] hover:bg-white/8'
                                  )}
                                >
                                  Salta
                                </button>
                                {!row._dupAction && (
                                  <span className="text-[9px] text-[#E24B4A] font-bold ml-1">!</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* RIGA ESPANSA: diff campi */}
                        {isExpanded && hasChanges && (
                          <tr>
                            <td colSpan={7} className="bg-[#0b1828] px-4 py-3 border-b border-[#F5A800]/15">
                              <div className="space-y-2">
                                <div className="text-[10px] font-bold text-[#F5A800] uppercase tracking-widest mb-3">
                                  Modifiche rilevate — {row._changedFields.length} campo{row._changedFields.length > 1 ? 'i' : ''}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {row._changedFields.map(({ field, oldVal, newVal }) => (
                                    <div key={field} className="bg-white/3 border border-white/8 rounded-lg p-2.5 space-y-1.5">
                                      <div className="text-[9px] font-bold text-[#3a5a7a] uppercase tracking-widest">
                                        {FIELD_LABELS[field] || field}
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px]">
                                        <span className="text-[#E24B4A] line-through max-w-[120px] truncate" title={oldVal}>
                                          {oldVal}
                                        </span>
                                        <ArrowRight size={10} className="text-[#3a5a7a] shrink-0" />
                                        <span className="text-[#5DCAA5] font-bold max-w-[120px] truncate" title={newVal}>
                                          {newVal}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Avviso se ci sono decisioni mancanti */}
          {pendingDecisions > 0 && (
            <div className="bg-[#E24B4A]/8 border border-[#E24B4A]/25 rounded-xl p-3 flex items-center gap-3">
              <AlertTriangle size={16} className="text-[#E24B4A] shrink-0" />
              <p className="text-xs text-[#f09595]">
                <strong>{pendingDecisions}</strong> record con modifiche non hanno ancora una decisione.
                Usa "Aggiorna tutti" o "Salta tutti" oppure scegli riga per riga.
              </p>
            </div>
          )}

          {/* Azioni finali */}
          <div className="bg-[#0a1628] border-t border-white/5 -mx-0 px-0 py-3 flex items-center gap-3 flex-wrap rounded-b-xl">
            <button
              onClick={() => setStep('review')}
              disabled={pendingDecisions > 0}
              className={cn(
                'h-11 px-6 rounded-xl text-sm font-bold transition-all flex items-center gap-2',
                pendingDecisions > 0
                  ? 'bg-white/5 border border-white/10 text-[#3a5a7a] cursor-not-allowed'
                  : 'bg-[#534AB7] text-[#e8e6f8] shadow-lg shadow-[#534AB7]/20 hover:bg-[#6358cc]'
              )}
            >
              Procedi con importazione <ArrowRight size={16} />
            </button>
            <button
              onClick={() => { setStep('upload'); setParsedRows([]); }}
              className="h-11 px-5 bg-white/5 border border-white/10 rounded-xl text-[#6a8aaa] text-sm font-medium hover:bg-white/10 transition-all"
            >
              Annulla
            </button>
            <div className="ml-auto text-[11px] text-[#3a5a7a] space-x-3">
              <span className="text-[#5DCAA5] font-bold">{previewStats.nuovi} nuovi</span>
              <span>·</span>
              <span className="text-[#F5A800] font-bold">{parsedRows.filter(r => r._status === 'dup_changed' && r._dupAction === 'update').length} agg</span>
              <span>·</span>
              <span className="text-[#4a6a8a] font-bold">{parsedRows.filter(r => r._dupAction === 'skip' || r._status === 'dup_same').length} saltati</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP: REVIEW */}
      {step === 'review' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-bold text-[#ddeeff]">Passo 3 — Riepilogo importazione</h2>
            <p className="text-xs text-[#3a5a7a]">Verifica il riepilogo delle operazioni da eseguire e clicca "Importa Ora" per confermare.</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Nuovi Record',    val: previewStats.nuovi,    color: '#5DCAA5', bg: 'bg-[#1D9E75]/10'  },
              { label: 'Da Aggiornare',   val: parsedRows.filter(r => r._status === 'dup_changed' && r._dupAction === 'update').length, color: '#F5A800', bg: 'bg-[#F5A800]/10' },
              { label: 'Mantenuti (=)',   val: previewStats.dupSame,  color: '#a89ef8', bg: 'bg-[#534AB7]/10'  },
              { label: 'Saltati',         val: parsedRows.filter(r => r._status === 'dup_changed' && r._dupAction === 'skip').length, color: '#4a6a8a', bg: 'bg-white/5' },
            ].map(s => (
              <div key={s.label} className={cn('border border-white/8 rounded-xl p-5 text-center', s.bg)}>
                <div className="text-4xl font-bold font-mono mb-2" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[10px] text-[#3a5a7a] font-bold uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={doImport} className="h-12 px-8 bg-[#534AB7] text-[#e8e6f8] rounded-xl text-sm font-bold shadow-lg shadow-[#534AB7]/20 hover:bg-[#6358cc] transition-all flex items-center gap-2">
              <Upload size={16} /> Importa Ora
            </button>
            <button onClick={() => setStep('preview')} className="h-12 px-6 bg-white/5 border border-white/10 rounded-xl text-[#6a8aaa] text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2">
              <ArrowRight size={16} className="rotate-180" /> Torna all'anteprima
            </button>
            <button onClick={() => { setStep('upload'); setParsedRows([]); }} className="h-12 px-6 bg-white/5 border border-white/10 rounded-xl text-[#6a8aaa] text-sm font-bold hover:bg-white/10 transition-all">
              Annulla
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP: IMPORTING */}
      {step === 'importing' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
          <div className="bg-[#0f2035] border border-[#534AB7]/30 rounded-2xl p-8 w-full max-w-md space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <RefreshCw size={32} className="mx-auto text-[#534AB7] animate-spin" />
              <h2 className="text-base font-bold text-[#ddeeff]">Importazione in corso</h2>
              <p className="text-sm text-[#3a5a7a]">Elaborazione e aggiornamento database...</p>
            </div>
            <div className="space-y-2">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-[#534AB7] to-[#378ADD]"
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-[#3a5a7a] uppercase tracking-widest">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP: SUCCESS */}
      {step === 'success' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
          <div className="bg-[#0f2035] border border-white/10 rounded-xl p-10 text-center space-y-3">
            <div className="w-16 h-16 bg-[#1D9E75]/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(29,158,117,0.2)]">
              <Check size={32} className="text-[#1D9E75]" />
            </div>
            <h2 className="text-xl font-bold text-[#ddeeff]">Importazione completata!</h2>
            <p className="text-xs text-[#3a5a7a]">Il database è stato aggiornato correttamente.</p>
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Nuovi',       val: summaryStats.nuovi,       color: '#5DCAA5' },
                { label: 'Aggiornati',  val: summaryStats.aggiornati,  color: '#F5A800' },
                { label: 'Mantenuti',   val: summaryStats.mantenuti,   color: '#a89ef8' },
                { label: 'Saltati',     val: summaryStats.saltati,     color: '#4a6a8a' },
              ].map(s => (
                <div key={s.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-[9px] text-[#3a5a7a] uppercase font-bold tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              {[
                { label: 'Appaltatori Aggiunti', val: summaryStats.appaltatori, color: '#378ADD' },
                { label: 'Documenti Creati',     val: summaryStats.documenti,   color: '#378ADD' },
              ].map(s => (
                <div key={s.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-[9px] text-[#3a5a7a] uppercase font-bold tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Log importazione */}
          <div className="bg-[#0f2035] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <span className="text-[10px] font-bold text-[#3a5a7a] uppercase tracking-widest">Log Importazione</span>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar p-4 space-y-1">
              {importLog.slice(0, 50).map((l, i) => (
                <div key={i} className="text-[11px] text-[#4a6a8a] font-mono">{l}</div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { window.location.href = '/subaffidamenti'; }} className="h-11 px-6 bg-[#534AB7] text-[#e8e6f8] rounded-xl text-sm font-bold shadow-lg shadow-[#534AB7]/20 hover:bg-[#6358cc] transition-all flex items-center gap-2">
              <ArrowRight size={15} /> Vai a Subaffidamenti
            </button>
            <button onClick={() => { window.location.href = '/'; }} className="h-11 px-6 bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-xl text-[#5DCAA5] text-sm font-bold hover:bg-[#1D9E75]/25 transition-all flex items-center gap-2">
              <Check size={15} /> Vai alla Dashboard
            </button>
            <button onClick={() => { setStep('upload'); setParsedRows([]); setProgress(0); setImportLog([]); }} className="h-11 px-5 bg-white/5 border border-white/10 rounded-xl text-[#6a8aaa] text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2">
              <Upload size={15} /> Nuova Importazione
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ImportaExcel;
