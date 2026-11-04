# Playback and audio integration boundary

## Current state

The React experience still runs on catalog/demo data and a simulated playback clock. The simulated audio features are visual test signals, not measurements from the system output. No Spotify or WASAPI integration is claimed by this foundation change.

## Provider boundaries

- `PlaybackProvider` supplies normalized track metadata, playback state, position, and transport commands.
- `AudioAnalysisProvider` supplies measured `AudioFeatures` independently from track metadata.
- UI components consume normalized application types. They must not depend on Spotify SDK response objects, OAuth tokens, Windows audio handles, or native process details.
- Provider health is represented by `IntegrationHealth`; credentials must never enter UI state or logs.

## Planned adapters

1. `DemoPlaybackProvider`: current catalog and simulated clock, retained for deterministic UI development.
2. `SpotifyPlaybackProvider`: metadata/playback-state adapter only, gated by OAuth scopes and Spotify platform policy review.
3. `WasapiLoopbackProvider`: Windows output capture and DSP, implemented in the native Tauri/Rust layer. Raw audio should remain in memory and not be persisted by default.

## Synchronization contract

Provider timestamps are observations, not a frame clock. The future sync service should anchor a playback position to a monotonic receive timestamp, advance locally while playing, and re-anchor on pause, seek, track change, device change, or provider correction. Track changes must reset lyric and narrative timeline selection atomically.

## Build order

1. Keep demo playback stable while introducing provider contracts.
2. Implement and test a clock/synchronization service with deterministic fixtures.
3. Add metadata provider behind the contract.
4. Add native WASAPI capture and measured audio features behind the separate analysis contract.
5. Connect visual timeline rendering only after drift and lifecycle tests pass.

## Constraints

Spotify Web API metadata access does not provide raw audio for DSP. Audio loopback is a separate operating-system capability. Technical feasibility does not establish permission to synchronize Spotify recordings with visual media; review current platform terms before enabling that path in a distributed build.
