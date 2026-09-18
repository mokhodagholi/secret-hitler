import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

/** Same alphabet as room codes — no I/O/0/1, easy to read in a DM. */
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Short lock for group `/create` tables. Not used on HTTP Create. */
export function makeRoomPassword(length = 4): string {
  let password = '';
  for (let index = 0; index < length; index++) {
    password += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return password;
}

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
