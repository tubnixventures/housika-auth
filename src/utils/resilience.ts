export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 150, backoffFactor = 2 } = options;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const jitter = Math.floor(Math.random() * 50);
      await new Promise((res) => setTimeout(res, delay + jitter));
      delay *= backoffFactor;
    }
  }

  throw new Error('Retries exhausted');
}

export class SimpleCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly cooldownMs: number;

  constructor(threshold = 5, cooldownMs = 30000) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  isOpen(): boolean {
    if (this.failureCount < this.threshold) return false;
    return Date.now() - this.lastFailureTime < this.cooldownMs;
  }

  recordSuccess(): void {
    this.failureCount = 0;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }
}
