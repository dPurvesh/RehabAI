// Dashboard Page
const DashboardPage = {
  escapeHtml(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },

  async loadPhysioCard() {
    const section = document.getElementById('dash-physio-section');
    if (!section) return;
    const { data: link } = await sb.from('physio_patients')
      .select('physio_id')
      .eq('patient_id', App.user.id)
      .eq('status', 'active')
      .single();
    if (!link) return;
    const { data: physio } = await sb.from('profiles')
      .select('id, full_name, email')
      .eq('id', link.physio_id)
      .single();
    if (!physio) return;
    const { data: meetings } = await sb.from('meeting_requests')
      .select('*')
      .or(`from_id.eq.${App.user.id},to_id.eq.${App.user.id}`)
      .order('created_at', { ascending: false })
      .limit(5);
    const initials = (physio.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const statusColors = { pending: '#f59e0b', accepted: '#10b981', declined: '#ef4444' };
    let meetingsHtml = '';
    if (meetings?.length) {
      meetingsHtml = meetings.map(m => {
        const isIncoming = m.to_id === App.user.id;
        const col = statusColors[m.status] || '#6366f1';
        const dateStr = m.preferred_date ? new Date(m.preferred_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9">
          <span style="font-size:0.82rem;flex:1">${isIncoming ? '📥 From Physio' : '📤 Your Request'}${m.message ? ': ' + this.escapeHtml(m.message).substring(0, 40) : ''}</span>
          ${dateStr ? `<span style="font-size:0.75rem;color:var(--ink-faint)">📅 ${dateStr}</span>` : ''}
          <span style="font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:10px;background:${col}15;color:${col};text-transform:capitalize">${m.status}</span>
          ${isIncoming && m.status === 'pending' ? `
            <button class="btn btn-sm" style="background:#10b98122;color:#10b981;font-size:0.7rem;padding:2px 8px" onclick="DashboardPage.respondMeeting('${m.id}','accepted')">✓</button>
            <button class="btn btn-sm" style="background:#ef444422;color:#ef4444;font-size:0.7rem;padding:2px 8px" onclick="DashboardPage.respondMeeting('${m.id}','declined')">✕</button>` : ''}
        </div>`;
      }).join('');
    }
    section.style.display = 'block';
    section.innerHTML = `
      <div class="card" style="border-left:4px solid #0f766e">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
          <div style="width:48px;height:48px;border-radius:14px;background:#0f766e15;border:2px solid #0f766e;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:800;color:#0f766e;flex-shrink:0">${initials}</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:1rem;color:var(--ink)">My Physiotherapist</div>
            <div style="font-size:0.9rem;color:var(--ink-soft)">${this.escapeHtml(physio.full_name)}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="DashboardPage.showPatientMeetingForm('${physio.id}','${this.escapeHtml(physio.full_name)}')">
            <i data-lucide="video"></i> Request Meeting
          </button>
        </div>
        ${meetingsHtml ? '<div style="margin-top:8px">' + meetingsHtml + '</div>' : ''}
        <div id="dash-patient-meet-form"></div>
      </div>`;
    App.refreshIcons();
  },

  showPatientMeetingForm(physioId, physioName) {
    const form = document.getElementById('dash-patient-meet-form');
    if (!form) return;
    form.innerHTML = `
      <div style="margin-top:14px;padding:14px;background:#f8fafc;border-radius:10px">
        <div style="font-weight:700;font-size:0.9rem;margin-bottom:10px">Request Consultation with ${this.escapeHtml(physioName)}</div>
        <textarea class="form-textarea" id="pat-meet-msg" rows="2" placeholder="e.g. I'm experiencing increased pain..." style="font-size:0.85rem"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input class="form-input" id="pat-meet-date" type="date" value="${new Date().toISOString().split('T')[0]}" style="flex:1;font-size:0.85rem">
          <input class="form-input" id="pat-meet-time" type="time" value="10:00" style="flex:1;font-size:0.85rem">
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('dash-patient-meet-form').innerHTML=''">Cancel</button>
          <button class="btn btn-primary btn-sm" id="pat-meet-send" onclick="DashboardPage.sendPatientMeeting('${physioId}')"><i data-lucide="send"></i> Send</button>
        </div>
      </div>`;
    App.refreshIcons();
  },

  async sendPatientMeeting(physioId) {
    const btn = document.getElementById('pat-meet-send');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      const { error } = await sb.from('meeting_requests').insert({
        from_id: App.user.id, to_id: physioId, from_role: 'patient',
        message: (document.getElementById('pat-meet-msg').value || '').trim(),
        preferred_date: document.getElementById('pat-meet-date').value || null,
        preferred_time: document.getElementById('pat-meet-time').value || null,
      });
      if (error) { 
        document.getElementById('dash-patient-meet-form').innerHTML += `<div style="color:#ef4444;font-size:0.8rem;margin-top:8px">Error: ${error.message}</div>`;
        btn.disabled = false; btn.innerHTML = '<i data-lucide="send"></i> Send'; App.refreshIcons(); return; 
      }
      document.getElementById('dash-patient-meet-form').innerHTML = '<div style="padding:8px;color:#10b981;font-weight:700;font-size:0.85rem">✅ Meeting request sent!</div>';
      setTimeout(() => this.loadPhysioCard(), 2000);
    } catch (err) {
      document.getElementById('dash-patient-meet-form').innerHTML += `<div style="color:#ef4444;font-size:0.8rem;margin-top:8px">Exception: ${err.message}</div>`;
      btn.disabled = false; btn.innerHTML = '<i data-lucide="send"></i> Send'; App.refreshIcons();
    }
  },

  async respondMeeting(id, status) {
    try {
      const { error } = await sb.from('meeting_requests').update({ status }).eq('id', id);
      if (error) { 
        const el = document.getElementById('dash-physio-section');
        if (el) el.innerHTML += `<div style="color:#ef4444;font-size:0.8rem;margin-top:8px">Failed to update: ${error.message}</div>`;
        return; 
      }
      await this.loadPhysioCard();
    } catch (err) {
      console.error(err);
    }
  },

  titleCase(text) {
    return this.escapeHtml(String(text || '--').replace(/_/g, ' ').toLowerCase())
      .replace(/\b\w/g, (m) => m.toUpperCase());
  },

  async render() {
    const el = document.getElementById('page-content');
    const pp = App.patientProfile || {};
    const injury = this.titleCase(pp.injury_type || 'Knee Rehabilitation');
    const fullName = this.escapeHtml(App.profile?.full_name || 'Patient');
    const surgeryDate = pp.surgery_date ? new Date(pp.surgery_date).toLocaleDateString() : 'Not set';
    const joinedDate = App.user?.created_at ? new Date(App.user.created_at).toLocaleDateString() : 'Unknown';

    el.innerHTML = `
      <div class="page-header rich">
        <div>
          <div class="header-eyebrow"><i data-lucide="activity"></i> Live recovery command center</div>
          <h1>Hello, ${fullName}</h1>
          <p>${injury} plan synced with daily symptoms, clinical assessments, and ML predictions.</p>
        </div>
        <div class="header-pills">
          <span class="pill"><i data-lucide="user-plus"></i>Joined: ${joinedDate}</span>
          <span class="pill"><i data-lucide="calendar-days"></i>Surgery: ${this.escapeHtml(surgeryDate)}</span>
          <span class="pill"><i data-lucide="shield-check"></i>RehabAI active</span>
        </div>
      </div>

      <div id="dash-alert"></div>

      <div class="dashboard-grid">
        <div class="card" id="dash-score-card">
          <div class="card-title">Recovery Score</div>
          <div class="score-ring-container">
            <div class="score-ring">
              <svg viewBox="0 0 120 120">
                <circle class="bg" cx="60" cy="60" r="52"></circle>
                <circle class="fg" id="score-circle" cx="60" cy="60" r="52" stroke-dasharray="326.73" stroke-dashoffset="326.73"></circle>
              </svg>
              <div class="score-text">
                <div>
                  <div class="score-num" id="dash-score">--</div>
                  <div class="score-label">Recovery</div>
                </div>
              </div>
            </div>
          </div>
          <p class="card-sub" id="dash-score-copy">Complete a daily check-in to calculate today's recovery score.</p>
        </div>

        <div>
          <div class="insight-grid">
            <div class="card metric-card">
              <div class="accent-bar" style="background:var(--danger)"></div>
              <div class="card-title">Risk Level</div>
              <div class="card-value" id="dash-risk">--</div>
              <div class="card-sub">Current safety classification</div>
            </div>
            <div class="card metric-card">
              <div class="accent-bar" style="background:var(--primary)"></div>
              <div class="card-title">Rehab Phase</div>
              <div class="card-value" id="dash-phase" style="font-size:22px">--</div>
              <div class="card-sub">Exercise intensity guidance</div>
            </div>
            <div class="card metric-card">
              <div class="accent-bar" style="background:var(--accent)"></div>
              <div class="card-title">Days Remaining</div>
              <div class="card-value" id="dash-days" style="color:var(--accent)">--</div>
              <div class="card-sub">Estimated recovery horizon</div>
            </div>
          </div>

          <div class="metric-grid" style="margin-top:14px">
            <div class="card metric-card">
              <div class="accent-bar" style="background:var(--warning)"></div>
              <div class="card-title">Recovery Rate</div>
              <div class="card-value" id="dash-rate" style="color:var(--warning);font-size:28px">--</div>
            </div>
            <div class="card metric-card">
              <div class="accent-bar" style="background:var(--violet)"></div>
              <div class="card-title">Day Number</div>
              <div class="card-value" id="dash-daynum" style="color:var(--violet)">--</div>
            </div>
          </div>

          <div class="quick-actions">
            <a class="card quick-card" href="#checkin">
              <i data-lucide="clipboard-check"></i>
              <span><strong>Daily Check-in</strong><span>Update pain, sleep, exercise, and symptoms.</span></span>
            </a>
            <a class="card quick-card" href="#voicecoach">
              <i data-lucide="mic"></i>
              <span><strong>Voice Coach</strong><span>Speak to AI for personalized workout plans.</span></span>
            </a>
            <a class="card quick-card" href="#rpg">
              <i data-lucide="trophy"></i>
              <span><strong>RPG Stats</strong><span>Log workouts and level up your character.</span></span>
            </a>
            <a class="card quick-card" href="#meals">
              <i data-lucide="utensils"></i>
              <span><strong>Meal Planner</strong><span>Generate recovery-focused meal plans.</span></span>
            </a>
            <a class="card quick-card" href="#chat">
              <i data-lucide="bot"></i>
              <span><strong>Ask RehabAI</strong><span>Get recovery guidance from the assistant.</span></span>
            </a>
          </div>
        </div>
      </div>

      <div id="dash-empty" class="card empty-state" style="display:none;margin-top:16px">
        <i data-lucide="line-chart"></i>
        <h3>No predictions yet</h3>
        <p>Complete your first daily check-in to activate ML recovery analytics.</p>
        <a href="#checkin" class="btn btn-primary" style="margin-top:16px"><i data-lucide="arrow-right"></i>Start Check-in</a>
      </div>

      <div class="card section" style="margin-top:16px">
        <div class="section-title">Rehabilitation Workflow</div>
        <div class="workflow-progress" id="dash-workflow"></div>
      </div>

      <div id="dash-physio-section" style="margin-top:16px;display:none"></div>`;

    App.refreshIcons();
    await this.loadData();
    this.loadWorkflow();
    this.loadPhysioCard();
  },

  async loadData() {
    try {
      const user = App.user;
      const { data } = await sb.from('ml_predictions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
      if (!data) {
        document.getElementById('dash-empty').style.display = 'block';
        App.refreshIcons();
        return;
      }

      const s = data.recovery_score ?? 0;
      document.getElementById('dash-score').textContent = Math.round(s);
      const circ = 2 * Math.PI * 52;
      document.getElementById('score-circle').style.strokeDashoffset = circ - (circ * s / 100);
      const scoreCol = s >= 70 ? 'var(--success)' : s >= 40 ? 'var(--warning)' : 'var(--danger)';
      document.getElementById('score-circle').style.stroke = scoreCol;
      document.getElementById('dash-score').style.color = scoreCol;
      document.getElementById('dash-score-copy').textContent = s >= 70
        ? 'Recovery is trending well. Keep following your prescribed routine.'
        : s >= 40
          ? 'Progress is moderate. Consistency and symptom control matter today.'
          : 'Recovery needs attention. Review pain, swelling, and physio guidance.';

      const risk = data.risk_level || '--';
      const riskEl = document.getElementById('dash-risk');
      riskEl.textContent = this.titleCase(risk);
      riskEl.style.color = String(risk).toUpperCase() === 'LOW'
        ? 'var(--success)'
        : String(risk).toUpperCase() === 'MEDIUM'
          ? 'var(--warning)'
          : String(risk).toUpperCase() === 'HIGH'
            ? 'var(--danger)'
            : 'var(--ink)';

      document.getElementById('dash-phase').textContent = this.titleCase(data.rehab_phase);
      document.getElementById('dash-rate').textContent = this.titleCase(data.recovery_rate);
      // Day number: strictly calculate from account creation date
      let dn = 1;
      const joinedDate = App.user?.created_at;
      if (joinedDate) {
        dn = Math.max(1, Math.ceil((Date.now() - new Date(joinedDate).getTime()) / 86400000));
      }
      document.getElementById('dash-daynum').textContent = `Day ${dn}`;

      // Days remaining: strictly 30-day recovery horizon
      const daysRemaining = Math.max(0, 30 - dn);
      document.getElementById('dash-days').textContent = daysRemaining;

      if (data.physio_alert) {
        document.getElementById('dash-alert').innerHTML = `
          <div class="alert-banner alert-danger">
            <i data-lucide="triangle-alert"></i>
            Physio alert: contact your physiotherapist before increasing exercise intensity.
          </div>`;
        App.refreshIcons();
      }
    } catch (e) {
      document.getElementById('dash-empty').style.display = 'block';
      App.refreshIcons();
    }
  },

  async loadWorkflow() {
    const userId = App.user?.id;
    if (!userId) return;

    const pp = App.patientProfile || {};
    const joinedDate = App.user?.created_at;
    let dn = 1;
    if (joinedDate) {
        dn = Math.max(1, Math.ceil((Date.now() - new Date(joinedDate).getTime()) / 86400000));
    }

    const steps = [
      { label: 'Acute Recovery', desc: 'Days 1-7', icon: 'activity', maxDay: 7 },
      { label: 'Early Mobility', desc: 'Days 8-14', icon: 'footprints', maxDay: 14 },
      { label: 'Strengthening', desc: 'Days 15-21', icon: 'dumbbell', maxDay: 21 },
      { label: 'Functional', desc: 'Days 22-30', icon: 'person-standing', maxDay: 30 },
      { label: 'Graduation', desc: 'Day 30+', icon: 'award', maxDay: 999 },
    ];

    const el = document.getElementById('dash-workflow');
    if (!el) return;
    el.innerHTML = steps.map((s, i) => {
      const isDone = dn > s.maxDay;
      const isActive = dn <= s.maxDay && (i === 0 || dn > steps[i-1].maxDay);
      const cls = isDone ? 'wf-step done' : isActive ? 'wf-step active' : 'wf-step';
      const icon = isDone ? 'check-circle-2' : s.icon;
      return `<div class="${cls}">
        <div class="wf-num">${isDone ? `<i data-lucide="${icon}"></i>` : `<i data-lucide="${s.icon}"></i>`}</div>
        <span>${this.escapeHtml(s.label)}</span>
        <span style="font-size:9px;color:var(--ink-faint)">${s.desc}</span>
      </div>`;
    }).join('<div class="wf-connector"></div>');
    App.refreshIcons();
  },

  escapeHtml(text) {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },
};
