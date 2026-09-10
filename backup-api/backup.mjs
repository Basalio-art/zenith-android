import {
  HttpClient,
  startServer,
  GogoanimeProvider,
  AnimeParadiseProvider,
  AnikotoProvider,
  MegaPlayProvider,
  GoyabuProvider
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
  port: 9190,
  proxy: true
});

