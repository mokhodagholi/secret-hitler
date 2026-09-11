# Persian rewrite — applied

Applied against [`persian.md`](./persian.md). English was not touched.
This file is the record of what moved; new copy follows `persian.md`.

When we apply it: do **not** changelog copy-only work unless a player
would notice a *new* behaviour. Splash plaques are visible; if we rewrite
them, one patch line is enough — or skip, because it is tone, not a
feature.

## Order

| Pass | Where | Why first |
|---|---|---|
| **1** | [`quotes.ts`](../client/src/screens/SplashScreen/quotes.ts) | First thing a player reads. Worst calques. |
| **2** | [`fa.ts`](../client/src/i18n/locales/fa.ts) forms, errors, room-closed, a few table slips | Same app, two voices. |
| **3** | Ravi **subtitles** in `fa.ts` (`رأی`, `رئیس‌جمهور`, `بسوزونید`) | Spelling bugs. |
| **4** | [`releases.json`](../client/src/changelog/releases.json) `fa` that already shipped | Archive still shown. |
| **5** | [`preview.ts`](../client/src/changelog/preview.ts) | Local `?update=1` only. |
| **6** | [`commands.ts`](../server/src/bale/commands.ts) | One word. |

Then, if pass 3 changed **spoken** Ravi words (not just همزه), sync
[`ravi-script.md`](./ravi-script.md) FA subtitles and rebake those clips.
Audio may keep `رای` without همزه (TTS). Visible text must be `رأی`.

## Do not touch

- All `en` strings.
- Rules body, tips, most logs, most in-game hints — already **میز**.
- Bale `تو` (register is correct).
- Splash offline «اینترنت نداری.» / «دوباره تلاش کن» — lectern, one
  person; **تو** is right. Add this exception to `persian.md` when
  applying.
- Locked words already correct (`صدراعظم`, `راز هیتلر`, `نبرد من`).

---

## Pass 1 — splash plaques

English unchanged. Only `text.fa` and `by.fa`.

### Table lines (میز)

| # | Now | Propose |
|---|---|---|
| 1 | یکی سر این میز هیتلره. بیشترتون هم باهاش رأی می‌دید. | **keep** (`تون` is spoken «شما») |
| 2 | لیبرال‌ها تعداد دارن. فاشیست‌ها اسم‌ها رو. | لیبرال‌ها بیشترن. فاشیست‌ها می‌دونن کی کیه. |
| 3 | یا موافق یا مخالف. بقیه نمایشه. | **keep** |
| 4 | اعتماد اولین قانونیه که تصویب می‌کنی — و اولین قانونی که می‌سوزونن. | اعتماد اولین قانونیه که تصویب می‌کنید — و اولین قانونی که می‌سوزونن. |

### Attributed Hitler (لوح)

| Now | Propose | `by.fa` |
|---|---|---|
| توده‌ها خیلی راحت‌تر فریب دروغ بزرگ را می‌خورند تا دروغ کوچک را. | مردم دروغ بزرگ را آسان‌تر باور می‌کنند تا دروغ کوچک را. | نبرد من |
| دروغ را بزرگ کن. ساده کن. تکرار کن. | دروغ را بزرگ بگویید. ساده بگویید. مدام تکرارش کنید. | در باب تبلیغات *(was دربارهٔ تبلیغات)* |
| جنگیدن با ایمان همیشه سخت‌تر از جنگیدن با دانش است. | جنگ با ایمان همیشه سخت‌تر از جنگ با دانش است. | نبرد من |
| چه شانسی برای حاکمان که آدم‌ها فکر نمی‌کنند. | چه شانس بزرگی برای حاکمان، که مردم فکر نمی‌کنند. | منسوب به او *(was نقل‌شده)* |
| از فاتح هیچ‌وقت نمی‌پرسند راست گفته یا نه. | **keep** | نبرد من |
| تبلیغات باید عامه‌پسند باشد و خودش را با کم‌هوش‌ترین‌ها جور کند. | تبلیغات باید پسندِ مردم باشد و خودش را با کم‌هوش‌ترین‌ها جور کند. | نبرد من |
| کلمات پل می‌سازند به جاهایی که هنوز دیده نشده. | واژه راه باز می‌کند به جایی که هنوز کسی نرفته. | نبرد من |

### Biography (لوح) — only lines that move

The rest of the plaque (father, school, Iron Cross, Landsberg, bunker,
and the dry one-liners) stay. They already think in Persian.

| Now | Propose |
|---|---|
| ۲۰ آوریل ۱۸۸۹، در براونائو آم این به دنیا آمد. | در براونائو آم این به دنیا آمد؛ بیستم آوریل ۱۸۸۹. |
| مادرش کلارا لوسش کرد. خانه از آن حال بیرون نیامد. | مادرش کلارا لوسش کرد. خانه دیگر سر پا نشد. |
| تصمیم گرفت ارتش از پشت خنجر خورده. آن قصه را هیچ‌وقت ول نکرد. | گفت ارتش را از پشت زده‌اند. از این قصه دست برنداشت. |
| به یک حزب کوچک کارگری در مونیخ پیوست، چون کسی گفت برو بشنو. | به یک حزب کوچک کارگری در مونیخ پیوست، چون کسی گفته بود برود بشنود. |
| میکروفون را کشف کرد. اتاق هم او را کشف کرد. | میکروفون را پیدا کرد. سالن هم او را پیدا کرد. |
| ساعت‌ها بدون یادداشت حرف می‌زد. جمعیت حفظ می‌کرد. | ساعت‌ها بی‌یادداشت حرف می‌زد. ازبر کردن کارِ جمعیت بود. |
| حرکات دست را تمرین می‌کرد. خشم تئاتری بود با برنامه. | حرکت دست را تمرین می‌کرد. خشم تئاتر بود؛ برنامه داشت. |
| کودتای آبجوفروشی ۱۹۲۳ مسخره بود. شانزده نفر از آدم‌هایش مردند. او فرار کرد. | کودتای آبجوفروشی ۱۹۲۳ مضحکه بود. شانزده نفر از آدم‌هایش مردند. خودش فرار کرد. |
| فهمید رأی می‌تواند کاری را تمام کند که گلوله نتوانسته. | فهمید رأی همان کاری را تمام می‌کند که گلوله نتوانست. |
| رکود را صبر کرد. گرسنگی صدای سخنرانی‌ها را بلندتر کرد. | رکود را تاب آورد. گرسنگی سخنرانی‌ها را بلندتر کرد. |
| شب کاردهای بلند کشتار خودی‌ها بود. … | شب دشنه‌های بلند کشتار خودی‌ها بود. وفاداری یک سقف داشت: خودش. |
| سگ دوست داشت، مخصوصاً ژرمن شپرد. بلوندی با او مرد. | سگ دوست داشت، مخصوصاً سگِ ژرمن. بلوندی با او مرد. |
| تا آخر خودش را هنرمند نامید. تاریخ چیز دیگری صداش کرد. | تا آخر خودش را هنرمند نامید. تاریخ چیز دیگری صدایش کرد. |
| او از رادیو همان‌طور استفاده کرد که ستمگرهای قبلی از میدان. | از رادیو همان‌طور استفاده کرد که ستمگران پیشین از میدان. |
| فیلم اسلحه بود. راش‌ها را مثل ژنرال می‌دید. | فیلم اسلحه بود. فیلم خام را مثل ژنرال می‌دید. |
| قانونی منصوب شد. همین جمله باید بیدارت نگه دارد. | قانونی منصوب شد. همین جمله باید بیدارتان نگه دارد. |
| دولت را یک‌شبه نگرفت. کلید را دادند دستش، بعد قفل‌ها را عوض کرد. | دولت را یک‌شبه نگرفت. کلید را به دستش دادند؛ بعد قفل‌ها را عوض کرد. |
| اطاعت را شبیه تعلق خاطر کرد. | اطاعت را شبیه باهم‌بودن کرد. |
| تعلق را شبیه بدهی کرد که فقط با خون دیگران ادا می‌شد. | باهم‌بودن را شبیه بدهی کرد که فقط با خون دیگران ادا می‌شد. |
| اجتناب‌ناپذیر نبود. تنها جملهٔ تسلی همین است، و خیلی هم تسلی نیست. | حتمی نبود. تنها جمله‌ای که کمی آرام می‌کند همین است — و خیلی هم آرام نمی‌کند. |
| آخرین حقه این بود که فکر کنی سر میز تو هیچ‌وقت اتفاق نمی‌افتد. | آخرین حقه این بود که فکر کنید سر میز شما هیچ‌وقت اتفاق نمی‌افتد. |

---

## Pass 2 — `fa.ts` (not the table, not rules)

Labels can stay short. Sentences must be **میز**, not a form.

### Keep as-is (already native)

`nav.*`, `common.ok` / `cancel`, `rules.*` (except two lines below),
`tip.*`, almost all `game.*` / `log.*` / `role*` / `waiting` host/ready
buttons, changelog UI (`اعلامیه‌ها`, `متوجه شدم`).

### Propose

| Key | Now | Propose |
|---|---|---|
| `logo.tagline` | بازیِ استنتاج،\nفریب و فاشیسم | بازیِ حدس،\nفریب و فاشیسم |
| `home.tagline` | یک شب، هزار راز و یک برنده! | **keep or** یک شب، خیلی راز، یک برنده. *(optional — slogan-y but already Persian)* |
| `splash.offline` | اینترنت نداری. | **keep** (lectern) |
| `splash.offlineRetry` | دوباره تلاش کن | **keep** |
| `update.title` | نسخهٔ جدید آماده است | نسخهٔ جدید آماده است. *(period only)* — or **keep** |
| `settings.profileNamePlaceholder` | به بازیکنان دیگر نمایش داده می‌شود | بقیه همین اسم را می‌بینند |
| `createRoom.yourNamePlaceholder` | *(same)* | بقیه همین اسم را می‌بینند |
| `settings.profileNameFromBale` | از حساب بله شما گرفته شده | اسم‌تان از بله آمده |
| `settings.confirmActions` | تأیید اقدامات | قبل از هر کار بپرس |
| `play.chooseOption` | یک گزینه انتخاب کنید | یکی را بردارید |
| `play.createRoomDescription` | بازی جدیدی شروع کنید و دوستان‌تان را دعوت کنید. | اتاق بسازید و دوست‌ها را صدا کنید. |
| `play.joinGameDescription` | اتاق‌های باز را ببینید و سر میز بنشینید. | اتاق‌های باز را ببینید و بنشینید سر میز. |
| `createRoom.roomNamePlaceholder` | مثلا اتاق هیتلر | مثلاً اتاق هیتلر |
| `createRoom.passwordPlaceholder` | برای اتاق عمومی خالی بگذارید | خالی = اتاق برای همه باز است |
| `joinGame.noRooms` | فعلاً اتاق بازی وجود ندارد. یکی بسازید! | الان اتاقی نیست. یکی بسازید. |
| `joinGame.availableRooms` | اتاق‌های موجود | اتاق‌های باز |
| `waiting.startNeedPlayers` | الان {current} بازیکن در اتاق هستند. برای شروع {count} نفر دیگر دعوت کنید. | الان {current} نفر تو اتاق‌اند. برای شروع {count} نفر دیگر بیاورید. |
| `waiting.startNotReady` | قبل از شروع باید همه بازیکنان آماده باشند. | تا همه آماده نشوند شروع نمی‌شود. |
| `game.chatPlaceholder` | پیام خود را بنویسید… | یه چیزی بنویسید… |
| `game.viewRules` | مشاهدهٔ قوانین | قوانین |
| `game.help.elect` | دولت بساز و قانون تصویب کن! | دولت بسازید و قانون تصویب کنید! |
| `game.help.vote` | به این دولت رأی بده! | به این دولت رأی بدهید! |
| `game.presidentialCandidate` | نامزد ریاست‌جمهوری | نامزد رئیس‌جمهوری |
| `rules.remember` | یادت باشه | یادتان باشد |
| `rules.trustNoOne` | به هیچ‌کس اعتماد نکن. | به هیچ‌کس اعتماد نکنید. |
| `roomClosed.hostLeft` | میزبان اتاق را ترک کرد! | میزبان رفت. اتاق بسته شد. |
| `roomClosed.kicked` | میزبان شما را از اتاق اخراج کرد. | میزبان اخراجتان کرد. |
| `phase.nomination` | معرفی نامزد | نامزدی |
| `phase.presidentLegislative` | رئیس‌جمهور — قانون‌گذاری | نوبت رئیس‌جمهور |
| `phase.chancellorLegislative` | صدراعظم — قانون‌گذاری | نوبت صدراعظم |
| `error.AUTH_FAILED` | نشست شما منقضی شده است. دوباره به اتاق بپیوندید. | نشست‌تان تمام شده. دوباره وارد اتاق شوید. |
| `error.ROOM_NOT_FOUND` | این اتاق دیگر وجود ندارد. | این اتاق دیگر نیست. |
| `error.ROOM_FULL` | این اتاق پر است. | این اتاق پر است. **keep** |
| `error.WRONG_PASSWORD` | رمز عبور اشتباه است. | رمز اشتباه است. |
| `error.ALREADY_STARTED` | بازی قبلاً شروع شده است. | بازی شروع شده. |
| `error.NOT_HOST` | فقط میزبان می‌تواند این کار را انجام دهد. | فقط میزبان این کار را می‌کند. |
| `error.NOT_ENOUGH_PLAYERS` | تعداد بازیکنان برای شروع کافی نیست. | برای شروع بازیکن کم است. |
| `error.PLAYERS_NOT_READY` | برای شروع باید همه آماده باشند. | همه باید آماده باشند. |
| `error.RATE_LIMITED` | کمی آهسته‌تر! چند لحظه صبر کنید. | **keep** |
| `error.INVALID_ACTION` | این اقدام در حال حاضر در دسترس نیست. | الان این کار را نمی‌شود کرد. |
| `error.NETWORK` | ارتباط با سرور برقرار نشد. اتصال خود را بررسی کنید. | به سرور وصل نشد. اینترنت را چک کنید. |

---

## Pass 3 — Ravi subtitles (`fa.ts` `ravi.*`)

Spoken voice stays **میز**. This pass is spelling and «شما».

| Key | Now | Propose | Rebake audio? |
|---|---|---|---|
| `ravi.president.nextYou` | شما رئیس جمهور شدید. | شما رئیس‌جمهور شدید. | no (ZWNJ) |
| `ravi.vote.start` | رای‌گیری آغاز شد. | رأی‌گیری آغاز شد. | no |
| `ravi.vote.collecting` | رای‌ها داره جمع می‌شه. | رأی‌ها داره جمع می‌شه. | no |
| `ravi.vote.passed` | دولت رای آورد. | دولت رأی آورد. | no |
| `ravi.vote.failed` | دولت رای نیاورد. | دولت رأی نیاورد. | no |
| `ravi.chaos.start` | سه دولت پشت‌سرهم رای نیاورد. … | سه دولت پشت‌سرهم رأی نیاورد. آشوب شروع شد. | no |
| `ravi.law.presidentChoosing` | رئیس جمهور یه کارت رو می‌سوزونه. | رئیس‌جمهور یه کارت رو می‌سوزونه. | no |
| `ravi.private.vote` | به این دولت رای بدید. | به این دولت رأی بدید. | no |
| `ravi.private.discard` | یه قانون رو بسوزون. | یه قانون رو بسوزونید. | **yes** — «تو» → «شما» |
| `ravi.discuss.afterPower` | خب از قدرتا استفاده کردیم بسه، حالا حرف بزنیم | خب از قدرت‌ها استفاده کردیم، بسه. حالا حرف بزنیم. | **yes** if we keep the pause |

`ravi.night.*` / `ravi.deal.look` stay «نقشت رو» — whisper to one
player; **تو** is the private ear, not the table. Keep. Note it in
`persian.md` as a night exception.

After subtitles change, copy the same FA into `ravi-script.md`. Do not
change the TTS spellings in the audio column (`رای`, no ZWNJ) unless a
clip is rebaked for new words.

---

## Pass 4 — shipped changelog `fa`

Register is **اعلامیه** (formal). These two still read like a bug ticket:

| Version | Now | Propose |
|---|---|---|
| 0.1.2 | اگر بازی را در بله باز کنید، بازگشت با دکمهٔ خود بله انجام می‌شود و پیکان جداگانه‌ای روی میز نیست. | در بله، بازگشت همان دکمهٔ خود بله است؛ پیکانِ اضافه روی میز نیست. |
| 0.1.2 | پس از ترک اتاق، بازگشت شما را به خانه می‌رساند و در منوی بازی گیر نمی‌کنید. | اگر از اتاق بیرون بیایید، بازگشت شما را به خانه می‌برد، نه به منوی بازی. |

0.1.1 and 0.1.0 can stay.

## Pass 5 — changelog preview

Sample copy only. Fix the locked-word slip and one calque:

| Now | Propose |
|---|---|
| کارت سیاست در کشوی قانون، دیگر پشت کارت بعدی پنهان نمی‌ماند. | کارت قانون در کشو، دیگر پشت کارت بعدی پنهان نمی‌ماند. |

The rest of `preview.ts` already speaks **اعلامیه**. Leave it.

## Pass 6 — Bale

| Now | Propose |
|---|---|
| `لابی` in `formatGame` | اتاق انتظار *(same words as the client `phase.lobby`)* |

Welcome text stays **تو**. Do not «شما»-ify the bot.

---

## After apply — one-line additions to `persian.md`

- Lectern chrome (`splash.offline`) may use «تو».
- Night / private Ravi (`نقشت رو`) may use «تو».
- Table help and rules closers use «شما» (`کنید` not `کن`).

## Tests

- Splash: existing length test still holds; no need to snapshot every
  plaque. Optional: assert `by.fa` is never `نقل‌شده` / `سال‌های وین`.
- Locale tests that look up exact `fa` strings (if any) must follow the
  new wording. Grep for the old sentences when applying.
- Do not add a Persian-style linter. The doc is the rule.
