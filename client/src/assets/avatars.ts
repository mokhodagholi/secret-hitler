import portraitA from './avatars/avatar_1.png';

/** Seat portraits. Extra illustrated faces can join this list later. */
const PORTRAITS = [portraitA];

export function avatarImage(avatar: number): string {
  return PORTRAITS[Math.abs(avatar) % PORTRAITS.length];
}
