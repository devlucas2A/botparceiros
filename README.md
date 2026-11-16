# ⚡ CoreBot Platform & Discord Ecosystem

> **Plataforma completa de gestão, automação inteligente e entretenimento para comunidades Discord.** Combina uma aplicação web moderna em Next.js 16 com um bot modular em Discord.js v14 alimentado por IA, sistema nativo de tickets, moderação em tempo real e subsistema de reprodução musical em alta fidelidade.

---

## 🏗️ Visão Geral da Arquitetura

O CoreBot é construído em um monorepo workspace estruturado em serviços desacoplados:

```
                              ┌────────────────────────────────────────┐
                              │            Discord Gateway             │
                              │     (Slash Commands & Voice WS)        │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
┌────────────────────────────┐      ┌──────────────────────────────────┐
│   Web Application (web/)   │      │    Discord Bot Engine (src/)     │
│ Next.js 16 (App Router)    │      │  Discord.js v14 Client           │
│ React 19 + Tailwind CSS v4 │      │  TypeScript Strict Mode          │
│ CBDS Design System         │      ├──────────────────────────────────┤
│ Dashboard Multi-Tenant     │      │ • CoreIA: Orquestrador & Chat RAG│
│ Docs Interativas           │      │ • /helpcore: Guia Interativo     │
│ Gestão de Assinaturas      │      │ • music: Player de Áudio (core!) │
└──────────────┬─────────────┘      │ • automod & tickets & calls      │
               │                    └─────────────────┬────────────────┘
               │                                      │
               ▼                                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL 17 Database                            │
│  (Guild Configs, Subscriptions, Tickets, Transcripts, Custom Cmds)   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Matriz de Funcionalidades

| Módulo | Descrição | Interface | Status |
|---|---|---|---|
| **Central de Ajuda `/helpcore`** | Central nativa no Discord com `StringSelectMenu` de 7 categorias, embed dinâmico e botões rápidos. | Slash Command (`/helpcore`) | 🟢 Produção |
| **Subsistema Musical (`core!`)** | Player de áudio autônomo com suporte a buscas pelo nome, links do Spotify e do Deezer via FIFO queue. | Prefixo `core!` | 🟢 Produção |
| **Geração de Servidor com IA** | Criação instantânea de canais, categorias e cargos a partir de prompt com preview e reversão (`/desfazer-servidor`). | Web + `/construir-servidor` | 🟢 Produção |
| **Calls Privadas Dinâmicas** | Canais de voz temporários criados sob demanda com controle de dono, tranca e autodestruição ao esvaziar. | Slash (`/call`) + Voice WS | 🟢 Produção |
| **Central de Tickets 2.0** | Abertura multidepartamento, botões de staff e geração de transcripts em HTML com resumo inteligente. | Web + `/ticket-painel` | 🟢 Produção |
| **AutoMod & Anti-Raid** | Filtro de links com whitelist, detecção de spam/flood, palavras proibidas e expulsão de contas recém-criadas. | Web Dashboard + Gateway | 🟢 Produção |
| **Base de Conhecimento (RAG)** | Treinamento de tópicos e FAQ para a IA responder dúvidas do servidor de forma precisa. | Web Dashboard + IA Chat | 🟢 Produção |
| **Dashboard Multi-Tenant** | Painel administrativo com controle de permissão `MANAGE_GUILD`, métricas, auditoria e personalização whitelabel. | Web (`/dashboard`) | 🟢 Produção |

---

## 🎵 Guia de Comandos Musicais (`core!`)

O sistema de áudio opera de forma isolada do fluxo de inteligência artificial, processando comandos instantaneamente sem fallthrough de mensagens:

| Comando | Sintaxe de Exemplo | Descrição Detalhada |
|---|---|---|
| `core!play` | `core!play lofi beats to relax` | Conecta ao canal de voz e inicia a reprodução ou adiciona à fila FIFO. |
| `core!stop` | `core!stop` | Interrompe o áudio imediatamente, limpa a fila de faixas e reseta o tocador. |
| `core!skip` | `core!skip` | Pula a faixa atual e avança para a próxima música da fila. |
| `core!leave` | `core!leave` | Desconecta o CoreBot do canal de voz e encerra a conexão de áudio. |
| `core!queue` | `core!queue` | Exibe a lista de faixas agendadas na fila com tempo acumulado. |
| `core!pause` | `core!pause` | Pausa a transmissão sem perder o progresso da música. |
| `core!resume` | `core!resume` | Retoma a reprodução a partir do ponto de pausa. |
| `core!np` | `core!np` | Exibe o card Now Playing com barra de progresso visual e solicitante. |
| `core!loop` | `core!loop` | Alterna entre repetição: desativada (`off`), faixa atual (`track`) ou fila (`queue`). |
| `core!help` | `core!help` | Envia o guia rápido de sintaxe musical no canal de texto. |

---

## 📖 Central de Ajuda Interativa (`/helpcore`)

O slash command `/helpcore` apresenta o guia operacional estruturado nas seguintes 7 categorias:

1. **Visão Geral**: Latência WebSocket, status do shard, versão e links de suporte.
2. **Música (`core!`)**: Catálogo dos 10 comandos prefixados de áudio e fila.
3. **IA & Servidor**: Comandos administrativos em linguagem natural e `/construir-servidor`.
4. **Calls Privadas**: Gerenciamento de salas temporárias com `/call`.
5. **Tickets 2.0**: Abertura de atendimentos e transcripts.
6. **Moderação & AutoMod**: Punições ativas, logs e proteção contra raids.
7. **Comandos Personalizados**: Gatilhos e botões dinâmicos definidos pela comunidade.

---

## 💻 Ambiente de Desenvolvimento Local

### Pré-requisitos
- **Node.js** >= 18.0.0 (recomendado Node.js 20 LTS ou superior)
- **PostgreSQL** 17 (com extensão `uuid-ossp` habilitada)
- **Discord Application** criada no [Discord Developer Portal](https://discord.com/developers/applications)

### 1. Clonar e Configurar Variáveis de Ambiente
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/botparceiros.git
cd botparceiros

# Configure as variáveis de ambiente
cp .env.example .env
cp web/.env.example web/.env.local
```

### 2. Inicialização dos Serviços
Recomenda-se executar 3 terminais concorrentes:

```bash
# Terminal 1 — Banco de Dados Local
npm run db:start

# Terminal 2 — Bot do Discord (Engine & Áudio)
npm run dev

# Terminal 3 — Aplicação Web (Next.js Dashboard)
cd web
npm install
npm run dev
```

Acesse o website em [http://localhost:3000](http://localhost:3000).

---

## 🧪 Qualidade, Linting e Testes

O projeto adota padrões rigorosos de integridade e tipagem estrita TypeScript:

```bash
# 1. Verificação de Linting na Aplicação Web (0 erros obrigatórios)
cd web
npm run lint

# 2. Build de Produção da Aplicação Web
cd web
npm run build

# 3. Compilação TypeScript de Todos os Serviços (Root & Bots)
npm run typecheck

# 4. Suite de Testes do Parser e Fila de Música
npm run test:music
```

---

## 🎨 CoreBot Design System (CBDS & 3D Engine)

O sistema de design do CoreBot foi projetado para alta fidelidade e ergonomia dark-mode permanente no estilo Vercel/Linear:
- **Canvas Primário**: `#050507` (obsidiana pura)
- **Cartões e Superfícies**: `#0A0A0E` com bordas hairline (`rgba(255, 255, 255, 0.07)`) e glassmorphism `rgba(18, 17, 26, 0.70)`.
- **Motor 3D Interativo**: Perspectiva espacial (`perspective: 1200px`, `transform-style: preserve-3d`), mouse tilt parallax com física de mola, anéis holográficos orbitais e reflexo de luz especular reativo.
- **Arquitetura Bento Grid**: Layout modular assimétrico com alta densidade de informação, widgets interativos de terminal e player musical, eliminando blocos de texto excessivos.
- **Módulo de Música no Dashboard**: Gerenciamento completo de volume, auto-leave, prefixo e fila na rota dedicada `/dashboard/[guildId]/music`.
- **Acentos de Identidade**: Cyber Violet (`#7C3AED`) & CoreBot Gold (`#F5C518`)
- **Tipografia**: `Playfair Display` (editorial headlines), `Geist Sans` (interface), `Geist Mono` (comandos e Discord syntax).
- As diretrizes completas de componentes, tokens e paletas semânticas estão documentadas em [`design.md`](./design.md).

---

## 📄 Licença

Este projeto está licenciado sob os termos da licença MIT. Consulte o arquivo [LICENSE](./LICENSE) para mais informações.
