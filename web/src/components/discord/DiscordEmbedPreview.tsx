"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export interface DiscordEmbedProps {
    botName?: string;
    botAvatar?: string;
    authorName?: string;
    authorIcon?: string;
    title?: string;
    description?: string;
    color?: string; // Hex color (e.g. #5865F2, #E11D48)
    bannerUrl?: string | null;
    thumbnailUrl?: string | null;
    footerText?: string;
    footerIcon?: string;
    timestamp?: boolean;
    buttonText?: string;
    buttonEmoji?: string;
    buttonStyle?: 'primary' | 'secondary' | 'success' | 'danger' | 'link';
    messageContent?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export function DiscordEmbedPreview({
    botName = "CoreBot",
    botAvatar = "https://cdn.discordapp.com/embed/avatars/0.png",
    authorName,
    authorIcon,
    title,
    description,
    color = "#5865F2",
    bannerUrl,
    thumbnailUrl,
    footerText = "CoreBot • Sistema Inteligente",
    footerIcon,
    timestamp = true,
    buttonText,
    buttonEmoji,
    buttonStyle = 'primary',
    messageContent,
    fields = []
}: DiscordEmbedProps) {
    // Normaliza cor para CSS
    const embedBorderColor = color?.startsWith("#") ? color : `#${color || "5865F2"}`;

    const buttonStyles = {
        primary: "bg-[#5865F2] hover:bg-[#4752C4] text-white",
        secondary: "bg-[#4E5058] hover:bg-[#6D6F78] text-white",
        success: "bg-[#248046] hover:bg-[#1A6334] text-white",
        danger: "bg-[#DA373C] hover:bg-[#A12828] text-white",
        link: "bg-[#4E5058] hover:bg-[#6D6F78] text-white"
    };

    return (
        <div className="w-full rounded-2xl bg-[#313338] text-[#DBDEE1] font-sans p-4 md:p-5 shadow-2xl border border-white/5 select-none transition-all">
            {/* Header da Mensagem no Discord */}
            <div className="flex items-start gap-3.5 mb-2">
                <img
                    src={botAvatar}
                    alt={botName}
                    className="w-10 h-10 rounded-full shrink-0 bg-[#1e1f22] object-cover ring-2 ring-black/20"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png";
                    }}
                />
                <div className="flex flex-col grow min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm hover:underline cursor-pointer">
                            {botName}
                        </span>
                        <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                            BOT
                        </span>
                        <span className="text-zinc-400 text-xs ml-1">
                            Hoje às {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {/* Mensagem em texto simples acima do embed (se houver) */}
                    {messageContent && (
                        <div className="text-sm text-[#DBDEE1] mt-1 whitespace-pre-wrap break-words leading-relaxed">
                            {messageContent}
                        </div>
                    )}
                </div>
            </div>

            {/* Embed Container */}
            {(title || description || bannerUrl || thumbnailUrl || fields.length > 0) && (
                <div
                    className="ml-13 mt-1 rounded-lg bg-[#2B2D31] p-4 border-l-4 shadow-md max-w-xl transition-all duration-300 relative overflow-hidden"
                    style={{ borderLeftColor: embedBorderColor }}
                >
                    {/* Author */}
                    {authorName && (
                        <div className="flex items-center gap-2 mb-2">
                            {authorIcon && (
                                <img src={authorIcon} alt="" className="w-5 h-5 rounded-full object-cover" />
                            )}
                            <span className="text-xs font-semibold text-white">{authorName}</span>
                        </div>
                    )}

                    <div className="flex gap-4 items-start">
                        <div className="grow min-w-0">
                            {/* Title */}
                            {title && (
                                <h4 className="text-base font-bold text-white mb-1.5 leading-snug break-words">
                                    {title}
                                </h4>
                            )}

                            {/* Description */}
                            {description && (
                                <div className="text-sm text-[#DBDEE1] whitespace-pre-wrap break-words leading-relaxed mb-3">
                                    {description}
                                </div>
                            )}
                        </div>

                        {/* Thumbnail */}
                        {thumbnailUrl && (
                            <img
                                src={thumbnailUrl}
                                alt="Thumbnail"
                                className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover shrink-0 ml-auto border border-white/5"
                                onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                }}
                            />
                        )}
                    </div>

                    {/* Fields */}
                    {fields.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
                            {fields.map((f, i) => (
                                <div key={i} className={f.inline ? "col-span-1" : "col-span-full"}>
                                    <div className="text-xs font-bold text-white uppercase tracking-wide mb-0.5">
                                        {f.name}
                                    </div>
                                    <div className="text-sm text-[#DBDEE1] break-words">
                                        {f.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Banner Image */}
                    {bannerUrl && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-white/5 bg-black/20">
                            <img
                                src={bannerUrl}
                                alt="Banner"
                                className="w-full max-h-64 object-cover"
                                onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                }}
                            />
                        </div>
                    )}

                    {/* Footer */}
                    {(footerText || timestamp) && (
                        <div className="flex items-center gap-2 mt-3 pt-2 text-[11px] text-zinc-400">
                            {footerIcon && (
                                <img src={footerIcon} alt="" className="w-4 h-4 rounded-full object-cover" />
                            )}
                            <span>{footerText}</span>
                            {timestamp && (
                                <>
                                    <span>•</span>
                                    <span>Hoje às {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons Row */}
            {buttonText && (
                <div className="ml-13 mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        className={`px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 cursor-default ${buttonStyles[buttonStyle] || buttonStyles.primary}`}
                    >
                        {buttonEmoji && <span>{buttonEmoji}</span>}
                        <span>{buttonText}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
