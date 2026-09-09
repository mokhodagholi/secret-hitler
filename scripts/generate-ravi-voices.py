#!/usr/bin/env python3
"""Bake Ravi mp3s from the script. Not live TTS — run once, commit the files.

Engines (pick one):

  pocket   Native Persian (pocket-tts-farsi, trained on ~500h of Farsi).
           Farid = male prompt, Dilara = female prompt.

  gemini   Gemini TTS with a radio-host style prompt. Native-sounding and
           two distinct voices (Fenrir / Kore). Needs GEMINI_API_KEY.

  eleven   ElevenLabs eleven_v3. Best commercial quality. Needs
           ELEVENLABS_API_KEY plus voice ids.

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

# id → spoken Persian (FA audio line from docs/ravi-script.md)
LINES: dict[str, str] = {
    "deal.start": "الان نقش‌هاتون پخش می‌شه.",
    "deal.look": "الان نقش‌تون رو ببینید. به کسی نشون ندید.",
    "night.start": "شب شد. هر کی باید نگاه کنه، الان نگاه کنه.",
    "night.end": "صبح شد. کارت‌هاتون رو قایم کنید.",
    "president.first": "رئیس‌جمهور این دور معلوم شد.",
    "president.firstYou": "این دور شما رئیس‌جمهورید.",
    "president.next": "ریاست رسید به نفر بعد.",
    "president.nextYou": "ریاست رسید به شما.",
    "president.special": "انتخابات ویژه شروع شد.",
    "discuss.start": "خب، وقت حرف زدنه.",
    "discuss.closing": "دیگه وقتتون کمه.",
    "discuss.ended": "دیگه حرف‌ها تموم شد.",
    "nominate.start": "رئیس‌جمهور، صدراعظم رو انتخاب کنه.",
    "nominate.named": "صدراعظم انتخاب شد.",
    "nominate.namedYou": "شما صدراعظم رو انتخاب کردید.",
    "nominate.namedAsYou": "شما رو صدراعظم انتخاب کردن.",
    "nominate.timeout": "صدراعظم انتخاب نشد.",
    "vote.start": "رای‌گیری آغاز شد.",
    "vote.collecting": "رای‌ها داره جمع می‌شه.",
    "vote.count": "رای‌ها رو شمردیم.",
    "vote.passed": "دولت رای آورد.",
    "vote.failed": "دولت رای نیاورد.",
    "vote.hitlerChancellor": "هیتلر صدراعظم شد. فاشیست‌ها برنده شدن.",
    "tracker.advance": "شمارنده یکی رفت جلو.",
    "chaos.start": "سه دولت پشت‌سرهم رای نیاورد. آشوب شروع شد.",
    "chaos.enacted": "قانون بالای دسته تصویب می‌شه. رئیس‌جمهور قدرتی نمی‌گیره.",
    "law.draw": "سه تا قانون می‌ره دست رئیس‌جمهور.",
    "law.presidentChoosing": "رئیس‌جمهور یکی رو می‌سوزونه.",
    "law.burned": "یه قانون سوخت.",
    "law.pass": "دو تا قانون می‌ره دست صدراعظم.",
    "law.chancellorChoosing": "صدراعظم یکی رو تصویب می‌کنه.",
    "law.liberal": "یه قانون لیبرالی تصویب شد.",
    "law.fascist": "یه قانون فاشیستی تصویب شد.",
    "law.vetoOffered": "صدراعظم پیشنهاد حق وتو داد.",
    "law.vetoAgreed": "حق وتو قبول شد. هر دو قانون سوخت.",
    "law.vetoRejected": "رئیس‌جمهور حق وتو رو رد کرد. باید یه قانون تصویب بشه.",
    "law.vetoUnlocked": "حق وتو باز شد.",
    "power.investigate": "رئیس‌جمهور باید کارت یکی رو چک کنه.",
    "power.investigated": "کارت چک شد.",
    "power.investigatedYou": "کارت شما چک شد.",
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
}

def for_tts(text: str) -> str:
    """pocket-tts spelling: no ZWNJ, no Arabic comma (tiny chunks hallucinate)."""
    text = text.replace("می‌", "می")
    text = text.replace("\u200c", " ")
    text = text.replace("،", " ")
    return " ".join(text.split())


def wav_duration(path: Path) -> float:
    import wave

    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


RADIO_STYLE = (
    "تو یک گوینده رادیوی فارسی تهرانی هستی. "
    "جمله‌ها را همان‌طور بخوان که مردم حرف می‌زنند، نه مثل کتاب. "
    "رادیو، اما گفتاری. فقط همین جمله را بخوان، هیچ چیز اضافه نگو:\n"
)


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
            if dur < 1.2 or dur > 8.0:
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
            print(f"{name}/{line_id}: {for_tts(text)}")
            speak_pocket(text, dest, model, state)
            n += 1
    print(f"wrote {n} files under {OUT_DIR}")


async def speak_edge(voice: str, text: str, dest: Path) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice, rate="-10%", pitch="-5Hz")
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        raw = Path(tmp.name)
    try:
        await communicate.save(str(raw))
        pad_and_normalize(raw, dest)
    finally:
        raw.unlink(missing_ok=True)


async def run_edge(who: list[str], ids: list[str] | None = None) -> None:
    voices = {"farid": "fa-IR-FaridNeural", "dilara": "fa-IR-DilaraNeural"}
    lines = LINES if not ids else {i: LINES[i] for i in ids}
    sem = asyncio.Semaphore(4)

    async def one(name: str, line_id: str, text: str) -> None:
        dest = OUT_DIR / name / f"{line_id}.mp3"
        async with sem:
            print(f"{name}/{line_id}: {text}")
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
            response = client.models.generate_content(
                model="gemini-2.5-flash-preview-tts",
                contents=RADIO_STYLE + text,
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


def run_eleven(who: list[str]) -> None:
    import json
    from urllib.request import Request, urlopen

    key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY")
    if not key:
        sys.exit("Set ELEVENLABS_API_KEY for --engine eleven")

    voices = {
        "farid": os.environ.get("ELEVENLABS_FARID_VOICE_ID", ""),
        "dilara": os.environ.get("ELEVENLABS_DILARA_VOICE_ID", ""),
    }
    missing = [name for name in who if not voices[name]]
    if missing:
        sys.exit(
            "Set ELEVENLABS_FARID_VOICE_ID and ELEVENLABS_DILARA_VOICE_ID "
            "(Persian-tagged voices from the ElevenLabs library)"
        )

    n = 0
    for name in who:
        for line_id, text in LINES.items():
            dest = OUT_DIR / name / f"{line_id}.mp3"
            print(f"{name}/{line_id}")
            body = json.dumps(
                {
                    "text": text,
                    "model_id": "eleven_v3",
                    "language_code": "fa",
                }
            ).encode()
            req = Request(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voices[name]}",
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
                with urlopen(req) as resp:
                    raw.write_bytes(resp.read())
                pad_and_normalize(raw, dest)
            finally:
                raw.unlink(missing_ok=True)
            n += 1
    print(f"wrote {n} files under {OUT_DIR}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--engine",
        choices=("pocket", "gemini", "eleven", "edge"),
        default="pocket",
    )
    parser.add_argument(
        "--who",
        default="farid,dilara",
        help="comma-separated: farid,dilara",
    )
    parser.add_argument(
        "--ids",
        default="",
        help="comma-separated line ids; default is the full catalog",
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
        run_eleven(who)
    else:
        asyncio.run(run_edge(who, ids))


if __name__ == "__main__":
    main()
