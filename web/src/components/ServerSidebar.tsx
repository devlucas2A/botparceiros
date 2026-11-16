"use client";

import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { MenuGroup } from "./SidebarContent";
import { 
    LayoutDashboard, 
    Activity, 
    Bot, 
    ShieldAlert, 
    Settings, 
    Hand, 
    Ticket, 
    Wand2, 
    Phone, 
    BarChart3, 
    Tag, 
    Brain,
    Disc 
} from "lucide-react";

interface ServerSidebarProps {
    guild: {
        name: string;
        icon: string | null;
        id: string;
    };
    locale: string;
}

function getServerMenuGroups(guildId: string, locale: string): MenuGroup[] {
    return [
        {
            category: "Principal & Monitoramento",
            items: [
                { 
                    name: "Visão Geral", 
                    icon: LayoutDashboard, 
                    href: `/${locale}/dashboard/${guildId}`, 
                    exact: true 
                },
                { 
                    name: "Atividades", 
                    icon: Activity, 
                    href: `/${locale}/dashboard/${guildId}/activity`,
                    isLive: true
                },
                { 
                    name: "Estatísticas", 
                    icon: BarChart3, 
                    href: `/${locale}/dashboard/${guildId}/analytics` 
                },
            ]
        },
        {
            category: "Inteligência Artificial",
            items: [
                { 
                    name: "CoreBot AI", 
                    icon: Bot, 
                    href: `/${locale}/dashboard/${guildId}/corebot`,
                    badge: "IA"
                },
                { 
                    name: "Respostas da IA", 
                    icon: Brain, 
                    href: `/${locale}/dashboard/${guildId}/knowledge` 
                },
                { 
                    name: "Comandos Custom", 
                    icon: Wand2, 
                    href: `/${locale}/dashboard/${guildId}/commands` 
                },
            ]
        },
        {
            category: "Moderação & Comunidade",
            items: [
                { 
                    name: "AutoMod & Segurança", 
                    icon: ShieldAlert, 
                    href: `/${locale}/dashboard/${guildId}/automod` 
                },
                { 
                    name: "Tickets", 
                    icon: Ticket, 
                    href: `/${locale}/dashboard/${guildId}/tickets` 
                },
                { 
                    name: "Boas-Vindas", 
                    icon: Hand, 
                    href: `/${locale}/dashboard/${guildId}/welcome` 
                },
                { 
                    name: "Calls Privadas", 
                    icon: Phone, 
                    href: `/${locale}/dashboard/${guildId}/private-calls` 
                },
                { 
                    name: "Música", 
                    icon: Disc, 
                    href: `/${locale}/dashboard/${guildId}/music`,
                    badge: "core!",
                    badgeColor: "bg-violet-500/15 border-violet-500/30 text-violet-300"
                },
            ]
        },
        {
            category: "Sistema & Ajustes",
            items: [
                { 
                    name: "Whitelabel", 
                    icon: Tag, 
                    href: `/${locale}/dashboard/${guildId}/whitelabel`,
                    badge: "PRO",
                    badgeColor: "bg-amber-500/15 border-amber-500/30 text-amber-300"
                },
                { 
                    name: "Configurações Gerais", 
                    icon: Settings, 
                    href: `/${locale}/dashboard/${guildId}/settings` 
                },
            ]
        }
    ];
}

export function ServerSidebar({ guild, locale }: ServerSidebarProps) {
    const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : undefined;

    const groups = getServerMenuGroups(guild.id, locale);

    return (
        <Sidebar
            title={guild.name}
            serverIcon={iconUrl}
            guildId={guild.id}
            groups={groups}
            backLink={{
                href: `/${locale}/dashboard`,
                label: "Voltar para Servidores"
            }}
        />
    );
}

export function MobileServerSidebar({ guild, locale }: ServerSidebarProps) {
    const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : undefined;

    const groups = getServerMenuGroups(guild.id, locale);

    return (
        <MobileSidebar
            title={guild.name}
            serverIcon={iconUrl}
            guildId={guild.id}
            groups={groups}
            backLink={{
                href: `/${locale}/dashboard`,
                label: "Voltar para Servidores"
            }}
        />
    );
}
