#!/usr/bin/env python3
"""Quiet felt-piano stand-ins for onboarding. Suno prompts in docs/background-music.md.

  python3 scripts/generate-onboarding-audio.py
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MUSIC_DIR = ROOT / "client/src/assets/sounds/music"
EFFECT_DIR = ROOT / "client/src/assets/sounds/effects"

# Felt piano: fundamental plus quickly dying overtones, wool-soft attack.
HARMONICS = (
    (1.0, 0.55, 0.05),
    (2.01, 0.22, 0.035),
    (3.0, 0.1, 0.02),
    (4.02, 0.04, 0.012),
)
# Beds: no hammer, slow bloom — a room, not a figure you wait for.
PAD_HARMONICS = (
    (1.0, 0.48, 0.22),
    (2.01, 0.12, 0.16),
    (3.0, 0.04, 0.12),
)


def ffmpeg(args: list[str]) -> None:
    subprocess.check_call(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args])


def silence(path: Path, duration: float) -> None:
    ffmpeg(
        [
            "-f",
            "lavfi",
            "-i",
            f"anullsrc=r=44100:cl=mono:d={duration}",
            str(path),
        ]
    )


def concat(paths: list[Path], dest: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        list_path = Path(tmp) / "list.txt"
        list_path.write_text("".join(f"file '{p}'\n" for p in paths))
        ffmpeg(["-f", "concat", "-safe", "0", "-i", str(list_path), str(dest)])


def mix(paths: list[Path], dest: Path, duration: float) -> None:
    args: list[str] = []
    for path in paths:
        args.extend(["-i", str(path)])
    ffmpeg(
        [
            *args,
            "-filter_complex",
            f"amix=inputs={len(paths)}:duration=longest:normalize=0,"
            f"atrim=0:{duration},asetpts=PTS-STARTPTS",
            str(dest),
        ]
    )


def harmonic(
    path: Path,
    freq: float,
    duration: float,
    volume: float,
    fade_in: float,
    *,
    pad: bool = False,
) -> None:
    fade_out_start = max(fade_in + 0.4, duration * 0.5) if pad else max(fade_in + 0.08, duration * 0.18)
    fade_out = max(0.2, duration - fade_out_start - 0.02)
    ffmpeg(
        [
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency={freq}:sample_rate=44100:duration={duration}",
            "-af",
            f"volume={volume},afade=t=in:d={fade_in},"
            f"afade=t=out:st={fade_out_start}:d={fade_out}",
            str(path),
        ]
    )


def hammer(path: Path) -> None:
    ffmpeg(
        [
            "-f",
            "lavfi",
            "-i",
            "anoisesrc=d=0.045:c=white:a=0.25:r=44100",
            "-af",
            "highpass=f=600,lowpass=f=3500,afade=t=out:st=0.008:d=0.03,volume=0.09",
            str(path),
        ]
    )


def piano_note(
    tmp: Path,
    dest: Path,
    freqs: list[float],
    duration: float,
    *,
    dark: bool = False,
    pad: bool = False,
) -> None:
    parts: list[Path] = []
    cutoff = 1300 if pad else 1400 if dark else 2100
    harmonics = PAD_HARMONICS if pad else HARMONICS
    for freq_i, freq in enumerate(freqs):
        for harm_i, (ratio, vol, fade_in) in enumerate(harmonics):
            part = tmp / f"{dest.stem}-{freq_i}-{harm_i}.wav"
            harmonic(
                part,
                freq * ratio,
                duration,
                vol / max(1, len(freqs)),
                fade_in,
                pad=pad,
            )
            parts.append(part)
    if not pad:
        knock = tmp / f"{dest.stem}-hammer.wav"
        hammer(knock)
        parts.append(knock)
    raw = tmp / f"{dest.stem}-mix.wav"
    mix(parts, raw, duration)
    room = (
        "lowpass=f={cutoff},aecho=0.8:0.88:110:0.32,aecho=0.55:0.7:220:0.16,volume=0.55"
        if pad
        else f"lowpass=f={cutoff},aecho=0.7:0.75:55:0.22,volume=0.85"
    )
    ffmpeg(["-i", str(raw), "-af", room.format(cutoff=cutoff), str(dest)])


def finish_effect(src: Path, dest: Path) -> None:
    ffmpeg(
        [
            "-i",
            str(src),
            "-af",
            "adelay=40:all=1,apad=pad_dur=0.12,loudnorm=I=-21:TP=-1.5:LRA=8",
            "-ac",
            "1",
            "-b:a",
            "96k",
            str(dest),
        ]
    )


LOOP_SECONDS = 36.0


def place(src: Path, dest: Path, start: float, duration: float) -> None:
    ffmpeg(
        [
            "-i",
            str(src),
            "-af",
            f"adelay={int(start * 1000)}:all=1,apad=pad_dur={duration}",
            "-t",
            str(duration),
            str(dest),
        ]
    )


def finish_loop(src: Path, dest: Path, noise: float) -> None:
    fade_at = LOOP_SECONDS - 1.8
    ffmpeg(
        [
            "-i",
            str(src),
            "-f",
            "lavfi",
            "-i",
            f"anoisesrc=d={LOOP_SECONDS}:c=pink:a={noise}:r=44100",
            "-filter_complex",
            f"[1]atrim=0:{LOOP_SECONDS},asetpts=PTS-STARTPTS,lowpass=f=900[n];"
            f"[0][n]amix=inputs=2:duration=first:normalize=0,"
            f"aformat=channel_layouts=stereo,"
            f"lowpass=f=1600,afade=t=in:d=1.6,afade=t=out:st={fade_at}:d=1.8,"
            f"loudnorm=I=-30:TP=-2:LRA=5",
            "-t",
            str(LOOP_SECONDS),
            "-ac",
            "2",
            "-b:a",
            "128k",
            str(dest),
        ]
    )


def chord_bed(
    tmp: Path,
    events: list[tuple[list[float], float, float]],
    name: str,
) -> Path:
    """Overlapping chords on a 36s canvas. No repeating hook."""
    placed: list[Path] = []
    bed = tmp / f"{name}-silence.wav"
    silence(bed, LOOP_SECONDS)
    placed.append(bed)
    for index, (freqs, start, hold) in enumerate(events):
        chord = tmp / f"{name}-c{index}.wav"
        piano_note(tmp, chord, freqs, hold, pad=True)
        delayed = tmp / f"{name}-c{index}-at.wav"
        place(chord, delayed, start, LOOP_SECONDS)
        placed.append(delayed)
    dest = tmp / f"{name}.wav"
    mix(placed, dest, LOOP_SECONDS)
    return dest


def phrase_from_notes(
    tmp: Path,
    notes: list[tuple[list[float], float, float, bool]],
    name: str,
) -> Path:
    parts: list[Path] = []
    for index, (freqs, hold, rest, dark) in enumerate(notes):
        note = tmp / f"{name}-{index}.wav"
        piano_note(tmp, note, freqs, hold, dark=dark)
        parts.append(note)
        if rest > 0:
            gap = tmp / f"{name}-{index}-gap.wav"
            silence(gap, rest)
            parts.append(gap)
    dest = tmp / f"{name}.wav"
    concat(parts, dest)
    return dest


def main() -> None:
    MUSIC_DIR.mkdir(parents=True, exist_ok=True)
    EFFECT_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp_s:
        tmp = Path(tmp_s)

        # A minor evening: secret, then warmer, a little weight, home.
        # One 36s phrase — never a four-note hook that nags on loop.
        intro = chord_bed(
            tmp,
            [
                ([110.0, 164.81, 246.94], 0.0, 12.0),  # Am add9 — the closed door
                ([130.81, 164.81, 246.94], 8.0, 11.0),  # Cmaj7 — the lesson
                ([87.31, 130.81, 220.0], 16.5, 11.0),  # F — comfort
                ([82.41, 123.47, 196.0], 24.0, 8.5),  # Em — the stakes
                ([110.0, 164.81], 29.0, 8.0),  # home, so the seam is quiet
            ],
            "intro",
        )
        finish_loop(intro, MUSIC_DIR / "onboard-theme.mp3", 0.007)

        # Look: almost a pad. Speech sits on top.
        look = chord_bed(
            tmp,
            [
                ([110.0, 164.81], 0.0, 18.0),
                ([110.0, 130.81, 246.94], 14.0, 14.0),
                ([164.81, 246.94], 26.0, 11.0),
            ],
            "look",
        )
        finish_loop(look, MUSIC_DIR / "look-theme.mp3", 0.005)

        stings: dict[str, list[tuple[list[float], float, float, bool]]] = {
            "onboard-turn": [([392.0], 0.9, 0.15, False)],
            "onboard-roles": [
                ([261.63], 0.55, 0.04, False),
                ([329.63], 0.55, 0.04, False),
                ([392.0], 0.85, 0.2, False),
            ],
            "onboard-seats": [([174.61, 261.63], 1.3, 0.2, False)],
            "onboard-boards": [
                ([261.63, 392.0], 0.7, 0.12, False),
                ([155.56, 233.08], 0.95, 0.18, True),
            ],
            "onboard-offices": [
                ([196.0, 246.94], 0.55, 0.08, False),
                ([261.63, 329.63], 0.9, 0.18, False),
            ],
            "onboard-vote": [([293.66], 0.45, 0.08, False), ([246.94], 0.85, 0.18, False)],
            "onboard-tracker": [
                ([196.0], 0.35, 0.06, False),
                ([220.0], 0.35, 0.06, False),
                ([246.94], 0.55, 0.15, False),
            ],
            "onboard-chaos": [([65.41, 77.78], 1.5, 0.2, True)],
            "onboard-deck": [
                ([261.63], 0.28, 0.03, False),
                ([329.63], 0.28, 0.03, False),
                ([392.0], 0.28, 0.03, False),
                ([523.25], 0.7, 0.15, False),
            ],
            "onboard-laws": [
                ([196.0], 0.4, 0.08, False),
                ([246.94], 0.4, 0.08, False),
                ([329.63], 0.7, 0.18, False),
            ],
        }

        for name, hits in stings.items():
            raw = phrase_from_notes(tmp, hits, name)
            finish_effect(raw, EFFECT_DIR / f"{name}.mp3")

    print("wrote chord-bed onboard-theme, look-theme, and 10 stings")


if __name__ == "__main__":
    main()
