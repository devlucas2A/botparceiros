"use client";

import { Combobox, ComboboxOption } from "./ComboboxBase";
import { useDiscordResources, DiscordRole } from "./useDiscordResources";

interface BaseProps {
    guildId: string;
    placeholder?: string;
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

function colorDot(color: number) {
    const hex = color > 0 ? `#${color.toString(16).padStart(6, "0")}` : "#99AAB5";
    return (
        <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: hex }}
        />
    );
}

function buildOptions(roles: DiscordRole[] | undefined | null): ComboboxOption[] {
    if (!roles) return [];
    return roles
        .filter(r => !r.managed) // tira roles geridas por bots/integrations
        .map(r => ({
            id: r.id,
            label: r.name,
            searchText: r.name,
            render: (
                <>
                    {colorDot(r.color)}
                    <span className="truncate">{r.name}</span>
                </>
            ),
            chip: (
                <>
                    {colorDot(r.color)}
                    <span>{r.name}</span>
                </>
            ),
        }));
}

export function RoleSelect(props: SingleProps | MultiProps) {
    const { data, loading, botMissing, error } = useDiscordResources(props.guildId);
    const options = buildOptions(data?.roles || null);

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
                placeholder={props.placeholder || "Selecione cargos..."}
                emptyMessage="Nenhum cargo encontrado"
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
            placeholder={props.placeholder || "Selecione um cargo..."}
            emptyMessage="Nenhum cargo encontrado"
            headerMessage={headerMessage}
        />
    );
}
