#!/usr/bin/env python3
"""Turns a raw voice take into a site clip: levels it, lays a music bed quietly under it, writes <name>.mp3 and <name>.json (waveform bars).
    python3 tools/mix_vo.py assets/audio/_raw/kayla-aesthetic_raw.mp3 kayla-aesthetic [bed start seconds] [bed file] [lead-in ms] [bed loudness, LUFS]
The bed is levelled first, so any track sits at the same distance under the voice. Each clip can have its own track; the default is assets/audio/_raw/bed.mp3."""
import json, os, struct, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw, name = sys.argv[1], sys.argv[2]
bed_at = sys.argv[3] if len(sys.argv) > 3 else "0"
BED = sys.argv[4] if len(sys.argv) > 4 else os.path.join(ROOT, "assets", "audio", "_raw", "bed.mp3")
lead = int(sys.argv[5]) if len(sys.argv) > 5 else 600
bed_lufs = float(sys.argv[6]) if len(sys.argv) > 6 else -31
out = os.path.join(ROOT, "assets", "audio", name + ".mp3")
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", raw], capture_output=True, text=True).stdout)
total = dur + lead / 1000 + 2.4
fc = ("[0:a]silenceremove=start_periods=1:start_threshold=-50dB,loudnorm=I=-16:TP=-1.5:LRA=11,adelay=%d|%d,apad=pad_dur=2.8[v];"
      "[1:a]loudnorm=I=%.1f:TP=-6:LRA=7,afade=t=in:d=0.5[b];[v][b]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=%.2f:d=2.2,alimiter=limit=0.9[o]" % (lead, lead, bed_lufs, total - 2.2))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-ss", bed_at, "-i", BED, "-filter_complex", fc, "-map", "[o]", "-t", "%.2f" % total, "-ar", "44100", "-ac", "2", "-b:a", "128k", out], check=True)
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", raw, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], capture_output=True).stdout
n = len(pcm) // 2; s = struct.unpack("<%dh" % n, pcm); bars = 64; step = max(1, n // bars)
pk = [(sum(x * x for x in s[i * step:(i + 1) * step]) / step) ** .5 for i in range(bars)]
m = max(pk) or 1
d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], capture_output=True, text=True).stdout)
json.dump({"duration": round(d, 2), "peaks": [round(max(.12, (x / m) ** .7), 3) for x in pk]}, open(out[:-4] + ".json", "w"))
print(out, round(d, 2), "s", os.path.getsize(out) // 1024, "KB")
