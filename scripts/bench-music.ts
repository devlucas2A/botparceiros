import { resolveTracks, createAudioStream, warmupMusicSources } from '../src/bots/music/extractor';

(async () => {
    warmupMusicSources();

    const queries = [
        'ainda vou chegar',
        'gin de 10',
        'talvez voce precise de mim',
        'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
        'https://www.deezer.com/track/3408825081'
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
        const totalMs = Date.now() - t0;
        console.log(`✅ [${q}] -> "${tracks[0].title}" | busca ${tSearch}ms | ÁUDIO PRONTO EM ${totalMs}ms`);
        res.playStream.destroy();
    }
    process.exit(0);
})();
