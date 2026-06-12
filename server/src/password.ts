import { createHash, timingSafeEqual } from 'node:crypto';

/** Hash a room password. Rooms are ephemeral and low-stakes, so a salted
 *  SHA-256 is sufficient — no account credentials are ever stored. */
export function hashPassword(password: string): string {
  return createHash('sha256').update(`sh:${password}`).digest('hex');
}

export function verifyPassword(password: string, hash: string | null): boolean {
  if (hash == null) return true; // open room
  const candidate = Buffer.from(hashPassword(password));
  const expected = Buffer.from(hash);
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}
