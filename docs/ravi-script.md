# Ravi script

Every sentence Ravi may say. Ids are stable: they become `ravi.*` i18n
keys and `deal.start.mp3` filenames.

**Voice rules**

- Short. One breath. No jokes.
- Subtitle interpolates `{name}`, `{ja}`, `{nein}`, `{count}`.
- Audio is the nameless take when a name would be spoken. The header
  already shows the name.
- Never a secret (see [`ravi.md`](./ravi.md)).

Tone: 1930s radio news, Persian, formal but not stiff. The on-screen
host (Farid or Dilara) mouths these lines; see [`ravi.md`](./ravi.md).

---

## Night / deal

### `deal.start`
- **When:** Night begins.
- **FA:** زمانِ پخشِ نقش‌هاست.
- **EN:** It is time to deal the roles.
- **Audio:** same as FA.

### `deal.look`
- **When:** Private card is up. (Subtitle only on the actor’s screen;
  audio is shared and generic.)
- **FA:** نقشِ خود را ببینید. به کسی نشان ندهید.
- **EN:** Look at your role. Show it to no one.
- **Audio:** same.

### `night.start`
- **When:** Private cards close, team glance begins. Same audio for
  every seat; only the picture differs.
- **FA:** شب آغاز شد. کسانی که باید ببینند، ببینند.
- **EN:** Night has fallen. Those who must see, see.
- **Audio:** same.

### `night.end`
- **When:** Glance ends.
- **FA:** صبح شد. کارت‌ها را پنهان کنید.
- **EN:** Morning. Hide your cards.
- **Audio:** same.

### `president.first`
- **When:** First President of the game is named.
- **FA subtitle:** {name} رئیس‌جمهور این دور است.
- **FA audio:** رئیس‌جمهور این دور انتخاب شد.
- **EN subtitle:** {name} is President this round.
- **EN audio:** The President for this round has been chosen.

### `president.next`
- **When:** Placard moves clockwise (not a special election).
- **FA subtitle:** ریاست به {name} رسید.
- **FA audio:** ریاست به نفر بعد رسید.
- **EN subtitle:** The presidency passes to {name}.
- **EN audio:** The presidency passes on.

### `president.special`
- **When:** Special Election names the next candidate.
- **FA subtitle:** انتخابات ویژه — {name} رئیس‌جمهور بعدی است.
- **FA audio:** انتخابات ویژه اعلام شد.
- **EN subtitle:** Special election — {name} is the next President.
- **EN audio:** A special election has been called.

---

## Discussion

### `discuss.start`
- **When:** Discussion window opens.
- **FA:** زمانِ گفتگوست. دوست و دشمن را بشناسید.
- **EN:** Time to talk. Learn who is with you, and who is not.

### `discuss.closing`
- **When:** ~30 s left of the 5-minute window.
- **FA:** زمان رو به پایان است.
- **EN:** Time is almost up.

### `discuss.ended`
- **When:** Timer ends or the President skips.
- **FA:** گفتگو تمام شد.
- **EN:** Discussion is over.

---

## Nomination

### `nominate.start`
- **When:** Nomination window opens. President also sees a private
  overlay (“صدراعظم را انتخاب کنید”); this line is public.
- **FA:** رئیس‌جمهور باید صدراعظم را نامزد کند.
- **EN:** The President must nominate a Chancellor.

### `nominate.named`
- **When:** A Chancellor is nominated.
- **FA subtitle:** {president}، {chancellor} را به‌عنوان صدراعظم نامزد کرد.
- **FA audio:** صدراعظم نامزد شد.
- **EN subtitle:** {president} nominated {chancellor} as Chancellor.
- **EN audio:** A Chancellor has been nominated.

### `nominate.timeout`
- **When:** President did not pick in time.
- **FA:** کسی نامزد نشد. دولت تشکیل نشد.
- **EN:** No one was nominated. The government fails.

---

## Vote

### `vote.start`
- **When:** Voting opens.
- **FA:** به این دولت رأی بدهید. یا، یا نِین.
- **EN:** Vote on this government. Ja, or Nein.

### `vote.collecting`
- **When:** Cards are flying face-down to the centre. Optional; skip if
  it talks over the motion.
- **FA:** رأی‌ها جمع می‌شود.
- **EN:** The votes are being gathered.

### `vote.count`
- **When:** Face-down pile has been tallied. Totals only; no seats.
- **FA subtitle:** {ja} موافق، {nein} مخالف.
- **FA audio:** رأی‌ها شمارش شد.
- **EN subtitle:** {ja} Ja, {nein} Nein.
- **EN audio:** The votes have been counted.

### `vote.passed`
- **When:** Strict Ja majority.
- **FA subtitle:** دولت تشکیل شد. {ja} موافق، {nein} مخالف.
- **FA audio:** دولت تشکیل شد.
- **EN subtitle:** The government is elected. {ja} Ja, {nein} Nein.
- **EN audio:** The government is elected.

### `vote.failed`
- **When:** No strict majority (a tie fails).
- **FA subtitle:** دولت سقوط کرد. {ja} موافق، {nein} مخالف.
- **FA audio:** دولت سقوط کرد.
- **EN subtitle:** The government falls. {ja} Ja, {nein} Nein.
- **EN audio:** The government falls.

### `vote.hitlerChancellor`
- **When:** Elected Chancellor is Hitler and 3+ Fascist laws are down.
- **FA:** صدراعظم، هیتلر بود. فاشیست‌ها پیروز شدند.
- **EN:** The Chancellor was Hitler. The Fascists win.

---

## Election tracker / chaos

### `tracker.advance`
- **When:** A failed government ticks the tracker (not a reset).
- **FA subtitle:** شمارندهٔ انتخابات {count} از ۳.
- **FA audio:** شمارنده یک خانه جلو می‌رود.
- **EN subtitle:** Election tracker {count} of 3.
- **EN audio:** The tracker advances.

### `chaos.start`
- **When:** Third consecutive failure.
- **FA:** سه دولت پیاپی شکست خورد. کشور به آشوب می‌افتد.
- **EN:** Three governments have failed. The country falls into chaos.

### `chaos.enacted`
- **When:** Top law is enacted with no power. Follow with `law.liberal`
  or `law.fascist`.
- **FA:** قانونِ بالای دسته، خودبه‌خود تصویب می‌شود. قدرتی در کار نیست.
- **EN:** The top policy is enacted. No power is granted.

---

## Legislative session

### `law.draw`
- **When:** Three backs leave the deck toward the President.
- **FA:** سه قانون به رئیس‌جمهور داده می‌شود.
- **EN:** Three policies are given to the President.

### `law.presidentChoosing`
- **When:** President is looking. Public; no colours.
- **FA:** رئیس‌جمهور یک قانون را دور می‌اندازد.
- **EN:** The President discards one policy.

### `law.burned`
- **When:** One back lands on the discard pile.
- **FA:** یک قانون در دستهٔ سوخته پنهان شد.
- **EN:** One policy is buried in the discard.

### `law.pass`
- **When:** Two backs travel to the Chancellor.
- **FA:** دو قانون به صدراعظم می‌رسد.
- **EN:** Two policies pass to the Chancellor.

### `law.chancellorChoosing`
- **When:** Chancellor is looking.
- **FA:** صدراعظم یک قانون را تصویب می‌کند.
- **EN:** The Chancellor enacts one policy.

### `law.liberal`
- **When:** A Liberal law hits the board.
- **FA:** یک قانون لیبرال تصویب شد.
- **EN:** A Liberal policy is enacted.

### `law.fascist`
- **When:** A Fascist law hits the board.
- **FA:** یک قانون فاشیستی تصویب شد.
- **EN:** A Fascist policy is enacted.

### `law.vetoOffered`
- **When:** Chancellor proposes a veto (only if unlocked).
- **FA:** صدراعظم وتو پیشنهاد می‌کند.
- **EN:** The Chancellor proposes a veto.

### `law.vetoAgreed`
- **When:** President accepts. Both remaining laws burn; government fails.
- **FA:** وتو پذیرفته شد. هر دو قانون سوخت. دولت سقوط می‌کند.
- **EN:** The veto is accepted. Both policies burn. The government falls.

### `law.vetoRejected`
- **When:** President refuses.
- **FA:** رئیس‌جمهور وتو را رد کرد. باید قانونی تصویب شود.
- **EN:** The President refuses the veto. A policy must be enacted.

### `law.vetoUnlocked`
- **When:** The fifth Fascist law lands.
- **FA:** قدرتِ وتو آزاد شد.
- **EN:** The veto is now in play.

---

## Executive powers

Speak the *assignment*, never the private result.

### `power.investigate`
- **FA:** رئیس‌جمهور باید وفاداری یک بازیکن را بازرسی کند.
- **EN:** The President must investigate a player’s loyalty.

### `power.investigated`
- **When:** Target chosen. Result is private.
- **FA subtitle:** رئیس‌جمهور وفاداریِ {name} را دید.
- **FA audio:** بازرسی انجام شد.
- **EN subtitle:** The President has seen {name}’s party.
- **EN audio:** The investigation is done.

### `power.peek`
- **FA:** رئیس‌جمهور سه قانون بالای دسته را نگاه می‌کند.
- **EN:** The President looks at the top three policies.

### `power.peekDone`
- **FA:** قوانین به دسته برگشتند.
- **EN:** The policies return to the deck.

### `power.specialElection`
- **FA:** رئیس‌جمهور رئیس‌جمهورِ بعدی را انتخاب می‌کند.
- **EN:** The President chooses the next presidential candidate.

### `power.execution`
- **FA:** رئیس‌جمهور باید یک بازیکن را اعدام کند.
- **EN:** The President must execute a player.

### `power.executed`
- **FA subtitle:** {name} اعدام شد.
- **FA audio:** حکم اعدام اجرا شد.
- **EN subtitle:** {name} has been executed.
- **EN audio:** The execution is carried out.

### `power.hitlerExecuted`
- **FA:** هیتلر اعدام شد. لیبرال‌ها پیروز شدند.
- **EN:** Hitler has been executed. The Liberals win.

---

## Game over

### `game.liberalsWin.policies`
- **FA:** پنج قانون لیبرال تصویب شد. لیبرال‌ها پیروز شدند.
- **EN:** Five Liberal policies are enacted. The Liberals win.

### `game.fascistsWin.policies`
- **FA:** شش قانون فاشیستی تصویب شد. فاشیست‌ها پیروز شدند.
- **EN:** Six Fascist policies are enacted. The Fascists win.

### `game.reveal`
- **When:** Role cascade starts.
- **FA:** نقش‌ها آشکار می‌شود.
- **EN:** The roles are revealed.

---

## Private overlays (no shared audio)

These are on-screen only, on the actor’s device. If we ever record them,
they must **not** play through the speaker while others are in the room.

| Id | FA | EN |
|---|---|---|
| `private.youLiberal` | شما لیبرال هستید. هیتلر را پیدا کنید. با پنج قانون لیبرال، یا با اعدام هیتلر، پیروز می‌شوید. | You are a Liberal. Find Hitler. Win with five Liberal policies, or by executing Hitler. |
| `private.youFascist` | شما فاشیست هستید. از هیتلر محافظت کنید. با شش قانون فاشیستی، یا با رساندن هیتلر به صدارت پس از سه قانون فاشیستی، پیروز می‌شوید. | You are a Fascist. Protect Hitler. Win with six Fascist policies, or by electing Hitler Chancellor after three Fascist policies. |
| `private.youHitler` | شما هیتلر هستید. پنهان بمانید. پس از سه قانون فاشیستی صدراعظم شوید. | You are Hitler. Stay hidden. Become Chancellor after three Fascist policies. |
| `private.nightLiberal` | چشم‌ها را بسته نگه دارید. | Keep your eyes closed. |
| `private.nightFascistSmall` | هم‌حزبی‌های خود و هیتلر را ببینید. | See your fellow Fascists and Hitler. |
| `private.nightFascistLarge` | فاشیست‌های دیگر و هیتلر را ببینید. هیتلر شما را نمی‌بیند. | See the other Fascists and Hitler. Hitler does not see you. |
| `private.nightHitlerSmall` | فاشیست‌های خود را ببینید. | See your Fascists. |
| `private.nightHitlerLarge` | دست خود را بالا بگیرید. فاشیست‌ها شما را می‌بینند — شما آن‌ها را نمی‌بینید. | Raise your hand. The Fascists see you — you do not see them. |
| `private.nominate` | شما رئیس‌جمهور هستید. یک صدراعظم نامزد کنید. | You are President. Nominate a Chancellor. |
| `private.vote` | به این دولت رأی بدهید. | Vote on this government. |
| `private.discard` | یک قانون را دور بیندازید. به کسی نشان ندهید. | Discard one policy. Show it to no one. |
| `private.enact` | یک قانون را تصویب کنید. به کسی نشان ندهید. | Enact one policy. Show it to no one. |
| `private.investigateResult` | {name} عضو حزب {party} است. | {name} belongs to the {party} party. |

---

## Pilot set (record these first)

`deal.start` · `president.first` · `discuss.start` · `nominate.start` ·
`vote.start` · `vote.passed` · `vote.failed` · `law.draw` ·
`law.liberal` · `law.fascist`

Record the set in both Farid and Dilara.
