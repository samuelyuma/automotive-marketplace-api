import { AsyncLocalStorage } from "node:async_hooks";

const requestLogContext = new AsyncLocalStorage<{ requestId: string }>();

export function startRequestLogContext(requestId: string) {
  requestLogContext.enterWith({ requestId });
}

export function requestLogFields() {
  const requestId = requestLogContext.getStore()?.requestId;
  return requestId ? { request_id: requestId } : {};
}
