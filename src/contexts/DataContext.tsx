import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Subaffidamento, Appaltatore, DocumentoControllo, ActivityLog, Settings, FollowUp, FollowUpStato } from '../types';
import { supabase, IS_PROD } from '../lib/supabase';

const DEFAULT_SETTINGS: Settings = {
  accent_color: '#534AB7',
  density: 'normal',
  animations: true,
  tooltips: true,
  alert_scadenze: true,
  alert_days: 30,
  alert_rigettate: true,
  alert_documenti: true,
  cal_auto: true,
  cal_default_view: 'today',
  import_dup_default: 'ask',
  import_preview: true,
  import_log: true,
  standby_enabled: true,
  standby_minutes: 15,
};

interface DataContextType {
  subaffidamenti: Subaffidamento[];
  appaltatori: Appaltatore[];
  documenti: DocumentoControllo[];
  activityLog: ActivityLog[];
  settings: Settings;
  followUps: FollowUp[];
  dataLoading: boolean;
  setSubaffidamenti: React.Dispatch<React.SetStateAction<Subaffidamento[]>>;
  setAppaltatori: React.Dispatch<React.SetStateAction<Appaltatore[]>>;
  setDocumenti: React.Dispatch<React.SetStateAction<DocumentoControllo[]>>;
  setActivityLog: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  setFollowUps: React.Dispatch<React.SetStateAction<FollowUp[]>>;
  addActivity: (tipo: ActivityLog['tipo'], foglio: string, desc: string, detail: string, userName?: string) => void;
  upsertFollowUp: (praticaId: string, appaltatore: string, subfornitore: string, documento: string, stato: FollowUpStato, gestitoDa: string, note?: string) => void;
  advanceFollowUp: (id: string, nuovoStato: FollowUpStato, gestitoDa: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

/* ── localStorage helpers (DEV) ── */
const lsLoad = (key: string, def: unknown) => {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; }
};
const lsSave = (key: string, val: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

/* ── Supabase app_storage helpers (PROD) ── */
const sbRead = async <T,>(key: string, def: T): Promise<T> => {
  try {
    const { data } = await supabase.from('app_storage').select('value').eq('key', key).maybeSingle();
    return data ? (data.value as T) : def;
  } catch { return def; }
};

const sbWrite = async (key: string, value: unknown) => {
  try {
    await supabase.from('app_storage').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  } catch {}
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataLoading, setDataLoading] = useState(IS_PROD);
  const ready = useRef(!IS_PROD); // true subito in DEV, true dopo fetch in PROD

  const [subaffidamenti, setSubaffidamenti] = useState<Subaffidamento[]>(
    () => IS_PROD ? [] : lsLoad('subdata', []) as Subaffidamento[]
  );
  const [appaltatori, setAppaltatori] = useState<Appaltatore[]>(
    () => IS_PROD ? [] : lsLoad('anagrafica', []) as Appaltatore[]
  );
  const [documenti, setDocumenti] = useState<DocumentoControllo[]>(
    () => IS_PROD ? [] : lsLoad('docdata', []) as DocumentoControllo[]
  );
  const [activityLog, setActivityLog] = useState<ActivityLog[]>(
    () => IS_PROD ? [] : lsLoad('activity_log', []) as ActivityLog[]
  );
  const [followUps, setFollowUps] = useState<FollowUp[]>(
    () => IS_PROD ? [] : lsLoad('followups', []) as FollowUp[]
  );
  const [settings, setSettings] = useState<Settings>(
    () => IS_PROD ? DEFAULT_SETTINGS : ({ ...DEFAULT_SETTINGS, ...(lsLoad('settings', {}) as Settings) })
  );

  /* ── PROD: carica tutto da Supabase al mount ── */
  useEffect(() => {
    if (!IS_PROD) return;
    (async () => {
      try {
        const [sub, ana, doc, log, fup, set] = await Promise.all([
          sbRead<Subaffidamento[]>('subdata',      []),
          sbRead<Appaltatore[]>('anagrafica',      []),
          sbRead<DocumentoControllo[]>('docdata',  []),
          sbRead<ActivityLog[]>('activity_log',    []),
          sbRead<FollowUp[]>('followups',          []),
          sbRead<Partial<Settings>>('settings',    {}),
        ]);
        setSubaffidamenti(sub);
        setAppaltatori(ana);
        setDocumenti(doc);
        setActivityLog(log);
        setFollowUps(fup);
        setSettings(s => ({ ...s, ...set }));
      } catch {}
      finally {
        ready.current = true;
        setDataLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Persist on change ── */
  // DEV → localStorage, PROD → Supabase (debounced 800ms)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const persist = useCallback((key: string, val: unknown) => {
    if (!ready.current) return;
    if (!IS_PROD) { lsSave(key, val); return; }
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => sbWrite(key, val), 800);
  }, []);

  useEffect(() => persist('subdata',     subaffidamenti), [subaffidamenti, persist]);
  useEffect(() => persist('anagrafica',  appaltatori),   [appaltatori,    persist]);
  useEffect(() => persist('docdata',     documenti),     [documenti,      persist]);
  useEffect(() => persist('activity_log',activityLog),   [activityLog,    persist]);
  useEffect(() => persist('followups',   followUps),     [followUps,      persist]);
  useEffect(() => persist('settings',    settings),      [settings,       persist]);

  /* ── Realtime sync PROD: se un altro utente modifica, aggiorna lo stato ── */
  useEffect(() => {
    if (!IS_PROD) return;
    const channel = supabase
      .channel('app_storage_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_storage' }, payload => {
        const { key, value } = payload.new as { key: string; value: unknown };
        if (key === 'subdata')     setSubaffidamenti(value as Subaffidamento[]);
        if (key === 'anagrafica')  setAppaltatori(value as Appaltatore[]);
        if (key === 'docdata')     setDocumenti(value as DocumentoControllo[]);
        if (key === 'activity_log')setActivityLog(value as ActivityLog[]);
        if (key === 'followups')   setFollowUps(value as FollowUp[]);
        if (key === 'settings')    setSettings(s => ({ ...s, ...(value as Partial<Settings>) }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Actions ── */
  const addActivity = (tipo: ActivityLog['tipo'], foglio: string, desc: string, detail: string, userName?: string) => {
    const nome = userName
      || (JSON.parse(localStorage.getItem('pser_current_user') || '{}') as { nome?: string }).nome
      || 'Sistema';
    const now = new Date();
    const entry: ActivityLog = {
      ts: now.toISOString(),
      tsDisplay: now.toLocaleString('it-IT'),
      utente: nome,
      tipo,
      foglio,
      desc,
      detail,
    };
    setActivityLog(prev => [entry, ...prev].slice(0, 500));
  };

  const upsertFollowUp = (
    praticaId: string, appaltatore: string, subfornitore: string,
    documento: string, stato: FollowUpStato, gestitoDa: string, note?: string,
  ) => {
    const now = new Date().toISOString();
    setFollowUps(prev => {
      const existing = prev.find(f => f.praticaId === praticaId && f.documento === documento);
      if (existing) {
        return prev.map(f =>
          f.praticaId === praticaId && f.documento === documento
            ? {
                ...f, stato, gestitoDa, note: note ?? f.note,
                dataContatto:    stato === 'contattato' && !f.dataContatto    ? now : f.dataContatto,
                dataRisposta:    stato === 'risposto'   && !f.dataRisposta    ? now : f.dataRisposta,
                dataValidazione: stato === 'validato'   && !f.dataValidazione ? now : f.dataValidazione,
              }
            : f
        );
      }
      const newFU: FollowUp = {
        id: `fu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        praticaId, appaltatore, subfornitore, documento, stato,
        dataCreazione:   now,
        dataContatto:    stato === 'contattato' ? now : undefined,
        dataRisposta:    stato === 'risposto'   ? now : undefined,
        dataValidazione: stato === 'validato'   ? now : undefined,
        note, gestitoDa,
      };
      return [newFU, ...prev];
    });
  };

  const advanceFollowUp = (id: string, nuovoStato: FollowUpStato, gestitoDa: string) => {
    const now = new Date().toISOString();
    setFollowUps(prev =>
      prev.map(f =>
        f.id === id
          ? {
              ...f, stato: nuovoStato, gestitoDa,
              dataContatto:    nuovoStato === 'contattato' && !f.dataContatto    ? now : f.dataContatto,
              dataRisposta:    nuovoStato === 'risposto'   && !f.dataRisposta    ? now : f.dataRisposta,
              dataValidazione: nuovoStato === 'validato'   && !f.dataValidazione ? now : f.dataValidazione,
            }
          : f
      )
    );
  };

  return (
    <DataContext.Provider value={{
      subaffidamenti, appaltatori, documenti, activityLog, settings, followUps, dataLoading,
      setSubaffidamenti, setAppaltatori, setDocumenti, setActivityLog, setSettings, setFollowUps,
      addActivity, upsertFollowUp, advanceFollowUp,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};
