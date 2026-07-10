'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FeeIndexResponse, FeeIndexStatus } from '@/app/api/fee-index/route';

export interface UseFeeIndexResult {
  data: FeeIndexResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastFetched: Date | null;
  cached: boolean;
  cacheAge: number;
}

const DEFAULT_RESPONSE: FeeIndexResponse = {
  scanStatus: 'pending' as FeeIndexStatus,
  message: 'Loading fee index...',
  estimatedTotalWithheld: '0',
  estimatedRewardVaultAmount: '0',
  estimatedBurnAmount: '0',
  estimatedCallerIncentive: '0',
  callerIncentiveValid: false,
  accountCount: 0,
  sourceAccounts: [],
  mintWithheldAmount: '0',
  lastScanTimestamp: null,
};

export function useFeeIndex(): UseFeeIndexResult {
  const [data, setData] = useState<FeeIndexResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [cached, setCached] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);

  const fetchFeeIndex = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fee-index');
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setCached(result.cached || false);
      setCacheAge(result.cacheAge || 0);
      setLastFetched(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch fee index';
      setError(errorMessage);
      setData({
        ...DEFAULT_RESPONSE,
        scanStatus: 'error',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeIndex();
  }, [fetchFeeIndex]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchFeeIndex,
    lastFetched,
    cached,
    cacheAge,
  };
}
