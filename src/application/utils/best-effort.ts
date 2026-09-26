import { logger } from "../../infrastructure/logging/logger";

// Noncritical operations may fail without failing the request.
export async function bestEffort<T>(
  operation: () => Promise<T>,
  onError: (error: unknown) => void = (e) =>
    logger.warn({ exception: e }, "best-effort operation failed"),
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    onError(error);
    return undefined;
  }
}
