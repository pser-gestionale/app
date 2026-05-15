import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppNotification } from '../types';

const DURATION = 2000;

function userInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function actionColor(action: AppNotification['action']): string {
  if (action === 'ha aggiunto')  return '#1D9E75';
  if (action === 'ha eliminato') return '#E24B4A';
  return '#534AB7';
}

const ToastCard: React.FC<{ notif: AppNotification; onDismiss: () => void }> = ({ notif, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, DURATION);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -12, scale: 0.95 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex items-center gap-3 w-[272px] px-3 py-2.5 rounded-xl cursor-pointer"
      style={{
        background: '#0e1e30',
        border: '1px solid rgba(83,74,183,0.28)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.50)',
      }}
      onClick={onDismiss}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
        style={{ background: `linear-gradient(135deg, ${actionColor(notif.action)}, #378ADD)` }}
      >
        {userInitials(notif.userName)}
      </div>

      {/* Testo */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[#ddeeff] truncate leading-tight">
          {notif.userName}
        </p>
        <p className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: '#5a8aaa' }}>
          <span style={{ color: actionColor(notif.action) }}>{notif.action}</span>
          {' '}{notif.entity}
          {notif.entityLabel ? (
            <span className="text-[#3a5a7a]"> · {notif.entityLabel}</span>
          ) : null}
        </p>
      </div>

      {/* Barra progresso */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] rounded-b-xl"
        style={{ background: actionColor(notif.action), width: '100%' }}
        initial={{ scaleX: 1, originX: 0 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: DURATION / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
};

interface Props {
  notifications: AppNotification[];
}

const NotificationToast: React.FC<Props> = ({ notifications }) => {
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const shownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newOnes = notifications.filter(n => !shownRef.current.has(n.id));
    if (newOnes.length === 0) return;
    newOnes.forEach(n => shownRef.current.add(n.id));
    setToasts(prev => [...newOnes, ...prev].slice(0, 3));
  }, [notifications]);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(notif => (
          <div key={notif.id} className="pointer-events-auto relative">
            <ToastCard notif={notif} onDismiss={() => dismiss(notif.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToast;
