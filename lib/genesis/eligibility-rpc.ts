import 'server-only';

import { getEligibilityRpcServerEnv } from '@/lib/env/server';
import type {
  EligibilityDataSource,
  EligibilitySignature,
  EligibilityTransaction,
  EligibilityTransactionLookup,
} from '@/lib/genesis/eligibility';

const RPC_TIMEOUT_MS = 12_000;
const RPC_RETRY_DELAY_MS = 250;

type JsonRpcSuccess<T> = {
  jsonrpc: '2.0';
  id: number;
  result: T;
};

type JsonRpcFailure = {
  jsonrpc: '2.0';
  id: number;
  error: {
    code: number;
    message: string;
  };
};

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function rpcFetch<T>(
  url: string,
  body: unknown,
  allowRetry = true
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
  } catch (error) {
    if (allowRetry) {
      await sleep(RPC_RETRY_DELAY_MS);
      return rpcFetch<T>(url, body, false);
    }
    throw error;
  }

  if (!response.ok) {
    if (allowRetry && (response.status === 429 || response.status >= 500)) {
      await sleep(RPC_RETRY_DELAY_MS);
      return rpcFetch<T>(url, body, false);
    }
    throw new Error(`Eligibility RPC failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export class SolanaEligibilityRpcDataSource implements EligibilityDataSource {
  private readonly primaryUrl: string;
  private readonly fallbackUrl?: string;
  private nextRequestId = 1;

  constructor(params?: { primaryUrl?: string; fallbackUrl?: string }) {
    const env = params?.primaryUrl ? null : getEligibilityRpcServerEnv();
    this.primaryUrl = params?.primaryUrl ?? env!.SOLEON_ELIGIBILITY_RPC_URL;
    this.fallbackUrl =
      params?.fallbackUrl ?? env?.SOLEON_ELIGIBILITY_FALLBACK_RPC_URL;
  }

  private requestId(): number {
    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return id;
  }

  private async requestWithFallback<T>(body: unknown): Promise<T> {
    try {
      return await rpcFetch<T>(this.primaryUrl, body);
    } catch (primaryError) {
      if (!this.fallbackUrl) throw primaryError;
      return rpcFetch<T>(this.fallbackUrl, body);
    }
  }

  async listSignatures(params: {
    wallet: string;
    before?: string;
    limit: number;
  }): Promise<EligibilitySignature[]> {
    const config: {
      commitment: 'finalized';
      limit: number;
      before?: string;
    } = {
      commitment: 'finalized',
      limit: params.limit,
    };
    if (params.before) config.before = params.before;

    const response = await this.requestWithFallback<
      JsonRpcResponse<EligibilitySignature[]>
    >({
      jsonrpc: '2.0',
      id: this.requestId(),
      method: 'getSignaturesForAddress',
      params: [params.wallet, config],
    });
    if ('error' in response) {
      throw new Error(`Eligibility RPC error ${response.error.code}`);
    }
    if (!Array.isArray(response.result)) {
      throw new Error('Eligibility RPC returned invalid signatures');
    }
    return response.result;
  }

  async getTransactions(signatures: string[]): Promise<EligibilityTransactionLookup[]> {
    if (signatures.length === 0) return [];

    const requestIds = new Map<number, string>();
    const body = signatures.map((signature) => {
      const id = this.requestId();
      requestIds.set(id, signature);
      return {
        jsonrpc: '2.0',
        id,
        method: 'getTransaction',
        params: [
          signature,
          {
            commitment: 'finalized',
            encoding: 'jsonParsed',
            maxSupportedTransactionVersion: 0,
          },
        ],
      };
    });

    let responses: JsonRpcResponse<EligibilityTransaction | null>[];
    try {
      responses = await rpcFetch<
        JsonRpcResponse<EligibilityTransaction | null>[]
      >(this.primaryUrl, body);
    } catch (primaryError) {
      if (!this.fallbackUrl) throw primaryError;
      responses = await rpcFetch<
        JsonRpcResponse<EligibilityTransaction | null>[]
      >(this.fallbackUrl, body);
    }

    if (!Array.isArray(responses)) {
      throw new Error('Eligibility RPC returned an invalid transaction batch');
    }

    const bySignature = new Map<string, EligibilityTransactionLookup>();
    const applyResponses = (
      batchResponses: JsonRpcResponse<EligibilityTransaction | null>[]
    ) => {
      for (const response of batchResponses) {
        const signature = requestIds.get(response.id);
        if (!signature) continue;
        if ('error' in response || response.result === null) {
          if (!bySignature.has(signature)) {
            bySignature.set(signature, {
              signature,
              transaction: null,
              unavailable: true,
            });
          }
        } else {
          bySignature.set(signature, {
            signature,
            transaction: response.result,
          });
        }
      }
    };
    applyResponses(responses);

    if (this.fallbackUrl) {
      const unresolvedIds = new Set(
        [...requestIds.entries()]
          .filter(([, signature]) => bySignature.get(signature)?.unavailable !== false &&
            !bySignature.get(signature)?.transaction)
          .map(([id]) => id)
      );
      const fallbackBody = body.filter((request) => unresolvedIds.has(request.id));
      if (fallbackBody.length > 0) {
        try {
          const fallbackResponses = await rpcFetch<
            JsonRpcResponse<EligibilityTransaction | null>[]
          >(this.fallbackUrl, fallbackBody);
          if (Array.isArray(fallbackResponses)) applyResponses(fallbackResponses);
        } catch {
          // Unresolved entries remain unavailable and are handled conservatively.
        }
      }
    }

    return signatures.map(
      (signature) =>
        bySignature.get(signature) ?? {
          signature,
          transaction: null,
          unavailable: true,
        }
    );
  }
}
