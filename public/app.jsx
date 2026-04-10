const { useEffect, useState } = React;

function MainApp() {
  // Get auth context
  const { user, logout, token, updateAccount } = useAuth();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('home');
  
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [homeDateFilter, setHomeDateFilter] = useState('all');
  
  const [accountFiles, setAccountFiles] = useState([]);
  const [accountMeetings, setAccountMeetings] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [accountProfile, setAccountProfile] = useState(null);
  const [storageUsage, setStorageUsage] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [selectedMeetingContext, setSelectedMeetingContext] = useState(null);
  const [backendModels, setBackendModels] = useState(null);
  const [pendingCompletionMeetingIds, setPendingCompletionMeetingIds] = useState([]);
  const [browserNotificationsSupported, setBrowserNotificationsSupported] = useState(false);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState('default');
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(() => {
    return localStorage.getItem('browser_notifications_enabled') === 'true';
  });
  const autoSyncedTimeZoneRef = React.useRef(false);
  const pendingCompletionBaselineRef = React.useRef(null);
  
  // Main app state (from original)
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [files, setFiles] = useState({ meetingId: null, audio: null, transcript: null, summary: null });
  const [transcribeJob, setTranscribeJob] = useState(null);
  const [summarizeJob, setSummarizeJob] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Transcription options
  const [transcriptType, setTranscriptType] = useState('standard');
  const [transcriptOptions, setTranscriptOptions] = useState({
    timestamps: true,
    speakerDiarization: false,
    pauses: false,
    redactWords: null
  });
  
  // Summarization options
  const [summaryType, setSummaryType] = useState('standard');
  const [structuredSections, setStructuredSections] = useState({
    attendees: true,
    purpose: true,
    actionItems: true,
    risks: true,
    questions: true
  });

  useEffect(() => {
    if (!accountProfile) return;

    setTranscriptType(accountProfile.defaultTranscriptType || 'standard');
    setTranscriptOptions((current) => ({
      ...current,
      speakerDiarization: Boolean(accountProfile.defaultSpeakerDiarization)
    }));
    setSummaryType(accountProfile.defaultSummaryType || 'standard');
  }, [
    accountProfile?.defaultTranscriptType,
    accountProfile?.defaultSpeakerDiarization,
    accountProfile?.defaultSummaryType
  ]);

  // Apply dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);
  
  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  const refresh = async () => {
    if (token) {
      setHistoryLoading(true);
      setAccountLoading(true);
    }

    try {
      const requests = [
        fetch(`/api/status?t=${Date.now()}`)
      ];

      if (token) {
        requests.push(fetch('/api/meetings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }));
        requests.push(fetch('/api/files', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }));
        requests.push(fetch('/api/auth/account', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }));
        requests.push(fetch('/api/meetings/pending-completion', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }));
      }

      const responses = await Promise.all(requests);
      const statusResponse = responses[0];
      const statusJson = await statusResponse.json();

      const isRec = !!statusJson.recording?.isRecording;
      const isStopping = !!statusJson.recording?.isStopping;
      setRecording(isRec);
      setStopping(isStopping);
      setBackendModels(statusJson.models || null);

      const normalizedFiles = {
        meetingId: statusJson.files?.meetingId || null,
        audio: statusJson.files?.audio || null,
        originalFilename: statusJson.files?.originalFilename || null,
        transcript: statusJson.files?.transcript || null,
        summary: statusJson.files?.summary || null
      };
      setFiles(normalizedFiles);

      if (token && responses[1]) {
        const meetingsResponse = responses[1];
        const meetingsJson = await meetingsResponse.json();
        if (meetingsResponse.ok && meetingsJson.ok) {
          setAccountMeetings(meetingsJson.meetings || []);
        } else {
          console.error('Failed to load account meetings:', meetingsJson.error);
          setAccountMeetings([]);
        }
      }

      if (token && responses[2]) {
        const filesResponse = responses[2];
        const filesJson = await filesResponse.json();
        if (filesResponse.ok && filesJson.ok) {
          setAccountFiles(filesJson.files || []);
        } else {
          console.error('Failed to load account file history:', filesJson.error);
          setAccountFiles([]);
        }
      }

      if (token && responses[3]) {
        const accountResponse = responses[3];
        const accountJson = await accountResponse.json();
        if (accountResponse.ok) {
          setAccountProfile(accountJson.user || null);
          setStorageUsage(accountJson.storage || null);
        } else {
          console.error('Failed to load account profile:', accountJson.error);
          setAccountProfile(null);
          setStorageUsage(null);
        }
      }

      if (token && responses[4]) {
        const pendingResponse = responses[4];
        const pendingJson = await pendingResponse.json();
        if (pendingResponse.ok && pendingJson.ok) {
          setPendingCompletionMeetingIds(pendingJson.meetingIds || []);
        } else {
          console.error('Failed to load pending meeting completions:', pendingJson.error);
          setPendingCompletionMeetingIds([]);
        }
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setHistoryLoading(false);
      setAccountLoading(false);
    }
  };
  
  useEffect(() => {
    refresh();
  }, [token]);

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'Notification' in window;
    setBrowserNotificationsSupported(supported);
    setBrowserNotificationPermission(supported ? Notification.permission : 'unsupported');

    const syncPermission = () => {
      if (!supported) return;
      setBrowserNotificationPermission(Notification.permission);
      if (Notification.permission !== 'granted') {
        setBrowserNotificationsEnabled(false);
        localStorage.removeItem('browser_notifications_enabled');
      }
    };

    document.addEventListener('visibilitychange', syncPermission);
    window.addEventListener('focus', syncPermission);

    return () => {
      document.removeEventListener('visibilitychange', syncPermission);
      window.removeEventListener('focus', syncPermission);
    };
  }, []);

  useEffect(() => {
    if (!token || !accountProfile || autoSyncedTimeZoneRef.current) return;

    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    if (!browserTimeZone) return;
    if (accountProfile.timeZone && accountProfile.timeZone !== 'UTC' && accountProfile.timeZone === browserTimeZone) {
      autoSyncedTimeZoneRef.current = true;
      return;
    }
    if (accountProfile.timeZone && accountProfile.timeZone !== 'UTC' && accountProfile.timeZone !== browserTimeZone) {
      autoSyncedTimeZoneRef.current = true;
      return;
    }

    autoSyncedTimeZoneRef.current = true;
    updateAccount({ timeZone: browserTimeZone }).catch((error) => {
      console.error('Failed to sync browser timezone:', error);
      autoSyncedTimeZoneRef.current = false;
    });
  }, [token, accountProfile?.timeZone]);

  useEffect(() => {
    if (!token) {
      pendingCompletionBaselineRef.current = null;
      return undefined;
    }

    const pollPendingCompletion = async () => {
      try {
        const response = await fetch('/api/meetings/pending-completion', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'Failed to evaluate pending meeting completions.');
        }
        setPendingCompletionMeetingIds(data.meetingIds || []);
      } catch (error) {
        console.error('Failed to poll pending meeting completions:', error);
      }
    };

    const intervalId = window.setInterval(pollPendingCompletion, 60 * 1000);
    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        pollPendingCompletion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [token]);

  const historyEntries = buildHistoryEntries(accountFiles);
  const meetingEntries = buildMeetingEntries(accountMeetings);
  const activeMeetingContext = meetingEntries.find((meeting) => meeting.id === files.meetingId) || selectedMeetingContext || null;
  const completedMeetingCount = meetingEntries.filter((meeting) => !meeting.archivedAt && meeting.lifecycleStatus === 'completed').length;
  const completedRecordingStats = calculateCompletedRecordingStats(accountMeetings);
  const averageTurnaroundLabel = formatAverageTurnaround(completedRecordingStats.averageMs);
  const transcriptAccuracy = calculateTranscriptAccuracy(historyEntries, backendModels);
  const searchableRecordCount = historyEntries.filter((entry) => ['audio', 'transcript', 'summary'].includes(entry.file_type)).length;
  const accuracyDescription = buildTranscriptAccuracyDescription(historyEntries, backendModels);

  useEffect(() => {
    if (!browserNotificationsSupported) return;
    if (!browserNotificationsEnabled || browserNotificationPermission !== 'granted') return;

    const currentPendingIds = Array.isArray(pendingCompletionMeetingIds) ? pendingCompletionMeetingIds : [];
    const baselineIds = pendingCompletionBaselineRef.current;

    if (!baselineIds) {
      pendingCompletionBaselineRef.current = [...currentPendingIds];
      return;
    }

    const baselineSet = new Set(baselineIds);
    const newlyPendingIds = currentPendingIds.filter((meetingId) => !baselineSet.has(meetingId));

    newlyPendingIds.forEach((meetingId) => {
      const meeting = meetingEntries.find((entry) => entry.id === meetingId);
      const title = meeting?.filename || 'Scheduled meeting needs follow-up';
      const timeLabel = formatMeetingTimeRange(
        meeting?.meetingStartAt,
        meeting?.meetingEndAt,
        meeting?.uploadedAt
      );
      const notification = new Notification('Meeting marked incomplete', {
        body: `${title}${timeLabel ? ` • ${timeLabel}` : ''}. Add a recording, written notes, or a voice note in AcestarAI.`,
        tag: `meeting-incomplete-${meetingId}`,
        renotify: false
      });

      notification.onclick = () => {
        window.focus();
        setActiveTab('meetings');
        notification.close();
      };
    });

    pendingCompletionBaselineRef.current = [...currentPendingIds];
  }, [
    pendingCompletionMeetingIds,
    meetingEntries,
    browserNotificationsEnabled,
    browserNotificationPermission,
    browserNotificationsSupported
  ]);

  const handleEnableBrowserNotifications = async () => {
    if (!browserNotificationsSupported) {
      alert('Browser notifications are not supported in this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserNotificationPermission(permission);
      if (permission === 'granted') {
        localStorage.setItem('browser_notifications_enabled', 'true');
        setBrowserNotificationsEnabled(true);
        new Notification('Browser notifications enabled', {
          body: 'AcestarAI will notify you after scheduled meetings end and still need a recording or notes.'
        });
      } else {
        localStorage.removeItem('browser_notifications_enabled');
        setBrowserNotificationsEnabled(false);
      }
    } catch (error) {
      console.error('Failed to request browser notification permission:', error);
      alert('Unable to enable browser notifications in this browser.');
    }
  };

  const handleDisableBrowserNotifications = () => {
    localStorage.removeItem('browser_notifications_enabled');
    setBrowserNotificationsEnabled(false);
  };

  // Filter files based on search
  const filteredMeetings = meetingEntries.filter(file => {
    const query = searchQuery.toLowerCase().trim();
    const searchableFields = [
      file.filename,
      file.displayDate,
      file.statusLabel,
      file.fileTypeLabel,
      ...(file.relatedOutputs || []),
      ...(file.infoChips || [])
    ].filter(Boolean).join(' ').toLowerCase();

    const matchesSearch = !query || searchableFields.includes(query);
    return matchesSearch && matchesDateFilter(file.uploadedAt, homeDateFilter);
  });

  // Tab navigation
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'meetings', label: 'Meetings', icon: '📅' },
    { id: 'upload', label: 'Upload', icon: '📤' },
    { id: 'transcribe', label: 'Transcribe', icon: '📝' },
    { id: 'summarize', label: 'Summarize', icon: '📊' },
    { id: 'analytics', label: 'Ask Acestar', icon: '💬' }
  ];

  // Ref for scrolling to home dashboard
  const homeDashboardRef = React.useRef(null);
  const tabNavigationRef = React.useRef(null);
  
  const scrollToHomeDashboard = () => {
    setActiveTab('home');
    setTimeout(() => {
      homeDashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };
  
  const scrollToTab = (tabName) => {
    setActiveTab(tabName);
    setTimeout(() => {
      tabNavigationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo-container">
            <img className="brand-logo-image" src="/assets/acestar-logo" alt="Acestar AI logo" />
            <div className="brand-wordmark app-wordmark">
              <span>Acestar AI</span>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <button className="theme-toggle-btn" onClick={toggleDarkMode}>
            {darkMode ? '☀️' : '🌙'} {darkMode ? 'Dark' : 'Light'} mode
          </button>
          <div className="user-menu">
            <button className="user-button" onClick={() => setShowUserMenu(!showUserMenu)}>
              <span className="user-indicator"></span>
              {user.full_name || user.email} ▼
            </button>
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <div className="user-dropdown-name">{user.full_name}</div>
                  <div className="user-dropdown-email">{user.email}</div>
                </div>
                <div className="user-dropdown-divider"></div>
                <button className="user-dropdown-item" onClick={() => { setActiveTab('account'); setShowUserMenu(false); }}>
                  <span>👤</span> Account settings
                </button>
                <button className="user-dropdown-item" onClick={logout}>
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {activeTab !== 'account' && (
        <>
          {/* Hero Section */}
          <section className="hero-section-wrapper">
            <div className="hero-section">
              <div className="hero-content">
                <h1 className="hero-title">From meeting chaos to structured knowledge</h1>
                <p className="hero-description">
                  Transform meetings into structured, searchable knowledge. Acestar AI provides a meeting intelligence
                  layer for working professionals craving swifter actions and productivity.
                </p>
                
                {/* Hero Action Buttons */}
                <div className="hero-actions">
                  <button className="hero-btn hero-btn-primary" onClick={scrollToHomeDashboard}>
                    View Home Dashboard
                  </button>
                  <button className="hero-btn hero-btn-secondary" onClick={() => scrollToTab('meetings')}>
                    Plan Today's Meetings
                  </button>
                  <button className="hero-btn hero-btn-tertiary" onClick={() => scrollToTab('analytics')}>
                    Debrief with Ask Acestar
                  </button>
                </div>
                
                {/* Hero Stats */}
                <div className="hero-stats">
                  <div className="hero-stat-card">
                    <div className="hero-stat-label">Average turnaround</div>
                    <div className="hero-stat-value">{averageTurnaroundLabel}</div>
                    <div className="hero-stat-desc">
                      {completedRecordingStats.sampleCount > 0
                        ? `Across ${completedRecordingStats.sampleCount} completed recording${completedRecordingStats.sampleCount === 1 ? '' : 's'}`
                        : 'No completed recordings yet'}
                    </div>
                  </div>
                  <div className="hero-stat-card">
                    <div className="hero-stat-label">Transcript accuracy</div>
                    <div className="hero-stat-value">{transcriptAccuracy != null ? `${transcriptAccuracy}%` : 'N/A'}</div>
                    <div className="hero-stat-desc">{accuracyDescription}</div>
                  </div>
                  <div className="hero-stat-card">
                    <div className="hero-stat-label">Searchable records</div>
                    <div className="hero-stat-value">{formatCompactNumber(searchableRecordCount)}</div>
                    <div className="hero-stat-desc">
                      {searchableRecordCount === 1 ? '1 stored artifact in your account' : `${formatCompactNumber(searchableRecordCount)} stored artifacts in your account`}
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-video">
                <video className="demo-video" controls preload="metadata">
                  <source src="/ibm-recap-demo.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </section>

          {/* Tab Navigation */}
          <nav className="tab-navigation" ref={tabNavigationRef}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      {/* Main Content Area */}
      <main className="main-content-area">
        {activeTab === 'home' && <HomeTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          homeDateFilter={homeDateFilter}
          setHomeDateFilter={setHomeDateFilter}
          filteredMeetings={filteredMeetings}
          meetingEntries={meetingEntries}
          historyEntries={historyEntries}
          historyLoading={historyLoading}
          setActiveTab={setActiveTab}
          refresh={refresh}
          homeDashboardRef={homeDashboardRef}
          completedMeetingCount={completedMeetingCount}
        />}
        
        {activeTab === 'upload' && <UploadTab
          files={files}
          busy={busy}
          setBusy={setBusy}
          refresh={refresh}
          setActiveTab={setActiveTab}
          meetingEntries={meetingEntries}
          selectedMeetingContext={selectedMeetingContext}
          onSelectMeetingContext={setSelectedMeetingContext}
          clearSelectedMeetingContext={() => setSelectedMeetingContext(null)}
        />}

        {activeTab === 'meetings' && <MeetingsTab
          meetingEntries={meetingEntries}
          pendingCompletionMeetingIds={pendingCompletionMeetingIds}
          historyLoading={historyLoading}
          setActiveTab={setActiveTab}
          onSelectMeetingContext={setSelectedMeetingContext}
          refresh={refresh}
        />}
        
        {activeTab === 'transcribe' && <TranscribeTab
          files={files}
          busy={busy}
          transcribeJob={transcribeJob}
          setTranscribeJob={setTranscribeJob}
          transcriptType={transcriptType}
          setTranscriptType={setTranscriptType}
          transcriptOptions={transcriptOptions}
          setTranscriptOptions={setTranscriptOptions}
          historyEntries={historyEntries}
          historyLoading={historyLoading}
          setBusy={setBusy}
          refresh={refresh}
          setActiveTab={setActiveTab}
        />}
        
        {activeTab === 'summarize' && <SummarizeTab
          files={files}
          busy={busy}
          summarizeJob={summarizeJob}
          setSummarizeJob={setSummarizeJob}
          summaryType={summaryType}
          setSummaryType={setSummaryType}
          structuredSections={structuredSections}
          setStructuredSections={setStructuredSections}
          historyEntries={historyEntries}
          historyLoading={historyLoading}
          setBusy={setBusy}
          refresh={refresh}
          setActiveTab={setActiveTab}
          activeMeetingContext={activeMeetingContext}
        />}
        
        {activeTab === 'account' && <AccountTab
          accountProfile={accountProfile}
          storageUsage={storageUsage}
          accountLoading={accountLoading}
          browserNotificationsSupported={browserNotificationsSupported}
          browserNotificationPermission={browserNotificationPermission}
          browserNotificationsEnabled={browserNotificationsEnabled}
          onEnableBrowserNotifications={handleEnableBrowserNotifications}
          onDisableBrowserNotifications={handleDisableBrowserNotifications}
          onBack={() => setActiveTab('home')}
          refresh={refresh}
        />}
        
        {activeTab === 'analytics' && <AnalyticsTab historyEntries={historyEntries} meetingEntries={meetingEntries} />}
      </main>
    </div>
  );
}

// Home Tab Component
function HomeTab({ searchQuery, setSearchQuery, homeDateFilter, setHomeDateFilter, filteredMeetings, meetingEntries, historyEntries, historyLoading, setActiveTab, refresh, homeDashboardRef, completedMeetingCount }) {
  const uploadedCount = meetingEntries.length;
  const pendingTranscriptCount = meetingEntries.filter((file) => file.processingStatus !== 'completed' && !file.hasTranscript).length;
  const summaryCount = meetingEntries.filter((file) => file.hasSummary).length;
  const recommendedFile = meetingEntries.find((file) => !file.hasTranscript) || meetingEntries.find((file) => file.hasTranscript && !file.hasSummary) || meetingEntries[0] || null;
  const [selectedMeetingId, setSelectedMeetingId] = React.useState(null);
  const [retryBusy, setRetryBusy] = React.useState(false);

  const selectedMeeting = meetingEntries.find((meeting) => meeting.id === selectedMeetingId) || null;
  const selectedMeetingArtifacts = historyEntries.filter((entry) => entry.meetingId === selectedMeetingId);
  const canRestoreTranscription = selectedMeetingArtifacts.some((entry) => entry.file_type === 'audio');
  const canRestoreSummary = selectedMeetingArtifacts.some((entry) => entry.file_type === 'transcript');

  const handleRetry = async (meeting, stage) => {
    try {
      setRetryBusy(true);
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch(`/api/meetings/${meeting.id}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ stage })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to prepare retry');
      }

      await refresh();
      setActiveTab(stage === 'summarize' ? 'summarize' : 'transcribe');
    } catch (error) {
      alert(error.message || 'Failed to prepare retry');
    } finally {
      setRetryBusy(false);
    }
  };

  return (
    <div className="home-tab">
      <div className="home-header" ref={homeDashboardRef}>
        <h1 className="home-title">Mission Control</h1>
        <p className="home-subtitle">A high-level control center that surfaces the next action, recent files, and workflow readiness.</p>
        <div className="status-badge">● Ready for processing</div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Scheduled Meetings</div>
          <div className="stat-value">{uploadedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending transcripts</div>
          <div className="stat-value">{pendingTranscriptCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Summaries generated</div>
          <div className="stat-value">{summaryCount}</div>
          <div className="stat-badge">Structured default</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed meetings</div>
          <div className="stat-value">{completedMeetingCount}</div>
          <div className="stat-badge">Meetings tab</div>
        </div>
      </div>

      {/* Recommended Next Step */}
      <div className="recommended-card">
        <div className="recommended-content">
          <div className="recommended-icon">🎯</div>
          <div className="recommended-text">
            <div className="recommended-title">Recommended next step</div>
            <div className="recommended-action">
              {recommendedFile
                ? (recommendedFile.hasTranscript
                  ? <>Generate a summary for <span className="filename">{recommendedFile.filename}</span>.</>
                  : <>Transcribe <span className="filename">{recommendedFile.filename}</span> to unlock summary generation.</>)
                : 'Upload your first meeting recording to start building searchable history.'}
            </div>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => setActiveTab(recommendedFile?.hasTranscript ? 'summarize' : 'transcribe')}
        >
          Open tab
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by filename, file type, output, or date"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          className="filters-select"
          value={homeDateFilter}
          onChange={(e) => setHomeDateFilter(e.target.value)}
        >
          <option value="all">All dates</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="year">This year</option>
        </select>
      </div>

      {/* Recent Files */}
        <div className="files-section">
        <h2 className="section-title">Recent meetings</h2>
        <div className="files-list">
          {historyLoading ? (
            <div className="file-card">
              <div className="file-info">
                <div className="file-name">Loading your account history...</div>
                <div className="file-meta">Fetching uploads, transcripts, and summaries for your account.</div>
              </div>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="file-card">
              <div className="file-info">
                <div className="file-name">No matching meetings found</div>
                <div className="file-meta">Try a different keyword or upload your first meeting recording.</div>
              </div>
            </div>
          ) : filteredMeetings.map(file => (
            <div
              key={file.id}
              className="file-card clickable"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedMeetingId(file.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedMeetingId(file.id);
                }
              }}
            >
              <div className="file-icon">
                {file.status === 'audio' && '🎧'}
                {file.status === 'transcript' && '📝'}
                {file.status === 'summary' && '📊'}
              </div>
              <div className="file-info">
                <div className="file-name">{file.filename}</div>
                <div className="file-meta">
                  Uploaded {getTimeAgo(file.uploadedAt)} ({file.displayDate}) • {file.fileTypeLabel}
                  {file.infoChips.length > 0 && ` • ${file.infoChips.join(' • ')}`}
                  {file.relatedOutputs.length > 0 && ` • Related outputs: ${file.relatedOutputs.join(', ')}`}
                </div>
                {file.statusNote && (
                  <div className={`file-card-status-note ${file.statusTone}`}>
                    {file.statusNote}
                  </div>
                )}
              </div>
              <div className="file-status">
                <span className={`badge ${file.statusBadgeClass}`}>{file.statusLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedMeeting && (
        <div className="meeting-detail-panel">
          <div className="meeting-detail-header">
            <div>
              <div className="meeting-detail-eyebrow">Meeting detail</div>
              <h2 className="meeting-detail-title">{selectedMeeting.filename}</h2>
              <p className="meeting-detail-copy">
                Uploaded {getTimeAgo(selectedMeeting.uploadedAt)} ({selectedMeeting.displayDate}) • {selectedMeeting.fileTypeLabel}
              </p>
            </div>
            <button className="meeting-detail-close" onClick={() => setSelectedMeetingId(null)}>
              Close
            </button>
          </div>

          <div className="meeting-detail-grid">
            <div className="meeting-detail-card">
              <div className="meeting-detail-label">Processing status</div>
              <div className="meeting-detail-value">{selectedMeeting.statusLabel}</div>
            </div>
            <div className="meeting-detail-card">
              <div className="meeting-detail-label">Outputs</div>
              <div className="meeting-detail-value">
                {selectedMeeting.relatedOutputs.length > 0 ? selectedMeeting.relatedOutputs.join(', ') : 'No outputs yet'}
              </div>
            </div>
          </div>

          {(selectedMeeting.organizerName || selectedMeeting.attendeeSummary || selectedMeeting.notes || selectedMeeting.externalMeetingUrl) && (
            <div className="meeting-detail-section">
              <div className="meeting-detail-section-title">Saved meeting context</div>
              <div className="meeting-detail-artifacts">
                {selectedMeeting.organizerName && (
                  <div className="meeting-detail-artifact">
                    <div className="meeting-detail-artifact-name">Organizer</div>
                    <div className="meeting-detail-artifact-meta">{selectedMeeting.organizerName}</div>
                  </div>
                )}
                {selectedMeeting.attendeeSummary && (
                  <div className="meeting-detail-artifact">
                    <div className="meeting-detail-artifact-name">Attendees</div>
                    <div className="meeting-detail-artifact-meta">{selectedMeeting.attendeeSummary}</div>
                  </div>
                )}
                {selectedMeeting.notes && (
                  <div className="meeting-detail-artifact">
                    <div className="meeting-detail-artifact-name">Notes</div>
                    <div className="meeting-detail-artifact-meta">{selectedMeeting.notes}</div>
                  </div>
                )}
                {selectedMeeting.externalMeetingUrl && (
                  <div className="meeting-detail-artifact">
                    <div className="meeting-detail-artifact-name">Meeting link</div>
                    <div className="meeting-detail-artifact-meta">{selectedMeeting.externalMeetingUrl}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedMeeting.processingError && (
            <div className="meeting-detail-error">
              <div className="meeting-detail-label">Last processing error</div>
              <div className="meeting-detail-error-copy">{selectedMeeting.processingError}</div>
            </div>
          )}

          <div className="meeting-detail-section">
            <div className="meeting-detail-section-title">Artifacts</div>
            <div className="meeting-detail-artifacts">
              {selectedMeetingArtifacts.length === 0 ? (
                <div className="meeting-detail-artifact-empty">No stored artifacts are linked to this meeting yet.</div>
              ) : selectedMeetingArtifacts.map((artifact) => (
                <div key={artifact.id} className="meeting-detail-artifact">
                  <div className="meeting-detail-artifact-name">{artifact.displayFilename}</div>
                  <div className="meeting-detail-artifact-meta">
                    {artifact.fileTypeLabel} • {artifact.statusLabel}
                    {artifact.infoChips.length > 0 && ` • ${artifact.infoChips.join(' • ')}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="meeting-detail-section">
            <div className="meeting-detail-section-title">Recovery actions</div>
            <div className="meeting-detail-actions">
              <button
                className="btn-secondary-large"
                disabled={retryBusy || !canRestoreSummary}
                onClick={() => handleRetry(selectedMeeting, 'summarize')}
              >
                {retryBusy ? 'Preparing...' : 'Restore for summary retry'}
              </button>
              <button
                className="btn-primary-large"
                disabled={retryBusy || !canRestoreTranscription}
                onClick={() => handleRetry(selectedMeeting, 'transcribe')}
              >
                {retryBusy ? 'Preparing...' : 'Restore for transcription retry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Upload Tab Component
function UploadTab({ files, busy, setBusy, refresh, setActiveTab, meetingEntries, selectedMeetingContext, onSelectMeetingContext, clearSelectedMeetingContext }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState(null);
  const availableManualMeetings = (meetingEntries || []).filter((meeting) => meeting.sourceType === 'manual' && !meeting.archivedAt);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target.classList.contains('upload-drop-zone')) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (busy) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      await uploadFile(droppedFiles[0]);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    
    const validTypes = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/wave', 'video/mp4'];
    const validExtensions = ['.mp3', '.m4a', '.wav', '.mp4'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      alert('Invalid file type. Please upload MP3, M4A, WAV, or MP4 files.');
      return;
    }
    
    const formData = new FormData();
    formData.append('audio', file);
    if (selectedMeetingContext?.id) {
      formData.append('meetingId', selectedMeetingContext.id);
    }
    
    try {
      setBusy(true);
      setUploadState({
        status: 'uploading',
        percent: 0,
        message: 'Uploading file...'
      });

      const result = await uploadWithProgress(formData, setUploadState);
      if (!result.ok) throw new Error(result.error || 'Upload failed');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      await refresh();
      setUploadState({
        status: 'done',
        percent: 100,
        message: result.message || 'Upload complete.'
      });
    } catch (e) {
      setUploadState({
        status: 'error',
        percent: 100,
        message: e.message
      });
      alert(`Upload error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const uploadWithProgress = (formData, setProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload-audio');

      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(Math.round((event.loaded / event.total) * 100), 99);
          setProgress({
            status: 'uploading',
            percent,
            message: `Uploading file... ${percent}%`
          });
        }
      };

      xhr.onload = () => {
        let responseData = null;
        try {
          responseData = JSON.parse(xhr.responseText);
        } catch (parseError) {
          reject(new Error('Upload failed with an unexpected response.'));
          return;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress({
            status: 'processing',
            percent: 100,
            message: 'Upload complete. Processing media...'
          });
          resolve(responseData);
        } else {
          reject(new Error(responseData.error || 'Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    await uploadFile(file);
    event.target.value = '';
  };
  const displayedAudio = files.audio
    ? {
        audioFile: files.audio,
        originalFilename: files.originalFilename
      }
    : null;

  return (
    <div className="upload-tab">
      <h1 className="tab-title">Upload meeting recording</h1>
      <p className="tab-subtitle">Upload meeting recordings in MP3, M4A, WAV, or MP4 format. Video recordings are converted to MP3 automatically for transcription.</p>

      {!selectedMeetingContext && availableManualMeetings.length > 0 && (
        <div className="upload-meeting-selector">
          <div className="upload-meeting-selector-copy">
            <div className="upload-meeting-selector-label">Attach this upload to an existing meeting workspace</div>
            <div className="upload-meeting-selector-subtitle">
              If you forgot to start in Meetings, pick a saved manual workspace here so the upload, transcript, and summary stay connected.
            </div>
          </div>
          <select
            className="filters-select upload-meeting-selector-input"
            value={selectedMeetingContext?.id || ''}
            onChange={(event) => {
              const meeting = availableManualMeetings.find((entry) => entry.id === event.target.value);
              if (!meeting) return;
              onSelectMeetingContext({
                id: meeting.id,
                title: meeting.filename,
                start: meeting.meetingStartAt || meeting.uploadedAt,
                end: meeting.meetingStartAt || meeting.uploadedAt,
                organizer: meeting.organizerName || 'Organizer not set'
              });
            }}
          >
            <option value="">Choose a meeting workspace</option>
            {availableManualMeetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.filename} • {formatDateWithFallback(meeting.meetingStartAt || meeting.uploadedAt)}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedMeetingContext && (
        <div className="upload-meeting-context">
          <div className="upload-meeting-context-copy">
            <div className="upload-meeting-context-label">Selected meeting context</div>
            <div className="upload-meeting-context-title">{selectedMeetingContext.title}</div>
            <div className="upload-meeting-context-meta">
              {selectedMeetingContext.organizer} • {formatDateWithFallback(selectedMeetingContext.start)}
            </div>
          </div>
          <button className="account-back-button" onClick={clearSelectedMeetingContext}>
            Clear
          </button>
        </div>
      )}

      <div className="upload-tab-content">
        {/* Left Column - Upload and Player */}
        <div className="upload-left-column">
          <div
            className={`upload-drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="upload-icon">📁</div>
            <h3>Drag and drop your meeting recording here</h3>
            <p>or</p>
            <label className="upload-button">
              <input
                type="file"
                accept=".mp3,.m4a,.wav,.mp4,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/wave,video/mp4"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={busy}
              />
              <span className="btn-primary">Browse files</span>
            </label>
            <p className="upload-hint">Supported formats: MP3, M4A, WAV, MP4 (max 500MB upload before conversion, MP4 converts to MP3)</p>
          </div>

          {uploadState && (
            <div className="transcription-progress-section">
              <div className="progress-section-header">
                <span className="progress-section-title">Upload status</span>
                <span className="progress-section-percent">{uploadState.percent || 0}%</span>
              </div>
              <div className="progress-section-bar">
                <div className="progress-section-fill" style={{ width: `${uploadState.percent || 0}%` }} />
              </div>
              <p className="progress-section-message">{uploadState.message}</p>
            </div>
          )}

          {displayedAudio && (
            <>
              <AudioPlayer audioFile={displayedAudio.audioFile} originalFilename={displayedAudio.originalFilename} />
              <UploadActions
                setActiveTab={setActiveTab}
                audioFile={displayedAudio.audioFile}
                originalFilename={displayedAudio.originalFilename}
                showContinueAction={!!files.audio}
              />
            </>
          )}
        </div>

        <UploadWorkflowPanel
          files={files}
          uploadState={uploadState}
          selectedMeetingContext={selectedMeetingContext}
        />
      </div>
    </div>
  );
}

// Audio Player Component
function AudioPlayer({ audioFile, originalFilename }) {
  const audioRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
  const [showMoreOptions, setShowMoreOptions] = React.useState(false);
  const [playbackRate, setPlaybackRate] = React.useState(1);

  const isRemoteAudio = /^https?:\/\//i.test(audioFile);
  const serverFilename = isRemoteAudio ? null : audioFile.split('/').pop();
  const audioUrl = isRemoteAudio ? audioFile : `/api/audio/${serverFilename}`;
  const displayFilename = originalFilename || serverFilename || 'audio.mp3';
  
  React.useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      console.log('Audio duration loaded:', audio.duration);
      setDuration(audio.duration);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('Audio loading error:', e);
      console.error('Audio src:', audio.src);
      console.error('Audio error code:', audio.error?.code);
      console.error('Audio error message:', audio.error?.message);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Log the audio URL for debugging
    console.log('Audio player initialized with URL:', audioUrl);
    console.log('Display filename:', displayFilename);
    console.log('Server filename:', serverFilename);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, displayFilename, serverFilename]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  };

  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    audioRef.current.playbackRate = rate;
    setShowMoreOptions(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = displayFilename;
    link.click();
    setShowMoreOptions(false);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-player-container">
      <div className="audio-player-header">
        <h3 className="audio-player-title">Native audio preview</h3>
        <span className="audio-player-status">Ready to review</span>
      </div>
      <p className="audio-player-subtitle">Play the uploaded meeting recording audio to confirm sound quality before transcription.</p>

      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="audio-player-controls">
        <button className="audio-play-button" onClick={togglePlay}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        <span className="audio-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="audio-progress-container" onClick={handleSeek}>
          <div className="audio-progress-bar">
            <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="audio-volume-control">
          <button
            className="audio-volume-button"
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
          >
            {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>
          {showVolumeSlider && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="audio-volume-slider"
            />
          )}
        </div>

        <div className="audio-more-options">
          <button
            className="audio-more-button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
          >
            ⋮
          </button>
          {showMoreOptions && (
            <div className="audio-options-menu">
              <div className="audio-options-section">
                <div className="audio-options-label">Playback speed</div>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                  <button
                    key={rate}
                    className={`audio-option-item ${playbackRate === rate ? 'active' : ''}`}
                    onClick={() => handlePlaybackRateChange(rate)}
                  >
                    {rate}x {playbackRate === rate && '✓'}
                  </button>
                ))}
              </div>
              <button className="audio-option-item" onClick={handleDownload}>
                ⬇ Download
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="audio-player-info">
        Previewing: <strong>{displayFilename}</strong> • {formatTime(duration)} • Ready to play
      </div>
    </div>
  );
}

// Upload Actions Component (Download and Continue buttons)
function UploadActions({ setActiveTab, audioFile, originalFilename, showContinueAction = true }) {
  const isRemoteAudio = /^https?:\/\//i.test(audioFile);
  const serverFilename = isRemoteAudio ? null : audioFile.split('/').pop();
  const audioUrl = isRemoteAudio ? audioFile : `/api/audio/${serverFilename}`;
  const downloadFilename = originalFilename || serverFilename || 'audio.mp3';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = downloadFilename;
    link.click();
  };

  const handleContinueToTranscription = () => {
    setActiveTab('transcribe');
    // Scroll to transcribe tab
    setTimeout(() => {
      const transcribeTab = document.querySelector('[data-tab="transcribe"]');
      if (transcribeTab) {
        transcribeTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="upload-actions">
      <button className="btn-secondary-large" onClick={handleDownload}>
        ⬇ Download Audio
      </button>
      {showContinueAction && (
        <button className="btn-primary-large" onClick={handleContinueToTranscription}>
          Continue to Transcription →
        </button>
      )}
    </div>
  );
}

function UploadWorkflowPanel({ files, uploadState, selectedMeetingContext }) {
  const displayFilename = files.originalFilename || files.audio?.split('/').pop() || 'No file selected';
  const lowerFilename = displayFilename.toLowerCase();
  const fileExtension = displayFilename.includes('.') ? displayFilename.split('.').pop().toUpperCase() : 'Unknown';
  const uploadStatusLabel = uploadState?.status === 'error'
    ? 'Needs attention'
    : uploadState?.status === 'done'
      ? 'Ready for transcription'
      : uploadState?.status === 'processing'
        ? 'Converting and preparing'
        : uploadState?.status === 'uploading'
          ? 'Uploading now'
          : files.audio
            ? 'Available temporarily'
            : 'Waiting for upload';
  const uploadStatusTone = uploadState?.status === 'error'
    ? 'warning'
    : uploadState?.status === 'done' || files.audio
      ? 'success'
      : 'neutral';
  const sourceType = lowerFilename.endsWith('.mp4') ? 'Teams video upload' : 'Audio upload';
  const stepStates = {
    uploaded: uploadState?.status === 'uploading' || uploadState?.status === 'processing' || uploadState?.status === 'done' || !!files.audio,
    converted: lowerFilename.endsWith('.mp4')
      ? (uploadState?.status === 'processing' || uploadState?.status === 'done' || !!files.audio)
      : !!files.audio,
    ready: !!files.audio
  };

  return (
    <div className="upload-right-column">
      <section className="upload-workflow-panel">
        <div className="upload-workflow-header">
          <div>
            <div className="upload-workflow-eyebrow">Workflow status</div>
            <h2 className="upload-workflow-title">Current file journey</h2>
          </div>
          <span className={`upload-workflow-badge ${uploadStatusTone}`}>{uploadStatusLabel}</span>
        </div>

        {selectedMeetingContext && (
          <div className="upload-workflow-callout">
            Working from Teams meeting: <strong>{selectedMeetingContext.title}</strong>
          </div>
        )}

        <div className="upload-workflow-steps">
          <div className={`upload-workflow-step ${stepStates.uploaded ? 'complete' : ''}`}>
            <div className="upload-workflow-step-icon">{stepStates.uploaded ? '✓' : '1'}</div>
            <div>
              <div className="upload-workflow-step-title">Upload intake</div>
              <div className="upload-workflow-step-copy">
                {uploadState?.status === 'uploading'
                  ? uploadState.message
                  : 'Bring in a meeting recording from your device.'}
              </div>
            </div>
          </div>

          <div className={`upload-workflow-step ${stepStates.converted ? 'complete' : ''}`}>
            <div className="upload-workflow-step-icon">{stepStates.converted ? '✓' : '2'}</div>
            <div>
              <div className="upload-workflow-step-title">Media preparation</div>
              <div className="upload-workflow-step-copy">
                {lowerFilename.endsWith('.mp4')
                  ? 'MP4 recordings are converted to MP3 immediately after upload.'
                  : 'Audio uploads are validated and prepared for transcription.'}
              </div>
            </div>
          </div>

          <div className={`upload-workflow-step ${stepStates.ready ? 'complete' : ''}`}>
            <div className="upload-workflow-step-icon">{stepStates.ready ? '✓' : '3'}</div>
            <div>
              <div className="upload-workflow-step-title">Ready for next step</div>
              <div className="upload-workflow-step-copy">
                {files.audio
                  ? 'Preview the audio, then continue to transcription while the temporary file is available.'
                  : 'Your uploaded file will appear here as soon as it is ready.'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="upload-workflow-panel">
        <div className="upload-workflow-header">
          <div>
            <div className="upload-workflow-eyebrow">File details</div>
            <h2 className="upload-workflow-title">Working artifact</h2>
          </div>
        </div>

        <div className="upload-detail-grid">
          <div className="upload-detail-card">
            <div className="upload-detail-label">Filename</div>
            <div className="upload-detail-value break">{displayFilename}</div>
          </div>
          <div className="upload-detail-card">
            <div className="upload-detail-label">Source type</div>
            <div className="upload-detail-value">{sourceType}</div>
          </div>
          <div className="upload-detail-card">
            <div className="upload-detail-label">Detected format</div>
            <div className="upload-detail-value">{fileExtension}</div>
          </div>
          <div className="upload-detail-card">
            <div className="upload-detail-label">Retention</div>
            <div className="upload-detail-value">Temporary until transcript and summary are complete</div>
          </div>
        </div>
      </section>

      <section className="upload-workflow-panel">
        <div className="upload-workflow-header">
          <div>
            <div className="upload-workflow-eyebrow">Next steps</div>
            <h2 className="upload-workflow-title">Keep the workflow moving</h2>
          </div>
        </div>

        <div className="upload-next-steps">
          <div className="upload-next-step-copy">
            {files.audio
              ? 'Next: continue to transcription from the main workspace area once you have reviewed the audio.'
              : 'Once your upload is complete, review the audio in the player and continue to transcription from the main workspace area.'}
          </div>
          <div className="upload-next-step-note">
            {files.audio
              ? 'Download the audio from the player while it is still available if you want to keep a copy.'
              : 'MP4 uploads are converted automatically, and temporary audio is cleaned up after transcript and summary generation.'}
          </div>
        </div>
      </section>
    </div>
  );
}

// Recent Transcripts Panel Component
function RecentTranscriptsPanel({ historyEntries, historyLoading }) {
  const handleTranscriptOpen = async (entry) => {
    try {
      await openHistoryEntryInNewWindow(entry, 'Transcript is no longer available.');
    } catch (error) {
      alert(error.message || 'Transcript is no longer available.');
    }
  };

  return (
    <HistoryPanel
      title="Recent transcripts"
      placeholder="Search recent transcripts"
      historyEntries={historyEntries.filter((entry) => entry.file_type === 'transcript')}
      historyLoading={historyLoading}
      emptyMessage="No transcripts generated yet."
      onEntryClick={handleTranscriptOpen}
    />
  );
}

// Recent Summaries Panel Component
function RecentSummariesPanel({ historyEntries, historyLoading }) {
  const handleSummaryOpen = async (entry) => {
    try {
      await openHistoryEntryInNewWindow(entry, 'Summary is no longer available.');
    } catch (error) {
      alert(error.message || 'Summary is no longer available.');
    }
  };

  return (
    <HistoryPanel
      title="Recent summaries"
      placeholder="Search recent summaries"
      historyEntries={historyEntries.filter((entry) => entry.file_type === 'summary')}
      historyLoading={historyLoading}
      emptyMessage="No summaries generated yet."
      onEntryClick={handleSummaryOpen}
    />
  );
}

function HistoryPanel({ title, placeholder, historyEntries, historyLoading, emptyMessage, onEntryClick }) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState('all');
  const filteredEntries = historyEntries.filter((entry) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      entry.displayFilename.toLowerCase().includes(query) ||
      entry.displayDate.toLowerCase().includes(query) ||
      entry.fileTypeLabel.toLowerCase().includes(query) ||
      entry.statusLabel.toLowerCase().includes(query) ||
      entry.infoChips.join(' ').toLowerCase().includes(query) ||
      entry.relatedOutputs.join(' ').toLowerCase().includes(query)
    );
    return matchesSearch && matchesDateFilter(entry.createdAt, dateFilter);
  });

  return (
    <div className="recent-uploads-panel">
      <div className="recent-uploads-header">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="history-filter-select"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="all">All dates</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="year">This year</option>
        </select>
        <div className="recent-uploads-badge">{title}</div>
      </div>

      <div className="recent-uploads-list">
        {historyLoading ? (
          <div className="recent-upload-card">
            <div className="recent-upload-info">
              <div className="recent-upload-filename">Loading account history...</div>
              <div className="recent-upload-meta">Fetching files for your AcestarAI account.</div>
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="recent-upload-card">
            <div className="recent-upload-info">
              <div className="recent-upload-filename">{emptyMessage}</div>
              <div className="recent-upload-meta">Your future uploads and generated outputs will appear here.</div>
            </div>
          </div>
        ) : filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className={`recent-upload-card ${entry.status}`}
            role="button"
            tabIndex={0}
            onClick={() => onEntryClick?.(entry)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onEntryClick?.(entry);
              }
            }}
          >
            <div className="recent-upload-icon">{entry.icon}</div>
            <div className="recent-upload-info">
              <div className="recent-upload-filename">{entry.displayFilename}</div>
              <div className="recent-upload-meta">
                {entry.fileTypeLabel} • {entry.displayDate} • {entry.statusLabel}
                {entry.infoChips.length > 0 && ` • ${entry.infoChips.join(' • ')}`}
                {entry.relatedOutputs.length > 0 && ` • Related outputs: ${entry.relatedOutputs.join(', ')}`}
              </div>
            </div>
            <div className="recent-upload-status">
              <span className={`status-badge ${entry.status === 'audio' ? 'status-audio' : 'status-success'}`}>
                {entry.statusLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Transcribe Tab Component
function TranscribeTab({ files, busy, transcribeJob, setTranscribeJob, transcriptType, setTranscriptType, transcriptOptions, setTranscriptOptions, historyEntries, historyLoading, setBusy, refresh, setActiveTab }) {
  const [showOptions, setShowOptions] = useState(false);

  const handleTranscribe = () => {
    setShowOptions(true);
  };

  const executeTranscription = async () => {
    setShowOptions(false);
    
    const options = {};
    if (transcriptType === 'custom') {
      options.timestamps = transcriptOptions.timestamps;
      options.speakerDiarization = transcriptOptions.speakerDiarization;
      options.pauses = transcriptOptions.pauses;
      if (transcriptOptions.redactWords && transcriptOptions.redactWords.trim()) {
        options.redactWords = transcriptOptions.redactWords.split(',').map(w => w.trim()).filter(w => w);
      }
    } else {
      options.timestamps = true;
    }
    
    try {
      setBusy(true);
      const headers = { 'Content-Type': 'application/json' };
      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const r = await fetch('/api/transcribe', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ transcriptOptions: options }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Request failed');
      
      setTranscribeJob({ status: 'running', percent: 1, message: 'Starting...' });
      await pollJob(j.jobId, setTranscribeJob);
    } catch (e) {
      alert(`Error: ${e.message}`);
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

  const getAudioDuration = () => {
    if (!files.audio) return '';
    // Mock duration for now - in real app would get from metadata
    return '54 min';
  };

  return (
    <div className="transcribe-tab">
      <div className="transcribe-header">
        <div>
          <h1 className="tab-title">Transcribe meeting recording</h1>
          <p className="tab-subtitle">A dedicated transcript generation tab for meeting recordings with visible file context, customizable options, and progress feedback.</p>
        </div>
        {files.transcript && (
          <span className="transcript-ready-badge">Transcript ready state</span>
        )}
      </div>

      <div className="transcribe-tab-content">
        <div className="transcribe-left-column">
          {!files.audio ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>No meeting recording uploaded</h3>
              <p>Please upload a meeting recording first to generate a transcript</p>
            </div>
          ) : (
            <>
              {/* File Context Card */}
            <div className="transcribe-file-card">
            <div className="file-card-icon">🎧</div>
            <div className="file-card-info">
              <div className="file-card-name">{files.originalFilename || files.audio.split('/').pop()}</div>
              <div className="file-card-meta">
                Uploaded today • {getAudioDuration()} • Meeting recording ready for transcription
              </div>
            </div>
            {files.audio && (
              <span className="file-card-badge">Recording ✓</span>
            )}
          </div>

          {/* Transcript Type Options */}
          <div className="transcript-options-grid">
            <label className={`transcript-option-card ${transcriptType === 'standard' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="transcriptType"
                value="standard"
                checked={transcriptType === 'standard'}
                onChange={(e) => setTranscriptType(e.target.value)}
              />
              <div className="option-card-content">
                <div className="option-card-header">
                  <span className="option-card-icon">📝</span>
                  <span className="option-card-title">Standard transcript</span>
                </div>
                <p className="option-card-description">
                  A line-by-line transcript with timestamps.
                </p>
              </div>
            </label>

            <label className={`transcript-option-card ${transcriptType === 'custom' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="transcriptType"
                value="custom"
                checked={transcriptType === 'custom'}
                onChange={(e) => setTranscriptType(e.target.value)}
              />
              <div className="option-card-content">
                <div className="option-card-header">
                  <span className="option-card-icon">⚙️</span>
                  <span className="option-card-title">Custom transcript</span>
                  <span className="info-badge">ⓘ</span>
                </div>
                <p className="option-card-description">
                  Customize timestamps, speaker diarization, pauses, and redactions.
                </p>
              </div>
            </label>
          </div>

          {/* Custom Options Checkboxes */}
          <div className="transcript-features">
            <label className="feature-checkbox">
              <input
                type="checkbox"
                checked={transcriptOptions.timestamps}
                onChange={(e) => setTranscriptOptions({...transcriptOptions, timestamps: e.target.checked})}
                disabled={transcriptType === 'standard'}
              />
              <div className="feature-content">
                <div className="feature-title">Timestamps</div>
                <div className="feature-description">Included for searchability and playback reference.</div>
              </div>
            </label>

            <label className="feature-checkbox">
              <input
                type="checkbox"
                checked={transcriptOptions.speakerDiarization}
                onChange={(e) => setTranscriptOptions({...transcriptOptions, speakerDiarization: e.target.checked})}
                disabled={transcriptType === 'standard'}
              />
              <div className="feature-content">
                <div className="feature-title">Speaker diarization</div>
                <div className="feature-description">AI speaker identification enabled.</div>
              </div>
            </label>

            <label className="feature-checkbox">
              <input
                type="checkbox"
                checked={transcriptOptions.pauses}
                onChange={(e) => setTranscriptOptions({...transcriptOptions, pauses: e.target.checked})}
                disabled={transcriptType === 'standard'}
              />
              <div className="feature-content">
                <div className="feature-title">Pause markers</div>
                <div className="feature-description">Useful for natural conversation pacing.</div>
              </div>
            </label>

            <div className="feature-checkbox feature-with-input">
              <input
                type="checkbox"
                checked={transcriptOptions.redactWords !== null && transcriptOptions.redactWords !== undefined}
                onChange={(e) => {
                  if (e.target.checked) {
                    setTranscriptOptions({...transcriptOptions, redactWords: ''});
                  } else {
                    setTranscriptOptions({...transcriptOptions, redactWords: null});
                  }
                }}
                disabled={transcriptType === 'standard'}
              />
              <div className="feature-content">
                <div className="feature-title">Redacted terms</div>
                <div className="feature-description">
                  Enter words or phrases to redact (comma-separated)
                </div>
                {(transcriptOptions.redactWords !== null && transcriptOptions.redactWords !== undefined) && (
                  <input
                    type="text"
                    className="redact-input"
                    placeholder="e.g., confidential, password, unreleased"
                    value={transcriptOptions.redactWords || ''}
                    onChange={(e) => setTranscriptOptions({...transcriptOptions, redactWords: e.target.value})}
                    disabled={transcriptType === 'standard'}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Progress Section */}
          {transcribeJob && (
            <div className="transcription-progress-section">
              <div className="progress-section-header">
                <span className="progress-section-title">Transcription progress</span>
                <span className="progress-section-percent">{transcribeJob.percent || 0}%</span>
              </div>
              <div className="progress-section-bar">
                <div className="progress-section-fill" style={{ width: `${transcribeJob.percent || 0}%` }} />
              </div>
              <p className="progress-section-message">
                {transcribeJob.status === 'done' && transcribeJob.percent === 100
                  ? 'Transcription complete. Download the PDF or continue to the summary tab.'
                  : transcribeJob.message || 'Processing your meeting recording...'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="transcribe-actions">
            <button
              className="btn-primary-large"
              onClick={executeTranscription}
              disabled={busy || !files.audio}
            >
              {busy ? 'Transcribing...' : (files.transcript ? 'Create new transcript' : 'Start transcription')}
            </button>
            {files.transcript && (
              <>
                <button
                  className="btn-secondary-large"
                  onClick={() => window.open('/api/download/transcript', '_blank')}
                >
                  Download transcript PDF
                </button>
                <button
                  className="btn-secondary-large"
                  onClick={() => setActiveTab('summarize')}
                >
                  Continue to summarize
                </button>
              </>
            )}
          </div>
            </>
          )}
        </div>
        
        <div className="transcribe-right-column">
          <RecentTranscriptsPanel historyEntries={historyEntries} historyLoading={historyLoading} />
        </div>
      </div>
    </div>
  );
}

// Summarize Tab Component  
function SummarizeTab({ files, busy, summarizeJob, setSummarizeJob, summaryType, setSummaryType, structuredSections, setStructuredSections, historyEntries, historyLoading, setBusy, refresh, setActiveTab, activeMeetingContext }) {
  
  const executeSummarization = async () => {
    let customPrompt = '';
    if (summaryType === 'standard') {
      customPrompt = `Please provide a brief, concise bulleted list of all key points and actions discussed in the meeting. Do not include any section headers or categories. Just provide a simple bulleted list.`;
    } else if (summaryType === 'structured') {
      const sections = [];
      if (structuredSections.attendees) sections.push('- **List of attendees** (extract all person names mentioned anywhere in the transcript)');
      if (structuredSections.purpose) sections.push('- **Main purpose of the meeting**');
      if (structuredSections.actionItems) sections.push('- **Action items** with owners and deadlines');
      if (structuredSections.risks) sections.push('- **Risks and blockers** identified');
      if (structuredSections.questions) sections.push('- **Open questions** that need resolution');
      
      customPrompt = `Please provide a structured summary with the following sections. Use **bold** formatting for section titles:\n${sections.join('\n')}\n\nIMPORTANT INSTRUCTIONS FOR ATTENDEES SECTION:\n- Carefully read through the entire transcript and extract ALL person names mentioned\n- Include first names, last names, or full names (e.g., "John", "Sarah", "Dr. Smith", "Michael Chen")\n- Do NOT include generic speaker labels like "Speaker A", "Speaker B", "Speaker C"\n- List each unique person name as a bullet point\n- If truly no person names are found anywhere in the transcript, only then write "No names mentioned"`;
    }
    
    try {
      setBusy(true);
      const headers = { 'Content-Type': 'application/json' };
      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const r = await fetch('/api/summarize', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ customPrompt: customPrompt || undefined }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Request failed');
      
      setSummarizeJob({ status: 'running', percent: 1, message: 'Starting...' });
      await pollJob(j.jobId, setSummarizeJob);
    } catch (e) {
      alert(`Error: ${e.message}`);
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

  return (
    <div className="summarize-tab">
      <div className="summarize-header">
        <div>
          <h1 className="tab-title">Summarize transcript</h1>
          <p className="tab-subtitle">A summary generation view with standard and structured modes plus selectable summary sections.</p>
        </div>
        {files.transcript && (
          <span className="transcript-ready-badge">Transcript ✓</span>
        )}
      </div>

      <div className="summarize-tab-content">
        <div className="summarize-left-column">
          {!files.transcript ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>No transcript available</h3>
              <p>Please transcribe a meeting recording first to generate a summary</p>
            </div>
          ) : (
            <>
              {/* File Context Card */}
              <div className="transcribe-file-card">
            <div className="file-card-icon">📝</div>
            <div className="file-card-info">
              <div className="file-card-name">{files.transcript.split('/').pop()}</div>
              <div className="file-card-meta">
                Transcript available • Generated with timestamps and speaker IDs
              </div>
            </div>
            <span className="file-card-badge" style={{background: 'rgba(36, 161, 72, 0.1)', color: 'var(--ibm-green)'}}>Ready for summary</span>
          </div>

          {activeMeetingContext && (
            <div className="summary-context-panel">
              <div className="summary-context-header">
                <div>
                  <div className="upload-workflow-eyebrow">Saved meeting context</div>
                  <h3 className="upload-workflow-title">This context will inform the summary</h3>
                </div>
              </div>

              <div className="summary-context-grid">
                <div className="summary-context-card">
                  <div className="summary-context-label">Meeting</div>
                  <div className="summary-context-value">{activeMeetingContext.filename}</div>
                </div>
                {activeMeetingContext.meetingStartAt && (
                  <div className="summary-context-card">
                    <div className="summary-context-label">Meeting date</div>
                    <div className="summary-context-value">{formatDateWithFallback(activeMeetingContext.meetingStartAt)}</div>
                  </div>
                )}
                {activeMeetingContext.organizerName && (
                  <div className="summary-context-card">
                    <div className="summary-context-label">Organizer</div>
                    <div className="summary-context-value">{activeMeetingContext.organizerName}</div>
                  </div>
                )}
                {activeMeetingContext.attendeeSummary && (
                  <div className="summary-context-card">
                    <div className="summary-context-label">Attendees</div>
                    <div className="summary-context-value">{activeMeetingContext.attendeeSummary}</div>
                  </div>
                )}
              </div>

              {(activeMeetingContext.notes || activeMeetingContext.externalMeetingUrl) && (
                <div className="summary-context-notes">
                  {activeMeetingContext.notes && (
                    <div className="summary-context-note-block">
                      <div className="summary-context-label">Notes</div>
                      <div className="summary-context-copy">{activeMeetingContext.notes}</div>
                    </div>
                  )}
                  {activeMeetingContext.externalMeetingUrl && (
                    <div className="summary-context-note-block">
                      <div className="summary-context-label">Meeting link</div>
                      <div className="summary-context-copy">{activeMeetingContext.externalMeetingUrl}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Summary Type Options */}
          <div className="transcript-options-grid">
            <label className={`transcript-option-card ${summaryType === 'standard' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="summaryType"
                value="standard"
                checked={summaryType === 'standard'}
                onChange={(e) => setSummaryType(e.target.value)}
              />
              <div className="option-card-content">
                <div className="option-card-header">
                  <span className="option-card-icon">📋</span>
                  <span className="option-card-title">Standard summary</span>
                </div>
                <p className="option-card-description">
                  A concise bulleted recap with key points and actions.
                </p>
              </div>
            </label>

            <label className={`transcript-option-card ${summaryType === 'structured' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="summaryType"
                value="structured"
                checked={summaryType === 'structured'}
                onChange={(e) => setSummaryType(e.target.value)}
              />
              <div className="option-card-content">
                <div className="option-card-header">
                  <span className="option-card-icon">📊</span>
                  <span className="option-card-title">Structured summary</span>
                  <span className="info-badge">ⓘ</span>
                </div>
                <p className="option-card-description">
                  Build a custom format based on sections selected below.
                </p>
              </div>
            </label>
          </div>

          {/* Structured Sections Checkboxes */}
          <div className="transcript-features">
            <label className="feature-checkbox">
              <input
                type="checkbox"
                checked={structuredSections.attendees}
                onChange={(e) => setStructuredSections({...structuredSections, attendees: e.target.checked})}
                disabled={summaryType === 'standard'}
              />
              <div className="feature-content">
                <div className="feature-title">Attendees</div>
                <div className="feature-description">Who was present and how often they contributed.</div>
              </div>
            </label>

            <label className="feature-checkbox">
              <input
                type="checkbox"
                checked={structuredSections.purpose}
                onChange={(e) => setStructuredSections({...structuredSections, purpose: e.target.checked})}
                disabled={summaryType === 'standard'}
              />
              <div className="feature-content">
                <div className="feature-title">Main purpose</div>
                <div className="feature-description">The core objective of the meeting.</div>
              </div>
            </label>

            <label className="feature-checkbox">
              <input
                type="checkbox"
                checked={structuredSections.actionItems}
                onChange={(e) => setStructuredSections({...structuredSections, actionItems: e.target.checked})}
                disabled={summaryType === 'standard'}
              />
              <div className="feature-content">
                <div className="feature-title">Action items</div>
                <div className="feature-description">Tasks, owners, and due dates.</div>
              </div>
            </label>

            <label className="feature-checkbox">
              <input
                type="checkbox"
                checked={structuredSections.risks}
                onChange={(e) => setStructuredSections({...structuredSections, risks: e.target.checked})}
                disabled={summaryType === 'standard'}
              />
              <div className="feature-content">
                <div className="feature-title">Risks & blockers</div>
                <div className="feature-description">Known concerns that need follow-up.</div>
              </div>
            </label>

            <label className="feature-checkbox">
              <input
                type="checkbox"
                checked={structuredSections.questions}
                onChange={(e) => setStructuredSections({...structuredSections, questions: e.target.checked})}
                disabled={summaryType === 'standard'}
              />
              <div className="feature-content">
                <div className="feature-title">Open questions</div>
                <div className="feature-description">Unresolved points requiring clarification.</div>
              </div>
            </label>
          </div>

          {/* Progress Section */}
          {summarizeJob && (
            <div className="transcription-progress-section">
              <div className="progress-section-header">
                <span className="progress-section-title">Summary progress</span>
                <span className="progress-section-percent">{summarizeJob.percent || 0}%</span>
              </div>
              <div className="progress-section-bar">
                <div className="progress-section-fill" style={{ width: `${summarizeJob.percent || 0}%` }} />
              </div>
              <p className="progress-section-message">
                {summarizeJob.status === 'done' && summarizeJob.percent === 100
                  ? `Summary generated successfully with ${summarizeJob.result?.actionItemsCount || 0} action items and ${summarizeJob.result?.openQuestionsCount || 0} open questions.`
                  : summarizeJob.message || 'Generating your summary...'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="transcribe-actions">
            <button
              className="btn-primary-large"
              onClick={executeSummarization}
              disabled={busy || !files.transcript}
            >
              {busy ? 'Generating summary...' : (files.summary ? 'Create new summary' : 'Start summarization')}
            </button>
            {files.summary && (
              <>
                <button
                  className="btn-secondary-large"
                  onClick={() => window.open('/api/download/summary', '_blank')}
                >
                  Download summary PDF
                </button>
                <button
                  className="btn-secondary-large"
                  onClick={() => setActiveTab('analytics')}
                >
                  Continue to Ask Acestar
                </button>
              </>
            )}
          </div>
            </>
          )}
        </div>
        
        <div className="summarize-right-column">
          <RecentSummariesPanel historyEntries={historyEntries} historyLoading={historyLoading} />
        </div>
      </div>
    </div>
  );
}

// Meetings Tab Component
function MeetingsTab({ meetingEntries, pendingCompletionMeetingIds, historyLoading, setActiveTab, onSelectMeetingContext, refresh }) {
  const screenshotInputRef = React.useRef(null);
  const speechRecognitionRef = React.useRef(null);
  const mediaRecorderRef = React.useRef(null);
  const mediaStreamRef = React.useRef(null);
  const mediaChunksRef = React.useRef([]);
  const dictationBaseTextRef = React.useRef('');
  const dictationCommittedTextRef = React.useRef('');
  const [scheduledSearchQuery, setScheduledSearchQuery] = React.useState('');
  const [completedSearchQuery, setCompletedSearchQuery] = React.useState('');
  const [editingMeetingId, setEditingMeetingId] = React.useState(null);
  const [notesEditorMeetingId, setNotesEditorMeetingId] = React.useState(null);
  const [notesEditorMode, setNotesEditorMode] = React.useState('write');
  const [notesDraft, setNotesDraft] = React.useState('');
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [dictationSupported, setDictationSupported] = React.useState(false);
  const [dictationFallbackSupported, setDictationFallbackSupported] = React.useState(false);
  const [dictationActive, setDictationActive] = React.useState(false);
  const [dictationStage, setDictationStage] = React.useState('idle');
  const [dictationInterimText, setDictationInterimText] = React.useState('');
  const [dictationChunks, setDictationChunks] = React.useState([]);
  const [savingMeeting, setSavingMeeting] = React.useState(false);
  const [archiveBusyId, setArchiveBusyId] = React.useState(null);
  const [reviewBusy, setReviewBusy] = React.useState(false);
  const [meetingMessage, setMeetingMessage] = React.useState('');
  const [meetingError, setMeetingError] = React.useState('');
  const [screenshotBusy, setScreenshotBusy] = React.useState(false);
  const [screenshotImportBusy, setScreenshotImportBusy] = React.useState(false);
  const [screenshotFileNames, setScreenshotFileNames] = React.useState([]);
  const [screenshotCandidates, setScreenshotCandidates] = React.useState([]);
  const [screenshotError, setScreenshotError] = React.useState('');
  const [screenshotMessage, setScreenshotMessage] = React.useState('');
  const [meetingForm, setMeetingForm] = React.useState({
    title: '',
    meetingStartAt: '',
    meetingEndAt: '',
    organizerName: '',
    attendeeSummary: '',
    externalMeetingUrl: '',
    notes: ''
  });

  const resetMeetingForm = React.useCallback(() => {
    setEditingMeetingId(null);
    setMeetingForm({
      title: '',
      meetingStartAt: '',
      meetingEndAt: '',
      organizerName: '',
      attendeeSummary: '',
      externalMeetingUrl: '',
      notes: ''
    });
  }, []);

  const closeNotesEditor = React.useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop dictation:', error);
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('Failed to stop fallback recording:', error);
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setDictationActive(false);
    setDictationStage('idle');
    setDictationInterimText('');
    setDictationChunks([]);
    dictationBaseTextRef.current = '';
    dictationCommittedTextRef.current = '';
    setNotesEditorMeetingId(null);
    setNotesEditorMode('write');
    setNotesDraft('');
  }, []);

  const allMeetings = (meetingEntries || []).filter((meeting) => !meeting.archivedAt);
  const pendingCompletionSet = new Set(pendingCompletionMeetingIds || []);
  const getMeetingSortTimestamp = React.useCallback((meeting) => {
    const candidates = [
      meeting.meetingStartAt,
      meeting.meetingEndAt,
      meeting.completedAt,
      meeting.uploadedAt,
      meeting.createdAt
    ].filter(Boolean);

    for (const candidate of candidates) {
      const timestamp = new Date(candidate).getTime();
      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }
    }

    return 0;
  }, []);
  const meetingMatchesQuery = React.useCallback((meeting, query) => {
    const normalizedQuery = String(query || '').toLowerCase().trim();
    if (!normalizedQuery) return true;

    const haystack = [
      meeting.filename,
      meeting.organizerName,
      meeting.attendeeSummary,
      meeting.notes,
      meeting.displayDate,
      meeting.statusLabel,
      meeting.statusNote,
      meeting.sourceType
    ].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes(normalizedQuery);
  }, []);

  const scheduledMeetings = allMeetings
    .filter((meeting) => (
      ['scheduled', 'missing', 'failed'].includes(meeting.lifecycleStatus) &&
      meetingMatchesQuery(meeting, scheduledSearchQuery)
    ))
    .sort((a, b) => getMeetingSortTimestamp(b) - getMeetingSortTimestamp(a));

  const completedMeetings = allMeetings
    .filter((meeting) => (
      ['completed', 'captured'].includes(meeting.lifecycleStatus) &&
      meetingMatchesQuery(meeting, completedSearchQuery)
    ))
    .sort((a, b) => getMeetingSortTimestamp(b) - getMeetingSortTimestamp(a));

  const handleMeetingFieldChange = (field, value) => {
    setMeetingForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setDictationSupported(Boolean(SpeechRecognition));
    setDictationFallbackSupported(Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia));
  }, []);

  React.useEffect(() => () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop dictation on cleanup:', error);
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('Failed to stop fallback recording on cleanup:', error);
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const handleScreenshotCandidateChange = (index, field, value) => {
    setScreenshotCandidates((current) => current.map((candidate, candidateIndex) => (
      candidateIndex === index
        ? { ...candidate, [field]: value }
        : candidate
    )));
  };

  const handleRemoveScreenshotCandidate = (index) => {
    setScreenshotCandidates((current) => current.filter((_, candidateIndex) => candidateIndex !== index));
  };

  const handleScreenshotUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setScreenshotBusy(true);
      setScreenshotError('');
      setScreenshotMessage('');
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('Authentication is required to import meetings from a screenshot.');
      }

      const uploadedFileNames = [];
      const extractedCandidateSets = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('screenshot', file);
        formData.append('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

        const response = await fetch('/api/meetings/import-screenshot', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body: formData
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || `Failed to parse ${file.name}.`);
        }

        uploadedFileNames.push(data.fileName || file.name);
        extractedCandidateSets.push((data.meetings || []).map((meeting) => ({
          ...meeting,
          confidence: Number(meeting.confidence || 0.5)
        })));
      }

      const mergedCandidates = mergeScreenshotCandidateSets([
        screenshotCandidates,
        ...extractedCandidateSets
      ]);

      setScreenshotFileNames((current) => [...current, ...uploadedFileNames]);
      setScreenshotCandidates(mergedCandidates);
      setScreenshotMessage(
        mergedCandidates.length
          ? 'Review the detected meetings below, make any edits you need, and then import them.'
          : 'No reliable meetings were detected in those screenshots. Try clearer day-view or event-detail captures.'
      );
    } catch (error) {
      setScreenshotError(error.message || 'Failed to parse the screenshot.');
    } finally {
      setScreenshotBusy(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleConfirmScreenshotImport = async () => {
    try {
      setScreenshotImportBusy(true);
      setScreenshotError('');
      setScreenshotMessage('');
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('Authentication is required to import meetings.');
      }

      const response = await fetch('/api/meetings/import-screenshot/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          meetings: screenshotCandidates.map((meeting) => ({
            ...meeting,
            confidence: undefined
          }))
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to import screenshot meetings.');
      }

      await refresh();
      setScreenshotCandidates([]);
      setScreenshotFileNames([]);
      setScreenshotMessage(data.message || 'Meetings imported from the screenshot.');
    } catch (error) {
      setScreenshotError(error.message || 'Failed to import screenshot meetings.');
    } finally {
      setScreenshotImportBusy(false);
    }
  };

  const handleEditMeeting = (meeting) => {
    closeNotesEditor();
    setEditingMeetingId(meeting.id);
    setMeetingMessage('');
    setMeetingError('');
    setMeetingForm({
      title: meeting.filename || '',
      meetingStartAt: meeting.meetingStartAt ? toDateTimeLocalValue(meeting.meetingStartAt) : '',
      meetingEndAt: meeting.meetingEndAt ? toDateTimeLocalValue(meeting.meetingEndAt) : '',
      organizerName: meeting.organizerName || '',
      attendeeSummary: meeting.attendeeSummary || '',
      externalMeetingUrl: meeting.externalMeetingUrl || '',
      notes: meeting.notes || ''
    });
  };

  const openNotesEditor = (meeting, mode = 'write') => {
    closeNotesEditor();
    resetMeetingForm();
    setMeetingMessage('');
    setMeetingError('');
    setNotesEditorMeetingId(meeting.id);
    setNotesEditorMode(mode);
    setNotesDraft('');
    setDictationStage('idle');
    setDictationInterimText('');
    setDictationChunks([]);
    dictationBaseTextRef.current = '';
    dictationCommittedTextRef.current = '';
  };

  const handleUseMeeting = (meeting) => {
    onSelectMeetingContext({
      id: meeting.id,
      title: meeting.filename,
      start: meeting.meetingStartAt || meeting.uploadedAt,
      end: meeting.meetingEndAt || meeting.meetingStartAt || meeting.uploadedAt,
      organizer: meeting.organizerName || 'Organizer not set'
    });
    setActiveTab('upload');
  };

  const handleArchiveToggle = async (meeting, action) => {
    try {
      setArchiveBusyId(meeting.id);
      setMeetingMessage('');
      setMeetingError('');
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('Authentication is required to manage meeting workspaces.');
      }

      const response = await fetch(`/api/meetings/${meeting.id}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Failed to ${action} meeting workspace.`);
      }

      await refresh();
      setMeetingMessage(action === 'archive' ? 'Meeting workspace archived.' : 'Meeting workspace restored.');
    } catch (error) {
      setMeetingError(error.message || 'Failed to update meeting workspace.');
    } finally {
      setArchiveBusyId(null);
    }
  };

  const handleRunTodaysReview = async () => {
    try {
      setReviewBusy(true);
      setMeetingMessage('');
      setMeetingError('');
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('Authentication is required to run the day review.');
      }

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const targetDate = getLocalDateKeyForBrowser(timeZone, new Date());
      const response = await fetch('/api/meetings/end-of-day-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          timeZone,
          targetDate
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to run today\'s meeting review.');
      }

      await refresh();
      setMeetingMessage(
        `Today's review is up to date. ${data.summary?.captured || 0} captured, ${data.summary?.completed || 0} completed, ${data.summary?.missing || 0} missing.`
      );
    } catch (error) {
      setMeetingError(error.message || 'Failed to run today\'s meeting review.');
    } finally {
      setReviewBusy(false);
    }
  };

  const handleDeleteMeeting = async (meeting) => {
    try {
      setMeetingMessage('');
      setMeetingError('');
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('Authentication is required to remove meetings from the schedule.');
      }

      const confirmed = window.confirm(`Remove "${meeting.filename}" from your schedule?`);
      if (!confirmed) {
        return;
      }

      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to delete meeting.');
      }

      await refresh();
      setMeetingMessage(data.message || 'Meeting removed from your schedule.');
    } catch (error) {
      setMeetingError(error.message || 'Failed to delete meeting.');
    }
  };

  const handleSaveNotes = async () => {
    if (!notesEditorMeetingId) return;
    const meeting = allMeetings.find((entry) => entry.id === notesEditorMeetingId);
    if (!meeting) {
      setMeetingError('Meeting not found.');
      return;
    }
    const notes = notesDraft.trim();
    if (!notes) {
      setMeetingError('Please add some notes before saving.');
      return;
    }
    try {
      setSavingNotes(true);
      setMeetingMessage('');
      setMeetingError('');
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('Authentication is required to complete meetings from notes.');
      }

      const response = await fetch(`/api/meetings/${meeting.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          notes,
          captureMethod: notesEditorMode === 'record' ? 'dictated_notes' : 'written_notes'
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to complete meeting from notes.');
      }

      await refresh();
      closeNotesEditor();
      setMeetingMessage(
        notesEditorMode === 'record'
          ? 'Meeting completed with dictated notes and summarized for Ask Acestar.'
          : 'Meeting completed with notes and summarized for Ask Acestar.'
      );
    } catch (error) {
      setMeetingError(error.message || 'Failed to complete meeting from notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleToggleDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (dictationActive && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }
    if (dictationActive && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      return;
    }

    if (!SpeechRecognition) {
      handleFallbackDictationRecording();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setMeetingError('');
      setDictationActive(true);
      setDictationStage('listening');
      setDictationInterimText('');
      dictationBaseTextRef.current = notesDraft.trim();
      dictationCommittedTextRef.current = '';
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || '';
        if (event.results[index].isFinal) {
          const cleanedTranscript = transcript.trim();
          if (cleanedTranscript) {
            setDictationChunks((current) => [...current, cleanedTranscript]);
            dictationCommittedTextRef.current = [dictationCommittedTextRef.current, cleanedTranscript].filter(Boolean).join(' ').trim();
          }
        } else {
          interimTranscript += transcript;
        }
      }

      setDictationInterimText(interimTranscript.trim());
      const nextDraft = [
        dictationBaseTextRef.current,
        dictationCommittedTextRef.current,
        interimTranscript.trim()
      ].filter(Boolean).join(' ').trim();
      setNotesDraft(nextDraft);
    };

    recognition.onerror = (event) => {
      setDictationActive(false);
      setDictationStage('idle');
      setDictationInterimText('');
      setMeetingError(event.error === 'not-allowed'
        ? 'Microphone access was blocked. Please allow microphone access to record a note.'
        : 'Dictation stopped unexpectedly. Please try again.');
    };

    recognition.onend = () => {
      setDictationActive(false);
      setDictationStage('idle');
      setDictationInterimText('');
      const finalDraft = [
        dictationBaseTextRef.current,
        dictationCommittedTextRef.current
      ].filter(Boolean).join(' ').trim();
      setNotesDraft(finalDraft);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const handleFallbackDictationRecording = async () => {
    if (!dictationFallbackSupported) {
      setMeetingError('Dictation is not supported in this browser.');
      return;
    }

    try {
      setMeetingError('');
      setDictationStage('listening');
      setDictationInterimText('');
      mediaChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeTypeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4'
      ];
      const mimeType = mimeTypeCandidates.find((candidate) => window.MediaRecorder.isTypeSupported?.(candidate)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.onstart = () => {
        setDictationActive(true);
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setDictationActive(false);
        setDictationStage('idle');
        setMeetingError('Recording the dictated note failed. Please try again.');
      };

      recorder.onstop = async () => {
        setDictationActive(false);

        const recordedChunks = mediaChunksRef.current || [];
        mediaChunksRef.current = [];

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        if (!recordedChunks.length) {
          setDictationStage('idle');
          return;
        }

        try {
          setDictationStage('transcribing');
          const blobType = recorder.mimeType || 'audio/webm';
          const extension = blobType.includes('mp4') ? 'm4a' : blobType.includes('ogg') ? 'ogg' : 'webm';
          const audioBlob = new Blob(recordedChunks, { type: blobType });
          const file = new File([audioBlob], `dictated-note.${extension}`, { type: blobType });
          const formData = new FormData();
          formData.append('audio', file);

          const authToken = localStorage.getItem('auth_token');
          if (!authToken) {
            throw new Error('Authentication is required to transcribe a dictated note.');
          }

          const response = await fetch('/api/meetings/dictate/transcribe', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken}`
            },
            body: formData
          });
          const data = await response.json();
          if (!response.ok || !data.ok) {
            throw new Error(data.error || 'Failed to transcribe dictated note.');
          }

          const transcript = String(data.transcript || '').trim();
          if (transcript) {
            setDictationChunks((current) => [...current, transcript]);
            setNotesDraft((current) => [current.trim(), transcript].filter(Boolean).join(' ').trim());
          }
          setDictationStage('idle');
        } catch (error) {
          setDictationStage('idle');
          setMeetingError(error.message || 'Failed to transcribe dictated note.');
        }
      };

      recorder.start();
    } catch (error) {
      setDictationActive(false);
      setDictationStage('idle');
      setMeetingError(error.message || 'Microphone access is required to record a note.');
    }
  };

  const handleSaveMeeting = async (event) => {
    event.preventDefault();
    setSavingMeeting(true);
    setMeetingMessage('');
    setMeetingError('');

    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      setMeetingError('Authentication is required to save meeting workspaces.');
      setSavingMeeting(false);
      return;
    }

    try {
      const response = await fetch(editingMeetingId ? `/api/meetings/${editingMeetingId}` : '/api/meetings', {
        method: editingMeetingId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ...meetingForm,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to save meeting workspace.');
      }

      await refresh();
      setMeetingMessage(editingMeetingId ? 'Meeting workspace updated.' : 'Meeting workspace created.');
      resetMeetingForm();
    } catch (error) {
      setMeetingError(error.message || 'Failed to save meeting workspace.');
    } finally {
      setSavingMeeting(false);
    }
  };

  return (
    <div className="record-tab meetings-tab">
      <div className="record-header">
        <div className="record-header-top">
          <div>
            <h1 className="tab-title">Meetings</h1>
            <p className="tab-subtitle">
              Import each day’s meetings from Outlook screenshots, then complete them with recordings or notes as the day moves forward.
            </p>
          </div>
        </div>
      </div>

      <div className="record-tab-content">
        <div className="record-left-column">
          {meetingMessage && <div className="alert alert-success">{meetingMessage}</div>}
          {meetingError && <div className="alert alert-error">{meetingError}</div>}

          <section className="account-panel meetings-compose-panel">
            <div className="meetings-section-header">
              <div>
                <h2 className="account-section-title">Import daily meetings from screenshot</h2>
                <p className="tab-subtitle">Upload one or more day-view or event-detail screenshots, review the merged meeting details, then import them into AcestarAI in one pass.</p>
              </div>
              <button
                className="btn-secondary-large"
                type="button"
                onClick={() => screenshotInputRef.current?.click()}
                disabled={screenshotBusy}
              >
                {screenshotBusy ? 'Reading screenshots...' : 'Upload calendar screenshots'}
              </button>
              <input
                ref={screenshotInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="visually-hidden"
                onChange={handleScreenshotUpload}
              />
            </div>

            {screenshotMessage && <div className="alert alert-success">{screenshotMessage}</div>}
            {screenshotError && <div className="alert alert-error">{screenshotError}</div>}

            <div className="screenshot-import-panel">
              <div className="screenshot-import-summary">
                <div className="screenshot-import-title">
                  {screenshotFileNames.length > 0
                    ? `${screenshotFileNames.length} screenshot${screenshotFileNames.length === 1 ? '' : 's'} uploaded`
                    : 'No screenshots uploaded yet'}
                </div>
                <div className="file-meta">
                  {screenshotCandidates.length > 0
                    ? `${screenshotCandidates.length} meeting${screenshotCandidates.length === 1 ? '' : 's'} detected and ready for review.`
                    : 'Best results come from a mix of day-view screenshots and event-detail screenshots with visible organizer and attendee information.'}
                </div>
              </div>

              {screenshotFileNames.length > 0 && (
                <div className="screenshot-uploaded-list">
                  {screenshotFileNames.map((fileName, index) => (
                    <span key={`${fileName}-${index}`} className="screenshot-uploaded-chip">{fileName}</span>
                  ))}
                </div>
              )}

              {screenshotCandidates.length > 0 && (
                <div className="screenshot-review-list">
                  {screenshotCandidates.map((candidate, index) => (
                    <div key={`candidate-${index}`} className="screenshot-review-card">
                      <div className="screenshot-review-header">
                        <div className="screenshot-review-title">Detected meeting {index + 1}</div>
                        <div className="screenshot-review-meta">
                          Confidence {Math.round(Number(candidate.confidence || 0) * 100)}%
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Meeting title</label>
                        <input
                          type="text"
                          value={candidate.title || ''}
                          onChange={(e) => handleScreenshotCandidateChange(index, 'title', e.target.value)}
                          disabled={screenshotImportBusy}
                        />
                      </div>

                      <div className="meetings-form-grid">
                        <div className="form-group">
                          <label>Meeting date and time</label>
                          <input
                            type="datetime-local"
                            value={candidate.meetingStartAt ? toDateTimeLocalValue(candidate.meetingStartAt) : ''}
                            onChange={(e) => handleScreenshotCandidateChange(index, 'meetingStartAt', e.target.value)}
                            disabled={screenshotImportBusy}
                          />
                        </div>

                        <div className="form-group">
                          <label>Meeting end time</label>
                          <input
                            type="datetime-local"
                            value={candidate.meetingEndAt ? toDateTimeLocalValue(candidate.meetingEndAt) : ''}
                            onChange={(e) => handleScreenshotCandidateChange(index, 'meetingEndAt', e.target.value)}
                            disabled={screenshotImportBusy}
                          />
                        </div>
                      </div>

                      <div className="meetings-form-grid">
                        <div className="form-group">
                          <label>Organizer</label>
                          <input
                            type="text"
                            value={candidate.organizerName || ''}
                            onChange={(e) => handleScreenshotCandidateChange(index, 'organizerName', e.target.value)}
                            disabled={screenshotImportBusy}
                          />
                        </div>

                        <div className="form-group">
                          <label>Attendees</label>
                          <input
                            type="text"
                            value={candidate.attendeeSummary || ''}
                            onChange={(e) => handleScreenshotCandidateChange(index, 'attendeeSummary', e.target.value)}
                            disabled={screenshotImportBusy}
                          />
                        </div>
                      </div>

                      <div className="meetings-form-actions">
                        <button
                          className="account-back-button"
                          type="button"
                          onClick={() => handleRemoveScreenshotCandidate(index)}
                          disabled={screenshotImportBusy}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="meetings-form-actions">
                    <button
                      className="btn-primary-large"
                      type="button"
                      onClick={handleConfirmScreenshotImport}
                      disabled={screenshotImportBusy || screenshotCandidates.length === 0}
                    >
                      {screenshotImportBusy ? 'Importing...' : 'Import detected meetings'}
                    </button>
                    <button
                      className="btn-secondary-large"
                      type="button"
                      onClick={() => {
                        setScreenshotCandidates([]);
                        setScreenshotFileNames([]);
                        setScreenshotMessage('');
                        setScreenshotError('');
                      }}
                      disabled={screenshotImportBusy}
                    >
                      Clear review
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {editingMeetingId && (
          <section className="account-panel meetings-compose-panel">
            <div className="meetings-section-header">
              <div>
                <h2 className="account-section-title">Edit meeting details</h2>
                <p className="tab-subtitle">Update the schedule or context for the selected meeting before you complete it with a recording or notes.</p>
              </div>
            </div>
            <form className="account-form meetings-form" onSubmit={handleSaveMeeting}>
              <div className="form-group">
                <label htmlFor="meetingTitle">Meeting title</label>
                <input
                  id="meetingTitle"
                  type="text"
                  value={meetingForm.title}
                  onChange={(e) => handleMeetingFieldChange('title', e.target.value)}
                  placeholder="Client discovery with Acme"
                  disabled={savingMeeting}
                />
              </div>

              <div className="meetings-form-grid">
                <div className="form-group">
                  <label htmlFor="meetingStartAt">Meeting start time</label>
                  <input
                    id="meetingStartAt"
                    type="datetime-local"
                    value={meetingForm.meetingStartAt}
                    onChange={(e) => handleMeetingFieldChange('meetingStartAt', e.target.value)}
                    disabled={savingMeeting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="meetingEndAt">Meeting end time</label>
                  <input
                    id="meetingEndAt"
                    type="datetime-local"
                    value={meetingForm.meetingEndAt}
                    onChange={(e) => handleMeetingFieldChange('meetingEndAt', e.target.value)}
                    disabled={savingMeeting}
                  />
                </div>
              </div>

              <div className="meetings-form-grid">
                <div className="form-group">
                  <label htmlFor="organizerName">Organizer</label>
                  <input
                    id="organizerName"
                    type="text"
                    value={meetingForm.organizerName}
                    onChange={(e) => handleMeetingFieldChange('organizerName', e.target.value)}
                    placeholder="Meeting owner or host"
                    disabled={savingMeeting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="attendeeSummary">Attendees</label>
                  <input
                    id="attendeeSummary"
                    type="text"
                    value={meetingForm.attendeeSummary}
                    onChange={(e) => handleMeetingFieldChange('attendeeSummary', e.target.value)}
                    placeholder="Names or team list"
                    disabled={savingMeeting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="externalMeetingUrl">Meeting link</label>
                <input
                  id="externalMeetingUrl"
                  type="url"
                  value={meetingForm.externalMeetingUrl}
                  onChange={(e) => handleMeetingFieldChange('externalMeetingUrl', e.target.value)}
                  placeholder="Optional Teams or meeting URL"
                  disabled={savingMeeting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="meetingNotes">Notes</label>
                <textarea
                  id="meetingNotes"
                  rows="4"
                  value={meetingForm.notes}
                  onChange={(e) => handleMeetingFieldChange('notes', e.target.value)}
                  placeholder="Capture meeting purpose, account context, or anything you want preserved before the recording arrives."
                  disabled={savingMeeting}
                />
              </div>

              <div className="meetings-form-actions">
                <button className="btn-primary-large" type="submit" disabled={savingMeeting}>
                  {savingMeeting ? 'Saving...' : 'Update meeting'}
                </button>
                <button className="btn-secondary-large" type="button" onClick={resetMeetingForm} disabled={savingMeeting}>
                  Close editor
                </button>
              </div>
            </form>
          </section>
          )}

          {notesEditorMeetingId && (() => {
            const activeNotesMeeting = allMeetings.find((meeting) => meeting.id === notesEditorMeetingId);
            if (!activeNotesMeeting) return null;

            return (
              <section className="account-panel meetings-compose-panel">
                <div className="meetings-section-header">
                  <div>
                    <h2 className="account-section-title">{notesEditorMode === 'record' ? 'Record notes' : 'Write notes'}</h2>
                    <p className="tab-subtitle">
                      {activeNotesMeeting.filename}
                      {activeNotesMeeting.meetingStartAt ? ` • ${formatMeetingTimeRange(activeNotesMeeting.meetingStartAt, activeNotesMeeting.meetingEndAt)}` : ''}
                    </p>
                  </div>
                  {notesEditorMode === 'record' && (
                    <button
                      className={`btn-secondary-large ${dictationActive ? 'dictation-active-button' : ''}`}
                      type="button"
                      onClick={handleToggleDictation}
                      disabled={(!dictationSupported && !dictationFallbackSupported) || savingNotes || dictationStage === 'transcribing'}
                      title={dictationSupported
                        ? 'Start or stop live dictation'
                        : dictationFallbackSupported
                          ? 'Start or stop recording a note for backend transcription'
                          : 'Dictation is not supported in this browser'}
                    >
                      {dictationStage === 'transcribing'
                        ? 'Transcribing...'
                        : dictationActive
                          ? 'Stop microphone'
                          : dictationSupported
                            ? 'Microphone'
                            : 'Record voice note'}
                    </button>
                  )}
                </div>

                {notesEditorMode === 'record' && (
                  <div className="dictation-status-panel">
                    <div className={`dictation-status-badge ${dictationStage}`}>
                      <span className="dictation-status-dot" aria-hidden="true" />
                      {dictationStage === 'listening' && (dictationSupported ? 'Listening live' : 'Recording voice note')}
                      {dictationStage === 'transcribing' && 'Transcribing note'}
                      {dictationStage === 'idle' && 'Ready to record'}
                    </div>
                    <div className="dictation-status-copy">
                      {dictationSupported
                        ? 'Live dictation will stream the transcript directly into the notes editor below.'
                        : dictationFallbackSupported
                          ? 'This browser will record a short voice note, send it through the backend transcription stack, and place the returned transcript in the editor below.'
                          : 'Dictation is not available in this browser.'}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="meetingNotesEditor">
                    {notesEditorMode === 'record' ? 'Transcribed dictated notes' : 'Meeting notes'}
                  </label>
                  <textarea
                    id="meetingNotesEditor"
                    rows="12"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder={notesEditorMode === 'record'
                      ? 'Click the microphone to dictate your note, or type to refine the transcription.'
                      : 'Type your notes here in paragraphs or bullet points.'}
                    disabled={savingNotes || dictationStage === 'transcribing'}
                    className="meeting-notes-editor"
                  />
                  <small>
                    {notesEditorMode === 'record'
                      ? 'Dictated notes are transcribed into editable text before being saved and summarized.'
                      : 'You can write in paragraph form or use bullet points. These notes will be summarized for Ask Acestar.'}
                  </small>
                </div>

                <div className="meetings-form-actions">
                  <button className="btn-primary-large" type="button" onClick={handleSaveNotes} disabled={savingNotes}>
                    {savingNotes ? 'Updating...' : 'Update Notes'}
                  </button>
                  <button className="btn-secondary-large" type="button" onClick={closeNotesEditor} disabled={savingNotes}>
                    Close Editor
                  </button>
                </div>
              </section>
            );
          })()}
        </div>

        <div className="record-right-column">
          <aside className="meetings-sidepanel">
            <section className="meetings-sidepanel-section">
              <div className="meetings-section-header">
                <div>
                  <h2 className="section-title">Scheduled Meetings</h2>
                  <div className="tab-subtitle">Meetings that are scheduled and need a recording or notes</div>
                </div>
                <span className="recent-uploads-badge">{scheduledMeetings.length}</span>
              </div>

              <div className="search-container meetings-search-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search scheduled meetings"
                  value={scheduledSearchQuery}
                  onChange={(e) => setScheduledSearchQuery(e.target.value)}
                />
              </div>

              <div className="meetings-sidepanel-list">
                {historyLoading ? (
                  <div className="file-card">
                    <div className="file-info">
                      <div className="file-name">Loading scheduled meetings...</div>
                    </div>
                  </div>
                ) : scheduledMeetings.length === 0 ? (
                  <div className="file-card">
                    <div className="file-info">
                      <div className="file-name">No scheduled meetings found</div>
                      <div className="file-meta">Import a screenshot or adjust the search above.</div>
                    </div>
                  </div>
                ) : scheduledMeetings.map((meeting) => {
                  const needsCompletion = pendingCompletionSet.has(meeting.id);

                  if (needsCompletion) {
                    return (
                      <div key={`scheduled-pending-${meeting.id}`} className="meeting-workspace-card meeting-prompt-card">
                        <div className="meeting-workspace-top">
                          <div className="meeting-workspace-icon">⏰</div>
                          <div className="meeting-workspace-heading">
                            <div className="meeting-workspace-title-row">
                              <div className="meeting-workspace-title">{meeting.filename}</div>
                              <div className="meeting-card-top-actions">
                                <button className="meeting-card-icon-button" type="button" onClick={() => handleDeleteMeeting(meeting)} title="Cancelled" aria-label="Cancelled">
                                  <span className="meeting-card-icon-symbol" aria-hidden="true">🗑</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="meeting-card-status-block">
                          <div className="meeting-card-status-row">
                            <span className="badge badge-scheduled-card">{meeting.statusLabel}</span>
                            <div className="meeting-card-time-info">
                              {meeting.meetingStartAt ? formatMeetingTimeRange(meeting.meetingStartAt, meeting.meetingEndAt) : 'Meeting time not set'}
                            </div>
                          </div>
                        </div>

                        <div className="meeting-prompt-meta">
                          {meeting.meetingEndAt && (
                            <div className="meeting-prompt-chip">Ended {formatDateTimeWithFallback(meeting.meetingEndAt)}</div>
                          )}
                          {meeting.organizerName && (
                            <div className="meeting-prompt-chip">Organizer: {meeting.organizerName}</div>
                          )}
                          {meeting.attendeeSummary && (
                            <div className="meeting-prompt-chip">Attendees: {meeting.attendeeSummary}</div>
                          )}
                        </div>

                        <div className="meeting-workspace-details meeting-prompt-details">
                          <div className="meeting-prompt-note">
                            Add a recording or notes so Acestar AI can generate the recap and searchable knowledge for this meeting.
                          </div>
                        </div>

                        <div className="meeting-workspace-actions meeting-prompt-actions">
                          <button className="btn-secondary-large" onClick={() => handleEditMeeting(meeting)}>
                            Edit
                          </button>
                          <button className="btn-primary-large" onClick={() => handleUseMeeting(meeting)}>
                            Upload recording
                          </button>
                          <button className="btn-secondary-large" onClick={() => openNotesEditor(meeting, 'write')}>
                            Write Notes
                          </button>
                          <button className="btn-secondary-large" type="button" onClick={() => openNotesEditor(meeting, 'record')}>
                            Record Note
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={meeting.id} className="meeting-workspace-card">
                      <div className="meeting-workspace-top">
                        <div className="meeting-workspace-icon">{meeting.icon}</div>
                        <div className="meeting-workspace-heading">
                          <div className="meeting-workspace-title-row">
                            <div className="meeting-workspace-title">{meeting.filename}</div>
                            <div className="meeting-card-top-actions">
                              <button className="meeting-card-icon-button" type="button" onClick={() => handleDeleteMeeting(meeting)} title="Cancelled" aria-label="Cancelled">
                                <span className="meeting-card-icon-symbol" aria-hidden="true">🗑</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="meeting-card-status-block">
                        <div className="meeting-card-status-row">
                          <span className="badge badge-scheduled-card">{meeting.statusLabel}</span>
                          <div className="meeting-card-time-info">
                            {meeting.meetingStartAt
                              ? formatMeetingTimeRange(meeting.meetingStartAt, meeting.meetingEndAt)
                              : 'Date not set'}
                          </div>
                        </div>
                      </div>

                      <div className="meeting-workspace-details">
                        <div className="meeting-workspace-row">
                          <div className="meeting-workspace-label">Meeting details</div>
                          <div className="meeting-workspace-value">
                            {meeting.organizerName ? `Organizer: ${meeting.organizerName}` : 'Organizer not set'}
                            {meeting.attendeeSummary ? ` • Attendees: ${meeting.attendeeSummary}` : ''}
                          </div>
                        </div>

                        {meeting.statusNote && (
                          <div className="meeting-workspace-row">
                            <div className="meeting-workspace-label">Meeting status</div>
                            <div className={`meeting-workspace-note ${meeting.statusTone}`}>
                              {meeting.statusNote}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="meeting-workspace-actions">
                        <button className="btn-secondary-large" onClick={() => handleEditMeeting(meeting)}>
                          Edit
                        </button>
                        <button className="btn-secondary-large" onClick={() => openNotesEditor(meeting, 'write')}>
                          Complete with notes
                        </button>
                        <button className="btn-primary-large" onClick={() => handleUseMeeting(meeting)}>
                          Upload
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="meetings-sidepanel-section">
              <div className="meetings-section-header">
                <div>
                  <h2 className="section-title">Completed Meetings</h2>
                  <div className="tab-subtitle">Meetings with linked notes or recordings.</div>
                </div>
                <span className="recent-uploads-badge">{completedMeetings.length}</span>
              </div>

              <div className="search-container meetings-search-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search completed meetings"
                  value={completedSearchQuery}
                  onChange={(e) => setCompletedSearchQuery(e.target.value)}
                />
              </div>

              <div className="meetings-sidepanel-list">
                {historyLoading ? (
                  <div className="file-card">
                    <div className="file-info">
                      <div className="file-name">Loading completed meetings...</div>
                    </div>
                  </div>
                ) : completedMeetings.length === 0 ? (
                  <div className="file-card">
                    <div className="file-info">
                      <div className="file-name">No completed meetings yet</div>
                      <div className="file-meta">Once a meeting has notes or a recording, it will move here.</div>
                    </div>
                  </div>
                ) : completedMeetings.map((meeting) => (
                  <div key={meeting.id} className="meeting-workspace-card">
                    <div className="meeting-workspace-top">
                      <div className="meeting-workspace-icon">{meeting.icon}</div>
                      <div className="meeting-workspace-heading">
                        <div className="meeting-workspace-title-row">
                          <div className="meeting-workspace-title">{meeting.filename}</div>
                          <span className={`badge ${meeting.statusBadgeClass}`}>{meeting.statusLabel}</span>
                        </div>
                        <div className="meeting-workspace-source">
                          {meeting.captureMethod === 'recording' ? 'Completed with recording' : 'Completed with notes'}
                        </div>
                      </div>
                    </div>

                    <div className="meeting-workspace-details">
                        <div className="meeting-workspace-row">
                          <div className="meeting-workspace-label">Meeting details</div>
                          <div className="meeting-workspace-value">
                            {meeting.meetingStartAt
                              ? formatMeetingTimeRange(meeting.meetingStartAt, meeting.meetingEndAt)
                              : 'Date not set'}
                            {meeting.organizerName ? ` • ${meeting.organizerName}` : ''}
                            {meeting.attendeeSummary ? ` • ${meeting.attendeeSummary}` : ''}
                          </div>
                      </div>

                      {meeting.relatedOutputs.length > 0 && (
                        <div className="meeting-workspace-row">
                          <div className="meeting-workspace-label">Linked outputs</div>
                          <div className="meeting-workspace-value">{meeting.relatedOutputs.join(', ')}</div>
                        </div>
                      )}

                      {meeting.statusNote && (
                        <div className="meeting-workspace-row">
                          <div className="meeting-workspace-label">Meeting status</div>
                          <div className={`meeting-workspace-note ${meeting.statusTone}`}>
                            {meeting.statusNote}
                          </div>
                        </div>
                      )}

                      {meeting.notes && (
                        <div className="meeting-workspace-row">
                          <div className="meeting-workspace-label">Saved notes</div>
                          <div className="meeting-card-notes">
                            {truncateText(meeting.notes, 180)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="meeting-workspace-actions">
                      <button className="btn-secondary-large" onClick={() => handleEditMeeting(meeting)}>
                        Edit
                      </button>
                      <button className="btn-primary-large" onClick={() => handleUseMeeting(meeting)}>
                        Upload
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function AccountTab({
  accountProfile,
  storageUsage,
  accountLoading,
  browserNotificationsSupported,
  browserNotificationPermission,
  browserNotificationsEnabled,
  onEnableBrowserNotifications,
  onDisableBrowserNotifications,
  onBack,
  refresh
}) {
  const { user, updateAccount } = useAuth();
  const [fullName, setFullName] = React.useState(user?.full_name || '');
  const [defaultTranscriptType, setDefaultTranscriptType] = React.useState('standard');
  const [defaultSpeakerDiarization, setDefaultSpeakerDiarization] = React.useState(false);
  const [defaultSummaryType, setDefaultSummaryType] = React.useState('standard');
  const [preferredExportFormat, setPreferredExportFormat] = React.useState('pdf');
  const [timeZone, setTimeZone] = React.useState('UTC');
  const [morningPlanningEmailEnabled, setMorningPlanningEmailEnabled] = React.useState(true);
  const [endOfDayDigestEnabled, setEndOfDayDigestEnabled] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  React.useEffect(() => {
    setFullName(accountProfile?.fullName || user?.full_name || '');
    setDefaultTranscriptType(accountProfile?.defaultTranscriptType || 'standard');
    setDefaultSpeakerDiarization(Boolean(accountProfile?.defaultSpeakerDiarization));
    setDefaultSummaryType(accountProfile?.defaultSummaryType || 'standard');
    setPreferredExportFormat(accountProfile?.preferredExportFormat || 'pdf');
    setTimeZone(accountProfile?.timeZone || browserTimeZone);
    setMorningPlanningEmailEnabled(accountProfile?.morningPlanningEmailEnabled !== false);
    setEndOfDayDigestEnabled(accountProfile?.endOfDayDigestEnabled !== false);
  }, [
    accountProfile?.fullName,
    accountProfile?.defaultTranscriptType,
    accountProfile?.defaultSpeakerDiarization,
    accountProfile?.defaultSummaryType,
    accountProfile?.preferredExportFormat,
    accountProfile?.timeZone,
    accountProfile?.morningPlanningEmailEnabled,
    accountProfile?.endOfDayDigestEnabled,
    browserTimeZone,
    user?.full_name
  ]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await updateAccount({
        fullName,
        defaultTranscriptType,
        defaultSpeakerDiarization,
        defaultSummaryType,
        preferredExportFormat,
        timeZone,
        morningPlanningEmailEnabled,
        endOfDayDigestEnabled
      });
      await refresh();
      setMessage('Account preferences saved successfully.');
    } catch (saveError) {
      setError(saveError.message || 'Failed to save account preferences');
    } finally {
      setSaving(false);
    }
  };

  const usage = storageUsage || {
    totalBytes: 0,
    totalFiles: 0,
    audioCount: 0,
    transcriptCount: 0,
    summaryCount: 0,
    audioBytes: 0,
    transcriptBytes: 0,
    summaryBytes: 0,
    latestActivityAt: null,
    storageLimitBytes: 50 * 1024 * 1024,
    remainingBytes: 50 * 1024 * 1024
  };
  const storagePercent = usage.storageLimitBytes > 0
    ? Math.min((usage.totalBytes / usage.storageLimitBytes) * 100, 100)
    : 0;

  return (
    <div className="account-page">
      <div className="account-page-topbar">
        <button className="account-back-button" onClick={onBack}>
          ← Back to workspace
        </button>
      </div>

      <div className="account-tab">
      <div className="account-header">
        <h1 className="tab-title">Account settings</h1>
        <p className="tab-subtitle">Manage your profile details and monitor storage usage for your AcestarAI workspace.</p>
      </div>

      <div className="account-grid">
        <section className="account-panel">
          <h2 className="account-section-title">Profile</h2>
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <form className="account-form" onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="accountFullName">Full name</label>
              <input
                id="accountFullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your preferred display name"
                disabled={saving || accountLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="accountEmail">Email</label>
              <input
                id="accountEmail"
                type="email"
                value={accountProfile?.email || user?.email || ''}
                readOnly
                disabled
              />
              <small>Sign-in email is managed through your AcestarAI account.</small>
            </div>

            <div className="account-meta-grid">
              <div className="account-meta-card">
                <div className="account-meta-label">Member since</div>
                <div className="account-meta-value">{formatDateWithFallback(accountProfile?.createdAt)}</div>
              </div>
              <div className="account-meta-card">
                <div className="account-meta-label">Last sign-in</div>
                <div className="account-meta-value">{formatDateWithFallback(accountProfile?.lastLogin)}</div>
              </div>
            </div>

            <button className="btn-primary-large" type="submit" disabled={saving || accountLoading}>
              {saving ? 'Saving...' : 'Save profile & preferences'}
            </button>
          </form>
        </section>

        <section className="account-panel">
          <h2 className="account-section-title">Workspace defaults</h2>
            <div className="account-preferences-stack">
            <div className="form-group">
              <label htmlFor="accountTimeZone">Time zone</label>
              <input
                id="accountTimeZone"
                type="text"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                placeholder="America/New_York"
                disabled={saving || accountLoading}
              />
              <small>
                Used for 8 AM planning reminders and 6 PM daily digests. Browser detected: {browserTimeZone}.
              </small>
            </div>

            <div className="account-preference-card">
              <div className="account-preference-copy">
                <div className="account-preference-title">Default transcription mode</div>
                <div className="account-preference-description">Choose whether the transcription screen should open in standard or customized mode by default.</div>
              </div>
              <div className="account-segmented-control" role="radiogroup" aria-label="Default transcription mode">
                <button
                  type="button"
                  className={`account-segmented-option ${defaultTranscriptType === 'standard' ? 'selected' : ''}`}
                  onClick={() => setDefaultTranscriptType('standard')}
                  disabled={saving || accountLoading}
                >
                  Standard
                </button>
                <button
                  type="button"
                  className={`account-segmented-option ${defaultTranscriptType === 'custom' ? 'selected' : ''}`}
                  onClick={() => setDefaultTranscriptType('custom')}
                  disabled={saving || accountLoading}
                >
                  Customized
                </button>
              </div>
            </div>

            <label className="account-toggle-row">
              <div className="account-preference-copy">
                <div className="account-preference-title">Enable speaker diarization by default</div>
                <div className="account-preference-description">Pre-select speaker separation whenever a user opens the transcription workflow.</div>
              </div>
              <input
                type="checkbox"
                checked={defaultSpeakerDiarization}
                onChange={(e) => setDefaultSpeakerDiarization(e.target.checked)}
                disabled={saving || accountLoading}
              />
            </label>

            <div className="account-preference-card">
              <div className="account-preference-copy">
                <div className="account-preference-title">Default summary style</div>
                <div className="account-preference-description">Set the summary experience the app should open with after a transcript is ready.</div>
              </div>
              <div className="account-segmented-control" role="radiogroup" aria-label="Default summary style">
                <button
                  type="button"
                  className={`account-segmented-option ${defaultSummaryType === 'standard' ? 'selected' : ''}`}
                  onClick={() => setDefaultSummaryType('standard')}
                  disabled={saving || accountLoading}
                >
                  Standard
                </button>
                <button
                  type="button"
                  className={`account-segmented-option ${defaultSummaryType === 'structured' ? 'selected' : ''}`}
                  onClick={() => setDefaultSummaryType('structured')}
                  disabled={saving || accountLoading}
                >
                  Structured
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="preferredExportFormat">Preferred export format</label>
              <select
                id="preferredExportFormat"
                className="account-select"
                value={preferredExportFormat}
                onChange={(e) => setPreferredExportFormat(e.target.value)}
                disabled={saving || accountLoading}
              >
                <option value="pdf">PDF</option>
                <option value="markdown">Markdown</option>
                <option value="text">Plain text</option>
              </select>
              <small>This preference is stored now and will be used as export choices become configurable across the app.</small>
            </div>

            <label className="account-toggle-row">
              <div className="account-preference-copy">
                <div className="account-preference-title">8 AM planning reminder email</div>
                <div className="account-preference-description">Send a morning reminder to import today’s meetings if nothing has been scheduled yet.</div>
              </div>
              <input
                type="checkbox"
                checked={morningPlanningEmailEnabled}
                onChange={(e) => setMorningPlanningEmailEnabled(e.target.checked)}
                disabled={saving || accountLoading}
              />
            </label>

            <label className="account-toggle-row">
              <div className="account-preference-copy">
                <div className="account-preference-title">6 PM daily digest email</div>
                <div className="account-preference-description">Send an end-of-day summary of captured, completed, and missing meetings.</div>
              </div>
              <input
                type="checkbox"
                checked={endOfDayDigestEnabled}
                onChange={(e) => setEndOfDayDigestEnabled(e.target.checked)}
                disabled={saving || accountLoading}
              />
            </label>

            <div className="account-preference-card">
              <div className="account-preference-copy">
                <div className="account-preference-title">Browser notifications for incomplete meetings</div>
                <div className="account-preference-description">
                  Show browser notifications while AcestarAI is open whenever a scheduled meeting ends and still needs a recording, written notes, or a voice note.
                </div>
              </div>
              <div className="account-notification-actions">
                <span className={`account-inline-badge ${
                  !browserNotificationsSupported
                    ? 'disabled'
                    : browserNotificationsEnabled && browserNotificationPermission === 'granted'
                      ? 'enabled'
                      : 'pending'
                }`}>
                  {!browserNotificationsSupported
                    ? 'Unsupported'
                    : browserNotificationsEnabled && browserNotificationPermission === 'granted'
                      ? 'Enabled'
                      : browserNotificationPermission === 'denied'
                        ? 'Blocked in browser'
                        : 'Permission required'}
                </span>
                <button
                  type="button"
                  className="account-secondary-action"
                  onClick={onEnableBrowserNotifications}
                  disabled={saving || accountLoading || !browserNotificationsSupported}
                >
                  {browserNotificationPermission === 'granted' ? 'Send test notification' : 'Enable notifications'}
                </button>
                {browserNotificationsEnabled && browserNotificationPermission === 'granted' && (
                  <button
                    type="button"
                    className="account-secondary-action"
                    onClick={onDisableBrowserNotifications}
                    disabled={saving || accountLoading}
                  >
                    Disable
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="account-panel">
          <h2 className="account-section-title">Storage usage</h2>
          <div className="account-storage-summary">
            <div className="account-storage-total">
              {formatBytes(usage.totalBytes)} / {formatBytes(usage.storageLimitBytes)}
            </div>
            <div className="account-storage-label">{usage.totalFiles} total files stored</div>
            <div className="account-storage-subtitle">
              {formatBytes(usage.remainingBytes)} remaining
              {usage.latestActivityAt ? ` • Latest activity ${getTimeAgo(usage.latestActivityAt)}` : ' • No stored activity yet'}
            </div>
            <div className="account-storage-progress">
              <div className="account-storage-progress-fill" style={{ width: `${storagePercent}%` }} />
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Audio files</div>
              <div className="stat-value">{usage.audioCount}</div>
              <div className="stat-badge">{formatBytes(usage.audioBytes)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Transcripts</div>
              <div className="stat-value">{usage.transcriptCount}</div>
              <div className="stat-badge">{formatBytes(usage.transcriptBytes)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Summaries</div>
              <div className="stat-value">{usage.summaryCount}</div>
              <div className="stat-badge">{formatBytes(usage.summaryBytes)}</div>
            </div>
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}

// Ask Acestar Tab Component
function AnalyticsTab({ historyEntries, meetingEntries }) {
  const availableSources = (historyEntries || []).filter((entry) => entry.file_type === 'transcript' || entry.file_type === 'summary');
  const recentSources = availableSources.slice(0, 8);
  const focusableMeetings = (meetingEntries || []).filter((meeting) => !meeting.archivedAt).slice(0, 8);
  const fileInputRef = React.useRef(null);
  const [chatSessions, setChatSessions] = React.useState([]);
  const [activeChatId, setActiveChatId] = React.useState(null);
  const [messagesByChat, setMessagesByChat] = React.useState({});
  const [scopeMode, setScopeMode] = React.useState('all');
  const [dateRange, setDateRange] = React.useState('all');
  const [selectedMeetingIds, setSelectedMeetingIds] = React.useState([]);
  const [draftPrompt, setDraftPrompt] = React.useState('');
  const [showAttachMenu, setShowAttachMenu] = React.useState(false);
  const [showRecentFilePicker, setShowRecentFilePicker] = React.useState(false);
  const [attachedItems, setAttachedItems] = React.useState([]);
  const [queryBusy, setQueryBusy] = React.useState(false);
  const [chatLoading, setChatLoading] = React.useState(true);
  const [backfillBusy, setBackfillBusy] = React.useState(false);

  const activeChat = chatSessions.find((session) => session.id === activeChatId) || chatSessions[0];
  const chatMessages = messagesByChat[activeChatId] || [];

  const buildDefaultWelcomeMessage = React.useCallback((chatId) => ({
    id: `welcome-${chatId}`,
    role: 'assistant',
    content: 'New chat started. Ask about meetings, summaries, transcripts, action items, blockers, risks, or follow-ups across your recent work.',
    citations: [],
    status: 'complete'
  }), []);

  const persistChat = React.useCallback(async (chatId, nextSessions, nextMessagesByChat) => {
    const authToken = localStorage.getItem('auth_token');
    if (!authToken || !chatId) {
      return;
    }

    const session = nextSessions.find((item) => item.id === chatId);
    if (!session) {
      return;
    }

    const messages = (nextMessagesByChat[chatId] || [])
      .filter((message) => message.status !== 'thinking' && message.status !== 'writing')
      .map((message) => ({
        role: message.role,
        content: message.content
      }));

    await fetch(`/api/ask-recap/chats/${chatId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: session.title,
        scope: session.scope || 'all',
        messages
      })
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const loadPersistedChats = async () => {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        const fallbackId = `chat-${Date.now()}`;
        const fallbackChat = {
          id: fallbackId,
          title: 'New Ask Acestar chat',
          scope: 'all',
          messageCount: 1
        };
        if (!cancelled) {
          setChatSessions([fallbackChat]);
          setActiveChatId(fallbackId);
          setMessagesByChat({
            [fallbackId]: [buildDefaultWelcomeMessage(fallbackId)]
          });
          setChatLoading(false);
        }
        return;
      }

      try {
        const response = await fetch('/api/ask-recap/chats', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Failed to load Ask Acestar chats.');
        }

        if (cancelled) return;

        if ((result.chats || []).length === 0) {
          const createResponse = await fetch('/api/ask-recap/chats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              title: 'New Ask Acestar chat',
              scope: 'all'
            })
          });
          const createResult = await createResponse.json();
          if (!createResponse.ok || !createResult.ok) {
            throw new Error(createResult.error || 'Failed to create Ask Acestar chat.');
          }

          const createdChat = createResult.chat;
          const welcomeMessage = buildDefaultWelcomeMessage(createdChat.id);
          setChatSessions([{ ...createdChat, messageCount: 1 }]);
          setActiveChatId(createdChat.id);
          setMessagesByChat({
            [createdChat.id]: [welcomeMessage]
          });
          setChatLoading(false);
          await persistChat(createdChat.id, [{ ...createdChat, messageCount: 1 }], {
            [createdChat.id]: [welcomeMessage]
          });
          return;
        }

        const hydratedMessages = (result.chats || []).reduce((accumulator, chat) => {
          accumulator[chat.id] = (chat.messages || []).map((message) => ({
            ...message,
            citations: [],
            status: 'complete'
          }));
          return accumulator;
        }, {});

        const hydratedChats = (result.chats || []).map((chat) => ({
          id: chat.id,
          title: chat.title,
          scope: chat.scope || 'all',
          messageCount: (chat.messages || []).length
        }));

        setChatSessions(hydratedChats);
        setActiveChatId(hydratedChats[0]?.id || null);
        setMessagesByChat(hydratedMessages);
      } catch (error) {
        console.error('Failed to hydrate Ask Acestar chats:', error);
      } finally {
        if (!cancelled) {
          setChatLoading(false);
        }
      }
    };

    loadPersistedChats();
    return () => {
      cancelled = true;
    };
  }, [buildDefaultWelcomeMessage, persistChat]);

  React.useEffect(() => {
    let cancelled = false;

    const backfillKnowledge = async () => {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) return;

      try {
        setBackfillBusy(true);
        await fetch('/api/ask-recap/backfill', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
      } catch (error) {
        console.error('Failed to optimize Ask Acestar knowledge:', error);
      } finally {
        if (!cancelled) {
          setBackfillBusy(false);
        }
      }
    };

    backfillKnowledge();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderAskRecapMessageContent = (content) => {
    const cleaned = String(content || '')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^[ \t]*[-*][ \t]+/gm, '• ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!cleaned) {
      return null;
    }

    const blocks = cleaned.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);

    return blocks.map((block, blockIndex) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const isNumberedList = lines.length > 1 && lines.every((line) => /^\d+\.\s+/.test(line));
      const isBulletList = lines.length > 1 && lines.every((line) => /^•\s+/.test(line));

      if (isNumberedList) {
        return (
          <ol key={`block-${blockIndex}`} className="ask-recap-rendered-list ask-recap-rendered-list-numbered">
            {lines.map((line, lineIndex) => (
              <li key={`line-${lineIndex}`}>{line.replace(/^\d+\.\s+/, '')}</li>
            ))}
          </ol>
        );
      }

      if (isBulletList) {
        return (
          <ul key={`block-${blockIndex}`} className="ask-recap-rendered-list ask-recap-rendered-list-bulleted">
            {lines.map((line, lineIndex) => (
              <li key={`line-${lineIndex}`}>{line.replace(/^•\s+/, '')}</li>
            ))}
          </ul>
        );
      }

      return (
        <p key={`block-${blockIndex}`} className="ask-recap-rendered-paragraph">
          {lines.join(' ')}
        </p>
      );
    });
  };

  const starterPrompts = [
    'What action items have come up most often across my recent meetings?',
    'What recurring blockers show up across my recent client and team meetings?',
    'Which open questions are still unresolved across the last five summaries?',
    'Summarize the main risks mentioned in the latest client workshop.'
  ];

  const derivedScope = selectedMeetingIds.length > 0 ? 'meeting' : (dateRange !== 'all' ? dateRange : scopeMode);

  const startNewChat = async () => {
    const authToken = localStorage.getItem('auth_token');
    let newChatId = `chat-${Date.now()}`;
    if (authToken) {
      try {
        const response = await fetch('/api/ask-recap/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            title: 'New Ask Acestar chat',
            scope: derivedScope
          })
        });
        const result = await response.json();
        if (response.ok && result.ok && result.chat?.id) {
          newChatId = result.chat.id;
        }
      } catch (error) {
        console.error('Failed to create persisted Ask Acestar chat:', error);
      }
    }

    const newChat = {
      id: newChatId,
      title: 'New Ask Acestar chat',
      scope: derivedScope,
      messageCount: 1
    };
    const welcomeMessage = buildDefaultWelcomeMessage(newChatId);
    setChatSessions((current) => [newChat, ...current]);
    setActiveChatId(newChatId);
    setMessagesByChat((current) => ({
      ...current,
      [newChatId]: [welcomeMessage]
    }));
    setDraftPrompt('');
    setAttachedItems([]);
    setShowAttachMenu(false);
    setShowRecentFilePicker(false);
    if (authToken) {
      await persistChat(newChatId, [newChat, ...chatSessions], {
        ...messagesByChat,
        [newChatId]: [welcomeMessage]
      });
    }
  };

  const toggleMeetingScope = (meetingId) => {
    setSelectedMeetingIds((current) => (
      current.includes(meetingId)
        ? current.filter((id) => id !== meetingId)
        : [...current, meetingId]
    ));
  };

  const renameActiveChat = async (chatId = activeChatId) => {
    const targetChat = chatSessions.find((session) => session.id === chatId);
    if (!chatId || !targetChat) return;
    const nextTitle = window.prompt('Rename chat', targetChat.title);
    if (!nextTitle || !nextTitle.trim()) return;

    const trimmedTitle = nextTitle.trim();
    setChatSessions((current) => current.map((session) => (
      session.id === chatId ? { ...session, title: trimmedTitle } : session
    )));

    const authToken = localStorage.getItem('auth_token');
    if (!authToken) return;

    try {
      await fetch(`/api/ask-recap/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ title: trimmedTitle })
      });
    } catch (error) {
      console.error('Failed to rename Ask Acestar chat:', error);
    }
  };

  const deleteActiveChat = async (chatId = activeChatId) => {
    const targetChat = chatSessions.find((session) => session.id === chatId);
    if (!chatId || !targetChat) return;
    const confirmed = window.confirm(`Delete "${targetChat.title}"?`);
    if (!confirmed) return;

    const remainingSessions = chatSessions.filter((session) => session.id !== chatId);
    const remainingMessages = { ...messagesByChat };
    delete remainingMessages[chatId];

    setChatSessions(remainingSessions);
    setMessagesByChat(remainingMessages);

    const fallbackSession = remainingSessions[0];
    if (fallbackSession) {
      setActiveChatId(fallbackSession.id);
    } else {
      setActiveChatId(null);
      await startNewChat();
    }

    const authToken = localStorage.getItem('auth_token');
    if (!authToken) return;

    try {
      await fetch(`/api/ask-recap/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    } catch (error) {
      console.error('Failed to delete Ask Acestar chat:', error);
    }
  };

  const addAttachedItem = (item) => {
    setAttachedItems((current) => {
      if (current.some((entry) => entry.id === item.id)) return current;
      return [...current, item];
    });
  };

  const removeAttachedItem = (itemId) => {
    setAttachedItems((current) => current.filter((entry) => entry.id !== itemId));
  };

  const handleLocalFileSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    selectedFiles.forEach((file) => {
      addAttachedItem({
        id: `upload-${file.name}-${file.size}-${file.lastModified}`,
        label: file.name,
        meta: `${formatBytes(file.size)} • Local file`,
        sourceType: 'local'
      });
    });
    event.target.value = '';
    setShowAttachMenu(false);
    setShowRecentFilePicker(false);
  };

  const submitPrompt = async (promptText) => {
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) return;
    const pendingMessageId = `assistant-pending-${Date.now()}`;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedPrompt,
      citations: []
    };

    const pendingAssistantMessage = {
      id: pendingMessageId,
      role: 'assistant',
      content: '',
      citations: [],
      status: 'thinking'
    };

    setMessagesByChat((current) => ({
      ...current,
      [activeChatId]: [...(current[activeChatId] || []), userMessage, pendingAssistantMessage]
    }));
    setChatSessions((current) => current.map((session) => (
      session.id === activeChatId
        ? {
            ...session,
            title: session.messageCount === 0 ? truncateText(trimmedPrompt, 32) : session.title,
            scope: derivedScope,
            messageCount: session.messageCount + 1
          }
        : session
    )));
    setDraftPrompt('');
    setQueryBusy(true);
    const writingTimer = setTimeout(() => {
      setMessagesByChat((current) => ({
        ...current,
        [activeChatId]: (current[activeChatId] || []).map((message) => (
          message.id === pendingMessageId && message.status === 'thinking'
            ? { ...message, status: 'writing' }
            : message
        ))
      }));
    }, 900);

    try {
      const authToken = localStorage.getItem('auth_token');
      const recentMessages = (messagesByChat[activeChatId] || [])
        .filter((message) => message.status !== 'thinking' && message.status !== 'writing')
        .slice(-6)
        .map((message) => ({
          role: message.role,
          content: message.content
        }));
      const response = await fetch('/api/ask-recap/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          question: trimmedPrompt,
          scope: selectedMeetingIds.length > 0 ? 'meeting' : scopeMode,
          dateRange,
          selectedMeetingIds,
          recentMessages,
          attachedRecentFileIds: attachedItems
            .filter((item) => item.sourceType === 'recent' && item.fileId)
            .map((item) => item.fileId)
        })
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Ask Acestar query failed.');
      }

      const assistantMessage = {
        id: pendingMessageId,
        role: 'assistant',
        content: result.answer,
        status: 'complete',
        citations: (result.citations || []).reduce((accumulator, citation) => {
          const renderedLabel = `${citation.meetingTitle || citation.documentLabel}${citation.pageNumber ? `, p. ${citation.pageNumber}` : ''}, ${citation.lineRef}`;
          const dedupeKey = [
            citation.pageNumber || 'na',
            citation.startLine || 'na',
            citation.endLine || 'na',
            String(citation.snippet || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 160)
          ].join(':');
          if (accumulator.some((entry) => entry.dedupeKey === dedupeKey || entry.renderedLabel === renderedLabel)) {
            return accumulator;
          }

          accumulator.push({
            id: citation.id,
            citationNumber: citation.citationNumber,
            dedupeKey,
            renderedLabel,
            label: citation.meetingTitle || citation.documentLabel,
            lineRef: citation.lineRef,
            pageNumber: citation.pageNumber || null,
            startLine: citation.startLine || null,
            endLine: citation.endLine || null,
            snippet: citation.snippet || '',
            entryId: citation.fileId
          });
          return accumulator;
        }, [])
      };
      const shouldRetitle = activeChat?.title === 'New Ask Acestar chat';
      const nextTitle = shouldRetitle && result.suggestedTitle
        ? result.suggestedTitle
        : (activeChat?.title || 'New Ask Acestar chat');

      const nextMessagesByChat = {
        ...messagesByChat,
        [activeChatId]: (messagesByChat[activeChatId] || []).map((message) => (
          message.id === pendingMessageId ? assistantMessage : message
        ))
      };
      const nextSessions = chatSessions.map((session) => (
        session.id === activeChatId
          ? {
              ...session,
              title: nextTitle,
              scope: result.appliedScope || derivedScope,
              messageCount: nextMessagesByChat[activeChatId].filter((message) => message.status !== 'thinking' && message.status !== 'writing').length
            }
          : session
      ));
      setMessagesByChat((current) => ({
        ...current,
        [activeChatId]: (current[activeChatId] || []).map((message) => (
          message.id === pendingMessageId ? assistantMessage : message
        ))
      }));
      setChatSessions(nextSessions);
      await persistChat(activeChatId, nextSessions, nextMessagesByChat);
    } catch (error) {
      clearTimeout(writingTimer);
      setMessagesByChat((current) => ({
        ...current,
        [activeChatId]: (current[activeChatId] || []).map((message) => (
          message.id === pendingMessageId
            ? {
                id: `assistant-error-${Date.now()}`,
                role: 'assistant',
                content: error.message || 'Ask Acestar could not answer that question yet.',
                citations: [],
                status: 'error'
              }
            : message
        ))
      }));
      await persistChat(activeChatId, chatSessions, {
        ...messagesByChat,
        [activeChatId]: (messagesByChat[activeChatId] || []).map((message) => (
          message.id === pendingMessageId
            ? {
                id: `assistant-error-${Date.now()}`,
                role: 'assistant',
                content: error.message || 'Ask Acestar could not answer that question yet.',
                citations: [],
                status: 'error'
              }
            : message
        ))
      });
    } finally {
      clearTimeout(writingTimer);
      setQueryBusy(false);
    }
  };

  return (
    <div className="ask-recap-tab">
      <div className="ask-recap-shell">
        <aside className="ask-recap-sidebar">
          <div className="ask-recap-sidebar-header">
            <button className="btn-primary-large ask-recap-new-chat" onClick={startNewChat}>
              + New chat
            </button>
            {backfillBusy && (
              <div className="ask-recap-sidebar-note">Optimizing older summaries and transcripts for Ask Acestar…</div>
            )}
          </div>

          <div className="ask-recap-sidebar-section">
            <div className="ask-recap-sidebar-label">Saved chats</div>
            <div className="ask-recap-chat-list">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`ask-recap-chat-card ${session.id === activeChatId ? 'active' : ''}`}
                >
                  <button
                    className={`ask-recap-chat-item ${session.id === activeChatId ? 'active' : ''}`}
                    onClick={() => setActiveChatId(session.id)}
                  >
                    <div className="ask-recap-chat-title">{session.title}</div>
                    <div className="ask-recap-chat-meta">{formatScopeLabel(session.scope)} • {session.messageCount} messages</div>
                  </button>
                  <div className="ask-recap-chat-inline-actions">
                    <button
                      className="ask-recap-chat-inline-action"
                      aria-label={`Rename ${session.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveChatId(session.id);
                        renameActiveChat(session.id);
                      }}
                    >
                      <span className="ask-recap-chat-inline-icon">✎</span>
                      <span className="ask-recap-chat-inline-tooltip">Rename</span>
                    </button>
                    <button
                      className="ask-recap-chat-inline-action danger"
                      aria-label={`Delete ${session.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveChatId(session.id);
                        deleteActiveChat(session.id);
                      }}
                    >
                      <span className="ask-recap-chat-inline-icon">×</span>
                      <span className="ask-recap-chat-inline-tooltip">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ask-recap-sidebar-section">
            <div className="ask-recap-sidebar-label">Focus</div>
            <div className="ask-recap-focus-controls">
              <label className="ask-recap-focus-field">
                <span>Date range</span>
                <select
                  className="ask-recap-focus-select"
                  value={dateRange}
                  onChange={(event) => setDateRange(event.target.value)}
                >
                  <option value="all">All time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </label>
              {focusableMeetings.length > 0 && (
                <div className="ask-recap-focus-meetings">
                  {focusableMeetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      className={`ask-recap-focus-meeting ${selectedMeetingIds.includes(meeting.id) ? 'active' : ''}`}
                      onClick={() => toggleMeetingScope(meeting.id)}
                    >
                      <span className="ask-recap-focus-meeting-title">{meeting.filename}</span>
                      <span className="ask-recap-focus-meeting-meta">{meeting.displayDate}</span>
                    </button>
                  ))}
                </div>
              )}
              {(selectedMeetingIds.length > 0 || dateRange !== 'all') && (
                <button
                  className="ask-recap-focus-clear"
                  onClick={() => {
                    setSelectedMeetingIds([]);
                    setDateRange('all');
                  }}
                >
                  Clear focus
                </button>
              )}
            </div>
          </div>
        </aside>

        <section className="ask-recap-main">
          <div className="ask-recap-conversation">
            {chatLoading ? (
              <div className="ask-recap-empty-state">
                <div className="ask-recap-empty-title">Loading Ask Acestar</div>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="ask-recap-empty-state">
                <div className="ask-recap-empty-title">Ask Acestar</div>
                <div className="ask-recap-empty-prompts">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      className="ask-recap-prompt-card"
                      onClick={() => submitPrompt(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="ask-recap-message-list">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`ask-recap-message ${message.role} ${message.status === 'thinking' || message.status === 'writing' ? 'pending' : ''}`}>
                    <div className="ask-recap-message-body">
                      {(message.status === 'thinking' || message.status === 'writing') ? (
                        <div className="ask-recap-status-shell" aria-live="polite">
                          <div className="ask-recap-status-graphic" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </div>
                          <div className="ask-recap-status-copy">
                            Ask Acestar is {message.status === 'thinking' ? 'thinking' : 'writing'}…
                          </div>
                        </div>
                      ) : (
                        <div className="ask-recap-message-copy">
                          {renderAskRecapMessageContent(message.content)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="ask-recap-composer">
              {attachedItems.length > 0 && (
                <div className="ask-recap-attachments">
                  {attachedItems.map((item) => (
                    <div key={item.id} className="ask-recap-attachment-chip">
                      <div className="ask-recap-attachment-copy">
                        <div className="ask-recap-attachment-label">{item.label}</div>
                        {item.meta && <div className="ask-recap-attachment-meta">{item.meta}</div>}
                      </div>
                      <button className="ask-recap-attachment-remove" onClick={() => removeAttachedItem(item.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="ask-recap-composer-bar">
                <div className="ask-recap-attach-shell">
                  <button
                    className="ask-recap-attach-button"
                    onClick={() => {
                      setShowAttachMenu((current) => !current);
                      setShowRecentFilePicker(false);
                    }}
                    aria-label="Add files"
                  >
                    +
                  </button>
                  {showAttachMenu && (
                    <div className="ask-recap-attach-menu">
                      <button
                        className="ask-recap-attach-menu-item"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <span className="ask-recap-attach-menu-icon">📎</span>
                        <span>Add photos & files</span>
                      </button>
                      <button
                        className="ask-recap-attach-menu-item"
                        onClick={() => setShowRecentFilePicker((current) => !current)}
                      >
                        <span className="ask-recap-attach-menu-icon">🗂️</span>
                        <span>Recent files</span>
                        <span className="ask-recap-attach-menu-arrow">›</span>
                      </button>

                      {showRecentFilePicker && (
                        <div className="ask-recap-recent-files">
                          {recentSources.length === 0 ? (
                            <div className="ask-recap-recent-files-empty">No recent transcript or summary files yet.</div>
                          ) : recentSources.slice(0, 6).map((entry) => (
                            <button
                              key={entry.id}
                              className="ask-recap-recent-file"
                              onClick={() => {
                                addAttachedItem({
                                  id: `recent-${entry.id}`,
                                  fileId: entry.id,
                                  label: entry.displayFilename,
                                  meta: `${entry.fileTypeLabel} • ${entry.displayDate}`,
                                  sourceType: 'recent'
                                });
                                setShowAttachMenu(false);
                                setShowRecentFilePicker(false);
                              }}
                            >
                              <span className="ask-recap-recent-file-title">{entry.displayFilename}</span>
                              <span className="ask-recap-recent-file-meta">{entry.fileTypeLabel} • {entry.displayDate}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <textarea
                  className="ask-recap-composer-input"
                  placeholder="Ask anything"
                  value={draftPrompt}
                  onChange={(event) => setDraftPrompt(event.target.value)}
                  rows="1"
                />

                <button
                  className="ask-recap-send-button"
                  onClick={() => submitPrompt(draftPrompt)}
                  disabled={!draftPrompt.trim() || queryBusy}
                  aria-label="Send to Ask Acestar"
                >
                  {queryBusy ? '…' : '↑'}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleLocalFileSelection}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Helper function
function getTimeAgo(isoString) {
  if (!isoString) return 'just now';
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

function matchesDateFilter(isoString, filter) {
  if (!isoString || filter === 'all') return true;

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;

  if (filter === '7d') {
    return diffMs <= 7 * 24 * 60 * 60 * 1000;
  }

  if (filter === '30d') {
    return diffMs <= 30 * 24 * 60 * 60 * 1000;
  }

  if (filter === 'year') {
    return date.getFullYear() === now.getFullYear();
  }

  return true;
}

async function openHistoryEntryInNewWindow(entry, unavailableMessage, options = {}) {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    throw new Error('Your browser blocked the new window. Please allow pop-ups for AcestarAI.');
  }

  previewWindow.document.write('<title>Opening file...</title><p style="font-family:sans-serif;padding:24px;">Opening file...</p>');

  try {
    const pdfBlob = await fetchHistoryPdfBlob(entry.id);
    const pdfObjectUrl = URL.createObjectURL(pdfBlob);
    const pageFragment = options.pageNumber ? `#page=${options.pageNumber}` : '';
    previewWindow.location.href = `${pdfObjectUrl}${pageFragment}`;
  } catch (error) {
    previewWindow.close();
    throw new Error(error.message || unavailableMessage);
  }
}

async function fetchHistoryPdfBlob(fileId) {
  const authToken = localStorage.getItem('auth_token');
  const headers = authToken
    ? { Authorization: `Bearer ${authToken}` }
    : {};

  const response = await fetch(`/api/files/${fileId}/pdf`, { headers });
  if (!response.ok) {
    let errorMessage = 'Failed to open the PDF preview.';
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error || errorMessage;
    } catch (error) {
      // Fall back to generic message when the response is not JSON.
    }
    throw new Error(errorMessage);
  }

  return response.blob();
}

function buildHistoryEntries(accountFiles) {
  return (accountFiles || []).map((file) => {
    const displayFilename = normalizeDisplayFilename(file.original_filename, file.file_type);
    const createdAt = file.created_at || file.updated_at || new Date().toISOString();
    const hasTranscript = file.file_type === 'transcript' || file.has_transcript;
    const hasSummary = file.file_type === 'summary' || file.has_summary;
    const processingStatus = file.processing_status || null;
    const relatedOutputs = [
      hasTranscript ? 'Transcript' : null,
      hasSummary ? 'Summary' : null
    ].filter(Boolean);
    const infoChips = [
      processingStatus ? formatProcessingStatus(processingStatus) : null,
      file.speaker_diarization ? 'Speaker diarization' : null,
      file.action_items_count ? `${file.action_items_count} action items` : null,
      file.mime_type ? simplifyMimeType(file.mime_type) : null
    ].filter(Boolean);

    return {
      ...file,
      id: file.id,
      meetingId: file.meeting_id || null,
      processingStatus,
      uploadedAt: createdAt,
      createdAt,
      displayDate: formatDate(createdAt),
      displayFilename,
      fileTypeLabel: formatFileTypeLabel(file.file_type),
      status: deriveStatus(file),
      statusLabel: deriveStatusLabel(file),
      icon: deriveIcon(file.file_type),
      hasTranscript,
      hasSummary,
      infoChips,
      relatedOutputs
    };
  });
}

function normalizeCandidateTitleForMerge(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chooseMoreCompleteValue(currentValue, nextValue) {
  if (!nextValue) return currentValue;
  if (!currentValue) return nextValue;
  return String(nextValue).length > String(currentValue).length ? nextValue : currentValue;
}

function buildScreenshotCandidateMergeKey(candidate) {
  const titleKey = normalizeCandidateTitleForMerge(candidate?.title);
  const startAt = candidate?.meetingStartAt ? new Date(candidate.meetingStartAt) : null;
  const startKey = startAt && !Number.isNaN(startAt.getTime())
    ? `${startAt.getFullYear()}-${startAt.getMonth() + 1}-${startAt.getDate()}-${startAt.getHours()}-${startAt.getMinutes()}`
    : 'no-time';
  return `${titleKey}::${startKey}`;
}

function mergeScreenshotCandidateSets(candidateSets) {
  const mergedByKey = new Map();

  (candidateSets || []).flat().forEach((candidate) => {
    if (!candidate?.title) return;

    const key = buildScreenshotCandidateMergeKey(candidate);
    const existing = mergedByKey.get(key);

    if (!existing) {
      mergedByKey.set(key, { ...candidate });
      return;
    }

    mergedByKey.set(key, {
      ...existing,
      title: chooseMoreCompleteValue(existing.title, candidate.title),
      meetingStartAt: existing.meetingStartAt || candidate.meetingStartAt || '',
      meetingEndAt: existing.meetingEndAt || candidate.meetingEndAt || existing.meetingStartAt || candidate.meetingStartAt || '',
      organizerName: chooseMoreCompleteValue(existing.organizerName, candidate.organizerName),
      attendeeSummary: chooseMoreCompleteValue(existing.attendeeSummary, candidate.attendeeSummary),
      externalMeetingUrl: chooseMoreCompleteValue(existing.externalMeetingUrl, candidate.externalMeetingUrl),
      notes: chooseMoreCompleteValue(existing.notes, candidate.notes),
      confidence: Math.max(Number(existing.confidence || 0), Number(candidate.confidence || 0))
    });
  });

  return Array.from(mergedByKey.values()).sort((a, b) => {
    const aTime = a?.meetingStartAt ? new Date(a.meetingStartAt).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b?.meetingStartAt ? new Date(b.meetingStartAt).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

function buildMeetingEntries(accountMeetings) {
  return (accountMeetings || []).map((meeting) => {
    const uploadedAt = meeting.meeting_start_at || meeting.uploaded_at || meeting.created_at || new Date().toISOString();
    const processingStatus = meeting.processing_status || 'uploaded';
    const lifecycleStatus = meeting.status || deriveMeetingLifecycleStatusLabel(meeting);
    const captureMethod = meeting.capture_method || 'none';
    const hasTranscript = !!meeting.hasTranscript;
    const hasSummary = !!meeting.hasSummary;
    const relatedOutputs = [
      hasTranscript ? 'Transcript' : null,
      hasSummary ? 'Summary' : null
    ].filter(Boolean);
    const infoChips = [
      formatMeetingLifecycleStatus(lifecycleStatus),
      captureMethod !== 'none' ? formatCaptureMethod(captureMethod) : null,
      meeting.speakerDiarization ? 'Speaker diarization' : null,
      meeting.actionItemsCount ? `${meeting.actionItemsCount} action items` : null,
      meeting.artifactCount ? `${meeting.artifactCount} artifacts` : null
    ].filter(Boolean);

    return {
      id: meeting.id,
      filename: meeting.title || normalizeDisplayFilename(meeting.original_filename, 'audio'),
      uploadedAt,
      meetingStartAt: meeting.meeting_start_at || null,
      meetingEndAt: meeting.meeting_end_at || null,
      completedAt: meeting.completed_at || null,
      notifiedPostMeetingAt: meeting.notified_post_meeting_at || null,
      dismissedPostMeetingAt: meeting.dismissed_post_meeting_at || null,
      lastLifecycleEvaluatedAt: meeting.last_lifecycle_evaluated_at || null,
      displayDate: formatDate(uploadedAt),
      fileTypeLabel: meeting.source_type === 'teams'
        ? 'Teams meeting'
        : meeting.source_type === 'manual'
          ? 'Scheduled meeting'
          : 'Uploaded meeting',
      sourceType: meeting.source_type || 'upload',
      archivedAt: meeting.archived_at || null,
      organizerName: meeting.organizer_name || null,
      attendeeSummary: meeting.attendee_summary || null,
      externalMeetingUrl: meeting.external_meeting_url || null,
      notes: meeting.notes || null,
      processingStatus,
      lifecycleStatus,
      captureMethod,
      processingError: meeting.processing_error || null,
      status: deriveStatus({ processing_status: processingStatus, has_summary: hasSummary, has_transcript: hasTranscript }),
      statusLabel: formatMeetingLifecycleStatus(lifecycleStatus),
      statusTone: deriveLifecycleTone(lifecycleStatus),
      statusBadgeClass: deriveLifecycleBadgeClass(lifecycleStatus),
      statusNote: deriveProcessingNote(meeting),
      icon: deriveMeetingIcon(meeting),
      hasTranscript,
      hasSummary,
      relatedOutputs,
      infoChips
    };
  }).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

function normalizeDisplayFilename(filename, fileType) {
  if (!filename) return 'Untitled file';
  if (fileType === 'transcript') {
    return filename.replace(/\.transcript\.txt$/i, '');
  }
  if (fileType === 'summary') {
    return filename.replace(/\.summary\.md$/i, '');
  }
  return filename;
}

function formatFileTypeLabel(fileType) {
  if (fileType === 'audio') return 'Uploaded audio';
  if (fileType === 'transcript') return 'Transcript document';
  if (fileType === 'summary') return 'Summary document';
  return 'File';
}

function deriveStatus(file) {
  const processingStatus = file.processing_status || file.processingStatus;
  if (processingStatus === 'completed') return 'summary';
  if (processingStatus === 'transcript_ready' || processingStatus === 'summarizing') return 'transcript';
  if (processingStatus === 'failed') return 'audio';
  if (file.file_type === 'summary' || file.has_summary) return 'summary';
  if (file.file_type === 'transcript' || file.has_transcript) return 'transcript';
  return 'audio';
}

function deriveStatusLabel(file) {
  const processingStatus = file.processing_status || file.processingStatus;
  if ((file.source_type === 'manual' || file.sourceType === 'manual') && !file.has_summary && !file.hasSummary && !file.has_transcript && !file.hasTranscript) {
    return 'Workspace ready';
  }
  if (processingStatus) {
    return formatProcessingStatus(processingStatus);
  }
  const status = deriveStatus(file);
  if (status === 'summary') return 'Summary ready';
  if (status === 'transcript') return 'Transcript ready';
  return 'Audio only';
}

function deriveMeetingLifecycleStatusLabel(meeting) {
  if (meeting.status) return meeting.status;
  if (meeting.capture_method === 'written_notes' || meeting.capture_method === 'dictated_notes') return 'completed';
  if (meeting.capture_method === 'recording') return 'captured';
  if (meeting.processing_status && meeting.processing_status !== 'uploaded') return 'captured';
  return 'scheduled';
}

function formatMeetingLifecycleStatus(status) {
  const labels = {
    scheduled: 'Scheduled',
    completed: 'Completed',
    captured: 'Captured',
    missing: 'Incomplete'
  };
  return labels[status] || 'Scheduled';
}

function formatCaptureMethod(captureMethod) {
  const labels = {
    recording: 'Recording captured',
    written_notes: 'Notes captured',
    dictated_notes: 'Dictated notes',
    none: 'No capture yet'
  };
  return labels[captureMethod] || 'No capture yet';
}

function formatProcessingStatus(status) {
  const labels = {
    uploaded: 'Uploaded',
    converting: 'Converting',
    ready_for_transcription: 'Ready for transcription',
    transcribing: 'Transcribing',
    transcript_ready: 'Transcript ready',
    summarizing: 'Summarizing',
    completed: 'Summary ready',
    failed: 'Failed'
  };

  return labels[status] || status.replace(/_/g, ' ');
}

function deriveLifecycleTone(status) {
  if (status === 'captured') return 'success';
  if (status === 'completed') return 'info';
  if (status === 'missing') return 'danger';
  return 'muted';
}

function deriveLifecycleBadgeClass(status) {
  if (status === 'captured') return 'badge-success';
  if (status === 'completed') return 'badge-info';
  if (status === 'missing') return 'badge-danger';
  return 'badge-neutral';
}

function deriveProcessingTone(status) {
  if (status === 'failed') return 'error';
  if (status === 'completed' || status === 'transcript_ready') return 'success';
  return 'pending';
}

function deriveStatusBadgeClass(status) {
  if (status === 'failed') return 'badge-danger';
  if (status === 'completed' || status === 'transcript_ready') return 'badge-success';
  if (status === 'summarizing' || status === 'transcribing' || status === 'converting') return 'badge-progress';
  return 'badge-warning';
}

function deriveProcessingNote(meeting) {
  if (meeting.archived_at || meeting.archivedAt) {
    return 'Archived workspace. Restore it when you want to reuse this meeting context.';
  }
  const lifecycleStatus = meeting.status || meeting.lifecycleStatus;
  if (lifecycleStatus === 'scheduled') {
    return 'Scheduled for capture. Upload a recording after it ends or complete it with notes.';
  }
  if (lifecycleStatus === 'completed') {
    return 'Completed from notes. Summary and Ask Acestar context are ready even without a recording.';
  }
  if (lifecycleStatus === 'captured') {
    return 'Recording-based capture is linked to this meeting.';
  }
  if (lifecycleStatus === 'missing') {
    return 'This meeting is incomplete because it is still missing a recording, written notes, or a voice note.';
  }
  const status = meeting.processing_status || 'uploaded';
  const sourceType = meeting.source_type || meeting.sourceType;
  const hasTranscript = Boolean(meeting.hasTranscript || meeting.has_transcript);
  const hasSummary = Boolean(meeting.hasSummary || meeting.has_summary);
  const artifactCount = Number(meeting.artifactCount || 0);
  if (sourceType === 'manual' && !hasTranscript && !hasSummary && artifactCount === 0) {
    return 'Workspace created. Add a recording or transcript when you are ready to continue.';
  }
  if (status === 'failed') {
    return meeting.processing_error
      ? `Needs attention: ${meeting.processing_error}`
      : 'Needs attention before this meeting can move forward.';
  }

  if (status === 'uploaded' || status === 'ready_for_transcription') {
    return 'Ready for transcription when you want to continue the workflow.';
  }

  if (status === 'converting' || status === 'transcribing' || status === 'summarizing') {
    return 'Processing is in progress for this meeting.';
  }

  if (status === 'transcript_ready') {
    return 'Transcript is ready. You can continue into summary generation.';
  }

  return null;
}

function doesMeetingMatchStatusFilter(meeting, filter) {
  if (filter === 'all') return true;
  if (filter === 'scheduled') {
    return meeting.lifecycleStatus === 'scheduled';
  }
  if (filter === 'completed') {
    return meeting.lifecycleStatus === 'completed';
  }
  if (filter === 'captured') {
    return meeting.lifecycleStatus === 'captured';
  }
  if (filter === 'missing') {
    return meeting.lifecycleStatus === 'missing';
  }
  if (filter === 'failed') {
    return meeting.processingStatus === 'failed';
  }
  return true;
}

function truncateText(value, maxLength = 160) {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function formatScopeLabel(scope) {
  if (scope === 'meeting') return 'Selected meetings';
  if (scope === 'document') return 'Selected documents';
  if (scope === '7d') return 'Last 7 days';
  if (scope === '30d') return 'Last 30 days';
  if (scope === '90d') return 'Last 90 days';
  return 'All meeting history';
}

function deriveMeetingIcon(meeting) {
  if (meeting.source_type === 'manual' && !meeting.hasTranscript && !meeting.hasSummary) return '📅';
  return deriveIcon(deriveStatus({ processing_status: meeting.processing_status, has_summary: meeting.hasSummary, has_transcript: meeting.hasTranscript }));
}

function toDateTimeLocalValue(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function deriveIcon(fileType) {
  if (fileType === 'summary') return '📊';
  if (fileType === 'transcript') return '📝';
  return '🎧';
}

function simplifyMimeType(mimeType) {
  if (!mimeType) return null;
  const [, subtype] = mimeType.split('/');
  return subtype ? subtype.toUpperCase() : mimeType.toUpperCase();
}

function formatDate(isoString) {
  if (!isoString) return 'Unknown date';
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateWithFallback(isoString) {
  return isoString ? formatDate(isoString) : 'Not available';
}

function formatDateTimeWithFallback(isoString) {
  if (!isoString) return 'Not available';
  const value = new Date(isoString);
  if (Number.isNaN(value.getTime())) return 'Not available';
  return value.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatMeetingTimeRange(startIso, endIso) {
  if (!startIso && !endIso) return 'Meeting time not set';

  const start = startIso ? new Date(startIso) : null;
  const end = endIso ? new Date(endIso) : null;

  if (start && !Number.isNaN(start.getTime())) {
    const startLabel = start.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    if (end && !Number.isNaN(end.getTime())) {
      const sameDay = start.toDateString() === end.toDateString();
      const endLabel = end.toLocaleString(undefined, sameDay ? {
        hour: 'numeric',
        minute: '2-digit'
      } : {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      return `${startLabel} to ${endLabel}`;
    }

    return startLabel;
  }

  return formatDateTimeWithFallback(endIso);
}

function getLocalDateKeyForBrowser(timeZone = 'UTC', date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function formatMeetingTimeRange(startAt, endAt, fallbackAt = null) {
  const sourceDate = startAt || endAt || fallbackAt;
  if (!sourceDate) return '';

  const safeDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const start = safeDate(startAt);
  const end = safeDate(endAt);
  const fallback = safeDate(fallbackAt);
  const base = start || end || fallback;

  if (!base) return '';

  const dateLabel = base.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  const formatClock = (value) => {
    if (!value) return null;
    return value.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const startLabel = formatClock(start);
  const endLabel = formatClock(end);

  if (startLabel && endLabel) return `${dateLabel}, ${startLabel} to ${endLabel}`;
  if (startLabel) return `${dateLabel}, ${startLabel}`;
  if (endLabel) return `${dateLabel}, ${endLabel}`;
  return dateLabel;
}

function formatBytes(bytes) {
  const numericBytes = Number(bytes || 0);
  if (numericBytes < 1024) return `${numericBytes} B`;
  if (numericBytes < 1024 * 1024) return `${(numericBytes / 1024).toFixed(1)} KB`;
  if (numericBytes < 1024 * 1024 * 1024) return `${(numericBytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(numericBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function calculateCompletedRecordingStats(accountMeetings) {
  const completedRecordingMeetings = (accountMeetings || []).filter((meeting) => (
    meeting.capture_method === 'recording' &&
    meeting.processing_status === 'completed' &&
    meeting.uploaded_at &&
    (meeting.completed_at || meeting.updated_at)
  ));

  const turnaroundDurations = completedRecordingMeetings
    .map((meeting) => {
      const start = new Date(meeting.uploaded_at).getTime();
      const end = new Date(meeting.completed_at || meeting.updated_at).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
        return null;
      }
      return end - start;
    })
    .filter((duration) => Number.isFinite(duration));

  if (!turnaroundDurations.length) {
    return { sampleCount: 0, averageMs: 0 };
  }

  const totalMs = turnaroundDurations.reduce((sum, duration) => sum + duration, 0);
  return {
    sampleCount: turnaroundDurations.length,
    averageMs: Math.round(totalMs / turnaroundDurations.length)
  };
}

function formatAverageTurnaround(averageMs) {
  const numericValue = Number(averageMs || 0);
  if (!numericValue || numericValue < 0) return '0 min';

  const totalMinutes = numericValue / 60000;
  if (totalMinutes < 60) {
    return `${totalMinutes.toFixed(totalMinutes < 10 ? 1 : 0)} min`;
  }

  const totalHours = totalMinutes / 60;
  if (totalHours < 24) {
    return `${totalHours.toFixed(totalHours < 10 ? 1 : 0)} hr`;
  }

  const totalDays = totalHours / 24;
  return `${totalDays.toFixed(totalDays < 10 ? 1 : 0)} d`;
}

function getTranscriptionBaseline(models) {
  const activeModel = String(models?.transcription?.active || '').toLowerCase();
  if (activeModel.includes('openai whisper')) return 95;
  if (activeModel.includes('openrouter whisper')) return 93;
  if (activeModel.includes('assemblyai')) return 97;
  return null;
}

function calculateTranscriptAccuracy(historyEntries, models) {
  const baseAccuracy = getTranscriptionBaseline(models);
  const transcriptEntries = (historyEntries || []).filter((entry) => entry.file_type === 'transcript');
  const diarizedTranscriptCount = transcriptEntries.filter((entry) => entry.speaker_diarization).length;

  if (!transcriptEntries.length) {
    return baseAccuracy;
  }

  const standardTranscriptCount = transcriptEntries.length - diarizedTranscriptCount;
  const standardAccuracy = baseAccuracy || 92;
  const diarizedAccuracy = Math.min(99, standardAccuracy + 2);
  const weightedAccuracy = (
    (standardTranscriptCount * standardAccuracy) +
    (diarizedTranscriptCount * diarizedAccuracy)
  ) / transcriptEntries.length;

  return Math.round(weightedAccuracy);
}

function buildTranscriptAccuracyDescription(historyEntries, models) {
  const transcriptEntries = (historyEntries || []).filter((entry) => entry.file_type === 'transcript');
  const diarizedTranscriptCount = transcriptEntries.filter((entry) => entry.speaker_diarization).length;
  const activeModel = models?.transcription?.active || null;
  const fallbackModel = models?.transcription?.fallback || null;

  if (!activeModel || activeModel === 'Not Configured') {
    return 'Configure a transcription provider to measure account accuracy.';
  }

  if (!transcriptEntries.length) {
    return fallbackModel
      ? `Estimated from ${activeModel} with ${fallbackModel} fallback.`
      : `Estimated from ${activeModel}.`;
  }

  if (diarizedTranscriptCount > 0) {
    return `${diarizedTranscriptCount} diarized transcript${diarizedTranscriptCount === 1 ? '' : 's'} processed with ${activeModel}.`;
  }

  return `${transcriptEntries.length} transcript${transcriptEntries.length === 1 ? '' : 's'} processed with ${activeModel}.`;
}

// App wrapper component - handles authentication routing
function App() {
  const { user, loading, isAuthenticated } = useAuth();
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--ibm-gray-100)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div>Loading AcestarAI...</div>
        </div>
      </div>
    );
  }
  
  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }
  
  // Show main app if authenticated
  return <MainApp />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);

// Made with Bob
