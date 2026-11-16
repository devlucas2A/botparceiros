<design-context>
---
version: 2.0.0
name: CoreBot Design System (CBDS)
description: |
  CoreBot Design System (CBDS) is the definitive visual language, design token architecture,
  and component specification for the CoreBot platform across marketing landing pages,
  interactive documentation, and the multi-tenant Discord guild management dashboard.
  CBDS pairs atmospheric obsidian canvas depths with vibrant Cyber Violet and CoreBot Gold accents,
  editorial serif headlines (Playfair Display), precision interface typography (Geist Sans),
  and developer-grade monospace styling (Geist Mono).

tokens:
  canvas:
    pure: "#050507"
    deep: "#07070A"
    subtle: "#0D0D12"
  surface:
    card: "#0A0A0E"
    card-hover: "#101015"
    elevated: "#121118"
    elevated-hover: "#1A1922"
    popover: "#0E0E12"
    glass: "rgba(18, 17, 26, 0.70)"
    glass-hover: "rgba(26, 25, 36, 0.85)"
    glass-subtle: "rgba(255, 255, 255, 0.03)"
  border:
    hairline: "rgba(255, 255, 255, 0.07)"
    hairline-strong: "rgba(255, 255, 255, 0.14)"
    hairline-glow: "rgba(255, 255, 255, 0.25)"
    accent: "rgba(124, 58, 237, 0.35)"
    accent-gold: "rgba(245, 197, 24, 0.35)"
    divider: "rgba(255, 255, 255, 0.05)"
  brand:
    primary: "#7C3AED"
    primary-hover: "#8B5CF6"
    primary-dark: "#6D28D9"
    primary-glow: "rgba(124, 58, 237, 0.25)"
    gold: "#F5C518"
    gold-hover: "#EAB308"
    gold-dark: "#CA8A04"
    gold-glow: "rgba(245, 197, 24, 0.20)"
    slate: "#6366F1"
    slate-glow: "rgba(99, 102, 241, 0.20)"
  semantic:
    success: "#10B981"
    success-muted: "rgba(16, 185, 129, 0.15)"
    warning: "#F59E0B"
    warning-muted: "rgba(245, 158, 11, 0.15)"
    destructive: "#EF4444"
    destructive-muted: "rgba(239, 68, 68, 0.15)"
    info: "#06B6D4"
    info-muted: "rgba(6, 182, 212, 0.15)"
    discord: "#5865F2"
    discord-hover: "#4752C4"
    discord-muted: "rgba(88, 101, 242, 0.15)"
  text:
    primary: "#EDEDEF"
    secondary: "#A1A1AA"
    muted: "#71717A"
    subtle: "#52525B"
    on-primary: "#FFFFFF"
    on-gold: "#000000"

typography:
  display-xxl:
    fontFamily: Playfair Display, serif
    fontSize: 72px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -0.025em
  display-xl:
    fontFamily: Playfair Display, serif
    fontSize: 54px
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Playfair Display, serif
    fontSize: 40px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.015em
  heading-xl:
    fontFamily: Geist Sans, sans-serif
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.02em
  heading-lg:
    fontFamily: Geist Sans, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.015em
  heading-md:
    fontFamily: Geist Sans, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.01em
  heading-sm:
    fontFamily: Geist Sans, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: Geist Sans, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Geist Sans, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Geist Sans, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
  code-md:
    fontFamily: Geist Mono, monospace
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
  code-sm:
    fontFamily: Geist Mono, monospace
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4

radii:
  sm: 6px
  md: 10px
  lg: 16px
  xl: 24px
  full: 9999px

elevation:
  level0:
    name: Canvas
    bg: "#050507"
    border: none
    shadow: none
  level1:
    name: Card
    bg: "#0A0A0E"
    border: 1px solid rgba(255, 255, 255, 0.07)
    shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5)
  level2:
    name: Floating Glass
    bg: rgba(18, 17, 26, 0.70)
    backdropFilter: blur(16px)
    border: 1px solid rgba(255, 255, 255, 0.14)
    shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.6)
  level3:
    name: Active Focus / Modal
    bg: "#121118"
    border: 1px solid rgba(124, 58, 237, 0.35)
    shadow: 0 16px 48px -8px rgba(0, 0, 0, 0.8), 0 0 30px rgba(124, 58, 237, 0.20)
---
</design-context>

# CoreBot Design System (CBDS) Specification

## 1. Design System Philosophy & Architecture

The **CoreBot Design System (CBDS)** unites the high-end editorial aesthetics of developer platforms with real-time Discord bot operations and guild management. The platform operates permanently in a calibrated dark mode: no unstyled light modes, no harsh high-contrast pure white panels. 

### Core Principles
1. **Atmospheric Obsidian Depth**: Backgrounds transition smoothly from pure obsidian (`#050507`) to midnight card surfaces (`#0A0A0E`) and elevated interactive modules (`#121118`).
2. **Precision Glassmorphism**: Glass surfaces use `rgba(18, 17, 26, 0.70)` with 16px backdrop-blur and hairline borders (`rgba(255, 255, 255, 0.07)`).
3. **Intentional Dual-Accent Identity**:
   - **Cyber Violet (`#7C3AED`)**: The platform's primary intelligence and command accent.
   - **CoreBot Gold (`#F5C518`)**: High-value highlights, VIP features, bot status, and key action calls.
4. **Discord-Native Ergonomics**: Discord guild icons, channel hashes (`#`), voice indicators, role pills, and audio state machines look native yet elevated.

---

## 2. Foundations: Color & Token Architecture

### 2.1 Canvas & Surface Tokens

| Token | CSS Variable | Hex / RGBA Value | Purpose |
|---|---|---|---|
| `canvas-pure` | `--color-background` | `#050507` | Deepest root canvas backdrop |
| `surface-card` | `--color-card` | `#0A0A0E` | Default card container, panels, modular blocks |
| `surface-elevated` | `--color-surface-hover` | `#121118` | Hovered cards, drawers, dialog panels |
| `surface-glass` | `--surface-glass` | `rgba(18, 17, 26, 0.70)` | Glassmorphic bars, sticky navigation, modal backdrops |
| `surface-popover` | `--color-popover` | `#0E0E12` | Dropdowns, tooltips, context menus |
| `border-hairline` | `--color-border` | `rgba(255, 255, 255, 0.07)` | Standard container border |
| `border-hairline-strong`| `--border-hairline-strong` | `rgba(255, 255, 255, 0.14)` | Hover borders, active tab dividers |
| `border-accent` | `--border-accent` | `rgba(124, 58, 237, 0.35)` | Violet focused inputs, highlighted cards |
| `border-accent-gold` | `--border-accent-gold` | `rgba(245, 197, 24, 0.35)` | Gold highlighted cards and active VIP badges |

### 2.2 Brand & Semantic Color Ramps

- **Cyber Violet (Primary)**:
  - Base: `#7C3AED` (`--color-secondary` / `--color-ring`)
  - Hover: `#8B5CF6`
  - Deep: `#6D28D9`
  - Subtle Muted: `rgba(124, 58, 237, 0.15)`
  - Atmospheric Glow: `rgba(124, 58, 237, 0.25)`

- **CoreBot Gold (Identity Accent)**:
  - Base: `#F5C518` (`--color-primary`)
  - Hover: `#EAB308`
  - Deep: `#CA8A04`
  - Subtle Muted: `rgba(245, 197, 24, 0.15)`
  - Atmospheric Glow: `rgba(245, 197, 24, 0.20)`

- **Semantic Feedback Ramps**:
  - **Success (Emerald)**: `#10B981` | Background: `rgba(16, 185, 129, 0.12)` | Border: `rgba(16, 185, 129, 0.30)`
  - **Warning (Amber)**: `#F59E0B` | Background: `rgba(245, 158, 11, 0.12)` | Border: `rgba(245, 158, 11, 0.30)`
  - **Destructive / AutoMod (Rose)**: `#EF4444` (`--color-destructive`) | Background: `rgba(239, 68, 68, 0.12)` | Border: `rgba(239, 68, 68, 0.30)`
  - **Info / Calls (Cyan)**: `#06B6D4` | Background: `rgba(6, 182, 212, 0.12)` | Border: `rgba(6, 182, 212, 0.30)`
  - **Discord Blurple**: `#5865F2` | Hover: `#4752C4` | Background: `rgba(88, 101, 242, 0.15)`

---

## 3. Typography Scale & Hierarchy

The CBDS typography is organized across three font families loaded in Next.js:
1. **Playfair Display (`--font-playfair`)**: Editorial serif used exclusively for hero display titles, section marks, and high-impact headlines.
2. **Geist Sans (`--font-geist-sans`)**: Neutral, ultra-legible modern sans used for all interface labels, paragraphs, buttons, and tables.
3. **Geist Mono (`--font-geist-mono`)**: Technical monospace font for code blocks, terminal mockups, slash commands (`/helpcore`), and prefix commands (`core!play`).

### Typography Matrix

| Style Name | Font Family | Size | Weight | Line Height | Letter Spacing | CSS Utility |
|---|---|---|---|---|---|---|
| `display-xxl` | Playfair Display | 72px / 4.5rem | 600 | 1.05 | -0.025em | `font-serif text-5xl md:text-7xl font-semibold tracking-tight` |
| `display-xl` | Playfair Display | 54px / 3.375rem | 600 | 1.08 | -0.02em | `font-serif text-4xl md:text-5xl font-semibold tracking-tight` |
| `display-lg` | Playfair Display | 40px / 2.5rem | 500 | 1.15 | -0.015em | `font-serif text-3xl md:text-4xl font-medium tracking-tight` |
| `heading-xl` | Geist Sans | 30px / 1.875rem | 700 | 1.25 | -0.02em | `font-sans text-2xl md:text-3xl font-bold tracking-tight` |
| `heading-lg` | Geist Sans | 24px / 1.5rem | 600 | 1.30 | -0.015em | `font-sans text-xl md:text-2xl font-semibold` |
| `heading-md` | Geist Sans | 20px / 1.25rem | 600 | 1.35 | -0.01em | `font-sans text-lg md:text-xl font-semibold` |
| `heading-sm` | Geist Sans | 16px / 1.0rem | 600 | 1.40 | normal | `font-sans text-base font-semibold` |
| `body-lg` | Geist Sans | 16px / 1.0rem | 400 | 1.60 | normal | `font-sans text-base text-zinc-300 leading-relaxed` |
| `body-md` | Geist Sans | 14px / 0.875rem | 400 | 1.50 | normal | `font-sans text-sm text-zinc-400 leading-normal` |
| `body-sm` | Geist Sans | 12px / 0.75rem | 400 | 1.45 | normal | `font-sans text-xs text-zinc-500` |
| `code-md` | Geist Mono | 13px / 0.8125rem | 500 | 1.50 | normal | `font-mono text-[13px] text-zinc-300` |
| `code-sm` | Geist Mono | 11px / 0.6875rem | 500 | 1.40 | normal | `font-mono text-[11px] text-zinc-400` |

---

## 4. Elevation, Depth & Radii

### 4.1 Elevation Levels

- **Level 0 — Canvas (`#050507`)**:
  Flat dark ground layer. No shadow, no border.
- **Level 1 — Card (`#0A0A0E`)**:
  Subtle 1px border (`rgba(255, 255, 255, 0.07)`), soft ambient shadow (`0 4px 20px -2px rgba(0, 0, 0, 0.5)`).
- **Level 2 — Floating Glass (`rgba(18, 17, 26, 0.70)`)**:
  16px backdrop-blur filter, 1px border (`rgba(255, 255, 255, 0.14)`), floating depth (`0 8px 32px -4px rgba(0, 0, 0, 0.6)`). Used for sticky navigation headers, command bars, dropdown drawers.
- **Level 3 — Active Focus & Modal (`#121118`)**:
  Prominent violet or gold hairline glow, deep projection shadow (`0 16px 48px -8px rgba(0, 0, 0, 0.8)`), radial glow projection (`0 0 30px rgba(124, 58, 237, 0.20)`).

### 4.2 Corner Radii

- `sm (6px)`: Micro pills, syntax badges, command parameter tags.
- `md (10px)`: Buttons, text inputs, selects, segmented controllers.
- `lg (16px)`: Standard content cards, module blocks, popovers.
- `xl (24px)`: Hero banners, flagship cards, billing plan containers.
- `full (9999px)`: Avatars, status ping indicators, pills, toggle switches.

---

## 5. UI Component Specifications

### 5.1 Buttons

- **Primary White (`variant="default"` / `bg-white`)**:
  - Background: `#FFFFFF`
  - Text: `#050507` (font-semibold)
  - Hover: `#F4F4F5` with subtle elevation
  - Height: 40px (md), 48px (lg), 36px (sm)
  - Radius: `rounded-lg` (10px)
- **Cyber Violet CTA (`variant="secondary"` / `bg-primary`)**:
  - Background: `#7C3AED`
  - Text: `#FFFFFF`
  - Hover: `#8B5CF6` with violet shadow `0 0 20px rgba(124, 58, 237, 0.35)`
- **Secondary Glass (`variant="outline"`)**:
  - Background: `rgba(255, 255, 255, 0.04)`
  - Border: `1px solid rgba(255, 255, 255, 0.10)`
  - Text: `#D4D4D8`
  - Hover: `rgba(255, 255, 255, 0.08)`, border `rgba(255, 255, 255, 0.20)`, text `#FFFFFF`
- **Destructive (`variant="destructive"`)**:
  - Background: `rgba(239, 68, 68, 0.12)`
  - Border: `1px solid rgba(239, 68, 68, 0.30)`
  - Text: `#EF4444`
  - Hover: `rgba(239, 68, 68, 0.25)`, text `#FCA5A5`
- **Ghost (`variant="ghost"`)**:
  - Background: `transparent`
  - Text: `#A1A1AA`
  - Hover: `rgba(255, 255, 255, 0.06)`, text `#EDEDEF`

### 5.2 Form Controls & Inputs

- **Input & Textarea**:
  - Container: 40px height (input), auto height (textarea)
  - Surface: `bg-[#0A0A0E]` (`bg-surface-card` or `bg-zinc-950`)
  - Border: `1px solid rgba(255, 255, 255, 0.10)`
  - Focus Ring: `border-[#7C3AED] ring-1 ring-[#7C3AED]/50`
  - Placeholder: `text-zinc-500`
  - Typography: `Geist Sans 14px`
- **Switch Toggle**:
  - Track: 44px x 24px, `rounded-full`
  - Unchecked state: `bg-zinc-800`
  - Checked state: `bg-[#7C3AED]` with subtle glow
  - Thumb: 20px circle, `#FFFFFF`

### 5.3 Badges & Status Indicators

- **Live Gateway Status**:
  - Green dot with pulsing halo (`#10B981`)
  - Label: `text-xs font-mono text-emerald-400`
- **PRO / VIP Badges**:
  - Background: `linear-gradient(135deg, rgba(245, 197, 24, 0.2), rgba(245, 197, 24, 0.05))`
  - Border: `1px solid rgba(245, 197, 24, 0.35)`
  - Text: `text-[#F5C518] text-xs font-semibold tracking-wider uppercase`
- **Discord Role Pills**:
  - Dot with role color, label in `Geist Sans 12px`, removable `x` button.

---

## 6. Dashboard Module Surfaces

### 6.1 Server Overview Hub
- **Readiness Gauge**: Circular or segmented progress indicator displaying `% de prontidão` with gradient fill (`#7C3AED` to `#10B981`).
- **Feature Matrix Grid**: 2x3 or 3x2 grid of module cards (AutoMod, Tickets, CoreBot AI, Calls Privadas, Welcome, Custom Commands). Each card has:
  - Header with icon and status toggle
  - Mini-metrics summary
  - Action link to dedicated configuration page

### 6.2 Audit Log & Activity Stream
- Infinite or paginated timeline with hairline connector line.
- Actor avatar, action badge (e.g. `MEMBER_BAN`, `CHANNEL_CREATE`, `MUSIC_PLAY`), and humanized timestamp (`2m ago`).

### 6.3 Bot Health & Latency Monitor
- Gateway Ping indicator (Good `< 100ms`, Medium `100-250ms`, Degraded `> 250ms`).
- Shard ID, Uptime counter (`99.98%`), Memory usage gauge.

### 6.4 Music & Audio Player Interface
- Audio state visualizer: Now Playing track title, artist/channel, progress bar with elapsed and remaining time.
- Playback controls: Play/Pause, Skip, Stop, Loop toggle, Volume slider.
- Queue drawer listing upcoming tracks with drag-to-reorder.

---

## 7. Command Architecture & Discord Alignment

### 7.1 `/helpcore` Interactive Slash Command
The interactive help system on Discord is structured into seven distinct functional categories accessible via `StringSelectMenuBuilder`:
1. **Visão Geral**: System status, latency, invite link, active prefixes.
2. **Música (`core!`)**: Full suite of audio reproduction commands (`play`, `stop`, `skip`, `leave`, `queue`, `pause`, `resume`, `np`, `loop`, `help`).
3. **IA & Servidor**: Natural language server management, AI chat assistant, channel binding.
4. **Calls Privadas**: Dynamic voice channel generation, user limit controls, invite/kick permissions.
5. **Tickets 2.0**: Support desk, multi-category creation, interactive buttons, HTML transcripts.
6. **Moderação & AutoMod**: Anti-raid, anti-spam, caps lock filter, domain filter, punishment logs.
7. **Comandos Personalizados**: User-defined responses, custom variables, dynamic embeds.

### 7.2 Prefix `core!` Music Commands
- Prefix: `core!`
- Commands:
  - `core!play <busca ou URL>`: Resolves YouTube/Spotify/Direct streams and appends to the guild queue.
  - `core!stop`: Stops playback, clears the queue, and resets the player state.
  - `core!skip`: Advances to the next track in the FIFO queue.
  - `core!leave`: Disconnects the bot from the current voice channel.
  - `core!queue`: Renders the current track and upcoming list with durations.
  - `core!pause`: Suspends active audio transmission.
  - `core!resume`: Resumes paused audio transmission.
  - `core!np` / `core!nowplaying`: Displays rich embed with track progress bar and duration.
  - `core!loop`: Cycles between loop modes (`off`, `track`, `queue`).
  - `core!help`: Displays quick syntax help for music commands directly in chat.


---

## 8. 3D Perspective & Spatial Depth Engine (CBDS 3D)

The CoreBot Design System applies subtle, hardware-accelerated 3D perspective to elevate key interactive surfaces without cluttering the interface.

### 8.1 Perspective & Tilt Surfaces
- **Canvas Perspective**: `perspective: 1200px` on Hero showcases and `perspective: 1000px` on feature cards.
- **Transform Style**: `transform-style: preserve-3d` with layered `translateZ(10px - 18px)` accents on icons and titles.
- **Hero 3D Animated Terminal (`Hero3D.tsx`)**: Preserves the signature `corebot` macOS-style interactive terminal, enhanced with mouse-reactive `rotateX`/`rotateY` tilt (clamped to `[-9deg, +9deg]`), soft radial hover lighting, and quick tab switching between AI Server Builder (`/construir-servidor`) and Music (`core!play`).
- **3D Feature Cards (`ModulesShowcase.tsx`)**: Interactive tilt cards with clean borders, zero nested sub-boxes, and generous negative space.

### 8.2 Spring Physics
- Cursor tracking normalized between `[-0.5, 0.5]` relative to container bounds.
- Spring dynamics: `mass: 0.4 - 0.5`, `stiffness: 140 - 180`, `damping: 22 - 24` for smooth, non-distracting motion.

---

## 9. Clean Minimalism & Zero-Jargon Content Rules

CoreBot's primary audience consists of Discord community creators, teens, and young adults. Every visible UI string across landing pages, dashboard modules, and documentation must follow these rules:

1. **Zero Technical Jargon**: Never expose engineering terminology in user-facing UI (avoid terms like `RAG Semântico`, `FIFO`, `HTML Transcripts`, `WebSocket latency`, `Schema`, `Auto-Cleanup`, `Bento Grid Architecture`, `320kbps Lossless`). Use natural everyday Portuguese/English instead.
2. **No Visual Clutter or Duplication**: Present one unified feature showcase on the landing page with ample breathing room; do not repeat module grids or stack redundant telemetry bars (`18ms`, `Zero Lag`, etc.).
3. **One-Sentence Card Rule**: Each module or feature card displays an icon, a clear short title, **one** plain sentence describing what it does for the user, and at most one status/command hint.
4. **Action-First Docs**: Keep documentation scannable with short descriptions, ready-to-paste examples, and 1-click copy buttons.
