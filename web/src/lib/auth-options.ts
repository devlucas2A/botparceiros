import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions: NextAuthOptions = {
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID ?? "",
            clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
            issuer: "https://discord.com/api/oauth2",
            authorization: { params: { scope: 'identify email guilds' } },
        }),
    ],
    callbacks: {
        async redirect({ url, baseUrl }) {
            // Se for URL relativa (/dashboard, etc), combina diretamente com baseUrl
            if (url.startsWith("/")) {
                return `${baseUrl}${url}`;
            }

            try {
                const parsedUrl = new URL(url);
                const parsedBase = new URL(baseUrl);

                // Se a URL já aponta para a mesma origem completa (protocolo + host + porta)
                if (parsedUrl.origin === parsedBase.origin) {
                    return url;
                }

                // Se for o mesmo hostname (ex: localhost), assegura protocolo e porta corretos
                if (parsedUrl.hostname === parsedBase.hostname) {
                    parsedUrl.port = parsedBase.port;
                    parsedUrl.protocol = parsedBase.protocol;
                    return parsedUrl.toString();
                }

                // Railway: remove apenas porta 8080 interna se tiver vazado em produção
                if (parsedUrl.port === '8080') {
                    parsedUrl.port = '';
                    return parsedUrl.toString();
                }
            } catch {
                return baseUrl;
            }

            return baseUrl;
        },
        async jwt({ token, account }: any) {
            if (account) {
                token.accessToken = account.access_token;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session?.user) {
                session.user.id = token.sub;
                session.accessToken = token.accessToken;
            }
            return session;
        },
    },
};
