# LegacyX — Solana Mobile Stack (SMS) Integration
#
# This directory will contain the React Native mobile app
# for Solana Mobile (Saga, dApp Store).
#
# Stack:
# - React Native 0.73+
# - @solana-mobile/mobile-wallet-adapter-protocol
# - @solana-mobile/mobile-wallet-adapter-protocol-web3js
# - Expo (optional)
#
# Phase 5 deliverables:
# - [ ] Mobile wallet connection via SMS
# - [ ] Check-in functionality
# - [ ] Push notification for check-in reminders
# - [ ] Biometric check-in (fingerprint/face)
# - [ ] Offline-first vault status cache
# - [ ] dApp Store listing metadata
#
# Folder structure (to be created):
# mobile/
# ├── App.tsx
# ├── package.json
# ├── screens/
# │   ├── HomeScreen.tsx
# │   ├── DashboardScreen.tsx
# │   ├── CheckInScreen.tsx
# │   └── VaultScreen.tsx
# ├── components/
# │   ├── MobileVaultOrb.tsx
# │   ├── CheckInButton.tsx
# │   └── CountdownTimer.tsx
# ├── hooks/
# │   └── useMobileWallet.ts
# └── lib/
#     ├── encryption.ts      (shared with web)
#     └── solana.ts           (shared with web)
