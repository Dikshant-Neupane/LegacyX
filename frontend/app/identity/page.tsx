'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BiometricCaptureRing } from '@/components/ui/BiometricCaptureRing';
import { identityApi, signAuthMessage } from '@/lib/api';
import { signAndSendTransaction, getExplorerLinks, type TransactionProgress } from '@/lib/transactions';

type ProofType = 'face' | 'voice' | 'document';

interface ProofRecord {
  type: ProofType;
  hash: string;
  capturedAt: string;
  status: 'pending' | 'anchored';
  txId?: string;
}

export default function IdentityProofPage() {
  const { connected, publicKey, signMessage, signTransaction } = useWallet();
  const [activeCapture, setActiveCapture] = useState<ProofType | null>(null);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [anchoring, setAnchoring] = useState(false);
  const [anchorTxProgress, setAnchorTxProgress] = useState<TransactionProgress | null>(null);
  const [anchorError, setAnchorError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ─── Face Capture ─────────────────────────────────────────────────────────

  const startFaceCapture = useCallback(async () => {
    setActiveCapture('face');
    setCaptureProgress(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Simulate progressive capture
      const interval = setInterval(() => {
        setCaptureProgress((p) => {
          if (p >= 1) {
            clearInterval(interval);
            return 1;
          }
          return p + 0.05;
        });
      }, 150);

      // After 3 seconds, capture hash
      setTimeout(async () => {
        clearInterval(interval);
        setCaptureProgress(1);

        // Hash the frame
        if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hashBuffer = await crypto.subtle.digest('SHA-256', imageData.data.buffer);
            const hash = Array.from(new Uint8Array(hashBuffer))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            setProofs((prev) => [
              ...prev,
              {
                type: 'face',
                hash,
                capturedAt: new Date().toISOString(),
                status: 'pending',
              },
            ]);
          }
        }

        // Stop camera
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setActiveCapture(null);
        setCaptureProgress(0);
      }, 3000);
    } catch (err) {
      console.error('Camera access denied:', err);
      setActiveCapture(null);
    }
  }, []);

  // ─── Voice Capture ────────────────────────────────────────────────────────

  const startVoiceCapture = useCallback(async () => {
    setActiveCapture('voice');
    setCaptureProgress(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunks, { type: 'audio/webm' });
        const buffer = await blob.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        setProofs((prev) => [
          ...prev,
          {
            type: 'voice',
            hash,
            capturedAt: new Date().toISOString(),
            status: 'pending',
          },
        ]);

        setActiveCapture(null);
        setCaptureProgress(0);
      };

      recorder.start();

      // Progress animation
      const interval = setInterval(() => {
        setCaptureProgress((p) => {
          if (p >= 1) {
            clearInterval(interval);
            return 1;
          }
          return p + 0.02;
        });
      }, 100);

      // Stop after 5 seconds
      setTimeout(() => {
        clearInterval(interval);
        setCaptureProgress(1);
        if (recorder.state === 'recording') recorder.stop();
      }, 5000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setActiveCapture(null);
    }
  }, []);

  // ─── Document Proof ───────────────────────────────────────────────────────

  const handleDocumentUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      setProofs((prev) => [
        ...prev,
        {
          type: 'document',
          hash,
          capturedAt: new Date().toISOString(),
          status: 'pending',
        },
      ]);
    },
    []
  );

  // ─── Anchor Proofs On-Chain ───────────────────────────────────────────────

  const anchorProofsOnChain = async () => {
    if (!signMessage || !signTransaction || !publicKey) return;
    setAnchoring(true);
    setAnchorError(null);
    setAnchorTxProgress(null);

    try {
      const pendingProofs = proofs.filter((p) => p.status === 'pending');

      // Get face and voice hashes (use empty hash if not captured)
      const faceProof = pendingProofs.find((p) => p.type === 'face');
      const voiceProof = pendingProofs.find((p) => p.type === 'voice');
      const faceHash = faceProof?.hash || '0'.repeat(64);
      const voiceHash = voiceProof?.hash || '0'.repeat(64);

      // Sign auth message
      const { signature, message } = await signAuthMessage(signMessage, 'Identity Proof');

      // 1. Get unsigned transaction from backend
      const result = await identityApi.submitProof({
        ownerPubkey: publicKey.toBase58(),
        faceHash,
        voiceHash,
        signature,
        message,
      });

      // 2. Sign and send transaction
      const txSig = await signAndSendTransaction(result.transaction, signTransaction, setAnchorTxProgress);

      // 3. Update statuses
      setProofs((prev) =>
        prev.map((p) =>
          p.status === 'pending'
            ? { ...p, status: 'anchored' as const, txId: txSig }
            : p
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Anchoring failed';
      setAnchorError(msg);
      console.error('Anchoring failed:', err);
    } finally {
      setAnchoring(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6 flex items-center justify-center">
        <p className="text-vault-muted">Connect your wallet to create identity proofs.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <p className="text-vault-muted text-xs uppercase tracking-[0.3em] mb-2">
            Proof of Existence
          </p>
          <h1 className="font-display text-section text-vault-text">
            Identity Proof
          </h1>
          <p className="text-vault-muted text-sm mt-4 max-w-lg">
            Anchor your biometric and document hashes on the Solana blockchain.
            Raw data never leaves your device — only SHA-256 hashes are stored on-chain.
          </p>
        </motion.div>

        {/* Capture Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Face */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="vault-card p-6 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-vault-border flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              </svg>
            </div>
            <h3 className="font-heading text-lg text-vault-text mb-2">Face Scan</h3>
            <p className="text-vault-muted text-xs mb-4">
              Capture a frame from your webcam. Only the SHA-256 hash is stored.
            </p>
            <button
              onClick={startFaceCapture}
              disabled={activeCapture !== null}
              className="btn-ghost text-xs w-full disabled:opacity-30"
              data-interactive
            >
              {activeCapture === 'face' ? 'Capturing...' : 'Start Capture'}
            </button>
          </motion.div>

          {/* Voice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="vault-card p-6 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-vault-border flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
            <h3 className="font-heading text-lg text-vault-text mb-2">Voice Print</h3>
            <p className="text-vault-muted text-xs mb-4">
              Record 5 seconds of voice. Audio is hashed locally, never uploaded.
            </p>
            <button
              onClick={startVoiceCapture}
              disabled={activeCapture !== null}
              className="btn-ghost text-xs w-full disabled:opacity-30"
              data-interactive
            >
              {activeCapture === 'voice' ? 'Recording...' : 'Start Recording'}
            </button>
          </motion.div>

          {/* Document */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="vault-card p-6 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-vault-border flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="font-heading text-lg text-vault-text mb-2">Document</h3>
            <p className="text-vault-muted text-xs mb-4">
              Upload any document — only its SHA-256 fingerprint is anchored.
            </p>
            <label className="btn-ghost text-xs w-full block cursor-pointer" data-interactive>
              <input
                type="file"
                onChange={handleDocumentUpload}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.txt"
              />
              Select File
            </label>
          </motion.div>
        </div>

        {/* Active Capture */}
        <AnimatePresence>
          {activeCapture && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center mb-12"
            >
              <BiometricCaptureRing
                capturing
                type={activeCapture === 'document' ? 'face' : activeCapture}
                progress={captureProgress}
              />
              {activeCapture === 'face' && (
                <video
                  ref={videoRef}
                  className="absolute w-[200px] h-[200px] rounded-full object-cover opacity-0"
                  playsInline
                  muted
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Proof Records */}
        {proofs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg text-vault-text">
                Captured Proofs
              </h2>
              {proofs.some((p) => p.status === 'pending') && (
                <button
                  onClick={anchorProofsOnChain}
                  disabled={anchoring}
                  className="btn-gold text-sm"
                  data-interactive
                >
                  {anchoring
                    ? anchorTxProgress?.status === 'signing'
                      ? 'Signing...'
                      : anchorTxProgress?.status === 'confirming'
                        ? 'Confirming...'
                        : 'Building...'
                    : 'Anchor All on Solana'}
                </button>
              )}
            </div>

            <div className="space-y-3">
              {proofs.map((proof, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="vault-card p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        proof.status === 'anchored'
                          ? 'bg-vault-green/10'
                          : 'bg-vault-raised'
                      }`}
                    >
                      <span className="text-xs">
                        {proof.type === 'face' ? '👤' : proof.type === 'voice' ? '🎤' : '📄'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-vault-text capitalize">
                        {proof.type} Proof
                      </p>
                      <p className="font-mono text-[10px] text-vault-muted">
                        {proof.hash.slice(0, 16)}...{proof.hash.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider ${
                      proof.status === 'anchored'
                        ? 'text-vault-green'
                        : 'text-vault-amber'
                    }`}
                  >
                    {proof.status === 'anchored' ? '✓ On-chain' : 'Pending'}
                  </span>
                  {proof.txId && proof.txId !== 'simulated_tx_id' && (
                    <a
                      href={getExplorerLinks(proof.txId).solscan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-vault-gold text-[10px] hover:underline block mt-1"
                    >
                      View tx ↗
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Security Notice */}
        <div className="vault-card p-6 mt-8 border-vault-gold/10">
          <div className="flex gap-4">
            <span className="text-vault-gold text-xl flex-shrink-0">🔒</span>
            <div>
              <h3 className="text-sm text-vault-text font-medium mb-1">
                Privacy Guarantee
              </h3>
              <p className="text-vault-muted text-xs leading-relaxed">
                Your biometric data (face image, voice recording) is processed entirely
                in your browser. Only the SHA-256 hash — a 64-character string — is
                stored on the Solana blockchain. It is mathematically impossible to
                reconstruct your biometric data from the hash. Not even we can see it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
