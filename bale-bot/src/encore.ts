/// <reference types="node" />
import type { IncomingMessage, ServerResponse } from 'http';
import type { Update } from './api-types.js';

/**
 * Callback signature for Encore.ts {@link https://encore.dev/docs/ts/primitives/raw-endpoints | api.raw}
 * (named `RawHandler` in the [`encore.dev`](https://encore.dev/docs/ts/install) SDK package on npm).
 */
export type RawHandler = (req: IncomingMessage, resp: ServerResponse) => void;

export interface BaleEncoreWebhookHandlers {
  /**
   * Process a verified JSON {@link Update} payload from Bale.
   * Do not call `resp.writeHead` / `resp.end` here unless you take over the full response; the wrapper sends `200` on success.
   *
   * @param update - Parsed update object.
   * @param req - Raw Node request (e.g. headers for verification).
   * @param resp - Raw Node response (advanced use only).
   */
  onUpdate: (update: Update, req: IncomingMessage, resp: ServerResponse) => void | Promise<void>;
}

function isLikelyUpdate(body: unknown): body is Update {
  return (
    !!body &&
    typeof body === 'object' &&
    'update_id' in body &&
    typeof (body as { update_id: unknown }).update_id === 'number'
  );
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return undefined;
  return JSON.parse(raw) as unknown;
}

async function processWebhook(
  req: IncomingMessage,
  resp: ServerResponse,
  handlers: BaleEncoreWebhookHandlers,
): Promise<void> {
  if (req.method !== 'POST') {
    resp.writeHead(405).end();
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    resp.writeHead(400).end();
    return;
  }

  if (!isLikelyUpdate(body)) {
    resp.writeHead(400).end();
    return;
  }

  try {
    await handlers.onUpdate(body, req, resp);
  } catch {
    resp.writeHead(500).end();
    return;
  }

  if (!resp.writableEnded) {
    resp.writeHead(200).end();
  }
}

/**
 * Factory for an Encore.ts **`api.raw`** Bale webhook handler.
 *
 * [Encore.ts](https://encore.dev/docs/ts) ships as the npm package **`encore.dev`** (`import { api } from "encore.dev/api"`).
 * Use the [install guide](https://encore.dev/docs/ts/install) for the CLI and app bootstrap; generated apps already depend on **`encore.dev`**.
 *
 * @returns A {@link RawHandler} you can pass as the second argument to `api.raw` (same type as Encore’s `RawHandler`).
 *
 * @example
 * ```ts
 * import { api } from "encore.dev/api";
 * import { createBaleWebhookRawHandler } from "bale-bot/encore";
 *
 * export const baleWebhook = api.raw(
 *   { expose: true, path: "/bale/webhook", method: "POST" },
 *   createBaleWebhookRawHandler({
 *     onUpdate: async (update) => {
 *       console.log(update.update_id);
 *     },
 *   }),
 * );
 * ```
 */
export function createBaleWebhookRawHandler(handlers: BaleEncoreWebhookHandlers): RawHandler {
  return (req: IncomingMessage, resp: ServerResponse): void => {
    processWebhook(req, resp, handlers).catch(() => {
      if (!resp.writableEnded) {
        try {
          resp.writeHead(500).end();
        } catch {
          /* ignore */
        }
      }
    });
  };
}
