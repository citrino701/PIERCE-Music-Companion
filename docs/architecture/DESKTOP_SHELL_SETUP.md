# Desktop shell setup

The repository now contains the initial Tauri 2 shell under `src-tauri/`.
The shell exposes two read-only commands:
- `native_runtime_status`: confirms the native runtime is responding.
- `audio_capture_status`: explicitly reports `not-implemented` until WASAPI capture exists.

## Run on Windows

Install Node.js LTS and Rust with the MSVC toolchain, then from the repository root:

```powershell
npm install
npm run desktop:dev
```

Create a production desktop build with:

```powershell
npm run desktop:build
```

The current window keeps native decorations enabled to preserve standard Windows
window controls. Audio capture is not active in this milestone. The next native
milestone is WASAPI loopback, not microphone access.
