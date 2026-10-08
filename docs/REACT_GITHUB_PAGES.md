# PixelForge React GitHub Pages

The public URL is expected to be:

**https://michaelwave369.github.io/parallax-pixelforge/**

It becomes live **after** this change is merged, the GitHub Pages source is set to **GitHub Actions**, and the deploy job succeeds. Do not treat it as live until Pages confirms the deployment.

## Architecture

This first React delivery is a **real React/Vite home and navigation experience**, not a claim that the original ~1 MB PixelForge editor was rewritten in React.

| Route | Technology | Capabilities |
|---|---|---|
| `/` | React + Vite | Responsive portal, search, workspace navigation, capability hints, browser-local project indicator |
| `/studio/` | Existing PixelForge JavaScript app | Full 2D Creator Studio, saved projects and available in-browser creator features |
| `/vr-studio/` | Existing WebGL2/experimental WebXR app | Scene graph, transformations, JSON roundtrips, local GLB proxy staging |
| `/external-preview/` | Existing WebGL2 app | Static GLB inspection and preview receipts |

The legacy Studio gets a `<base href="../">` tag at build time only, so its existing relative resource and sibling-app URLs continue to resolve from the Pages project root. The repository's original `index.html` is **not** changed by this build.

## Enable Pages

1. Open **Repository → Settings → Pages**.
2. Under **Build and deployment**, choose **Source: GitHub Actions**.
3. Merge the `feat/react-github-pages-portal` PR once the checks are green.
4. The `PixelForge React Pages` action builds React, stages approved public files, uploads an artifact and deploys the Pages site on `main`. PRs run the same build and staging verification without deployment.
5. Follow the deployment link shown by the Action, then verify all three workspace buttons manually.

Only the owner changes this repository setting. The PR does not change branch protection, enable Pages on the user's behalf, or publish a private local vault.

## Local build

Node.js 24:

```bash
npm --prefix site install --no-audit --no-fund
npm --prefix site test
npm --prefix site run build
npm --prefix site run preview
```

Vite is configured for a **project Pages base** `/parallax-pixelforge/`. The preview server uses that base too. The generated artifact is `dist/`, gitignored. This does not change the existing Python-backed `npm run start` Studio flow at localhost:3690.

## Safety / limitations

- The Pages artifact uses a strict source allowlist: original Studio JS/CSS, browser UI assets, selected public game data and the two viewer directories. It does **not** publish `local-assets/`, repo-level commands, build caches, `.env`, agent credentials or all of `scripts/`.
- The GLB inspector's default vault URL targets a **local-only path** and cannot load such a path on Pages. Its **Open local GLB** button is suitable for browser-local inspection, subject to qualification boundaries.
- Static Pages cannot run local Ollama, Unreal export executors, user-controlled network bridges or desktop PhiCade runtimes. It is an interactive static browser surface, **not** a hosted backend.
- Browser localStorage on GitHub Pages is isolated from localhost localStorage. Saved projects are not synced between the two sites. Export and import JSON to move a project manually.
- Immersive WebXR still requires a supported device/browser. The VR Studio does not yet claim headset comfort, locomotion or controller interaction qualification.
- Moving the **entire** original PixelForge editor into React remains a later modular migration. This PR establishes the shell and reliable publishing boundary first.

## Acceptance checks

- `npm --prefix site test` passes local-vault exclusion with a synthetic future `local-assets` directory.
- `npm --prefix site run build` passes root React bundle, project-base verification and route presence.
- `dist/index.html` loads the bundled React app, not the old Studio.
- `dist/studio/index.html` contains a correct relative base tag and resolves legacy root scripts.
- `dist/vr-studio/index.html` and `dist/external-preview/index.html` have browser module imports present.
- Browser manual: test all three routes, narrow viewport, JSON round-trip, browser-local state visibility and missing XR capability.
