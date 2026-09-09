import type { BaleApiResult, InputFile } from './api-types.js';
import { BaleApiError } from './errors.js';

const DEFAULT_BASE = 'https://tapi.bale.ai';

export interface BaleHttpClientOptions {
  /** Bot token from [@botfather](https://ble.ir/botfather). */
  token: string;
  /**
   * API origin without trailing slash. Defaults to Bale production.
   * @defaultValue "https://tapi.bale.ai"
   */
  baseUrl?: string;
  /** Optional `fetch` implementation (tests, edge runtimes). */
  fetch?: typeof fetch;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function isBufferFile(value: unknown): value is { buffer: Uint8Array; filename: string } {
  if (!value || typeof value !== 'object') return false;
  if (!('buffer' in value) || !('filename' in value)) return false;
  const b = (value as { buffer: unknown }).buffer;
  return b instanceof Uint8Array;
}

function isMultipartFile(value: unknown): value is InputFile {
  return isBlob(value) || isBufferFile(value);
}

function inputFileToBlob(value: InputFile, defaultName: string): { blob: Blob; filename: string } {
  if (isBufferFile(value)) {
    return { blob: new Blob([value.buffer.slice()]), filename: value.filename };
  }
  const blob = value;
  if (typeof File !== 'undefined' && blob instanceof File) {
    return { blob, filename: blob.name || defaultName };
  }
  return { blob, filename: defaultName };
}

function containsMultipartFile(value: unknown): boolean {
  if (isMultipartFile(value)) return true;
  if (Array.isArray(value)) return value.some(containsMultipartFile);
  if (value && typeof value === 'object') {
    return Object.values(value as object).some(containsMultipartFile);
  }
  return false;
}

function stripUndefined(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * Low-level HTTPS client: JSON POST by default, `multipart/form-data` when uploads are present.
 *
 * @see https://docs.bale.ai/
 */
export class BaleHttpClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BaleHttpClientOptions) {
    this.token = options.token;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** `{baseUrl}/bot{token}/{method}` */
  private methodUrl(method: string): string {
    return `${this.baseUrl}/bot${this.token}/${method}`;
  }

  /**
   * Executes an API method and unwraps `result`, or throws {@link BaleApiError}.
   */
  async request<TResult>(method: string, params: object = {}): Promise<TResult> {
    const body = stripUndefined(params as Record<string, unknown>);
    const useMultipart = containsMultipartFile(body);

    const response = useMultipart
      ? await this.fetchImpl(this.methodUrl(method), {
          method: 'POST',
          body: this.toFormData(body),
        })
      : await this.fetchImpl(this.methodUrl(method), {
          method: 'POST',
          headers: { 'content-type': 'application/json;charset=utf-8' },
          body: JSON.stringify(body),
        });

    const parsed = (await response.json()) as BaleApiResult<TResult>;
    if (!parsed.ok) {
      throw new BaleApiError(parsed.description ?? `Bale API error ${parsed.error_code}`, {
        errorCode: parsed.error_code,
        description: parsed.description,
        parameters: parsed.parameters,
      });
    }
    return parsed.result;
  }

  /**
   * Direct download URL for a path returned by {@link BaleFile.file_path} from `getFile`.
   *
   * @see https://docs.bale.ai/
   */
  buildFileDownloadUrl(filePath: string): string {
    const encoded = filePath
      .split('/')
      .filter((s) => s.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${this.baseUrl}/file/bot${this.token}/${encoded}`;
  }

  /**
   * Builds `FormData` per Telegram/Bale conventions: objects/arrays stringify; files attach by field name.
   * `sendMediaGroup.media` embeds `attach://…` references for nested files.
   */
  private toFormData(params: Record<string, unknown>): FormData {
    const form = new FormData();
    let generated = 0;

    const appendFile = (fieldName: string, file: InputFile): void => {
      const { blob, filename } = inputFileToBlob(file, `${fieldName}_${generated}.bin`);
      form.append(fieldName, blob, filename);
    };

    const appendGeneratedFile = (file: InputFile): string => {
      const name = `file${generated++}`;
      appendFile(name, file);
      return name;
    };

    for (const [key, raw] of Object.entries(params)) {
      if (raw === undefined) continue;

      if (key === 'media' && Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null) {
        const media = raw.map((item) => {
          if (!item || typeof item !== 'object' || !('media' in item)) return item;
          const mediaValue = (item as { media: unknown }).media;
          if (isMultipartFile(mediaValue)) {
            const attach = appendGeneratedFile(mediaValue);
            return { ...(item as object), media: `attach://${attach}` };
          }
          return item;
        });
        form.append(key, JSON.stringify(media));
        continue;
      }

      if (isMultipartFile(raw)) {
        appendFile(key, raw);
        continue;
      }

      if (typeof raw === 'object' && raw !== null) {
        form.append(key, JSON.stringify(raw));
        continue;
      }

      form.append(key, String(raw));
    }

    return form;
  }
}
