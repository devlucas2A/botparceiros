/**
 * Comando /construir-servidor — fluxo completo:
 *   1. Coleta estado atual do servidor (Fase 2)
 *   2. Gera plano com IA usando opcoes (estilo/tamanho/idioma) (Fase 4)
 *   3. Mostra preview com botoes Confirmar/Regerar/Cancelar (Fase 1)
 *   4. Ao confirmar, aplica com progress streaming no embed (Fase 5)
 *   5. Persiste a geracao no DB para suporte a /desfazer-servidor (Fase 7)
 *
 * As mensagens iniciais nos canais (Fase 6) e o suporte a is_readonly/
 * writable_roles + fallback Community (Fase 3) ficam no serverBuilder.buildServer.
 */
import { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
export declare function handleConstruirServidor(interaction: ChatInputCommandInteraction): Promise<void>;
export declare function handleServerBuilderButton(interaction: ButtonInteraction): Promise<void>;
export declare function handleDesfazerServidor(interaction: ChatInputCommandInteraction): Promise<void>;
//# sourceMappingURL=command.d.ts.map