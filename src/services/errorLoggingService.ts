import { ErrorLogEntry, ErrorLogLevel, ErrorLogCategory } from '../types';

const STORAGE_KEY = 'vtv_error_logs_history_v1';
const MAX_LOGS = 1000;
const EVENT_NAME = 'vtv_error_log_updated';

/**
 * Obtiene la fecha y hora formateada en estándar legible (Hora de Caracas / Local).
 */
export function getFormattedLogTime(date = new Date()): string {
  try {
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}/${month}/${year} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
  } catch {
    return date.toISOString();
  }
}

/**
 * Obtiene el contexto de usuario activo guardado en el navegador si está disponible.
 */
function getActiveUserContext(): ErrorLogEntry['userContext'] | undefined {
  try {
    const stored = localStorage.getItem('vtv_current_user');
    if (stored) {
      const u = JSON.parse(stored);
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        division: u.division,
      };
    }
  } catch {
    // Silently continue
  }
  return undefined;
}

/**
 * Recupera todos los logs de error almacenados localmente.
 */
export function getErrorLogs(): ErrorLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('[errorLoggingService] Error al leer logs de localStorage:', err);
    return [];
  }
}

/**
 * Guarda los logs de error en localStorage con recorte para evitar desbordamiento.
 */
function saveLogsToStorage(logs: ErrorLogEntry[]): void {
  try {
    const trimmed = logs.slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[errorLoggingService] Fallo de cuota en localStorage, recortando historial...', err);
    try {
      // Si la cuota de localStorage falló, guardamos sólo los últimos 150 registros
      const emergencyTrim = logs.slice(0, 150);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emergencyTrim));
    } catch {
      // Ignorar si el almacenamiento local está completamente bloqueado
    }
  }
}

/**
 * Notifica a los oyentes de componentes React que se actualizó el registro de errores.
 */
function notifyListeners(logs: ErrorLogEntry[], newEntry?: ErrorLogEntry): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { logs, newEntry } }));
  }
}

/**
 * Registra una entrada de error en el archivo local de auditoría.
 */
export function logError(params: {
  level?: ErrorLogLevel;
  category: ErrorLogCategory;
  message: string;
  action?: string;
  endpoint?: string;
  details?: any;
  httpStatus?: number | string;
  userContext?: ErrorLogEntry['userContext'];
  stack?: string;
}): ErrorLogEntry {
  const now = new Date();
  const entry: ErrorLogEntry = {
    id: `ERR-${now.getTime()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    timestamp: now.toISOString(),
    formattedTime: getFormattedLogTime(now),
    level: params.level || 'ERROR',
    category: params.category,
    message: params.message || 'Error no especificado',
    action: params.action,
    endpoint: params.endpoint ? params.endpoint.replace(/script\.google\.com\/macros\/s\/([a-zA-Z0-9_-]{10})[a-zA-Z0-9_-]+/, 'script.google.com/macros/s/$1...') : undefined,
    details: params.details,
    httpStatus: params.httpStatus,
    userContext: params.userContext || getActiveUserContext(),
    stack: params.stack,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  try {
    const currentLogs = getErrorLogs();
    // Insertamos el más reciente al principio
    const updated = [entry, ...currentLogs];
    saveLogsToStorage(updated);
    notifyListeners(updated, entry);
  } catch (err) {
    console.error('[errorLoggingService] No se pudo guardar entrada de error:', err);
  }

  // Reflejamos en consola para depuración en desarrollo
  const consolePrefix = `[VTV Audit Log][${entry.level}][${entry.category}]`;
  if (entry.level === 'WARN') {
    console.warn(consolePrefix, entry.message, entry);
  } else if (entry.level === 'INFO') {
    console.info(consolePrefix, entry.message, entry);
  } else {
    console.error(consolePrefix, entry.message, entry);
  }

  return entry;
}

/**
 * Registra un fallo de sincronización con Google Sheets.
 */
export function logSyncError(
  message: string,
  details?: any,
  action: string = 'sync_bidirectional',
  userContext?: ErrorLogEntry['userContext']
): ErrorLogEntry {
  return logError({
    level: 'ERROR',
    category: 'SYNC_ERROR',
    message,
    action,
    details,
    userContext,
    stack: details instanceof Error ? details.stack : undefined,
  });
}

/**
 * Registra un fallo de petición a la API (fetch / safeFetchAppsScript / timeout).
 */
export function logApiError(
  action: string,
  error: any,
  endpoint?: string,
  additionalDetails?: any,
  userContext?: ErrorLogEntry['userContext']
): ErrorLogEntry {
  const isTimeout =
    error?.name === 'TimeoutError' ||
    String(error?.message || '').toLowerCase().includes('timeout') ||
    String(error?.message || '').toLowerCase().includes('tiempo de espera');

  const category: ErrorLogCategory = isTimeout ? 'NETWORK_TIMEOUT' : 'API_REQUEST';
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : (error && error.message) || 'Error desconocido en petición a la API';

  return logError({
    level: 'ERROR',
    category,
    message: errorMessage,
    action,
    endpoint,
    details: {
      errorObject: typeof error === 'object' && error !== null ? { ...error, message: error.message, name: error.name } : error,
      additional: additionalDetails,
    },
    userContext,
    stack: error instanceof Error ? error.stack : undefined,
  });
}

/**
 * Registra un error de análisis de datos (JSON corrupto, datos inesperados).
 */
export function logParseError(
  message: string,
  rawSnippet?: string,
  action?: string
): ErrorLogEntry {
  return logError({
    level: 'ERROR',
    category: 'PARSE_ERROR',
    message,
    action: action || 'parse_response',
    details: rawSnippet ? { preview: rawSnippet.substring(0, 300) } : undefined,
  });
}

/**
 * Genera un error de prueba para verificar el funcionamiento del logger y la descarga.
 */
export function generateDiagnosticTestLog(userContext?: ErrorLogEntry['userContext']): ErrorLogEntry {
  return logError({
    level: 'WARN',
    category: 'SYNC_ERROR',
    action: 'test_diagnostic_probe',
    message: 'Prueba de diagnóstico manual: Verificación del módulo de auditoría y descarga de logs de VTV Archivo.',
    details: {
      probeTimestamp: new Date().toISOString(),
      testType: 'MANUAL_AUDIT_PROBE',
      targetModule: 'Módulo de Registro de Errores y Auditoría Técnica',
      devicePlatform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
      onlineStatus: typeof navigator !== 'undefined' ? navigator.onLine : true,
    },
    userContext,
  });
}

/**
 * Borra todo el historial de logs de error almacenado en local.
 */
export function clearErrorLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners([]);
  } catch (err) {
    console.error('[errorLoggingService] Error al limpiar logs:', err);
  }
}

/**
 * Suscribe un componente a las actualizaciones en tiempo real del registro de errores.
 */
export function subscribeToLogs(callback: (logs: ErrorLogEntry[]) => void): () => void {
  const handler = (e: any) => {
    const logs = e?.detail?.logs || getErrorLogs();
    callback(logs);
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getErrorLogs());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', storageHandler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', storageHandler);
    }
  };
}

/**
 * Genera el contenido formateado del reporte de auditoría técnica en texto plano (.log).
 */
export function generateTechnicalAuditReportText(logs: ErrorLogEntry[]): string {
  const now = new Date();
  const formattedGenDate = getFormattedLogTime(now);

  const errorCount = logs.filter((l) => l.level === 'ERROR').length;
  const warnCount = logs.filter((l) => l.level === 'WARN').length;
  const infoCount = logs.filter((l) => l.level === 'INFO').length;

  const syncErrors = logs.filter((l) => l.category === 'SYNC_ERROR').length;
  const apiErrors = logs.filter((l) => l.category === 'API_REQUEST' || l.category === 'NETWORK_TIMEOUT').length;
  const parseErrors = logs.filter((l) => l.category === 'PARSE_ERROR').length;
  const otherErrors = logs.length - (syncErrors + apiErrors + parseErrors);

  let text = '';
  text += '================================================================================\n';
  text += ' VENEZOLANA DE TELEVISIÓN (VTV) - SISTEMA DE GESTIÓN DE ARCHIVO AUDIOVISUAL\n';
  text += ' INFORME DE AUDITORÍA TÉCNICA Y HISTORIAL DE REGISTRO DE ERRORES (ERROR LOG)\n';
  text += '================================================================================\n';
  text += `Fecha y Hora de Emisión:  ${formattedGenDate}\n`;
  text += `Ambiente / Plataforma:    ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconocido'}\n`;
  text += `Conexión a Red:           ${typeof navigator !== 'undefined' && navigator.onLine ? 'En línea (ONLINE)' : 'Desconectado (OFFLINE)'}\n`;
  text += `Total de Entradas:        ${logs.length}\n`;
  text += `Desglose por Severidad:   [CRÍTICOS/ERROR: ${errorCount}] [ADVERTENCIAS/WARN: ${warnCount}] [INFO: ${infoCount}]\n`;
  text += `Desglose por Categoría:   [Sincronización: ${syncErrors}] [Peticiones API: ${apiErrors}] [Parseo/Datos: ${parseErrors}] [Otros: ${otherErrors}]\n`;
  text += '================================================================================\n\n';

  if (logs.length === 0) {
    text += '--- No existen registros de errores. El sistema se encuentra operando sin incidencias detectadas. ---\n';
    return text;
  }

  text += '--------------------------------------------------------------------------------\n';
  text += ' DETALLE CRONOLÓGICO DE EVENTOS (DEL MÁS RECIENTE AL MÁS ANTIGUO)\n';
  text += '--------------------------------------------------------------------------------\n\n';

  logs.forEach((log, index) => {
    const itemNum = String(index + 1).padStart(3, '0');
    text += `[#${itemNum}] [${log.formattedTime}] [${log.level}] [${log.category}]\n`;
    text += `ID Evento:    ${log.id}\n`;
    if (log.action) {
      text += `Acción:       ${log.action}\n`;
    }
    if (log.endpoint) {
      text += `Endpoint:     ${log.endpoint}\n`;
    }
    if (log.httpStatus) {
      text += `Código HTTP:  ${log.httpStatus}\n`;
    }
    if (log.userContext) {
      const u = log.userContext;
      text += `Usuario:      ${u.name || 'Anónimo'} | Rol: ${u.role || 'Sin rol'} | División: ${u.division || 'N/A'}\n`;
    }
    text += `Mensaje:      ${log.message}\n`;

    if (log.details) {
      try {
        const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details);
        text += 'Detalles Técnicos:\n';
        const indented = detailsStr
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n');
        text += `${indented}\n`;
      } catch {
        text += `Detalles Técnicos: [No serializable]\n`;
      }
    }

    if (log.stack) {
      text += 'Trace de Ejecución (Stack):\n';
      const stackLines = log.stack
        .split('\n')
        .slice(0, 8)
        .map((l) => `    ${l.trim()}`)
        .join('\n');
      text += `${stackLines}\n`;
    }

    text += '--------------------------------------------------------------------------------\n';
  });

  text += '\n================================================================================\n';
  text += ' FIN DEL INFORME DE AUDITORÍA TÉCNICA - VTV ARCHIVO\n';
  text += '================================================================================\n';

  return text;
}

/**
 * Descarga el historial de logs en un archivo local (.log o .json).
 */
export function downloadLogsFile(format: 'log' | 'json' = 'log'): boolean {
  try {
    const logs = getErrorLogs();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      const payload = {
        meta: {
          system: 'VTV Archivo - Sistema de Gestión Audiovisual',
          exportTimestamp: now.toISOString(),
          formattedDate: getFormattedLogTime(now),
          totalEntries: logs.length,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        },
        logs,
      };
      content = JSON.stringify(payload, null, 2);
      mimeType = 'application/json;charset=utf-8';
      extension = 'json';
    } else {
      content = generateTechnicalAuditReportText(logs);
      mimeType = 'text/plain;charset=utf-8';
      extension = 'log';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vtv-auditoria-errores-${dateStr}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('[errorLoggingService] Error al descargar archivo de logs:', err);
    return false;
  }
}

/**
 * Inicializa oyentes globales para registrar errores no capturados y promesas rechazadas.
 */
let isGlobalLoggingInitialized = false;
export function initGlobalErrorLogging(): void {
  if (isGlobalLoggingInitialized || typeof window === 'undefined') return;
  isGlobalLoggingInitialized = true;

  window.addEventListener('error', (event) => {
    // Evitar registrar errores menores de extensiones del navegador
    if (event.filename && (event.filename.includes('chrome-extension://') || event.filename.includes('moz-extension://'))) {
      return;
    }
    logError({
      level: 'ERROR',
      category: 'SYSTEM_RUNTIME',
      message: event.message || 'Error no controlado de ejecución en cliente',
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'Promesa rechazada no controlada';
    logError({
      level: 'ERROR',
      category: 'SYSTEM_RUNTIME',
      message: `UnhandledRejection: ${message}`,
      details: typeof reason === 'object' ? reason : { rawReason: String(reason) },
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
