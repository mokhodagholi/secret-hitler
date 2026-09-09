import type { ResponseParameters } from './api-types.js';

/**
 * Error thrown when the Bale API responds with `{ ok: false }`.
 *
 * @see https://docs.bale.ai/
 */
export class BaleApiError extends Error {
  /** Bale error code as returned by the API. */
  readonly errorCode: number;
  /** Optional human-readable description from the API. */
  readonly description?: string;
  /** Optional rate-limit hint from {@link ResponseParameters}. */
  readonly parameters?: ResponseParameters;

  constructor(message: string, init: { errorCode: number; description?: string; parameters?: ResponseParameters }) {
    super(message);
    this.name = 'BaleApiError';
    this.errorCode = init.errorCode;
    this.description = init.description;
    this.parameters = init.parameters;
  }
}
