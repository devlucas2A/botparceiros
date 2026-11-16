"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Search, Loader2 } from "lucide-react";
import { clsx } from "clsx";

export interface ComboboxOption {
    id: string;
    label: string;
    /** Render personalizado dentro do dropdown (cor de cargo, etc.) */
    render?: ReactNode;
    /** Texto a usar pra filtrar (default: label). */
    searchText?: string;
    /** Render do chip quando selecionado (default: label). */
    chip?: ReactNode;
}

interface BaseProps {
    options: ComboboxOption[];
    loading?: boolean;
    placeholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    /** Mensagem mostrada acima do dropdown quando ha erro/falta de bot. */
    headerMessage?: ReactNode;
}

interface SingleProps extends BaseProps {
    multi?: false;
    value: string;
    onChange: (value: string) => void;
    clearable?: boolean;
}

interface MultiProps extends BaseProps {
    multi: true;
    value: string[];
    onChange: (value: string[]) => void;
}

export function Combobox(props: SingleProps | MultiProps) {
    const {
        options,
        loading,
        placeholder = "Selecione...",
        emptyMessage = "Nada encontrado",
        disabled,
        headerMessage,
    } = props;

    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; openUp: boolean }>({
        top: 0, left: 0, width: 0, openUp: false,
    });
    const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

    // Click fora: ignora cliques dentro do trigger OU do dropdown (portal)
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (containerRef.current?.contains(target)) return;
            if (dropdownRef.current?.contains(target)) return;
            setOpen(false);
            setFilter("");
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    // Recalcula posicao do dropdown ao abrir e em scroll/resize
    useLayoutEffect(() => {
        if (!open) return;
        const updatePos = () => {
            const trigger = triggerRef.current;
            if (!trigger) return;
            const rect = trigger.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = 320; // aprox.: 64 (search) + 64*4 itens visiveis
            const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
            setDropdownPos({
                top: openUp ? rect.top - 4 : rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                openUp,
            });
        };
        updatePos();
        window.addEventListener("scroll", updatePos, true);
        window.addEventListener("resize", updatePos);
        return () => {
            window.removeEventListener("scroll", updatePos, true);
            window.removeEventListener("resize", updatePos);
        };
    }, [open]);

    const selectedIds: string[] = props.multi
        ? props.value
        : props.value ? [props.value] : [];

    const optionMap = new Map(options.map(o => [o.id, o]));
    const selectedOptions = selectedIds
        .map(id => optionMap.get(id))
        .filter((o): o is ComboboxOption => !!o);

    const visibleOptions = options.filter(opt => {
        if (props.multi && selectedIds.includes(opt.id)) return false; // ja selecionado
        if (!filter.trim()) return true;
        const text = (opt.searchText || opt.label).toLowerCase();
        return text.includes(filter.toLowerCase());
    });

    const handleSelect = (id: string) => {
        if (props.multi) {
            props.onChange([...props.value, id]);
            setFilter("");
        } else {
            props.onChange(id);
            setOpen(false);
            setFilter("");
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (props.multi) props.onChange([]);
        else props.onChange("");
    };

    const handleRemoveChip = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (props.multi) {
            props.onChange(props.value.filter(v => v !== id));
        }
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Trigger */}
            <div
                ref={triggerRef}
                onClick={() => !disabled && setOpen(o => !o)}
                className={clsx(
                    "min-h-10 px-3 py-2 rounded-xl border bg-black/40 text-white text-sm cursor-pointer",
                    "border-white/10 hover:border-violet-500/30 focus-within:border-violet-500/50 transition-colors",
                    "flex items-center gap-2 flex-wrap",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}

                {!loading && selectedOptions.length === 0 && (
                    <span className="text-zinc-500 flex-1">{placeholder}</span>
                )}

                {!loading && props.multi && selectedOptions.map(opt => (
                    <span
                        key={opt.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-xs"
                    >
                        {opt.chip || opt.label}
                        <button
                            type="button"
                            onClick={e => handleRemoveChip(opt.id, e)}
                            className="hover:text-red-400 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}

                {!loading && !props.multi && selectedOptions[0] && (
                    <span className="flex-1 truncate">{selectedOptions[0].chip || selectedOptions[0].label}</span>
                )}

                <div className="ml-auto flex items-center gap-1">
                    {!loading && (props.multi ? props.value.length > 0 : (props as SingleProps).clearable !== false && props.value) && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-zinc-500 hover:text-red-400 transition-colors"
                            aria-label="Limpar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <ChevronDown className={clsx("w-4 h-4 text-zinc-500 transition-transform", open && "rotate-180")} />
                </div>
            </div>

            {/* Dropdown via Portal — escapa de overflow-hidden de containers pais */}
            {open && mounted && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: "fixed",
                        top: dropdownPos.openUp ? "auto" : dropdownPos.top,
                        bottom: dropdownPos.openUp ? window.innerHeight - dropdownPos.top : "auto",
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                        zIndex: 9999,
                    }}
                    className="rounded-xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50 overflow-hidden"
                >
                    {headerMessage && (
                        <div className="px-3 py-2 text-xs text-amber-400 bg-amber-500/5 border-b border-white/5">
                            {headerMessage}
                        </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                        <Search className="w-4 h-4 text-zinc-500" />
                        <input
                            autoFocus
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Buscar..."
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {visibleOptions.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-zinc-500">
                                {loading ? "Carregando..." : emptyMessage}
                            </div>
                        ) : (
                            visibleOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSelect(opt.id)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-violet-500/10 transition-colors flex items-center gap-2"
                                >
                                    {opt.render || opt.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
