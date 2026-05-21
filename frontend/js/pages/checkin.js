// Daily Check-in Page
const CheckinPage = {
  fields: {
    pain_level: 0,
    swelling_level: 1,
    stiffness_level: 1,
    fatigue_level: 1,
    mood_score: 1,
    exercises_completed_percent: 0,
    exercise_duration_mins: 0,
    exercise_difficulty: 1,
    steps_walked: 0,
    sleep_hours: 0,
    sleep_quality: 1,
    times_woken_up: 0,
    rested_feeling: 1,
    medication_taken: 0,
    physio_session_today: 0,
    ice_applied_today: 0,
    independence_level: 1,
  },

  async render() {
    const el = document.getElementById('page-content');
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const d = new Date();
    const todayLocal = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

    // Check if user already submitted today
    if (!this.isEditing) {
      const { data: existing, error } = await sb.from('daily_checkins')
        .select('*')
        .eq('user_id', App.user.id)
        .eq('checkin_date', todayLocal)
        .maybeSingle();

      if (error) console.error('[Checkin] Lock check error:', error);

      if (existing) {
        // Pre-fill fields for editing later
        for (const k in this.fields) if (existing[k] !== undefined) this.fields[k] = existing[k];

        el.innerHTML = `
          <div class="page-header rich">
            <div>
              <div class="header-eyebrow"><i data-lucide="check-circle-2"></i> All caught up!</div>
              <h1>Daily Check-in Complete</h1>
              <p>${today}. You have successfully logged your progress for today. Keep up the great work!</p>
            </div>
          </div>
          <div class="card" style="text-align:center; padding: 40px 20px; max-width: 500px; margin: 40px auto;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); width: 80px; height: 80px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 20px; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);">
              <i data-lucide="check" style="color: white; width: 40px; height: 40px;"></i>
            </div>
            <h2>You're done for today!</h2>
            <p style="color: var(--ink-faint); margin-bottom: 24px;">Your progress has been saved and your ML recovery score has been updated. Come back tomorrow!</p>
            <button class="btn" style="background: #e2e8f0; color: #475569;" onclick="CheckinPage.isEditing = true; CheckinPage.render()">
              <i data-lucide="edit-3"></i> Edit Today's Check-in
            </button>
          </div>
        `;
        App.refreshIcons();
        return;
      }
    }

    el.innerHTML = `
      <div class="page-header rich">
        <div>
          <div class="header-eyebrow"><i data-lucide="clipboard-check"></i> Daily recovery input</div>
          <h1>Daily Check-in</h1>
          <p>${today}. These values power RehabAI's prediction and exercise recommendations.</p>
        </div>
        <div class="header-pills">
          <span class="pill"><i data-lucide="timer"></i>2 minute workflow</span>
          <span class="pill"><i data-lucide="brain"></i>ML ready</span>
        </div>
      </div>

      <div class="two-column">
        <div class="card section">
          <div class="section-title">Pain & Symptoms</div>
          <p class="form-hint">Defaults are the lowest valid scale values. Adjust them to today's actual condition before submitting.</p>
          ${this.slider('Pain Level', 'pain_level', 0, 10, 0.5)}
          ${this.slider('Swelling', 'swelling_level', 1, 5)}
          ${this.slider('Stiffness', 'stiffness_level', 1, 5)}
          ${this.slider('Fatigue', 'fatigue_level', 1, 10)}
          ${this.slider('Mood', 'mood_score', 1, 5)}
        </div>

        <div class="card section">
          <div class="section-title">Exercise</div>
          <p class="form-hint">Use actual values for today. For example, steps can be 2000 if that is what the patient walked.</p>
          ${this.slider('Completion %', 'exercises_completed_percent', 0, 100, 5)}
          ${this.slider('Duration (min)', 'exercise_duration_mins', 0, 90, 5)}
          ${this.slider('Difficulty', 'exercise_difficulty', 1, 5)}
          <div class="slider-row">
            <span class="slider-label">Steps Walked</span>
            <input class="form-input" id="f-steps_walked" type="number" min="0" placeholder="e.g., 2000" style="max-width:130px;text-align:center" value="${this.fields.steps_walked}">
          </div>
        </div>

        <div class="card section">
          <div class="section-title">Sleep Quality</div>
          <p class="form-hint">Enter the patient's latest sleep details. Keep hours at 0 only if not recorded.</p>
          ${this.slider('Hours', 'sleep_hours', 0, 12, 0.5)}
          ${this.slider('Quality', 'sleep_quality', 1, 5)}
          ${this.slider('Times Woken', 'times_woken_up', 0, 10)}
          ${this.slider('Rested Feeling', 'rested_feeling', 1, 5)}
        </div>

        <div class="card section">
          <div class="section-title">Medical Signals</div>
          <p class="form-hint">Switch these on only if they happened today.</p>
          ${this.toggle('Medication Taken', 'medication_taken')}
          ${this.toggle('Physio Session Today', 'physio_session_today')}
          ${this.toggle('Ice Applied', 'ice_applied_today')}
          ${this.slider('Independence', 'independence_level', 1, 5)}
        </div>
      </div>

      <div class="card section">
        <div class="section-title">Patient Note</div>
        <textarea class="form-textarea" id="f-notes" placeholder="Add anything your physiotherapist should know today..."></textarea>
      </div>

      <button class="btn btn-primary btn-full btn-lg" id="checkin-submit" onclick="CheckinPage.submit()">
        <i data-lucide="sparkles"></i>${this.isEditing ? 'Update Check-in' : 'Submit Check-in & Get Prediction'}
      </button>
      <div id="checkin-result" style="margin-top:20px"></div>`;
    App.refreshIcons();
  },

  slider(label, key, min, max, step = 1) {
    return `<div class="slider-row">
      <span class="slider-label">${label}</span>
      <div class="slider-group">
        <input type="range" id="f-${key}" min="${min}" max="${max}" step="${step}" value="${this.fields[key]}" oninput="document.getElementById('v-${key}').textContent=this.value">
        <span class="slider-val" id="v-${key}">${this.fields[key]}</span>
      </div>
    </div>`;
  },

  toggle(label, key) {
    return `<div class="toggle-row"><span class="slider-label">${label}</span><div class="toggle-switch ${this.fields[key] ? 'on' : ''}" id="t-${key}" onclick="CheckinPage.toggleField('${key}')"></div></div>`;
  },

  toggleField(key) {
    this.fields[key] = this.fields[key] ? 0 : 1;
    document.getElementById(`t-${key}`).classList.toggle('on');
  },

  async submit() {
    const btn = document.getElementById('checkin-submit');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      const pp = App.patientProfile;
      const user = App.user;
      const joinedDate = App.user?.created_at;
      let dayNumber = 1;
      if (joinedDate) {
        dayNumber = Math.max(1, Math.ceil((Date.now() - new Date(joinedDate).getTime()) / 86400000));
      }
      const vals = {};
      for (const k of Object.keys(this.fields)) {
        const el = document.getElementById(`f-${k}`);
        vals[k] = el ? +(el.value || this.fields[k] || 0) : this.fields[k];
      }

      const d = new Date();
      const todayLocal = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

      const checkinData = {
        user_id: user.id,
        checkin_date: todayLocal,
        day_number: dayNumber,
        ...vals,
        notes: document.getElementById('f-notes').value || null,
      };
      const { data: checkin, error: cErr } = await sb.from('daily_checkins').upsert(checkinData, { onConflict: 'user_id,checkin_date' }).select().single();
      if (cErr) throw cErr;

      const { data: assessment } = await sb.from('weekly_assessments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
      const payload = {
        age: pp.age,
        gender: pp.gender,
        weight_kg: pp.weight_kg,
        height_cm: pp.height_cm,
        bmi: pp.bmi,
        injury_type: pp.injury_type,
        surgery_type: pp.surgery_type,
        severity: pp.injury_severity,
        comorbidity: pp.comorbidities,
        activity: pp.activity_before_injury,
        graft_type: pp.graft_type || 'none',
        affected_side: pp.affected_side || 'right',
        day_number: dayNumber,
        ...vals,
        range_of_motion_flexion: assessment?.rom_flexion ?? 45,
        range_of_motion_extension: assessment?.rom_extension_deficit ?? 8,
        muscle_strength_score: assessment?.muscle_strength_score ?? 2,
        balance_score: assessment?.balance_score ?? 2,
        gait_status: assessment?.gait_status ?? 'partial',
        functional_mobility_score: assessment?.functional_mobility_score ?? 40,
        quad_activation_score: assessment?.quad_activation_score ?? 2,
        brace_status: assessment?.brace_status ?? 'hinged_limited',
        pain_trend_7day: 0,
        exercise_trend_7day: 0,
        sleep_trend_7day: 0,
        in_relapse: 0,
      };

      const result = await api.predict(payload);
      if (result.status !== 'success') throw new Error(result.errors?.join(', ') || 'Prediction failed');
      const p = result.predictions;
      await sb.from('ml_predictions').insert({
        user_id: user.id,
        checkin_id: checkin.id,
        recovery_score: p.recovery_score,
        risk_level: p.risk_level,
        recovery_rate: p.recovery_rate,
        days_remaining: p.days_remaining,
        physio_alert: p.physio_alert,
        rehab_phase: p.rehab_phase,
        risk_probabilities: p.risk_probabilities,
        rate_probabilities: p.rate_probabilities,
        phase_probabilities: p.phase_probabilities,
        physio_alert_confidence: p.physio_alert_confidence,
      });
      document.getElementById('checkin-result').innerHTML = `
        <div class="alert-banner alert-success">
          <i data-lucide="check-circle-2"></i>
          Check-in complete. Recovery Score: <strong>${Math.round(p.recovery_score)}</strong> | Risk: <strong>${p.risk_level}</strong> | Phase: <strong>${p.rehab_phase}</strong>
          <a href="#dashboard" style="margin-left:auto;font-weight:900">View Dashboard</a>
        </div>`;
      this.isEditing = false;
    } catch (e) {
      document.getElementById('checkin-result').innerHTML = `<div class="alert-banner alert-danger"><i data-lucide="circle-alert"></i>${e.message || 'Something went wrong'}</div>`;
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="sparkles"></i>Submit Check-in & Get Prediction';
    App.refreshIcons();
  },
};
