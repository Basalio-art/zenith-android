import {
  HttpClient,
  GogoanimeProvider,
} from 'anime-sdk';

const http = new HttpClient({
  timeoutMs: 20_000,
});

const gogo = new GogoanimeProvider(http);

try {
  // 1. SEARCH
  console.log('🔎 Searching...\n');

  const results = await gogo.search(
    'opm'
  );

  console.log('SEARCH RESULTS:');
  console.dir(results, { depth: null });


  // 2. FIND SEASON 4
  const anime =
    results.find((x) =>
      x.title.toLowerCase().includes('season 4')
    ) || results[0];

  console.log('\n📺 SELECTED ANIME:');
  console.dir(anime, { depth: null });


  // 3. FETCH EPISODES
  console.log('\n📚 Fetching episodes...\n');

  const episodes = await gogo.fetchContentUnits(anime.id);

  console.log(`Found ${episodes.length} episodes`);

  console.dir(episodes, { depth: null });


  // 4. GET LATEST EPISODE
  const latestEpisode = episodes[episodes.length - 1];

  console.log('\n🔥 LATEST EPISODE:');
  console.dir(latestEpisode, { depth: null });


  // 5. RESOLVE STREAM
  console.log('\n🎬 Resolving stream...\n');

  const stream = await gogo.resolveStream(
    latestEpisode.id,
    'sub'
  );

  console.log('STREAM RESULT:');
  console.dir(stream, { depth: null });

} catch (error) {
  console.error('\n❌ anime-sdk failed:');
  console.error(error);
}