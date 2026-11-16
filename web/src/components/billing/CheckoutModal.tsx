"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ShieldCheck, 
    Lock, 
    ExternalLink, 
    Loader2, 
    CheckCircle2, 
    X, 
    Sparkles, 
    AlertCircle,
    ArrowRight
} from "lucide-react";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";

interface CheckoutModalProps {
    isOpen: boolean;
    checkoutUrl: string | null;
    plan: string;
    planTitle: string;
    price: number;
    interval: 'monthly' | 'yearly';
    onClose: () => void;
    onSuccess: (plan: string) => void;
}

export function CheckoutModal({
    isOpen,
    checkoutUrl,
    plan,
    planTitle,
    price,
    interval,
    onClose,
    onSuccess
}: CheckoutModalProps) {
    const prefersReducedMotion = useReducedMotionSafe();
    const [status, setStatus] = useState<'loading' | 'waiting' | 'success' | 'error'>('waiting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const popupRef = useRef<Window | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasSucceededRef = useRef(false);

    // Função para abrir o popup centralizado e responsivo
    const openPopup = useCallback((url: string) => {
        if (typeof window === "undefined") return;

        // Detecta se é celular/smartphone ou tablet pequeno
        const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

        if (isMobile) {
            // No celular, redireciona diretamente em tela cheia (100% responsivo)
            window.location.href = url;
            return;
        }

        // No Desktop, o layout do Mercado Pago usa 2 colunas lado a lado (precisa de ~920px de largura)
        const width = Math.min(960, Math.max(880, Math.round(window.outerWidth * 0.75)));
        const height = Math.min(840, Math.max(720, Math.round(window.outerHeight * 0.85)));
        const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
        const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

        const popup = window.open(
            url,
            "MercadoPagoCheckoutWindow",
            `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
        );

        if (popup) {
            popup.focus();
            popupRef.current = popup;
        } else {
            console.warn("Popup bloqueado pelo navegador.");
        }
    }, []);

    // Abre a popup inicial quando a URL estiver pronta
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (isOpen && checkoutUrl) {
            hasSucceededRef.current = false;
            openPopup(checkoutUrl);
            timer = setTimeout(() => {
                setStatus('waiting');
                setErrorMessage(null);
            }, 0);
        }

        return () => {
            if (timer) clearTimeout(timer);
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [isOpen, checkoutUrl, openPopup]);

    // Trata sucesso
    const handleSuccessTrigger = useCallback((confirmedPlan: string) => {
        if (hasSucceededRef.current) return;
        hasSucceededRef.current = true;
        
        setStatus('success');
        
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        if (popupRef.current && !popupRef.current.closed) {
            try {
                popupRef.current.close();
            } catch {
                // Ignore popup close restriction
            }
        }

        // Notifica o componente pai para atualizar estados
        onSuccess(confirmedPlan);
    }, [onSuccess]);

    // Polling de verificação de status no backend (Mercado Pago + DB)
    useEffect(() => {
        if (!isOpen || status !== 'waiting') return;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/checkout/subscription/verify?_t=${Date.now()}`);
                if (!res.ok) return;

                const data = await res.json();
                if (data?.isAuthorized) {
                    handleSuccessTrigger(data.subscription?.plan || plan);
                }
            } catch (err) {
                console.error("[CheckoutModal Polling Error]:", err);
            }
        };

        // Roda a primeira checagem após 2s, depois a cada 2.5s
        const timer = setTimeout(() => {
            checkStatus();
            pollIntervalRef.current = setInterval(checkStatus, 2500);
        }, 2000);

        return () => {
            clearTimeout(timer);
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [isOpen, status, plan, handleSuccessTrigger]);

    // Escuta postMessage da janela caso feche ou redirecione
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'COREBOT_PAYMENT_SUCCESS') {
                handleSuccessTrigger(event.data?.plan || plan);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [plan, handleSuccessTrigger]);

    // Bloqueia scroll do body enquanto o modal estiver aberto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop escuro com blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                    onClick={status === 'success' ? onClose : undefined}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95, y: prefersReducedMotion ? 0 : 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95, y: prefersReducedMotion ? 0 : 15 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.25, type: 'spring', bounce: 0.1 }}
                    className="relative w-full max-w-lg bg-[#0e0c15] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden z-10"
                >
                    {/* Luzes de ambient glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                    {/* Header do Modal */}
                    <div className="relative p-6 sm:p-7 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                <Lock className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-white tracking-tight">Checkout Seguro</h3>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Mercado Pago
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-400">Assinatura direta sem sair da aplicação</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Conteúdo do Modal */}
                    <div className="p-6 sm:p-8 space-y-6 relative">

                        {/* Card resumo do plano escolhido */}
                        <div className="p-4 rounded-2xl bg-[#161424]/80 border border-white/5 flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white uppercase tracking-wide">
                                        Plano {planTitle}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                        interval === 'yearly'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : 'bg-zinc-800 text-zinc-300 border border-white/10'
                                    }`}>
                                        {interval === 'yearly' ? 'Anual (-20%)' : 'Mensal'}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-400">Renovação recorrente automática</p>
                            </div>

                            <div className="text-right">
                                <div className="text-lg font-black text-white">
                                    R$ {price.toFixed(2).replace('.', ',')}
                                    <span className="text-xs font-normal text-zinc-400">/{interval === 'yearly' ? 'ano' : 'mês'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Estado: Aguardando Pagamento */}
                        {status === 'waiting' && (
                            <div className="space-y-5">
                                <div className="text-center py-4 space-y-3">
                                    <div className="relative inline-flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 animate-pulse">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-base font-bold text-white">
                                            Janela de Pagamento Aberta
                                        </h4>
                                        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                                            Conclua seus dados de pagamento na janela segura do Mercado Pago.
                                        </p>
                                    </div>
                                </div>

                                {/* Checklist informativo */}
                                <div className="space-y-2.5 text-xs text-zinc-300 bg-black/40 p-4 rounded-xl border border-white/5">
                                    <div className="flex items-start gap-2.5">
                                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>Ambiente com criptografia SSL oficial do Mercado Pago.</span>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                        <span>Assim que você finalizar, sua conta será atualizada na hora.</span>
                                    </div>
                                </div>

                                {/* Botões de Ação */}
                                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                                    {checkoutUrl && (
                                        <button
                                            type="button"
                                            onClick={() => openPopup(checkoutUrl)}
                                            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Reabrir Janela de Checkout
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold text-xs transition-all border border-white/5 cursor-pointer"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Estado: Sucesso Confirmado! */}
                        {status === 'success' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-4 space-y-4"
                            >
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/20">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>

                                <div className="space-y-1.5">
                                    <h4 className="text-xl font-bold text-white">
                                        🎉 Assinatura Confirmada!
                                    </h4>
                                    <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                                        Parabéns! O seu plano <span className="font-bold text-purple-400 uppercase">{planTitle}</span> foi ativado e todos os recursos e limites foram desbloqueados.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-xl shadow-emerald-600/25 cursor-pointer mt-4"
                                >
                                    <span>Continuar para o Painel</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}

                        {/* Estado: Erro */}
                        {status === 'error' && (
                            <div className="text-center py-4 space-y-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-base font-bold text-white">Erro no Pagamento</h4>
                                    <p className="text-xs text-red-300 max-w-sm mx-auto">
                                        {errorMessage || "Não foi possível concluir o checkout."}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer"
                                >
                                    Fechar
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
