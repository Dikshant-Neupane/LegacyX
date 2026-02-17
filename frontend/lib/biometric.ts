/**
 * LegacyX Biometric Hashing
 *
 * Client-side biometric data processing.
 * NEVER stores or transmits raw biometric data.
 * Only SHA-256 hashes are anchored on-chain as identity proofs.
 *
 * Security: All processing happens in the browser.
 * The server only receives the hash — NEVER the raw biometric.
 */

import { sha256Hash } from './encryption';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BiometricCapture {
  /** Type of biometric captured */
  type: 'face' | 'voice' | 'fingerprint' | 'custom';
  /** SHA-256 hash of the biometric data */
  hash: string;
  /** Timestamp of capture */
  capturedAt: number;
  /** Device info for audit trail */
  deviceInfo: string;
}

export interface IdentityProofBundle {
  /** Array of biometric hashes */
  biometrics: BiometricCapture[];
  /** Combined proof hash (hash of all individual hashes) */
  combinedHash: string;
  /** Creator's wallet address */
  walletAddress: string;
}

// ─── Face Capture ─────────────────────────────────────────────────────────────

/**
 * Capture a face image from the webcam and compute its hash.
 * The raw image NEVER leaves the browser.
 *
 * @param videoElement - HTML video element with active camera stream
 * @returns BiometricCapture with hash (raw image data is discarded)
 */
export async function captureFaceHash(
  videoElement: HTMLVideoElement
): Promise<BiometricCapture> {
  // Draw video frame to canvas
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(videoElement, 0, 0);

  // Get raw pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixelBuffer = imageData.data.buffer;

  // Hash the raw pixel data
  const hash = await sha256Hash(pixelBuffer);

  // CRITICAL: Immediately clear canvas and pixel data
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  return {
    type: 'face',
    hash,
    capturedAt: Date.now(),
    deviceInfo: getDeviceInfo(),
  };
}

// ─── Voice Capture ────────────────────────────────────────────────────────────

/**
 * Record a voice sample and compute its hash.
 * Returns a promise that resolves when recording is complete.
 *
 * @param durationMs - Recording duration in milliseconds (default: 5000)
 */
export async function captureVoiceHash(
  durationMs: number = 5000
): Promise<BiometricCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  const chunks: BlobPart[] = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = async () => {
      // Stop all tracks
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunks, { type: 'audio/webm' });
      const buffer = await blob.arrayBuffer();

      // Hash the audio data
      const hash = await sha256Hash(buffer);

      resolve({
        type: 'voice',
        hash,
        capturedAt: Date.now(),
        deviceInfo: getDeviceInfo(),
      });
    };

    recorder.onerror = reject;
    recorder.start();

    // Auto-stop after duration
    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, durationMs);
  });
}

// ─── Arbitrary Data Proof ─────────────────────────────────────────────────────

/**
 * Create a hash proof from arbitrary data (documents, images, etc.)
 * Used for custom identity proofs.
 */
export async function createDataProof(
  file: File
): Promise<BiometricCapture> {
  const buffer = await file.arrayBuffer();
  const hash = await sha256Hash(buffer);

  return {
    type: 'custom',
    hash,
    capturedAt: Date.now(),
    deviceInfo: getDeviceInfo(),
  };
}

// ─── Identity Proof Bundle ────────────────────────────────────────────────────

/**
 * Combine multiple biometric captures into a single identity proof bundle.
 * The combined hash is what gets anchored on the Solana blockchain.
 */
export async function createIdentityBundle(
  captures: BiometricCapture[],
  walletAddress: string
): Promise<IdentityProofBundle> {
  if (captures.length === 0) {
    throw new Error('At least one biometric capture required');
  }

  // Combine all hashes into a single string and hash it
  const combined = captures
    .map((c) => `${c.type}:${c.hash}:${c.capturedAt}`)
    .join('|');
  const combinedHash = await sha256Hash(combined);

  return {
    biometrics: captures,
    combinedHash,
    walletAddress,
  };
}

// ─── Webcam Helpers ───────────────────────────────────────────────────────────

/**
 * Start webcam stream for face capture.
 */
export async function startWebcam(
  videoElement: HTMLVideoElement
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 640, height: 480 },
  });

  videoElement.srcObject = stream;
  await videoElement.play();
  return stream;
}

/**
 * Stop webcam and release all tracks.
 */
export function stopWebcam(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getDeviceInfo(): string {
  return `${navigator.userAgent.slice(0, 100)}|${screen.width}x${screen.height}`;
}
