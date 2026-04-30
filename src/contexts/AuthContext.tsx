import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AccessLog } from '../types';
import { supabase, IS_PROD } from '../lib/supabase';

const ROLE_MAP: Record<string, UserRole> = {
  'Amministratore': 'Amministratore',
  'CHC': 'Contract Holder Collaborator (PSER)',
  'Resp. PSER': 'Resp. Project Service - PSER',
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ── Helpers localStorage ── */
const loadUser = (): User | null => {
  try {
    const s = localStorage.getItem('pser_current_user');
    return s ? (JSON.parse(s) as User) : null;
  } catch { return null; }
};

const persistUser = (u: User) => {
  localStorage.setItem('pser_current_user', JSON.stringify(u));
  try {
    const log: AccessLog[] = JSON.parse(localStorage.getItem('pser_access_log') || '[]');
    log.unshift({ user: u.username, role: u.role, nome: u.nome, ts: new Date().toLocaleString('it-IT') });
    localStorage.setItem('pser_access_log', JSON.stringify(log.slice(0, 50)));
  } catch {}
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,    setUser]    = useState<User | null>(IS_PROD ? null : loadUser);
  const [loading, setLoading] = useState<boolean>(IS_PROD);

  /* ── PROD: ripristina sessione Supabase all'avvio ── */
  useEffect(() => {
    if (!IS_PROD) return;

    let cancelled = false;

    const restoreSession = async () => {
      try {
        // Timeout 6s — se Supabase non risponde (progetto in pausa) usciamo senza bloccare
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>(res => setTimeout(() => res(null), 6000)),
        ]);

        if (cancelled) return;

        const session = result && 'data' in result ? result.data.session : null;
        if (session?.user) {
          await loadSupabaseUser(session.user.id, session.user.email ?? '');
        }
      } catch {
        // nessun errore bloccante
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        await loadSupabaseUser(session.user.id, session.user.email ?? '');
      } else {
        setUser(null);
        localStorage.removeItem('pser_current_user');
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSupabaseUser = async (uid: string, email: string) => {
    try {
      const { data } = await supabase
        .from('pser_users')
        .select('nome, role')
        .eq('id', uid)
        .single();

      const roleRaw  = (data?.role as string) || 'CHC';
      const mappedUser: User = {
        username: email,
        email,
        password: '',
        nome:   data?.nome || email,
        role:   ROLE_MAP[roleRaw] || roleRaw as UserRole,
        created: new Date().toISOString(),
      };
      setUser(mappedUser);
      persistUser(mappedUser);
    } catch {
      setUser(null);
    }
  };

  /* ── signIn ── */
  const signIn = async (email: string, password: string): Promise<string | null> => {
    if (IS_PROD) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return 'Credenziali non valide. Verifica email e password.';
      return null; // onAuthStateChange gestisce il resto
    }

    // DEV: localStorage
    try {
      const users: User[] = JSON.parse(localStorage.getItem('pser_users') || '[]');
      if (users.length === 0) {
        const def: User = {
          username: 'pietro.admin@pser.local',
          password: 'PserAdmin2026!',
          role: 'Amministratore',
          nome: 'Pietro De Vito',
          email: 'pietro.admin@pser.local',
          created: new Date().toISOString(),
        };
        localStorage.setItem('pser_users', JSON.stringify([def]));
        users.push(def);
      }
      const found = users.find(u => u.username === email && u.password === password);
      if (!found) return 'Credenziali non valide. Verifica email e password.';
      login(found);
      return null;
    } catch {
      return 'Errore durante il login. Riprova.';
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    persistUser(userData);
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('pser_current_user');
    if (IS_PROD) await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signIn, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
