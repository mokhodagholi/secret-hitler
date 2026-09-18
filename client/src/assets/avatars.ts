import { AVATAR_COUNT, normalizeAvatar } from '@secret-hitler/shared';
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

export type PortraitGender = 'man' | 'woman';

export const PORTRAITS = [
  { id: 'baker', src: baker, latin: 'Otto', persian: 'اتو', gender: 'man' },
  { id: 'diplomat', src: diplomat, latin: 'Karl', persian: 'کارل', gender: 'man' },
  { id: 'student', src: student, latin: 'Lotte', persian: 'لوته', gender: 'woman' },
  { id: 'nurse', src: nurse, latin: 'Marta', persian: 'مارتا', gender: 'woman' },
  { id: 'miner', src: miner, latin: 'Franz', persian: 'فرانتس', gender: 'man' },
  { id: 'cabaretSinger', src: cabaretSinger, latin: 'Lili', persian: 'لیلی', gender: 'woman' },
  { id: 'schoolteacher', src: schoolteacher, latin: 'Clara', persian: 'کلارا', gender: 'woman' },
  { id: 'tramConductor', src: tramConductor, latin: 'Fritz', persian: 'فریتس', gender: 'man' },
  { id: 'factoryOrganiser', src: factoryOrganiser, latin: 'Rosa', persian: 'رزا', gender: 'woman' },
  { id: 'nightBanker', src: nightBanker, latin: 'Max', persian: 'ماکس', gender: 'man' },
  { id: 'typesetter', src: typesetter, latin: 'Edith', persian: 'ادیث', gender: 'woman' },
  { id: 'unionDockWorker', src: unionDockWorker, latin: 'Helga', persian: 'هلگا', gender: 'woman' },
  { id: 'ruralSocialist', src: ruralSocialist, latin: 'Anna', persian: 'آنا', gender: 'woman' },
  { id: 'anarchistPrinter', src: anarchistPrinter, latin: 'Thea', persian: 'تئا', gender: 'woman' },
  { id: 'oldExile', src: oldExile, latin: 'Ernst', persian: 'ارنست', gender: 'man' },
] as const;

export type PortraitId = (typeof PORTRAITS)[number]['id'];

if (PORTRAITS.length !== AVATAR_COUNT) {
  throw new Error(`PORTRAITS (${PORTRAITS.length}) must match AVATAR_COUNT (${AVATAR_COUNT})`);
}

export function avatarImage(avatar: number): string {
  return PORTRAITS[Math.abs(avatar) % PORTRAITS.length].src;
}

export function portraitGender(avatar: number): PortraitGender {
  return PORTRAITS[normalizeAvatar(avatar)].gender;
}

/**
 * Same-gender portraits for scripted seats. Skip the viewer's card; reuse a
 * matching portrait only after that pool is empty.
 */
export function assignPortraits(
  youAvatar: number,
  genders: readonly PortraitGender[],
): number[] {
  const you = normalizeAvatar(youAvatar);
  const used = new Set<number>([you]);
  return genders.map((gender) => {
    const pool: number[] = [];
    for (let index = 0; index < PORTRAITS.length; index++) {
      if (PORTRAITS[index]?.gender === gender) pool.push(index);
    }
    const fresh = pool.find((index) => !used.has(index));
    if (fresh != null) {
      used.add(fresh);
      return fresh;
    }
    return pool.find((index) => index !== you) ?? pool[0] ?? 0;
  });
}
