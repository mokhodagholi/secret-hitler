import type { ChangelogRelease } from './changelog';

/** Sample notes for `?update=1` in dev. Not used in production. */
export const PREVIEW_RELEASES: ChangelogRelease[] = [
  {
    version: '0.3.0',
    bump: 'minor',
    date: '2026-09-20',
    changes: [
      {
        kind: 'feat',
        fa: 'رئیس‌جمهور می‌تواند در وقت بحث، نوبت سخن را به صندلی بعد واگذار کند.',
        en: 'The President may now pass the floor to the next seat during discussion.',
      },
      {
        kind: 'feat',
        fa: 'پس از هر به‌روزرسانی، اعلامیهٔ تغییرات روی میز گذاشته می‌شود.',
        en: 'Each update now arrives with a briefing of what changed at the table.',
      },
      {
        kind: 'feat',
        fa: 'بایگانی اعلامیه‌های پیشین از تنظیمات در دسترس است.',
        en: 'Earlier briefings are kept in Settings, should you wish to review them.',
      },
      {
        kind: 'feat',
        fa: 'اگر ارتباط لحظه‌ای قطع شود، میز برجا می‌ماند و گفتگو از سر گرفته می‌شود.',
        en: 'A brief loss of connection no longer clears the table; talk resumes where it left off.',
      },
    ],
  },
  {
    version: '0.2.1',
    bump: 'patch',
    date: '2026-09-14',
    changes: [
      {
        kind: 'fix',
        fa: 'رأی‌هایی که در لحظهٔ قطع ارتباط ثبت شده بودند، دیگر گم نمی‌شوند.',
        en: 'Votes cast as the connection dropped are no longer lost.',
      },
      {
        kind: 'fix',
        fa: 'نام مهمان پس از ورود دوباره به لابی، دیگر جای صندلی خالی را نمی‌گیرد.',
        en: 'A returning guest no longer occupies an empty seat that was never theirs.',
      },
      {
        kind: 'fix',
        fa: 'کارت قانون در کشو، دیگر پشت کارت بعدی پنهان نمی‌ماند.',
        en: 'A policy card in the legislative drawer no longer hides behind the next one.',
      },
    ],
  },
  {
    version: '0.2.0',
    bump: 'major',
    date: '2026-09-11',
    changes: [
      {
        kind: 'feat',
        fa: 'میز از نو چیده شد؛ دولت و قدرت‌ها در یک نگاه دیده می‌شوند.',
        en: 'The table has been laid out anew; government and powers are visible at a glance.',
      },
      {
        kind: 'feat',
        fa: 'ردیاب فاشیسم و لیبرالیسم، مسیر هر قانون را تا پایان دور نشان می‌دهد.',
        en: 'The fascist and liberal tracks now show the path of each law through the round.',
      },
      {
        kind: 'feat',
        fa: 'صندلی خالی با نام بازیکن تازه، بی‌درنگ پر می‌شود.',
        en: 'An empty seat fills at once when a new player takes their name.',
      },
      {
        kind: 'feat',
        fa: 'دعوت به میز، از داخل بله و بدون ترک گفتگو انجام می‌شود.',
        en: 'An invitation to the table now stays inside Bale, without leaving the chat.',
      },
    ],
  },
  {
    version: '0.1.2',
    bump: 'patch',
    date: '2026-09-08',
    changes: [
      {
        kind: 'fix',
        fa: 'صدای راوی در پایان اعلام نقش، دیگر روی جملهٔ بعد نمی‌افتد.',
        en: 'The narrator’s voice no longer overlaps the next line after a role is announced.',
      },
      {
        kind: 'fix',
        fa: 'تایمر بحث پس از وتو، از نو آغاز می‌شود نه از ثانیهٔ میانی.',
        en: 'The discussion timer restarts after a veto, rather than from a mid-count.',
      },
      {
        kind: 'fix',
        fa: 'لیست بازیکنان در لابی، ترتیب ورود را نگه می‌دارد.',
        en: 'The lobby list now keeps the order in which players arrived.',
      },
    ],
  },
  {
    version: '0.1.1',
    bump: 'patch',
    date: '2026-09-05',
    changes: [
      {
        kind: 'fix',
        fa: 'لینک دعوت، بازی را مستقیم در بله باز می‌کند.',
        en: 'An invite link now opens the game inside Bale.',
      },
      {
        kind: 'fix',
        fa: 'پنجرهٔ قوانین هنگام چرخش صفحه، دیگر متن را قطع نمی‌کند.',
        en: 'The rules window no longer clips its text when the screen turns.',
      },
    ],
  },
  {
    version: '0.1.0',
    bump: 'minor',
    date: '2026-09-01',
    changes: [
      {
        kind: 'feat',
        fa: 'میز برای نخستین نشست آماده شد؛ کارت‌ها، رأی و قانون در جای خود نشسته‌اند.',
        en: 'The table is ready for a first sitting; cards, votes, and law sit in their places.',
      },
      {
        kind: 'feat',
        fa: 'تنظیمات، زبان، موسیقی و صدای راوی را جداگانه نگاه می‌دارد.',
        en: 'Settings keep language, music, and the narrator’s voice each in their own place.',
      },
      {
        kind: 'feat',
        fa: 'قوانین بازی از خانه در دسترس است، پیش از آن‌که صندلی گرفته شود.',
        en: 'The rules of the table are at hand from Home, before a seat is taken.',
      },
    ],
  },
];
