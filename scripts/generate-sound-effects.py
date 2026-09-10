#!/usr/bin/env python3
"""Bake table SFX from docs/sound-effects.md. Not live generation — run once, commit.

Needs ELEVENLABS_API_KEY (Sound Generation, not TTS) and ffmpeg on PATH.

  python3 scripts/generate-sound-effects.py --ids tracker-tick
  python3 scripts/generate-sound-effects.py --pilot
  python3 scripts/generate-sound-effects.py --force
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "client/src/assets/sounds/effects"

PREFIX = (
    "Close analog 1930s tabletop recording. One clear event. No voice, "
    "no letters, no gunshot, no scream, no cartoon, no sci-fi. "
)

# Each clip has ONE signature so the ear can tell events apart.
# Saxophone is only government-rejected.
EFFECTS: dict[str, tuple[float, str]] = {
    "player-join": (
        1.6,
        "A wooden chair pulled across floorboards and sat in. Foley only. No music.",
    ),
    "player-leave": (
        1.4,
        "A wooden chair scraped backward, then footsteps walking away. Foley only.",
    ),
    "player-ready": (
        1.2,
        "A rubber office stamp pressed once onto thick cardstock. Dry ink. No music.",
    ),
    "room-start": (
        2.4,
        "A wooden judge gavel strikes a desk once, then a plastic-coated poker deck is riffle-shuffled. Card snap, not paper.",
    ),
    "ui-error": (
        1.2,
        "A small brass reception bell dinged twice, muted and wrong. No saxophone.",
    ),
    "ui-copied": (1.0, "A small slip of paper torn once. Foley only."),
    "room-closed": (
        1.8,
        "A heavy wooden door closes and the latch clicks. Room goes quiet.",
    ),
    "deal-slide": (
        1.8,
        "One thick plastic-coated poker card slides across a polished wooden table and stops with a snap. Playing-card stock, not paper, not newspaper.",
    ),
    "night-fall": (
        2.8,
        "A heavy velvet cloth settles over a table. Bakelite radio hiss fades to silence. No melody.",
    ),
    "card-flip": (
        1.6,
        "A plastic-coated poker card is flipped face-up onto wood. Sharp card snap. Not paper.",
    ),
    "glance-tick": (
        1.4,
        "A wooden mantel clock. One slow isolated tick. No tock. No music.",
    ),
    "night-lift": (
        2.2,
        "Velvet cloth lifted off a table. Air returns to the room. Foley only.",
    ),
    "president-seal": (
        2.4,
        "A heavy wooden desk placard is set down, then a single bright brass service-bell ding. Office granted.",
    ),
    "chancellor-seal": (
        2.4,
        "A wax seal stamped onto paper, oak placard landing. No bell, no trumpet.",
    ),
    "nominate-timeout": (
        2.0,
        "A single dull tubular chime that does not resolve. A chance missed. No saxophone.",
    ),
    "discuss-open": (
        1.6,
        "A wooden gavel is set down unused, not struck. Talk may begin. Foley only.",
    ),
    "discuss-warn": (
        1.8,
        "A wooden desk clock ticks twice. No music, no saxophone.",
    ),
    "discuss-close": (
        1.6,
        "One firm wooden gavel strike. Talk is over. No piano.",
    ),
    "ballot-tap": (
        1.2,
        "A large plastic-coated playing card slapped onto felt, like a casino chip-and-card slap. Not paper.",
    ),
    "ballot-slide": (
        1.4,
        "A face-down plastic-coated poker card sliding a short way on wood. Card on wood, not paper.",
    ),
    "vote-tally": (
        2.2,
        "A poker deck squared on a table, cards riffling, then one finger tap. Playing cards, not paper flutter.",
    ),
    "government-elected": (
        2.8,
        "A felt piano plays a short major triad, then a gavel. The government stands. No saxophone.",
    ),
    "government-rejected": (
        3.2,
        "A lonely tenor saxophone, one falling minor phrase, disappointed. This is the only saxophone clip. Not a comedy fail horn.",
    ),
    "tracker-tick": (
        1.6,
        "A small walnut chess pawn slides one square on wood. Wood on wood. No music.",
    ),
    "chaos-hit": (
        3.2,
        "A dissonant low piano cluster inside a wooden cabinet. Grave. No saxophone, no explosion.",
    ),
    "chaos-enact": (
        2.0,
        "A plastic-coated law card slapped hard onto a wooden board. Playing-card snap. Not paper.",
    ),
    "policy-draw": (
        2.2,
        "Three plastic-coated poker cards dealt in a row onto wood. Casino deal. Not paper.",
    ),
    "policy-burn": (
        2.2,
        "A playing card catching fire and burning: paper-cardstock in flame, crackle, short whoosh of fire, then it dies. Real burn, not a card snap. No scream, no explosion.",
    ),
    "policy-pass": (
        1.8,
        "Two plastic-coated poker cards sliding together across a wooden table. Cardstock snap. Not paper.",
    ),
    "law-liberal": (
        2.2,
        "A plastic-coated playing card falling and landing flat on a wooden game board. Card hitting wood. No guitar, no piano, no stamp.",
    ),
    "law-fascist": (
        2.2,
        "A heavier playing card falling and landing hard on a wooden game board. Card hitting wood, slightly darker room. No guitar, no piano, no stamp.",
    ),
    "veto-offer": (
        1.8,
        "A wax stamp tapped once without pressing. Questioning. Foley only.",
    ),
    "veto-agree": (
        2.4,
        "Two wax stamps, then two plastic-coated poker cards thrown onto a discard pile. Card snap, not paper.",
    ),
    "veto-refuse": (
        1.8,
        "A wax stamp lifted away, then a sharp wood tap. Refusal. No saxophone.",
    ),
    "veto-unlock": (
        2.2,
        "A metal cabinet bolt slides open. Iron latch. No melody.",
    ),
    "seal-open": (
        2.0,
        "A wax seal peeled off wood. Short wax crackle. Foley only.",
    ),
    "party-slide": (
        1.8,
        "A thick plastic-coated playing card sliding from a seat to the table centre. Card on wood, not paper.",
    ),
    "peek-flip": (
        2.0,
        "Three plastic-coated poker cards fanned and flipped. Card snap. Not paper.",
    ),
    "peek-done": (
        1.8,
        "Three plastic-coated poker cards sliding back onto a draw pile. Card on card. Not paper.",
    ),
    "execute-strike": (
        2.8,
        "One deep funeral church bell, a death knell, then a mourning ribbon on an empty wooden chair. No weapon, no scream, no saxophone.",
    ),
    "you-died": (
        2.6,
        "The same funeral bell, closer and muffled, as if next to the listener. No saxophone.",
    ),
    "win-liberal": (
        4.0,
        "Mature 1930s film-score victory: warm felt piano and low strings in a major key, restrained and adult, like a closing title. No bells, no music box, no glockenspiel, no choir, no voice, no saxophone.",
    ),
    "win-fascist": (
        6.0,
        "Dark pipe organ, minor, church closing, heavy gothic organ. Keep that same organ going: after the opening chord, continue with one long low note, then three short notes, then one long note (deeeen di-di-d deeee). Same close organ as before, just a slightly darker tone, not more distant. No voice, no choir, no saxophone.",
    ),
    "role-cascade": (
        2.4,
        "A poker deck riffle-shuffled, then plastic-coated cards flipping one after another. Playing cards, not paper.",
    ),
    "timer-tick": (
        1.0,
        "A wooden mantel clock: one tick, then one tock. Dry, loopable. No melody.",
    ),
    "timer-urgent": (
        1.0,
        "A closer wooden clock, sharper tick-tock. Last seconds. Analog only, no digital beep, no music.",
    ),
}

PILOT = [
    "deal-slide",
    "card-flip",
    "president-seal",
    "chancellor-seal",
    "ballot-tap",
    "government-elected",
    "government-rejected",
    "tracker-tick",
    "law-liberal",
    "law-fascist",
    "execute-strike",
    "win-liberal",
    "win-fascist",
    "role-cascade",
    "timer-tick",
    "timer-urgent",
]


def normalize(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-af",
            "adelay=50:all=1,apad=pad_dur=0.05,loudnorm=I=-20:TP=-1.5:LRA=8",
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


def generate(key: str, prompt: str, duration: float, dest: Path) -> None:
    from urllib.error import HTTPError
    from urllib.request import Request, urlopen

    text = PREFIX + prompt
    if len(text) > 450:
        raise RuntimeError(f"prompt {len(text)} chars (max 450)")

    body = json.dumps(
        {
            "text": text,
            "duration_seconds": max(0.5, duration),
            "prompt_influence": 0.65,
            "loop": False,
        }
    ).encode()
    req = Request(
        "https://api.elevenlabs.io/v1/sound-generation",
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
            raise RuntimeError(f"ElevenLabs HTTP {exc.code}: {detail}") from exc
        normalize(raw, dest)
    finally:
        raw.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Bake table SFX via ElevenLabs.")
    parser.add_argument(
        "--ids",
        help="Comma-separated ids (default: whole catalog).",
    )
    parser.add_argument(
        "--pilot",
        action="store_true",
        help="Only the 14 highest-value table beats.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print prompts, do not call the API.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite files that already exist.",
    )
    args = parser.parse_args()

    if args.pilot:
        ids = PILOT
    elif args.ids:
        ids = [item.strip() for item in args.ids.split(",") if item.strip()]
    else:
        ids = list(EFFECTS)

    unknown = [item for item in ids if item not in EFFECTS]
    if unknown:
        sys.exit(f"Unknown ids: {', '.join(unknown)}")

    if args.dry_run:
        for effect_id in ids:
            duration, prompt = EFFECTS[effect_id]
            text = PREFIX + prompt
            print(f"{effect_id} ({duration}s, {len(text)} chars)")
            print(f"  {text}")
        return

    key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY")
    if not key:
        sys.exit("Set ELEVENLABS_API_KEY")
    if shutil_missing("ffmpeg"):
        sys.exit("ffmpeg is required on PATH")

    n = 0
    failed: list[str] = []
    for effect_id in ids:
        duration, prompt = EFFECTS[effect_id]
        dest = OUT_DIR / f"{effect_id}.mp3"
        if not args.force and dest.exists() and dest.stat().st_size > 0:
            print(f"{effect_id}: skip (exists)")
            continue
        print(f"{effect_id}: {duration}s")
        try:
            generate(key, prompt, duration, dest)
            n += 1
        except Exception as exc:
            print(f"  fail: {exc}")
            failed.append(effect_id)
    print(f"wrote {n} files under {OUT_DIR}")
    if failed:
        sys.exit("failed: " + ",".join(failed))


def shutil_missing(name: str) -> bool:
    from shutil import which

    return which(name) is None


if __name__ == "__main__":
    main()
