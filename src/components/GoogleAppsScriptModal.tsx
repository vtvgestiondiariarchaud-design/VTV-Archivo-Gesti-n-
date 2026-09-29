import React, { useState, useEffect } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../data/appsScriptCode';
import { 
  Database, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  FileCode, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Layers,
  Wrench,
  Download,
  FileText,
  Trash2,
  Bug,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  AlertTriangle,
  Terminal,
  Activity,
  User,
  Clock,
  CheckCircle
} from 'lucide-react';
import { 
  getErrorLogs, 
  downloadLogsFile, 
  clearErrorLogs, 
  generateDiagnosticTestLog, 
  subscribeToLogs 
} from '../services/errorLoggingService';
import { ErrorLogEntry } from '../types';

interface GoogleAppsScriptModalProps {
  appsScriptUrl: string;
  onSaveUrl: (url: string) => void;
  onOpenBackupModal?: () => void;
  lastSyncTime?: string;
  isSyncing?: boolean;
  onTriggerSync?: () => void;
  onCleanDuplicates?: () => Promise<void>;
  onReorganizeSheets?: () => Promise<void>;
  syncError?: string;
}

export const GoogleAppsScriptModal: React.FC<GoogleAppsScriptModalProps> = ({
  appsScriptUrl,
  onSaveUrl,
  onOpenBackupModal,
  lastSyncTime,
  isSyncing,
  onTriggerSync,
  onCleanDuplicates,
  onReorganizeSheets,
  syncError,
}) => {
  const [urlInput, setUrlInput] = useState(appsScriptUrl);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isReorganizing, setIsReorganizing] = useState(false);

  // Error Logging & Technical Audit State
  const [logs, setLogs] = useState<ErrorLogEntry[]>(() => getErrorLogs());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [logFilterCategory, setLogFilterCategory] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  useEffect(() => {
    setUrlInput(appsScriptUrl);
  }, [appsScriptUrl]);

  // Subscribe to real-time error logger updates
  useEffect(() => {
    const unsubscribe = subscribeToLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveUrl(urlInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleClean = async () => {
    if (!onCleanDuplicates) return;
    setIsCleaning(true);
    try {
      await onCleanDuplicates();
    } finally {
      setIsCleaning(false);
    }
  };

  const handleReorganize = async () => {
    if (!onReorganizeSheets) return;
    setIsReorganizing(true);
    try {
      await onReorganizeSheets();
    } finally {
      setIsReorganizing(false);
    }
  };

  // Error Logging Handlers
  const handleDownload = (format: 'log' | 'json') => {
    setIsDownloading(true);
    const ok = downloadLogsFile(format);
    setIsDownloading(false);
    if (ok) {
      setDownloadNotice(`✓ Historial de auditoría técnica (.${format}) descargado exitosamente`);
      setTimeout(() => setDownloadNotice(null), 4000);
    } else {
      setDownloadNotice('Error al preparar el archivo para descarga');
      setTimeout(() => setDownloadNotice(null), 4000);
    }
  };

  const handleGenerateProbe = () => {
    const probe = generateDiagnosticTestLog();
    setDownloadNotice('✓ Evento de diagnóstico registrado localmente');
    setShowLogViewer(true);
    setExpandedLogId(probe.id);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  const handleClear = () => {
    if (window.confirm('¿Está seguro de vaciar el historial de errores locales? Esta acción reiniciará el registro de auditoría.')) {
      clearErrorLogs();
      setDownloadNotice('✓ Historial de logs vaciado correctamente');
      setTimeout(() => setDownloadNotice(null), 3000);
    }
  };

  const handleCopyLogEntry = (log: ErrorLogEntry) => {
    const text = `[${log.formattedTime}] [${log.level}] [${log.category}]
Acción: ${log.action || 'N/A'}
Mensaje: ${log.message}
Detalles: ${JSON.stringify(log.details || {}, null, 2)}
Stack: ${log.stack || 'N/A'}`;
    navigator.clipboard.writeText(text);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 2500);
  };

  // Metrics
  const syncErrorsCount = logs.filter((l) => l.category === 'SYNC_ERROR').length;
  const apiErrorsCount = logs.filter((l) => l.category === 'API_REQUEST' || l.category === 'NETWORK_TIMEOUT').length;
  const lastError = logs.length > 0 ? logs[0] : null;

  // Filtered Logs
  const filteredLogs = logs.filter((log) => {
    if (logFilterCategory !== 'ALL' && log.category !== logFilterCategory) {
      return false;
    }
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      const matchMessage = log.message.toLowerCase().includes(q);
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchUser = log.userContext?.name?.toLowerCase().includes(q);
      const matchDetails = JSON.stringify(log.details || '').toLowerCase().includes(q);
      return matchMessage || matchAction || matchUser || matchDetails;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Configuration Header Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Base de Datos Central en Google Sheets & Respaldos en Google Drive
            </h2>
            <p className="text-xs text-slate-400">
              Conecte todos los dispositivos para compartir en tiempo real la misma información de materiales, guardias y personal
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              URL de la Aplicación Web de Google Apps Script (Web App URL)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar URL</span>
              </button>
            </div>
            {savedSuccess && (
              <p className="text-xs text-emerald-400 font-medium mt-1">
                ✓ URL de Google Apps Script guardada correctamente.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Estado:</span>
              {appsScriptUrl ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectado a Google Sheets {lastSyncTime && `(Sincronizado: ${lastSyncTime})`}
                </span>
              ) : (
                <span className="text-amber-400 font-bold">Modo Local (Sin URL configurada)</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onReorganizeSheets && appsScriptUrl && (
                <button
                  type="button"
                  onClick={handleReorganize}
                  disabled={isReorganizing || isSyncing || isCleaning}
                  className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 disabled:opacity-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                  title="Reestructura y alinea todas las columnas en Google Sheets exactamente en el orden oficial de 23 columnas (A a W)"
                >
                  <Wrench className={`w-3.5 h-3.5 ${isReorganizing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                  <span>{isReorganizing ? 'Reestructurando...' : '⚡ Reestructurar y Alinear Hojas'}</span>
                </button>
              )}

              {onCleanDuplicates && appsScriptUrl && (
                <button
                  type="button"
                  onClick={handleClean}
                  disabled={isCleaning || isSyncing || isReorganizing}
                  className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 disabled:opacity-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                  title="Elimina filas duplicadas en Google Sheets y asegura el formato de duración"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCleaning ? 'animate-spin' : ''}`} />
                  <span>{isCleaning ? 'Depurando...' : 'Depurar Duplicados'}</span>
                </button>
              )}

              {onTriggerSync && appsScriptUrl && (
                <button
                  type="button"
                  onClick={onTriggerSync}
                  disabled={isSyncing || isCleaning || isReorganizing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
                </button>
              )}

              {onOpenBackupModal && (
                <button
                  type="button"
                  onClick={onOpenBackupModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-800/60 shadow-md transition-all flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Centro de Respaldos</span>
                </button>
              )}
            </div>
          </div>
          {syncError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 mt-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{syncError}</span>
            </div>
          )}
        </form>
      </div>

      {/* NEW: Error Logging & Technical Audit Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  Módulo de Registro de Errores y Auditoría Técnica
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-md">
                  Error Logging
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Almacenamiento Local Activo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Captura fallos de sincronización con Google Sheets, peticiones a la API y excepciones para facilitar la auditoría técnica.
              </p>
            </div>
          </div>

          {/* Action Download Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownload('log')}
              disabled={isDownloading}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 border border-emerald-500/30 transition-all flex items-center gap-2 group active:scale-95"
              title="Descargar archivo estructurado de logs (.log) para auditoría técnica"
            >
              <Download className="w-4 h-4 text-emerald-200 group-hover:-translate-y-0.5 transition-transform" />
              <span>Descargar Historial de Logs (.log)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownload('json')}
              disabled={isDownloading}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all flex items-center gap-2"
              title="Descargar historial completo en formato JSON para análisis automatizado"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>
        </div>

        {/* Feedback message banner */}
        {downloadNotice && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{downloadNotice}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span>Total Registros</span>
            </div>
            <div className="text-xl font-extrabold text-white mt-1">
              {logs.length}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Sincronización</span>
            </div>
            <div className={`text-xl font-extrabold mt-1 ${syncErrorsCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {syncErrorsCount}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-rose-400" />
              <span>Peticiones API</span>
            </div>
            <div className={`text-xl font-extrabold mt-1 ${apiErrorsCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {apiErrorsCount}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Último Evento</span>
            </div>
            <div className="text-xs font-semibold text-slate-300 mt-1 truncate" title={lastError ? lastError.formattedTime : 'Sin registros'}>
              {lastError ? lastError.formattedTime.split(' ').slice(-2).join(' ') : 'Sin fallos'}
            </div>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLogViewer(!showLogViewer)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              {showLogViewer ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showLogViewer ? 'Ocultar Historial en Pantalla' : `Ver Historial en Pantalla (${logs.length})`}</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateProbe}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all"
              title="Registra un evento de prueba para verificar que el logger y la descarga funcionan perfectamente"
            >
              <Bug className="w-3.5 h-3.5 text-indigo-400" />
              <span>Simular Prueba de Registro</span>
            </button>
          </div>

          {logs.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ml-auto"
              title="Borra todos los logs de error acumulados en este navegador"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Limpiar Historial</span>
            </button>
          )}
        </div>

        {/* Collapsible Interactive Log Viewer */}
        {showLogViewer && (
          <div className="pt-2 space-y-3 animate-fade-in border-t border-slate-800">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {(['ALL', 'SYNC_ERROR', 'API_REQUEST', 'NETWORK_TIMEOUT', 'PARSE_ERROR', 'SYSTEM_RUNTIME'] as const).map((cat) => {
                  const labelMap: Record<string, string> = {
                    ALL: 'Todos',
                    SYNC_ERROR: 'Sincronización',
                    API_REQUEST: 'API',
                    NETWORK_TIMEOUT: 'Timeout',
                    PARSE_ERROR: 'Parseo',
                    SYSTEM_RUNTIME: 'Sistema',
                  };
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setLogFilterCategory(cat)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all whitespace-nowrap ${
                        logFilterCategory === cat
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {labelMap[cat]}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Buscar en mensajes o acciones..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Logs List Container */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-950 border border-slate-800/80 text-slate-400 text-xs">
                  {logs.length === 0
                    ? 'No se han registrado fallos ni peticiones erróneas. El sistema está operando con normalidad.'
                    : 'No hay registros que coincidan con el filtro seleccionado.'}
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isError = log.level === 'ERROR';
                  const isWarn = log.level === 'WARN';

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {/* Level badge */}
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                              isError
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : isWarn
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}
                          >
                            {log.level}
                          </span>

                          {/* Category badge */}
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {log.category}
                          </span>

                          {log.action && (
                            <span className="text-[11px] font-mono text-cyan-400 font-bold">
                              [{log.action}]
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400">
                            {log.formattedTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyLogEntry(log)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Copiar detalles del evento"
                          >
                            {copiedLogId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title={isExpanded ? 'Colapsar detalles' : 'Expandir detalles'}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Message */}
                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        {log.message}
                      </p>

                      {/* User Context if present */}
                      {log.userContext && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>
                            Usuario: <strong className="text-slate-300">{log.userContext.name}</strong> ({log.userContext.role} - {log.userContext.division || 'Sin división'})
                          </span>
                        </div>
                      )}

                      {/* Expanded Technical Details */}
                      {isExpanded && (
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-2">
                          <div className="flex justify-between items-center text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                            <span>ID: {log.id}</span>
                            {log.endpoint && <span className="truncate max-w-xs">Endpoint: {log.endpoint}</span>}
                          </div>

                          {log.details && (
                            <div>
                              <span className="text-slate-400 font-bold block mb-1">Detalles Técnicos:</span>
                              <pre className="p-2 rounded bg-slate-950 text-emerald-400/90 overflow-x-auto text-[10px] max-h-40 leading-relaxed border border-slate-800/80">
                                {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                              </pre>
                            </div>
                          )}

                          {log.stack && (
                            <div>
                              <span className="text-slate-400 font-bold block mb-1">Stack Trace:</span>
                              <pre className="p-2 rounded bg-slate-950 text-rose-300/90 overflow-x-auto text-[10px] max-h-36 leading-relaxed border border-slate-800/80">
                                {log.stack}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Code.gs Script & Instructions Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Código del Backend Google Apps Script (`Code.gs`)
            </h3>
          </div>

          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Copiado!' : 'Copiar Código Google Apps Script'}</span>
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
          <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            Pasos para conectar y ver la misma información en todos los dispositivos:
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
            <li>Abra su hoja de cálculo en <strong>Google Sheets</strong> (o cree una nueva en Google Drive).</li>
            <li>En el menú superior de Google Sheets, seleccione <strong>Extensiones → Apps Script</strong>.</li>
            <li>Pegue el código de abajo reemplazando todo lo que haya en <code className="text-amber-300 font-mono">Código.gs</code>.</li>
            <li>Haga clic en el ícono de disco <strong>Guardar</strong> (o presione Ctrl+S).</li>
            <li>Haga clic en el botón azul <strong>Desplegar → Nuevo despliegue</strong> (si ya existía, seleccione <em>Administrar despliegues → Editar → Nueva versión</em>).</li>
            <li>Seleccione tipo: <strong>Aplicación Web</strong>.</li>
            <li>Configure: <em>Ejecutar como:</em> <strong>Yo</strong> | <em>Quién tiene acceso:</em> <strong>Cualquier persona (Anyone)</strong> (imprescindible para que todos los dispositivos puedan sincronizar).</li>
            <li>Haga clic en <strong>Desplegar</strong>, autorice los permisos de Google y copie la Web App URL que termina en <code className="text-emerald-300 font-mono">/exec</code>.</li>
            <li>Pegue la misma URL en la aplicación en todos los dispositivos y presione <strong>Guardar URL</strong>.</li>
          </ol>

          <div className="mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Sincronización Automática Bidireccional & Menú Integrado en Sheets
            </p>
            <p className="text-[11px] text-emerald-300/80 mt-1">
              Al guardar la URL, cada dispositivo leerá y escribirá en la misma hoja de cálculo maestra (hojas <em>MATERIALES</em>, <em>PERSONAL</em>, <em>GUARDIAS</em> y <em>CIERRES_MENSUALES</em>). Además, al abrir la hoja en Google Sheets verá el menú <strong>🎬 VTV Archivo → ⚡ Reestructurar y Alinear Todas las Hojas</strong> para alinear y reparar columnas automáticamente en cualquier momento.
            </p>
          </div>

          <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h5 className="font-bold text-sky-400 text-xs flex items-center gap-1.5">
              <span>📋 Estructura Oficial de Columnas (Hoja MATERIALES - 23 Columnas A a W):</span>
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 text-[11px] font-mono text-slate-300 pt-1">
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">A (1):</span> ID Material</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">B (2):</span> ID Familia</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">C (3):</span> Tipo de Señal</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">D (4):</span> Título / Descripción</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">E (5):</span> División</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">F (6):</span> Duración</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">G (7):</span> Fecha Creación</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">H (8):</span> Creado Por</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">I (9):</span> Rol Creador</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">J (10):</span> Estado</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">K (11):</span> Es Solicitud / Tarea</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">L (12):</span> Asignado A</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">M (13):</span> Rol Asignado</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">N (14):</span> Fecha Asignación</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">O (15):</span> Ingestado</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">P (16):</span> Ingestado Por</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">Q (17):</span> Catalogado</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">R (18):</span> Catalogado Por</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">S (19):</span> Fecha Catalogación</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">T (20):</span> Finalizado</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">U (21):</span> Finalizado Por</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80"><span className="text-emerald-400 font-bold">V (22):</span> Fecha Finalizado</div>
              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800/80 col-span-2 sm:col-span-1"><span className="text-emerald-400 font-bold">W (23):</span> Notas / Observaciones</div>
            </div>
          </div>
        </div>

        {/* Code View */}
        <div className="relative">
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-96 leading-relaxed">
            {GOOGLE_APPS_SCRIPT_CODE}
          </pre>
        </div>
      </div>
    </div>
  );
};
