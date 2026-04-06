// Retry logic with exponential backoff for failed transactions

export async function retryWithExponentialBackoff(
  fn,
  {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    onRetry = null,
  } = {}
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on validation errors or access denied
      if (error.code === 'VALIDATION_ERROR' || error.code === 'ACCESS_DENIED') {
        throw error;
      }

      if (attempt < maxRetries) {
        const delayMs = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt),
          maxDelayMs
        );

        if (onRetry) {
          onRetry({ attempt, delayMs, error });
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

export async function retryMoMoTransaction(transactionFn, memberId) {
  return retryWithExponentialBackoff(transactionFn, {
    maxRetries: 2,
    initialDelayMs: 2000,
    onRetry: ({ attempt, delayMs, error }) => {
      console.warn(
        `MoMo transaction retry ${attempt}/2 for member ${memberId}. Waiting ${delayMs}ms. Error: ${error.message}`
      );
    },
  });
}

export async function retryPayoutTransaction(transactionFn, circleName) {
  return retryWithExponentialBackoff(transactionFn, {
    maxRetries: 3,
    initialDelayMs: 1500,
    onRetry: ({ attempt, delayMs, error }) => {
      console.warn(
        `Payout retry ${attempt}/3 for ${circleName}. Waiting ${delayMs}ms. Error: ${error.message}`
      );
    },
  });
}

export function isRetryableError(error) {
  // Retryable network/temporary errors
  const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE', 'TOO_MANY_REQUESTS'];
  return retryableCodes.includes(error.code) || error.message?.includes('ECONNREFUSED');
}