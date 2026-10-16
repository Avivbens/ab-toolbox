# ab-toolbox

A monorepo of small, focused tools published to npm under the `@ab-toolbox` scope.

## Packages

| Package                                        | Description                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [`@ab-toolbox/grabvid`](projects/libs/grabvid) | Download videos and HLS streams from pages that block yt-dlp, with an interactive quality picker and resumable downloads |

## Development

Requires Node.js 22+ and pnpm (the version is pinned in `package.json` and picked up by Corepack).

```bash
pnpm install
pnpm build       # build every package
pnpm test        # run every test suite
pnpm lint        # lint every package
pnpm typecheck   # type-check every package
```

### Adding a package

```bash
pnpm exec nx g @ab-toolbox/workspace:generate-lib <name>
```

This creates `projects/libs/<name>`, published as `@ab-toolbox/<name>`. Each package is ESM-only, built with `tsc` into its own `dist/`, and only `dist/`, `README.md` and `LICENSE` are packed.

### Releasing

Releases are handled by [`nx release`](https://nx.dev/features/manage-releases) on every push to `master`:

- Each package is versioned independently from its [Conventional Commits](https://www.conventionalcommits.org/) (`fix` → patch, `feat` → minor, `BREAKING CHANGE` → major).
- A `CHANGELOG.md` is written per package, tagged as `<package>@<version>`, and released on GitHub.
- Packages are published to npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers) from GitHub Actions, so no npm token is stored in the repo.

npm only accepts a trusted publisher on a package that already exists, so a new package has to reach npm once by hand **before** you merge it:

1. Make sure the `ab-toolbox` npm org exists and you are logged in (`npm login`).
2. Build it and publish its initial version (the `0.0.0` in its `package.json`):
   ```bash
   pnpm exec nx run @ab-toolbox/<name>:build
   cd projects/libs/<name> && npm publish --access public
   ```
3. On npmjs.com, open the package settings and add `Avivbens/ab-toolbox` with workflow `release.yaml` as a trusted publisher.

Then merge. CI runs `nx release --first-release` on every push, so a package without a release tag yet gets its first version from `package.json` and a changelog from its full commit history, and is published like any other.

## License

[MIT](LICENSE)
