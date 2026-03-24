# IBM Recap - Presentation Demo Script 🎬

## ⏱️ Total Time: 5 minutes

---

## 🎯 Opening (30 seconds)

**Say:**
> "Good morning/afternoon! Today I'm excited to show you IBM Recap - a cloud-based application that transforms your Teams call recordings into actionable insights using AI. Let me show you how it works."

**Action:** Open browser to IBM Recap homepage

---

## 1️⃣ Registration Demo (30 seconds)

**Say:**
> "First, let's create an account. Notice that we only accept IBM email addresses for security."

**Actions:**
1. Click "Create account"
2. Fill in form:
   - Full Name: "Demo User"
   - Email: "demo.user@ibm.com"
   - Password: "DemoPass123"
   - Confirm Password: "DemoPass123"
3. Click "Create account"

**Say:**
> "And that's it! The account is created instantly - no email verification needed. This makes it easy for IBM employees to get started right away."

**Wait:** 2 seconds for auto-redirect to login

---

## 2️⃣ Login Demo (15 seconds)

**Say:**
> "Now I can login immediately with my new account."

**Actions:**
1. Enter email: "demo.user@ibm.com"
2. Enter password: "DemoPass123"
3. Click "Sign in"

**Say:**
> "And we're in!"

---

## 3️⃣ File Upload Demo (45 seconds)

**Say:**
> "Let's upload a Teams call recording. I have a sample meeting recording here."

**Actions:**
1. Click "Upload Audio File" or drag-and-drop
2. Select pre-prepared audio file (3-5 minutes long)
3. Show upload progress

**Say:**
> "The file is being uploaded to Supabase cloud storage, so it's accessible from anywhere. You can see the upload progress here."

**Wait:** For upload to complete

**Say:**
> "Great! The file is uploaded and ready for transcription."

---

## 4️⃣ Transcription Demo (1 minute)

**Say:**
> "Now let's transcribe this meeting. IBM Recap uses AssemblyAI for accurate speaker diarization - that means it can identify who said what."

**Actions:**
1. Click "Transcribe"
2. Show transcription progress

**Say:**
> "The AI is processing the audio, identifying speakers, and generating the transcript. This usually takes about 30-60 seconds depending on the length of the recording."

**Wait:** For transcription to complete

**Say:**
> "Perfect! Here's our transcript with speaker labels. You can see Speaker A, Speaker B, etc., with timestamps. This makes it easy to follow the conversation flow."

**Actions:**
1. Scroll through transcript
2. Point out speaker labels
3. Point out timestamps

---

## 5️⃣ Summarization Demo (1 minute)

**Say:**
> "Now for the really powerful part - let's generate an AI summary of this meeting."

**Actions:**
1. Click "Summarize"
2. Show summarization progress

**Say:**
> "IBM Recap uses GPT-4 to analyze the transcript and generate a structured summary with key sections."

**Wait:** For summary to complete

**Say:**
> "And here we go! The summary is organized into clear sections:"

**Actions:** Scroll through summary, highlighting each section:

1. **Meeting Overview**
   > "First, we have a high-level overview of what the meeting was about."

2. **Key Discussion Points**
   > "Then the main topics that were discussed."

3. **Decisions Made**
   > "Any decisions that were made during the meeting."

4. **Action Items**
   > "This is crucial - all the action items extracted from the conversation, so nothing falls through the cracks."

5. **Open Questions**
   > "And any questions that need follow-up."

**Say:**
> "All of this is automatically saved to the cloud, so you can access it anytime."

---

## 6️⃣ Persistence Demo (30 seconds)

**Say:**
> "Let me show you the cloud persistence. I'll logout and login again."

**Actions:**
1. Click user menu → Logout
2. Login again with same credentials
3. Show that files are still there

**Say:**
> "See? All my files are still here. Everything is stored securely in Supabase cloud storage, so you can access your meeting notes from any device."

---

## 7️⃣ Closing (30 seconds)

**Say:**
> "So to recap - IBM Recap makes it incredibly easy to:
> 1. Upload your Teams call recordings
> 2. Get accurate transcripts with speaker identification
> 3. Generate AI-powered summaries with action items
> 4. Access everything from the cloud
> 
> This saves hours of manual note-taking and ensures that important action items and decisions are never missed. It's perfect for project meetings, client calls, team standups - any meeting where you need accurate documentation."

**Pause**

**Say:**
> "Are there any questions?"

---

## 🎯 Key Points to Emphasize

1. **Instant Setup** - No complex verification process
2. **Cloud-Based** - Access from anywhere
3. **AI-Powered** - Accurate and intelligent
4. **Speaker Diarization** - Know who said what
5. **Action Items** - Never miss a follow-up
6. **Secure** - IBM email only
7. **Time-Saving** - Automates meeting documentation

---

## 🔧 Backup Plans

### If Upload Fails
- Have a pre-uploaded file ready
- Show the transcription/summary of that file

### If Transcription Takes Too Long
- Have a pre-transcribed file ready
- Skip to summarization

### If Internet Connection Issues
- Run demo on localhost
- Have screenshots/video backup

### If VPS is Down
- Run demo on localhost: `npm start`
- Access at http://localhost:8787

---

## 📝 Q&A Preparation

### Expected Questions:

**Q: "What file formats are supported?"**
A: "We support MP3, WAV, M4A, and most common audio formats. The system automatically handles format conversion."

**Q: "How accurate is the transcription?"**
A: "We use AssemblyAI's enterprise-grade transcription service, which has 95%+ accuracy for clear audio. Speaker diarization accuracy depends on audio quality and number of speakers."

**Q: "Is this secure?"**
A: "Yes! Only IBM email addresses can register, all data is encrypted in transit and at rest, and files are stored in Supabase's secure cloud infrastructure."

**Q: "Can I edit the transcript or summary?"**
A: "Currently, you can download the files and edit them locally. We're planning to add in-app editing in a future release."

**Q: "How long does processing take?"**
A: "Transcription typically takes 30-60 seconds for a 5-minute recording. Summarization takes another 15-30 seconds. It scales linearly with recording length."

**Q: "What's the maximum file size?"**
A: "Currently 100MB, which is about 2 hours of audio at standard quality."

**Q: "Can I share summaries with my team?"**
A: "You can download the summary as a PDF or markdown file and share it via email or Teams. We're planning to add direct sharing features in the future."

---

## ✅ Pre-Demo Checklist

- [ ] VPS is running and accessible
- [ ] Test account created (demo.user@ibm.com)
- [ ] Demo audio file prepared (3-5 minutes, clear audio)
- [ ] Browser tabs ready (close unnecessary tabs)
- [ ] Internet connection stable
- [ ] Backup localhost server ready (`npm start`)
- [ ] Screenshots/video backup prepared
- [ ] Practiced demo at least once
- [ ] Timing checked (should be under 5 minutes)

---

## 🎬 Showtime!

**Remember:**
- Speak clearly and confidently
- Maintain eye contact with audience
- Don't rush - let the AI processing happen naturally
- Highlight the value proposition
- Be enthusiastic about the features
- Handle questions gracefully

**You've got this! Good luck! 🚀**