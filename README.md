# AcestarAI

AcestarAI is a meeting intelligence workspace for professionals who want to turn meetings into structured, searchable knowledge.

React + Node.js web app to:
1. Capture meeting recordings or notes
2. Transcribe audio using AI
3. Summarize transcripts into structured outputs
4. Search meeting history with Ask Acestar
5. Download audio, transcript, and summary files as PDFs

## Requirements (macOS)

- Homebrew
- FFmpeg
- BlackHole (virtual loopback)
- Node.js 18+
- OpenAI API key

Install:

```bash
brew install ffmpeg blackhole-2ch
```

## Setup

```bash
cd TeamsCallSummarizer
cp .env.example .env
# edit .env and set your OpenAI API key:
#   OPENAI_API_KEY=sk-...
npm install
npm run dev
```

Open: `http://localhost:8787`

## AI Configuration

### Get Your API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key and add to `.env`: `OPENAI_API_KEY=sk-...`
4. Add credits to your account at https://platform.openai.com/account/billing

### Cost Estimate

For a typical 30-minute meeting:
- **Transcription**: ~$0.18
- **Summarization**: ~$0.01-0.02
- **Total**: ~$0.20 per meeting

Very affordable for professional use!

## Audio routing (important)

1. Open **Audio MIDI Setup**
2. Create a **Multi-Output Device** including:
   - Your speakers/headphones
   - `BlackHole 2ch`
3. Set Teams/system output to that multi-output device

This allows hearing the call while BlackHole gets a clean feed.

## Device names

If recording fails, find exact names:

```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

Then edit `.env`:

```env
DEVICE=BlackHole 2ch
MIC=MacBook Pro Microphone
```

## API endpoints

- `GET /api/status`
- `POST /api/record/start`
- `POST /api/record/stop`
- `POST /api/transcribe`
- `POST /api/summarize`
- `GET /api/download/audio|transcript|summary`

## Output files

Saved under `output/`:
- `teams-call-*.m4a` - Audio recording
- `teams-call-*.transcript.pdf` - Timestamped transcript (PDF)
- `teams-call-*.summary.pdf` - Meeting summary (PDF)

Text versions (`.txt` and `.md`) are also saved for reference.

## Notes

- Built for public use by working professionals and teams
- Respect company policy and local consent laws for recording
- High-quality AI transcription with timestamps
- Structured meeting summaries with action items
- All files exported as professional PDFs with AcestarAI branding
- No local GPU needed - all processing via cloud API
# Test
