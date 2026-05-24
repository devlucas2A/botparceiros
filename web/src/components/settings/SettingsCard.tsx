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
    violet: "border-violet-500/30 hover:border-violet-500/50",
    emerald: "border-emerald-500/30 hover:border-emerald-500/50",
    amber: "border-amber-500/30 hover:border-amber-500/50",
    red: "border-red-500/30 hover:border-red-500/50",
    blue: "border-blue-500/30 hover:border-blue-500/50",
};

const ACCENT_ICON_BG: Record<NonNullable<Props["accent"]>, string> = {
    violet: "from-violet-500/20 to-fuchsia-500/20",
    emerald: "from-emerald-500/20 to-teal-500/20",
    amber: "from-amber-500/20 to-orange-500/20",
    red: "from-red-500/20 to-rose-500/20",
    blue: "from-blue-500/20 to-cyan-500/20",
};

export function SettingsCard({
    title,
    description,
    icon: Icon,
    iconColor = "text-violet-400",
    accent = "violet",
    children,
}: Props) {
    return (
        <div
            className={clsx(
                "bg-[#0A0A0C] border rounded-3xl p-6 md:p-8 transition-all duration-500 relative overflow-visible",
                ACCENT_BORDER[accent]
            )}
        >
            <div className="flex items-center gap-4 mb-6">
                <div
                    className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center bg-linear-to-br shadow-lg shadow-black/30",
                        ACCENT_ICON_BG[accent]
                    )}
                >
                    <Icon className={clsx("w-6 h-6", iconColor)} />
                </div>
                <div>
                    <h2 className="text-xl font-medium text-white">{title}</h2>
                    {description && (
                        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
                    )}
                </div>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}
