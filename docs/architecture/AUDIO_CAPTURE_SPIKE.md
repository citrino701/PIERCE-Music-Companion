# Audio capture and analysis boundary

## Current state

PIERCE has a playback metadata provider contract and an independent audio-analysis provider contract. This module adds deterministic PCM-to-feature analysis. It does not capture audio and is not a WASAPI implementation.

## Data path

Windows audio output -> native WASAPI loopback capture (future Tauri/Rust adapter) -> PCM frames (Float32Array, sample rate, monotonic timestamp) -> AudioFeatureAnalyzer -> AudioFeatures -> visual composition engine.

## Analysis behavior

- PCM input is clamped to [-1, 1].
- RMS and energy are normalized to [0, 1].
- Three approximate bands use lightweight one-pole filters.
- Onset detects a positive energy jump against a smoothed baseline.
- Empty or invalid frames return silence.
- Capture and persistence are outside this module. Raw audio is not stored.

The bands are lightweight visual controls, not a studio-grade spectrum analyzer. FFT can replace the internals without changing the AudioFeatures contract.

## WASAPI implementation gate

Before native capture, add the Tauri 2 Rust shell and a Windows adapter that starts/stops loopback capture for the default render endpoint, emits bounded PCM chunks with monotonic timestamps, handles endpoint/device changes and errors, uses a bounded queue, and does not persist raw audio by default.

Validate speakers, headphones and device switching. Do not substitute microphone capture: the intended signal is system output loopback.