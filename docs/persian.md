# Persian copy

How every player-facing Persian sentence in this app is written.
Default language is **fa**. English is the other original, not the source.

If you are about to write or change a Persian string, open this file.
A pass over current copy (applied) is
[`persian-rewrite.md`](./persian-rewrite.md).
The catalogs are [`client/src/i18n/locales/fa.ts`](../client/src/i18n/locales/fa.ts),
splash plaques in [`client/src/screens/SplashScreen/quotes.ts`](../client/src/screens/SplashScreen/quotes.ts),
Ravi in [`docs/ravi-script.md`](./ravi-script.md),
changelog `fa` in [`client/src/changelog/releases.json`](../client/src/changelog/releases.json),
and Bale replies in [`server/src/bale/commands.ts`](../server/src/bale/commands.ts).

## Write it in Persian. Do not translate.

`fa` and `en` are two originals. Same meaning, different sentences.
Never take the English line and walk it word-by-word into Persian.

The test: say the line out loud, in Persian, without looking at the English.
If a native would not say it that way at this table, rewrite it.
If you can map each Persian word back onto an English word in the same
order, it is a translation — throw it away.

Changelog voice (formal briefing) is in [`changelog.md`](./changelog.md).
This file owns spelling, register, and what “native” means.

## Registers

One language. Four places it sits. Do not mix them in one string.

| Place | Voice | Address | Where |
|---|---|---|---|
| **میز** | Spoken Iranian Persian (گفتاری). Short. Warm. | «شما» | Game UI, rules, tips, Ravi subtitles, logs, dialogs |
| **لوح** | Written Persian, dry, ironic, museum-plaque. Not chat. Not a textbook. | Third person (او) | Splash biography and attributed Hitler lines |
| **اعلامیه** | Formal, friendly, of the table. | «شما» / «می‌توانید» | Changelog `fa` |
| **بله** | Spoken, one-to-one with the bot. | «تو» | Bot replies in Bale |

Settings labels, phase names, and error titles can be a bit tighter than
table talk, but they still belong to **میز** — not to a government form.

| Don't | Do |
|---|---|
| English clause order, Persian words | A sentence a Tehran player would actually say or read |
| «توده‌ها فریب دروغ بزرگ را می‌خورند» | «مردم دروغ بزرگ را آسان‌تر باور می‌کنند تا دروغ کوچک را» |
| «به بازیکنان دیگر نمایش داده می‌شود» | «بقیه همین اسم را می‌بینند» |
| «میزبان اتاق را ترک کرد!» | «میزبان رفت. اتاق بسته شد.» |
| «تو رئیس‌جمهوری» on the table | «شما رئیس‌جمهورید» |
| «شما می‌توانید» in Ravi | «می‌تونید» / «می‌شه» |

Spoken **میز** still uses «شما», not street «تو». «یه / می‌شه / رو / اگه»
are correct here. «می‌تونی / چی کار می‌کنی / داداش» are not.
«چی» is fine when it means *what* in a real sentence
(«ببینید کی حرف می‌زنه، نه فقط چی می‌گه») — not as filler slang.

Still «تو», on purpose:

- Lectern chrome (`splash.offline`, `splash.offlineRetry`) — one person
  at the painting.
- Night / private Ravi (`نقشت رو`, look / hide) — whisper to one seat.

Table help and rules closers stay «شما» (`کنید`, not `کن`).

## Orthography

Write Persian letters and Persian joins. ASCII digits in source; the
registry turns them into ۰۱۲۳۴۵۶۷۸۹ at format time.

- **ی** and **ک**, never Arabic ي / ك.
- **نیم‌فاصله** (ZWNJ) on prefixes and compounds: `می‌شه`, `نمی‌ره`,
  `رئیس‌جمهور`, `کارت‌ها`, `فاشیست‌ها`, `به‌روزرسانی`.
- Ezafe after ه: `نسخهٔ`, `اتاقِ`, `خانهٔ` — not `خانه ی`.
- **رأی** with همزه in every visible string. Audio-only TTS exceptions
  live in [`ravi-script.md`](./ravi-script.md); subtitles still use `رأی`.
- Persian quotation marks: «» — not `"..."`.
- One space around em-dash if you use it: `رأی آورد — دور جدید`.
- `مثلاً` with tanvin when it means *for example*.

Pick one spelling and keep it. `رأی` and `رای` in the same app is a bug.
`رئیس‌جمهور` and `رئیس جمهور` is a bug.

## Locked words

Do not invent a second name for a thing the table already has.

| English | fa | Never |
|---|---|---|
| Chancellor | صدراعظم | نخست‌وزیر، وزیر |
| President | رئیس‌جمهور | رئیس جمهور (no ZWNJ), پرزیدنت |
| Policy card | قانون | سیاست، پالیسی |
| Ja / Nein | موافق / مخالف | بله / خیر as vote labels |
| Liberal / Fascist / Hitler | لیبرال / فاشیست / هیتلر | |
| Mein Kampf | نبرد من | نبردمن، کتاب من |
| Reichstag | رایشتاگ | رایش‌ستاگ |
| Night of the Long Knives | شب دشنه‌های بلند | شب کاردهای بلند |
| German Shepherd | سگِ ژرمن | ژرمن شپرد |
| Bale | بله | بیل |
| Ravi | راوی | |
| Secret Hitler | راز هیتلر | هیتلر مخفی |

## How a line is born

1. What is this line *doing*? Instruct, warn, plaque, button, error.
2. Forget the English. Say it in Persian for that register.
3. Write that. Then cut.
4. Read it once more for نیم‌فاصله, `رأی`, and locked words.

Buttons stay two or three words. Errors one sentence. Plaques one or two
short sentences. If it needs a third, it is two lines.

## Splash plaques

The loading screen is a lectern, not a loading tooltip.

**Table lines** (the first few, no `by`): **میز**. They may tease the
people at *this* table. Spoken, pointed.

**Biography:** **لوح**. Third person. Short facts, then a dry turn.
Persian rhythm — not English epigrams with Persian stickers on them.

**Attributed Hitler** (`by: نبرد من` and the like): still **لوح**.
Quote him as a Persian writer would put him on a wall. Famous lines
may follow a known Persian rendering, but only if that rendering is
something people actually say. A political-science calque of the
English Mein Kampf sentence is not “historical accuracy”.

Attribution is a Persian label, not a translated English slug:

| Don't | Do |
|---|---|
| نقل‌شده | منسوب به او |
| دربارهٔ تبلیغات | در باب تبلیغات — or drop `by` if it is just a folder name |

Do not switch into «تو» on a biography line, and do not switch into
«است / می‌شود» textbook on a table line.

### Don't / Do (plaques)

| Don't (calque) | Do (native) |
|---|---|
| توده‌ها خیلی راحت‌تر فریب دروغ بزرگ را می‌خورند تا دروغ کوچک را. | مردم دروغ بزرگ را آسان‌تر باور می‌کنند تا دروغ کوچک را. |
| دروغ را بزرگ کن. ساده کن. تکرار کن. | دروغ را بزرگ بگویید. ساده بگویید. مدام تکرارش کنید. |
| جنگیدن با ایمان همیشه سخت‌تر از جنگیدن با دانش است. | جنگ با ایمان همیشه سخت‌تر از جنگ با دانش است. |
| کلمات پل می‌سازند به جاهایی که هنوز دیده نشده. | واژه پل می‌زند به جایی که هنوز کسی نرفته. |
| لیبرال‌ها تعداد دارن. فاشیست‌ها اسم‌ها رو. | لیبرال‌ها بیشترن. فاشیست‌ها می‌دونن کی کیه. |
| ۲۰ آوریل ۱۸۸۹، در براونائو آم این به دنیا آمد. | در براونائو آم این به دنیا آمد؛ بیستم آوریل ۱۸۸۹. |

The English plaque may stay epigrammatic. The Persian plaque must
*think* in Persian. Matching punch is good. Matching syntax is not.
