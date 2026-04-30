import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Link as LinkIcon, User as UserIcon, Lock, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';

const IS_DEV = import.meta.env.DEV;

const Login: React.FC = () => {
  const [tab, setTab] = useState<'login' | 'register' | 'changepwd'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [role, setRole] = useState<User['role']>('Amministratore');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { login, signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async () => {
    setError('');
    if (!username || !password) {
      setError('Inserisci email e password');
      return;
    }
    const err = await signIn(username, password);
    if (err) {
      setError(err);
      return;
    }
    setSuccess('Accesso effettuato. Benvenuto!');
    setTimeout(() => navigate('/'), 1000);
  };

  const handleRegister = () => {
    if (!IS_DEV) return;
    setError('');
    if (!nome || !username || !password) { setError('Compila tutti i campi obbligatori'); return; }
    if (username.includes(' ')) { setError('Il nome utente non può contenere spazi'); return; }
    if (password.length < 6) { setError('La password deve essere di almeno 6 caratteri'); return; }

    const users: User[] = JSON.parse(localStorage.getItem('pser_users') || '[]');
    if (users.some(u => u.username === username)) { setError('Nome utente già in uso, scegline un altro'); return; }

    users.push({ username, password, role, nome, email: '', created: new Date().toISOString() });
    localStorage.setItem('pser_users', JSON.stringify(users));
    setSuccess('Account creato con successo! Ora puoi accedere.');
    setTimeout(() => { setTab('login'); setSuccess(''); }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#07101e] flex items-center justify-center p-5 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], x: [0, 10, 0], y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[500px] h-[500px] bg-[#534AB7] top-[-100px] left-[-100px] rounded-full blur-[80px] opacity-10" 
        />
        <motion.div 
          animate={{ scale: [1, 1.08, 1], x: [0, -10, 0], y: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute w-[400px] h-[400px] bg-[#378ADD] bottom-[-80px] right-[-80px] rounded-full blur-[80px] opacity-10" 
        />
        <motion.div 
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute w-[300px] h-[300px] bg-[#1D9E75] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] opacity-10" 
        />
      </div>
      
      {/* Grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(83,74,183,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(83,74,183,0.08)_1px,transparent_1px)] bg-[size:40px_40px] z-0" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div className="bg-[#0f2035]/90 border border-[#534AB7]/30 rounded-[20px] p-10 backdrop-blur-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#534AB7] to-[#378ADD] rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-[0_8px_24px_rgba(83,74,183,0.4)]">
              <LinkIcon className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#ddeeff] tracking-tight">Gestionale Subaffidamenti</h1>
            <p className="text-xs text-[#3a5a7a] mt-1 uppercase tracking-wider">PSER • v2.0 • Accesso riservato</p>
          </div>

          <div className="flex bg-white/5 rounded-xl p-1 mb-7">
            {(['login', 'register', 'changepwd'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[11px] font-bold transition-all duration-200",
                  tab === t ? "bg-[#534AB7] text-[#e8e6f8] shadow-[0_2px_8px_rgba(83,74,183,0.4)]" : "text-[#4a6a8a] hover:text-[#7a9ab8]"
                )}
              >
                {t === 'login' ? 'Accedi' : t === 'register' ? 'Registrati' : 'Password'}
              </button>
            ))}
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-[#E24B4A]/15 border border-[#E24B4A]/30 text-[#f09595] p-2.5 rounded-lg text-xs mb-4">
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-[#1D9E75]/15 border border-[#1D9E75]/30 text-[#5DCAA5] p-2.5 rounded-lg text-xs mb-4">
              {success}
            </motion.div>
          )}

          {tab === 'login' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5 px-1">
                  <UserIcon size={12} /> Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="es. nome@esempio.com"
                  className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm p-3 outline-none focus:border-[#534AB7]/60 focus:bg-[#534AB7]/5 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5 px-1">
                  <Lock size={12} /> Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci la tua password"
                  className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm p-3 outline-none focus:border-[#534AB7]/60 focus:bg-[#534AB7]/5 transition-all"
                />
              </div>
              <button
                onClick={() => void handleLogin()}
                className="w-full h-12 bg-gradient-to-r from-[#534AB7] to-[#6358cc] rounded-xl text-[#e8e6f8] text-sm font-bold shadow-lg shadow-[#534AB7]/20 hover:translate-y-[-2px] hover:shadow-[#534AB7]/40 transition-all active:translate-y-0"
              >
                Accedi al Sistema
              </button>
            </div>
          )}

          {tab === 'register' && (
            IS_DEV ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5 px-1">
                  <UserIcon size={12} /> Nome e Cognome
                </label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Pietro De Vito"
                  className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm p-3 outline-none focus:border-[#534AB7]/60 focus:bg-[#534AB7]/5 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5 px-1">
                  <UserIcon size={12} /> Email
                </label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="es. nome@esempio.com"
                  className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm p-3 outline-none focus:border-[#534AB7]/60 focus:bg-[#534AB7]/5 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5 px-1">
                  <Lock size={12} /> Password
                </label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 6 caratteri"
                  className="w-full bg-[#0b1a2e] border border-white/10 rounded-xl text-[#c8ddf0] text-sm p-3 outline-none focus:border-[#534AB7]/60 focus:bg-[#534AB7]/5 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-[#4a6a8a] font-medium flex items-center gap-1.5 px-1">
                  <Shield size={12} /> Ruolo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setRole('Amministratore')}
                    className={cn("p-3 rounded-xl border transition-all text-center space-y-1",
                      role === 'Amministratore' ? "bg-[#534AB7]/20 border-[#534AB7]/60" : "bg-white/5 border-white/10 hover:border-white/20")}>
                    <div className="text-lg">👑</div>
                    <div className="text-[10px] font-bold text-[#8ab0c8]">Admin</div>
                  </button>
                  <button onClick={() => setRole('Contract Holder Collaborator (PSER)')}
                    className={cn("p-3 rounded-xl border transition-all text-center space-y-1",
                      role === 'Contract Holder Collaborator (PSER)' ? "bg-[#534AB7]/20 border-[#534AB7]/60" : "bg-white/5 border-white/10 hover:border-white/20")}>
                    <div className="text-lg">📋</div>
                    <div className="text-[10px] font-bold text-[#8ab0c8]">Collab</div>
                  </button>
                </div>
              </div>
              <button onClick={handleRegister}
                className="w-full h-12 bg-gradient-to-r from-[#534AB7] to-[#6358cc] rounded-xl text-[#e8e6f8] text-sm font-bold shadow-lg shadow-[#534AB7]/20 hover:translate-y-[-2px] hover:shadow-[#534AB7]/40 transition-all active:translate-y-0">
                Registra Account
              </button>
            </div>
            ) : (
            <div className="text-center py-6 space-y-3">
              <div className="text-3xl">🔐</div>
              <p className="text-sm text-[#7a9ab8]">La gestione degli account è centralizzata.</p>
              <p className="text-xs text-[#3a5a7a]">Contatta l'amministratore per l'accesso al sistema.</p>
              <button onClick={() => setTab('login')} className="text-[#534AB7] text-sm font-semibold hover:underline">
                Torna al login
              </button>
            </div>
            )
          )}

          {tab === 'changepwd' && (
            <div className="text-center py-4 space-y-4">
              <p className="text-sm text-[#7a9ab8]">Contatta l'amministratore per il recupero della password o usa le impostazioni del profilo se sei già autenticato.</p>
              <button 
                onClick={() => setTab('login')}
                className="text-[#534AB7] text-sm font-semibold hover:underline"
              >
                Torna al login
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-[#1e3550] leading-relaxed">
              Accesso riservato al personale PSER<br />Ogni sessione viene registrata nel sistema
            </p>
            <p className="text-[10px] text-[#1e3550] mt-1 font-medium">© Pietro De Vito — Autore del sistema</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
