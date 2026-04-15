import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  User as UserIcon, Lock, Palette, Bell, Database, Upload,
  Users, History, Settings as SettingsIcon, Save, Trash2,
  Download, AlertTriangle, BookOpen, FileText, Plus, X, Check, RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const ACCENT_COLORS = [
  { hex: '#534AB7', name: 'Indaco' },
  { hex: '#1D9E75', name: 'Smeraldo' },
  { hex: '#378ADD', name: 'Azzurro' },
  { hex: '#E24B4A', name: 'Rubino' },
  { hex: '#F5A800', name: 'Ambra' },
  { hex: '#8b5cf6', name: 'Viola' },
  { hex: '#06b6d4', name: 'Ciano' },
];

const SECTIONS = [
  { id: 'profilo',    label: 'Il mio profilo',       icon: UserIcon,      group: 'Profilo' },
  { id: 'sicurezza',  label: 'Sicurezza',             icon: Lock,          group: 'Profilo' },
  { id: 'aspetto',    label: 'Aspetto & Tema',        icon: Palette,       group: 'Aspetto' },
  { id: 'notifiche',  label: 'Notifiche & Avvisi',   icon: Bell,          group: 'Aspetto' },
  { id: 'database',   label: 'Database & Backup',    icon: Database,      group: 'Dati' },
  { id: 'import',     label: 'Importazione',          icon: Upload,        group: 'Dati' },
  { id: 'utenti',     label: 'Gestione Utenti',       icon: Users,         group: 'Sistema' },
  { id: 'accessi',    label: 'Log Accessi',           icon: History,       group: 'Sistema' },
  { id: 'sistema',    label: 'Sistema',               icon: SettingsIcon,  group: 'Sistema' },
];

const Impostazioni: React.FC = () => {
  const { settings, setSettings, appaltatori, subaffidamenti, documenti, activityLog } = useData();
  const { user, login, logout } = useAuth();

  const [activeSection, setActiveSection] = useState('profilo');
  const [profNome,    setProfNome]    = useState(user?.nome    || '');
  const [profEmail,   setProfEmail]   = useState(user?.email   || '');
  const [profSettore, setProfSettore] = useState(user?.settore || 'PSER — Renewables');
  const [savedOk,     setSavedOk]     = useState(false);
  const [pwdOld,  setPwdOld]  = useState('');
  const [pwdNew,  setPwdNew]  = useState('');
  const [pwdConf, setPwdConf] = useState('');
  const [pwdMsg,  setPwdMsg]  = useState<{ok:boolean; text:string} | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserNome,  setNewUserNome]  = useState('');
  const [newUserName,  setNewUserName]  = useState('');
  const [newUserPwd,   setNewUserPwd]   = useState('');
  const [newUserRole,  setNewUserRole]  = useState<any>('Contract Holder Collaborator (PSER)');
  const importRef = useRef<HTMLInputElement>(null);

  const currentSection = SECTIONS.find(s => s.id === activeSection);
  const initials = user?.nome?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || '??';

  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem('pser_users') || '[]'); } catch { return []; }
  };
  const saveUsers = (u: any[]) => localStorage.setItem('pser_users', JSON.stringify(u));
  const accessLog = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('pser_access_log') || '[]'); } catch { return []; }
  }, [activeSection]);

  const handleSaveProfilo = () => {
    if (!user) return;
    const updated = { ...user, nome: profNome, email: profEmail, settore: profSettore };
    login(updated);
    const users = getUsers();
    const idx = users.findIndex((u: any) => u.username === user.username);
    if (idx >= 0) { users[idx] = { ...users[idx], nome: profNome, email: profEmail, settore: profSettore }; saveUsers(users); }
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  };

  const handleChangePwd = () => {
    if (!user) return;
    if (!pwdOld || !pwdNew || !pwdConf) { setPwdMsg({ ok:false, text:'Compila tutti i campi' }); return; }
    if (pwdNew !== pwdConf)              { setPwdMsg({ ok:false, text:'Le nuove password non coincidono' }); return; }
    if (pwdNew.length < 6)              { setPwdMsg({ ok:false, text:'Minimo 6 caratteri' }); return; }
    const users = getUsers();
    const idx = users.findIndex((u: any) => u.username === user.username);
    if (idx < 0 || users[idx].password !== pwdOld) { setPwdMsg({ ok:false, text:'Password attuale non corretta' }); return; }
    users[idx].password = pwdNew;
    saveUsers(users);
    setPwdMsg({ ok:true, text:'Password aggiornata correttamente' });
    setPwdOld(''); setPwdNew(''); setPwdConf('');
    setTimeout(() => setPwdMsg(null), 3000);
  };

  const handleAddUser = () => {
    if (!newUserNome || !newUserName || !newUserPwd) return;
    const users = getUsers();
    if (users.find((u: any) => u.username === newUserName)) { alert('Username già in uso'); return; }
    users.push({ username: newUserName, password: newUserPwd, nome: newUserNome, role: newUserRole, email: '', created: new Date().toISOString() });
    saveUsers(users);
    setShowAddUser(false);
    setNewUserNome(''); setNewUserName(''); setNewUserPwd('');
  };

  const handleDeleteUser = (username: string) => {
    if (username === user?.username) { alert('Non puoi eliminare il tuo account'); return; }
    if (!confirm(`Eliminare l'utente ${username}?`)) return;
    saveUsers(getUsers().filter((u: any) => u.username !== username));
  };

  const handleExportBackup = () => {
    const keys = ['subdata','anagrafica','cal_events','storico','access_log','users','settings','docdata','alerts'];
    const backup: any = { version: '2.0', exported: new Date().toISOString(), data: {} };
    keys.forEach(k => {
      try { const v = localStorage.getItem('pser_' + k); if (v) backup.data[k] = JSON.parse(v); } catch {}
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pser_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
    a.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const backup = JSON.parse(evt.target?.result as string);
        if (!backup.data) { alert('File non valido'); return; }
        Object.entries(backup.data).forEach(([k, v]) => {
          localStorage.setItem('pser_' + k, JSON.stringify(v));
        });
        alert('Backup ripristinato. Ricarica la pagina per applicare.');
      } catch { alert('Errore nel file di backup'); }
    };
    reader.readAsText(file);
  };

  const handleResetData = (type: 'subdata' | 'anagrafica' | 'all') => {
    if (!confirm(type === 'all' ? 'RESET COMPLETO: tutti i dati verranno eliminati. Continuare?' : `Reset ${type}?`)) return;
    if (type === 'all') {
      ['subdata','anagrafica','docdata','cal_events','activity_log','storico'].forEach(k => localStorage.removeItem('pser_' + k));
    } else {
      localStorage.removeItem('pser_' + type);
    }
    window.location.reload();
  };

  const setAccentColor = (color: string) => {
    setSettings({ ...settings, accent_color: color });
    document.documentElement.style.setProperty('--acc', color);
    localStorage.setItem('pser_accent_broadcast', color + '|' + Date.now());
  };

  const dbStats = [
    { val: subaffidamenti.length, lbl: 'Subaffidamenti' },
    { val: appaltatori.length,    lbl: 'Anagrafiche' },
    { val: documenti.length,      lbl: 'Documenti' },
    { val: activityLog.length,    lbl: 'Log attività' },
  ];

  const inputCls = "w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-sm px-3 outline-none focus:border-[#534AB7]/60 transition-all";
  const labelCls = "text-[11px] text-[#3a5a7a] font-bold uppercase tracking-wider";

  return (
    <div className="flex min-h-screen">
      {/* NAV */}
      <div className="w-[220px] min-w-[220px] py-6 border-r border-white/5 bg-white/[0.01]">
        {['Profilo','Aspetto','Dati','Sistema'].map(group => (
          <div key={group} className="mb-5">
            <div className="px-5 mb-2 text-[10px] font-bold text-[#3a5a7a] uppercase tracking-widest">{group}</div>
            {SECTIONS.filter(s => s.group === group).map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={cn('w-full flex items-center gap-2.5 px-5 py-2.5 text-xs transition-all relative',
                  activeSection === s.id ? 'text-[#ddeeff] bg-[#534AB7]/12 border-r-2 border-[#534AB7]' : 'text-[#3a5a7a] hover:text-[#7a9ab8] hover:bg-white/[0.03]')}>
                <s.icon size={14} className={cn('shrink-0', activeSection === s.id ? 'text-[#534AB7]' : 'text-[#3a5a7a]')}/>
                {s.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-lg font-bold text-[#ddeeff] flex items-center gap-2.5">
              {currentSection && <currentSection.icon size={20} className="text-[#534AB7]"/>}
              {currentSection?.label}
            </h1>
          </div>
          <div className="text-[11px] text-[#4a6a8a] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            {format(new Date(), 'dd MMMM yyyy', { locale: it })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeSection} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.15 }} className="space-y-5">

            {/* PROFILO */}
            {activeSection === 'profilo' && (
              <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-5">
                {savedOk && (
                  <div className="bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-lg p-3 text-[#5DCAA5] text-sm font-bold flex items-center gap-2">
                    <Check size={16}/> Profilo aggiornato correttamente
                  </div>
                )}
                <div className="grid grid-cols-[72px_1fr] gap-5 items-start">
                  <div className="text-center">
                    <div className="w-[72px] h-[72px] rounded-2xl bg-[#534AB7]/20 flex items-center justify-center text-2xl font-bold text-[#a89ef8]">{initials}</div>
                    <div className="text-[9px] text-[#1e3550] uppercase font-bold tracking-widest mt-2">Auto</div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={labelCls}>Nome e Cognome</label>
                        <input type="text" value={profNome} onChange={e => setProfNome(e.target.value)} className={inputCls}/>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelCls}>Username</label>
                        <input type="text" value={user?.username} readOnly className={cn(inputCls, 'opacity-40 cursor-not-allowed')}/>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelCls}>Email</label>
                        <input type="email" value={profEmail} onChange={e => setProfEmail(e.target.value)} className={inputCls}/>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelCls}>Settore</label>
                        <input type="text" value={profSettore} onChange={e => setProfSettore(e.target.value)} className={inputCls}/>
                      </div>
                    </div>
                    <button onClick={handleSaveProfilo} className="h-10 px-5 bg-[#534AB7] text-[#e8e6f8] rounded-lg text-xs font-bold hover:bg-[#6358cc] transition-all flex items-center gap-2">
                      <Save size={14}/> Salva modifiche
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SICUREZZA */}
            {activeSection === 'sicurezza' && (
              <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#ddeeff]">Cambia password</h3>
                {pwdMsg && (
                  <div className={cn('p-3 rounded-lg text-sm font-bold flex items-center gap-2', pwdMsg.ok ? 'bg-[#1D9E75]/15 border border-[#1D9E75]/35 text-[#5DCAA5]' : 'bg-[#E24B4A]/15 border border-[#E24B4A]/35 text-[#f09595]')}>
                    {pwdMsg.ok ? <Check size={16}/> : <AlertTriangle size={16}/>} {pwdMsg.text}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 max-w-sm">
                  {[{ label:'Password attuale', val:pwdOld, set:setPwdOld }, { label:'Nuova password', val:pwdNew, set:setPwdNew }, { label:'Conferma password', val:pwdConf, set:setPwdConf }].map(f => (
                    <div key={f.label} className="space-y-1.5">
                      <label className={labelCls}>{f.label}</label>
                      <input type="password" value={f.val} onChange={e => f.set(e.target.value)} className={inputCls}/>
                    </div>
                  ))}
                  <button onClick={handleChangePwd} className="h-10 px-5 bg-[#534AB7] text-[#e8e6f8] rounded-lg text-xs font-bold hover:bg-[#6358cc] transition-all flex items-center gap-2 w-fit">
                    <Lock size={14}/> Aggiorna password
                  </button>
                </div>
              </div>
            )}

            {/* ASPETTO */}
            {activeSection === 'aspetto' && (
              <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[#ddeeff]">Colore accent</h3>
                  <p className="text-[11px] text-[#3a5a7a] mt-1">Modifica il colore principale dell'interfaccia. Si applica immediatamente.</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {ACCENT_COLORS.map(c => (
                    <button key={c.hex} onClick={() => setAccentColor(c.hex)}
                      className={cn('relative w-11 h-11 rounded-xl border-2 transition-all hover:scale-110 group', settings.accent_color === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent')}
                      style={{ backgroundColor: c.hex }} title={c.name}>
                      {settings.accent_color === c.hex && <Check size={14} className="absolute inset-0 m-auto text-white"/>}
                    </button>
                  ))}
                </div>
                <div className="h-px bg-white/5"/>
                <div className="space-y-3">
                  {[
                    { label:'Densità layout', id:'density', type:'select', val:settings.density, opts:[{v:'normal',l:'Normale'},{v:'compact',l:'Compatto'},{v:'spacious',l:'Ampio'}] },
                  ].map(f => (
                    <div key={f.id} className="flex items-center justify-between py-3 border-b border-white/5">
                      <div>
                        <div className="text-sm font-medium text-[#ddeeff]">{f.label}</div>
                      </div>
                      <select value={f.val as string} onChange={e => setSettings({...settings, [f.id]: e.target.value as any})}
                        className="h-9 min-w-[140px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none focus:border-[#534AB7]/50 cursor-pointer">
                        {(f.opts as any[]).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  ))}
                  {[
                    { id:'animations', label:'Animazioni', sub:'Transizioni e animazioni CSS' },
                    { id:'tooltips',   label:'Tooltip',    sub:'Mostra suggerimenti sui campi' },
                  ].map(f => (
                    <div key={f.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-[#ddeeff]">{f.label}</div>
                        <div className="text-[11px] text-[#3a5a7a]">{f.sub}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={!!(settings as any)[f.id]} onChange={e => setSettings({...settings, [f.id]: e.target.checked})} className="sr-only peer"/>
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D9E75]"/>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NOTIFICHE */}
            {activeSection === 'notifiche' && (
              <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#ddeeff]">Configurazione avvisi</h3>
                <div className="space-y-3">
                  {[
                    { id:'alert_scadenze', label:'Alert scadenze contratti', sub:'Notifica per contratti in scadenza' },
                    { id:'alert_rigettate', label:'Alert pratiche rigettate', sub:'Avviso per nuove pratiche rigettate' },
                    { id:'alert_documenti', label:'Alert documenti non conformi', sub:'Avviso per documenti fuori norma' },
                  ].map(f => (
                    <div key={f.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-[#ddeeff]">{f.label}</div>
                        <div className="text-[11px] text-[#3a5a7a]">{f.sub}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={!!(settings as any)[f.id]} onChange={e => setSettings({...settings, [f.id]: e.target.checked})} className="sr-only peer"/>
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D9E75]"/>
                      </label>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium text-[#ddeeff]">Giorni anticipo avviso scadenze</div>
                      <div className="text-[11px] text-[#3a5a7a]">Quanti giorni prima della scadenza mostrare l'alert</div>
                    </div>
                    <select value={settings.alert_days || 30} onChange={e => setSettings({...settings, alert_days: Number(e.target.value)})}
                      className="h-9 min-w-[100px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none cursor-pointer">
                      {[7,14,30,60,90].map(d => <option key={d} value={d}>{d} giorni</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* DATABASE */}
            {activeSection === 'database' && (
              <div className="space-y-5">
                <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#ddeeff]">Stato database</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {dbStats.map(b => (
                      <div key={b.lbl} className="bg-white/3 border border-white/5 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold font-mono text-[#ddeeff]">{b.val}</div>
                        <div className="text-[9px] text-[#3a5a7a] uppercase tracking-widest mt-1 font-bold">{b.lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#ddeeff]">Backup & Ripristino</h3>
                  <p className="text-[11px] text-[#3a5a7a]">Scarica una copia JSON di tutti i dati o ripristina da un backup precedente.</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={handleExportBackup} className="h-10 px-5 bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-lg text-[#5DCAA5] text-xs font-bold hover:bg-[#1D9E75]/25 transition-all flex items-center gap-2">
                      <Download size={14}/> Scarica Backup
                    </button>
                    <button onClick={() => importRef.current?.click()} className="h-10 px-5 bg-[#534AB7]/15 border border-[#534AB7]/35 rounded-lg text-[#a89ef8] text-xs font-bold hover:bg-[#534AB7]/25 transition-all flex items-center gap-2">
                      <Upload size={14}/> Ripristina Backup
                    </button>
                    <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportBackup}/>
                    <span className="text-[10px] text-[#3a5a7a] font-mono">pser_backup_{format(new Date(),'yyyy-MM-dd')}.json</span>
                  </div>
                </div>
                <div className="bg-[#0f2035] border border-[#E24B4A]/30 rounded-xl p-5 space-y-4 border-l-4 border-l-[#E24B4A]">
                  <h3 className="text-sm font-bold text-[#f09595] flex items-center gap-2"><AlertTriangle size={16}/> Reset dati</h3>
                  <p className="text-[11px] text-[#3a5a7a]">Cancella i dati del sistema. Operazione irreversibile.</p>
                  <div className="flex gap-2.5 flex-wrap">
                    {[{ lbl:'Reset Subaffidamenti', t:'subdata' as const }, { lbl:'Reset Anagrafica', t:'anagrafica' as const }].map(r => (
                      <button key={r.t} onClick={() => handleResetData(r.t)}
                        className="h-9 px-4 bg-[#E24B4A]/10 border border-[#E24B4A]/25 rounded-lg text-[#f09595] text-xs font-bold hover:bg-[#E24B4A]/20 transition-all flex items-center gap-1.5">
                        <Trash2 size={13}/> {r.lbl}
                      </button>
                    ))}
                    <button onClick={() => handleResetData('all')}
                      className="h-9 px-4 bg-[#E24B4A] text-white rounded-lg text-xs font-bold hover:bg-[#c0392b] transition-all flex items-center gap-1.5 shadow-lg shadow-[#E24B4A]/20">
                      <AlertTriangle size={13}/> Reset COMPLETO
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* IMPORT */}
            {activeSection === 'import' && (
              <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#ddeeff]">Comportamento importazione Excel</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b border-white/5">
                    <div>
                      <div className="text-sm font-medium text-[#ddeeff]">Gestione duplicati default</div>
                      <div className="text-[11px] text-[#3a5a7a]">Come gestire record con lo stesso ID durante l'import</div>
                    </div>
                    <select value={settings.import_dup_default || 'ask'}
                      onChange={e => setSettings({...settings, import_dup_default: e.target.value as any})}
                      className="h-9 min-w-[160px] bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-xs px-3 outline-none cursor-pointer">
                      <option value="ask">Chiedi sempre</option>
                      <option value="update">Aggiorna sempre</option>
                      <option value="skip">Salta sempre</option>
                    </select>
                  </div>
                  {[
                    { id:'import_preview', label:'Mostra anteprima prima di importare', sub:'Visualizza la tabella preview dei dati' },
                    { id:'import_log',     label:'Log dettagliato importazione',        sub:'Mostra il log riga per riga durante import' },
                  ].map(f => (
                    <div key={f.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-[#ddeeff]">{f.label}</div>
                        <div className="text-[11px] text-[#3a5a7a]">{f.sub}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={!!(settings as any)[f.id]} onChange={e => setSettings({...settings, [f.id]: e.target.checked})} className="sr-only peer"/>
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D9E75]"/>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UTENTI */}
            {activeSection === 'utenti' && (() => {
              const users = getUsers();
              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-[#3a5a7a]">{users.length} utenti registrati</div>
                    <button onClick={() => setShowAddUser(true)} className="h-9 px-4 bg-[#534AB7] text-[#e8e6f8] rounded-lg text-xs font-bold hover:bg-[#6358cc] transition-all flex items-center gap-2">
                      <Plus size={14}/> Nuovo Utente
                    </button>
                  </div>
                  {showAddUser && (
                    <div className="bg-[#0f2035] border border-[#534AB7]/30 rounded-xl p-5 space-y-4">
                      <h3 className="text-sm font-bold text-[#ddeeff]">Aggiungi utente</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[{ label:'Nome e Cognome',val:newUserNome,set:setNewUserNome },{ label:'Username',val:newUserName,set:setNewUserName },{ label:'Password',val:newUserPwd,set:setNewUserPwd }].map(f => (
                          <div key={f.label} className="space-y-1.5">
                            <label className={labelCls}>{f.label}</label>
                            <input type={f.label==='Password' ? 'password' : 'text'} value={f.val} onChange={e => f.set(e.target.value)} className={inputCls}/>
                          </div>
                        ))}
                        <div className="space-y-1.5">
                          <label className={labelCls}>Ruolo</label>
                          <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)}
                            className="w-full h-10 bg-[#0b1a2e] border border-white/10 rounded-lg text-[#c8ddf0] text-sm px-3 outline-none focus:border-[#534AB7]/60 cursor-pointer">
                            <option value="Amministratore">Amministratore</option>
                            <option value="Contract Holder Collaborator (PSER)">Contract Holder Collaborator</option>
                            <option value="Resp. Project Service - PSER">Resp. Project Service</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleAddUser} className="h-9 px-4 bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-lg text-[#5DCAA5] text-xs font-bold hover:bg-[#1D9E75]/25 flex items-center gap-2"><Check size={14}/> Aggiungi</button>
                        <button onClick={() => setShowAddUser(false)} className="h-9 px-4 bg-white/5 border border-white/10 rounded-lg text-[#6a8aaa] text-xs font-bold hover:bg-white/10 flex items-center gap-2"><X size={14}/> Annulla</button>
                      </div>
                    </div>
                  )}
                  <div className="bg-[#0f2035] border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] text-[#2a4a6a] uppercase tracking-wider border-b border-white/10">
                          {['Utente','Username','Ruolo','Creato','Azioni'].map(h => <th key={h} className="py-3 px-4 font-bold">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u: any, i: number) => (
                          <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#534AB7]/20 flex items-center justify-center text-[10px] font-bold text-[#a89ef8]">
                                  {u.nome?.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase()}
                                </div>
                                <span className="text-[#ddeeff] font-medium">{u.nome}</span>
                                {u.username === user?.username && <span className="text-[8px] bg-[#534AB7]/20 text-[#a89ef8] px-1.5 py-0.5 rounded font-bold">TU</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[#4a9fe8]">{u.username}</td>
                            <td className="py-3 px-4 text-[#7a9ab8]">{u.role}</td>
                            <td className="py-3 px-4 text-[#3a5a7a]">{u.created ? format(new Date(u.created), 'dd/MM/yyyy') : '—'}</td>
                            <td className="py-3 px-4">
                              {u.username !== user?.username && (
                                <button onClick={() => handleDeleteUser(u.username)} className="p-1.5 bg-[#E24B4A]/10 border border-[#E24B4A]/25 rounded text-[#f09595] hover:bg-[#E24B4A]/20 transition-all">
                                  <Trash2 size={12}/>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* ACCESSI */}
            {activeSection === 'accessi' && (
              <div className="bg-[#0f2035] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#ddeeff]">Log accessi recenti</h3>
                  <span className="text-[11px] text-[#3a5a7a]">{accessLog.length} sessioni</span>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] text-[#2a4a6a] uppercase tracking-wider sticky top-0 bg-[#0f2035]">
                        {['Utente','Ruolo','Data/Ora'].map(h => <th key={h} className="py-3 px-4 font-bold border-b border-white/10">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {accessLog.length > 0 ? accessLog.map((a: any, i: number) => (
                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-[#ddeeff] font-medium">{a.nome || a.user}</td>
                          <td className="py-3 px-4 text-[#7a9ab8]">{a.role}</td>
                          <td className="py-3 px-4 font-mono text-[#3a5a7a]">{a.ts}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={3} className="py-12 text-center text-[#3a5a7a] text-sm">Nessun accesso registrato</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SISTEMA */}
            {activeSection === 'sistema' && (
              <div className="space-y-5">
                <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#ddeeff]">Informazioni sistema</h3>
                  {[
                    { label:'Versione',         val:'v2.0.0',               color:'text-[#a89ef8]' },
                    { label:'Autore',            val:'Pietro De Vito • PSER', color:'text-[#8ab0c8]' },
                    { label:'Pagine attive',     val:'8 / 8',                color:'text-[#1D9E75]' },
                    { label:'React',             val:'19',                    color:'text-[#85B7EB]' },
                    { label:'TypeScript',        val:'5.8',                   color:'text-[#8ab0c8]' },
                    { label:'Ultimo aggiornamento', val:format(new Date(),'dd/MM/yyyy'), color:'text-[#3a5a7a]' },
                  ].map(f => (
                    <div key={f.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                      <span className="text-xs text-[#3a5a7a] font-medium">{f.label}</span>
                      <span className={cn('text-xs font-mono font-bold', f.color)}>{f.val}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#0f2035] border border-white/10 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#ddeeff]">Documentazione</h3>
                  <div className="flex gap-3">
                    <button className="h-10 px-5 bg-[#534AB7] text-[#e8e6f8] rounded-lg text-xs font-bold hover:bg-[#6358cc] transition-all flex items-center gap-2">
                      <BookOpen size={14}/> Guida utente
                    </button>
                    <button className="h-10 px-5 bg-[#1D9E75]/15 border border-[#1D9E75]/35 rounded-lg text-[#5DCAA5] text-xs font-bold hover:bg-[#1D9E75]/25 transition-all flex items-center gap-2">
                      <FileText size={14}/> Scarica PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Impostazioni;
