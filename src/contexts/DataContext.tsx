import React, { createContext, useContext, useState, useEffect } from 'react';
import { Subaffidamento, Appaltatore, DocumentoControllo, ActivityLog, Settings } from '../types';

interface DataContextType {
  subaffidamenti: Subaffidamento[];
  appaltatori: Appaltatore[];
  documenti: DocumentoControllo[];
  activityLog: ActivityLog[];
  settings: Settings;
  setSubaffidamenti: React.Dispatch<React.SetStateAction<Subaffidamento[]>>;
  setAppaltatori: React.Dispatch<React.SetStateAction<Appaltatore[]>>;
  setDocumenti: React.Dispatch<React.SetStateAction<DocumentoControllo[]>>;
  setActivityLog: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  addActivity: (tipo: ActivityLog['tipo'], foglio: string, desc: string, detail: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_SUBAFFIDAMENTI: Subaffidamento[] = [];


const DEFAULT_APPALTATORI: Appaltatore[] = [];


export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pLoad = (key: string, def: any) => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : def;
  };

  const pSave = (key: string, val: any) => {
    localStorage.setItem(key, JSON.stringify(val));
  };

  const [subaffidamenti, setSubaffidamenti] = useState<Subaffidamento[]>(() => pLoad('subdata', DEFAULT_SUBAFFIDAMENTI));
  const [appaltatori, setAppaltatori] = useState<Appaltatore[]>(() => pLoad('anagrafica', DEFAULT_APPALTATORI));
  const [documenti, setDocumenti] = useState<DocumentoControllo[]>(() => pLoad('docdata', []));
  const [activityLog, setActivityLog] = useState<ActivityLog[]>(() => pLoad('activity_log', []));
  const [settings, setSettings] = useState<Settings>(() => pLoad('settings', {
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
    standby_minutes: 15
  }));

  useEffect(() => pSave('subdata', subaffidamenti), [subaffidamenti]);
  useEffect(() => pSave('anagrafica', appaltatori), [appaltatori]);
  useEffect(() => pSave('docdata', documenti), [documenti]);
  useEffect(() => pSave('activity_log', activityLog), [activityLog]);
  useEffect(() => pSave('settings', settings), [settings]);

  const addActivity = (tipo: ActivityLog['tipo'], foglio: string, desc: string, detail: string) => {
    const user = JSON.parse(localStorage.getItem('pser_current_user') || '{"nome":"Sistema"}');
    const now = new Date();
    const newLog: ActivityLog = {
      ts: now.toISOString(),
      tsDisplay: now.toLocaleString('it-IT'),
      utente: user.nome,
      tipo,
      foglio,
      desc,
      detail
    };
    setActivityLog(prev => [newLog, ...prev].slice(0, 500));
  };

  return (
    <DataContext.Provider value={{
      subaffidamenti, appaltatori, documenti, activityLog, settings,
      setSubaffidamenti, setAppaltatori, setDocumenti, setActivityLog, setSettings,
      addActivity
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
