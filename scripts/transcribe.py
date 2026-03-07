#!/usr/bin/env python3
import sys

if len(sys.argv) < 4:
    print("Usage: transcribe.py <audio_path> <transcript_path> <model>")
    sys.exit(1)

audio_path = sys.argv[1]
transcript_path = sys.argv[2]
model_name = sys.argv[3]

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("faster-whisper not installed. Run: python3 -m pip install --upgrade faster-whisper")
    sys.exit(2)

model = WhisperModel(model_name, device="cpu", compute_type="int8")
segments, info = model.transcribe(audio_path, vad_filter=True)

with open(transcript_path, "w", encoding="utf-8") as f:
    f.write("# Transcript\n")
    f.write(f"# language={info.language} prob={info.language_probability:.3f}\n\n")
    for seg in segments:
      start = int(seg.start)
      hh = start // 3600
      mm = (start % 3600) // 60
      ss = start % 60
      text = seg.text.strip()
      if text:
          f.write(f"[{hh:02d}:{mm:02d}:{ss:02d}] {text}\n")

print(transcript_path)
