import {
  HttpClient,
  startServer,
  GogoanimeProvider,
  AnimeParadiseProvider,
  AnikotoProvider,
  MegaPlayProvider,
  GoyabuProvider,
  AnilistMeta
} from 'anime-sdk';

const http = new HttpClient({
  timeoutMs: 15_000
});

const server = startServer({
  providers: [
    new GogoanimeProvider(http),
    new AnimeParadiseProvider(http),
    new AnikotoProvider(http),
    new MegaPlayProvider(http),
    new GoyabuProvider(http)
  ],
  metaProviders: [new AnilistMeta(http)],
  port: 9191,
  proxy: true
});
