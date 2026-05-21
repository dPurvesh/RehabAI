// AI Chat Page
const ChatPage = {
  messages: [],

  escapeHtml(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },

  render() {
    const el = document.getElementById('page-content');
    const injury = (App.patientProfile?.injury_type || 'knee').replace(/_/g, ' ');
    this.messages = [{ role: 'assistant', content: `Hi, I am your RehabAI assistant. I can help with questions about ${injury} recovery, symptom tracking, exercise routines, and what to discuss with your physiotherapist.` }];
    el.innerHTML = `
      <div class="chat-container">
        <div class="page-header rich">
          <div>
            <div class="header-eyebrow"><i data-lucide="bot"></i> RehabAI assistant</div>
            <h1>AI Rehab Assistant</h1>
            <p>Ask recovery questions with patient context from your latest check-in and prediction.</p>
          </div>
          <div class="header-pills">
            <span class="pill"><i data-lucide="shield-alert"></i>Guidance, not diagnosis</span>
          </div>
        </div>
        <div class="chat-shell">
          <div class="chat-context">
            <div class="card">
              <div class="card-title">Assistant can help with</div>
              <p class="card-sub">Pain questions, swelling care, sleep positioning, exercise consistency, report follow-up, and when to contact a clinician.</p>
            </div>
            <div class="card">
              <div class="card-title">Suggested prompts</div>
              <button class="btn btn-secondary btn-full btn-sm" onclick="ChatPage.usePrompt('What should I do if my knee swelling increases today?')">Swelling concern</button>
              <button class="btn btn-secondary btn-full btn-sm" style="margin-top:8px" onclick="ChatPage.usePrompt('Which exercises are safest for my current rehab phase?')">Exercise safety</button>
              <button class="btn btn-secondary btn-full btn-sm" style="margin-top:8px" onclick="ChatPage.usePrompt('How can I improve sleep after knee surgery?')">Sleep help</button>
            </div>
          </div>
          <div class="chat-window">
            <div class="chat-messages" id="chat-msgs"></div>
            <div class="chat-input-bar">
              <input class="chat-input" id="chat-input" placeholder="Ask RehabAI about your recovery..." onkeydown="if(event.key==='Enter')ChatPage.send()">
              <button class="chat-send" onclick="ChatPage.send()" aria-label="Send"><i data-lucide="send"></i></button>
            </div>
          </div>
        </div>
      </div>`;
    this.renderMessages();
    App.refreshIcons();
  },

  usePrompt(text) {
    document.getElementById('chat-input').value = text;
    document.getElementById('chat-input').focus();
  },

  renderMessages() {
    const c = document.getElementById('chat-msgs');
    c.innerHTML = this.messages
      .map((m) => `<div class="chat-bubble ${m.role === 'user' ? 'chat-user' : 'chat-ai'}">${this.escapeHtml(m.content)}</div>`)
      .join('');
    c.scrollTop = c.scrollHeight;
  },

  async send() {
    const inp = document.getElementById('chat-input');
    const msg = inp.value.trim();
    if (!msg) return;
    inp.value = '';
    this.messages.push({ role: 'user', content: msg });
    this.renderMessages();
    const c = document.getElementById('chat-msgs');
    c.innerHTML += '<div class="chat-bubble chat-ai"><span class="typing-dots">...</span></div>';
    c.scrollTop = c.scrollHeight;
    try {
      const { data: pred } = await sb.from('ml_predictions').select('*').eq('user_id', App.user.id).order('created_at', { ascending: false }).limit(1).single();
      const { data: checkin } = await sb.from('daily_checkins').select('*').eq('user_id', App.user.id).order('created_at', { ascending: false }).limit(1).single();
      const joinedDate = App.user?.created_at;
      let defaultDay = 1;
      if (joinedDate) {
        defaultDay = Math.max(1, Math.ceil((Date.now() - new Date(joinedDate).getTime()) / 86400000));
      }
      const ctx = {
        injury_type: App.patientProfile?.injury_type,
        day_number: checkin?.day_number ?? defaultDay,
        score: pred?.recovery_score ?? 50,
        phase: pred?.rehab_phase ?? 'MOBILITY',
        pain: checkin?.pain_level ?? 3,
        rom: 85,
      };
      // Include latest exercise session data if available
      const lastSession = window._lastPoseSession;
      if (lastSession) {
        ctx.last_exercise = lastSession.exerciseName;
        ctx.last_exercise_reps = lastSession.reps;
        ctx.last_exercise_target = lastSession.targetReps;
        ctx.last_exercise_form = lastSession.avgFormScore;
        ctx.last_exercise_angle_range = `${lastSession.minAngle}°-${lastSession.maxAngle}°`;
        ctx.last_exercise_issues = lastSession.issues?.join(', ') || 'none';
      }
      let reply;
      try {
        const res = await api.chat(msg, ctx);
        reply = res.response || res.message || 'I am here to help.';
      } catch {
        reply = this.mockResponse(msg);
      }
      await sb.from('ai_chat_messages').insert({ user_id: App.user.id, session_id: 'default', role: 'user', content: msg });
      await sb.from('ai_chat_messages').insert({ user_id: App.user.id, session_id: 'default', role: 'assistant', content: reply });
      this.messages.push({ role: 'assistant', content: reply });
    } catch (e) {
      this.messages.push({ role: 'assistant', content: "Sorry, I couldn't process that. Please try again." });
    }
    this.renderMessages();
  },

  mockResponse(m) {
    m = m.toLowerCase();
    if (m.includes('pain')) return "Pain can be expected during recovery. If it stays below 5/10, monitor it, use ice as advised, and avoid sudden load increases. If pain exceeds 7/10 or changes sharply, contact your physiotherapist.";
    if (m.includes('exercise') || m.includes('workout')) return 'Focus on consistency before intensity. Complete the prescribed range-of-motion and strengthening work, and stop any movement that causes sharp pain or instability.';
    if (m.includes('sleep')) return 'For sleep, keep the knee supported, follow medication guidance, and reduce late-day swelling with elevation. Aim for a consistent sleep schedule.';
    if (m.includes('swell')) return 'For swelling, use rest, ice, compression, and elevation if your clinician allows it. Worsening swelling, heat, or redness should be reviewed by a professional.';
    return 'Good question. I can provide general rehab guidance, but your physiotherapist should make decisions about diagnosis, medication, or major changes to your plan.';
  },
};
