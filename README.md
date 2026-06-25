# ACCHymns

Mobile app for browsing Apostolic Christian Church (Nazarene) hymnals. Ships as **Hymnal** on iOS and Android ([acchymns.app](https://acchymns.app)).

Built with Expo SDK 56 and [Expo Router](https://docs.expo.dev/router/introduction/). Screens live in `app/`, shared UI in `components/`, and most non-UI logic in `scripts/`.

## Development

This project uses a [development build](https://docs.expo.dev/develop/development-builds/introduction/), not Expo Go. Several native modules (Skia, audio, file hashing, etc.) require it.

```bash
npm install
npx expo start
```

Run on a simulator or device:

```bash
npm run ios
npm run android
```

Copy `.env` from a teammate or your secrets store before running locally. The app reads `EXPO_PUBLIC_ACCHYMNS_KEY` (Discover API) and `EXPO_PUBLIC_POSTHOG_KEY` (analytics).

Hymnal packages are downloaded at runtime from [ACC-Hymns/books](https://github.com/ACC-Hymns/books). On first launch the app pulls the default set (ZH, GH, HG, JH); additional hymnals can be added from Settings.

## Scripts

| Command | |
| --- | --- |
| `npm start` | Metro dev server |
| `npm run ios` / `npm run android` | Native dev build |
| `npm test` | Jest (watch mode) |
| `npm run lint` | ESLint |
| `npm run release -- -p ios --profile production` | EAS build + App Store submit |

See `scripts/eas-release.js` for release flags (`--local`, `--no-submit`, etc.). Build profiles are in `eas.json`.

## Layout

```
app/           Routes (tabs: home, search, discover, bookmarks, settings)
components/    Shared UI
constants/     Types, theme, context
hooks/         React hooks
locales/       i18n strings (en, es, fr, de, pt, sr)
scripts/       Hymnal downloads, broadcast, deep links, release tooling
```

Settings includes broadcast controls for pushing hymns and scripture to AWS displays and HymnSign, plus hymn package updates and release-tag switching for testing new book data.

## Related repos

- [ACC-Hymns/books](https://github.com/ACC-Hymns/books) — hymnal package source
