import { resolveTracks, createAudioStream, warmupMusicSources } from '../src/bots/music/extractor';

(async () => {
    warmupMusicSources();
    await new Promise(r => setTimeout(r, 2500)); // simula o bot já ligado (warmup feito)

    const queries = [
        'talvez voce precise de mim',
        'bohemian rhapsody',
        'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
        'https://www.youtube.com/watch?v=abc'
    ];

    for (const q of queries) {
        const t0 = Date.now();
        const tracks = await resolveTracks(q, {} as any);
        const tSearch = Date.now() - t0;
        if (!tracks.length) {
            console.log(`[${q}] -> nenhuma faixa (${tSearch}ms)`);
            continue;
        }
        const res = await createAudioStream(tracks[0]);
        const first = await new Promise<number>(resolve => {
            res.playStream.once('readable', () => resolve(Date.now() - t0));
        });
        console.log(`[${q}] -> "${tracks[0].title}" | busca ${tSearch}ms | áudio tocando em ${first}ms`);
        res.playStream.destroy();
    }
    process.exit(0);
})();
