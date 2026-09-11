#!/usr/bin/env python3
"""Bake Ravi mp3s from the script. Not live TTS — run once, commit the files.

Engines (pick one):

  pocket   Native Persian (pocket-tts-farsi, trained on ~500h of Farsi).
           Farid = male prompt, Dilara = female prompt.

  gemini   Gemini TTS with a radio-host style prompt. Native-sounding and
           two distinct voices (Fenrir / Kore). Needs GEMINI_API_KEY.

  eleven   ElevenLabs eleven_v3. Best commercial quality. Needs
           ELEVENLABS_API_KEY. James (Husky, Engaging and Bold) is the
           default male voice; Farid/Dilara still need their own ids.

  edge     Azure Farid/Dilara via Edge. Backup only — sounds like TTS.

  python3.12 -m venv scripts/.venv-ravi-native
  scripts/.venv-ravi-native/bin/pip install pocket-tts soundfile sphn
  scripts/.venv-ravi-native/bin/python scripts/generate-ravi-voices.py
"""

from __future__ import annotations

import argparse
import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "client/src/assets/sounds/ravi"
VOICE_DIR = ROOT / "scripts/ravi-voices"
VOICE_PROMPTS = {
    "farid": VOICE_DIR / "farid.wav",
    "dilara": VOICE_DIR / "dilara.wav",
}

# A tuple is one clip with a breath between phrases (hello, then the rest).
PAUSE_S = 0.35
LineText = str | tuple[str, ...]

# James — Husky, Engaging and Bold. English narrative voice for listen tests.
JAMES_VOICE_ID = "EkK5I93UQWFDigLMpZcX"

# id → spoken Persian (FA audio line from docs/ravi-script.md)
LINES: dict[str, LineText] = {
    "deal.start": (
        "سلام به یه راز هیتلر دیگه خوش اومدید.",
        "امیدوارم که بازی خوبی داشته باشیم.",
    ),
    "deal.look": "نقشت رو با دقت ببین.",
    "night.start": "نقشت رو با دقت ببین.",
    "night.end": "نقشت رو حالا قایم کن.",
    "president.first": "رئیس‌جمهور این دور معلوم شد.",
    "president.firstYou": "این دور شما رئیس‌جمهورید.",
    "president.next": "نفر بعدی رئیس جمهور شد.",
    "president.nextYou": "شما رئیس جمهور شدید.",
    "president.special": "انتخابات ویژه شروع شد.",
    "discuss.start": "خب، وقت حرف زدنه.",
    "discuss.afterFail": "این سری سعی کنید به اجماع برسید!",
    "discuss.afterPower": "خب از قدرت‌ها استفاده کردیم، بسه. حالا حرف بزنیم.",
    "discuss.afterLeave": "یکی فرار کرد. بقیه سر میز بمونید.",
    "discuss.afterLeave2": "یه صندلی خالی شد. دل‌تون واسش تنگ نشه.",
    "discuss.afterLeave3": "یکی زد بیرون. صندلی حرف نمی‌زنه. شما بزنید.",
    "discuss.closing": "به آخرای وقت نزدیک شدیم.",
    "discuss.ended": "وقت تموم شد.",
    "nominate.start": "رئیس‌جمهور، صدراعظم رو انتخاب کنه.",
    "nominate.named": "صدراعظم انتخاب شد.",
    "nominate.namedYou": "شما صدراعظم رو انتخاب کردید.",
    "nominate.namedAsYou": "شما رو صدراعظم انتخاب کردن.",
    "nominate.timeout": "صدراعظم انتخاب نشد.",
    "office.presidentLeft": "رئیس‌جمهور از بازی رفت.",
    "office.chancellorLeft": "صدراعظم از بازی رفت.",
    "office.roundOver": "این دور تموم شد.",
    "player.left": "یکی از بازیکن‌ها از بازی رفت.",
    "kick.asked": "یه نفر درخواست اخراج داد.",
    "kick.askedYou": "شما درخواست اخراج دادید.",
    "kick.askedOnYou": "درخواست اخراج شما اومده.",
    "kick.passed": "تعداد رأی کافی بود. اخراج شد.",
    "kick.passedYou": "تعداد رأی کافی بود. اخراج شد.",
    "kick.passedOnYou": "تعداد رأی کافی بود. متأسفیم، شما اخراج می‌شید.",
    "kick.failed": "تعداد رأی کافی نبود.",
    "kick.failedYou": "تعداد رأی کافی نبود.",
    "kick.failedOnYou": "تعداد رأی کافی نبود. شما می‌مونید.",
    "vote.start": "رای‌گیری آغاز شد.",
    "vote.collecting": "رای‌ها داره جمع می‌شه.",
    "vote.count": "رأی ها شمرده شد.",
    "vote.passed": "دولت رای آورد.",
    "vote.failed": "دولت رأی نیاورد.",
    "vote.hitlerChancellor": "هیتلر صدراعظم شد. فاشیست‌ها برنده شدن.",
    "tracker.advance": "شُمارَنده یکی رفت جلو.",
    "chaos.start": "سه دولت پشت‌سرهم رای نیاورد. آشوب شروع شد.",
    "chaos.enacted": "قانونِ بالای دسته تصویب می‌شه. رئیس‌جمهور قدرتی نمی‌گیره.",
    "law.draw": "سه تا قانون می‌ره دست رئیس‌جمهور.",
    "law.presidentChoosing": "رئیس جمهور یه کارت رو می‌سوزونه.",
    "law.burned": "یه قانون سوخت.",
    "law.pass": "دو تا قانون می‌ره دست صدراعظم.",
    "law.passYou": "دو تا قانون می‌ره دستتون.",
    "law.chancellorChoosing": "صدراعظم یکی رو تصویب می‌کنه.",
    "law.liberal": "یه قانون لیبرالی تصویب شد.",
    "law.fascist": "یه قانون فاشیستی تصویب شد.",
    "law.vetoOffered": "صدراعظم وتو رو پیشنهاد کرد.",
    "law.vetoAgreed": "رئیس‌جمهور حق وتو رو قبول کرد. هر دو قانون سوخت.",
    "law.vetoRejected": "رئیس‌جمهور حق وتو رو رد کرد. باید یه قانون تصویب بشه.",
    "law.vetoUnlocked": "از این به بعد می‌شه حق وتو کرد.",
    "power.investigate": "رئیس‌جمهور باید کارت یکی رو چک کنه.",
    "power.investigated": "کارت چک شد.",
    "power.investigatedYou": "کارت شما چک شد.",
    "power.investigatedLiberal": "کارتش لیبراله‌.",
    "power.investigatedFascist": "کارتش فاشیسته‌.",
    "power.peek": "رئیس‌جمهور سه تا قانون بالای دسته رو می‌بینه.",
    "power.peekDone": "قانون‌ها برگشتن روی دسته.",
    "power.specialElection": "رئیس‌جمهور، رئیس بعدی رو خودش انتخاب می‌کنه.",
    "power.execution": "رئیس‌جمهور باید یه نفر رو اعدام کنه.",
    "power.executed": "یکی اعدام شد.",
    "power.executedYou": "شما اعدام شدید.",
    "power.hitlerExecuted": "هیتلر اعدام شد. لیبرال‌ها برنده شدن.",
    "game.liberalsWin.policies": "پنج تا قانون لیبرال تصویب شد. لیبرال‌ها برنده شدن.",
    "game.fascistsWin.policies": "شش تا قانون فاشیستی تصویب شد. فاشیست‌ها برنده شدن.",
    "game.reveal": "نقش‌ها رو ببینید.",
    "private.youLiberal": "شما لیبرالید. هیتلر رو پیدا کنید. با پنج قانون لیبرال برنده می‌شید، یا با اعدام هیتلر.",
    "private.youFascist": "شما فاشیستید. هوای هیتلر رو داشته باشید. با شش قانون فاشیستی برنده می‌شید؛ یا بعد از سه قانون فاشیستی، هیتلر رو بذارید صدراعظم.",
    "private.youHitler": "شما هیتلرید. مخفی بمونید. بعد از سه قانون فاشیستی صدراعظم بشید.",
    "private.nightLiberal": "چشم‌هاتون رو ببندید.",
    "private.nightFascistSmall": "فاشیست‌ها و هیتلر رو ببینید.",
    "private.nightFascistLarge": "فاشیست‌های دیگه و هیتلر رو ببینید. هیتلر شما رو نمی‌بینه.",
    "private.nightHitlerSmall": "فاشیست‌هاتون رو ببینید.",
    "private.nominate": "شما رئیس‌جمهورید. صدراعظم رو انتخاب کنید.",
    "private.vote": "به این دولت رای بدید.",
    "private.discard": "یه قانون رو بسوزونید.",
    "private.enact": "یکی رو تصویب کنید. به کسی نشون ندید.",
}

# id → spoken English (EN audio line from docs/ravi-script.md)
LINES_EN: dict[str, LineText] = {
    "deal.start": (
        "Welcome to another Secret Hitler.",
        "Hope we have a good game.",
    ),
    "deal.look": "Look at your role carefully.",
    "night.start": "Look at your role carefully.",
    "night.end": "Now hide your role.",
    "president.first": "The President for this round has been chosen.",
    "president.firstYou": "You are President this round.",
    "president.next": "The next player is President.",
    "president.nextYou": "You are President.",
    "president.special": "A special election has been called.",
    "discuss.start": "Okay. Time to talk.",
    "discuss.afterFail": "This time, try to reach a consensus!",
    "discuss.afterPower": "Okay, enough with the powers. Now we talk.",
    "discuss.afterLeave": "Someone ran. The rest of you stay at the table.",
    "discuss.afterLeave2": "A seat is empty. Don't miss them too much.",
    "discuss.afterLeave3": "Someone walked out. The chair doesn't talk. You do.",
    "discuss.closing": "We're getting close to the end.",
    "discuss.ended": "Time's up.",
    "nominate.start": "The President chooses a Chancellor.",
    "nominate.named": "A Chancellor has been chosen.",
    "nominate.namedYou": "You chose a Chancellor.",
    "nominate.namedAsYou": "You have been named Chancellor.",
    "nominate.timeout": "No Chancellor was chosen.",
    "office.presidentLeft": "The President has left the game.",
    "office.chancellorLeft": "The Chancellor has left the game.",
    "office.roundOver": "This round is over.",
    "player.left": "A player left the game.",
    "kick.asked": "Someone asked for a kick.",
    "kick.askedYou": "You asked for a kick.",
    "kick.askedOnYou": "Someone asked to kick you.",
    "kick.passed": "Enough votes. They're out.",
    "kick.passedYou": "Enough votes. They're out.",
    "kick.passedOnYou": "Enough votes. Sorry — you're out.",
    "kick.failed": "Not enough votes.",
    "kick.failedYou": "Not enough votes.",
    "kick.failedOnYou": "Not enough votes. You're staying.",
    "vote.start": "Voting has begun.",
    "vote.collecting": "The votes are being gathered.",
    "vote.count": "The votes have been counted.",
    "vote.passed": "The government is elected.",
    "vote.failed": "The government is rejected.",
    "vote.hitlerChancellor": "Hitler is Chancellor. The Fascists win.",
    "tracker.advance": "The tracker advances.",
    "chaos.start": "Three governments failed in a row. Chaos begins.",
    "chaos.enacted": "The top policy is enacted. The President gets no power.",
    "law.draw": "Three policies are given to the President.",
    "law.presidentChoosing": "The President burns one policy.",
    "law.burned": "A policy is burned.",
    "law.pass": "Two policies pass to the Chancellor.",
    "law.passYou": "Two policies pass to you.",
    "law.chancellorChoosing": "The Chancellor enacts one policy.",
    "law.liberal": "A Liberal policy is enacted.",
    "law.fascist": "A Fascist policy is enacted.",
    "law.vetoOffered": "The Chancellor proposes a veto.",
    "law.vetoAgreed": "The veto is accepted. Both policies burn.",
    "law.vetoRejected": "The President refuses the veto. A policy must be enacted.",
    "law.vetoUnlocked": "The veto is now in play.",
    "power.investigate": "The President must check a player's card.",
    "power.investigated": "The card has been checked.",
    "power.investigatedYou": "Your card has been checked.",
    "power.investigatedLiberal": "Their card is Liberal.",
    "power.investigatedFascist": "Their card is Fascist.",
    "power.peek": "The President looks at the top three policies.",
    "power.peekDone": "The policies return to the deck.",
    "power.specialElection": "The President chooses the next presidential candidate.",
    "power.execution": "The President must execute a player.",
    "power.executed": "The execution is carried out.",
    "power.executedYou": "You have been executed.",
    "power.hitlerExecuted": "Hitler has been executed. The Liberals win.",
    "game.liberalsWin.policies": "Five Liberal policies are enacted. The Liberals win.",
    "game.fascistsWin.policies": "Six Fascist policies are enacted. The Fascists win.",
    "game.reveal": "The roles are revealed.",
    "private.youLiberal": "You are a Liberal. Find Hitler. Win with five Liberal policies, or by executing Hitler.",
    "private.youFascist": "You are a Fascist. Protect Hitler. Win with six Fascist policies, or by electing Hitler Chancellor after three Fascist policies.",
    "private.youHitler": "You are Hitler. Stay hidden. Become Chancellor after three Fascist policies.",
    "private.nightLiberal": "Keep your eyes closed.",
    "private.nightFascistSmall": "See your fellow Fascists and Hitler.",
    "private.nightFascistLarge": "See the other Fascists and Hitler. Hitler does not see you.",
    "private.nightHitlerSmall": "See your Fascists.",
    "private.nominate": "You are President. Choose a Chancellor.",
    "private.vote": "Vote on this government.",
    "private.discard": "Burn a policy.",
    "private.enact": "Enact one policy. Show it to no one.",
}

def load_dotenv() -> None:
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip())


def catalog_for(lang: str) -> dict[str, LineText]:
    return LINES_EN if lang == "en" else LINES


def for_tts(text: str) -> str:
    """pocket-tts spelling: no ZWNJ, no Arabic comma (tiny chunks hallucinate)."""
    text = text.replace("می‌", "می")
    text = text.replace("\u200c", " ")
    text = text.replace("،", " ")
    return " ".join(text.split())


def for_eleven_fa(text: str) -> str:
    """ElevenLabs spellings: ra'y not ray; nayavard not nayavarad."""
    import re

    text = text.replace("رای‌گیری", "رأی‌گیری")
    text = text.replace("رای‌ها", "رأی ها")
    # Whole word رای only — آخرای contains رای as a suffix.
    text = re.sub(r"(?<![\u0600-\u06FF])رای", "رأی", text)
    text = text.replace("شمارنده", "شُمارَنده")
    # Sukun on ر: past نیاورد (nayavard), not present نیاورَد, not «نی اورد».
    text = text.replace("نیاوَرد", "نیاورْد")
    text = text.replace("نَیاورد", "نیاورْد")
    text = text.replace("نیاورد", "نیاورْد")
    # haqq + ezafe: tashdid on ق and kasra — حقِّ وتو, not حقتورو.
    text = text.replace("حق وتو", "حقِّ وتو")
    # Sukun so صدراعظم is not صدراعظمِ before وِتو.
    text = text.replace("صدراعظم وتو", "صدراعظمْ وتو")
    # Kasra on و: وِتو (veto), not وَتو.
    return text.replace("وتو", "وِتو")


# v3 audio tags. Locked set from docs/ravi-script.md.
ELEVEN_DIRECTION: dict[str, str | tuple[str, ...]] = {
    "deal.start": ("[warmly]", "[warmly]"),
    "deal.look": "[whispering]",
    "night.start": "[whispering]",
    "night.end": "[whispering]",
    "president.first": "[announcing]",
    "president.firstYou": "[announcing]",
    "president.next": "[announcing]",
    "president.nextYou": "[announcing]",
    "president.special": "[announcing]",
    "discuss.start": "[calm]",
    "discuss.afterFail": "[firm]",
    "discuss.afterPower": "[calm]",
    "discuss.afterLeave": "[calm]",
    "discuss.afterLeave2": "[calm]",
    "discuss.afterLeave3": "[calm]",
    "discuss.closing": "[calm]",
    "discuss.ended": "[firm]",
    "nominate.start": "[calm]",
    "nominate.named": "[announcing]",
    "nominate.namedYou": "[calm]",
    "nominate.namedAsYou": "[announcing]",
    "nominate.timeout": "[disappointed]",
    "office.presidentLeft": "[disappointed]",
    "office.chancellorLeft": "[disappointed]",
    "office.roundOver": "[firm]",
    "player.left": "[disappointed]",
    "kick.asked": "[announcing]",
    "kick.askedYou": "[calm]",
    "kick.askedOnYou": "[firm]",
    "kick.passed": "[disappointed]",
    "kick.passedYou": "[firm]",
    "kick.passedOnYou": "[grave]",
    "kick.failed": "[calm]",
    "kick.failedYou": "[disappointed]",
    "kick.failedOnYou": "[calm]",
    "vote.start": "[calm]",
    "vote.collecting": "[calm]",
    "vote.count": "[announcing]",
    "vote.passed": "[firm]",
    "vote.failed": "[disappointed]",
    "vote.hitlerChancellor": "[grave]",
    "tracker.advance": "[announcing]",
    "chaos.start": "[grave]",
    "chaos.enacted": "[grave]",
    "law.draw": "[calm]",
    "law.presidentChoosing": "[calm]",
    "law.burned": "[calm]",
    "law.pass": "[calm]",
    "law.passYou": "[whispering]",
    "law.chancellorChoosing": "[calm]",
    "law.liberal": "[calm]",
    "law.fascist": "[grave]",
    "law.vetoOffered": "[firm]",
    "law.vetoAgreed": "[firm]",
    "law.vetoRejected": "[firm]",
    "law.vetoUnlocked": "[announcing]",
    "power.investigate": "[calm]",
    "power.investigated": "[calm]",
    "power.investigatedYou": "[whispering]",
    "power.investigatedLiberal": "[whispering]",
    "power.investigatedFascist": "[whispering]",
    "power.peek": "[calm]",
    "power.peekDone": "[calm]",
    "power.specialElection": "[announcing]",
    "power.execution": "[grave]",
    "power.executed": "[grave]",
    "power.executedYou": "[grave]",
    "power.hitlerExecuted": "[firm]",
    "game.liberalsWin.policies": "[firm]",
    "game.fascistsWin.policies": "[grave]",
    "game.reveal": "[announcing]",
    "private.youLiberal": "[whispering]",
    "private.youFascist": "[whispering]",
    "private.youHitler": "[whispering]",
    "private.nightLiberal": "[whispering]",
    "private.nightFascistSmall": "[whispering]",
    "private.nightFascistLarge": "[whispering]",
    "private.nightHitlerSmall": "[whispering]",
    "private.nominate": "[whispering]",
    "private.vote": "[whispering]",
    "private.discard": "[whispering]",
    "private.enact": "[whispering]",
}


def with_eleven_direction(line_id: str, text: LineText) -> LineText:
    parts = tuple(for_eleven_fa(p) for p in phrases(text))
    direction = ELEVEN_DIRECTION.get(line_id)
    if direction is None:
        return parts if len(parts) > 1 else parts[0]
    if isinstance(direction, tuple):
        tagged = tuple(
            f"{direction[i]} {parts[i]}" if i < len(direction) else parts[i]
            for i in range(len(parts))
        )
        return tagged if len(tagged) > 1 else tagged[0]
    return tuple(f"{direction} {p}" for p in parts) if len(parts) > 1 else f"{direction} {parts[0]}"


def wav_duration(path: Path) -> float:
    import wave

    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


RADIO_STYLE = (
    "تو یک گوینده رادیوی فارسی تهرانی هستی. "
    "جمله‌ها را همان‌طور بخوان که مردم حرف می‌زنند، نه مثل کتاب. "
    "رادیو، اما گفتاری. فقط همین جمله را بخوان، هیچ چیز اضافه نگو:\n"
)


def phrases(text: LineText) -> tuple[str, ...]:
    return text if isinstance(text, tuple) else (text,)


def join_with_pause(sources: list[Path], dest: Path, pause_s: float = PAUSE_S) -> None:
    """Stitch clips with a silent breath, then the usual loudnorm pad."""
    if len(sources) == 1:
        pad_and_normalize(sources[0], dest)
        return
    n = len(sources)
    inputs: list[str] = []
    for src in sources:
        inputs.extend(["-i", str(src)])
    fmt = "aformat=sample_fmts=fltp:sample_rates=24000:channel_layouts=mono"
    parts = [f"[{i}:a]{fmt}[a{i}]" for i in range(n)]
    parts.append(
        f"anullsrc=r=24000:cl=mono:d={pause_s},aformat=sample_fmts=fltp:channel_layouts=mono[gap]"
    )
    concat_in = "".join(
        f"[a{i}][gap]" if i < n - 1 else f"[a{i}]" for i in range(n)
    )
    parts.append(f"{concat_in}concat=n={2 * n - 1}:v=0:a=1[out]")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        mid = Path(tmp.name)
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                *inputs,
                "-filter_complex",
                ";".join(parts),
                "-map",
                "[out]",
                "-ac",
                "1",
                "-ar",
                "24000",
                str(mid),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        pad_and_normalize(mid, dest)
    finally:
        mid.unlink(missing_ok=True)


def pad_and_normalize(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-af",
            "adelay=150:all=1,apad=pad_dur=0.15,loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ac",
            "1",
            "-b:a",
            "96k",
            str(dest),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def wav_from_pcm(path: Path, pcm: bytes, rate: int = 24000) -> None:
    import wave

    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(pcm)


def ensure_dilara_prompt() -> Path:
    dest = VOICE_PROMPTS["dilara"]
    if dest.exists():
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    url = "https://huggingface.co/mehdi-hf/pocket-tts-farsi/resolve/main/example_voice.wav"
    subprocess.run(["curl", "-fsSL", url, "-o", str(dest)], check=True)
    return dest


def ensure_farid_prompt() -> Path:
    """Male prompt: Azure Farid, ~4 s, then pocket-tts clones the timbre."""
    dest = VOICE_PROMPTS["farid"]
    if dest.exists():
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    import asyncio

    import edge_tts

    text = (
        "وقت حرف زدنه. بفهمید کی باهاتونه. "
        "رئیس‌جمهور باید یه صدراعظم نامزد کنه."
    )

    async def record() -> None:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            raw = Path(tmp.name)
        try:
            await edge_tts.Communicate(
                text, "fa-IR-FaridNeural", rate="-10%", pitch="-8Hz"
            ).save(str(raw))
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(raw),
                    "-t",
                    "5",
                    "-ac",
                    "1",
                    "-ar",
                    "24000",
                    "-sample_fmt",
                    "s16",
                    str(dest),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        finally:
            raw.unlink(missing_ok=True)

    asyncio.run(record())
    return dest


def speak_pocket(text: str, dest: Path, model, state) -> None:
    import numpy as np
    import sphn
    import torch

    spoken = for_tts(text)
    expected = max(1.7, 0.35 * len(spoken.split()) + 0.5)
    best_raw: Path | None = None
    best_score = None
    leftovers: list[Path] = []
    try:
        for seed in range(5):
            torch.manual_seed(seed)
            audio = model.generate_audio(state, spoken, frames_after_eos=0)
            wav = np.asarray(audio, dtype=np.float32).reshape(-1)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                raw = Path(tmp.name)
            sphn.write_wav(str(raw), wav, int(model.mimi.sample_rate))
            dur = wav_duration(raw)
            leftovers.append(raw)
            if dur < 1.2 or dur > 12.0:
                print(f"  skip seed {seed}: {dur:.2f}s")
                continue
            score = abs(dur - expected)
            if best_score is None or score < best_score:
                best_score = score
                best_raw = raw
                print(f"  seed {seed}: {dur:.2f}s (keep)")
            else:
                print(f"  seed {seed}: {dur:.2f}s")
        if best_raw is None:
            best_raw = leftovers[-1]
        pad_and_normalize(best_raw, dest)
    finally:
        for path in leftovers:
            path.unlink(missing_ok=True)


def speak_pocket_line(text: LineText, dest: Path, model, state) -> None:
    parts = phrases(text)
    if len(parts) == 1:
        speak_pocket(parts[0], dest, model, state)
        return
    chunks: list[Path] = []
    try:
        for phrase in parts:
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                chunk = Path(tmp.name)
            speak_pocket(phrase, chunk, model, state)
            chunks.append(chunk)
        join_with_pause(chunks, dest)
    finally:
        for path in chunks:
            path.unlink(missing_ok=True)


def run_pocket(who: list[str], ids: list[str] | None = None) -> None:
    from pocket_tts import TTSModel

    lines = LINES if not ids else {i: LINES[i] for i in ids}
    prompts = {
        "farid": ensure_farid_prompt(),
        "dilara": ensure_dilara_prompt(),
    }
    print("loading pocket-tts-farsi (first run downloads the model)...")
    model = TTSModel.load_model(
        config="hf://mehdi-hf/pocket-tts-farsi/farsi.yaml",
        temp=0.3,
        eos_threshold=-2.0,
    )
    n = 0
    for name in who:
        prompt = prompts[name]
        print(f"voice {name} <- {prompt.name}")
        state = model.get_state_for_audio_prompt(str(prompt))
        for line_id, text in lines.items():
            dest = OUT_DIR / name / f"{line_id}.mp3"
            spoken = " / ".join(for_tts(p) for p in phrases(text))
            print(f"{name}/{line_id}: {spoken}")
            speak_pocket_line(text, dest, model, state)
            n += 1
    print(f"wrote {n} files under {OUT_DIR}")


async def speak_edge(voice: str, text: LineText, dest: Path) -> None:
    import edge_tts

    async def raw_mp3(phrase: str, path: Path) -> None:
        communicate = edge_tts.Communicate(phrase, voice, rate="-10%", pitch="-5Hz")
        await communicate.save(str(path))

    parts = phrases(text)
    if len(parts) == 1:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            raw = Path(tmp.name)
        try:
            await raw_mp3(parts[0], raw)
            pad_and_normalize(raw, dest)
        finally:
            raw.unlink(missing_ok=True)
        return

    chunks: list[Path] = []
    try:
        for phrase in parts:
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                chunk = Path(tmp.name)
            await raw_mp3(phrase, chunk)
            chunks.append(chunk)
        join_with_pause(chunks, dest)
    finally:
        for path in chunks:
            path.unlink(missing_ok=True)


async def run_edge(who: list[str], ids: list[str] | None = None) -> None:
    voices = {"farid": "fa-IR-FaridNeural", "dilara": "fa-IR-DilaraNeural"}
    lines = LINES if not ids else {i: LINES[i] for i in ids}
    sem = asyncio.Semaphore(4)

    async def one(name: str, line_id: str, text: LineText) -> None:
        dest = OUT_DIR / name / f"{line_id}.mp3"
        async with sem:
            spoken = " / ".join(phrases(text))
            print(f"{name}/{line_id}: {spoken}")
            await speak_edge(voices[name], text, dest)

    tasks = [
        one(name, line_id, text)
        for name in who
        for line_id, text in lines.items()
    ]
    await asyncio.gather(*tasks)
    print(f"wrote {len(tasks)} files under {OUT_DIR}")


def run_gemini(who: list[str]) -> None:
    from google import genai
    from google.genai import types

    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        sys.exit("Set GEMINI_API_KEY for --engine gemini")

    voices = {"farid": "Fenrir", "dilara": "Kore"}
    client = genai.Client(api_key=key)
    n = 0
    for name in who:
        for line_id, text in LINES.items():
            dest = OUT_DIR / name / f"{line_id}.mp3"
            print(f"{name}/{line_id}")
            spoken = " ".join(phrases(text))
            response = client.models.generate_content(
                model="gemini-2.5-flash-preview-tts",
                contents=RADIO_STYLE + spoken,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=voices[name],
                            )
                        )
                    ),
                ),
            )
            pcm = response.candidates[0].content.parts[0].inline_data.data
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                raw = Path(tmp.name)
            try:
                wav_from_pcm(raw, pcm)
                pad_and_normalize(raw, dest)
            finally:
                raw.unlink(missing_ok=True)
            n += 1
    print(f"wrote {n} files under {OUT_DIR}")


def speak_eleven(key: str, voice_id: str, text: str, dest: Path, language_code: str) -> None:
    import json
    from urllib.error import HTTPError
    from urllib.request import Request, urlopen

    body = json.dumps(
        {
            "text": text,
            "model_id": "eleven_v3",
            "language_code": language_code,
            "voice_settings": {
                "stability": 0.55,
                "similarity_boost": 0.75,
                "style": 0.2,
                "use_speaker_boost": True,
                "speed": 0.95,
            },
        }
    ).encode()
    req = Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        data=body,
        headers={
            "xi-api-key": key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        raw = Path(tmp.name)
    try:
        try:
            with urlopen(req, timeout=120) as resp:
                raw.write_bytes(resp.read())
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:400]
            sys.exit(f"ElevenLabs HTTP {exc.code}: {detail}")
        pad_and_normalize(raw, dest)
    finally:
        raw.unlink(missing_ok=True)


def speak_eleven_line(
    key: str, voice_id: str, text: LineText, dest: Path, language_code: str
) -> None:
    parts = phrases(text)
    if len(parts) == 1:
        speak_eleven(key, voice_id, parts[0], dest, language_code)
        return
    chunks: list[Path] = []
    try:
        for phrase in parts:
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                chunk = Path(tmp.name)
            speak_eleven(key, voice_id, phrase, chunk, language_code)
            chunks.append(chunk)
        join_with_pause(chunks, dest)
    finally:
        for path in chunks:
            path.unlink(missing_ok=True)


def run_eleven(who: list[str], ids: list[str] | None = None, lang: str = "en") -> None:
    key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY")
    if not key:
        sys.exit("Set ELEVENLABS_API_KEY for --engine eleven")

    voices = {
        "james": os.environ.get("ELEVENLABS_JAMES_VOICE_ID", JAMES_VOICE_ID),
        "daniel": os.environ.get("ELEVENLABS_DANIEL_VOICE_ID", "onwK4e9ZLuTAKqWW03F9"),
        "callum": os.environ.get("ELEVENLABS_CALLUM_VOICE_ID", "N2lVS1w4EtoT3dr4eOWO"),
        "george": os.environ.get("ELEVENLABS_GEORGE_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb"),
        "sarah": os.environ.get("ELEVENLABS_SARAH_VOICE_ID", "EXAVITQu4vr4xnSDxMaL"),
        "brian": os.environ.get("ELEVENLABS_BRIAN_VOICE_ID", "nPczCjzI2devNBz1zQrb"),
        "dilara": os.environ.get("ELEVENLABS_DILARA_VOICE_ID", ""),
    }
    missing = [name for name in who if not voices.get(name)]
    if missing:
        sys.exit(
            "Unknown or unconfigured ElevenLabs voice: "
            + ", ".join(missing)
            + ". Use --who daniel, george, callum, sarah, brian, or james (paid)."
        )

    catalog = catalog_for(lang)
    lines = catalog if not ids else {i: catalog[i] for i in ids}
    language_code = "en" if lang == "en" else "fa"
    n = 0
    for name in who:
        for line_id, text in lines.items():
            dest = OUT_DIR / name / f"{line_id}.mp3"
            spoken_text: LineText = (
                with_eleven_direction(line_id, text) if lang == "fa" else text
            )
            spoken = " / ".join(phrases(spoken_text))
            print(f"{name}/{line_id}: {spoken}")
            speak_eleven_line(key, voices[name], spoken_text, dest, language_code)
            n += 1
    print(f"wrote {n} files under {OUT_DIR / who[0]}")


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--engine",
        choices=("pocket", "gemini", "eleven", "edge"),
        default="pocket",
    )
    parser.add_argument(
        "--who",
        default="daniel",
        help="comma-separated: daniel (default male), callum, george, james",
    )
    parser.add_argument(
        "--ids",
        default="",
        help="comma-separated line ids; default is the full catalog",
    )
    parser.add_argument(
        "--lang",
        choices=("fa", "en"),
        default="fa",
        help="spoken catalog: fa (default) or en",
    )
    args = parser.parse_args()
    if shutil.which("ffmpeg") is None:
        sys.exit("ffmpeg is required (brew install ffmpeg)")
    who = [w.strip() for w in args.who.split(",") if w.strip()]
    ids = [i.strip() for i in args.ids.split(",") if i.strip()] or None
    if args.engine == "pocket":
        run_pocket(who, ids)
    elif args.engine == "gemini":
        run_gemini(who)
    elif args.engine == "eleven":
        run_eleven(who, ids, args.lang)
    else:
        asyncio.run(run_edge(who, ids))


if __name__ == "__main__":
    main()
