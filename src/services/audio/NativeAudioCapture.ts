import { invoke } from '@tauri-apps/api/core';

export type NativeRuntimeStatus = 'tauri-ready' | 'unavailable' | string;
export type AudioCaptureStatus = 'ready' | 'not-implemented' | 'unavailable' | string;

export interface NativeCapabilityStatus {
  runtime: NativeRuntimeStatus;
  audioCapture: AudioCaptureStatus;
}

/** Read-only capability probe. Does not request microphone permissions or start capture. */
export async function getNativeCapabilityStatus(): Promise<NativeCapabilityStatus> {
  try {
    const [runtime, audioCapture] = await Promise.all([
      invoke<string>('native_runtime_status'),
      invoke<string>('audio_capture_status'),
    ]);
    return { runtime, audioCapture };
  } catch {
    return { runtime: 'unavailable', audioCapture: 'unavailable' };
  }
}
