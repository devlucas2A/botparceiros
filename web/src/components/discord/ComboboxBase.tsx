"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
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

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setFilter("");
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
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

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 shadow-xl overflow-hidden">
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
                </div>
            )}
        </div>
    );
}
