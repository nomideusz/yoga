# szkolyjogi.pl

Yoga school directory for Poland. Built with SvelteKit 5, Turso (libsql), Drizzle ORM.

Live at [szkolyjogi.pl](https://szkolyjogi.pl).

## Development

```sh
pnpm install
pnpm dev
```

## Search

Search system spec (not yet fully integrated): [docs/search-spec.md](./docs/search-spec.md)

Implementation lives in `src/lib/search/` — engine, resolver, normalize, geo, indexer.
