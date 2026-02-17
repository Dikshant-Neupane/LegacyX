'use client';

import { useState, useCallback } from 'react';

interface UseCountdownReturn {
  /** Days remaining */
  daysRemaining: number;
  /** Hours remaining */
  hoursRemaining: number;
  /** Whether the deadline has passed */
  expired: boolean;
  /** Human-readable time remaining */
  display: string;
}

/**
 * Hook to compute countdown until vault trigger deadline.
 *
 * @param lastCheckIn - Unix timestamp of last check-in
 * @param intervalSeconds - Check-in interval in seconds
 */
export function useCountdown(
  lastCheckIn: number,
  intervalSeconds: number
): UseCountdownReturn {
  const deadline = lastCheckIn + intervalSeconds;
  const now = Math.floor(Date.now() / 1000);
  const remaining = deadline - now;

  const expired = remaining <= 0;
  const daysRemaining = Math.max(0, Math.floor(remaining / 86400));
  const hoursRemaining = Math.max(0, Math.floor((remaining % 86400) / 3600));

  let display = '';
  if (expired) {
    display = 'Deadline passed';
  } else if (daysRemaining > 0) {
    display = `${daysRemaining}d ${hoursRemaining}h`;
  } else {
    display = `${hoursRemaining}h remaining`;
  }

  return {
    daysRemaining,
    hoursRemaining,
    expired,
    display,
  };
}
