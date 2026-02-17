#!/bin/bash

echo ''
echo '========================================'
echo '  LegacyX Local Environment Checker'
echo '========================================'
echo ''

PASS=0
FAIL=0

check() {
  local NAME=$1
  local CMD=$2
  local EXPECTED=$3
  local RESULT
  RESULT=$(eval "$CMD" 2>&1)
  if [ $? -eq 0 ]; then
    echo "  PASS  $NAME: $RESULT"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $NAME — NOT FOUND. Install required."
    echo "        Expected: $EXPECTED"
    FAIL=$((FAIL+1))
  fi
}

echo '--- Core Tools ---'
check 'Node.js       ' 'node --version' 'v18.0.0 or above'
check 'npm           ' 'npm --version' '9.0.0 or above'
check 'Rust          ' 'rustc --version' 'rustc 1.75.0 or above'
check 'Solana CLI    ' 'solana --version' '1.18.0 or above'
check 'Anchor CLI    ' 'anchor --version' '0.30.0 or above'
check 'Git           ' 'git --version' '2.38.0 or above'

echo ''
echo '--- Solana Configuration ---'
check 'Solana Address' 'solana address' 'A valid Solana wallet address'
check 'Solana Balance' 'solana balance' '2 SOL or above on Devnet'
check 'Solana Network' 'solana config get | grep devnet' 'RPC URL contains devnet'

echo ''
echo '--- Project Files ---'
check 'frontend/.env.local  ' 'ls frontend/.env.local' 'File must exist'
check 'backend/.env         ' 'ls backend/.env' 'File must exist'
check 'frontend/node_modules' 'ls frontend/node_modules' 'Directory must exist — run npm install'
check 'backend/node_modules ' 'ls backend/node_modules' 'Directory must exist — run npm install'

echo ''
echo '--- Build Checks ---'
check 'Anchor Build  ' 'anchor build 2>&1 | grep -i finished' 'Finished release target'
check 'Frontend Build' 'cd frontend && npm run build 2>&1 | grep -c "error"' 'Zero errors'

echo ''
echo '========================================'
echo "  Results: $PASS passed, $FAIL failed"
echo '========================================'
if [ $FAIL -eq 0 ]; then
  echo '  All checks passed. LegacyX is ready to run locally.'
  echo '  Start frontend: cd frontend && npm run dev'
  echo '  Start backend:  cd backend && npm run dev'
  echo '  Run tests:      anchor test'
else
  echo "  Fix the $FAIL failed items above then run this script again."
fi
echo ''
