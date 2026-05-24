"use client";

import Link from "next/link";
import { Bot, BookOpen, Terminal, Sparkles, Shield, Ticket, Phone, Hand, Wand2, Settings, Download, ExternalLink } from "lucide-react";

/**
 * Pagina de Documentacao publica do CoreBot.
 *
 * Estrategia: HTML/JSX nativo do React (sem MDX) para manter controle
 * total de estilo e facilitar exportacao via window.print() — o navegador
 * gera PDF identico ao layout exibido. Estilos @media print no globals
 * (ou inline aqui) ajustam o documento para impressao.
 */

interface Command {
    name: string;
    description: string;
    usage?: string;
    options?: { name: string; required?: boolean; type: string; description: string }[];
    subcommands?: { name: string; description: string; options?: { name: string; type: string; description: string }[] }[];
    permission?: string;
    example?: string;
    notes?: string[];
}

const CORE_COMMANDS: Command[] = [
    {
        name: "/construir-servidor",
        description: "Cria uma estrutura completa de cargos, categorias e canais com IA. Mostra preview antes de aplicar.",
        permission: "Administrador",
        options: [
            { name: "tema", required: true, type: "STRING", description: "Descrição livre do servidor. Ex: \"Comunidade Gaming com VIP\"" },
            { name: "estilo", type: "CHOICE", description: "gaming / comunidade / rpg / educacional / empresa / outro" },
            { name: "tamanho", type: "CHOICE", description: "enxuto (~10 canais) / médio (~20) / completo (~30+)" },
            { name: "idioma", type: "CHOICE", description: "Idioma dos nomes (pt / en / es)" },
            { name: "considerar_existente", type: "BOOLEAN", description: "Se true (padrão), a IA evita duplicar canais/cargos existentes" },
        ],
        example: "/construir-servidor tema:\"servidor de RPG medieval\" estilo:rpg tamanho:medio",
        notes: [
            "A IA gera um plano e mostra preview com botões Confirmar / Regerar / Cancelar.",
            "Você tem 5 minutos para confirmar antes do preview expirar.",
        ],
    },
    {
        name: "/desfazer-servidor",
        description: "Reverte a última execução de /construir-servidor — apaga os recursos criados.",
        permission: "Administrador",
        notes: [
            "Funciona até 24h após a geração.",
            "Apaga apenas o que o bot criou; canais/cargos preexistentes não são tocados.",
        ],
    },
    {
        name: "/ajustar-servidor",
        description: "Modifica canais e cargos via linguagem natural.",
        permission: "Administrador",
        options: [
            { name: "acao", required: true, type: "STRING", description: "Ex: \"Adicionar canal de voz na categoria Gaming\"" },
        ],
        example: "/ajustar-servidor acao:\"criar cargo VIP em amarelo\"",
    },
    {
        name: "/config-ia",
        description: "Configura como a IA do bot se comporta no servidor.",
        permission: "Administrador",
        subcommands: [
            { name: "canal", description: "Define o canal onde a IA responde mensagens", options: [{ name: "canal", type: "CHANNEL", description: "Canal de texto" }] },
            { name: "personalidade", description: "Define o prompt de sistema da IA", options: [{ name: "prompt", type: "STRING", description: "Ex: \"Você é sarcástico e adora trocadilhos\"" }] },
            { name: "cargos", description: "Define cargos admin da IA", options: [{ name: "cargo1", type: "ROLE", description: "Primeiro cargo admin" }, { name: "cargo2", type: "ROLE", description: "Segundo cargo (opcional)" }] },
            { name: "status", description: "Mostra as configurações atuais da IA" },
        ],
    },
    {
        name: "/ajuda-ia",
        description: "Lista os comandos de IA disponíveis.",
    },
];

const CALL_COMMANDS: Command[] = [
    {
        name: "/call criar",
        description: "Cria sua call de voz privada na categoria configurada.",
        notes: ["Você só pode ter uma call ativa por vez.", "A call é apagada automaticamente quando todos saem."],
    },
    {
        name: "/call convidar",
        description: "Permite que alguém entre na sua call.",
        options: [{ name: "usuario", required: true, type: "USER", description: "Usuário a convidar" }],
    },
    {
        name: "/call expulsar",
        description: "Remove alguém da sua call.",
        options: [{ name: "usuario", required: true, type: "USER", description: "Usuário a expulsar" }],
    },
    {
        name: "/call bloquear",
        description: "Bloqueia a call (só entram convidados).",
    },
    {
        name: "/call desbloquear",
        description: "Permite que qualquer um entre na call.",
    },
    {
        name: "/call limite",
        description: "Define o limite de usuários simultâneos.",
        options: [{ name: "quantidade", required: true, type: "INTEGER", description: "0 = sem limite" }],
    },
];

const SPACE_COMMANDS: Command[] = [
    { name: "/apod", description: "Mostra a Imagem Astronômica do Dia (NASA)." },
    { name: "/spacex", description: "Mostra o próximo lançamento da SpaceX." },
    { name: "/iss", description: "Mostra a localização atual da Estação Espacial Internacional." },
    { name: "/mars", description: "Foto recente do rover em Marte." },
    { name: "/spacenews", description: "Notícia espacial recente." },
    { name: "/spacefact", description: "Curiosidade aleatória sobre o espaço." },
];

const TICKET_COMMANDS: Command[] = [
    {
        name: "/ticket-painel",
        description: "Envia o painel de tickets no canal atual. Configure as categorias e o visual no painel web antes.",
        permission: "Administrador",
    },
];

function CommandCard({ cmd }: { cmd: Command }) {
    return (
        <div className="border border-white/10 rounded-xl p-5 bg-[#0A0A0C] space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <code className="text-violet-300 font-mono text-base font-medium">{cmd.name}</code>
                {cmd.permission && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200">
                        {cmd.permission}
                    </span>
                )}
            </div>
            <p className="text-sm text-zinc-300">{cmd.description}</p>

            {cmd.options && cmd.options.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Parâmetros</div>
                    <table className="w-full text-xs">
                        <tbody>
                            {cmd.options.map(opt => (
                                <tr key={opt.name} className="border-b border-white/5 last:border-0">
                                    <td className="py-1.5 pr-3 font-mono text-violet-300 whitespace-nowrap align-top">
                                        {opt.name}
                                        {opt.required && <span className="text-red-400">*</span>}
                                    </td>
                                    <td className="py-1.5 pr-3 text-zinc-500 align-top">
                                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[10px]">{opt.type}</span>
                                    </td>
                                    <td className="py-1.5 text-zinc-400 align-top">{opt.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {cmd.subcommands && (
                <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Subcomandos</div>
                    {cmd.subcommands.map(sub => (
                        <div key={sub.name} className="pl-3 border-l border-violet-500/20 space-y-1">
                            <div className="text-xs font-mono text-violet-300">{cmd.name} {sub.name}</div>
                            <div className="text-xs text-zinc-400">{sub.description}</div>
                            {sub.options && sub.options.length > 0 && (
                                <div className="text-[11px] text-zinc-500">
                                    Parâmetros: {sub.options.map(o => o.name).join(", ")}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {cmd.example && (
                <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">Exemplo</div>
                    <code className="block text-xs font-mono text-zinc-300 bg-black/40 border border-white/5 rounded px-3 py-2">
                        {cmd.example}
                    </code>
                </div>
            )}

            {cmd.notes && cmd.notes.length > 0 && (
                <ul className="text-xs text-zinc-400 space-y-1 pl-4 list-disc">
                    {cmd.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
            )}
        </div>
    );
}

function Section({ id, icon: Icon, title, children }: { id: string; icon: any; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-3 pt-4">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-2xl font-serif font-medium text-white">{title}</h2>
            </div>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-[#060609] text-white print:bg-white print:text-black">
            {/* Header — escondido no PDF */}
            <nav className="sticky top-0 z-50 bg-[#060609]/80 backdrop-blur-md border-b border-white/5 print:hidden">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-sm font-medium text-white hover:text-violet-300 transition-colors">
                        <Bot className="w-5 h-5" />
                        CoreBot
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="text-xs uppercase tracking-wider px-4 py-2 rounded-md bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-200 transition-colors flex items-center gap-2"
                    >
                        <Download className="w-3 h-3" /> Baixar PDF
                    </button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 py-10 space-y-10 print:py-6">
                {/* Capa */}
                <header className="space-y-4 pb-8 border-b border-white/10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 uppercase tracking-wider font-medium">
                        <BookOpen className="w-3 h-3" /> Manual completo
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-medium">Documentação do CoreBot</h1>
                    <p className="text-zinc-400 text-lg max-w-3xl">
                        Bot inteligente para gerenciamento de servidores Discord. Construa estruturas com IA,
                        modere com regras flexíveis, gerencie tickets, e mais — tudo via comandos slash e painel web.
                    </p>
                    <p className="text-xs text-zinc-600 pt-2">Última atualização: maio/2026 · Versão 1.0</p>
                </header>

                {/* Sumário */}
                <aside className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5 print:break-inside-avoid">
                    <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">Sumário</div>
                    <ol className="space-y-1.5 text-sm text-zinc-300">
                        <li><a href="#inicio" className="hover:text-violet-300">1. Começando</a></li>
                        <li><a href="#painel" className="hover:text-violet-300">2. Painel Web</a></li>
                        <li><a href="#comandos-ia" className="hover:text-violet-300">3. Comandos de IA</a></li>
                        <li><a href="#comandos-call" className="hover:text-violet-300">4. Calls Privadas</a></li>
                        <li><a href="#comandos-ticket" className="hover:text-violet-300">5. Sistema de Tickets</a></li>
                        <li><a href="#comandos-espaco" className="hover:text-violet-300">6. Espaciais (Bonus)</a></li>
                        <li><a href="#comandos-custom" className="hover:text-violet-300">7. Comandos Personalizados</a></li>
                        <li><a href="#modulos" className="hover:text-violet-300">8. Módulos Automáticos</a></li>
                        <li><a href="#faq" className="hover:text-violet-300">9. Perguntas Frequentes</a></li>
                    </ol>
                </aside>

                {/* 1. Começando */}
                <Section id="inicio" icon={Sparkles} title="1. Começando">
                    <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
                        <p>Para usar o CoreBot, siga estes três passos:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li><strong>Adicione o bot</strong> ao seu servidor Discord usando o botão "Adicionar ao Discord" na página inicial.</li>
                            <li><strong>Conceda permissões</strong> ao bot: Gerenciar Canais, Gerenciar Cargos, Gerenciar Mensagens, Castigar Membros, Enviar Mensagens e Embed Links.</li>
                            <li><strong>Acesse o painel web</strong> em <code className="text-violet-300">corebot.up.railway.app</code> e faça login com Discord para configurar os módulos visualmente.</li>
                        </ol>
                        <p className="text-zinc-400 text-xs mt-4">
                            <strong>Importante:</strong> ative os Privileged Intents "Server Members Intent" e "Message Content Intent"
                            no Developer Portal do Discord (se você gerencia o bot) — sem eles, eventos de entrada/saída e leitura de mensagens não funcionam.
                        </p>
                    </div>
                </Section>

                {/* 2. Painel Web */}
                <Section id="painel" icon={Settings} title="2. Painel Web">
                    <p className="text-sm text-zinc-300">
                        O painel web concentra todas as configurações dos módulos. Após o login, selecione um servidor para acessar:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            { icon: Bot, name: "CoreBot AI", desc: "Personalidade, canal, gatilhos e temperatura da IA." },
                            { icon: Hand, name: "Boas-vindas", desc: "Mensagens de entrada/saída com banner customizável e auto-role." },
                            { icon: Shield, name: "AutoMod", desc: "Palavras proibidas, anti-link, anti-spam, ações e logs." },
                            { icon: Ticket, name: "Tickets", desc: "Categorias, painel customizado, cargo de suporte, transcripts." },
                            { icon: Wand2, name: "Comandos AI", desc: "Crie comandos slash com lógica complexa descritos em linguagem natural." },
                            { icon: Phone, name: "Calls Privadas", desc: "Categoria, cargos permitidos e cargo gerente." },
                            { icon: Settings, name: "Configurações", desc: "Status do bot, acesso, auditoria, preferências e zona perigosa." },
                        ].map(item => (
                            <div key={item.name} className="border border-white/10 rounded-xl p-4 bg-[#0A0A0C] flex items-start gap-3">
                                <item.icon className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-medium text-white">{item.name}</div>
                                    <div className="text-xs text-zinc-400 mt-0.5">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 3. Comandos de IA */}
                <Section id="comandos-ia" icon={Terminal} title="3. Comandos de IA">
                    {CORE_COMMANDS.map(cmd => <CommandCard key={cmd.name} cmd={cmd} />)}
                </Section>

                {/* 4. Calls */}
                <Section id="comandos-call" icon={Phone} title="4. Calls Privadas">
                    <p className="text-sm text-zinc-400">
                        Comandos para gerenciar sua própria call de voz temporária.
                        Requer configuração prévia no painel (Calls Privadas → Categoria e cargos).
                    </p>
                    {CALL_COMMANDS.map(cmd => <CommandCard key={cmd.name} cmd={cmd} />)}
                </Section>

                {/* 5. Tickets */}
                <Section id="comandos-ticket" icon={Ticket} title="5. Sistema de Tickets">
                    <p className="text-sm text-zinc-400">
                        O fluxo principal é configurar no painel e enviar o painel no canal desejado.
                        Cada categoria gera um botão; ao clicar, um canal privado é criado para o usuário e a equipe.
                    </p>
                    {TICKET_COMMANDS.map(cmd => <CommandCard key={cmd.name} cmd={cmd} />)}
                </Section>

                {/* 6. Espaciais */}
                <Section id="comandos-espaco" icon={Sparkles} title="6. Espaciais (Bonus)">
                    <p className="text-sm text-zinc-400">Comandos divertidos integrados com APIs públicas da NASA e SpaceX.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {SPACE_COMMANDS.map(cmd => (
                            <div key={cmd.name} className="border border-white/10 rounded-xl p-4 bg-[#0A0A0C]">
                                <code className="text-violet-300 font-mono text-sm">{cmd.name}</code>
                                <p className="text-xs text-zinc-400 mt-1">{cmd.description}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 7. Comandos personalizados */}
                <Section id="comandos-custom" icon={Wand2} title="7. Comandos Personalizados">
                    <div className="text-sm text-zinc-300 space-y-3">
                        <p>
                            No painel <strong>Comandos AI</strong> você cria comandos slash únicos para o seu servidor
                            descrevendo em linguagem natural. A IA gera o schema, mostra preview, e ao salvar o comando fica disponível no Discord.
                        </p>
                        <div className="border border-violet-500/20 rounded-xl p-4 bg-violet-500/5 space-y-2">
                            <div className="text-xs uppercase tracking-wider text-violet-300 font-semibold">Ações disponíveis</div>
                            <ul className="text-xs text-zinc-300 space-y-1 pl-5 list-disc">
                                <li><strong>REPLY</strong> — responde com texto fixo (suporta variáveis {"{opção}"})</li>
                                <li><strong>AI_REPLY</strong> — responde usando IA com prompt customizado</li>
                                <li><strong>ADD_ROLE / REMOVE_ROLE</strong> — adiciona ou remove cargos</li>
                                <li><strong>SET_NICKNAME</strong> — muda o apelido de um membro</li>
                                <li><strong>SEND_DM / SEND_CHANNEL</strong> — envia mensagem privada ou em outro canal</li>
                                <li><strong>KICK / BAN</strong> — modera usuários</li>
                                <li><strong>RANDOM_IMAGE</strong> — envia um GIF de uma categoria (hug, kiss, slap, etc)</li>
                                <li><strong>EXTERNAL_API</strong> — integração com APIs externas (NASA, OMDB, Weather)</li>
                            </ul>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Exemplo de prompt: <em>"Crie um comando /vip que dê o cargo Membro VIP para quem usar e mande
                            uma mensagem de boas-vindas com um embed bonito."</em>
                        </p>
                    </div>
                </Section>

                {/* 8. Módulos automáticos */}
                <Section id="modulos" icon={Shield} title="8. Módulos Automáticos">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="border border-white/10 rounded-xl p-4 bg-[#0A0A0C] space-y-2">
                            <h3 className="font-medium text-white flex items-center gap-2"><Hand className="w-4 h-4 text-blue-400" /> Boas-vindas e Saída</h3>
                            <p className="text-zinc-400 text-xs">Banner customizado com avatar, mensagem e fundo. Variáveis: <code className="text-violet-300">{"{user}"}</code>, <code className="text-violet-300">{"{server}"}</code>, <code className="text-violet-300">{"{memberCount}"}</code>.</p>
                        </div>
                        <div className="border border-white/10 rounded-xl p-4 bg-[#0A0A0C] space-y-2">
                            <h3 className="font-medium text-white flex items-center gap-2"><Shield className="w-4 h-4 text-red-400" /> AutoMod</h3>
                            <p className="text-zinc-400 text-xs">Detecta links, CAPS, spam, palavras proibidas e infrações via IA. Ações: apagar, timeout, kick, ban. Cargos podem ser bypass.</p>
                        </div>
                        <div className="border border-white/10 rounded-xl p-4 bg-[#0A0A0C] space-y-2">
                            <h3 className="font-medium text-white flex items-center gap-2"><Bot className="w-4 h-4 text-purple-400" /> Chat com IA</h3>
                            <p className="text-zinc-400 text-xs">A IA responde quando mencionada ou quando a mensagem começa com um dos gatilhos configurados. Suporta análise de imagens.</p>
                        </div>
                        <div className="border border-white/10 rounded-xl p-4 bg-[#0A0A0C] space-y-2">
                            <h3 className="font-medium text-white flex items-center gap-2"><Phone className="w-4 h-4 text-cyan-400" /> Calls Auto-Delete</h3>
                            <p className="text-zinc-400 text-xs">Canais de voz privados são apagados automaticamente quando ficam vazios.</p>
                        </div>
                    </div>
                </Section>

                {/* 9. FAQ */}
                <Section id="faq" icon={BookOpen} title="9. Perguntas Frequentes">
                    <div className="space-y-3 text-sm">
                        {[
                            {
                                q: "O bot não responde aos comandos. O que fazer?",
                                a: "Verifique se o bot tem permissão de Enviar Mensagens no canal. Se for comando admin, confirme que você tem o cargo apropriado. Comandos globais novos podem levar até 1h para sincronizar — reinicie o cliente Discord (Ctrl+R) para forçar.",
                            },
                            {
                                q: "Mensagens de boas-vindas não aparecem.",
                                a: 'Ative o "Server Members Intent" no Discord Developer Portal. Sem essa flag o Discord nem envia o evento ao bot, independente da configuração.',
                            },
                            {
                                q: "/construir-servidor está demorando muito.",
                                a: "Servidores grandes podem demorar 30-60s na fase de aplicar (criar 30+ canais com permissões). O embed mostra progresso em tempo real. Se passar de 2min sem nada, algo travou.",
                            },
                            {
                                q: "Posso desfazer um servidor gerado errado?",
                                a: "Sim, use /desfazer-servidor em até 24h após a geração. Apaga só o que o bot criou nessa execução.",
                            },
                            {
                                q: "Como removo o bot do servidor?",
                                a: "No painel, Configurações → Zona Perigosa → Remover bot do servidor. Suas configurações ficam salvas para se o bot voltar.",
                            },
                        ].map((item, i) => (
                            <details key={i} className="border border-white/10 rounded-xl bg-[#0A0A0C] p-4 group" open>
                                <summary className="cursor-pointer font-medium text-white text-sm">{item.q}</summary>
                                <p className="text-zinc-400 text-xs mt-2 leading-relaxed">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </Section>

                {/* Suporte */}
                <section className="border border-violet-500/20 rounded-xl p-6 bg-violet-500/5 print:break-before-page">
                    <h2 className="text-xl font-medium text-white mb-2">Precisa de ajuda?</h2>
                    <p className="text-sm text-zinc-300 mb-4">
                        Entre na comunidade oficial do CoreBot no Discord para suporte direto da equipe e da comunidade.
                    </p>
                    <Link
                        href="/#community"
                        className="inline-flex items-center gap-2 text-sm text-violet-200 hover:text-white transition-colors"
                    >
                        Acessar comunidade <ExternalLink className="w-3 h-3" />
                    </Link>
                </section>
            </main>

            {/* Estilo print: ajusta espaçamento e cores para PDF */}
            <style jsx global>{`
                @media print {
                    body { background: white !important; color: black !important; }
                    .bg-\\[\\#060609\\], .bg-\\[\\#0A0A0C\\] { background: white !important; }
                    .text-white { color: #111 !important; }
                    .text-zinc-300, .text-zinc-400 { color: #444 !important; }
                    .text-zinc-500 { color: #666 !important; }
                    .text-violet-300 { color: #6d28d9 !important; }
                    .border-white\\/10, .border-white\\/5 { border-color: #ddd !important; }
                    details { break-inside: avoid; }
                    section { break-inside: avoid-page; }
                }
            `}</style>
        </div>
    );
}
