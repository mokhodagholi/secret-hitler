# Ravi script

Every sentence Ravi may say. Ids are stable: they become `ravi.*` i18n
keys and `deal.start.mp3` filenames.

**Voice rules**

- Short. One breath. No jokes.
- Spoken Iranian Persian (گفتاری), not textbook (کتابی). A real host
  at the table: `می‌شه`, `رو`, `تون`, `کنه`. Not `می‌شود` / `را` / `تان`.
- Table voice for now: **Daniel** (ElevenLabs). One speaker for every
  clip — do not let a direction tag change the person.
- TTS spellings (audio only, Daniel): `رأی` so it is *ra’y* not
  English *ray*; `نیاورْد` (past نیاورد, not present نیاورَد, not «نی اورد»);
  `شُمارَنده`; `حقِّ وتو رو` (tashdid on ق, kasra for ezafe);
  `وِتو` not `وَتو`. Subtitles may stay undiacritic.
- `deal.start` is two breaths with a **short** pause (~0.35 s), not a
  full second.
- Subtitle interpolates `{name}`, `{ja}`, `{nein}`, `{count}`.
- Audio is the nameless take when a name would be spoken. The header
  already shows the name.
- Never a secret (see [`ravi.md`](./ravi.md)).

## Tones

A small locked set. Each bake line gets **one** tag. Whispering is the
private/secret colour; the rest are radio, not theatre.

| Tone | Tag | When |
|---|---|---|
| **whisper** | `[whispering]` | Night, private look, investigation party, President’s burn prompt. Close to the ear. |
| **warm** | `[warmly]` | Welcome only (`deal.start`). |
| **calm** | `[calm]` | Default table. Routine motion. `vote.start` stays here so Daniel does not turn into another announcer. |
| **announce** | `[announcing]` | A public office or count just became true. |
| **firm** | `[firm]` | A decision stuck (vote passed, veto resolved, discussion over). |
| **down** | `[disappointed]` | The table lost something (failed government, no nominee). |
| **grave** | `[grave]` | Bad public news (Fascist law, chaos, execution, Fascist win). |

Do not invent extra tags per line. If it is not in this table, it is
`[calm]`.

---

## Night / deal

### `deal.start`
- **When:** Cards split off the pile to each seat. Night has not
  opened yet.
- **FA:** سلام به یه راز هیتلر دیگه خوش اومدید
  امیدوارم که بازی خوبی داشته باشیم
- **EN:** Welcome to another Secret Hitler.
  Hope we have a good game.
- **Tone:** `[warmly]` on both breaths.
- **Audio:** one clip, two breaths — hello, a **0.35 s** pause, then the
  hope line. `سلام به یه راز هیتلر دیگه خوش اومدید.` … `امیدوارم که بازی خوبی داشته باشیم.`

### `deal.look`
- **When:** Private role card is up. Same words as `night.start`.
- **FA:** نقشت رو با دقت ببین.
- **EN:** Look at your role carefully.
- **Tone:** `[whispering]`
- **Audio:** same as FA.

### `night.start`
- **When:** Night opens and the private role is up. Same audio for
  every seat; only the picture differs.
- **FA:** نقشت رو با دقت ببین.
- **EN:** Look at your role carefully.
- **Tone:** `[whispering]`
- **Audio:** same.

### `night.end`
- **When:** Glance ends and day begins.
- **FA:** نقشت رو حالا قایم کن.
- **EN:** Now hide your role.
- **Tone:** `[whispering]`
- **Audio:** same.

### `president.first`
- **When:** First President of the game is named.
- **FA subtitle:** این دور {name} رئیس‌جمهوره.
- **FA audio:** رئیس‌جمهور این دور معلوم شد.
- **EN subtitle:** {name} is President this round.
- **EN audio:** The President for this round has been chosen.

### `president.firstYou`
- **When:** First President of the game is you.
- **FA:** این دور شما رئیس‌جمهورید.
- **EN:** You are President this round.
- **Audio:** same as FA.

### `president.next`
- **When:** Placard moves clockwise (not a special election).
- **FA subtitle:** {name} رئیس‌جمهور شد.
- **FA audio:** نفر بعدی رئیس جمهور شد.
- **EN subtitle:** {name} is President.
- **EN audio:** The next player is President.
- **Tone:** `[announcing]`

### `president.nextYou`
- **When:** The presidency passes to you.
- **FA:** شما رئیس‌جمهور شدید.
- **EN:** You are President.
- **Tone:** `[announcing]`
- **Audio:** same as FA.

### `president.special`
- **When:** Special Election names the next candidate.
- **FA subtitle:** انتخابات ویژه. رئیس بعدی {name}ه.
- **FA audio:** انتخابات ویژه شروع شد.
- **EN subtitle:** Special election — {name} is the next President.
- **EN audio:** A special election has been called.

---

## Discussion

### `discuss.start`
- **When:** Discussion window opens on the first day, or after a quiet
  round with no failed vote, power, or leaver.
- **FA:** خب، وقت حرف زدنه.
- **EN:** Okay. Time to talk.

### `discuss.afterFail`
- **When:** A new discussion opens after a failed government (rejected
  vote or no nominee).
- **FA:** این سری سعی کنید به اجماع برسید!
- **EN:** This time, try to reach a consensus!
- **Tone:** `[firm]`

### `discuss.afterPower`
- **When:** Discussion opens after the President finished an executive power.
- **FA:** خب از قدرت‌ها استفاده کردیم، بسه. حالا حرف بزنیم.
- **EN:** Okay, enough with the powers. Now we talk.
- **Tone:** `[calm]`

### `discuss.afterLeave` / `afterLeave2` / `afterLeave3`
- **When:** Discussion opens after a player left or was kicked. Pick one of
  the three takes at random, skipping the last one so it does not repeat.
  Never play these on a normal or after-power open.
- **Tone:** `[calm]` — a dry table joke is allowed on this beat only.

`afterLeave`
- **FA:** یکی فرار کرد. بقیه سر میز بمونید.
- **EN:** Someone ran. The rest of you stay at the table.

`afterLeave2`
- **FA:** یه صندلی خالی شد. دل‌تون واسش تنگ نشه.
- **EN:** A seat is empty. Don't miss them too much.

`afterLeave3`
- **FA:** یکی زد بیرون. صندلی حرف نمی‌زنه — شما بزنید.
- **EN:** Someone walked out. The chair doesn't talk — you do.

### `discuss.closing`
- **When:** ~30 s left of the 5-minute window.
- **FA:** به آخرای وقت نزدیک شدیم.
- **EN:** We're getting close to the end.
- **Tone:** `[calm]`

### `discuss.ended`
- **When:** Timer ends or the President skips.
- **FA:** وقت تموم شد.
- **EN:** Time's up.
- **Tone:** `[firm]`

---

## Nomination

### `nominate.start`
- **When:** Nomination window opens. Public table line. The President does
  **not** hear this — they only get `private.nominate`.
- **FA:** رئیس‌جمهور، صدراعظم رو انتخاب کنه.
- **EN:** The President chooses a Chancellor.

### `nominate.named`
- **When:** A Chancellor is nominated.
- **FA subtitle:** {president} {chancellor} رو صدراعظم انتخاب کرد.
- **FA audio:** صدراعظم انتخاب شد.
- **EN subtitle:** {president} chose {chancellor} as Chancellor.
- **EN audio:** A Chancellor has been chosen.

### `nominate.namedYou`
- **When:** You nominated the Chancellor.
- **FA subtitle:** شما {chancellor} رو صدراعظم انتخاب کردید.
- **FA audio:** شما صدراعظم رو انتخاب کردید.
- **EN subtitle:** You chose {chancellor} as Chancellor.
- **EN audio:** You chose a Chancellor.

### `nominate.namedAsYou`
- **When:** You were nominated Chancellor.
- **FA subtitle:** {president} شما رو صدراعظم انتخاب کرد.
- **FA audio:** شما رو صدراعظم انتخاب کردن.
- **EN subtitle:** {president} chose you as Chancellor.
- **EN audio:** You have been named Chancellor.

### `nominate.timeout`
- **When:** President did not pick in time.
- **FA:** صدراعظم انتخاب نشد.
- **EN:** No Chancellor was chosen.

### `office.presidentLeft`
- **When:** The sitting President leaves or is kicked.
- **FA subtitle:** {name} رئیس‌جمهور بود و از بازی رفت.
- **FA audio:** رئیس‌جمهور از بازی رفت.
- **EN subtitle:** {name} was President and left the game.
- **EN audio:** The President has left the game.
- **Tone:** `[disappointed]`

### `office.chancellorLeft`
- **When:** The sitting Chancellor leaves or is kicked.
- **FA subtitle:** {name} صدراعظم بود و از بازی رفت.
- **FA audio:** صدراعظم از بازی رفت.
- **EN subtitle:** {name} was Chancellor and left the game.
- **EN audio:** The Chancellor has left the game.
- **Tone:** `[disappointed]`

### `office.roundOver`
- **When:** Right after an office-holder left; the current government is void
  and the presidency will pass on.
- **FA:** این دور تموم شد.
- **EN:** This round is over.
- **Tone:** `[firm]`

### `player.left`
- **When:** A player who is not President or Chancellor leaves or is kicked.
  Office-holders use the lines above instead.
- **FA subtitle:** {name} از بازی رفت.
- **FA audio:** یکی از بازیکن‌ها از بازی رفت.
- **EN subtitle:** {name} left the game.
- **EN audio:** A player left the game.
- **Tone:** `[disappointed]`

### `player.away`
- **When:** A seated player disconnects and may still reconnect. Not a leave
  or a kick — `player.left` stays for those.
- **FA subtitle:** {name} از میز رفت. شاید برگرده.
- **FA audio:** یکی از میز رفت. شاید برگرده.
- **EN subtitle:** {name} left the table. They might come back.
- **EN audio:** Someone left the table. They might come back.
- **Tone:** `[calm]`

### `player.back`
- **When:** That player’s seat reconnects. Other seats.
- **FA subtitle:** {name} برگشت سر میز.
- **FA audio:** یکی برگشت سر میز.
- **EN subtitle:** {name} is back.
- **EN audio:** Someone is back.
- **Tone:** `[calm]`

### `player.backYou`
- **When:** You just reconnected.
- **FA:** خوش برگشتید.
- **EN:** Welcome back.
- **Tone:** `[calm]`
- **Audio:** same as FA.

---

## Table kick vote

Nameless audio. Subtitles interpolate `{name}` (requester on the request,
the accused on the result) and `{target}`. Daniel only.

### `kick.asked`
- **When:** A kick vote opens. Other seats — not the requester, not the accused.
- **FA subtitle:** {name} درخواست اخراج {target} رو داده.
- **FA audio:** یه نفر درخواست اخراج داد.
- **EN subtitle:** {name} asked to kick {target}.
- **EN audio:** Someone asked for a kick.
- **Tone:** `[announcing]`

### `kick.askedYou`
- **When:** You asked the table to remove someone.
- **FA subtitle:** شما درخواست اخراج {target} رو دادید.
- **FA audio:** شما درخواست اخراج دادید.
- **EN subtitle:** You asked to kick {target}.
- **EN audio:** You asked for a kick.
- **Tone:** `[calm]`

### `kick.askedOnYou`
- **When:** The vote is about removing you.
- **FA subtitle:** {name} درخواست اخراج شما رو داده.
- **FA audio:** درخواست اخراج شما اومده.
- **EN subtitle:** {name} asked to kick you.
- **EN audio:** Someone asked to kick you.
- **Tone:** `[firm]`

### `kick.passed`
- **When:** Enough yes votes. Other seats.
- **FA subtitle:** تعداد رأی کافی بود. {name} اخراج شد.
- **FA audio:** تعداد رأی کافی بود. اخراج شد.
- **EN subtitle:** Enough votes. {name} is out.
- **EN audio:** Enough votes. They're out.
- **Tone:** `[disappointed]`

### `kick.passedYou`
- **When:** You asked, and there were enough votes.
- **FA subtitle:** تعداد رأی کافی بود. {name} اخراج شد.
- **FA audio:** تعداد رأی کافی بود. اخراج شد.
- **EN subtitle:** Enough votes. {name} is out.
- **EN audio:** Enough votes. They're out.
- **Tone:** `[firm]`

### `kick.passedOnYou`
- **When:** Enough votes to remove you.
- **FA:** تعداد رأی کافی بود. متأسفیم، شما اخراج می‌شید.
- **EN:** Enough votes. Sorry — you're out.
- **Tone:** `[grave]`

### `kick.failed`
- **When:** Not enough yes votes. Other seats.
- **FA:** تعداد رأی کافی نبود.
- **EN:** Not enough votes.
- **Tone:** `[calm]`

### `kick.failedYou`
- **When:** You asked, and there were not enough votes.
- **FA:** تعداد رأی کافی نبود.
- **EN:** Not enough votes.
- **Tone:** `[disappointed]`

### `kick.failedOnYou`
- **When:** Not enough votes to remove you.
- **FA:** تعداد رأی کافی نبود. شما می‌مونید.
- **EN:** Not enough votes. You're staying.
- **Tone:** `[calm]`

Do not also speak `player.left` for the same kick — `kick.passed*` already
says they left. An office-holder still gets `office.presidentLeft` /
`office.chancellorLeft` after that if they held a seat.

---

## Vote

Ja / Nein stay on the cards. Ravi does not say «یا» — in Persian that
word already means “or”, so «یا یا نِین» is noise.

### `vote.start`
- **When:** Voting opens.
- **FA:** رأی‌گیری آغاز شد.
- **EN:** Voting has begun.
- **Tone:** `[calm]` — not `[announcing]`; that tag made this clip
  sound like another person.

### `vote.collecting`
- **When:** Cards are flying face-down to the centre. Optional; skip if
  it talks over the motion.
- **FA:** رأی‌ها داره جمع می‌شه.
- **EN:** The votes are being gathered.
- **Tone:** `[calm]`

### `vote.count`
- **When:** Face-down pile has been tallied. Totals only; no seats.
- **FA subtitle:** {ja} موافق، {nein} مخالف.
- **FA audio:** رأی ها شمرده شد.
- **EN subtitle:** {ja} Ja, {nein} Nein.
- **EN audio:** The votes have been counted.
- **Tone:** `[announcing]`

### `vote.passed`
- **When:** Strict Ja majority.
- **FA subtitle:** دولت رأی آورد. {ja} موافق، {nein} مخالف.
- **FA audio:** دولت رای آورد.
- **EN subtitle:** The government is elected. {ja} Ja, {nein} Nein.
- **EN audio:** The government is elected.

### `vote.failed`
- **When:** No strict majority (a tie fails).
- **FA subtitle:** دولت رأی نیاورد. {ja} موافق، {nein} مخالف.
- **FA audio:** دولت رأی نیاورْد.
- **EN subtitle:** The government is rejected. {ja} Ja, {nein} Nein.
- **EN audio:** The government is rejected.
- **Tone:** `[disappointed]`

### `vote.hitlerChancellor`
- **When:** Elected Chancellor is Hitler and 3+ Fascist laws are down.
- **FA:** هیتلر صدراعظم شد. فاشیست‌ها برنده شدن.
- **EN:** Hitler is Chancellor. The Fascists win.

---

## Election tracker / chaos

### `tracker.advance`
- **When:** A failed government ticks the tracker (not a reset).
- **FA subtitle:** شکست {count} از ۳.
- **FA audio:** شُمارَنده یکی رفت جلو.
- **EN subtitle:** Election tracker {count} of 3.
- **EN audio:** The tracker advances.
- **Tone:** `[announcing]`

### `chaos.start`
- **When:** Third consecutive failure.
- **FA:** سه دولت پشت‌سرهم رأی نیاورد. آشوب شروع شد.
- **EN:** Three governments failed in a row. Chaos begins.

### `chaos.enacted`
- **When:** Top law is enacted with no power. Follow with `law.liberal`
  or `law.fascist`.
- **FA:** قانونِ بالای دسته تصویب می‌شه. رئیس‌جمهور قدرتی نمی‌گیره.
- **EN:** The top policy of the deck is enacted. The President gets no power.
- **Tone:** `[grave]`

---

## Legislative session

### `law.draw`
- **When:** Three backs leave the deck toward the President.
- **FA:** سه تا قانون می‌اد دست رئیس‌جمهور.
- **EN:** Three policies are coming to the President.

### `law.drawYou`
- **When:** You are the President; the three laws are coming to you.
- **FA:** سه تا قانون می‌اد دستتون.
- **EN:** Three policies are coming to you.
- **Tone:** `[whispering]`
- **Audio:** same line; clip may still be missing — subtitle still runs.

### `law.presidentChoosing`
- **When:** President is looking. Public; no colours.
- **FA:** رئیس‌جمهور یه کارت رو می‌سوزونه.
- **EN:** The President burns a card.
- **Tone:** `[calm]`
- **President-only (whisper):** `private.discard` — `یه قانون رو بسوزونید.`

### `law.silence`
- **When:** A legislative session is open and this seat is not burning or
  enacting. Header + subtitle. **No mp3 yet** — bake with Daniel later.
- **FA:** ساکت. دارن قانون برمی‌دارن.
- **EN:** Quiet. They're choosing the laws.
- **Tone:** `[firm]`

### `law.burned`
- **When:** One back lands on the discard pile.
- **FA:** یه قانون سوخت.
- **EN:** A policy is burned.

### `law.pass`
- **When:** Two backs travel to the Chancellor.
- **FA:** دو تا قانون می‌اد دست صدراعظم.
- **EN:** Two policies are coming to the Chancellor.

### `law.passYou`
- **When:** You are the Chancellor; the two remaining laws are coming to you.
- **FA:** دو تا قانون می‌اد دستتون.
- **EN:** Two policies are coming to you.
- **Tone:** `[whispering]`

### `law.chancellorChoosing`
- **When:** Chancellor is looking.
- **FA:** صدراعظم یکی رو تصویب می‌کنه.
- **EN:** The Chancellor enacts one policy.

### `law.liberal`
- **When:** A Liberal law hits the board.
- **FA:** یه قانون لیبرالی تصویب شد.
- **EN:** A Liberal policy is enacted.

### `law.fascist`
- **When:** A Fascist law hits the board.
- **FA:** یه قانون فاشیستی تصویب شد.
- **EN:** A Fascist policy is enacted.

Veto audio follows the good `law.vetoRejected` take: `حقِّ وتو رو`,
same speaker, same radio grain. Not a different person, not «و تو».

### `law.vetoOffered`
- **When:** Chancellor proposes a veto (only if unlocked).
- **FA:** صدراعظم وتو رو پیشنهاد کرد.
- **Audio:** صدراعظمْ وِتو رو پیشنهاد کرد.
- **EN:** The Chancellor proposes a veto.
- **Tone:** `[firm]`

### `law.vetoAgreed`
- **When:** President accepts. Both remaining laws burn; government fails.
- **FA:** رئیس‌جمهور حق وتو رو قبول کرد. هر دو قانون سوخت.
- **Audio:** رئیس‌جمهور حق وتو رو قبول کرد. هر دو قانون سوخت.
- **EN:** The President accepts the veto. Both policies burn.
- **Tone:** `[firm]`

### `law.vetoRejected`
- **When:** President refuses. This take is the reference for the
  other veto clips.
- **FA:** رئیس‌جمهور وتو رو رد کرد. باید یه قانون تصویب بشه.
- **Audio:** رئیس‌جمهور حق وتو رو رد کرد. باید یه قانون تصویب بشه.
- **EN:** The President refuses the veto. A policy must be enacted.
- **Tone:** `[firm]`

### `law.vetoUnlocked`
- **When:** The fifth Fascist law lands.
- **FA:** از این به بعد می‌شه حق وتو کرد.
- **Audio:** از این به بعد می‌شه حق وتو کرد.
- **EN:** The veto is now in play.
- **Tone:** `[announcing]`

---

## Executive powers

Speak the *assignment* to the table. The investigation *party* is spoken
only on the President’s device, after the card face is up.

### `power.investigate`
- **FA:** رئیس‌جمهور باید کارت یکی رو چک کنه.
- **EN:** The President must check a player's card.

### `power.investigated`
- **When:** Target chosen. Other seats hear this; the President does not.
- **FA subtitle:** رئیس‌جمهور حزب {name} رو دید.
- **FA audio:** کارت چک شد.
- **EN subtitle:** The President has seen {name}’s party.
- **EN audio:** The card has been checked.

### `power.investigatedYou`
- **When:** The President checked your card.
- **FA:** کارت شما چک شد.
- **EN:** Your card has been checked.
- **Audio:** same as FA.

### `power.investigatedLiberal`
- **When:** President’s device, after the membership card shows Liberal.
  Never on the investigated seat — that seat hears `power.investigatedYou`.
- **FA:** کارتش لیبراله‌.
- **EN:** Their card is Liberal.
- **Tone:** `[whispering]` — same grain as `power.investigatedYou`.
- **Audio:** same as FA.

### `power.investigatedFascist`
- **When:** President’s device, after the membership card shows Fascist
  (Hitler’s card included). Never on the investigated seat.
- **FA:** کارتش فاشیسته‌.
- **EN:** Their card is Fascist.
- **Tone:** `[whispering]` — same grain as `power.investigatedYou`.
- **Audio:** same as FA.

### `power.peek`
- **FA:** رئیس‌جمهور سه تا قانون بالای دسته رو می‌بینه.
- **EN:** The President looks at the top three policies.

### `power.peekDone`
- **FA:** قانون‌ها برگشتن روی دسته.
- **EN:** The policies return to the deck.

### `power.specialElection`
- **FA:** رئیس‌جمهور، رئیس بعدی رو خودش انتخاب می‌کنه.
- **EN:** The President chooses the next presidential candidate.

### `power.execution`
- **FA:** رئیس‌جمهور باید یه نفر رو اعدام کنه.
- **EN:** The President must execute a player.

### `power.executed`
- **FA subtitle:** {name} اعدام شد.
- **FA audio:** یکی اعدام شد.
- **EN subtitle:** {name} has been executed.
- **EN audio:** The execution is carried out.

### `power.executedYou`
- **When:** You were executed.
- **FA:** شما اعدام شدید.
- **EN:** You have been executed.
- **Audio:** same as FA. Bake with `--engine edge` — pocket-tts reads `شدید` as *shadid*.

### `power.hitlerExecuted`
- **FA:** هیتلر اعدام شد. لیبرال‌ها برنده شدن.
- **EN:** Hitler has been executed. The Liberals win.

---

## Game over

### `game.liberalsWin.policies`
- **FA:** پنج تا قانون لیبرال تصویب شد. لیبرال‌ها برنده شدن.
- **EN:** Five Liberal policies are enacted. The Liberals win.

### `game.fascistsWin.policies`
- **FA:** شش تا قانون فاشیستی تصویب شد. فاشیست‌ها برنده شدن.
- **EN:** Six Fascist policies are enacted. The Fascists win.

### `game.reveal`
- **When:** Role cascade starts.
- **FA:** نقش‌ها رو ببینید.
- **EN:** The roles are revealed.

---

## Private overlays (this device only)

Spoken on the actor’s phone, never as a shared table line. Same Daniel
voice, `[whispering]`. Do not put these in the public header of a TV
view — the overlay already has the text.

| Id | FA | EN |
|---|---|---|
| `private.youLiberal` | شما لیبرالید. هیتلر رو پیدا کنید. با پنج قانون لیبرال برنده می‌شید، یا با اعدام هیتلر. | You are a Liberal. Find Hitler. Win with five Liberal policies, or by executing Hitler. |
| `private.youFascist` | شما فاشیستید. هوای هیتلر رو داشته باشید. با شش قانون فاشیستی برنده می‌شید؛ یا بعد از سه قانون فاشیستی، هیتلر رو بذارید صدراعظم. | You are a Fascist. Protect Hitler. Win with six Fascist policies, or by electing Hitler Chancellor after three Fascist policies. |
| `private.youHitler` | شما هیتلرید. مخفی بمونید. بعد از سه قانون فاشیستی صدراعظم بشید. | You are Hitler. Stay hidden. Become Chancellor after three Fascist policies. |
| `private.nightLiberal` | چشم‌هاتون رو ببندید. | Keep your eyes closed. |
| `private.nightFascistSmall` | فاشیست‌ها و هیتلر رو ببینید. | See your fellow Fascists and Hitler. |
| `private.nightFascistLarge` | فاشیست‌های دیگه و هیتلر رو ببینید. هیتلر شما رو نمی‌بینه. | See the other Fascists and Hitler. Hitler does not see you. |
| `private.nightHitlerSmall` | فاشیست‌هاتون رو ببینید. | See your Fascists. |
| `private.nominate` | شما رئیس‌جمهورید. صدراعظم رو انتخاب کنید. | You are President. Choose a Chancellor. |
| `private.vote` | به این دولت رأی بدید. | Vote on this government. |
| `private.discard` | یه قانون رو بسوزونید. | Burn a policy. |
| `private.enact` | یکی رو تصویب کنید. به کسی نشون ندید. | Enact one policy. Show it to no one. |

Hitler at 7–10 uses `private.nightLiberal` (eyes closed). There is no
raise-your-hand line.

---

## Daniel catalog (tone + FA audio)

Subtitles may still interpolate `{name}` / `{ja}` / `{nein}`. This
table is the **spoken** line.

| Id | Tone | FA audio |
|---|---|---|
| `deal.start` | `[warmly]` | سلام به یه راز هیتلر دیگه خوش اومدید. *(0.35 s)* امیدوارم که بازی خوبی داشته باشیم. |
| `deal.look` | `[whispering]` | نقشت رو با دقت ببین. |
| `night.start` | `[whispering]` | نقشت رو با دقت ببین. |
| `night.end` | `[whispering]` | نقشت رو حالا قایم کن. |
| `president.first` | `[announcing]` | رئیس‌جمهور این دور معلوم شد. |
| `president.firstYou` | `[announcing]` | این دور شما رئیس‌جمهورید. |
| `president.next` | `[announcing]` | نفر بعدی رئیس جمهور شد. |
| `president.nextYou` | `[announcing]` | شما رئیس جمهور شدید. |
| `president.special` | `[announcing]` | انتخابات ویژه شروع شد. |
| `discuss.start` | `[calm]` | خب، وقت حرف زدنه. |
| `discuss.afterFail` | `[firm]` | این سری سعی کنید به اجماع برسید! |
| `discuss.afterPower` | `[calm]` | خب از قدرت‌ها استفاده کردیم، بسه. حالا حرف بزنیم. |
| `discuss.afterLeave` | `[calm]` | یکی فرار کرد. بقیه سر میز بمونید. |
| `discuss.afterLeave2` | `[calm]` | یه صندلی خالی شد. دل‌تون واسش تنگ نشه. |
| `discuss.afterLeave3` | `[calm]` | یکی زد بیرون. صندلی حرف نمی‌زنه — شما بزنید. |
| `discuss.closing` | `[calm]` | به آخرای وقت نزدیک شدیم. |
| `discuss.ended` | `[firm]` | وقت تموم شد. |
| `nominate.start` | `[calm]` | رئیس‌جمهور، صدراعظم رو انتخاب کنه. |
| `nominate.named` | `[announcing]` | صدراعظم انتخاب شد. |
| `nominate.namedYou` | `[calm]` | شما صدراعظم رو انتخاب کردید. |
| `nominate.namedAsYou` | `[announcing]` | شما رو صدراعظم انتخاب کردن. |
| `nominate.timeout` | `[disappointed]` | صدراعظم انتخاب نشد. |
| `office.presidentLeft` | `[disappointed]` | رئیس‌جمهور از بازی رفت. |
| `office.chancellorLeft` | `[disappointed]` | صدراعظم از بازی رفت. |
| `office.roundOver` | `[firm]` | این دور تموم شد. |
| `player.left` | `[disappointed]` | یکی از بازیکن‌ها از بازی رفت. |
| `player.away` | `[calm]` | یکی از میز رفت. شاید برگرده. |
| `player.back` | `[calm]` | یکی برگشت سر میز. |
| `player.backYou` | `[calm]` | خوش برگشتید. |
| `kick.asked` | `[announcing]` | یه نفر درخواست اخراج داد. |
| `kick.askedYou` | `[calm]` | شما درخواست اخراج دادید. |
| `kick.askedOnYou` | `[firm]` | درخواست اخراج شما اومده. |
| `kick.passed` | `[disappointed]` | تعداد رأی کافی بود. اخراج شد. |
| `kick.passedYou` | `[firm]` | تعداد رأی کافی بود. اخراج شد. |
| `kick.passedOnYou` | `[grave]` | تعداد رأی کافی بود. متأسفیم، شما اخراج می‌شید. |
| `kick.failed` | `[calm]` | تعداد رأی کافی نبود. |
| `kick.failedYou` | `[disappointed]` | تعداد رأی کافی نبود. |
| `kick.failedOnYou` | `[calm]` | تعداد رأی کافی نبود. شما می‌مونید. |
| `vote.start` | `[calm]` | رأی‌گیری آغاز شد. |
| `vote.collecting` | `[calm]` | رای‌ها داره جمع می‌شه. |
| `vote.count` | `[announcing]` | رأی ها شمرده شد. |
| `vote.passed` | `[firm]` | دولت رای آورد. |
| `vote.failed` | `[disappointed]` | دولت رأی نیاورْد. |
| `vote.hitlerChancellor` | `[grave]` | هیتلر صدراعظم شد. فاشیست‌ها برنده شدن. |
| `tracker.advance` | `[announcing]` | شُمارَنده یکی رفت جلو. |
| `chaos.start` | `[grave]` | سه دولت پشت‌سرهم رای نیاورد. آشوب شروع شد. |
| `chaos.enacted` | `[grave]` | قانونِ بالای دسته تصویب می‌شه. رئیس‌جمهور قدرتی نمی‌گیره. |
| `law.draw` | `[calm]` | سه تا قانون می‌اد دست رئیس‌جمهور. |
| `law.drawYou` | `[whispering]` | سه تا قانون می‌اد دستتون. *(President only)* |
| `law.presidentChoosing` | `[calm]` | رئیس جمهور یه کارت رو می‌سوزونه. |
| `law.silence` | `[firm]` | ساکت. دارن قانون برمی‌دارن. *(subtitle only until bake)* |
| `private.discard` | `[whispering]` | یه قانون رو بسوزونید. *(President only)* |
| `law.burned` | `[calm]` | یه قانون سوخت. |
| `law.pass` | `[calm]` | دو تا قانون می‌اد دست صدراعظم. |
| `law.passYou` | `[whispering]` | دو تا قانون می‌اد دستتون. *(Chancellor only)* |
| `law.chancellorChoosing` | `[calm]` | صدراعظم یکی رو تصویب می‌کنه. |
| `law.liberal` | `[calm]` | یه قانون لیبرالی تصویب شد. |
| `law.fascist` | `[grave]` | یه قانون فاشیستی تصویب شد. |
| `law.vetoOffered` | `[firm]` | صدراعظمْ وِتو رو پیشنهاد کرد. |
| `law.vetoAgreed` | `[firm]` | رئیس‌جمهور حق وتو رو قبول کرد. هر دو قانون سوخت. |
| `law.vetoRejected` | `[firm]` | رئیس‌جمهور حق وتو رو رد کرد. باید یه قانون تصویب بشه. |
| `law.vetoUnlocked` | `[announcing]` | از این به بعد می‌شه حق وتو کرد. |
| `power.investigate` | `[calm]` | رئیس‌جمهور باید کارت یکی رو چک کنه. |
| `power.investigated` | `[calm]` | کارت چک شد. |
| `power.investigatedYou` | `[whispering]` | کارت شما چک شد. |
| `power.investigatedLiberal` | `[whispering]` | کارتش لیبراله‌. |
| `power.investigatedFascist` | `[whispering]` | کارتش فاشیسته‌. |
| `power.peek` | `[calm]` | رئیس‌جمهور سه تا قانون بالای دسته رو می‌بینه. |
| `power.peekDone` | `[calm]` | قانون‌ها برگشتن روی دسته. |
| `power.specialElection` | `[announcing]` | رئیس‌جمهور، رئیس بعدی رو خودش انتخاب می‌کنه. |
| `power.execution` | `[grave]` | رئیس‌جمهور باید یه نفر رو اعدام کنه. |
| `power.executed` | `[grave]` | یکی اعدام شد. |
| `power.executedYou` | `[grave]` | شما اعدام شدید. |
| `power.hitlerExecuted` | `[firm]` | هیتلر اعدام شد. لیبرال‌ها برنده شدن. |
| `game.liberalsWin.policies` | `[firm]` | پنج تا قانون لیبرال تصویب شد. لیبرال‌ها برنده شدن. |
| `game.fascistsWin.policies` | `[grave]` | شش تا قانون فاشیستی تصویب شد. فاشیست‌ها برنده شدن. |
| `game.reveal` | `[announcing]` | نقش‌ها رو ببینید. |
| `private.youLiberal` | `[whispering]` | شما لیبرالید. هیتلر رو پیدا کنید. با پنج قانون لیبرال برنده می‌شید، یا با اعدام هیتلر. |
| `private.youFascist` | `[whispering]` | شما فاشیستید. هوای هیتلر رو داشته باشید. با شش قانون فاشیستی برنده می‌شید؛ یا بعد از سه قانون فاشیستی، هیتلر رو بذارید صدراعظم. |
| `private.youHitler` | `[whispering]` | شما هیتلرید. مخفی بمونید. بعد از سه قانون فاشیستی صدراعظم بشید. |
| `private.nightLiberal` | `[whispering]` | چشم‌هاتون رو ببندید. |
| `private.nightFascistSmall` | `[whispering]` | فاشیست‌ها و هیتلر رو ببینید. |
| `private.nightFascistLarge` | `[whispering]` | فاشیست‌های دیگه و هیتلر رو ببینید. هیتلر شما رو نمی‌بینه. |
| `private.nightHitlerSmall` | `[whispering]` | فاشیست‌هاتون رو ببینید. |
| `private.nominate` | `[whispering]` | شما رئیس‌جمهورید. صدراعظم رو انتخاب کنید. |
| `private.vote` | `[whispering]` | به این دولت رای بدید. |
| `private.discard` | `[whispering]` | یه قانون رو بسوزونید. |
| `private.enact` | `[whispering]` | یکی رو تصویب کنید. به کسی نشون ندید. |
