import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Link as LinkIcon,
  Building2,
  Bell,
  Download,
  Upload,
  Settings,
  LogOut,
  BookUser,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'Principale' },
    { to: '/storico', icon: Bell, label: 'Gestione Solleciti' },
    { to: '/rubrica', icon: BookUser, label: 'Rubrica Contatti' },
    { to: '/subaffidamenti', icon: LinkIcon, label: 'Subaffidamenti', section: 'Gestione' },
    { to: '/anagrafica', icon: Building2, label: 'Anagrafica' },
    { to: '/report', icon: Download, label: 'Report & Export' },
    { to: '/importa', icon: Upload, label: 'Importa Excel', section: 'Sistema' },
    { to: '/impostazioni', icon: Settings, label: 'Impostazioni' },
  ];

  const initials = user?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '??';

  return (
    <aside className="w-[220px] min-w-[220px] bg-[#0a1628] border-r border-[#534AB7]/20 flex flex-col min-h-screen fixed top-0 left-0 bottom-0 z-50">
      <div className="p-6 pb-5 border-b border-white/5">
        <div className="text-sm font-bold text-white leading-tight tracking-tight">
          Gestionale<br />Subaffidamenti
        </div>
        <div className="text-[10px] text-[#3a5a7a] mt-1 tracking-wider uppercase">
          PSER &nbsp;•&nbsp; v2.0
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item, index) => (
          <React.Fragment key={item.to}>
            {item.section && (
              <div className="px-4 pt-4 pb-1 text-[9px] text-[#2a4a6a] tracking-[0.15em] uppercase font-bold">
                {item.section}
              </div>
            )}
            <NavLink
              to={item.to}
              className={({ isActive }) => cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 mx-2 my-0.5 text-xs font-medium rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-[#534AB7]/30 text-[#dde0ff] border-l-2 border-[#7b74d4] ml-1.5 pl-3 font-semibold shadow-[0_0_15px_rgba(83,74,183,0.2)]" 
                  : "text-[#7a9ab8] hover:bg-white/5 hover:text-[#c8ddf0]"
              )}
            >
              <item.icon size={16} className="shrink-0" />
              {item.label}
            </NavLink>
          </React.Fragment>
        ))}
      </nav>

      <div className="p-3.5 mt-auto">
        <div className="bg-[#534AB7]/10 border border-[#534AB7]/25 rounded-xl p-3 shadow-lg shadow-black/20">
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-7.5 h-7.5 rounded-full bg-gradient-to-br from-[#534AB7] to-[#378ADD] flex items-center justify-center text-[11px] text-white font-bold shrink-0 shadow-md">
              {initials}
            </div>
            <div className="overflow-hidden">
              <div className="text-[11px] text-[#c8ddf0] font-semibold truncate max-w-[120px]">
                {user?.nome}
              </div>
              <div className="text-[9px] text-[#3a5a7a] mt-0.5 truncate max-w-[120px]">
                {user?.role}
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full h-7 bg-[#E24B4A]/15 border border-[#E24B4A]/30 rounded-md text-[#f09595] text-[10px] cursor-pointer font-semibold mt-2.5 transition-all hover:bg-[#E24B4A]/30 flex items-center justify-center gap-1.5"
          >
            <LogOut size={10} />
            Esci
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
