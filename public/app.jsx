const { useEffect, useState } = React;

function App() {
  const [currentPage, setCurrentPage] = useState('consent'); // consent, onboarding, main
  const [consentGiven, setConsentGiven] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  
  // Main app state
  const [status, setStatus] = useState('Loading...');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [files, setFiles] = useState({ audio: null, transcript: null, summary: null });
  const [log, setLog] = useState('Ready.');
  const [config, setConfig] = useState({});
  const [transcribeJob, setTranscribeJob] = useState(null);
  const [summarizeJob, setSummarizeJob] = useState(null);
  
  // Model selection state
  const [transcriptionModel, setTranscriptionModel] = useState('watson-stt'); // watson-stt, openai-whisper
  const [summarizationModel, setSummarizationModel] = useState('free'); // free, watsonx, openai
  const [openaiKey, setOpenaiKey] = useState('');
  const [watsonxApiKey, setWatsonxApiKey] = useState('');
  const [watsonxProjectId, setWatsonxProjectId] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyType, setApiKeyType] = useState(''); // 'openai' or 'watsonx'
  
  // API key saved state
  const [openaiKeySaved, setOpenaiKeySaved] = useState(false);
  const [watsonxKeySaved, setWatsonxKeySaved] = useState(false);

  const refresh = async () => {
    const r = await fetch('/api/status');
    const j = await r.json();
    const isRec = !!j.recording?.isRecording;
    const isStopping = !!j.recording?.isStopping;
    setRecording(isRec);
    setStopping(isStopping);
    setFiles(j.files || {});
    setConfig(j.config || {});
    setStatus(isStopping ? 'Stopping recording...' : isRec ? 'Recording in progress' : 'Idle');
  };

  useEffect(() => { 
    if (currentPage === 'main') {
      refresh(); 
    }
  }, [currentPage]);

  const call = async (url, method = 'POST', body) => {
    try {
      setBusy(true);
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Request failed');
      setLog(JSON.stringify(j, null, 2));
      return j;
    } catch (e) {
      setLog(`Error: ${e.message}`);
      throw e;
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const pollJob = async (jobId, setter) => {
    let done = false;
    while (!done) {
      const r = await fetch(`/api/jobs/${jobId}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Job polling failed');
      setter(j.job);
      if (j.job.status === 'done' || j.job.status === 'error') done = true;
      if (!done) await new Promise((resolve) => setTimeout(resolve, 600));
    }
    await refresh();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('audio', file);
    
    try {
      setBusy(true);
      const r = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Upload failed');
      setLog(`File uploaded: ${file.name}`);
      await refresh();
    } catch (e) {
      setLog(`Upload error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleTranscribe = async () => {
    if (transcriptionModel === 'openai-whisper' && !openaiKey) {
      setApiKeyType('openai');
      setShowApiKeyModal(true);
      return;
    }
    
    const j = await call('/api/transcribe', 'POST', { 
      model: transcriptionModel,
      apiKey: transcriptionModel === 'openai-whisper' ? openaiKey : undefined
    });
    setTranscribeJob({ status: 'running', percent: 1, message: 'Starting...' });
    await pollJob(j.jobId, setTranscribeJob);
  };

  const handleSummarize = async () => {
    if (summarizationModel === 'openai' && !openaiKey) {
      setApiKeyType('openai');
      setShowApiKeyModal(true);
      return;
    }
    if (summarizationModel === 'watsonx' && (!watsonxApiKey || !watsonxProjectId)) {
      setApiKeyType('watsonx');
      setShowApiKeyModal(true);
      return;
    }
    
    const j = await call('/api/summarize', 'POST', { 
      model: summarizationModel,
      apiKey: summarizationModel === 'openai' ? openaiKey : watsonxApiKey,
      projectId: summarizationModel === 'watsonx' ? watsonxProjectId : undefined
    });
    setSummarizeJob({ status: 'running', percent: 1, message: 'Starting...' });
    await pollJob(j.jobId, setSummarizeJob);
  };

  const getStatusClass = () => {
    if (stopping) return 'status';
    if (recording) return 'status recording';
    return 'status idle';
  };

  // Consent Page
  if (currentPage === 'consent') {
    return (
      <div className="container">
        <div className="header">
          <h1>
            <span className="ibm-logo">IBM</span>
            <span className="app-name">Recap</span>
          </h1>
        </div>
        <div className="consent-page">
          <div className="consent-card">
            <h2>Recording Consent & AI Analysis Agreement</h2>
            <div className="consent-content">
              <p>Before using IBM Recap, please confirm the following:</p>
              
              <div className="consent-section">
                <h3>Recording Consent</h3>
                <ul>
                  <li>You have obtained consent from all meeting participants to record the session</li>
                  <li>All parties are aware that the meeting will be recorded</li>
                  <li>Recording complies with your organization's policies and local laws</li>
                </ul>
              </div>

              <div className="consent-section">
                <h3>AI Analysis Agreement</h3>
                <ul>
                  <li>Meeting audio will be transcribed using AI services</li>
                  <li>Transcripts will be analyzed to generate meeting summaries</li>
                  <li>Data may be processed by third-party AI providers (OpenAI, IBM Watson)</li>
                  <li>You are responsible for ensuring sensitive information is handled appropriately</li>
                </ul>
              </div>

              <div className="consent-section">
                <h3>Data Privacy</h3>
                <ul>
                  <li>All recordings and transcripts are stored locally on your device</li>
                  <li>Audio data is sent to AI services only for transcription/summarization</li>
                  <li>You are responsible for managing and securing generated files</li>
                </ul>
              </div>

              <div className="consent-checkbox">
                <label>
                  <input 
                    type="checkbox" 
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                  />
                  <span>I confirm that I have obtained consent from all participants and agree to the terms above</span>
                </label>
              </div>

              <button 
                className="primary"
                disabled={!consentGiven}
                onClick={() => setCurrentPage('onboarding')}
              >
                Continue to Setup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Onboarding Page
  if (currentPage === 'onboarding') {
    return (
      <div className="container">
        <div className="header">
          <h1>
            <span className="ibm-logo">IBM</span>
            <span className="app-name">Recap</span>
          </h1>
        </div>
        <div className="onboarding-page">
          <div className="onboarding-card">
            <h2>Setup Instructions</h2>
            <div className="onboarding-content">
              <p className="intro">Before using IBM Recap, please complete the following prerequisites:</p>

              <div className="setup-step">
                <div className="step-content">
                  <h3>1) Install Required Software</h3>
                  <ul>
                    <li><strong>FFmpeg:</strong> Audio processing tool</li>
                    <li><strong>BlackHole 2ch:</strong> Virtual audio loopback device</li>
                  </ul>
                  <code>brew install ffmpeg blackhole-2ch</code>
                </div>
              </div>

              <div className="setup-step">
                <div className="step-content">
                  <h3>2) Configure Audio Routing</h3>
                  <ol>
                    <li>Open <strong>Audio MIDI Setup</strong> (Applications → Utilities)</li>
                    <li>Click the <strong>+</strong> button and select <strong>"Create Multi-Output Device"</strong></li>
                    <li>Check both:
                      <ul>
                        <li>Your speakers/headphones (to hear audio)</li>
                        <li><strong>BlackHole 2ch</strong> (to capture audio)</li>
                      </ul>
                    </li>
                    <li>Set your Teams/conferencing app to use this Multi-Output Device</li>
                  </ol>
                </div>
              </div>

              <div className="setup-step">
                <div className="step-content">
                  <h3>3) Verify Device Names</h3>
                  <p>If recording fails, check your exact device names:</p>
                  <code>ffmpeg -f avfoundation -list_devices true -i ""</code>
                  <p>Update device names in your <code>.env</code> file if needed.</p>
                </div>
              </div>

              <div className="setup-step">
                <div className="step-content">
                  <h3>4) API Keys (Optional)</h3>
                  <p>For paid AI models, you'll need:</p>
                  <ul>
                    <li><strong>OpenAI API Key:</strong> For Whisper transcription and GPT summarization</li>
                    <li><strong>IBM watsonx.ai:</strong> API key and Project ID for watsonx models</li>
                  </ul>
                  <p>Free options are available and don't require API keys.</p>
                </div>
              </div>

              <div className="completion-checkbox">
                <label>
                  <input 
                    type="checkbox" 
                    checked={onboardingComplete}
                    onChange={(e) => setOnboardingComplete(e.target.checked)}
                  />
                  <span>I have completed all prerequisites and I'm ready to use IBM Recap</span>
                </label>
              </div>

              <div className="button-group">
                <button 
                  className="secondary"
                  onClick={() => setCurrentPage('consent')}
                >
                  ← Back
                </button>
                <button 
                  className="primary"
                  disabled={!onboardingComplete}
                  onClick={() => setCurrentPage('main')}
                >
                  Start Using IBM Recap →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main App Page
  return (
    <div className="container">
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{apiKeyType === 'openai' ? 'OpenAI API Key Required' : 'IBM watsonx.ai Credentials Required'}</h3>
            {apiKeyType === 'openai' ? (
              <div className="modal-body">
                <p>Enter your OpenAI API key to use this model:</p>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="api-key-input"
                />
                <p className="help-text">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a></p>
              </div>
            ) : (
              <div className="modal-body">
                <p>Enter your IBM watsonx.ai credentials:</p>
                <input
                  type="password"
                  placeholder="API Key"
                  value={watsonxApiKey}
                  onChange={(e) => setWatsonxApiKey(e.target.value)}
                  className="api-key-input"
                />
                <input
                  type="text"
                  placeholder="Project ID"
                  value={watsonxProjectId}
                  onChange={(e) => setWatsonxProjectId(e.target.value)}
                  className="api-key-input"
                />
                <p className="help-text">Get credentials from <a href="https://cloud.ibm.com/watsonx" target="_blank">IBM watsonx.ai</a></p>
              </div>
            )}
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowApiKeyModal(false)}>Cancel</button>
              <button className="primary" onClick={() => setShowApiKeyModal(false)}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="header">
        <h1>
          <span className="ibm-logo">IBM</span>
          <span className="app-name">Recap</span>
        </h1>
      </div>

      <div className="main-content">
        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="sidebar-section">
            <h3>Status</h3>
            <div className={getStatusClass()}>
              {status}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Transcription Model</h3>
            <select
              value={transcriptionModel}
              onChange={(e) => setTranscriptionModel(e.target.value)}
              className="model-select"
            >
              <option value="watson-stt">Watson STT (Free)</option>
              <option value="openai-whisper">OpenAI Whisper (Paid)</option>
            </select>
            {transcriptionModel === 'openai-whisper' && !openaiKeySaved && (
              <div className="api-key-inline">
                <label className="api-label">OpenAI API Key</label>
                <div className="api-key-input-group">
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="api-key-input-inline"
                  />
                  <button
                    className="save-key-btn"
                    onClick={() => setOpenaiKeySaved(true)}
                    disabled={!openaiKey}
                  >
                    Save
                  </button>
                </div>
                <a href="https://platform.openai.com/api-keys" target="_blank" className="api-link-help">
                  Don't have a key? Get one here
                </a>
              </div>
            )}
            {transcriptionModel === 'openai-whisper' && openaiKeySaved && (
              <div className="api-key-saved">
                <span className="saved-indicator">✓ API Key Saved</span>
                <button className="edit-key-btn" onClick={() => setOpenaiKeySaved(false)}>
                  Edit
                </button>
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <h3>Summarization Model</h3>
            <select
              value={summarizationModel}
              onChange={(e) => setSummarizationModel(e.target.value)}
              className="model-select"
            >
              <option value="free">Basic Summary (Free)</option>
              <option value="watsonx">IBM watsonx.ai (Paid)</option>
              <option value="openai">OpenAI GPT (Paid)</option>
            </select>
            {summarizationModel === 'openai' && !openaiKeySaved && (
              <div className="api-key-inline">
                <label className="api-label">OpenAI API Key</label>
                <div className="api-key-input-group">
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="api-key-input-inline"
                  />
                  <button
                    className="save-key-btn"
                    onClick={() => setOpenaiKeySaved(true)}
                    disabled={!openaiKey}
                  >
                    Save
                  </button>
                </div>
                <a href="https://platform.openai.com/api-keys" target="_blank" className="api-link-help">
                  Don't have a key? Get one here
                </a>
              </div>
            )}
            {summarizationModel === 'openai' && openaiKeySaved && (
              <div className="api-key-saved">
                <span className="saved-indicator">✓ API Key Saved</span>
                <button className="edit-key-btn" onClick={() => setOpenaiKeySaved(false)}>
                  Edit
                </button>
              </div>
            )}
            {summarizationModel === 'watsonx' && !watsonxKeySaved && (
              <div className="api-key-inline">
                <label className="api-label">WatsonX API Key</label>
                <div className="api-key-input-group">
                  <input
                    type="password"
                    placeholder="API Key"
                    value={watsonxApiKey}
                    onChange={(e) => setWatsonxApiKey(e.target.value)}
                    className="api-key-input-inline"
                  />
                </div>
                <label className="api-label">Project ID</label>
                <div className="api-key-input-group">
                  <input
                    type="text"
                    placeholder="Project ID"
                    value={watsonxProjectId}
                    onChange={(e) => setWatsonxProjectId(e.target.value)}
                    className="api-key-input-inline"
                  />
                  <button
                    className="save-key-btn"
                    onClick={() => setWatsonxKeySaved(true)}
                    disabled={!watsonxApiKey || !watsonxProjectId}
                  >
                    Save
                  </button>
                </div>
                <a href="https://cloud.ibm.com/watsonx" target="_blank" className="api-link-help">
                  Need credentials? Get them here
                </a>
              </div>
            )}
            {summarizationModel === 'watsonx' && watsonxKeySaved && (
              <div className="api-key-saved">
                <span className="saved-indicator">✓ Credentials Saved</span>
                <button className="edit-key-btn" onClick={() => setWatsonxKeySaved(false)}>
                  Edit
                </button>
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <h3>Available Files</h3>
            <div className="info-row">
              <span className="info-label">Audio</span>
              <span className="info-value">{files.audio ? '✓' : '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Transcript</span>
              <span className="info-value">{files.transcript ? '✓' : '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Summary</span>
              <span className="info-value">{files.summary ? '✓' : '—'}</span>
            </div>
          </div>
        </div>

        {/* Main Panel */}
        <div className="main-panel">
          <div className="panel-header">
            <h2>Meeting Recording & Analysis</h2>
            <p className="panel-subtitle">Record, upload, transcribe, and summarize your meetings</p>
          </div>

          <div className="panel-content">
            {/* Recording Controls */}
            <div className="card">
              <h3>Audio Input</h3>
              <div className="button-group">
                <button
                  className="secondary"
                  onClick={() => document.getElementById('mp3-upload').click()}
                  disabled={busy || recording}
                >
                  📁 Upload MP3
                </button>
                <input
                  id="mp3-upload"
                  type="file"
                  accept=".mp3,audio/mpeg"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  className="primary"
                  disabled={busy || recording || stopping}
                  onClick={() => call('/api/record/start')}
                >
                  ● Start Recording
                </button>
                <button
                  className="danger"
                  disabled={busy || !recording || stopping}
                  onClick={() => call('/api/record/stop')}
                >
                  ■ Stop Recording
                </button>
              </div>
            </div>

            {/* Processing Controls */}
            <div className="card">
              <h3>AI Processing</h3>
              <div className="button-group">
                <button
                  className="primary"
                  disabled={busy || !files.audio || recording || stopping || (transcribeJob && transcribeJob.status === 'running')}
                  onClick={handleTranscribe}
                >
                  📝 Transcribe Audio
                </button>
                <button
                  className="primary"
                  disabled={busy || !files.transcript || recording || stopping || (summarizeJob && summarizeJob.status === 'running')}
                  onClick={handleSummarize}
                >
                  📊 Summarize Transcript
                </button>
              </div>

              {/* Progress Indicators */}
              {(transcribeJob || summarizeJob) && (
                <div className="progress-section">
                  {transcribeJob && (
                    <div className="progress-item">
                      <div className="progress-header">
                        <span className="progress-label">Transcription</span>
                        <span className="progress-percent">{transcribeJob.percent || 0}%</span>
                      </div>
                      <div className="progress-message">{transcribeJob.message}</div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${transcribeJob.percent || 0}%` }} />
                      </div>
                    </div>
                  )}
                  {summarizeJob && (
                    <div className="progress-item">
                      <div className="progress-header">
                        <span className="progress-label">Summarization</span>
                        <span className="progress-percent">{summarizeJob.percent || 0}%</span>
                      </div>
                      <div className="progress-message">{summarizeJob.message}</div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${summarizeJob.percent || 0}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Download Section */}
            <div className="card">
              <h3>Download Files</h3>
              <div className="download-grid">
                <button 
                  className="secondary" 
                  disabled={!files.audio} 
                  onClick={() => window.open('/api/download/audio', '_blank')}
                >
                  🎵 Audio (MP3)
                </button>
                <button 
                  className="secondary" 
                  disabled={!files.transcript} 
                  onClick={() => window.open('/api/download/transcript', '_blank')}
                >
                  📄 Transcript PDF
                </button>
                <button 
                  className="secondary" 
                  disabled={!files.summary} 
                  onClick={() => window.open('/api/download/summary', '_blank')}
                >
                  📋 Summary PDF
                </button>
                <button 
                  className="secondary" 
                  onClick={refresh}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Warning Message */}
            <div className="warning">
              ⚠️ If recording fails, check your BlackHole/Multi-Output routing and device names in Audio MIDI Setup.
            </div>

            {/* Console Log */}
            <div className="log-section">
              <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Console Output</h3>
              <div className="log">{log}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// Made with Bob
