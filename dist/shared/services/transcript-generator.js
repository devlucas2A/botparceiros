"use strict";
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                  DISCORD HTML TRANSCRIPT GENERATOR                       ║
 * ║            Exportador visual moderno de histórico de tickets              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHtmlTranscript = generateHtmlTranscript;
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function formatContent(content) {
    if (!content)
        return '';
    let escaped = escapeHtml(content);
    // Codeblocks ```code```
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold **text**
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Discord Mentions <@123456789>
    escaped = escaped.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@usuário</span>');
    escaped = escaped.replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#canal</span>');
    escaped = escaped.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention">@cargo</span>');
    // Line breaks
    escaped = escaped.replace(/\n/g, '<br />');
    return escaped;
}
function generateHtmlTranscript(options) {
    const { guild, channelName, closedBy, category, openedBy, summary, messages } = options;
    const now = new Date().toLocaleString('pt-BR');
    const messagesHtml = messages.map(msg => {
        const author = msg.author;
        const isBot = author.bot;
        const avatarUrl = author.displayAvatarURL({ extension: 'png', size: 128 });
        const time = msg.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const date = msg.createdAt.toLocaleDateString('pt-BR');
        const formattedText = formatContent(msg.content);
        const attachmentsHtml = msg.attachments.size > 0 ? `
            <div class="attachments">
                ${msg.attachments.map(att => {
            const isImg = att.contentType?.startsWith('image/');
            if (isImg) {
                return `<a href="${att.url}" target="_blank" rel="noopener noreferrer"><img src="${att.url}" alt="${escapeHtml(att.name)}" class="attachment-img" /></a>`;
            }
            return `<a href="${att.url}" target="_blank" class="attachment-file" rel="noopener noreferrer">📎 ${escapeHtml(att.name)}</a>`;
        }).join('')}
            </div>
        ` : '';
        const embedsHtml = msg.embeds.length > 0 ? `
            <div class="embeds">
                ${msg.embeds.map(emb => `
                    <div class="embed" style="border-left-color: ${emb.hexColor || '#5865F2'}">
                        ${emb.title ? `<div class="embed-title">${escapeHtml(emb.title)}</div>` : ''}
                        ${emb.description ? `<div class="embed-description">${formatContent(emb.description)}</div>` : ''}
                        ${emb.image?.url ? `<img src="${emb.image.url}" class="embed-img" alt="" />` : ''}
                        ${emb.footer?.text ? `<div class="embed-footer">${escapeHtml(emb.footer.text)}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        ` : '';
        return `
        <div class="message">
            <img src="${avatarUrl}" alt="${escapeHtml(author.tag)}" class="avatar" />
            <div class="content">
                <div class="msg-header">
                    <span class="author-name">${escapeHtml(author.username)}</span>
                    ${isBot ? '<span class="bot-badge">BOT</span>' : ''}
                    <span class="timestamp">${date} às ${time}</span>
                </div>
                ${formattedText ? `<div class="msg-body">${formattedText}</div>` : ''}
                ${attachmentsHtml}
                ${embedsHtml}
            </div>
        </div>
        `;
    }).join('\n');
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcrição: ${escapeHtml(channelName)} - ${escapeHtml(guild.name)}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: #313338;
            color: #DBDEE1;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.4;
            padding: 24px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: #2B2D31;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.06);
        }
        .header {
            background: #1E1F22;
            padding: 24px 32px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
        }
        .header h1 {
            color: #FFFFFF;
            font-size: 20px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .meta-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .badge {
            background: #35373C;
            color: #B5BAC1;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge.category { background: #5865F2; color: #FFFFFF; }
        .summary-box {
            background: rgba(139, 92, 246, 0.08);
            border-left: 4px solid #8B5CF6;
            padding: 16px 24px;
            margin: 20px 32px 0 32px;
            border-radius: 8px;
        }
        .summary-box h3 {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #A78BFA;
            margin-bottom: 6px;
            font-weight: 700;
        }
        .summary-box p {
            font-size: 14px;
            color: #E2E8F0;
            line-height: 1.5;
        }
        .chat-body {
            padding: 24px 32px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .message {
            display: flex;
            gap: 16px;
            padding: 6px 0;
            transition: background 0.15s;
        }
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            background: #1E1F22;
            flex-shrink: 0;
        }
        .content {
            flex: 1;
            min-width: 0;
        }
        .msg-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
        }
        .author-name {
            color: #FFFFFF;
            font-weight: 600;
            font-size: 14px;
        }
        .bot-badge {
            background: #5865F2;
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .timestamp {
            color: #949BA4;
            font-size: 12px;
        }
        .msg-body {
            color: #DBDEE1;
            word-break: break-word;
            line-height: 1.5;
        }
        .msg-body code {
            background: #1E1F22;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: Consolas, monospace;
            font-size: 13px;
        }
        .msg-body pre {
            background: #1E1F22;
            padding: 10px 14px;
            border-radius: 8px;
            margin: 8px 0;
            overflow-x: auto;
        }
        .mention {
            background: rgba(88, 101, 242, 0.2);
            color: #C9CDFB;
            padding: 1px 4px;
            border-radius: 3px;
            font-weight: 500;
        }
        .attachments {
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .attachment-img {
            max-width: 320px;
            max-height: 240px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .attachment-file {
            background: #1E1F22;
            color: #00A8FC;
            padding: 8px 12px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 13px;
            display: inline-block;
        }
        .embed {
            background: #1E1F22;
            border-left: 4px solid #5865F2;
            border-radius: 6px;
            padding: 12px 16px;
            margin-top: 8px;
            max-width: 520px;
        }
        .embed-title {
            color: #FFFFFF;
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 6px;
        }
        .embed-description {
            color: #DBDEE1;
            font-size: 13px;
        }
        .embed-img {
            max-width: 100%;
            border-radius: 6px;
            margin-top: 8px;
        }
        .embed-footer {
            color: #949BA4;
            font-size: 11px;
            margin-top: 8px;
        }
        .footer {
            background: #1E1F22;
            padding: 16px 32px;
            text-align: center;
            color: #949BA4;
            font-size: 12px;
            border-top: 1px solid rgba(255,255,255,0.06);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>🎫 ${escapeHtml(channelName)}</h1>
                <div style="font-size: 13px; color: #949BA4; margin-top: 4px;">
                    Servidor: <strong>${escapeHtml(guild.name)}</strong>
                </div>
            </div>
            <div class="meta-badges">
                <span class="badge category">${escapeHtml(category)}</span>
                ${openedBy ? `<span class="badge">Criado por: ${escapeHtml(openedBy)}</span>` : ''}
                <span class="badge">Fechado por: ${escapeHtml(closedBy.user.username)}</span>
                <span class="badge">Mensagens: ${messages.length}</span>
            </div>
        </div>

        ${summary ? `
        <div class="summary-box">
            <h3>🤖 Resumo do Atendimento por IA</h3>
            <p>${escapeHtml(summary).replace(/\n/g, '<br />')}</p>
        </div>
        ` : ''}

        <div class="chat-body">
            ${messagesHtml}
        </div>

        <div class="footer">
            Gerado automaticamente por <strong>CoreBot</strong> em ${now}
        </div>
    </div>
</body>
</html>
`;
}
//# sourceMappingURL=transcript-generator.js.map