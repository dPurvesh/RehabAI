// Voice Coach Page — Web Speech API + Gemini AI
const VoiceCoachPage = {
  isListening: false,
  recognition: null,
  synth: window.speechSynthesis,
  transcript: '',
  messages: [],
  isSpeaking: false,

  render() {
    const el = document.getElementById('page-content');
    const injury = (App.patientProfile?.injury_type || 'rehabilitation').replace(/_/g, ' ');

    const initialMsg = {
      role: 'assistant',
      content: `Hey! I'm your RehabAI Voice Coach. Tell me what you need — how much time you have, what equipment is available, and I'll create a personalized ${injury} workout plan for you. Just hold the mic button and speak!`
    };

    try {
      const saved = localStorage.getItem('voiceCoachChat');
      if (saved) {
        this.messages = JSON.parse(saved);
        if (!this.messages.length) this.messages = [initialMsg];
      } else {
        this.messages = [initialMsg];
      }
    } catch(e) {
      this.messages = [initialMsg];
    }

    el.innerHTML = `
      <div class="page-header rich">
        <div>
          <div class="header-eyebrow"><i data-lucide="mic"></i> Voice-powered AI coaching</div>
          <h1>Voice Coach</h1>
          <p>Hold the microphone and speak your workout goals. RehabAI will generate a personalized plan using AI.</p>
        </div>
        <div class="header-pills">
          <span class="pill"><i data-lucide="zap"></i>Gemini AI Powered</span>
          <span class="pill" id="voice-status-pill"><i data-lucide="mic-off"></i>Idle</span>
        </div>
      </div>

      <div class="voice-layout">
        <div class="voice-chat-panel">
          <div class="card voice-chat-card">
            <div class="chat-messages" id="voice-msgs"></div>
            <div class="voice-input-area">
              <div class="voice-transcript-box" id="voice-transcript">
                <span class="transcript-placeholder">Hold the mic button and speak...</span>
              </div>
              <div class="voice-controls">
                <button class="voice-mic-btn" id="voice-mic-btn"
                  onmousedown="VoiceCoachPage.startListening()"
                  onmouseup="VoiceCoachPage.stopListening()"
                  ontouchstart="VoiceCoachPage.startListening()"
                  ontouchend="VoiceCoachPage.stopListening()">
                  <i data-lucide="mic"></i>
                  <span class="mic-pulse"></span>
                </button>
                <span class="voice-hint">Hold to talk</span>
              </div>
              <div class="voice-text-fallback">
                <input class="chat-input" id="voice-text-input" placeholder="Or type your request here..." onkeydown="if(event.key==='Enter')VoiceCoachPage.sendText()">
                <button class="chat-send" onclick="VoiceCoachPage.sendText()" aria-label="Send"><i data-lucide="send"></i></button>
              </div>
            </div>
          </div>
        </div>

        <div class="voice-sidebar-panel">
          <div class="card">
            <div class="card-title"><i data-lucide="lightbulb"></i> Quick Prompts</div>
            <div class="voice-prompts">
              <button class="btn btn-secondary btn-full btn-sm" onclick="VoiceCoachPage.usePrompt('I have 15 minutes and no equipment. Give me a rehab-safe workout.')">15 min no-equipment</button>
              <button class="btn btn-secondary btn-full btn-sm" onclick="VoiceCoachPage.usePrompt('Create a gentle stretching routine for my knee recovery.')">Gentle stretching</button>
              <button class="btn btn-secondary btn-full btn-sm" onclick="VoiceCoachPage.usePrompt('I want to improve my range of motion today. What exercises should I do?')">Range of motion</button>
              <button class="btn btn-secondary btn-full btn-sm" onclick="VoiceCoachPage.usePrompt('Give me a strengthening workout focusing on my legs.')">Leg strengthening</button>
            </div>
          </div>
          <div class="card">
            <div class="card-title"><i data-lucide="sparkles"></i> Daily Motivation</div>
            <div id="voice-motivation" class="motivation-box">
              <p class="motivation-text">Click below for your daily dose of motivation!</p>
            </div>
            <button class="btn btn-primary btn-full btn-sm" onclick="VoiceCoachPage.getMotivation()" id="motivate-btn"><i data-lucide="heart"></i>Motivate Me</button>
          </div>
          <div class="card">
            <div class="card-title"><i data-lucide="volume-2"></i> Voice Settings</div>
            <div class="toggle-row"><span class="slider-label">Read responses aloud</span><div class="toggle-switch on" id="t-voice-tts" onclick="VoiceCoachPage.toggleTTS()"></div></div>
          </div>
        </div>
      </div>

      <div id="voice-workout-result" class="voice-workout-result"></div>`;

    this.ttsEnabled = true;
    this.renderMessages();
    this.initSpeechRecognition();

    try {
      const savedPlan = localStorage.getItem('voiceCoachPlan');
      if (savedPlan) {
        this.renderWorkoutPlan(JSON.parse(savedPlan));
      }
    } catch(e) {}

    App.refreshIcons();
  },

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported');
      const btn = document.getElementById('voice-mic-btn');
      if (btn) {
        btn.disabled = true;
        btn.title = 'Speech recognition not supported in this browser. Use text input instead.';
      }
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      this.transcript = (this.transcript + ' ' + final).trim();
      const box = document.getElementById('voice-transcript');
      if (box) {
        box.innerHTML = `<span class="transcript-final">${this.escapeHtml(this.transcript)}</span>${interim ? `<span class="transcript-interim">${this.escapeHtml(interim)}</span>` : ''}`;
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech error:', event.error);
      this.stopListening();
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Auto-stopped, process what we have
        this.isListening = false;
        this.updateMicUI(false);
        if (this.transcript.trim()) {
          this.processVoiceInput(this.transcript.trim());
        }
      }
    };
  },

  startListening() {
    if (!this.recognition) return;
    this.transcript = '';
    this.isListening = true;
    this.updateMicUI(true);
    const box = document.getElementById('voice-transcript');
    if (box) box.innerHTML = '<span class="transcript-listening">Listening...</span>';
    try {
      this.recognition.start();
    } catch (e) {
      // Already started
    }
  },

  stopListening() {
    if (!this.recognition || !this.isListening) return;
    this.isListening = false;
    this.updateMicUI(false);
    try {
      this.recognition.stop();
    } catch (e) {}
    // Process after a brief delay to capture final results
    setTimeout(() => {
      if (this.transcript.trim()) {
        this.processVoiceInput(this.transcript.trim());
      } else {
        const box = document.getElementById('voice-transcript');
        if (box) box.innerHTML = '<span class="transcript-placeholder">Hold the mic button and speak...</span>';
      }
    }, 500);
  },

  updateMicUI(active) {
    const btn = document.getElementById('voice-mic-btn');
    const pill = document.getElementById('voice-status-pill');
    if (btn) btn.classList.toggle('active', active);
    if (pill) {
      pill.innerHTML = active
        ? '<i data-lucide="mic"></i>Listening...'
        : '<i data-lucide="mic-off"></i>Idle';
      pill.classList.toggle('pill-active', active);
      App.refreshIcons();
    }
  },

  usePrompt(text) {
    const input = document.getElementById('voice-text-input');
    if (input) {
      input.value = text;
      input.focus();
    }
  },

  sendText() {
    const input = document.getElementById('voice-text-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this.processVoiceInput(text);
  },

  async processVoiceInput(text) {
    this.messages.push({ role: 'user', content: text });
    this.saveChat();
    this.renderMessages();

    // Show typing indicator
    const msgs = document.getElementById('voice-msgs');
    if (msgs) {
      msgs.innerHTML += '<div class="chat-bubble chat-ai"><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></div>';
      msgs.scrollTop = msgs.scrollHeight;
    }

    try {
      const ctx = {
        injury_type: App.patientProfile?.injury_type,
        day_number: App.patientProfile?.surgery_date
          ? Math.max(1, Math.ceil((Date.now() - new Date(App.patientProfile.surgery_date).getTime()) / 86400000))
          : 1,
        score: 50,
        phase: 'MOBILITY',
        pain: 3,
      };

      const res = await api.voiceCoach(text, ctx);

      if (res.format === 'structured' && res.response?.exercises) {
        const plan = res.response;
        const summary = plan.summary || `Here's your ${plan.plan_name || 'workout plan'}!`;
        this.messages.push({ role: 'assistant', content: summary });
        this.saveChat();
        this.renderMessages();
        this.renderWorkoutPlan(plan);
        if (this.ttsEnabled) this.speak(summary);
      } else {
        let textResponse = typeof res.response === 'string' ? res.response : JSON.stringify(res.response);
        textResponse = textResponse.replace(/```(json)?/gi, '').trim();
        
        // If it looks like JSON but the backend failed to parse it (e.g., trailing commas, truncated)
        if (textResponse.startsWith('{')) {
          try {
            const p = JSON.parse(textResponse);
            textResponse = p.summary || p.plan_name || 'I have a plan ready for you!';
          } catch (err) {
            // Try extracting just the summary with regex
            const match = textResponse.match(/"summary"\s*:\s*"([^"]+)"/i);
            if (match && match[1]) {
              textResponse = match[1];
            } else {
              textResponse = "I've generated a plan, but there was an error formatting it. Let's try again.";
            }
          }
        }
        
        this.messages.push({ role: 'assistant', content: textResponse });
        this.saveChat();
        this.renderMessages();
        if (this.ttsEnabled) this.speak(textResponse);
      }
    } catch (e) {
      this.messages.push({ role: 'assistant', content: "Sorry, I couldn't process that. Please try again." });
      this.saveChat();
      this.renderMessages();
    }

    // Reset transcript box
    const box = document.getElementById('voice-transcript');
    if (box) box.innerHTML = '<span class="transcript-placeholder">Hold the mic button and speak...</span>';
  },

  saveChat() {
    try {
      localStorage.setItem('voiceCoachChat', JSON.stringify(this.messages));
    } catch(e) {}
  },

  renderMessages() {
    const c = document.getElementById('voice-msgs');
    if (!c) return;
    c.innerHTML = this.messages
      .map(m => `<div class="chat-bubble ${m.role === 'user' ? 'chat-user' : 'chat-ai'}">${this.escapeHtml(m.content)}</div>`)
      .join('');
    c.scrollTop = c.scrollHeight;
  },

  renderWorkoutPlan(plan) {
    try {
      localStorage.setItem('voiceCoachPlan', JSON.stringify(plan));
    } catch(e) {}

    const area = document.getElementById('voice-workout-result');
    if (!area) return;
    const exercises = plan.exercises || [];
    area.innerHTML = `
      <div class="workout-plan-card card">
        <div class="workout-plan-header">
          <div>
            <h3><i data-lucide="dumbbell"></i> ${this.escapeHtml(plan.plan_name || 'Your Workout Plan')}</h3>
            <p>${this.escapeHtml(plan.summary || '')}</p>
          </div>
          <span class="badge badge-phase">${this.escapeHtml(plan.duration || '20 min')}</span>
        </div>
        <div class="workout-exercises-grid">
          ${exercises.map((ex, i) => `
            <div class="workout-exercise-item" style="animation-delay:${i * 0.1}s">
              <div class="workout-ex-num">${i + 1}</div>
              <div class="workout-ex-info">
                <strong>${this.escapeHtml(ex.name)}</strong>
                <span>${ex.sets} sets × ${ex.reps} reps</span>
                ${ex.notes ? `<span class="workout-ex-note">${this.escapeHtml(ex.notes)}</span>` : ''}
              </div>
            </div>`).join('')}
        </div>
        ${plan.cooldown ? `<div class="workout-cooldown"><i data-lucide="wind"></i> <strong>Cooldown:</strong> ${this.escapeHtml(plan.cooldown)}</div>` : ''}
        ${plan.tips ? `<div class="workout-tips"><i data-lucide="info"></i> ${this.escapeHtml(plan.tips)}</div>` : ''}
        <button class="btn btn-secondary btn-full" style="margin-top:14px" onclick="PdfExport.exportWorkout(JSON.parse(localStorage.getItem('voiceCoachPlan')))">
          <i data-lucide="download"></i> Download Workout as PDF
        </button>
      </div>`;
    App.refreshIcons();
  },

  speak(text) {
    if (!this.synth || this.isSpeaking) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select a female voice
    const voices = this.synth.getVoices();
    const femaleVoice = voices.find(v => 
      v.name.includes('Female') || 
      v.name.includes('Samantha') || 
      v.name.includes('Victoria') || 
      v.name.includes('Zira') ||
      v.name.includes('Tessa') ||
      v.name.includes('Karen') ||
      v.name.includes('Google UK English Female')
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    
    utterance.rate = 1.05; // slightly faster
    utterance.pitch = 1.3; // higher pitch for a more feminine/energetic tone
    utterance.volume = 0.8;
    
    this.isSpeaking = true;
    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = () => { this.isSpeaking = false; };
    this.synth.speak(utterance);
  },

  toggleTTS() {
    this.ttsEnabled = !this.ttsEnabled;
    const el = document.getElementById('t-voice-tts');
    if (el) el.classList.toggle('on', this.ttsEnabled);
    if (!this.ttsEnabled && this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  },

  async getMotivation() {
    const btn = document.getElementById('motivate-btn');
    const box = document.getElementById('voice-motivation');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
    try {
      const res = await api.voiceMotivate();
      if (box) box.innerHTML = `<p class="motivation-text">"${this.escapeHtml(res.quote)}"</p>`;
      if (this.ttsEnabled) this.speak(res.quote);
    } catch {
      if (box) box.innerHTML = '<p class="motivation-text">"Every day you show up for your recovery is a victory. Keep going!"</p>';
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="heart"></i>Motivate Me'; App.refreshIcons(); }
  },

  escapeHtml(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },
};
