import type { ServerErrorCode } from '../types/events';

export interface EngineError {
  code: ServerErrorCode;
  message: string;
}

export function err(code: ServerErrorCode, message: string): EngineError {
  return { code, message };
}
