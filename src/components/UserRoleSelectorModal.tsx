import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, RoleType, DivisionType, normalizeDivision } from '../types';
import { DEFAULT_USERS, GUEST_USER, isBlockedUserName } from '../data/initialData';
import { isGuestUser } from '../utils/permissions';
import { getLocalLastUsedUser } from '../services/apiService';
import { 
  ShieldCheck, 
  User, 
  X, 
  Check, 
  Lock, 
  KeyRound, 
  Eye, 
  LogOut, 
  Clock, 
  Ban, 
  Search, 
  History, 
  UserCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface UserRoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  userPins?: Record<string, string>;
  users?: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onOpenPinConfig?: () => void;
  onLogout?: () => void;
  sessionExpiredNotice?: boolean;
  lastUsedUser?: UserProfile | null;
}

export const UserRoleSelectorModal: React.FC<UserRoleSelectorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userPins = {},
  users,
  onSelectUser,
  onOpenPinConfig,
  onLogout,
  sessionExpiredNotice = false,
  lastUsedUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<'Todas' | DivisionType>('Todas');

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setDivisionFilter('Todas');
    }
  }, [isOpen]);

  const rawList = (users && users.length > 0) ? users : DEFAULT_USERS;
  // Filtrar estrictamente a usuarios bloqueados de la lista de selección activa
  const activeUserList = useMemo(() => {
    return rawList.filter((u) => !isBlockedUserName(u.name));
  }, [rawList]);

  // Determinar el último perfil usado efectivo
  const effectiveLastUsedUser = useMemo(() => {
    if (lastUsedUser && !lastUsedUser.isGuest && !isBlockedUserName(lastUsedUser.name)) {
      return lastUsedUser;
    }
    const saved = getLocalLastUsedUser();
    if (saved && !saved.isGuest && !isBlockedUserName(saved.name)) {
      return saved;
    }
    return null;
  }, [lastUsedUser, isOpen]);

  // Filtrado de usuarios según búsqueda y división
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return activeUserList.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.division && u.division.toLowerCase().includes(q));

      const matchesDivision =
        divisionFilter === 'Todas' ||
        (u.division && normalizeDivision(u.division).toLowerCase() === normalizeDivision(divisionFilter).toLowerCase());

      return matchesSearch && matchesDivision;
    });
  }, [activeUserList, searchQuery, divisionFilter]);

  // Conditionally render only after all hooks have executed
  if (!isOpen) return null;

  const isCurrentGuest = isGuestUser(currentUser);

  const getRoleDescription = (role: RoleType) => {
    switch (role) {
      case 'Gerente de Archivo':
      case 'Adjunta de Gerencia':
        return 'Acceso Total: Lectura, Escritura, Catalogación, Finalización, Reportes y Control Administrativo.';
      case 'Asistente Administrativa':
        return 'Acceso Exclusivo: Gestión de Vacaciones, Días Libres y Guardias del Personal + Vista de Consulta de Archivo.';
      case 'Jefe de División':
        return 'Control de División: Creación de tarjetas (Ingesta y Solicitudes), Catalogación ("Para Archivar"), "Finalizado", vinculación de señales y gestión de Archivo de Prensa, Archivo de Programación o Ingesta.';
      case 'Coordinador':
        return 'Control Operativo: Creación de tarjetas (Ingesta y Solicitudes), Asignación de equipo, Catalogación ("Para Archivar"), "Finalizado" y vinculación de señales.';
      case 'Documentalista':
        return 'Documentación y Archivo: Catalogación de señales ("Para Archivar"), carga de fichas técnicas y organización del acervo.';
      case 'Ingestador':
      case 'Operador de Ingesta':
        return 'Ingesta de Señales: Registro de señales recibidas, cómputo de duración y marcado "Para Archivar".';
      default:
        return 'Consulta general del sistema sin privilegios de modificación.';
    }
  };

  const hasPinForUser = (user: UserProfile) => {
    return Boolean(userPins[user.id] || userPins[user.name] || (user as any).pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="user-modal-title" className="text-base sm:text-lg font-bold text-white">
                Seleccionar Perfil / Control de Sesión
              </h2>
              <p className="text-xs text-slate-400">
                Estructura Organizacional VTV • Control de Acceso y Permisos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Alerta de Sesión Expirada cada 1 hora */}
          {sessionExpiredNotice && (
            <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/60 flex items-start gap-3 text-amber-200 text-xs shadow-lg animate-pulse">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-amber-300">Sesión Expirada (Límite de 1 Hora)</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                    Seguridad VTV
                  </span>
                </div>
                <p className="text-amber-200/90 leading-relaxed text-xs">
                  Por medidas de control y auditoría de archivo, el sistema requiere renovar el ingreso de usuario cada 1 hora. Por favor, selecciona tu perfil para continuar trabajando.
                </p>
              </div>
            </div>
          )}

          {/* Tarjeta Informativa de Usuario de Prueba Inhabilitado */}
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/40 shrink-0">
                <Ban className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">Lcdo. Carlos Mendoza</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-950 text-rose-300 border border-rose-800">
                    Acceso Bloqueado
                  </span>
                </div>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Cuenta de prueba inhabilitada permanentemente. Por favor, utiliza tu propio usuario oficial.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-950/80 px-2 py-1 rounded border border-rose-900/80 shrink-0 self-end sm:self-auto font-bold">
              Inhabilitado
            </span>
          </div>

          {/* ÚLTIMO PERFIL USADO (Acceso Rápido para cuando se pida iniciar sesión) */}
          {effectiveLastUsedUser && !isBlockedUserName(effectiveLastUsedUser.name) && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/70 border border-blue-500/50 shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase text-[10px] tracking-wider text-blue-400 flex items-center gap-1.5 font-mono">
                  <History className="w-3.5 h-3.5 text-blue-400" />
                  Último Perfil Utilizado
                </span>
                <span className="text-[10px] text-blue-300 font-extrabold bg-blue-900/60 px-2 py-0.5 rounded-full border border-blue-700/60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" /> Acceso Rápido
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/50 flex items-center justify-center font-black text-blue-200 text-sm shrink-0 shadow-inner">
                    {effectiveLastUsedUser.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{effectiveLastUsedUser.name}</span>
                      {hasPinForUser(effectiveLastUsedUser) && (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold" title="Requiere verificación de PIN de seguridad">
                          <Lock className="w-3 h-3 text-amber-400" /> Requiere PIN
                        </span>
                      )}
                      {!isCurrentGuest && (currentUser.id === effectiveLastUsedUser.id || currentUser.name === effectiveLastUsedUser.name) && (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                          <Check className="w-3 h-3 text-emerald-400" /> Sesión Activa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                      <span className="font-semibold text-blue-300">{effectiveLastUsedUser.role}</span>
                      {effectiveLastUsedUser.division && (
                        <>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{effectiveLastUsedUser.division}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectUser(effectiveLastUsedUser);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-md hover:scale-[1.03] shrink-0 self-end sm:self-auto"
                  title={hasPinForUser(effectiveLastUsedUser) ? 'Iniciar sesión con este perfil (se solicitará el PIN)' : 'Iniciar sesión con este perfil'}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Iniciar con este Perfil</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                </button>
              </div>
            </div>
          )}

          {/* Read-Only Guest Mode / Log Out Option Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-850 to-slate-900 border border-amber-500/30 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${isCurrentGuest ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-400/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Modo Consulta (Solo Lectura)</span>
                    {isCurrentGuest && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[10px] font-extrabold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Sesión Cerrada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Permite visualizar todos los materiales, guardias y estadísticas sin poder modificar datos.
                  </p>
                </div>
              </div>

              {!isCurrentGuest && onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/60 hover:border-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              )}
            </div>
          </div>

          {/* BUSCADOR Y FILTROS DE USUARIOS */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-400" />
                <span>Buscar Usuario:</span>
              </span>

              {!isCurrentGuest && onOpenPinConfig && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPinConfig();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Configurar mi PIN ({currentUser.name})</span>
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, cargo (Documentalista, Coordinador...) o división..."
                className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 p-0.5 rounded text-xs"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Division Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {(['Todas', 'Archivo de Prensa', 'Archivo de Programación', 'Ingesta', 'Gerencia'] as const).map((div) => (
                <button
                  key={div}
                  type="button"
                  onClick={() => setDivisionFilter(div)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    divisionFilter === div
                      ? 'bg-blue-600 text-white font-bold shadow'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>

          {/* Encabezado de Lista de Usuarios */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>
              Perfiles Disponibles: <strong className="text-white">{filteredUsers.length}</strong> de {activeUserList.length}
            </span>
            {searchQuery && (
              <span className="text-[11px] text-blue-300">
                Filtrando por: "{searchQuery}"
              </span>
            )}
          </div>

          {/* Grid de Usuarios Filtrados */}
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800 space-y-2">
              <User className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300 text-sm">No se encontraron usuarios</p>
              <p className="text-slate-400">
                No hay perfiles que coincidan con los criterios de búsqueda actuales.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDivisionFilter('Todas');
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUsers.map((user, idx) => {
                const isSelected = !isCurrentGuest && (currentUser.id === user.id || currentUser.name === user.name);
                const hasPin = hasPinForUser(user);

                return (
                  <button
                    key={user.id ? `usr-${user.id}` : `usr-idx-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                        : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 hover:shadow'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-sm text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {user.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {hasPin && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold" title="Perfil Protegido con PIN">
                            <Lock className="w-3 h-3 text-amber-400" /> PIN
                          </span>
                        )}
                        {isSelected && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                            <Check className="w-3 h-3" /> Activo
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          user.role === 'Gerente de Archivo' || user.role === 'Adjunta de Gerencia'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : user.role === 'Asistente Administrativa'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : user.role === 'Jefe de División'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {user.role}
                      </span>
                      {user.division && (
                        <span className="text-[11px] font-medium text-slate-300">
                          • {user.division}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {getRoleDescription(user.role)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Si el perfil tiene PIN de seguridad, se te solicitará al hacer clic.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
