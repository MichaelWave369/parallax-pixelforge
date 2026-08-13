# Parallax adaptation export

PixelForge cartridges may expose a native `src/cartridge.js` module containing their playable scene graph plus creator-controlled adaptation metadata.

Run:

```bash
npm run adaptation:export -- games/starter
```

This writes `games/starter/parallax-adaptation.json` using schema `parallax.pixelforge.adaptation-export.v0.1` and binds it to the current Git commit. `--check` validates without writing and `--stdout` emits JSON to stdout.

The playable game and adaptation export must import/read the same cartridge module so story content does not fork into two independent sources of truth.
