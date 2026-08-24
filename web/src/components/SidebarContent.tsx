"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronLeft, LucideIcon, Wifi, Copy, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export interface MenuItem {
    name: string;
    icon: LucideIcon;
    href: string;
    exact?: boolean;
    badge?: string;
    badgeColor?: string;
    isLive?: boolean;
}

export interface MenuGroup {
    category?: string;
    items: MenuItem[];
}

export interface SidebarContentProps {
    title: string;
    subtitle?: string;
    logo?: string;
    serverIcon?: string;
    guildId?: string;
    groups?: MenuGroup[];
    items?: MenuItem[];
    backLink?: {
        href: string;
        label: string;
    };
    className?: string;
    onItemClick?: () => void;
}

export function SidebarContent({
    title,
    subtitle,
    logo,
    serverIcon,
    guildId,
    groups,
    items,
    backLink,
    className,
    onItemClick,
}: SidebarContentProps) {
    const t = useTranslations("dashboard.sidebar");
    const pathname = usePathname();
    const [copied, setCopied] = useState(false);

    // Converte `items` simples em grupo único se `groups` não for fornecido
    const effectiveGroups: MenuGroup[] = groups || (items ? [{ items }] : []);

    const handleCopyId = () => {
        if (!guildId) return;
        navigator.clipboard.writeText(guildId);
        setCopied(true);
        toast.success("ID do Servidor copiado!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={cn("flex flex-col h-full bg-[#08080C] border-r border-white/5 font-sans select-none", className)}>
            {/* ════════════════════════════════════════════════════
                TOP HEADER & SERVER PROFILE
               ════════════════════════════════════════════════════ */}
            <div className="p-5 border-b border-white/5 space-y-4">
                {backLink && (
                    <Link
                        href={backLink.href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white transition-all duration-200 border border-white/5 hover:border-white/10 group cursor-pointer"
                        onClick={onItemClick}
                    >
                        <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span>{backLink.label}</span>
                    </Link>
                )}

                <div className="flex items-center gap-3.5 pt-1">
                    {logo && (
                        <div className="relative w-10 h-10 shrink-0">
                            <Image src={logo} alt={title} fill className="object-contain" />
                        </div>
                    )}

                    {serverIcon ? (
                        <div className="relative shrink-0">
                            <img
                                src={serverIcon}
                                alt={title}
                                className="w-11 h-11 rounded-2xl object-cover border border-white/10 shadow-lg shadow-black/40"
                            />
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#08080C] shadow-sm"></span>
                        </div>
                    ) : (
                        !logo && (
                            <div className="relative shrink-0">
                                <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-purple-600/30 to-fuchsia-600/20 border border-purple-500/30 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-purple-950/30">
                                    {title.charAt(0).toUpperCase()}
                                </div>
                                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#08080C] shadow-sm"></span>
                            </div>
                        )
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h2 className="font-bold text-sm sm:text-base text-white truncate leading-tight">
                                {title}
                            </h2>
                        </div>

                        {guildId ? (
                            <button
                                type="button"
                                onClick={handleCopyId}
                                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 mt-0.5 cursor-pointer font-mono"
                                title="Copiar ID do Servidor"
                            >
                                <span>{guildId.slice(0, 8)}...</span>
                                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />}
                            </button>
                        ) : (
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                {subtitle || "Painel de Controle"}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                CATEGORIZED NAVIGATION LIST
               ════════════════════════════════════════════════════ */}
            <nav className="flex-1 p-3 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                {effectiveGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-1">
                        {group.category && (
                            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-zinc-500 select-none">
                                {group.category}
                            </div>
                        )}

                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = item.exact
                                    ? pathname === item.href
                                    : pathname.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onItemClick}
                                        className={cn(
                                            "relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group cursor-pointer",
                                            isActive
                                                ? "bg-linear-to-r from-purple-500/20 to-purple-500/5 text-white border border-purple-500/30 shadow-[0_0_15px_-3px_rgba(168,85,247,0.2)]"
                                                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                                        )}
                                    >
                                        {/* Left Active Glowing Bar */}
                                        {isActive && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                                        )}

                                        <div className="flex items-center gap-3 min-w-0">
                                            <item.icon
                                                className={cn(
                                                    "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                                                    isActive ? "text-purple-400" : "text-zinc-500 group-hover:text-zinc-300"
                                                )}
                                            />
                                            <span className="truncate">{item.name}</span>
                                        </div>

                                        {/* Badge Indicator */}
                                        {item.isLive && (
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 tracking-wider uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                                                LIVE
                                            </span>
                                        )}

                                        {!item.isLive && item.badge && (
                                            <span
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase border",
                                                    item.badgeColor || "bg-purple-500/15 border-purple-500/30 text-purple-300"
                                                )}
                                            >
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ════════════════════════════════════════════════════
                FOOTER: BOT HEALTH & LOGOUT
               ════════════════════════════════════════════════════ */}
            <div className="p-3 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 border border-white/5 text-[11px]">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-zinc-400 font-medium">Bot Online</span>
                    </div>
                    <span className="text-zinc-500 font-mono text-[10px]">Gateway 24ms</span>
                </div>

                <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-xs font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                    <LogOut className="w-4 h-4" />
                    <span>{t("logout")}</span>
                </button>
            </div>
        </div>
    );
}
