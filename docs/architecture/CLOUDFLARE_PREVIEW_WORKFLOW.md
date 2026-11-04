# Cloudflare preview workflow

PIERCE uses a Vite-built single-page frontend for browser previews and a Tauri desktop shell for native Windows features.

## Cloudflare Workers configuration

- Wrangler config: `wrangler.jsonc`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler preview`
- Output directory: `dist/`
- SPA fallback: enabled through `not_found_handling`

The Cloudflare Worker serves only the built web frontend. Tauri commands, WASAPI capture, and other native Windows capabilities are unavailable in this browser preview and must remain feature-detected in the UI.

## One-time Cloudflare setup

1. Open Cloudflare Dashboard > Workers & Pages.
2. Create an application and choose Workers > Connect to Git.
3. Authorize the GitHub account and select `citrino701/PIERCE-Music-Companion`.
4. Set the production branch to `main`.
5. Set the build command to `npm run build`.
6. Set the deploy command to `npx wrangler deploy`.
7. Enable Preview Builds and set the Preview command to `npx wrangler preview`.
8. Confirm the Worker name is `pierce-music-companion`, matching `wrangler.jsonc`.

Cloudflare Workers Builds can then publish a preview for pushes to non-production branches and attach the preview URL to an open GitHub pull request.

## Development loop

1. Implement a focused change on a feature branch.
2. Push commits to GitHub.
3. Open or update a pull request into the integration branch.
4. Review the Cloudflare preview URL and GitHub build status.
5. Merge only after review.
6. Production deployment is reserved for the configured production branch (`main`).

For the current desktop work, keep the native Tauri shell and browser preview in the same repository. The preview is for interface and web-compatible behavior, not proof that native Windows features work.
