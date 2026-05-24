"use client";

import { Folder } from "lucide-react";
import { Combobox, ComboboxOption } from "./ComboboxBase";
import { useDiscordResources } from "./useDiscordResources";

interface Props {
    guildId: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}

export function CategorySelect({ guildId, value, onChange, placeholder }: Props) {
    const { data, loading, botMissing, error } = useDiscordResources(guildId);

    const options: ComboboxOption[] = (data?.categories || []).map(cat => ({
        id: cat.id,
        label: cat.name,
        searchText: cat.name,
        render: (
            <>
                <Folder className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">{cat.name}</span>
            </>
        ),
        chip: (
            <>
                <Folder className="w-3 h-3 text-zinc-400" />
                <span>{cat.name}</span>
            </>
        ),
    }));

    const headerMessage = botMissing
        ? "⚠️ Bot não está neste servidor."
        : error
            ? `⚠️ ${error}`
            : undefined;

    return (
        <Combobox
            value={value}
            onChange={onChange}
            options={options}
            loading={loading}
            placeholder={placeholder || "Selecione uma categoria..."}
            emptyMessage="Nenhuma categoria encontrada"
            headerMessage={headerMessage}
        />
    );
}
