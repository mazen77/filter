# Portal Roulette — GitHub Pages edition

A mobile-first, browser-based hand-tracking camera experience. Everything runs
locally in the visitor's browser; there is no backend and camera frames are not
uploaded.

## Publish on GitHub Pages

1. Create a new public GitHub repository.
2. Upload the contents of this folder to the repository root. `index.html` must
   be at the root, not inside another folder.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select your main branch and the `/ (root)` folder, then save.
6. Open the URL GitHub shows after deployment finishes.

Camera access requires HTTPS. GitHub Pages supplies HTTPS automatically. The
The complete MediaPipe runtime and hand model are included in the repository.
The camera is intentionally limited to a mobile-safe resolution for reliable
tracking on GitHub Pages.

When opened directly as a local `file://` page, model assets load from the
pinned CDN because browsers block WebAssembly/model fetches from local files.
On GitHub Pages, all assets load from the included `vendor` directory.

## Local testing

Do **not** double-click `index.html`; a `file://` page is not a reliable test for
the MediaPipe model. Open Terminal/Command Prompt inside this extracted folder,
run `python -m http.server 8080`, then open `http://localhost:8080` in Chrome or
Edge. On macOS/Linux, use `python3 -m http.server 8080` if needed. Stop the test
server with `Ctrl+C`.

When tracking works, cyan dots appear on both index fingertips and green dots
appear on both thumb tips. Move far enough from the camera for both complete
hands to fit. Bring the two hands together until the portal changes, then move
them apart before trying again.

## Browser support

Use a recent version of Chrome, Edge, Safari, or Firefox. Recording format is
WebM where supported; photos are JPEG. Sharing uses the device's native share
sheet when available and otherwise downloads the result.
