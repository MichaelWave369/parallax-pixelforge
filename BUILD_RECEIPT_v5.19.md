# PixelForge v5.19 — Build Receipt

## Legend Audio Pass

- Package: `5.19.0-alpha`
- Cartridge: `the-legend-of-more-bounce`
- Required final art: **8 / 8 READY**
- Audio cue pack: **10 / 10 READY**
- Looping scene themes: **4**
- Event SFX: **6**
- Audio format: **mono PCM16 WAV @ 22,050 Hz**
- Network dependency: **none**
- External samples/music: **none**

## Cue inventory

- `title` — Title screen music — 17.143 s — `sha256:ec8332911d4c51780370010a0e9ce29593634009dfc4e3ca29d99f164e8d47f1`
- `overworld` — Bouncehome Grove music — 15.484 s — `sha256:7a88c4463521dcec684772599e566aba366a63774df7ed1997952802451397de`
- `woods` — Wobble Woods music — 13.913 s — `sha256:e6381b21a20b24f9042c974967ba2a3bd0e5f9cc58c50d9d8230d203d383a859`
- `tower` — Larrina Tower music — 21.818 s — `sha256:04a422cc59602fa1ed9a30201e7cd6152b2b6eb1218019de68b45c2cc4e91be2`
- `bounce-impact` — Bounce pad impact — 0.28 s — `sha256:c6ade6d9a99472584f0b58b62ecab43f2e97ebf0074ba7662a7964bc330623cd`
- `rune-pickup` — Bounce Rune pickup — 0.75 s — `sha256:174c56abce9cf240d5e6fcafc88b0f64fd14b87926d7d4fea7e60ef443c23c24`
- `gate-open` — Echo Gate opening — 1.25 s — `sha256:2d858223ef371fb28b17fae7cd232654c0a0c67185665378fe64e6e36b460872`
- `dialogue-blip` — Dialogue text blip — 0.055 s — `sha256:ab264c5f102791dba1c1c86c635d8687992c2f2b3d393913810ebeb3fd1467dc`
- `hit` — Damage/fall hit — 0.3 s — `sha256:679f368619a69caded09fe47550e0223bb7b49205a61eb49364866ffcf78ac76`
- `ending` — Run-complete ending sting — 2.8 s — `sha256:bf9e54e70b37487dbd2bd7eb552db386eff901e6be175982fb4a288c170dd435`

## Runtime bindings

- Bouncehome Grove → `overworld` music
- Wobble Woods → `woods` music + bounce/Rune/Gate/hit SFX
- Larrina Tower → `tower` music + dialogue blip
- Run completion → `ending` sting
- Browser sound requires explicit user enablement; autoplay is not assumed.

## Evidence boundary

Machine checks can prove file presence, PCM format, sample rate, cue inventory, hashes, rights declarations, local packaging, and runtime references. They cannot prove musical quality, comfortable mix levels, fun, aesthetic quality, sufficient commercial content depth, $3.69 value, or store readiness. Human Gold Standard review remains required.

## Expected final validation

```bash
npm run github:preflight
```

Status: **PASS** — the complete historical `npm run github:preflight` completed successfully on the v5.19 source tree after audio generation, binding, audit, retention migration, and public-release validation.
