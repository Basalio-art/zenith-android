export const ERROR_CLASSES = {
  NETWORK: 'network',
  UNAVAILABLE: 'unavailable',
  UPSTREAM: 'upstream',
  EMPTY: 'empty',
  INVALID: 'invalid',
  UNKNOWN: 'unknown',
};

export class ServiceError extends Error {
  constructor(message, { class: errorClass, service, status, cause, payload } = {}) {
    super(message);
    this.name = 'ServiceError';
    this.errorClass = errorClass || ERROR_CLASSES.UNKNOWN;
    this.service = service;
    this.status = status;
    this.cause = cause;
    this.payload = payload;
  }
}

export function isServiceError(e) {
  return e instanceof ServiceError;
}

export function classifyError(e) {
  if (isServiceError(e)) return e.errorClass;
  if (e.name === 'AbortError' || e.code === 'ECONNABORTED') return ERROR_CLASSES.NETWORK;
  if (e.message?.includes('Failed to fetch') || e.message?.includes('Network')) return ERROR_CLASSES.NETWORK;
  return ERROR_CLASSES.UNKNOWN;
}