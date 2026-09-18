import { afterEach, describe, expect, it } from '@rstest/core';
import http from 'node:http';
import type { IncomingMessage } from 'node:http';
import type { RoomSummary } from '@secret-hitler/shared';
import { listenServer, type LiveServer } from '../../test/test-utils';

class SseReader {
  private buffer = '';
  private readonly waiters: Array<(event: unknown) => void> = [];

  constructor(stream: IncomingMessage) {
    stream.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      this.drain();
    });
  }

  next(timeoutMs = 2_000): Promise<unknown> {
    const pending = this.take();
    if (pending !== undefined) return Promise.resolve(pending);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for SSE event')), timeoutMs);
      this.waiters.push((event) => {
        clearTimeout(timer);
        resolve(event);
      });
    });
  }

  private drain(): void {
    while (this.waiters.length > 0) {
      const event = this.take();
      if (event === undefined) return;
      this.waiters.shift()!(event);
    }
  }

  private take(): unknown | undefined {
    const match = this.buffer.match(/data: (.*)\n\n/);
    if (!match) return undefined;
    this.buffer = this.buffer.slice(this.buffer.indexOf(match[0]) + match[0].length);
    return JSON.parse(match[1]) as unknown;
  }
}

describe('GET /api/rooms/stream', () => {
  let server: LiveServer | undefined;

  afterEach(async () => {
    if (!server) return;
    await server.close();
    server = undefined;
  });

  it('Should push Join updates when a lobby is created', async () => {
    server = await listenServer();
    const { stream, reader } = await new Promise<{
      stream: IncomingMessage;
      reader: SseReader;
    }>((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${server!.port}/api/rooms/stream`, (stream) => {
          resolve({ stream, reader: new SseReader(stream) });
        })
        .on('error', reject);
    });
    expect(stream.statusCode).toBe(200);
    expect(stream.headers['content-type']).toMatch(/text\/event-stream/);
    const first = (await reader.next()) as RoomSummary[];
    expect(first).toEqual([]);

    const created = await fetch(`http://127.0.0.1:${server.port}/api/rooms`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Friday Night', hostName: 'Ana' }),
    });
    expect(created.status).toBe(201);

    const second = (await reader.next()) as RoomSummary[];
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ name: 'Friday Night', playerCount: 1 });

    stream.destroy();
  });
});
