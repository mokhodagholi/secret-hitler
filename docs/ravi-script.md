# Ravi script

Every sentence Ravi may say. Ids are stable: they become `ravi.*` i18n
keys and `deal.start.mp3` filenames.

**Voice rules**

- Short. One breath. No jokes.
- Spoken Iranian Persian (گفتاری), not textbook (کتابی). A real host
  at the table: `می‌شه`, `رو`, `تون`, `کنه`. Not `می‌شود` / `را` / `تان`.
- TTS spellings (audio only): `رای` not `رأی`; bake strips ZWNJ (`می`
  not `می‌`). `حق وتو` so the model does not read `وتو` as «و تو».
  Subtitles still say `وتو`.
- Subtitle interpolates `{name}`, `{ja}`, `{nein}`, `{count}`.
- Audio is the nameless take when a name would be spoken. The header
  already shows the name.
- Never a secret (see [`ravi.md`](./ravi.md)).

Tone: 1930s radio, but the words are what Iranians actually say —
clear and a bit grave, not a translated newspaper.

---

## Night / deal

### `deal.start`
- **When:** Cards split off the pile to each seat. Night has not
  opened yet.
- **FA:** سلام به یه راز هیتلر دیگه خوش اومدید
  امیدوارم که بازی خوبی داشته باشیم
- **EN:** Welcome to another Secret Hitler.
  Hope we have a good game.
- **Audio:** one clip, two breaths — hello, a 1 s pause, then the
  hope line. `سلام به یه راز هیتلر دیگه خوش اومدید.` … `امیدوارم که بازی خوبی داشته باشیم.`

### `deal.look`
- **When:** Same words as `night.start`. Kept so the catalog id still
  matches the private-card beat. The table speaks `night.start`.
- **FA:** خب نقشت رو با دقت ببین.
- **EN:** Alright. Look at your role carefully.
- **Audio:** same as FA.

### `night.start`
- **When:** Night opens and the private role is up. Same audio for
  every seat; only the picture differs.
- **FA:** خب نقشت رو با دقت ببین.
- **EN:** Alright. Look at your role carefully.
- **Audio:** same.

### `night.end`
- **When:** Glance ends and day begins.
- **FA:** خب نقشت رو قایم کن.
- **EN:** Alright. Hide your role.
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
- **FA subtitle:** ریاست رسید به {name}.
- **FA audio:** ریاست رسید به نفر بعد.
- **EN subtitle:** The presidency passes to {name}.
- **EN audio:** The presidency passes on.

### `president.nextYou`
- **When:** The presidency passes to you.
- **FA:** ریاست رسید به شما.
- **EN:** The presidency passes to you.
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
- **When:** Discussion window opens.
- **FA:** خب، وقت حرف زدنه.
- **EN:** Okay. Time to talk.

### `discuss.closing`
- **When:** ~30 s left of the 5-minute window.
- **FA:** دیگه وقتتون کمه.
- **EN:** Time is almost up.

### `discuss.ended`
- **When:** Timer ends or the President skips.
- **FA:** دیگه حرف‌ها تموم شد.
- **EN:** Discussion is over.

---

## Nomination

### `nominate.start`
- **When:** Nomination window opens. President also sees a private
  overlay (“صدراعظم رو انتخاب کنید”); this line is public.
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

---

## Vote

Ja / Nein stay on the cards. Ravi does not say «یا» — in Persian that
word already means “or”, so «یا یا نِین» is noise.

### `vote.start`
- **When:** Voting opens.
- **FA:** رای‌گیری آغاز شد.
- **EN:** Voting has begun.

### `vote.collecting`
- **When:** Cards are flying face-down to the centre. Optional; skip if
  it talks over the motion.
- **FA:** رای‌ها داره جمع می‌شه.
- **EN:** The votes are being gathered.

### `vote.count`
- **When:** Face-down pile has been tallied. Totals only; no seats.
- **FA subtitle:** {ja} موافق، {nein} مخالف.
- **FA audio:** رای‌ها رو شمردیم.
- **EN subtitle:** {ja} Ja, {nein} Nein.
- **EN audio:** The votes have been counted.

### `vote.passed`
- **When:** Strict Ja majority.
- **FA subtitle:** دولت رای آورد. {ja} موافق، {nein} مخالف.
- **FA audio:** دولت رای آورد.
- **EN subtitle:** The government is elected. {ja} Ja, {nein} Nein.
- **EN audio:** The government is elected.

### `vote.failed`
- **When:** No strict majority (a tie fails).
- **FA subtitle:** دولت رای نیاورد. {ja} موافق، {nein} مخالف.
- **FA audio:** دولت رای نیاورد.
- **EN subtitle:** The government is rejected. {ja} Ja, {nein} Nein.
- **EN audio:** The government is rejected.

### `vote.hitlerChancellor`
- **When:** Elected Chancellor is Hitler and 3+ Fascist laws are down.
- **FA:** هیتلر صدراعظم شد. فاشیست‌ها برنده شدن.
- **EN:** Hitler is Chancellor. The Fascists win.

---

## Election tracker / chaos

### `tracker.advance`
- **When:** A failed government ticks the tracker (not a reset).
- **FA subtitle:** شکست {count} از ۳.
- **FA audio:** شمارنده یکی رفت جلو.
- **EN subtitle:** Election tracker {count} of 3.
- **EN audio:** The tracker advances.

### `chaos.start`
- **When:** Third consecutive failure.
- **FA:** سه دولت پشت‌سرهم رای نیاورد. آشوب شروع شد.
- **EN:** Three governments failed in a row. Chaos begins.

### `chaos.enacted`
- **When:** Top law is enacted with no power. Follow with `law.liberal`
  or `law.fascist`.
- **FA:** قانون بالای دسته تصویب می‌شه. رئیس‌جمهور قدرتی نمی‌گیره.
- **EN:** The top policy is enacted. The President gets no power.

---

## Legislative session

### `law.draw`
- **When:** Three backs leave the deck toward the President.
- **FA:** سه تا قانون می‌ره دست رئیس‌جمهور.
- **EN:** Three policies are given to the President.

### `law.presidentChoosing`
- **When:** President is looking. Public; no colours.
- **FA:** رئیس‌جمهور یکی رو می‌سوزونه.
- **EN:** The President burns one policy.

### `law.burned`
- **When:** One back lands on the discard pile.
- **FA:** یه قانون سوخت.
- **EN:** A policy is burned.

### `law.pass`
- **When:** Two backs travel to the Chancellor.
- **FA:** دو تا قانون می‌ره دست صدراعظم.
- **EN:** Two policies pass to the Chancellor.

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

### `law.vetoOffered`
- **When:** Chancellor proposes a veto (only if unlocked).
- **FA:** صدراعظم پیشنهاد وتو داد.
- **Audio:** صدراعظم پیشنهاد حق وتو داد.
- **EN:** The Chancellor proposes a veto.

### `law.vetoAgreed`
- **When:** President accepts. Both remaining laws burn; government fails.
- **FA:** وتو قبول شد. هر دو قانون سوخت.
- **Audio:** حق وتو قبول شد. هر دو قانون سوخت.
- **EN:** The veto is accepted. Both policies burn.

### `law.vetoRejected`
- **When:** President refuses.
- **FA:** رئیس‌جمهور وتو رو رد کرد. باید یه قانون تصویب بشه.
- **Audio:** رئیس‌جمهور حق وتو رو رد کرد. باید یه قانون تصویب بشه.
- **EN:** The President refuses the veto. A policy must be enacted.

### `law.vetoUnlocked`
- **When:** The fifth Fascist law lands.
- **FA:** از این به بعد می‌شه وتو کرد.
- **Audio:** حق وتو باز شد.
- **EN:** The veto is now in play.

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
- **FA:** این یکی لیبرال بود.
- **EN:** It was Liberal.
- **Audio:** same as FA.

### `power.investigatedFascist`
- **When:** President’s device, after the membership card shows Fascist
  (Hitler’s card included).
- **FA:** این یکی فاشیست بود.
- **EN:** It was Fascist.
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

## Private overlays (no shared audio)

These are on-screen only, on the actor’s device. If we ever record them,
they must **not** play through the speaker while others are in the room.

| Id | FA | EN |
|---|---|---|
| `private.youLiberal` | شما لیبرالید. هیتلر رو پیدا کنید. با پنج قانون لیبرال برنده می‌شید، یا با اعدام هیتلر. | You are a Liberal. Find Hitler. Win with five Liberal policies, or by executing Hitler. |
| `private.youFascist` | شما فاشیستید. هوای هیتلر رو داشته باشید. با شش قانون فاشیستی برنده می‌شید؛ یا بعد از سه قانون فاشیستی، هیتلر رو بذارید صدراعظم. | You are a Fascist. Protect Hitler. Win with six Fascist policies, or by electing Hitler Chancellor after three Fascist policies. |
| `private.youHitler` | شما هیتلرید. مخفی بمونید. بعد از سه قانون فاشیستی صدراعظم بشید. | You are Hitler. Stay hidden. Become Chancellor after three Fascist policies. |
| `private.nightLiberal` | چشم‌هاتون رو ببندید. | Keep your eyes closed. |
| `private.nightFascistSmall` | فاشیست‌ها و هیتلر رو ببینید. | See your fellow Fascists and Hitler. |
| `private.nightFascistLarge` | فاشیست‌های دیگه و هیتلر رو ببینید. هیتلر شما رو نمی‌بینه. | See the other Fascists and Hitler. Hitler does not see you. |
| `private.nightHitlerSmall` | فاشیست‌هاتون رو ببینید. | See your Fascists. |
| `private.nightHitlerLarge` | دست‌تون رو بالا ببرید. فاشیست‌ها شما رو می‌بینن؛ شما اون‌ها رو نمی‌بینید. | Raise your hand. The Fascists see you — you do not see them. |
| `private.nominate` | شما رئیس‌جمهورید. صدراعظم رو انتخاب کنید. | You are President. Choose a Chancellor. |
| `private.vote` | به این دولت رای بدید. | Vote on this government. |
| `private.discard` | یکی رو دور بندازید. به کسی نشون ندید. | Discard one policy. Show it to no one. |
| `private.enact` | یکی رو تصویب کنید. به کسی نشون ندید. | Enact one policy. Show it to no one. |
| `private.investigateResult` | {name} {party}ه. | {name} belongs to the {party} party. |

---

## Pilot set (record these first)

`deal.start` · `president.first` · `discuss.start` · `nominate.start` ·
`vote.start` · `vote.passed` · `vote.failed` · `law.draw` ·
`law.liberal` · `law.fascist`

Record the set in both Farid and Dilara.
