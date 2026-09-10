import { AVATAR_COUNT } from '@secret-hitler/shared';
import paperFrame from './avatars/avatar_placeholder.png';
import anarchistPrinter from './avatars/anarchist-printer.webp';
import baker from './avatars/baker.webp';
import cabaretSinger from './avatars/cabaret-singer.webp';
import clarinetist from './avatars/clarinetist.webp';
import diplomat from './avatars/diplomat.webp';
import factoryOrganiser from './avatars/factory-organiser.webp';
import industrialWidow from './avatars/industrial-widow.webp';
import miner from './avatars/miner.webp';
import nightBanker from './avatars/night-banker.webp';
import nurse from './avatars/nurse.webp';
import oldExile from './avatars/old-exile.webp';
import ruralSocialist from './avatars/rural-socialist.webp';
import schoolteacher from './avatars/schoolteacher.webp';
import student from './avatars/student.webp';
import tramConductor from './avatars/tram-conductor.webp';
import typesetter from './avatars/typesetter.webp';
import unionDockWorker from './avatars/union-dock-worker.webp';

/** Worn photo-card frame; illustrated faces sit in its inner panel. */
export const PAPER_FRAME = paperFrame;

/** Seat portraits. Order is the avatar index stored on the player and in settings. */
export const PORTRAITS = [
  baker,
  diplomat,
  student,
  nurse,
  miner,
  cabaretSinger,
  schoolteacher,
  tramConductor,
  factoryOrganiser,
  nightBanker,
  clarinetist,
  industrialWidow,
  typesetter,
  unionDockWorker,
  ruralSocialist,
  anarchistPrinter,
  oldExile,
];

if (PORTRAITS.length !== AVATAR_COUNT) {
  throw new Error(`PORTRAITS (${PORTRAITS.length}) must match AVATAR_COUNT (${AVATAR_COUNT})`);
}

export function avatarImage(avatar: number): string {
  return PORTRAITS[Math.abs(avatar) % PORTRAITS.length];
}
