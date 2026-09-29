import React, { useState, useMemo } from 'react';
import { Personnel, UserProfile } from '../types';
import { isBlockedUserName } from '../data/initialData';
import { 
  Archive, 
  X, 
  Search, 
  UserCheck, 
  Check, 
  Sparkles, 
  Building2, 
  FileText,
  User,
  ShieldCheck
} from 'lucide-react';

interface SelectDocumenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedPersonName: string) => void;
  personnel: Personnel[];
  currentUser: UserProfile;
  materialTitle?: string;
  signalId?: string;
  signalType?: string;
  division?: string;
  currentAssignee?: string;
  isFamilyBatch?: boolean;
}

export const SelectDocumenterModal: React.FC<SelectDocumenterModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  personnel,
  currentUser,
  materialTitle,
  signalId,
  signalType,
  division,
  currentAssignee,
  isFamilyBatch = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<string>('Todas');

  // Filter available personnel, strictly excluding blocked test users
  const activePersonnel = useMemo(() => {
    return personnel.filter((p) => !isBlockedUserName(p.name));
  }, [personnel]);

  // Determine initial selection:
  // 1. Current assignee if exists in active personnel
  // 2. Or Current user if in active personnel
  // 3. Or first available person
  const defaultSelectedName = useMemo(() => {
    if (currentAssignee) {
      const match = activePersonnel.find((p) => p.name.toLowerCase() === currentAssignee.toLowerCase());
      if (match) return match.name;
    }
    const selfMatch = activePersonnel.find((p) => p.name.toLowerCase() === currentUser.name.toLowerCase());
    if (selfMatch) return selfMatch.name;
    return activePersonnel[0]?.name || currentUser.name;
  }, [currentAssignee, currentUser.name, activePersonnel]);

  const [selectedPersonName, setSelectedPersonName] = useState<string>(defaultSelectedName);

  // Sync initial selection when modal opens or defaults change
  React.useEffect(() => {
    if (isOpen) {
      setSelectedPersonName(defaultSelectedName);
      setSearchQuery('');
      setDivisionFilter('Todas');
    }
  }, [isOpen, defaultSelectedName]);

  // Filter by search query & division
  const filteredPersonnel = useMemo(() => {
    return activePersonnel.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        p.division.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchesDivision =
        divisionFilter === 'Todas' || p.division.toLowerCase() === divisionFilter.toLowerCase();

      return matchesSearch && matchesDivision;
    });
  }, [activePersonnel, searchQuery, divisionFilter]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedPersonName.trim()) return;
    onConfirm(selectedPersonName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-doc-title"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="select-doc-title" className="text-base font-bold text-white">
                  ¿Quién Documentó el Material?
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase font-mono tracking-wider">
                  Jefatura / Coordinación
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Marcar actividad <strong>"Para Archivar"</strong> y acreditar la tarea al personal correspondiente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target Material Context Pill */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                {isFamilyBatch ? 'Familia Contenedora:' : 'Señal Individual:'}
              </span>
              {division && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                  {division}
                </span>
              )}
            </div>
            <p className="text-sm font-extrabold text-white line-clamp-2">
              {materialTitle || 'Material de Archivo Audiovisual'}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
              {signalType && (
                <span>
                  Señal: <strong className="text-amber-300 font-mono">{signalType}</strong>
                </span>
              )}
              {signalId && (
                <span>
                  ID: <strong className="text-blue-300 font-mono">{signalId}</strong>
                </span>
              )}
              {currentAssignee && (
                <span className="truncate">
                  Asignado: <strong className="text-emerald-300">{currentAssignee}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Explanation Alert */}
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                Como <strong className="text-white">{currentUser.name}</strong> ({currentUser.role}), debes seleccionar al integrante del personal que realizó la documentación.
              </p>
              <p className="text-blue-300 text-[11px]">
                El material quedará registrado con el nombre del personal seleccionado como quien marcó <strong>"Para Archivar"</strong> para las métricas oficiales y el balance de productividad.
              </p>
            </div>
          </div>

          {/* Search & Division Filter Controls */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, cargo o división..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Division Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['Todas', 'Prensa', 'Programación', 'Ingesta', 'Gerencia'].map((div) => (
                <button
                  key={div}
                  type="button"
                  onClick={() => setDivisionFilter(div)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    divisionFilter === div
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>

          {/* Personnel List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {filteredPersonnel.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800">
                No se encontró personal con los filtros indicados.
              </div>
            ) : (
              filteredPersonnel.map((person) => {
                const isSelected = selectedPersonName === person.name;
                const isCurrentUser = person.name.toLowerCase() === currentUser.name.toLowerCase();
                const isCurrentAssignee = currentAssignee && person.name.toLowerCase() === currentAssignee.toLowerCase();

                return (
                  <button
                    key={person.id || person.name}
                    type="button"
                    onClick={() => setSelectedPersonName(person.name)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/80 text-white ring-1 ring-amber-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected 
                          ? 'bg-amber-500 text-slate-950 font-black' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {person.name.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-amber-200' : 'text-white'}`}>
                            {person.name}
                          </span>

                          {isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-900/60 border border-blue-700 text-blue-300 text-[10px] font-bold">
                              Tú
                            </span>
                          )}

                          {isCurrentAssignee && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-900/60 border border-emerald-700 text-emerald-300 text-[10px] font-bold">
                              Asignado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-semibold text-slate-300">{person.role}</span>
                          <span>•</span>
                          <span>{person.division || 'Prensa'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'border-amber-400 bg-amber-500 text-slate-950 font-black' 
                          : 'border-slate-700 bg-slate-900'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!selectedPersonName}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow-md hover:scale-[1.02]"
          >
            <Archive className="w-4 h-4" />
            <span>Confirmar y Guardar como Documentado</span>
          </button>
        </div>
      </div>
    </div>
  );
};
