import { AVATAR_COUNT } from '@secret-hitler/shared';
import paperFrame from './avatars/avatar_placeholder.png';
import anarchistPrinter from './avatars/anarchist-printer.webp';
import baker from './avatars/baker.webp';
import cabaretSinger from './avatars/cabaret-singer.webp';
import diplomat from './avatars/diplomat.webp';
import factoryOrganiser from './avatars/factory-organiser.webp';
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

/** Worn photo-card frame used for empty lobby seats. */
export const PAPER_FRAME = paperFrame;

export const PORTRAITS = [
  { id: 'baker', src: baker, latin: 'Otto', persian: 'اتو' },
  { id: 'diplomat', src: diplomat, latin: 'Karl', persian: 'کارل' },
  { id: 'student', src: student, latin: 'Lotte', persian: 'لوته' },
  { id: 'nurse', src: nurse, latin: 'Marta', persian: 'مارتا' },
  { id: 'miner', src: miner, latin: 'Franz', persian: 'فرانتس' },
  { id: 'cabaretSinger', src: cabaretSinger, latin: 'Lili', persian: 'لیلی' },
  { id: 'schoolteacher', src: schoolteacher, latin: 'Clara', persian: 'کلارا' },
  { id: 'tramConductor', src: tramConductor, latin: 'Fritz', persian: 'فریتس' },
  { id: 'factoryOrganiser', src: factoryOrganiser, latin: 'Rosa', persian: 'رزا' },
  { id: 'nightBanker', src: nightBanker, latin: 'Max', persian: 'ماکس' },
  { id: 'typesetter', src: typesetter, latin: 'Edith', persian: 'ادیث' },
  { id: 'unionDockWorker', src: unionDockWorker, latin: 'Helga', persian: 'هلگا' },
  { id: 'ruralSocialist', src: ruralSocialist, latin: 'Anna', persian: 'آنا' },
  { id: 'anarchistPrinter', src: anarchistPrinter, latin: 'Thea', persian: 'تئا' },
  { id: 'oldExile', src: oldExile, latin: 'Ernst', persian: 'ارنست' },
] as const;

export type PortraitId = (typeof PORTRAITS)[number]['id'];

if (PORTRAITS.length !== AVATAR_COUNT) {
  throw new Error(`PORTRAITS (${PORTRAITS.length}) must match AVATAR_COUNT (${AVATAR_COUNT})`);
}

export function avatarImage(avatar: number): string {
  return PORTRAITS[Math.abs(avatar) % PORTRAITS.length].src;
}
