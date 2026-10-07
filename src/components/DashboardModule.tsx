import React, { useMemo, useState } from 'react';
import { MaterialSignal, DivisionType, normalizeDivision } from '../types';
import { groupMaterialsByFamily, durationToSeconds, formatHoursVerbose, parseAnyDate, isValidPersonName } from '../services/apiService';
import { isBlockedUserName } from '../data/initialData';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  BarChart3, 
  Film, 
  Clock, 
  Layers, 
  CheckCircle2, 
  Archive, 
  Download, 
  Calendar as CalendarIcon,
  Users,
  Award,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  HardDrive,
  Ban,
  Trophy,
  Medal,
  Sparkles,
  UserCheck,
  FileText,
  ArrowRight
} from 'lucide-react';

interface DashboardModuleProps {
  materials: MaterialSignal[];
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ materials }) => {
  const [filterDivision, setFilterDivision] = useState<DivisionType | 'Todas'>('Todas');
  
  // Period Selector State: 'daily' | 'monthly' | 'annual' | 'all'
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'annual' | 'all'>('monthly');

  // Selected Month & Year for Calendar view - Always default to current month and year
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth()); // 0-indexed current month
  const [selectedDayDetail, setSelectedDayDetail] = useState<number | null>(null);

  // Guarantee that whenever opening Dashboard & metricas it starts on current month
  React.useEffect(() => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  }, []);

  // Sub-section tab for User Metrics & Leaderboard
  // 'catalogers' (Para Archivar - Métrica Principal) | 'creators' (Otras secciones) | 'finalizers' (Otras secciones) | 'pipeline' (Flujo integral)
  const [userSectionTab, setUserSectionTab] = useState<'catalogers' | 'creators' | 'finalizers' | 'pipeline'>('catalogers');

  // Month names in Spanish
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Base filtered materials by division
  const divisionFilteredMaterials = useMemo(() => {
    if (filterDivision === 'Todas') return materials;
    return materials.filter((m) => normalizeDivision(m.division) === normalizeDivision(filterDivision));
  }, [materials, filterDivision]);

  // Filter materials based on selected Period
  const periodFilteredMaterials = useMemo(() => {
    return divisionFilteredMaterials.filter((m) => {
      if (!m.creationDate) return true;
      const dateObj = parseAnyDate(m.creationDate);
      if (isNaN(dateObj.getTime())) return true;

      const now = new Date();
      if (period === 'daily') {
        return (
          dateObj.getDate() === now.getDate() &&
          dateObj.getMonth() === now.getMonth() &&
          dateObj.getFullYear() === now.getFullYear()
        );
      } else if (period === 'monthly') {
        return (
          dateObj.getMonth() === selectedMonth &&
          dateObj.getFullYear() === selectedYear
        );
      } else if (period === 'annual') {
        return dateObj.getFullYear() === selectedYear;
      }
      return true; // 'all'
    });
  }, [divisionFilteredMaterials, period, selectedMonth, selectedYear]);

  // Ingested Materials in Selected Period (includes discarded materials as per requirement:
  // "este material descartado sigue contando para el total de horas ingestadas")
  const ingestedMaterialsInPeriod = useMemo(() => {
    return periodFilteredMaterials.filter((m) => m.isIngested !== false);
  }, [periodFilteredMaterials]);

  // Total Ingested Seconds & Hours in Period
  const totalIngestedSecondsInPeriod = useMemo(() => {
    return ingestedMaterialsInPeriod.reduce((sum, mat) => sum + durationToSeconds(mat.duration), 0);
  }, [ingestedMaterialsInPeriod]);

  // Cataloged Tasks ("Para Archivar") in Period (strictly excludes discarded materials)
  const catalogedTasksInPeriod = useMemo(() => {
    return periodFilteredMaterials.filter(
      (m) => m.isCataloged === true && m.status !== 'Descartado' && !m.isDiscarded
    );
  }, [periodFilteredMaterials]);

  // Discarded Materials in Period
  const discardedMaterialsInPeriod = useMemo(() => {
    return periodFilteredMaterials.filter(
      (m) => m.status === 'Descartado' || m.isDiscarded === true
    );
  }, [periodFilteredMaterials]);

  // Grouped families in period
  const familyGroups = useMemo(() => {
    return groupMaterialsByFamily(periodFilteredMaterials);
  }, [periodFilteredMaterials]);

  // Metric 1: Unique Material Families Count
  const uniqueMaterialCount = familyGroups.length;

  // Metric 2: Individual Signals Count
  const totalSignalsCount = periodFilteredMaterials.length;

  // Division Metrics Data for Bar Chart
  const divisionData = useMemo(() => {
    const divisions: ('Archivo de Prensa' | 'Archivo de Programación' | 'Ingesta' | 'Gerencia')[] = [
      'Archivo de Prensa',
      'Archivo de Programación',
      'Ingesta',
      'Gerencia'
    ];

    return divisions.map((div) => {
      const divMats = periodFilteredMaterials.filter((m) => normalizeDivision(m.division) === div);
      const divFamilies = groupMaterialsByFamily(divMats);
      const divSecs = divMats.reduce((acc, m) => acc + durationToSeconds(m.duration), 0);
      const divHours = +(divSecs / 3600).toFixed(2);

      const catalogedCount = divMats.filter(
        (m) => m.isCataloged && m.status !== 'Descartado' && !m.isDiscarded
      ).length;
      const finalizedCount = divMats.filter(
        (m) => m.isFinalized && m.status !== 'Descartado' && !m.isDiscarded
      ).length;

      return {
        name: div,
        'Materiales Únicos': divFamilies.length,
        'Señales Registradas': divMats.length,
        'Para Archivar': catalogedCount,
        'Finalizados': finalizedCount,
        'Horas Totales': divHours,
      };
    });
  }, [periodFilteredMaterials]);

  // Signal Type Hours Breakdown (Dynamic for Limpio, Insert, Master + Custom signals like Promo, Clip, etc.)
  const signalTypeHoursData = useMemo(() => {
    const map = new Map<string, { totalSeconds: number; count: number }>();

    periodFilteredMaterials.forEach((m) => {
      const type = m.signalType || 'General';
      if (!map.has(type)) {
        map.set(type, { totalSeconds: 0, count: 0 });
      }
      const item = map.get(type)!;
      item.totalSeconds += durationToSeconds(m.duration);
      item.count += 1;
    });

    return Array.from(map.entries()).map(([type, data]) => ({
      name: `Señal ${type}`,
      value: +(data.totalSeconds / 3600).toFixed(2),
      totalSeconds: data.totalSeconds,
      count: data.count,
    }));
  }, [periodFilteredMaterials]);

  // 1. Estadísticas Oficiales de Operadores en Catalogación ("Para Archivar")
  // Requisito estricto: El ranking y puesto más alto se determinan PRINCIPALMENTE por "Materiales Únicos (Familias)".
  // Las tareas "Para Archivar" se preservan como dato extra complementario.
  const catalogerStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        catalogedTasks: number;
        familyIds: Set<string>;
        totalSeconds: number;
        divisions: Set<string>;
        lastCatalogedAt?: string;
      }
    >();

    periodFilteredMaterials.forEach((m) => {
      // Excluir materiales descartados y aquellos sin acción explícita de "Para Archivar"
      if (m.status === 'Descartado' || m.isDiscarded || !m.isCataloged) return;

      const cataloger = (m.catalogedBy || '').trim();
      // Solo contabilizar usuarios válidos y no bloqueados (sin fallback a createdBy ni finalizadores)
      if (!isValidPersonName(cataloger) || isBlockedUserName(cataloger)) return;

      if (!map.has(cataloger)) {
        map.set(cataloger, {
          name: cataloger,
          catalogedTasks: 0,
          familyIds: new Set(),
          totalSeconds: 0,
          divisions: new Set(),
        });
      }

      const item = map.get(cataloger)!;
      item.catalogedTasks += 1;
      if (m.familyId) item.familyIds.add(m.familyId);
      if (m.division) item.divisions.add(m.division);
      item.totalSeconds += durationToSeconds(m.duration);

      if (m.catalogedAt) {
        if (!item.lastCatalogedAt || parseAnyDate(m.catalogedAt).getTime() > parseAnyDate(item.lastCatalogedAt).getTime()) {
          item.lastCatalogedAt = m.catalogedAt;
        }
      }
    });

    const totalFamiliesCount = Array.from(map.values()).reduce((sum, c) => sum + c.familyIds.size, 0);

    const list = Array.from(map.values()).map((c) => ({
      name: c.name,
      catalogedTasks: c.catalogedTasks,
      familiesCount: c.familyIds.size,
      totalSeconds: c.totalSeconds,
      formattedHours: formatHoursVerbose(c.totalSeconds),
      divisions: Array.from(c.divisions).join(', ') || 'General',
      lastCatalogedAt: c.lastCatalogedAt,
      percentage: totalFamiliesCount > 0 ? ((c.familyIds.size / totalFamiliesCount) * 100).toFixed(1) : '0',
    }));

    // Determinar quien tiene el puesto más alto: Materiales Únicos (Familias) como FUENTE PRINCIPAL,
    // y Tareas "Para Archivar" como desempate / dato complementario
    return list.sort((a, b) => {
      if (b.familiesCount !== a.familiesCount) {
        return b.familiesCount - a.familiesCount;
      }
      return b.catalogedTasks - a.catalogedTasks;
    });
  }, [periodFilteredMaterials]);

  // 2. Otras Secciones: Usuarios en Registro y Creación de Materiales
  const creatorStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        createdCount: number;
        familyIds: Set<string>;
        totalSeconds: number;
        divisions: Set<string>;
        lastCreatedAt?: string;
      }
    >();

    periodFilteredMaterials.forEach((m) => {
      const creator = (m.createdBy || '').trim();
      if (!isValidPersonName(creator) || isBlockedUserName(creator)) return;

      if (!map.has(creator)) {
        map.set(creator, {
          name: creator,
          createdCount: 0,
          familyIds: new Set(),
          totalSeconds: 0,
          divisions: new Set(),
        });
      }

      const item = map.get(creator)!;
      item.createdCount += 1;
      if (m.familyId) item.familyIds.add(m.familyId);
      if (m.division) item.divisions.add(m.division);
      if (m.isIngested !== false) {
        item.totalSeconds += durationToSeconds(m.duration);
      }

      if (m.creationDate) {
        if (!item.lastCreatedAt || parseAnyDate(m.creationDate).getTime() > parseAnyDate(item.lastCreatedAt).getTime()) {
          item.lastCreatedAt = m.creationDate;
        }
      }
    });

    return Array.from(map.values())
      .map((c) => ({
        name: c.name,
        createdCount: c.createdCount,
        familiesCount: c.familyIds.size,
        totalSeconds: c.totalSeconds,
        formattedHours: formatHoursVerbose(c.totalSeconds),
        divisions: Array.from(c.divisions).join(', ') || 'General',
        lastCreatedAt: c.lastCreatedAt,
      }))
      .sort((a, b) => b.createdCount - a.createdCount);
  }, [periodFilteredMaterials]);

  // 3. Otras Secciones: Usuarios en Control y Finalización
  const finalizerStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        finalizedCount: number;
        familyIds: Set<string>;
        totalSeconds: number;
        divisions: Set<string>;
        lastFinalizedAt?: string;
      }
    >();

    periodFilteredMaterials.forEach((m) => {
      if (m.status === 'Descartado' || m.isDiscarded || !m.isFinalized) return;
      const finalizer = (m.finalizedBy || '').trim();
      if (!isValidPersonName(finalizer) || isBlockedUserName(finalizer)) return;

      if (!map.has(finalizer)) {
        map.set(finalizer, {
          name: finalizer,
          finalizedCount: 0,
          familyIds: new Set(),
          totalSeconds: 0,
          divisions: new Set(),
        });
      }

      const item = map.get(finalizer)!;
      item.finalizedCount += 1;
      if (m.familyId) item.familyIds.add(m.familyId);
      if (m.division) item.divisions.add(m.division);
      item.totalSeconds += durationToSeconds(m.duration);

      if (m.finalizedAt) {
        if (!item.lastFinalizedAt || parseAnyDate(m.finalizedAt).getTime() > parseAnyDate(item.lastFinalizedAt).getTime()) {
          item.lastFinalizedAt = m.finalizedAt;
        }
      }
    });

    return Array.from(map.values())
      .map((f) => ({
        name: f.name,
        finalizedCount: f.finalizedCount,
        familiesCount: f.familyIds.size,
        totalSeconds: f.totalSeconds,
        formattedHours: formatHoursVerbose(f.totalSeconds),
        divisions: Array.from(f.divisions).join(', ') || 'General',
        lastFinalizedAt: f.lastFinalizedAt,
      }))
      .sort((a, b) => b.finalizedCount - a.finalizedCount);
  }, [periodFilteredMaterials]);

  // 4. Comparativa Integral de Flujo (Pipeline)
  const pipelineStats = useMemo(() => {
    const userNames = new Set<string>();
    catalogerStats.forEach((c) => userNames.add(c.name));
    creatorStats.forEach((c) => userNames.add(c.name));
    finalizerStats.forEach((f) => userNames.add(f.name));

    return Array.from(userNames).map((name) => {
      const cat = catalogerStats.find((c) => c.name === name);
      const cre = creatorStats.find((c) => c.name === name);
      const fin = finalizerStats.find((f) => f.name === name);

      return {
        name,
        familiesCount: cat?.familiesCount || cre?.familiesCount || fin?.familiesCount || 0,
        catalogedTasks: cat?.catalogedTasks || 0,
        catalogedHours: cat?.formattedHours || '0s',
        createdCount: cre?.createdCount || 0,
        createdHours: cre?.formattedHours || '0s',
        finalizedCount: fin?.finalizedCount || 0,
        finalizedHours: fin?.formattedHours || '0s',
        primaryRole: cat && cat.catalogedTasks > 0 ? 'Catalogador ("Para Archivar")' : fin && fin.finalizedCount > 0 ? 'Finalizador' : 'Creador / Ingesta',
      };
    }).sort((a, b) => {
      if (b.familiesCount !== a.familiesCount) {
        return b.familiesCount - a.familiesCount;
      }
      return b.catalogedTasks - a.catalogedTasks;
    });
  }, [catalogerStats, creatorStats, finalizerStats]);

  // Datos para gráfico de barras de operadores catalogadores ("Para Archivar")
  const catalogerChartData = useMemo(() => {
    return catalogerStats.slice(0, 8).map((c) => ({
      name: c.name.length > 14 ? c.name.substring(0, 14) + '...' : c.name,
      fullName: c.name,
      'Materiales Únicos (Familias)': c.familiesCount,
      'Tareas Para Archivar (Dato Extra)': c.catalogedTasks,
      'Horas': +(c.totalSeconds / 3600).toFixed(2),
    }));
  }, [catalogerStats]);

  // CALENDAR COMPUTATION LOGIC (For Monthly View)
  const calendarDaysData = useMemo(() => {
    if (period !== 'monthly') return [];

    // Get number of days in selected month
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    // Get starting day of week (0 = Sun, 1 = Mon, etc.)
    const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay();

    const days = [];
    
    // Empty padding cells for previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ dayNumber: null, seconds: 0, count: 0, materials: [] });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayMats = divisionFilteredMaterials.filter((m) => {
        if (!m.creationDate) return false;
        const dateObj = parseAnyDate(m.creationDate);
        if (isNaN(dateObj.getTime())) return false;
        return (
          dateObj.getDate() === d &&
          dateObj.getMonth() === selectedMonth &&
          dateObj.getFullYear() === selectedYear
        );
      });

      const daySecs = dayMats.reduce((acc, m) => acc + (m.isIngested !== false ? durationToSeconds(m.duration) : 0), 0);

      days.push({
        dayNumber: d,
        seconds: daySecs,
        count: dayMats.length,
        materials: dayMats,
      });
    }

    return days;
  }, [divisionFilteredMaterials, period, selectedMonth, selectedYear]);

  // Selected Day Materials List
  const selectedDayMaterials = useMemo(() => {
    if (!selectedDayDetail || period !== 'monthly') return [];
    const cell = calendarDaysData.find((c) => c.dayNumber === selectedDayDetail);
    return cell ? cell.materials : [];
  }, [selectedDayDetail, calendarDaysData, period]);

  const COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Filter Controls */}
      <div className="p-5 bg-gradient-to-br from-[#1E293B] via-[#1E293B] to-[#0F172A] border border-slate-700/80 rounded-2xl shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Dashboard y Métricas del Departamento de Archivo
              </h2>
              <p className="text-xs text-slate-400">
                Monitoreo de Horas Ingestadas, Tareas por Usuario y Control Periódico
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector Controls (Diario, Mensual, Anual, Todo) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Division Filter */}
          <select
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value as any)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="Todas">Todas las Divisiones</option>
            <option value="Archivo de Prensa">Archivo de Prensa</option>
            <option value="Archivo de Programación">Archivo de Programación</option>
            <option value="Ingesta">Ingesta</option>
            <option value="Gerencia">Gerencia</option>
          </select>

          {/* Period Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setPeriod('daily'); setSelectedDayDetail(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'daily'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Diario (Hoy)
            </button>
            <button
              onClick={() => { setPeriod('monthly'); setSelectedDayDetail(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'monthly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => { setPeriod('annual'); setSelectedDayDetail(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'annual'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Anual
            </button>
            <button
              onClick={() => { setPeriod('all'); setSelectedDayDetail(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todo
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row with Gradient Backdrop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Horas Totales Ingestadas (Includes discarded material) */}
        <div className="p-5 bg-gradient-to-br from-[#1E293B] via-[#1E293B]/90 to-[#0F172A] border border-blue-500/30 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              1. Horas Ingestadas ({period === 'daily' ? 'Hoy' : period === 'monthly' ? monthNames[selectedMonth] : period === 'annual' ? selectedYear : 'Total'})
            </span>
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-extrabold text-blue-300 font-mono block">
              {formatHoursVerbose(totalIngestedSecondsInPeriod)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Suma de todo material ingestado ({ingestedMaterialsInPeriod.length} señales)
            </span>
          </div>
        </div>

        {/* KPI 2: Tareas Realizadas ("Para Archivar" / Catalogados) */}
        <div className="p-5 bg-gradient-to-br from-[#1E293B] via-[#1E293B]/90 to-[#0F172A] border border-amber-500/40 rounded-2xl shadow-xl relative overflow-hidden ring-1 ring-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                2. Tareas "Para Archivar"
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Métrica Oficial
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold text-amber-300 font-mono block">
                {catalogedTasksInPeriod.length}
              </span>
              <span className="text-xs font-mono text-amber-400 font-bold">
                ({catalogerStats.length} operadores)
              </span>
            </div>
            <span className="text-[11px] text-slate-300 mt-1 block">
              Contabilización oficial de usuarios que dieron clic en "Para Archivar"
            </span>
          </div>
        </div>

        {/* KPI 3: Materiales Únicos (Familias) */}
        <div className="p-5 bg-gradient-to-br from-[#1E293B] via-[#1E293B]/90 to-[#0F172A] border border-slate-700/80 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              3. Materiales Únicos
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl lg:text-3xl font-extrabold text-white font-mono block">
              {uniqueMaterialCount}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Familias contenedoras registradas
            </span>
          </div>
        </div>

        {/* KPI 4: Materiales Finalizados & Descartados */}
        <div className="p-5 bg-gradient-to-br from-[#1E293B] via-[#1E293B]/90 to-[#0F172A] border border-emerald-500/30 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              4. Finalizados / Descartados
            </span>
            <div className="flex items-center gap-1">
              <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30">
                <Ban className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-extrabold text-emerald-300 font-mono block">
                {periodFilteredMaterials.filter((m) => m.isFinalized && m.status !== 'Descartado' && !m.isDiscarded).length}
              </span>
              <span className="text-[11px] text-slate-400">Finalizados en Acervo</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-rose-400 font-mono block">
                {discardedMaterialsInPeriod.length}
              </span>
              <span className="text-[10px] text-rose-400/80">Descartados</span>
            </div>
          </div>
        </div>
      </div>

      {/* CALENDAR VISUALIZATION */}
      {period === 'monthly' && (
        <div className="p-5 bg-gradient-to-br from-[#1E293B] via-[#1E293B] to-[#0F172A] border border-slate-700/80 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Calendario de Ingesta Diaria ({monthNames[selectedMonth]} {selectedYear})
                </h3>
                <p className="text-xs text-slate-400">
                  Haz clic en un día para ver el detalle de horas y materiales grabados
                </p>
              </div>
            </div>

            {/* Month & Year Selectors with Mes Actual Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setSelectedYear(now.getFullYear());
                  setSelectedMonth(now.getMonth());
                  setSelectedDayDetail(null);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth()
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500/60 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
                title="Ir al mes actual (Hoy)"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Mes Actual</span>
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(Number(e.target.value)); setSelectedDayDetail(null); }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
              >
                {monthNames.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(Number(e.target.value)); setSelectedDayDetail(null); }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
              >
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Calendar Grid Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase py-1">
            <div>Dom</div>
            <div>Lun</div>
            <div>Mar</div>
            <div>Mié</div>
            <div>Jue</div>
            <div>Vie</div>
            <div>Sáb</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDaysData.map((cell, idx) => {
              if (cell.dayNumber === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-20 rounded-xl bg-slate-950/30 border border-slate-900/50"
                  />
                );
              }

              const hasRecordedHours = cell.seconds > 0;
              const isSelected = selectedDayDetail === cell.dayNumber;

              return (
                <div
                  key={`day-${cell.dayNumber}`}
                  onClick={() => setSelectedDayDetail(isSelected ? null : cell.dayNumber)}
                  className={`h-22 p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-500/50 shadow-lg'
                      : hasRecordedHours
                      ? 'bg-slate-900/90 hover:bg-slate-800 border-blue-500/40 hover:border-blue-400'
                      : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800/80 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-blue-300'
                          : hasRecordedHours
                          ? 'text-white'
                          : 'text-slate-500'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.count > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {cell.count} seg
                      </span>
                    )}
                  </div>

                  <div>
                    {hasRecordedHours ? (
                      <div className="mt-1">
                        <span className="text-[11px] font-mono font-extrabold text-amber-300 block">
                          ⏱️ {formatHoursVerbose(cell.seconds)}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-semibold">
                          Ingestado
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-600 italic block mt-2">
                        Sin ingesta
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Day Details Drawer */}
          {selectedDayDetail && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-blue-500/40 animate-fade-in space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-300 flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  Materiales Grabados el {selectedDayDetail} de {monthNames[selectedMonth]} {selectedYear}:
                </h4>
                <button
                  onClick={() => setSelectedDayDetail(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cerrar Detalle ✕
                </button>
              </div>

              {selectedDayMaterials.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No hay registros de ingesta guardados para este día.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                  {selectedDayMaterials.map((mat, mIdx) => (
                    <div
                      key={`daymat-${mat.id}-${mat.signalType}-${mIdx}`}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-white">{mat.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {mat.id} | {mat.division} | {mat.signalType}
                          {(mat.status === 'Descartado' || mat.isDiscarded) && (
                            <span className="text-rose-400 ml-1 font-bold">(Descartado)</span>
                          )}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                        {mat.duration}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sub-section Navigation & User Metrics Module */}
      <div className="bg-gradient-to-br from-[#1E293B] via-[#1E293B] to-[#0F172A] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Navigation Tabs for User Roles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Contabilización y Rendimiento de Personal por Rol</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clasificación de puesto determinada principalmente por <strong>Materiales Únicos (Familias)</strong>, con registro de tareas "Para Archivar" como dato extra
            </p>
          </div>

          <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              onClick={() => setUserSectionTab('catalogers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                userSectionTab === 'catalogers'
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Catalogación ("Para Archivar")</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase font-mono ${
                userSectionTab === 'catalogers' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {catalogerStats.length}
              </span>
            </button>

            <button
              onClick={() => setUserSectionTab('creators')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                userSectionTab === 'creators'
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Registro y Creación</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold font-mono ${
                userSectionTab === 'creators' ? 'bg-blue-950 text-blue-200' : 'bg-slate-800 text-slate-400'
              }`}>
                {creatorStats.length}
              </span>
            </button>

            <button
              onClick={() => setUserSectionTab('finalizers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                userSectionTab === 'finalizers'
                  ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Control y Finalización</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold font-mono ${
                userSectionTab === 'finalizers' ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-800 text-slate-400'
              }`}>
                {finalizerStats.length}
              </span>
            </button>

            <button
              onClick={() => setUserSectionTab('pipeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                userSectionTab === 'pipeline'
                  ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flujo Integral</span>
            </button>
          </div>
        </div>

        {/* TAB 1: OPERADORES EN CATALOGACIÓN - RANKING PRINCIPAL POR MATERIALES ÚNICOS (FAMILIAS) */}
        {userSectionTab === 'catalogers' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-white">
                      Rendimiento de Operadores en Catalogación
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-500/50 text-[10px] font-extrabold uppercase">
                      Ranking: Materiales Únicos (Familias)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Clasificación oficial determinada por <strong>Materiales Únicos (Familias)</strong> como fuente principal de puesto. Las <strong>Tareas "Para Archivar"</strong> se registran como dato complementario.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-blue-400 block">Materiales Únicos</span>
                  <span className="text-sm font-mono font-extrabold text-blue-300">
                    {catalogerStats.reduce((sum, c) => sum + c.familiesCount, 0)} familias
                  </span>
                </div>
                <div className="text-right border-l border-slate-700/60 pl-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Dato Extra: "Para Archivar"</span>
                  <span className="text-xs font-mono font-bold text-amber-300/90">
                    {catalogerStats.reduce((sum, c) => sum + c.catalogedTasks, 0)} tareas
                  </span>
                </div>
              </div>
            </div>

            {/* Podium / Top Catalogers Ranking */}
            {catalogerStats.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1st Place */}
                {catalogerStats[0] && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/50 to-slate-900 border border-amber-500/50 relative shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" /> 1º Lugar (Líder)
                      </span>
                      <span className="font-mono text-xs font-bold text-blue-400" title="Porcentaje de familias catalogadas">{catalogerStats[0].percentage}%</span>
                    </div>
                    <p className="font-bold text-white text-sm truncate">{catalogerStats[0].name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{catalogerStats[0].divisions}</p>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-extrabold text-blue-300 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          {catalogerStats[0].familiesCount} Materiales Únicos
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ⏱️ {catalogerStats[0].formattedHours}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                        <span className="text-slate-400">Dato extra:</span>
                        <span className="text-amber-300 font-semibold">{catalogerStats[0].catalogedTasks} tareas "Para Archivar"</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2nd Place */}
                {catalogerStats[1] && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 relative shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-200 border border-slate-600 text-[10px] font-extrabold">
                        <Medal className="w-3.5 h-3.5 text-slate-300" /> 2º Lugar
                      </span>
                      <span className="font-mono text-xs font-bold text-blue-400" title="Porcentaje de familias catalogadas">{catalogerStats[1].percentage}%</span>
                    </div>
                    <p className="font-bold text-white text-sm truncate">{catalogerStats[1].name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{catalogerStats[1].divisions}</p>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-extrabold text-blue-300 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          {catalogerStats[1].familiesCount} Materiales Únicos
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ⏱️ {catalogerStats[1].formattedHours}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                        <span className="text-slate-400">Dato extra:</span>
                        <span className="text-amber-300 font-semibold">{catalogerStats[1].catalogedTasks} tareas "Para Archivar"</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {catalogerStats[2] && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 relative shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-200 border border-amber-800/60 text-[10px] font-extrabold">
                        <Medal className="w-3.5 h-3.5 text-amber-400" /> 3º Lugar
                      </span>
                      <span className="font-mono text-xs font-bold text-blue-400" title="Porcentaje de familias catalogadas">{catalogerStats[2].percentage}%</span>
                    </div>
                    <p className="font-bold text-white text-sm truncate">{catalogerStats[2].name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{catalogerStats[2].divisions}</p>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-extrabold text-blue-300 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          {catalogerStats[2].familiesCount} Materiales Únicos
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ⏱️ {catalogerStats[2].formattedHours}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                        <span className="text-slate-400">Dato extra:</span>
                        <span className="text-amber-300 font-semibold">{catalogerStats[2].catalogedTasks} tareas "Para Archivar"</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bar Chart of Unique Materials & Cataloged Tasks per Operator */}
            {catalogerChartData.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <span>Rendimiento por Operador: Materiales Únicos (Métrica Principal) vs Tareas (Dato Extra)</span>
                  </h4>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-blue-300 font-bold">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span> Materiales Únicos (Familias)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span> Tareas "Para Archivar" (Dato Extra)
                    </span>
                  </div>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catalogerChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="Materiales Únicos (Familias)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Tareas Para Archivar (Dato Extra)" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Cataloger Table */}
            {catalogerStats.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                <Archive className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">
                  No hay tareas marcadas como "Para Archivar" por operadores en este periodo
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  A medida que los operadores hagan clic en "Para Archivar" en los materiales, aparecerán automáticamente clasificados aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3 text-center">Rank</th>
                      <th className="p-3">Operador / Documentalista</th>
                      <th className="p-3 text-center bg-blue-950/30 text-blue-300">
                        <div className="flex items-center justify-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          <span>Materiales Únicos (Familias)</span>
                          <span className="px-1.5 py-0.2 rounded text-[8px] bg-blue-500/30 text-blue-200 uppercase font-black">Principal</span>
                        </div>
                      </th>
                      <th className="p-3 text-center text-slate-400">Tareas "Para Archivar" (Dato Extra)</th>
                      <th className="p-3 text-center">División</th>
                      <th className="p-3 text-right">Horas Catalogadas</th>
                      <th className="p-3 text-right">% Familias</th>
                      <th className="p-3 text-right">Última Catalogación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {catalogerStats.map((op, idx) => (
                      <tr key={`cat-${op.name}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-center">
                          {idx === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs shadow-md">
                              1
                            </span>
                          ) : idx === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 text-slate-950 font-extrabold text-xs shadow-md">
                              2
                            </span>
                          ) : idx === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-extrabold text-xs shadow-md">
                              3
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500 font-bold">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs">
                            {op.name.charAt(0)}
                          </div>
                          <span>{op.name}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-extrabold text-blue-300 bg-blue-950/20">
                          <span className="px-2.5 py-1 rounded-md bg-blue-500/20 border border-blue-500/40 text-sm">
                            {op.familiesCount}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-amber-300/90">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-xs">
                            {op.catalogedTasks} tareas
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                            {op.divisions}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-200">
                          {op.formattedHours}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-400 font-bold">
                          {op.percentage}%
                        </td>
                        <td className="p-3 text-right font-mono text-[11px] text-slate-400">
                          {op.lastCatalogedAt ? op.lastCatalogedAt.split(' ').slice(-2).join(' ') : 'Reciente'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OTRAS SECCIONES - REGISTRO Y CREACIÓN */}
        {userSectionTab === 'creators' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/40 shrink-0">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-white">
                      Sección de Registro y Creación de Materiales
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-extrabold uppercase">
                      Otras Secciones
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Personal de Prensa, Programación e Ingesta responsable del ingreso inicial de las señales y fichas de contenido.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-blue-300 shrink-0">
                {creatorStats.reduce((sum, c) => sum + c.createdCount, 0)} señales creadas
              </span>
            </div>

            {creatorStats.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500 italic bg-slate-950/60 rounded-xl border border-slate-800">
                No hay registros de creación en este periodo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Usuario Creador / Ingestador</th>
                      <th className="p-3 text-center">Señales Registradas</th>
                      <th className="p-3 text-center">Familias de Material</th>
                      <th className="p-3 text-center">División</th>
                      <th className="p-3 text-right">Tiempo Ingestado Generado</th>
                      <th className="p-3 text-right">Fecha Último Registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {creatorStats.map((user, idx) => (
                      <tr key={`cre-${user.name}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/40 flex items-center justify-center font-bold text-xs">
                            {user.name.charAt(0)}
                          </div>
                          <span>{user.name}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-blue-300">
                          <span className="px-2.5 py-1 rounded-md bg-blue-500/20 border border-blue-500/40">
                            {user.createdCount}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-200">
                          {user.familiesCount}
                        </td>
                        <td className="p-3 text-center text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                            {user.divisions}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-200">
                          {user.formattedHours}
                        </td>
                        <td className="p-3 text-right font-mono text-[11px] text-slate-400">
                          {user.lastCreatedAt ? user.lastCreatedAt.split(' ').slice(-2).join(' ') : 'Reciente'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OTRAS SECCIONES - CONTROL Y FINALIZACIÓN */}
        {userSectionTab === 'finalizers' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-white">
                      Sección de Control y Finalización
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase">
                      Otras Secciones
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Coordinadores y Jefes de División facultados para auditar y declarar como "Finalizado" los materiales para su traspaso histórico.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-300 shrink-0">
                {finalizerStats.reduce((sum, f) => sum + f.finalizedCount, 0)} señales finalizadas
              </span>
            </div>

            {finalizerStats.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500 italic bg-slate-950/60 rounded-xl border border-slate-800">
                No hay materiales marcados como finalizados en este periodo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Usuario Finalizador / Coordinación</th>
                      <th className="p-3 text-center">Tareas Finalizadas</th>
                      <th className="p-3 text-center">Familias Cerradas</th>
                      <th className="p-3 text-center">División</th>
                      <th className="p-3 text-right">Horas Finalizadas</th>
                      <th className="p-3 text-right">Fecha de Cierre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {finalizerStats.map((fin, idx) => (
                      <tr key={`fin-${fin.name}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-xs">
                            {fin.name.charAt(0)}
                          </div>
                          <span>{fin.name}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-300">
                          <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40">
                            {fin.finalizedCount}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-200">
                          {fin.familiesCount}
                        </td>
                        <td className="p-3 text-center text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                            {fin.divisions}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-200">
                          {fin.formattedHours}
                        </td>
                        <td className="p-3 text-right font-mono text-[11px] text-slate-400">
                          {fin.lastFinalizedAt ? fin.lastFinalizedAt.split(' ').slice(-2).join(' ') : 'Reciente'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FLUJO INTEGRAL */}
        {userSectionTab === 'pipeline' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/40 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    Vista Integral del Ciclo Audiovisual
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Resumen comparativo de todos los colaboradores involucrados en el registro, catalogación ("Para Archivar") y cierre.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Usuario</th>
                    <th className="p-3 text-center">Rol Principal Detectado</th>
                    <th className="p-3 text-center bg-blue-950/30 text-blue-300">Materiales Únicos (Familias)</th>
                    <th className="p-3 text-center">Catalogadas ("Para Archivar")</th>
                    <th className="p-3 text-center">Materiales Creados</th>
                    <th className="p-3 text-center">Finalizadas</th>
                    <th className="p-3 text-right">Tiempo en Archivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pipelineStats.map((row, idx) => (
                    <tr key={`pipe-${row.name}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-semibold text-white">
                        {row.name}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          row.primaryRole.includes('Catalogador')
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : row.primaryRole.includes('Finalizador')
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          {row.primaryRole}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-blue-300">
                        {row.familiesCount > 0 ? row.familiesCount : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-300">
                        {row.catalogedTasks > 0 ? `${row.catalogedTasks} tareas` : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-blue-300">
                        {row.createdCount > 0 ? row.createdCount : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-300">
                        {row.finalizedCount > 0 ? row.finalizedCount : '-'}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-200">
                        {row.catalogedHours !== '0s' ? row.catalogedHours : row.createdHours}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Material Families vs Signals per Division */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#1E293B] via-[#1E293B] to-[#0F172A] border border-slate-700/80 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Materiales Únicos vs Señales por División
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Comparativa entre cantidad de familias (material único) y total de señales en el periodo
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={divisionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Materiales Únicos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Para Archivar" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Finalizados" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Hours Breakdown by Signal Type */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1E293B] via-[#1E293B] to-[#0F172A] border border-slate-700/80 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Horas por Tipo de Señal
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Suma total de horas de señales registradas (estándar y personalizadas)
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={signalTypeHoursData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}h`}
                >
                  {signalTypeHoursData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
