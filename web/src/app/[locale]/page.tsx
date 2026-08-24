"use client";

import Image from "next/image";
import Link from "next/link";
import { 
    ArrowRight, 
    Globe, 
    Check, 
    Bot, 
    Shield, 
    Zap, 
    Server, 
    Hand, 
    Phone, 
    Wand2, 
    BarChart3,
    Sparkles,
    CheckCircle2,
    Lock,
    FileText,
    Crown,
    Activity,
    Radio
} from "lucide-react";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from "sonner";

export default function Home() {
    const t = useTranslations();
    const locale = useLocale();
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

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const toggleLanguage = () => {
        const newLocale = locale === 'pt' ? 'en' : 'pt';
        const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
        router.push(newPath);
    };

    const handlePlanClick = (plan: string) => {
        const targetUrl = `/${locale}/dashboard/billing?plan=${plan}&auto=true&interval=${billingCycle}`;
        if (session) {
            router.push(targetUrl);
        } else {
            toast.info(`Redirecionando para login com Discord...`, {
                description: `Você será encaminhado para assinar o plano ${plan.toUpperCase()} logo após o login.`
            });
            signIn('discord', { callbackUrl: targetUrl });
        }
    };

    const handleStartNow = () => {
        const targetUrl = `/${locale}/dashboard`;
        if (session) {
            router.push(targetUrl);
        } else {
            signIn('discord', { callbackUrl: targetUrl });
        }
    };

    return (
        <div className="min-h-screen bg-[#060609] text-white font-sans overflow-hidden selection:bg-purple-500/30 selection:text-white">

            {/* Animated Background Particles */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{ x: mousePosition.x * 0.02, y: mousePosition.y * 0.02 }}
                    className="absolute top-[-20%] left-[-10%] w-[70%] h-[80%] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#1e2030] via-[#0a0a0c] to-transparent opacity-40 blur-3xl"
                />
                <motion.div
                    animate={{ x: mousePosition.x * -0.02, y: mousePosition.y * -0.02 }}
                    className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#13111C] via-[#0a0a0c] to-transparent opacity-30 blur-3xl"
                />

                {/* Stars / Dust */}
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <div className="relative z-10">
                {/* Navbar */}
                <nav className="fixed w-full z-50 bg-[#060609]/80 backdrop-blur-md border-b border-white/5 top-0 transition-all duration-300">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <Link href={`/${locale}`} className="flex items-center gap-3">
                            <div className="relative w-8 h-8">
                                <Image src="/CoreBot.png" alt="CoreBot Logo" fill className="object-contain" />
                            </div>
                            <span className="font-semibold tracking-tight text-sm text-white">CoreBot&apos;s</span>
                        </Link>

                        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
                            <Link href="#features" className="hover:text-white transition-colors uppercase tracking-wide">{t('nav.features')}</Link>
                            <Link href="#pricing" className="hover:text-white transition-colors uppercase tracking-wide">{t('nav.pricing')}</Link>
                            <Link href="#community" className="hover:text-white transition-colors uppercase tracking-wide">{t('nav.community')}</Link>
                            <Link href={`/${locale}/docs`} className="hover:text-white transition-colors uppercase tracking-wide">{t('nav.docs')}</Link>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wide cursor-pointer"
                            >
                                <Globe className="w-3 h-3" />
                                {locale === 'pt' ? 'EN' : 'PT'}
                            </button>

                            {session ? (
                                <Link
                                    href={`/${locale}/dashboard`}
                                    className="px-5 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors rounded-sm shadow-md"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <button
                                    onClick={handleStartNow}
                                    className="px-5 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors rounded-sm cursor-pointer shadow-md"
                                >
                                    {t('nav.login')}
                                </button>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <main className="max-w-7xl mx-auto px-8 pt-48 pb-32">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="grid lg:grid-cols-2 gap-16 items-center"
                    >
                        <div>
                            <div className="inline-block px-3 py-1 border border-zinc-800 bg-zinc-900/50 rounded text-[10px] tracking-widest uppercase text-zinc-400 mb-8 font-medium">
                                {t('hero.badge')}
                            </div>

                            <h1 className="text-5xl md:text-7xl font-serif font-medium leading-[1.1] mb-8 text-white">
                                {t('hero.title')} <br />
                                <span className="text-zinc-500">{t('hero.subtitle')}</span>
                            </h1>

                            <p className="text-lg text-zinc-400 mb-10 max-w-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: t.raw('hero.desc') }}>
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <button
                                    onClick={handleStartNow}
                                    className="group w-full sm:w-64 h-14 bg-white hover:bg-zinc-200 text-black font-semibold flex items-center justify-between px-6 transition-all rounded-sm shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_-5px_rgba(255,255,255,0.5)] cursor-pointer"
                                >
                                    {t('hero.cta')}
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>

                        </div>

                        {/* Visual Abstract side - Animated Terminal */}
                        <div className="hidden lg:flex justify-center relative h-[500px]">
                            <div className="relative w-full h-full border border-white/5 bg-[#0e0e11] rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10">
                                {/* Terminal Header */}
                                <div className="h-10 border-b border-white/5 bg-white/5 flex items-center px-4 justify-between">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-mono">corebot_terminal.exe</div>
                                </div>

                                {/* Terminal Body */}
                                <div className="p-6 font-mono text-xs md:text-sm space-y-4">
                                    {/* Command 1 */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                    >
                                        <span className="text-green-400">user@discord:~$</span> <span className="text-white">/construir-servidor</span>
                                    </motion.div>

                                    {/* Input Prompt */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1 }}
                                        className="pl-4 border-l-2 border-white/10"
                                    >
                                        <span className="text-purple-400">prompt:</span> <span className="text-zinc-300">&quot;Comunidade de Gaming Setup com área VIP e cargos por nível&quot;</span>
                                    </motion.div>

                                    {/* Bot Response Processing */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1.5 }}
                                        className="text-blue-400 mt-4 flex items-center gap-2"
                                    >
                                        <span>🤖 CoreBot AI:</span>
                                        <span className="text-zinc-400">Analisando prompt...</span>
                                    </motion.div>

                                    {/* Bot Response Success */}
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        transition={{ delay: 2.2 }}
                                        className="bg-white/5 p-3 rounded border border-white/5 text-zinc-300 mt-2"
                                    >
                                        <p className="text-green-400 font-bold mb-2">✅ Estrutura Gerada com Sucesso!</p>
                                        <ul className="space-y-1 text-zinc-400 pl-4 list-disc text-xs">
                                            <li>5 Categorias Criadas (Boas-vindas, Geral, Gaming, VIP, Staff)</li>
                                            <li>12 Canais de Texto & Voz</li>
                                            <li>Cargos configurados: @Membro, @VIP, @Admin</li>
                                        </ul>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 2.8 }}
                                        className="text-zinc-500 mt-4 animate-pulse"
                                    >
                                        _ Aguardando confirmação...
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </main>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* Features Section - Organizada em 2x2 Flagships + Barra de Módulos */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <section id="features" className="py-28 border-t border-white/5 relative z-10 overflow-hidden">
                    {/* Dot grid background */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-[0.18]"
                        style={{
                            backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                            maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 90%)',
                            WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 90%)',
                        }}
                    />

                    {/* Aurora ambient */}
                    <motion.div
                        className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-purple-500/15 blur-[120px] rounded-full pointer-events-none"
                        animate={{ x: [0, 60, 0], y: [0, -30, 0] }}
                        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-blue-500/15 blur-[120px] rounded-full pointer-events-none"
                        animate={{ x: [0, -60, 0], y: [0, 40, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    <div className="max-w-7xl mx-auto px-8 relative z-10 space-y-12">
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="text-left max-w-2xl"
                        >
                            <h2 className="text-4xl md:text-6xl font-serif text-white font-medium tracking-tight mb-4 leading-tight">
                                {t('features.title')}<br />
                                <span className="bg-clip-text text-transparent bg-linear-to-r from-zinc-400 to-zinc-600">{t('features.subtitle')}</span>
                            </h2>
                            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
                                {t('features.desc')}
                            </p>
                        </motion.div>

                        {/* GRID PRINCIPAL: 2x2 CARDS DE ALTO IMPACTO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* FLAGSHIP 1: Construtor IA de Servidores */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="bg-[#0A0A0C] border border-white/5 hover:border-purple-500/40 transition-all duration-500 rounded-[24px] p-8 relative overflow-hidden group shadow-lg hover:shadow-purple-500/10 flex flex-col justify-between"
                            >
                                <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                                
                                <div className="space-y-4 relative z-10">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-[14px] flex items-center justify-center group-hover:scale-105 group-hover:bg-purple-500/20 group-hover:border-purple-500/40 transition-all duration-500">
                                        <Bot className="text-zinc-300 group-hover:text-purple-400 w-6 h-6 transition-colors" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white group-hover:text-purple-50 transition-colors">
                                        {t('features.items.ai_builder.title')}
                                    </h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        {t('features.items.ai_builder.desc')}
                                    </p>
                                </div>

                                <div className="mt-8 pt-4 border-t border-white/5 relative z-10 flex items-center justify-between">
                                    <div className="bg-[#050505] border border-white/10 rounded-[12px] px-4 py-2.5 flex items-center gap-3 w-full">
                                        <div className="flex gap-1.5 shrink-0">
                                            <div className="w-2 h-2 rounded-full bg-red-500/80"></div>
                                            <div className="w-2 h-2 rounded-full bg-yellow-500/80"></div>
                                            <div className="w-2 h-2 rounded-full bg-green-500/80"></div>
                                        </div>
                                        <motion.span 
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="font-mono text-xs text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] truncate"
                                        >
                                            Generating server structure...<span className="animate-pulse">_</span>
                                        </motion.span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* FLAGSHIP 2: CoreBot AI & Base de Conhecimento (RAG) */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="bg-[#0A0A0C] border border-white/5 hover:border-indigo-500/40 transition-all duration-500 rounded-[24px] p-8 relative overflow-hidden group shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between"
                            >
                                <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                                <div className="space-y-4 relative z-10">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-[14px] flex items-center justify-center group-hover:scale-105 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/40 transition-all duration-500">
                                        <Sparkles className="text-zinc-300 group-hover:text-indigo-400 w-6 h-6 transition-colors" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white group-hover:text-indigo-50 transition-colors">
                                        CoreBot AI & Conhecimento (RAG)
                                    </h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        Alimente a IA com FAQs, regras e tabelas de preços da sua comunidade para respostas cirúrgicas 24/7 com Llama 3.3 70B.
                                    </p>
                                </div>

                                <div className="mt-8 pt-4 border-t border-white/5 relative z-10 flex items-center justify-between">
                                    <div className="bg-[#050505] border border-white/10 rounded-[12px] px-4 py-2.5 flex items-center justify-between gap-3 w-full">
                                        <span className="text-xs text-zinc-300 font-mono flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                            Contexto Personalizado
                                        </span>
                                        <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                            Llama 3.3
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* FLAGSHIP 3: AutoMod & Anti-Raid 24/7 */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="bg-[#0A0A0C] border border-white/5 hover:border-red-500/40 transition-all duration-500 rounded-[24px] p-8 relative overflow-hidden group shadow-lg hover:shadow-red-500/10 flex flex-col justify-between"
                            >
                                <div className="absolute inset-0 bg-linear-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                                <div className="space-y-4 relative z-10">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-[14px] flex items-center justify-center group-hover:scale-105 group-hover:bg-red-500/20 group-hover:border-red-500/40 transition-all duration-500">
                                        <Shield className="text-zinc-300 group-hover:text-red-400 w-6 h-6 transition-colors" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white group-hover:text-red-50 transition-colors">
                                        {t('features.items.automod.title')} & Anti-Raid
                                    </h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        Filtro ativo contra contas recém-criadas, invasões em massa, spam, links maliciosos e menções excessivas com punição imediata.
                                    </p>
                                </div>

                                <div className="mt-8 pt-4 border-t border-white/5 relative z-10">
                                    <div className="bg-[#050505] border border-white/10 rounded-[12px] px-4 py-2.5 flex items-center justify-between w-full">
                                        <span className="text-xs text-zinc-300 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                                            Proteção Anti-Raid 24/7
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                            Ativo
                                        </span>
                                    </div>
                                </div>

                                {/* Laser Scan Line */}
                                <motion.div 
                                    className="absolute left-0 right-0 h-[1px] bg-linear-to-r from-transparent via-red-500/80 to-transparent opacity-0 group-hover:opacity-100 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"
                                    animate={{ top: ["10%", "90%", "10%"] }}
                                    transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                                />
                            </motion.div>

                            {/* FLAGSHIP 4: Tickets 2.0 & Transcrições HTML */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="bg-[#0A0A0C] border border-white/5 hover:border-blue-500/40 transition-all duration-500 rounded-[24px] p-8 relative overflow-hidden group shadow-lg hover:shadow-blue-500/10 flex flex-col justify-between"
                            >
                                <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                                <div className="space-y-4 relative z-10">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-[14px] flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-all duration-500">
                                        <FileText className="text-zinc-300 group-hover:text-blue-400 w-6 h-6 transition-colors" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white group-hover:text-blue-50 transition-colors">
                                        Tickets 2.0 & Transcrições HTML
                                    </h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        Atendimento por categorias com assunção de tickets pela staff e geração automática de transcrições visuais em HTML com resumo inteligente.
                                    </p>
                                </div>

                                <div className="mt-8 pt-4 border-t border-white/5 relative z-10">
                                    <div className="bg-[#050505] border border-white/10 rounded-[12px] px-4 py-2.5 flex items-center justify-between w-full">
                                        <span className="text-xs text-zinc-300 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                            Transcrições Visuais em HTML
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                            Resumo IA
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                        </div>

                        {/* BARRA DE MÓDULOS COMPLEMENTARES (Clean & Compact) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="bg-[#0A0A0C] border border-white/5 rounded-[24px] p-6 sm:p-8 relative overflow-hidden shadow-xl"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                                        <Hand className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Boas-Vindas Canvas</h4>
                                        <p className="text-xs text-zinc-400 mt-1">Banners automáticos gerados com o avatar do membro.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 shrink-0 mt-0.5">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Calls Privadas</h4>
                                        <p className="text-xs text-zinc-400 mt-1">Salas de voz temporárias que somem ao esvaziar.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Live Activity Feed</h4>
                                        <p className="text-xs text-zinc-400 mt-1">Auditoria ao vivo de todas as ações e pings do bot.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                                        <Crown className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Whitelabel Total</h4>
                                        <p className="text-xs text-zinc-400 mt-1">Bot com seu próprio nome e foto no Discord.</p>
                                    </div>
                                </div>

                            </div>
                        </motion.div>

                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-32 border-t border-white/5 relative z-10">
                    <div className="max-w-7xl mx-auto px-8">
                        <div className="text-center mb-20">
                            <h2 className="text-4xl md:text-5xl font-serif mb-6">{t('pricing.title')}</h2>
                            <p className="text-zinc-500">{t('pricing.subtitle')}</p>
                        </div>

                        <div className="flex flex-col items-center mb-12">
                            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/5 relative">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${billingCycle === 'monthly' ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    {t('pricing.monthly')}
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${billingCycle === 'yearly' ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    {t('pricing.yearly')}
                                </button>
                                <div
                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-all duration-300 shadow-lg ${billingCycle === 'yearly' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
                                ></div>
                            </div>
                            <span className="mt-4 text-[10px] text-green-400 font-bold bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">{t('pricing.save_text')}</span>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-start">

                            {/* Free Plan */}
                            <div className="p-8 rounded-3xl border border-white/10 bg-[#0A0A0C] hover:bg-white/2 transition-colors relative group">
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-emerald-400 mb-4">{t('pricing.free.name')}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-serif text-white">{t('pricing.free.price')}</span>
                                        <span className="text-sm text-zinc-500">/sempre</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-2">{t('pricing.free.desc')}</p>
                                </div>

                                <div className="h-px w-full bg-white/5 mb-8"></div>

                                <ul className="space-y-4 mb-8">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-emerald-500" />
                                            </div>
                                            {t(`pricing.free.features.${i}`)}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={handleStartNow}
                                    className="w-full py-4 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                >
                                   Comece Agora
                                </button>
                            </div>

                            {/* Starter Plan */}
                            <div className="p-8 rounded-3xl border border-white/10 bg-[#0A0A0C] hover:bg-white/2 transition-colors relative group">
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-zinc-400 mb-4">{t('pricing.starter.name')}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-serif text-white">
                                            {billingCycle === 'monthly' ? t('pricing.starter.price') : t('pricing.starter.price_yearly')}
                                        </span>
                                        <span className="text-sm text-zinc-500">/mês</span>
                                    </div>
                                    {billingCycle === 'yearly' ? (
                                        <p className="text-[11px] text-emerald-400 font-medium mt-1.5">
                                            Cobrado anualmente ({t('pricing.starter.price_yearly_total')}/ano) • -20%
                                        </p>
                                    ) : (
                                        <p className="text-xs text-zinc-500 mt-2">{t('pricing.starter.desc')}</p>
                                    )}
                                </div>

                                <div className="h-px w-full bg-white/5 mb-8"></div>

                                <ul className="space-y-4 mb-8">
                                    {[0, 1, 2, 3].map((i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                                            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-zinc-500" />
                                            </div>
                                            {t(`pricing.starter.features.${i}`)}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => handlePlanClick('starter')}
                                    className="w-full py-4 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    Assinar Starter
                                </button>
                            </div>

                            {/* Pro Plan (Popular) */}
                            <div className="p-8 rounded-3xl border border-purple-500/30 bg-[#0A0A0C] relative group overflow-hidden transform lg:-translate-y-4">
                                <div className="absolute inset-0 bg-linear-to-b from-purple-500/10 to-transparent opacity-50 pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="mb-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-medium text-purple-400 flex items-center gap-2">
                                                {t('pricing.pro.name')}
                                            </h3>
                                            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider border border-purple-500/30">
                                                Popular ⭐
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-serif text-white">
                                                {billingCycle === 'monthly' ? t('pricing.pro.price') : t('pricing.pro.price_yearly')}
                                            </span>
                                            <span className="text-sm text-zinc-500">/mês</span>
                                        </div>
                                        {billingCycle === 'yearly' ? (
                                            <p className="text-[11px] text-emerald-400 font-medium mt-1.5">
                                                Cobrado anualmente ({t('pricing.pro.price_yearly_total')}/ano) • -20%
                                            </p>
                                        ) : (
                                            <p className="text-xs text-zinc-400 mt-2">{t('pricing.pro.desc')}</p>
                                        )}
                                    </div>

                                    <div className="h-px w-full bg-purple-500/20 mb-8"></div>

                                    <ul className="space-y-4 mb-8">
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                                                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-purple-400" />
                                                </div>
                                                {t(`pricing.pro.features.${i}`)}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => handlePlanClick('pro')}
                                        className="w-full py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] cursor-pointer"
                                    >
                                        Assinar Pro
                                    </button>
                                </div>
                            </div>

                            {/* Ultimate Plan */}
                            <div className="p-8 rounded-3xl border border-white/10 bg-[#0A0A0C] hover:border-amber-500/30 transition-colors relative group">
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-amber-500 mb-4">{t('pricing.ultimate.name')}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-serif text-white">
                                            {billingCycle === 'monthly' ? t('pricing.ultimate.price') : t('pricing.ultimate.price_yearly')}
                                        </span>
                                        <span className="text-sm text-zinc-500">/mês</span>
                                    </div>
                                    {billingCycle === 'yearly' ? (
                                        <p className="text-[11px] text-emerald-400 font-medium mt-1.5">
                                            Cobrado anualmente ({t('pricing.ultimate.price_yearly_total')}/ano) • -20%
                                        </p>
                                    ) : (
                                        <p className="text-xs text-zinc-500 mt-2">{t('pricing.ultimate.desc')}</p>
                                    )}
                                </div>

                                <div className="h-px w-full bg-white/5 mb-8"></div>

                                <ul className="space-y-4 mb-8">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                                            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-zinc-500 group-hover:text-amber-500 transition-colors" />
                                            </div>
                                            {t(`pricing.ultimate.features.${i}`)}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => handlePlanClick('ultimate')}
                                    className="w-full py-4 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/50 transition-all cursor-pointer"
                                >
                                    Assinar Ultimate
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Community/CTA */}
                <section id="community" className="py-32 border-t border-white/5 bg-linear-to-b from-black to-zinc-900/50">
                    <div className="max-w-4xl mx-auto px-8 text-center">
                        <h2 className="text-4xl md:text-5xl font-serif mb-8">{t('community.title')}</h2>
                        <p className="text-zinc-400 text-lg mb-10 whitespace-pre-line">
                            {t('community.desc')}
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link
                                href="https://discord.gg/gUFMmpPc"
                                target="_blank"
                                className="px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold uppercase tracking-wider flex items-center gap-2 transition-colors rounded-sm"
                            >
                                {t('community.cta')}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                <footer className="py-12 border-t border-white/5 bg-black text-center text-zinc-600 text-xs uppercase tracking-widest">
                    <p>&copy; 2026 CoreBot&apos;s AI. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
}
