"use client";

import { Hash, Volume2, Megaphone, MessageSquare } from "lucide-react";
import { ReactNode } from "react";
import { Combobox, ComboboxOption } from "./ComboboxBase";
import { useDiscordResources, DiscordChannel, DiscordCategory } from "./useDiscordResources";

type ChannelFilter = "text" | "voice" | "announcement" | "forum" | "any";

interface BaseProps {
    guildId: string;
    placeholder?: string;
    /** Restringe os canais visiveis por tipo. Default: text. */
    types?: ChannelFilter[];
}

interface SingleProps extends BaseProps {
    value: string;
    onChange: (v: string) => void;
    multi?: false;
}

interface MultiProps extends BaseProps {
    value: string[];
    onChange: (v: string[]) => void;
    multi: true;
}

function iconFor(type: string): ReactNode {
    switch (type) {
        case "text":
            return <Hash className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
        case "voice":
        case "stage":
            return <Volume2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
        case "announcement":
            return <Megaphone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
        case "forum":
            return <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
        default:
            return <Hash className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
    }
}

function buildOptions(
    channels: DiscordChannel[] | undefined | null,
    categories: DiscordCategory[] | undefined | null,
    types: ChannelFilter[]
): ComboboxOption[] {
    if (!channels) return [];
    const catMap = new Map((categories || []).map(c => [c.id, c.name]));
    const allowAny = types.includes("any");

    return channels
        .filter(c => allowAny || types.includes(c.type as ChannelFilter))
        .map(c => {
            const parentName = c.parent_id ? catMap.get(c.parent_id) : null;
            const searchText = parentName ? `${c.name} ${parentName}` : c.name;
            return {
                id: c.id,
                label: c.name,
                searchText,
                render: (
                    <>
                        {iconFor(c.type)}
                        <span className="truncate">{c.name}</span>
                        {parentName && (
                            <span className="ml-auto text-[10px] text-zinc-600 truncate">
                                {parentName}
                            </span>
                        )}
                    </>
                ),
                chip: (
                    <>
                        {iconFor(c.type)}
                        <span>{c.name}</span>
                    </>
                ),
            };
        });
}

export function ChannelSelect(props: SingleProps | MultiProps) {
    const { data, loading, botMissing, error } = useDiscordResources(props.guildId);
    const types = props.types && props.types.length > 0 ? props.types : (["text"] as ChannelFilter[]);

    const options = buildOptions(data?.channels, data?.categories, types);

    const headerMessage = botMissing
        ? "⚠️ Bot não está neste servidor."
        : error
            ? `⚠️ ${error}`
            : undefined;

    if (props.multi) {
        return (
            <Combobox
                multi
                value={props.value}
                onChange={props.onChange}
                options={options}
                loading={loading}
                placeholder={props.placeholder || "Selecione canais..."}
                emptyMessage="Nenhum canal encontrado"
                headerMessage={headerMessage}
            />
        );
    }
    return (
        <Combobox
            value={props.value}
            onChange={props.onChange}
            options={options}
            loading={loading}
            placeholder={props.placeholder || "Selecione um canal..."}
            emptyMessage="Nenhum canal encontrado"
            headerMessage={headerMessage}
        />
    );
}
