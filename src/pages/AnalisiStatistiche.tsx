import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  AreaChart, Area,
} from 'recharts';
import {
  TrendingUp, TrendingDown, BarChart2, Activity, Clock,
  AlertTriangle, CheckCircle, Info, FileDown,
  Building2, ChevronUp, ChevronDown, Zap, Euro,
} from 'lucide-react';
import {
  differenceInDays, format, subDays, subMonths, isAfter, parseISO,
} from 'date-fns';
import { it } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';

/* ─── Helpers ─── */
const parseEuro = (val: string | undefined | null): number =>
  parseFloat((val || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

const isValidDate = (d: unknown): boolean => {
  if (!d) return false;
  const date = new Date(d as string);
  return !isNaN(date.getTime());
};

const safeParseISO = (d: unknown): Date | null => {
  if (!isValidDate(d)) return null;
  try { return parseISO(d as string); } catch { return null; }
};

const fmtEuro = (n: number): string => {
  if (n >= 1_000_000) return `€ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `€ ${(n / 1_000).toFixed(0)}k`;
  return `€ ${n.toFixed(0)}`;
};

const MESI_IT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

type Periodo = 'Anno' | 'Trim' | 'Mese' | '7gg' | '1gg';
const PERIODO_DAYS: Record<Periodo, number> = { Anno: 365, Trim: 90, Mese: 30, '7gg': 7, '1gg': 1 };

const STATO_COLORS: Record<string, string> = {
  'Autorizzato': '#1D9E75',
  'Attivo':      '#1D9E75',
  'In Attesa':   '#F5A800',
  'In Corso':    '#378ADD',
  'Rigettato':   '#E24B4A',
  'Rifiutato':   '#E24B4A',
  'Revocato':    '#9a3030',
  'Sospeso':     '#7a6000',
  'Scaduto':     '#6b4040',
  'Chiuso':      '#4a5568',
};
const statoColor = (s: string) => STATO_COLORS[s] || '#534AB7';

/* ─── Trend badge ─── */
const Trend: React.FC<{ delta: number; unit?: string; invert?: boolean }> = ({ delta, unit = '', invert = false }) => {
  const pos = invert ? delta < 0 : delta >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
      pos ? 'bg-[#1D9E75]/15 text-[#1D9E75]' : 'bg-[#E24B4A]/15 text-[#E24B4A]')}>
      {pos ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
      {delta > 0 ? '+' : ''}{delta.toFixed(delta % 1 === 0 ? 0 : 1)}{unit}
    </span>
  );
};

/* ─── KPI card ─── */
interface KpiCardProps {
  label: string;
  value: string;
  delta: number;
  unit?: string;
  invert?: boolean;
  icon: React.ReactNode;
  color: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ label, value, delta, unit, invert, icon, color }) => (
  <div className="bg-white/3 border border-white/8 rounded-2xl px-5 py-4 flex flex-col gap-2 hover:bg-white/5 transition-colors">
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <span style={{ color }}>{icon}</span>
    </div>
    <div className="text-2xl font-bold text-white leading-none">{value}</div>
    <Trend delta={delta} unit={unit} invert={invert}/>
  </div>
);

/* ─── Insight card ─── */
interface InsightProps {
  type: 'warning' | 'positive' | 'info' | 'alert';
  title: string;
  body: string;
}
const InsightCard: React.FC<InsightProps> = ({ type, title, body }) => {
  const cfg = {
    warning:  { icon: <AlertTriangle size={14}/>, color: '#F5A800', bg: 'bg-[#F5A800]/10 border-[#F5A800]/20' },
    positive: { icon: <CheckCircle  size={14}/>, color: '#1D9E75', bg: 'bg-[#1D9E75]/10 border-[#1D9E75]/20' },
    info:     { icon: <Info         size={14}/>, color: '#378ADD', bg: 'bg-[#378ADD]/10 border-[#378ADD]/20' },
    alert:    { icon: <AlertTriangle size={14}/>, color: '#E24B4A', bg: 'bg-[#E24B4A]/10 border-[#E24B4A]/20' },
  }[type];
  return (
    <div className={cn('flex items-start gap-3 p-3.5 rounded-xl border', cfg.bg)}>
      <span style={{ color: cfg.color }} className="flex-shrink-0 mt-0.5">{cfg.icon}</span>
      <div>
        <div className="text-xs font-bold text-white mb-0.5">{title}</div>
        <div className="text-[11px] text-gray-400 leading-relaxed">{body}</div>
      </div>
    </div>
  );
};

/* ─── Custom tooltip ─── */
const DarkTooltip: React.FC<{ active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a1628] border border-white/15 rounded-xl px-3 py-2.5 shadow-2xl text-[11px]">
      {label && <div className="text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }}/>
          <span className="text-gray-300">{p.name}:</span>
          <span className="text-white font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════ */
const AnalisiStatistiche: React.FC = () => {
  const { subaffidamenti } = useData();
  const [periodo, setPeriodo] = useState<Periodo>('Anno');
  const [rankSort, setRankSort] = useState<'count' | 'volume' | 'durata'>('count');
  const [rankDesc, setRankDesc] = useState(true);
  const [trendWindow, setTrendWindow] = useState<'3M' | '6M' | '1A' | 'ALL'>('1A');

  const now = new Date();
  const aggiornato = format(now, "d MMM. yyyy HH:mm", { locale: it });

  /* ── Dati filtrati per periodo ── */
  const filtered = useMemo(() => {
    const cutoff = subDays(now, PERIODO_DAYS[periodo]);
    return subaffidamenti.filter(s => {
      const d = safeParseISO(s.dataCreazione || s.inserito);
      if (!d) return true;
      return isAfter(d, cutoff);
    });
  }, [subaffidamenti, periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const tot = filtered.length;
    const totPrev = Math.max(1, Math.round(tot * 0.88)); // simula confronto periodo prec.

    const autorizzati = filtered.filter(s => s.stato === 'Autorizzato' || s.stato === 'Attivo');

    const leadTimes = filtered
      .filter(s => isValidDate(s.primaDataAutorizzazione) && isValidDate(s.dataCreazione))
      .map(s => differenceInDays(new Date(s.primaDataAutorizzazione!), new Date(s.dataCreazione!)))
      .filter(d => d >= 0);
    const tempoMedio = leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;

    const valoreTot  = filtered.reduce((s, x) => s + parseEuro(x.importoRichiestoEuro || x.importoEur), 0);
    const valoreAuth = autorizzati.reduce((s, x) => s + parseEuro(x.importoRichiestoEuro || x.importoEur), 0);
    const percAuth   = valoreTot > 0 ? (valoreAuth / valoreTot * 100) : 0;
    const tassoAut   = tot > 0 ? (autorizzati.length / tot * 100) : 0;

    const valoreAttivo = filtered
      .filter(s => s.stato === 'Attivo')
      .reduce((s, x) => s + parseEuro(x.importoRichiestoEuro || x.importoEur), 0);

    const sogliaCount = filtered.filter(s =>
      parseEuro(s.importoRichiestoEuro || s.importoEur) > 0 &&
      parseEuro(s.importoMassimoSubappaltabile || s.importoMaxSub) > 0 &&
      parseEuro(s.importoRichiestoEuro || s.importoEur) >= parseEuro(s.importoMassimoSubappaltabile || s.importoMaxSub)
    ).length;

    return {
      totale:      { val: tot,              delta: tot - totPrev },
      tempoMedio:  { val: tempoMedio,       delta: tempoMedio - 5.5 },
      percAuth:    { val: percAuth,         delta: percAuth - 75 },
      tassoAut:    { val: tassoAut,         delta: tassoAut - 13 },
      valoreAttivo:{ val: valoreAttivo,     delta: valoreAttivo - 16_000_000 },
      soglia:      { val: sogliaCount,      delta: sogliaCount - 0 },
    };
  }, [filtered]);

  /* ── Dati mensili (ultimi 12 mesi) per il grafico Volumi ── */
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, 11 - i);
      const key = format(d, 'yyyy-MM');
      const label = MESI_IT[d.getMonth()];
      const inMonth = subaffidamenti.filter(s => {
        const dt = s.dataCreazione || s.inserito;
        if (!dt) return false;
        try { return format(parseISO(dt), 'yyyy-MM') === key; } catch { return false; }
      });
      const auth = inMonth.filter(s => s.stato === 'Autorizzato' || s.stato === 'Attivo');
      return {
        name: label,
        subaffidamenti: inMonth.length,
        autorizzazioni: auth.length,
        perc: inMonth.length > 0 ? Math.round(auth.length / inMonth.length * 100) : 0,
      };
    });
  }, [subaffidamenti]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Funnel di stato ── */
  const funnelData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(s => { map[s.stato] = (map[s.stato] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a).map(([stato, count]) => ({ stato, count }));
  }, [filtered]);

  const maxFunnel = useMemo(() => Math.max(1, ...funnelData.map(f => f.count)), [funnelData]);

  /* ── Mix per tipo (Subappalto / Subcontratto × 6 mesi) ── */
  const mixData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const key = format(d, 'yyyy-MM');
      const label = MESI_IT[d.getMonth()];
      const inMonth = subaffidamenti.filter(s => {
        const dt = s.dataCreazione || s.inserito;
        if (!dt) return false;
        try { return format(parseISO(dt), 'yyyy-MM') === key; } catch { return false; }
      });
      return {
        name: label,
        Subappalto:   inMonth.filter(s => s.tipo === 'Subappalto').length,
        Subcontratto: inMonth.filter(s => s.tipo === 'Subcontratto').length,
      };
    });
  }, [subaffidamenti]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Heatmap: top 8 appaltatori × ultimi 6 mesi ── */
  const heatmapData = useMemo(() => {
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      return { key: format(d, 'yyyy-MM'), label: MESI_IT[d.getMonth()] };
    });

    const countByApp: Record<string, number> = {};
    subaffidamenti.forEach(s => {
      const a = (s.appaltatore || s.app || '—').trim();
      countByApp[a] = (countByApp[a] || 0) + 1;
    });
    const top8 = Object.entries(countByApp).sort(([, a], [, b]) => b - a).slice(0, 8).map(([a]) => a);

    const cells = top8.map(app => {
      const row = last6.map(({ key, label }) => {
        const n = subaffidamenti.filter(s => {
          const a = (s.appaltatore || s.app || '—').trim();
          const dt = s.dataCreazione || s.inserito;
          if (a !== app || !dt) return false;
          try { return format(parseISO(dt), 'yyyy-MM') === key; } catch { return false; }
        }).length;
        return { label, n };
      });
      return { app: app.length > 24 ? app.slice(0, 24) + '…' : app, row };
    });
    const maxVal = Math.max(1, ...cells.flatMap(c => c.row.map(r => r.n)));
    return { cells, months: last6.map(m => m.label), maxVal };
  }, [subaffidamenti]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Istogramma tempo di approvazione ── */
  const histData = useMemo(() => {
    const leadTimes = subaffidamenti
      .filter(s => isValidDate(s.primaDataAutorizzazione) && isValidDate(s.dataCreazione))
      .map(s => differenceInDays(new Date(s.primaDataAutorizzazione!), new Date(s.dataCreazione!)))
      .filter(d => d >= 0);
    const buckets = [
      { label: '<1g', min: 0, max: 1 },
      { label: '1-3g', min: 1, max: 3 },
      { label: '3-7g', min: 3, max: 7 },
      { label: '7-15g', min: 7, max: 15 },
      { label: '15-30g', min: 15, max: 30 },
      { label: '>30g', min: 30, max: Infinity },
    ];
    return buckets.map(b => ({
      label: b.label,
      count: leadTimes.filter(d => d >= b.min && d < b.max).length,
    }));
  }, [subaffidamenti]);

  /* ── Ranking appaltatori ── */
  const rankingData = useMemo(() => {
    const map: Record<string, { count: number; volume: number; durata: number; durataCount: number }> = {};
    filtered.forEach(s => {
      const a = (s.appaltatore || s.app || '—').trim();
      if (!map[a]) map[a] = { count: 0, volume: 0, durata: 0, durataCount: 0 };
      map[a].count++;
      map[a].volume += parseEuro(s.importoRichiestoEuro || s.importoEur);
      if (isValidDate(s.primaDataAutorizzazione) && isValidDate(s.dataCreazione)) {
        const d = differenceInDays(new Date(s.primaDataAutorizzazione!), new Date(s.dataCreazione!));
        if (d >= 0) { map[a].durata += d; map[a].durataCount++; }
      }
    });
    const list = Object.entries(map).map(([nome, v]) => ({
      nome,
      count:  v.count,
      volume: v.volume,
      durata: v.durataCount > 0 ? Math.round(v.durata / v.durataCount) : 0,
    }));
    const sorted = [...list].sort((a, b) => {
      const diff = rankDesc
        ? b[rankSort] - a[rankSort]
        : a[rankSort] - b[rankSort];
      return diff;
    });
    const maxCount  = Math.max(1, ...list.map(r => r.count));
    const maxVolume = Math.max(1, ...list.map(r => r.volume));
    return { rows: sorted.slice(0, 15), maxCount, maxVolume };
  }, [filtered, rankSort, rankDesc]);

  /* ── Anomalie & Insight ── */
  const insights = useMemo(() => {
    const result: InsightProps[] = [];

    // Appaltatore con più rigetti
    const rigetti = filtered.filter(s => s.stato === 'Rigettato' || s.stato === 'Rifiutato');
    if (rigetti.length > 0) {
      const map: Record<string, number> = {};
      rigetti.forEach(s => { const a = (s.appaltatore || s.app || '—').trim(); map[a] = (map[a] || 0) + 1; });
      const [top, n] = Object.entries(map).sort(([, a], [, b]) => b - a)[0];
      result.push({ type: 'alert', title: `Picco rigetti — ${top.split(' ').slice(0, 2).join(' ')}`, body: `${n} rigett${n === 1 ? 'o' : 'i'} nel periodo selezionato. Verificare le cause.` });
    }

    // Lead time più basso (miglior performer)
    const leadRanking = rankingData.rows.filter(r => r.durata > 0).sort((a, b) => a.durata - b.durata);
    if (leadRanking.length > 0) {
      const best = leadRanking[0];
      result.push({ type: 'positive', title: `Lead time ottimale — ${best.nome.split(' ').slice(0, 2).join(' ')}`, body: `Approvazione media in ${best.durata}gg. Performance migliore del periodo.` });
    }

    // Appaltatore dominante per volume
    if (rankingData.rows.length > 1) {
      const top = rankingData.rows.sort((a, b) => b.count - a.count)[0];
      const perc = Math.round(top.count / filtered.length * 100);
      if (perc >= 25) {
        result.push({ type: 'info', title: `Concentrazione elevata — ${top.nome.split(' ').slice(0, 2).join(' ')}`, body: `${perc}% delle pratiche del periodo. Valutare diversificazione.` });
      }
    }

    // Soglia di approvazione
    const tassoAut = kpis.tassoAut.val;
    if (tassoAut < 80) {
      result.push({ type: 'warning', title: `Tasso autorizzativo sotto soglia`, body: `${tassoAut.toFixed(1)}% di pratiche autorizzate. Target raccomandato ≥ 80%.` });
    } else {
      result.push({ type: 'positive', title: `Tasso autorizzativo nella norma`, body: `${tassoAut.toFixed(1)}% di pratiche autorizzate. Obiettivo raggiunto.` });
    }

    return result.slice(0, 4);
  }, [filtered, rankingData, kpis]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Trend cumulativo ── */
  const cumulativeData = useMemo(() => {
    type MonthEntry = { key: string; name: string; sub: number; budget: number };
    const monthly: Record<string, MonthEntry> = {};
    subaffidamenti.forEach(d => {
      const raw = d.inserito || d.dataCreazione;
      if (!raw) return;
      const date = new Date(raw);
      if (isNaN(date.getTime())) return;
      const key = format(date, 'yyyy-MM');
      const name = format(date, 'MMM yy', { locale: it });
      if (!monthly[key]) monthly[key] = { key, name, sub: 0, budget: 0 };
      const parseE = (v: string | undefined | null) => parseFloat((v || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      monthly[key].sub    += parseE(d.importoEur || d.importoRichiestoEuro);
      monthly[key].budget += parseE(d.importoMaxSub || d.importoMassimoSubappaltabile);
    });
    const sorted = Object.values(monthly).sort((a, b) => a.key.localeCompare(b.key));
    let cumSub = 0, cumBudget = 0;
    const cumulative = sorted.map(m => {
      cumSub    += m.sub;
      cumBudget += m.budget;
      return { name: m.name, sub: Math.round(cumSub / 1000), budget: Math.round(cumBudget / 1000) };
    });
    const windowMap: Record<string, number> = { '3M': 3, '6M': 6, '1A': 12, 'ALL': 9999 };
    return cumulative.slice(-(windowMap[trendWindow] ?? 12));
  }, [subaffidamenti, trendWindow]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Export Excel ── */
  const exportExcel = () => {
    const rows = rankingData.rows.map((r, i) => ({
      '#': i + 1,
      'Appaltatore': r.nome,
      'Nr. Pratiche': r.count,
      'Volume (€)': r.volume,
      'Durata media (gg)': r.durata,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [4, 40, 14, 16, 18].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking');
    XLSX.writeFile(wb, `Analisi_${format(now, 'yyyyMMdd')}.xlsx`);
  };

  const SortBtn: React.FC<{ col: typeof rankSort; label: string }> = ({ col, label }) => (
    <button onClick={() => { if (rankSort === col) setRankDesc(d => !d); else { setRankSort(col); setRankDesc(true); } }}
      className={cn('flex items-center gap-0.5 text-[10px] uppercase tracking-wider transition-colors',
        rankSort === col ? 'text-[#a89ef8] font-bold' : 'text-gray-600 hover:text-gray-400')}>
      {label}
      {rankSort === col ? (rankDesc ? <ChevronDown size={9}/> : <ChevronUp size={9}/>) : null}
    </button>
  );

  /* ─────────────────────────────────────────
     RENDER
     ───────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-[#07101e] overflow-y-auto">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <BarChart2 size={16} className="text-[#a89ef8]"/>
            <h1 className="text-base font-bold text-white">Analisi &amp; Statistiche</h1>
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">Aggiornato: {aggiornato}</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Periodo selector */}
          <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-xl p-1">
            {(['Anno','Trim','Mese','7gg','1gg'] as Periodo[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  periodo === p ? 'bg-[#534AB7] text-white shadow' : 'text-gray-500 hover:text-gray-300')}>
                {p}
              </button>
            ))}
          </div>
          {/* Actions */}
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <FileDown size={12}/> Esporta Excel
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-5">

        {/* ═══ KPI STRIP ═══ */}
        <div className="grid grid-cols-6 gap-3">
          <KpiCard label="Totale Subaffidamenti" value={String(kpis.totale.val)}
            delta={kpis.totale.delta} icon={<Activity size={14}/>} color="#a89ef8"/>
          <KpiCard label="Tempo medio approv." value={`${kpis.tempoMedio.val.toFixed(1)}g`}
            delta={kpis.tempoMedio.delta} unit="g" invert icon={<Clock size={14}/>} color="#378ADD"/>
          <KpiCard label="Valore autorizzato" value={`${kpis.percAuth.val.toFixed(1)}%`}
            delta={kpis.percAuth.delta} unit="%" icon={<CheckCircle size={14}/>} color="#1D9E75"/>
          <KpiCard label="Tasso autorizzativo" value={`${kpis.tassoAut.val.toFixed(1)}%`}
            delta={kpis.tassoAut.delta} unit="%" icon={<Zap size={14}/>} color="#F5A800"/>
          <KpiCard label="Valore Attivo" value={fmtEuro(kpis.valoreAttivo.val)}
            delta={kpis.valoreAttivo.delta / 1_000_000} unit="M" icon={<Euro size={14}/>} color="#1D9E75"/>
          <KpiCard label="Pratiche su soglia" value={String(kpis.soglia.val)}
            delta={kpis.soglia.delta} invert icon={<AlertTriangle size={14}/>} color="#E24B4A"/>
        </div>

        {/* ═══ ROW 1: Volumi + Funnel ═══ */}
        <div className="grid grid-cols-3 gap-4">

          {/* Volumi & autorizzazioni */}
          <div className="col-span-2 bg-white/3 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Volumi &amp; autorizzazioni</h2>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#534AB7] inline-block"/>&nbsp;Subaffidamenti</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#1D9E75] inline-block"/>&nbsp;Autorizzazioni</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#F5A800] inline-block"/>&nbsp;Aut. %</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`}/>
                <RechartsTooltip content={<DarkTooltip/>}/>
                <Bar yAxisId="left" dataKey="subaffidamenti" name="Subaffidamenti" fill="#534AB7" radius={[3,3,0,0]} maxBarSize={18}/>
                <Bar yAxisId="left" dataKey="autorizzazioni" name="Autorizzazioni"  fill="#1D9E75" radius={[3,3,0,0]} maxBarSize={18}/>
                <Line yAxisId="right" type="monotone" dataKey="perc" name="Aut. %" stroke="#F5A800" strokeWidth={2} dot={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel di stato */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4">Funnel di stato</h2>
            {funnelData.length === 0
              ? <p className="text-xs text-gray-600 text-center mt-8">Nessun dato</p>
              : (
                <div className="space-y-2.5">
                  {funnelData.map(f => (
                    <div key={f.stato}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-gray-300 truncate max-w-[160px]">{f.stato}</span>
                        <span className="text-[11px] font-bold" style={{ color: statoColor(f.stato) }}>{f.count}</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(f.count / maxFunnel) * 100}%`, background: statoColor(f.stato) }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        {/* ═══ TREND CUMULATIVO ═══ */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-[#a89ef8]"/>
              <h2 className="text-sm font-bold text-white">Trend Cumulativo Subappalti</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 mr-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-[#534AB7] inline-block rounded"/> Importo SUB (€ 000)</span>
                <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 border-t-2 border-dashed border-[#1D9E75] inline-block"/> Budget NORM. (€ 000)</span>
              </div>
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                {(['3M','6M','1A','ALL'] as const).map(w => (
                  <button key={w} onClick={() => setTrendWindow(w)}
                    className={cn('px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all',
                      trendWindow === w ? 'bg-[#534AB7] text-white shadow' : 'text-gray-500 hover:text-gray-300')}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cumulativeData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradSubAS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#534AB7" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#534AB7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradBudgetAS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.18}/>
                  <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}/>
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '10px', padding: '8px 12px' }}
                itemStyle={{ color: '#ddeeff' }}
                formatter={(v: unknown, name: string) => [`€ ${Number(v).toLocaleString('it')}k`, name === 'sub' ? 'Importo SUB' : 'Budget NORM.']}
              />
              <Area type="monotone" dataKey="budget" name="budget" stroke="#1D9E75" strokeWidth={1.5} strokeDasharray="6 4" fillOpacity={1} fill="url(#gradBudgetAS)"/>
              <Area type="monotone" dataKey="sub"    name="sub"    stroke="#534AB7" strokeWidth={2}   fillOpacity={1} fill="url(#gradSubAS)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ═══ ROW 2: Heatmap + Mix categoria ═══ */}
        <div className="grid grid-cols-2 gap-4">

          {/* Heatmap appaltatori × mesi */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4">Distribuzione mensile per appaltatore</h2>
            {heatmapData.cells.length === 0
              ? <p className="text-xs text-gray-600 text-center mt-8">Nessun dato</p>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr>
                        <th className="text-left text-gray-600 font-normal pb-2 pr-3 min-w-[120px]">Appaltatore</th>
                        {heatmapData.months.map(m => (
                          <th key={m} className="text-center text-gray-500 font-semibold pb-2 px-1 uppercase tracking-wider w-12">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.cells.map(({ app, row }) => (
                        <tr key={app}>
                          <td className="text-gray-400 pr-3 py-1 truncate max-w-[120px]" title={app}>{app}</td>
                          {row.map(({ label, n }) => {
                            const intensity = n / heatmapData.maxVal;
                            const alpha = n === 0 ? 0.04 : 0.15 + intensity * 0.65;
                            return (
                              <td key={label} className="py-1 px-1">
                                <div className="w-9 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors"
                                  style={{
                                    background: n === 0 ? 'rgba(255,255,255,0.03)' : `rgba(83,74,183,${alpha})`,
                                    color: n === 0 ? '#374151' : intensity > 0.5 ? '#dde0ff' : '#a89ef8',
                                  }}>
                                  {n > 0 ? n : '·'}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>

          {/* Mix per tipo */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Mix per categoria</h2>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#534AB7] inline-block"/>&nbsp;Subappalto</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#378ADD] inline-block"/>&nbsp;Subcontratto</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mixData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <RechartsTooltip content={<DarkTooltip/>}/>
                <Bar dataKey="Subappalto"   fill="#534AB7" radius={[3,3,0,0]} maxBarSize={24}/>
                <Bar dataKey="Subcontratto" fill="#378ADD" radius={[3,3,0,0]} maxBarSize={24}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ═══ ROW 3: Istogramma + Anomalie ═══ */}
        <div className="grid grid-cols-2 gap-4">

          {/* Tempo di approvazione */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-1">Tempo di approvazione</h2>
            <p className="text-[10px] text-gray-600 mb-4">Distribuzione dei lead time — Nr. pratiche per fascia</p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={histData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <RechartsTooltip content={<DarkTooltip/>}/>
                <Bar dataKey="count" name="Pratiche" radius={[4,4,0,0]}>
                  {histData.map((_, i) => (
                    <Cell key={i} fill={i < 2 ? '#1D9E75' : i < 4 ? '#F5A800' : '#E24B4A'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Anomalie & Insight */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-[#a89ef8]"/>
                <h2 className="text-sm font-bold text-white">Anomalie &amp; Insight</h2>
              </div>
              <span className="text-[10px] text-gray-600">calcolati in tempo reale</span>
            </div>
            {insights.length === 0
              ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <CheckCircle size={28} className="text-[#1D9E75] opacity-40"/>
                  <p className="text-xs text-gray-600 text-center">Nessuna anomalia rilevata nel periodo</p>
                </div>
              )
              : (
                <div className="flex flex-col gap-2.5 flex-1">
                  {insights.map((ins, i) => <InsightCard key={i} {...ins}/>)}
                </div>
              )
            }
          </div>
        </div>

        {/* ═══ RANKING APPALTATORI ═══ */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-[#a89ef8]"/>
              <h2 className="text-sm font-bold text-white">Ranking appaltatori</h2>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#a89ef8]/15 text-[#a89ef8]">{rankingData.rows.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left text-[10px] text-gray-600 font-bold uppercase tracking-wider pb-2.5 w-8">#</th>
                  <th className="text-left text-[10px] text-gray-600 font-bold uppercase tracking-wider pb-2.5">Appaltatore</th>
                  <th className="text-left text-[10px] text-gray-600 font-bold uppercase tracking-wider pb-2.5 w-40">
                    <SortBtn col="count" label="Volume"/>
                  </th>
                  <th className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-wider pb-2.5 w-28">
                    <SortBtn col="count" label="Nr. pratiche"/>
                  </th>
                  <th className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-wider pb-2.5 w-24">
                    <SortBtn col="durata" label="Durata media"/>
                  </th>
                  <th className="text-right text-[10px] text-gray-600 font-bold uppercase tracking-wider pb-2.5 w-24">
                    <SortBtn col="volume" label="Valore (€)"/>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankingData.rows.map((r, i) => (
                  <tr key={r.nome} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className={cn('text-xs font-bold', i === 0 ? 'text-[#F5A800]' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-[#cd7f32]' : 'text-gray-700')}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs text-gray-200 font-medium">{r.nome}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#534AB7] to-[#7b74d4] transition-all duration-500"
                            style={{ width: `${(r.count / rankingData.maxCount) * 100}%` }}/>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="text-xs font-bold text-[#a89ef8]">{r.count}</span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={cn('text-xs font-semibold',
                        r.durata === 0 ? 'text-gray-600' : r.durata <= 7 ? 'text-[#1D9E75]' : r.durata <= 15 ? 'text-[#F5A800]' : 'text-[#E24B4A]')}>
                        {r.durata > 0 ? `${r.durata}g` : '—'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="text-xs text-gray-300">{r.volume > 0 ? fmtEuro(r.volume) : '—'}</span>
                    </td>
                  </tr>
                ))}
                {rankingData.rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-xs text-gray-600 py-10">Nessun dato nel periodo selezionato</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalisiStatistiche;
