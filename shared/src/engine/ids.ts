// Small id helpers. `crypto.randomUUID` exists in modern browsers and Node 18+.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeId(): string {
  return crypto.randomUUID();
}

/** Short, human-shareable room code, e.g. "X7Y922". */
export function makeRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
