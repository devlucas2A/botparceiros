"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Globe, Check, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Hero3D } from "@/components/landing/Hero3D";
import { ModulesShowcase } from "@/components/landing/ModulesShowcase";

export default function Home() {
    const t = useTranslations();
    const locale = useLocale();
    const isEn = locale === "en";
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

    const toggleLanguage = () => {
        const newLocale = locale === "pt" ? "en" : "pt";
        const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
        router.push(newPath);
    };

    const handlePlanClick = (plan: string) => {
        const targetUrl = `/${locale}/dashboard/billing?plan=${plan}&auto=true&interval=${billingCycle}`;
        if (session) {
            router.push(targetUrl);
        } else {
            toast.info(
                isEn ? "Redirecting to Discord login..." : "Redirecionando para login com Discord...",
                {
                    description: isEn
                        ? `You will continue to the ${plan.toUpperCase()} plan after signing in.`
                        : `Você continuará para o plano ${plan.toUpperCase()} logo após entrar.`,
                }
            );
            signIn("discord", { callbackUrl: targetUrl });
        }
    };

    const handleStartNow = () => {
        const targetUrl = `/${locale}/dashboard`;
        if (session) {
            router.push(targetUrl);
        } else {
            signIn("discord", { callbackUrl: targetUrl });
        }
    };

    return (
        <div className="min-h-screen bg-[#060609] text-white font-sans overflow-x-hidden selection:bg-purple-500/30 selection:text-white">
            {/* Ambient background glow */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{ x: mousePosition.x * 0.015, y: mousePosition.y * 0.015 }}
                    className="absolute top-[-15%] left-[-10%] w-[55%] h-[65%] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-purple-900/20 via-[#0a0a0c] to-transparent opacity-50 blur-3xl"
                />
                <motion.div
                    animate={{ x: mousePosition.x * -0.015, y: mousePosition.y * -0.015 }}
                    className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[55%] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-violet-900/15 via-[#0a0a0c] to-transparent opacity-40 blur-3xl"
                />
            </div>

            <div className="relative z-10">
                {/* Navbar */}
                <nav className="fixed w-full z-50 bg-[#060609]/80 backdrop-blur-xl border-b border-white/5 top-0 transition-all duration-300">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <Link href={`/${locale}`} className="flex items-center gap-3 group">
                            <div className="relative w-9 h-9 transition-transform group-hover:scale-105">
                                <Image src="/CoreBot.png" alt="CoreBot Logo" fill className="object-contain" priority />
                            </div>
                            <span className="font-bold tracking-tight text-base text-white">
                                CoreBot<span className="text-purple-400">.ai</span>
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
                            <Link href="#features" className="hover:text-white transition-colors tracking-wide">
                                {t("nav.features")}
                            </Link>
                            <Link href="#pricing" className="hover:text-white transition-colors tracking-wide">
                                {t("nav.pricing")}
                            </Link>
                            <Link href="#community" className="hover:text-white transition-colors tracking-wide">
                                {t("nav.community")}
                            </Link>
                            <Link
                                href={`/${locale}/docs`}
                                className="hover:text-white transition-colors tracking-wide flex items-center gap-1.5 text-purple-300"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>{t("nav.docs")}</span>
                            </Link>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={toggleLanguage}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                {locale === "pt" ? "EN" : "PT"}
                            </button>

                            {session ? (
                                <Link
                                    href={`/${locale}/dashboard`}
                                    className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wider transition-all rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleStartNow}
                                    className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wider transition-all rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
                                >
                                    {t("nav.login")}
                                </button>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero */}
                <main className="max-w-7xl mx-auto px-6 sm:px-8 pt-36 md:pt-44 pb-24">
                    <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
                        <div className="lg:col-span-6 space-y-7 text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <span className="h-2 w-2 rounded-full bg-purple-400" />
                                <span className="text-[11px] font-medium text-zinc-300">
                                    {isEn ? "AI & Music Bot for Discord" : "IA e Música para seu Discord"}
                                </span>
                            </div>

                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-medium leading-[1.08] tracking-tight text-white">
                                {t("hero.title")} <br />
                                <span className="text-zinc-400">{t("hero.subtitle")}</span>
                            </h1>

                            <p className="text-base sm:text-lg text-zinc-400 max-w-md leading-relaxed">
                                {isEn ? (
                                    <>
                                        Build your server with AI, play songs with{" "}
                                        <code className="text-purple-300 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded">
                                            core!
                                        </code>{" "}
                                        and keep chats safe in minutes.
                                    </>
                                ) : (
                                    <>
                                        Crie canais com IA, toque músicas com{" "}
                                        <code className="text-purple-300 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded">
                                            core!
                                        </code>{" "}
                                        e proteja sua comunidade sem complicação.
                                    </>
                                )}
                            </p>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleStartNow}
                                    className="group h-13 bg-white hover:bg-zinc-200 text-black font-semibold text-sm flex items-center justify-center gap-3 px-7 rounded-2xl transition-all shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] cursor-pointer"
                                >
                                    <span>{t("hero.cta")}</span>
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>

                                <Link
                                    href={`/${locale}/docs`}
                                    className="h-13 bg-white/5 hover:bg-white/10 text-white font-medium text-sm flex items-center justify-center gap-2 px-6 rounded-2xl border border-white/10 transition-all"
                                >
                                    <span>{isEn ? "Commands" : "Ver comandos"}</span>
                                </Link>
                            </div>
                        </div>

                        <div className="lg:col-span-6 flex justify-center items-center">
                            <Hero3D locale={locale} />
                        </div>
                    </div>
                </main>

                {/* Unified 3D Showcase */}
                <ModulesShowcase locale={locale} />

                {/* Pricing */}
                <section id="pricing" className="py-24 border-t border-white/5 relative z-10">
                    <div className="max-w-7xl mx-auto px-6 sm:px-8">
                        <div className="text-center mb-14">
                            <h2 className="text-3xl md:text-5xl font-serif text-white font-medium mb-3">
                                {t("pricing.title")}
                            </h2>
                            <p className="text-zinc-400 text-sm max-w-md mx-auto">{t("pricing.subtitle")}</p>
                        </div>

                        <div className="flex flex-col items-center mb-12">
                            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/10 relative">
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle("monthly")}
                                    className={`relative z-10 px-6 py-2 rounded-full text-xs font-semibold transition-all duration-300 cursor-pointer ${
                                        billingCycle === "monthly" ? "text-black" : "text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    {t("pricing.monthly")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle("yearly")}
                                    className={`relative z-10 px-6 py-2 rounded-full text-xs font-semibold transition-all duration-300 cursor-pointer ${
                                        billingCycle === "yearly" ? "text-black" : "text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    {t("pricing.yearly")}
                                </button>
                                <div
                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-all duration-300 shadow-lg ${
                                        billingCycle === "yearly" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
                                    }`}
                                />
                            </div>
                            <span className="mt-3 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                {t("pricing.save_text")}
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
                            {/* Free */}
                            <div className="p-7 rounded-3xl border border-white/10 bg-[#09090D] hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
                                <div>
                                    <h3 className="text-base font-bold text-emerald-400 mb-3">{t("pricing.free.name")}</h3>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-4xl font-serif text-white">{t("pricing.free.price")}</span>
                                        <span className="text-xs text-zinc-400">{isEn ? "/forever" : "/sempre"}</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mb-6">{t("pricing.free.desc")}</p>
                                    <div className="h-px w-full bg-white/5 mb-6" />
                                    <ul className="space-y-3 mb-8">
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <li key={i} className="flex items-center gap-2.5 text-xs text-zinc-300">
                                                <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                                </div>
                                                <span>{t(`pricing.free.features.${i}`)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleStartNow}
                                    className="w-full py-3 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                >
                                    {isEn ? "Start Free" : "Começar grátis"}
                                </button>
                            </div>

                            {/* Starter */}
                            <div className="p-7 rounded-3xl border border-white/10 bg-[#09090D] hover:border-white/25 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
                                <div>
                                    <h3 className="text-base font-bold text-zinc-300 mb-3">{t("pricing.starter.name")}</h3>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-4xl font-serif text-white">
                                            {billingCycle === "monthly" ? t("pricing.starter.price") : t("pricing.starter.price_yearly")}
                                        </span>
                                        <span className="text-xs text-zinc-400">{t("pricing.monthly")}</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mb-6">
                                        {billingCycle === "yearly"
                                            ? `${t("pricing.billed_yearly", { price: t("pricing.starter.price_yearly") })}`
                                            : t("pricing.starter.desc")}
                                    </p>
                                    <div className="h-px w-full bg-white/5 mb-6" />
                                    <ul className="space-y-3 mb-8">
                                        {[0, 1, 2, 3].map((i) => (
                                            <li key={i} className="flex items-center gap-2.5 text-xs text-zinc-300">
                                                <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                                    <Check className="w-2.5 h-2.5 text-zinc-400" />
                                                </div>
                                                <span>{t(`pricing.starter.features.${i}`)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handlePlanClick("starter")}
                                    className="w-full py-3 rounded-xl border border-white/15 text-white text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    {isEn ? "Get Starter" : "Assinar Starter"}
                                </button>
                            </div>

                            {/* Pro */}
                            <div className="p-7 rounded-3xl border-2 border-purple-500/40 bg-linear-to-b from-[#141220] to-[#0A0A0E] shadow-[0_20px_50px_rgba(124,58,237,0.22)] flex flex-col justify-between relative overflow-hidden hover:-translate-y-2 transition-all duration-300">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-base font-bold text-purple-400">{t("pricing.pro.name")}</h3>
                                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold uppercase border border-purple-500/30">
                                            Popular
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-4xl font-serif text-white">
                                            {billingCycle === "monthly" ? t("pricing.pro.price") : t("pricing.pro.price_yearly")}
                                        </span>
                                        <span className="text-xs text-zinc-400">{t("pricing.monthly")}</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mb-6">
                                        {billingCycle === "yearly"
                                            ? `${t("pricing.billed_yearly", { price: t("pricing.pro.price_yearly") })}`
                                            : t("pricing.pro.desc")}
                                    </p>
                                    <div className="h-px w-full bg-purple-500/20 mb-6" />
                                    <ul className="space-y-3 mb-8">
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <li key={i} className="flex items-center gap-2.5 text-xs text-zinc-200">
                                                <div className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                                                    <Check className="w-2.5 h-2.5 text-purple-400" />
                                                </div>
                                                <span>{t(`pricing.pro.features.${i}`)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handlePlanClick("pro")}
                                    className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] cursor-pointer"
                                >
                                    {isEn ? "Get Pro" : "Assinar Pro"}
                                </button>
                            </div>

                            {/* Ultimate */}
                            <div className="p-7 rounded-3xl border border-white/10 bg-[#09090D] hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
                                <div>
                                    <h3 className="text-base font-bold text-amber-400 mb-3">{t("pricing.ultimate.name")}</h3>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-4xl font-serif text-white">
                                            {billingCycle === "monthly" ? t("pricing.ultimate.price") : t("pricing.ultimate.price_yearly")}
                                        </span>
                                        <span className="text-xs text-zinc-400">{t("pricing.monthly")}</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mb-6">
                                        {billingCycle === "yearly"
                                            ? `${t("pricing.billed_yearly", { price: t("pricing.ultimate.price_yearly") })}`
                                            : t("pricing.ultimate.desc")}
                                    </p>
                                    <div className="h-px w-full bg-white/5 mb-6" />
                                    <ul className="space-y-3 mb-8">
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <li key={i} className="flex items-center gap-2.5 text-xs text-zinc-300">
                                                <div className="w-4 h-4 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                                                    <Check className="w-2.5 h-2.5 text-amber-400" />
                                                </div>
                                                <span>{t(`pricing.ultimate.features.${i}`)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handlePlanClick("ultimate")}
                                    className="w-full py-3 rounded-xl border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/10 transition-colors cursor-pointer"
                                >
                                    {isEn ? "Get Ultimate" : "Assinar Ultimate"}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Community */}
                <section id="community" className="py-24 border-t border-white/5 bg-linear-to-b from-[#09090D] to-[#040406] text-center">
                    <div className="max-w-2xl mx-auto px-6">
                        <h2 className="text-3xl md:text-5xl font-serif font-medium mb-4">{t("community.title")}</h2>
                        <p className="text-zinc-400 text-sm max-w-md mx-auto mb-8">
                            {isEn
                                ? "Join our Discord community for updates, tips and quick support."
                                : "Entre no nosso servidor do Discord para novidades, dicas e suporte rápido."}
                        </p>
                        <Link
                            href="https://discord.gg/gUFMmpPc"
                            target="_blank"
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(88,101,242,0.4)]"
                        >
                            <span>{isEn ? "Join Discord" : "Entrar no Discord"}</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>

                <footer className="py-8 border-t border-white/5 bg-black text-center text-zinc-500 text-xs">
                    <p>&copy; 2026 CoreBot • {isEn ? "Made for Discord communities" : "Feito para comunidades no Discord"}</p>
                </footer>
            </div>
        </div>
    );
}
