import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { clsx } from "clsx";

interface Props {
    title: string;
    description?: string;
    icon: LucideIcon;
    iconColor?: string;
    accent?: "violet" | "emerald" | "amber" | "red" | "blue";
    children: ReactNode;
}

const ACCENT_BORDER: Record<NonNullable<Props["accent"]>, string> = {
    violet: "border-white/5 hover:border-purple-500/30",
    emerald: "border-white/5 hover:border-emerald-500/30",
    amber: "border-white/5 hover:border-amber-500/30",
    red: "border-rose-500/20 hover:border-rose-500/40",
    blue: "border-white/5 hover:border-blue-500/30",
};

const ACCENT_ICON_BG: Record<NonNullable<Props["accent"]>, string> = {
    violet: "from-purple-500/20 to-fuchsia-500/20 border-purple-500/30",
    emerald: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
    amber: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    red: "from-rose-500/20 to-red-500/20 border-rose-500/30",
    blue: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
};

export function SettingsCard({
    title,
    description,
    icon: Icon,
    iconColor = "text-purple-400",
    accent = "violet",
    children,
}: Props) {
    return (
        <div
            className={clsx(
                "bg-[#0D0D11] border rounded-3xl p-6 sm:p-8 shadow-xl transition-all duration-300 relative overflow-visible",
                ACCENT_BORDER[accent]
            )}
        >
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/5">
                <div
                    className={clsx(
                        "w-12 h-12 rounded-2xl border flex items-center justify-center bg-linear-to-br shadow-lg shadow-black/40 shrink-0",
                        ACCENT_ICON_BG[accent]
                    )}
                >
                    <Icon className={clsx("w-6 h-6", iconColor)} />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{title}</h2>
                    {description && (
                        <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
                    )}
                </div>
            </div>
            <div className="space-y-5">{children}</div>
        </div>
    );
}

