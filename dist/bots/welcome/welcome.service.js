"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBanner = generateBanner;
exports.generateBannerFast = generateBannerFast;
const canvas_1 = require("canvas");
const fs_extra_1 = __importDefault(require("fs-extra"));
const https_1 = __importDefault(require("https"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const services_1 = require("../../shared/services");
// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES & UTILS
// ═══════════════════════════════════════════════════════════════════════════
const PREFERRED_FONT = 'NotoSans';
// Registra NotoSans (bundled em fonts/) como fallback universal.
// node-canvas no Linux do Railway pode nao ter sans-serif decente,
// causando tofu (□). NotoSans cobre latim, acentos e emojis basicos.
let notoRegistered = false;
function ensureFallbackFont() {
    if (notoRegistered)
        return;
    try {
        const fontsDir = path_1.default.resolve(process.cwd(), 'fonts');
        const noto = path_1.default.join(fontsDir, 'NotoSans-Regular.ttf');
        if (fs_extra_1.default.existsSync(noto)) {
            const { registerFont } = require('canvas');
            registerFont(noto, { family: 'NotoSans' });
            services_1.logger.info('[font] NotoSans registrada como fallback');
            notoRegistered = true;
        }
        else {
            services_1.logger.warn(`[font] NotoSans-Regular.ttf nao encontrada em ${fontsDir}`);
        }
    }
    catch (e) {
        services_1.logger.warn(`[font] Falha ao registrar NotoSans: ${e.message}`);
    }
}
async function fetchWithTimeout(url, timeout = 5000, headers = { 'User-Agent': 'DiscordBot/1.0' }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers
        });
        clearTimeout(timeoutId);
        return response;
    }
    catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}
const registeredFonts = new Set();
// User-Agents que historicamente fazem o Google Fonts servir formatos
// legados (TTF/WOFF1). Tentamos em sequencia se um nao funcionar.
// node-canvas suporta TTF e OTF nativamente; WOFF1 funciona via fallback;
// WOFF2 NAO funciona — por isso o esforco de evitar.
const LEGACY_UAS = [
    'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)',
    'Mozilla/5.0 (Windows NT 6.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
];
async function loadAndRegisterGoogleFont(fontFamily) {
    ensureFallbackFont(); // Garante NotoSans disponivel mesmo se o Google falhar
    if (registeredFonts.has(fontFamily))
        return fontFamily;
    const cssUrl = `https://fonts.googleapis.com/css?family=${fontFamily.replace(/ /g, '+')}`;
    // Tenta varios UAs ate algum retornar um formato suportado
    for (const ua of LEGACY_UAS) {
        try {
            const cssResp = await fetchWithTimeout(cssUrl, 4000, { 'User-Agent': ua });
            if (!cssResp.ok)
                continue;
            const css = await cssResp.text();
            // Aceita SOMENTE TTF/OTF — node-canvas tem suporte parcial a WOFF
            // e renderiza tofu (□) em muitos casos. Melhor cair no fallback.
            const match = css.match(/url\((https:\/\/[^)]+\.(?:ttf|otf))\)/i);
            if (!match) {
                services_1.logger.info(`[font] UA "${ua.slice(0, 30)}..." nao deu TTF/OTF para ${fontFamily}, tentando proximo`);
                continue;
            }
            const fontUrl = match[1];
            const fontResp = await fetchWithTimeout(fontUrl, 5000);
            if (!fontResp.ok)
                continue;
            const arrayBuffer = await fontResp.arrayBuffer();
            // Detecta extensao pela URL para escrever com extensao correta
            const ext = (fontUrl.match(/\.(ttf|otf)$/i)?.[1] || 'ttf').toLowerCase();
            const fontPath = path_1.default.join(os_1.default.tmpdir(), `${fontFamily.replace(/ /g, '_')}_coreia.${ext}`);
            fs_extra_1.default.writeFileSync(fontPath, Buffer.from(arrayBuffer));
            const { registerFont } = await Promise.resolve().then(() => __importStar(require('canvas')));
            registerFont(fontPath, { family: fontFamily });
            registeredFonts.add(fontFamily);
            services_1.logger.info(`🎨 Fonte ${fontFamily} carregada (${ext.toUpperCase()})`);
            return fontFamily;
        }
        catch (e) {
            services_1.logger.warn(`[font] Tentativa com UA "${ua.slice(0, 30)}..." falhou: ${e.message}`);
        }
    }
    services_1.logger.warn(`[font] Nao foi possivel obter ${fontFamily} em formato suportado — usando NotoSans (fallback)`);
    return PREFERRED_FONT;
}
/**
 * Carrega imagem de URL externa (ex: Cloudinary) de forma robusta.
 * loadImage() direto na URL costuma falhar sem User-Agent ou em hosts
 * que respondem 403 sem header — entao baixamos via fetch e damos
 * o buffer para o canvas.
 */
async function loadImageFromUrl(urlOrPath) {
    // Caminho local existente: usa direto
    if (!/^https?:\/\//i.test(urlOrPath)) {
        try {
            if (fs_extra_1.default.existsSync(urlOrPath))
                return await (0, canvas_1.loadImage)(urlOrPath);
        }
        catch (e) {
            services_1.logger.warn(`[welcome] loadImage local falhou: ${urlOrPath}`, { e });
        }
        return null;
    }
    // URL: baixa com fetch para garantir User-Agent + timeout
    try {
        const resp = await fetchWithTimeout(urlOrPath, 5000);
        if (!resp.ok) {
            services_1.logger.warn(`[welcome] background HTTP ${resp.status}: ${urlOrPath}`);
            return null;
        }
        const arrayBuffer = await resp.arrayBuffer();
        return await (0, canvas_1.loadImage)(Buffer.from(arrayBuffer));
    }
    catch (e) {
        services_1.logger.warn(`[welcome] fetch do background falhou: ${urlOrPath}`, { e });
        return null;
    }
}
async function loadAvatarSafe(urlToLoad) {
    try {
        const resp = await fetchWithTimeout(urlToLoad, 3000);
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        const arrayBuffer = await resp.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        return await (0, canvas_1.loadImage)(buf);
    }
    catch (error) {
        services_1.logger.warn('Falha ao carregar avatar via fetch');
    }
    // Fallback: https.get
    try {
        const imageBuffer = await new Promise((resolve, reject) => {
            const urlObj = new url_1.URL(urlToLoad);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                timeout: 2000,
                headers: { 'User-Agent': 'DiscordBot/1.0' }
            };
            const req = https_1.default.request(options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
            req.on('error', (e) => reject(e));
            req.end();
        });
        return await (0, canvas_1.loadImage)(imageBuffer);
    }
    catch (error) {
        services_1.logger.warn('Fallback https.get também falhou');
    }
    return null;
}
function drawCosmicBackground(ctx, width, height) {
    // Base gradient escuro
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0a0015');
    bgGradient.addColorStop(0.3, '#1a0033');
    bgGradient.addColorStop(0.6, '#0d001a');
    bgGradient.addColorStop(1, '#05000a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    // Nebulosas
    const nebulas = [
        { x: 150, y: 100, r: 200, color1: 'rgba(138, 43, 226, 0.15)', color2: 'rgba(138, 43, 226, 0)' },
        { x: 650, y: 450, r: 250, color1: 'rgba(0, 191, 255, 0.12)', color2: 'rgba(0, 191, 255, 0)' },
        { x: 400, y: 300, r: 300, color1: 'rgba(255, 0, 128, 0.08)', color2: 'rgba(255, 0, 128, 0)' },
    ];
    nebulas.forEach(neb => {
        const nebGrad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
        nebGrad.addColorStop(0, neb.color1);
        nebGrad.addColorStop(1, neb.color2);
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, width, height);
    });
    // Estrelas
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 2 + 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    // Grid futurístico sutil
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }
}
/** Substitui {user}, {server} e {memberCount} no template. */
function interpolateMessage(text, member) {
    const username = member.user?.username || member.displayName || 'Usuário';
    const serverName = member.guild?.name || 'Servidor';
    const memberCount = member.guild?.memberCount || 0;
    return (text || '')
        .replace(/\[username\]/g, username)
        .replace(/\{user\}/gi, username)
        .replace(/\{server\}/gi, serverName)
        .replace(/\{member[Cc]ount\}/g, String(memberCount));
}
/**
 * Quebra o texto em multiplas linhas respeitando uma largura maxima.
 * Reduz a fonte automaticamente se nao couber em ate `maxLines` linhas.
 * Retorna { lines, fontSize }.
 */
function wrapText(ctx, text, maxWidth, fontFace, startSize = 48, minSize = 24, maxLines = 2) {
    for (let size = startSize; size >= minSize; size -= 2) {
        ctx.font = `bold ${size}px "${fontFace}", sans-serif`;
        const words = text.split(/\s+/);
        const lines = [];
        let current = '';
        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (ctx.measureText(candidate).width <= maxWidth) {
                current = candidate;
            }
            else {
                if (current)
                    lines.push(current);
                current = word;
            }
        }
        if (current)
            lines.push(current);
        if (lines.length <= maxLines)
            return { lines, fontSize: size };
    }
    // Fallback: trunca com elipse
    ctx.font = `bold ${minSize}px "${fontFace}", sans-serif`;
    const truncated = text.length > 80 ? text.slice(0, 77) + '…' : text;
    return { lines: [truncated], fontSize: minSize };
}
async function generateBanner(member, text, backgroundPath = null, font = null, mode = 'welcome') {
    const username = member.user?.username || member.displayName || 'Usuário';
    services_1.logger.info(`Gerando banner (${mode}) para ${username}`);
    const W = 800;
    const H = 360;
    const canvas = (0, canvas_1.createCanvas)(W, H);
    const ctx = canvas.getContext('2d');
    ensureFallbackFont();
    const selectedFont = font ? await loadAndRegisterGoogleFont(font) : PREFERRED_FONT;
    // ─── Fundo ──────────────────────────────────────────────────────────
    let backgroundImage = null;
    if (backgroundPath) {
        services_1.logger.info(`[welcome] Tentando carregar background: ${backgroundPath}`);
        backgroundImage = await loadImageFromUrl(backgroundPath);
        if (!backgroundImage) {
            services_1.logger.warn(`[welcome] Background nao carregado, usando fundo padrao: ${backgroundPath}`);
        }
    }
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, W, H);
        // Overlay escuro para legibilidade do texto
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, W, H);
    }
    else {
        drawCosmicBackground(ctx, W, H);
    }
    // ─── Avatar (lateral esquerda, circular) ────────────────────────────
    const avatarSize = 140;
    const avatarX = 60;
    const avatarY = (H - avatarSize) / 2;
    const avatarCenterX = avatarX + avatarSize / 2;
    const avatarCenterY = avatarY + avatarSize / 2;
    const avatarRadius = avatarSize / 2;
    let avatarURL = member.user?.displayAvatarURL({ extension: 'png', size: 256 }) || '';
    if (avatarURL.includes('.webp'))
        avatarURL = avatarURL.replace('.webp', '.png');
    const avatar = await loadAvatarSafe(avatarURL);
    // Anel sutil ao redor do avatar (cor depende do mode)
    const ringColor = mode === 'welcome' ? 'rgba(96, 165, 250, 0.85)' : 'rgba(248, 113, 113, 0.85)';
    ctx.save();
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Avatar (clip circular)
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.clip();
    if (avatar) {
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    }
    else {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 64px "${selectedFont}", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(username.charAt(0).toUpperCase(), avatarCenterX, avatarCenterY);
    }
    ctx.restore();
    // ─── Texto (lateral direita) ────────────────────────────────────────
    const textAreaX = avatarX + avatarSize + 40; // 240
    const textAreaWidth = W - textAreaX - 40; // ~520
    const labelColor = mode === 'welcome' ? '#60a5fa' : '#f87171';
    const labelText = mode === 'welcome' ? '✦ NOVO MEMBRO' : '✦ ATÉ LOGO';
    // Label superior
    ctx.save();
    ctx.font = `bold 14px "${selectedFont}", sans-serif`;
    ctx.fillStyle = labelColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(labelText, textAreaX, 70);
    ctx.restore();
    // Mensagem principal — sem CAPS, com word-wrap, fonte auto-fit
    const message = interpolateMessage(text, member);
    const wrapped = wrapText(ctx, message, textAreaWidth, selectedFont, 40, 22, 3);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.font = `bold ${wrapped.fontSize}px "${selectedFont}", sans-serif`;
    const lineHeight = wrapped.fontSize * 1.15;
    const textBlockY = 100;
    wrapped.lines.forEach((line, i) => {
        ctx.fillText(line, textAreaX, textBlockY + i * lineHeight);
    });
    ctx.restore();
    // Linha inferior: server + contador (sutil)
    const memberCount = member.guild?.memberCount || 0;
    const serverName = member.guild?.name || '';
    const footerText = mode === 'welcome'
        ? `${serverName} • membro #${memberCount}`
        : `${serverName} • ${memberCount} ${memberCount === 1 ? 'membro' : 'membros'}`;
    ctx.save();
    ctx.font = `14px "${selectedFont}", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(footerText, textAreaX, H - 50);
    ctx.restore();
    return canvas.toBuffer();
}
async function generateBannerFast(member, text, backgroundPath = null, font = null, mode = 'welcome') {
    const username = member?.user?.username || member?.displayName || 'Usuário';
    const W = 800;
    const H = 360;
    const canvas = (0, canvas_1.createCanvas)(W, H);
    const ctx = canvas.getContext('2d');
    ensureFallbackFont();
    const selectedFont = font ? await loadAndRegisterGoogleFont(font) : PREFERRED_FONT;
    // Fundo (suporta URL HTTP ou caminho local)
    let backgroundImage = null;
    if (backgroundPath) {
        backgroundImage = await loadImageFromUrl(backgroundPath);
    }
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, W, H);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, W, H);
    }
    else {
        // Fundo escuro sobrio
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#0f172a');
        bg.addColorStop(1, '#1e293b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
    }
    // Avatar placeholder (somente inicial, sem gradient laranja absurdo)
    const avatarSize = 140;
    const avatarX = 60;
    const avatarY = (H - avatarSize) / 2;
    const avatarCenterX = avatarX + avatarSize / 2;
    const avatarCenterY = avatarY + avatarSize / 2;
    const avatarRadius = avatarSize / 2;
    const ringColor = mode === 'welcome' ? '#60a5fa' : '#f87171';
    ctx.save();
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 64px "${selectedFont}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(username.charAt(0).toUpperCase(), avatarCenterX, avatarCenterY);
    ctx.restore();
    // Texto
    const textAreaX = avatarX + avatarSize + 40;
    const textAreaWidth = W - textAreaX - 40;
    const message = interpolateMessage(text, member);
    const wrapped = wrapText(ctx, message, textAreaWidth, selectedFont, 36, 22, 3);
    ctx.save();
    ctx.fillStyle = mode === 'welcome' ? '#60a5fa' : '#f87171';
    ctx.font = `bold 14px "${selectedFont}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(mode === 'welcome' ? '✦ NOVO MEMBRO' : '✦ ATÉ LOGO', textAreaX, 70);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${wrapped.fontSize}px "${selectedFont}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lineHeight = wrapped.fontSize * 1.15;
    wrapped.lines.forEach((line, i) => {
        ctx.fillText(line, textAreaX, 100 + i * lineHeight);
    });
    ctx.restore();
    return canvas.toBuffer();
}
//# sourceMappingURL=welcome.service.js.map