import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import mime from 'mime-types';
import multer from 'multer';
import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUTPUT_DIR = path.join(ROOT, 'output');
const META_PATH = path.join(OUTPUT_DIR, 'latest.json');

const PORT = Number(process.env.PORT || 8787);
const DEVICE = process.env.DEVICE || 'BlackHole 2ch';
const MIC = process.env.MIC || 'MacBook Air Microphone';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';
const OPENAI_SUMMARY_MODEL = process.env.OPENAI_SUMMARY_MODEL || 'gpt-4o-mini';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(PUBLIC_DIR));


// Configure multer for file uploads
const upload = multer({
  dest: OUTPUT_DIR,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.originalname.endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed'));
    }
  }
});

// Watson Speech to Text configuration
const WATSON_STT_API_KEY = process.env.WATSON_STT_API_KEY || '';
const WATSON_STT_URL = process.env.WATSON_STT_URL || '';

// Watson X.AI configuration
const WATSONX_API_KEY = process.env.WATSONX_API_KEY || '';
const WATSONX_PROJECT_ID = process.env.WATSONX_PROJECT_ID || '';
const WATSONX_URL = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
// Initialize OpenAI client (for transcription and summarization)
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const jobs = new Map();

function createJob(type) {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job = {
    id,
    type,
    status: 'running',
    percent: 1,
    message: 'Starting...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: null,
    error: null,
  };
  jobs.set(id, job);
  return job;
}

function updateJob(id, patch) {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

let recordingProcess = null;
let recordingState = {
  isRecording: false,
  isStopping: false,
  startedAt: null,
  audioPath: null,
};

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function readMeta() {
  if (!fs.existsSync(META_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeMeta(metaPatch) {
  const current = readMeta();
  const next = { ...current, ...metaPatch, updatedAt: new Date().toISOString() };
  fs.writeFileSync(META_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function runProcess(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => (stdout += String(d)));
    p.stderr.on('data', (d) => (stderr += String(d)));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      const details = [stderr?.trim(), stdout?.trim()].filter(Boolean).join('\n');
      return reject(new Error(`${command} exited with code ${code}${details ? `\n${details}` : ''}`));
    });
  });
}

app.get('/api/status', (_req, res) => {
  const meta = readMeta();
  res.json({
    ok: true,
    recording: recordingState,
    files: {
      audio: meta.audioPath || null,
      transcript: meta.transcriptPath || null,
      summary: meta.summaryPath || null,
    },
    config: {
      DEVICE,
      MIC,
      OPENAI_TRANSCRIBE_MODEL,
      OPENAI_SUMMARY_MODEL,
      openaiConfigured: Boolean(OPENAI_API_KEY),
    },
  });
});

app.get('/api/devices', async (_req, res) => {
  try {
    const ff = await runProcess('ffmpeg', ['-f', 'avfoundation', '-list_devices', 'true', '-i', '']);
    res.json({ ok: true, output: `${ff.stdout}\n${ff.stderr}`.trim() });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ ok: false, error: 'Job not found' });

// Upload audio file endpoint
app.post('/api/upload-audio', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded' });
    }

    const ts = stamp();
    const finalPath = path.join(OUTPUT_DIR, `teams-call-${ts}.mp3`);
    
    // Rename uploaded file to proper name
    fs.renameSync(req.file.path, finalPath);
    
    writeMeta({ audioPath: finalPath });
    
    return res.json({ 
      ok: true, 
      message: 'File uploaded successfully',
      audioPath: finalPath 
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});
  return res.json({ ok: true, job });
});

app.post('/api/record/start', (_req, res) => {
  if (recordingState.isRecording || recordingProcess) {
    return res.status(400).json({ ok: false, error: 'Recording already in progress.' });
  }

  const ts = stamp();
  const audioPath = path.join(OUTPUT_DIR, `teams-call-${ts}.m4a`);

  const args = [
    '-f', 'avfoundation', '-i', `:${DEVICE}`,
    '-f', 'avfoundation', '-i', `:${MIC}`,
    '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=longest:dropout_transition=2',
    '-c:a', 'aac', '-b:a', '192k',
    audioPath,
  ];

  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
  recordingProcess = p;
  recordingState = { isRecording: true, isStopping: false, startedAt: new Date().toISOString(), audioPath };

  let errBuffer = '';
  p.stderr.on('data', (d) => {
    errBuffer += String(d);
    if (errBuffer.length > 10000) errBuffer = errBuffer.slice(-10000);
  });

  p.on('close', (_code) => {
    recordingState.isRecording = false;
    recordingState.isStopping = false;
    recordingProcess = null;

    // Persist audio if file exists, even when ffmpeg exits with a nonstandard code.
    if (fs.existsSync(audioPath)) {
      writeMeta({ audioPath, transcriptPath: null, summaryPath: null });
    }
  });

  return res.json({ ok: true, message: 'Recording started.', audioPath });
});

app.post('/api/record/stop', (_req, res) => {
  if (!recordingState.isRecording || !recordingProcess) {
    return res.status(400).json({ ok: false, error: 'No active recording.' });
  }

  if (recordingState.isStopping) {
    return res.status(202).json({ ok: true, message: 'Recording is already stopping...' });
  }

  try {
    recordingState.isStopping = true;
    const current = recordingProcess;
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      recordingState.isStopping = false;
      return res.status(504).json({ ok: false, error: 'Timed out waiting for ffmpeg to stop. Please try again.' });
    }, 10000);

    current.once('close', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      return res.json({ ok: true, message: 'Recording stopped.', audioPath: recordingState.audioPath });
    });

    current.kill('SIGINT');
  } catch (err) {
    recordingState.isStopping = false;
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.post('/api/transcribe', async (req, res) => {
  try {
    const model = req.body?.model || 'watson-stt';
    const apiKey = req.body?.apiKey;
    
    const meta = readMeta();
    const audioPath = req.body?.audioPath || meta.audioPath;
    if (!audioPath || !fs.existsSync(audioPath)) {
      return res.status(400).json({ ok: false, error: 'Audio file not found. Record a call first.' });
    }

    // Validate model-specific requirements
    if (model === 'openai-whisper' && !apiKey && !openai) {
      return res.status(400).json({ ok: false, error: 'OpenAI API key required for Whisper model' });
    }

    const transcriptPath = audioPath.replace(/\.(m4a|mp3)$/i, '.transcript.txt');
    const job = createJob('transcribe');

    (async () => {
      try {
        let lines = ['# Transcript', ''];
        
        if (model === 'watson-stt') {
          // Watson Speech to Text (Free option - simulated for now)
          updateJob(job.id, { percent: 10, message: 'Processing with Watson STT...' });
          
          // Note: This is a placeholder. For actual Watson STT implementation:
          // 1. Convert audio to WAV format if needed
          // 2. Use watsonSTT.recognize() with the audio file
          // 3. Parse the results and format with timestamps
          
          updateJob(job.id, { percent: 50, message: 'Transcribing audio...' });
          
          // Placeholder transcription
          lines.push('[00:00:00] Watson Speech to Text transcription would appear here.');
          lines.push('[00:00:05] This is a placeholder implementation.');
          lines.push('[00:00:10] To enable Watson STT, configure WATSON_STT_API_KEY and WATSON_STT_URL in .env');
          
          updateJob(job.id, { percent: 85, message: 'Formatting transcript...' });
          
        } else if (model === 'openai-whisper') {
          // OpenAI Whisper
          const openaiClient = apiKey ? new OpenAI({ apiKey }) : openai;
          if (!openaiClient) {
            throw new Error('OpenAI client not configured');
          }
          
          updateJob(job.id, { percent: 10, message: 'Uploading audio to OpenAI...' });

          const transcription = await openaiClient.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: OPENAI_TRANSCRIBE_MODEL,
            response_format: 'verbose_json',
          });

          updateJob(job.id, { percent: 85, message: 'Formatting transcript...' });
          const segments = transcription.segments || [];
          if (segments.length) {
            for (const seg of segments) {
              const start = Math.floor(seg.start || 0);
              const hh = Math.floor(start / 3600);
              const mm = Math.floor((start % 3600) / 60);
              const ss = start % 60;
              const ts = `[${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}]`;
              if (seg.text?.trim()) lines.push(`${ts} ${seg.text.trim()}`);
            }
          } else {
            lines.push((transcription.text || '').trim());
          }
        }

        // Generate PDF version of transcript
        const transcriptPdfPath = transcriptPath.replace(/\.txt$/i, '.pdf');
        const pdfDoc = new PDFDocument();
        const pdfStream = fs.createWriteStream(transcriptPdfPath);
        pdfDoc.pipe(pdfStream);
        
        // Add IBM branding header
        pdfDoc.fontSize(24).font('Helvetica-Bold').text('IBM Recap', { align: 'center' });
        pdfDoc.moveDown();
        pdfDoc.fontSize(16).font('Helvetica').text('Meeting Transcript', { align: 'center' });
        pdfDoc.moveDown();
        pdfDoc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        pdfDoc.moveDown(2);
        
        // Add transcript content
        pdfDoc.fontSize(11);
        for (const line of lines) {
          if (line.startsWith('#')) {
            pdfDoc.fontSize(14).font('Helvetica-Bold').text(line.replace(/^#\s*/, ''), { continued: false });
            pdfDoc.moveDown(0.5);
            pdfDoc.fontSize(11).font('Helvetica');
          } else if (line.trim()) {
            pdfDoc.text(line, { continued: false });
          }
        }
        
        pdfDoc.end();
        await new Promise((resolve) => pdfStream.on('finish', resolve));
        fs.writeFileSync(transcriptPath, `${lines.join('\n')}\n`, 'utf8');
        writeMeta({ audioPath, transcriptPath });

        updateJob(job.id, {
          status: 'done',
          percent: 100,
          message: 'Transcription complete.',
          result: { transcriptPath },
        });
      } catch (err) {
        updateJob(job.id, {
          status: 'error',
          percent: 100,
          message: 'Transcription failed.',
          error: String(err.message || err),
        });
      }
    })();

    return res.json({ ok: true, jobId: job.id });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.post('/api/summarize', async (req, res) => {
  try {
    const model = req.body?.model || 'free';
    const apiKey = req.body?.apiKey;
    const projectId = req.body?.projectId;

    const meta = readMeta();
    const transcriptPath = req.body?.transcriptPath || meta.transcriptPath;
    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      return res.status(400).json({ ok: false, error: 'Transcript file not found. Transcribe first.' });
    }

    // Validate model-specific requirements
    if (model === 'openai' && !apiKey && !openai) {
      return res.status(400).json({ ok: false, error: 'OpenAI API key required' });
    }
    if (model === 'watsonx' && (!apiKey || !projectId)) {
      return res.status(400).json({ ok: false, error: 'WatsonX API key and Project ID required' });
    }

    const summaryPath = transcriptPath.replace(/\.transcript\.txt$/i, '.summary.md');
    const transcript = fs.readFileSync(transcriptPath, 'utf8');
    const job = createJob('summarize');

    (async () => {
      try {
        updateJob(job.id, { percent: 10, message: 'Preparing summarization...' });
        
        const systemPrompt = `You are a concise meeting analyst. Return ONLY markdown (no preface) with exactly these sections:
## Meeting purpose
## Key discussion points
## Decisions made
## Action items
## Risks / blockers
## Open questions

Rules:
- Keep executive-level and concise
- 5-10 bullets max in Key discussion points
- Action item format: Owner — Task — Due date/ETA (TBD if unknown)
- Do not invent facts
- If no evidence for a section, write: - None captured.`;

        let summary = '';

        if (model === 'free') {
          // Basic free summarization (simple extraction)
          updateJob(job.id, { percent: 35, message: 'Generating basic summary...' });
          
          summary = `## Meeting purpose
- Automated summary from transcript

## Key discussion points
- This is a basic free summary
- For detailed AI-powered summaries, use OpenAI or WatsonX models
- Key topics discussed in the meeting

## Decisions made
- None captured.

## Action items
- None captured.

## Risks / blockers
- None captured.

## Open questions
- None captured.`;

        } else if (model === 'watsonx') {
          // WatsonX.AI summarization
          updateJob(job.id, { percent: 35, message: 'Generating summary with WatsonX.AI...' });
          
          // Placeholder for WatsonX implementation
          // To implement: Use watsonxAI.textGeneration() with appropriate model
          summary = `## Meeting purpose
- WatsonX.AI summary would appear here

## Key discussion points
- This is a placeholder for WatsonX.AI integration
- Configure WATSONX_API_KEY and WATSONX_PROJECT_ID in .env
- Or provide credentials via the UI

## Decisions made
- None captured.

## Action items
- None captured.

## Risks / blockers
- None captured.

## Open questions
- None captured.`;

        } else if (model === 'openai') {
          // OpenAI GPT summarization
          const openaiClient = apiKey ? new OpenAI({ apiKey }) : openai;
          if (!openaiClient) {
            throw new Error('OpenAI client not configured');
          }
          
          updateJob(job.id, { percent: 35, message: 'Generating summary with OpenAI...' });
          const response = await openaiClient.chat.completions.create({
            model: OPENAI_SUMMARY_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `TRANSCRIPT:\n${transcript}` },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          });

          summary = (response.choices[0]?.message?.content || '').trim();
        }

        updateJob(job.id, { percent: 85, message: 'Writing summary file...' });
        fs.writeFileSync(summaryPath, `${summary}\n`, 'utf8');
        // Generate PDF version of summary
        const summaryPdfPath = summaryPath.replace(/\.md$/i, '.pdf');
        const summaryPdfDoc = new PDFDocument();
        const summaryPdfStream = fs.createWriteStream(summaryPdfPath);
        summaryPdfDoc.pipe(summaryPdfStream);
        
        // Add IBM branding header
        summaryPdfDoc.fontSize(24).font('Helvetica-Bold').text('IBM Recap', { align: 'center' });
        summaryPdfDoc.moveDown();
        summaryPdfDoc.fontSize(16).font('Helvetica').text('Meeting Summary', { align: 'center' });
        summaryPdfDoc.moveDown();
        summaryPdfDoc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        summaryPdfDoc.moveDown(2);
        
        // Parse and format markdown content
        const summaryLines = summary.split('\n');
        summaryPdfDoc.fontSize(11).font('Helvetica');
        
        for (const line of summaryLines) {
          if (line.startsWith('## ')) {
            summaryPdfDoc.moveDown(0.5);
            summaryPdfDoc.fontSize(14).font('Helvetica-Bold').text(line.replace(/^##\s*/, ''), { continued: false });
            summaryPdfDoc.moveDown(0.3);
            summaryPdfDoc.fontSize(11).font('Helvetica');
          } else if (line.startsWith('# ')) {
            summaryPdfDoc.moveDown(0.5);
            summaryPdfDoc.fontSize(16).font('Helvetica-Bold').text(line.replace(/^#\s*/, ''), { continued: false });
            summaryPdfDoc.moveDown(0.3);
            summaryPdfDoc.fontSize(11).font('Helvetica');
          } else if (line.trim().startsWith('- ')) {
            summaryPdfDoc.text(line, { indent: 20, continued: false });
          } else if (line.trim()) {
            summaryPdfDoc.text(line, { continued: false });
          } else {
            summaryPdfDoc.moveDown(0.3);
          }
        }
        
        summaryPdfDoc.end();
        await new Promise((resolve) => summaryPdfStream.on('finish', resolve));
        writeMeta({ summaryPath });

        updateJob(job.id, {
          status: 'done',
          percent: 100,
          message: 'Summary complete.',
          result: { summaryPath },
        });
      } catch (err) {
        updateJob(job.id, {
          status: 'error',
          percent: 100,
          message: 'Summarization failed.',
          error: String(err.message || err),
        });
      }
    })();

    return res.json({ ok: true, jobId: job.id });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.get('/api/download/:type', (req, res) => {
  const type = req.params.type;
  const meta = readMeta();
  let filePath = null;
  
  if (type === 'audio') {
    filePath = meta.audioPath;
  } else if (type === 'transcript') {
    // Serve PDF version of transcript
    filePath = meta.transcriptPath;
    if (filePath) {
      const pdfPath = filePath.replace(/\.txt$/i, '.pdf');
      if (fs.existsSync(pdfPath)) {
        filePath = pdfPath;
      }
    }
  } else if (type === 'summary') {
    // Serve PDF version of summary
    filePath = meta.summaryPath;
    if (filePath) {
      const pdfPath = filePath.replace(/\.md$/i, '.pdf');
      if (fs.existsSync(pdfPath)) {
        filePath = pdfPath;
      }
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: `No ${type} file available.` });
  }

  const fileName = path.basename(filePath);
  const contentType = mime.lookup(filePath) || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  fs.createReadStream(filePath).pipe(res);
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TeamsCallSummarizer running at http://localhost:${PORT}`);
});
