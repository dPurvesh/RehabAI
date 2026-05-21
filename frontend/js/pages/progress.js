// Progress Page — Enhanced with pain trends, ROM charts, exercise accuracy, and session performance
const ProgressPage = {
  async render() {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header rich">
        <div>
          <div class="header-eyebrow"><i data-lucide="trending-up"></i> Clinical trend tracking</div>
          <h1>Recovery Progress</h1>
          <p>Monitor ML scores, pain trends, ROM progress, exercise performance, and clinical assessments.</p>
        </div>
        <div class="header-pills">
          <span class="pill"><i data-lucide="line-chart"></i>Score history</span>
          <span class="pill"><i data-lucide="clipboard-list"></i>Assessment log</span>
        </div>
      </div>

      <div class="progress-charts-grid">
        <div class="card section">
          <div class="section-title">Recovery Score History</div>
          <div class="chart-canvas-wrap"><canvas id="prog-score-canvas" height="200"></canvas></div>
        </div>
        <div class="card section">
          <div class="section-title">Pain Trend</div>
          <div class="chart-canvas-wrap"><canvas id="prog-pain-canvas" height="200"></canvas></div>
        </div>
      </div>

      <div class="progress-charts-grid">
        <div class="card section">
          <div class="section-title">Exercise Accuracy (%)</div>
          <div class="chart-canvas-wrap"><canvas id="prog-exercise-canvas" height="200"></canvas></div>
        </div>
        <div class="card section">
          <div class="section-title">Webcam Form Quality</div>
          <div class="chart-canvas-wrap"><canvas id="prog-form-canvas" height="200"></canvas></div>
        </div>
      </div>

      <div class="card section">
        <div class="section-title">Weekly Self-Assessment</div>
        <p class="form-hint">Track your recovery milestones each week. Answer these simple questions to help RehabAI understand how your knee is improving!</p>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Knee Bending Angle (Degrees)</label>
            <div style="font-size:11px; color:#64748b; margin-bottom:4px">How far can you bend your knee? (0 = straight, 140 = fully bent)</div>
            <input class="form-input" id="wa-flex" type="number" min="0" max="180" placeholder="e.g., 90">
          </div>
          <div class="form-group">
            <label class="form-label">Knee Straightening Gap (Degrees)</label>
            <div style="font-size:11px; color:#64748b; margin-bottom:4px">Can you straighten it fully? (0 = perfectly straight)</div>
            <input class="form-input" id="wa-ext" type="number" min="0" max="30" placeholder="e.g., 5">
          </div>
        </div>
        
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Leg Strength (1-5)</label>
            <input class="form-input" id="wa-str" type="number" min="1" max="5" placeholder="1 = Weak, 5 = Strong">
          </div>
          <div class="form-group">
            <label class="form-label">Balance & Stability (1-5)</label>
            <input class="form-input" id="wa-bal" type="number" min="1" max="5" placeholder="1 = Poor, 5 = Excellent">
          </div>
          <div class="form-group">
            <label class="form-label">Thigh Muscle Control (1-5)</label>
            <input class="form-input" id="wa-quad" type="number" min="1" max="5" placeholder="1 = None, 5 = Perfect">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Walking Ability</label>
            <div style="font-size:11px; color:#64748b; margin-bottom:4px">How are you moving around today?</div>
            <select class="form-select" id="wa-gait">
              <option value="" selected>Select your current status</option>
              <option value="non_weight_bearing">Cannot put weight on leg</option>
              <option value="partial">Can put some weight (Crutches)</option>
              <option value="full_assisted">Walking with a cane or walker</option>
              <option value="independent">Walking normally without help</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Daily Activity Level (0-100)</label>
            <div style="font-size:11px; color:#64748b; margin-bottom:4px">How easily can you do daily chores?</div>
            <input class="form-input" id="wa-func" type="number" min="0" max="100" placeholder="e.g., 50">
          </div>
        </div>
        <button class="btn btn-primary" onclick="ProgressPage.saveAssessment()"><i data-lucide="save"></i>Save My Progress</button>
        <div id="wa-result" style="margin-top:12px"></div>
      </div>`;
    App.refreshIcons();
    await this.loadAllCharts();
  },

  async loadAllCharts() {
    const userId = App.user?.id;
    if (!userId) return;

    // Load recovery scores
    const { data: scores } = await sb.from('ml_predictions')
      .select('recovery_score,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }).limit(14);
    this.drawLineChart('prog-score-canvas', scores, 'recovery_score', 100, {
      lineColor: '#1769aa', fillColor: 'rgba(23,105,170,0.1)',
      goodThresh: 70, warnThresh: 40
    });

    // Load pain trends from daily check-ins
    const { data: checkins } = await sb.from('daily_checkins')
      .select('pain_level,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }).limit(14);
    this.drawLineChart('prog-pain-canvas', checkins, 'pain_level', 10, {
      lineColor: '#c2413a', fillColor: 'rgba(194,65,58,0.08)',
      invertColor: true
    });

    // Load exercise accuracy
    const { data: exercises } = await sb.from('daily_checkins')
      .select('exercises_completed_percent,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }).limit(14);
    this.drawLineChart('prog-exercise-canvas', exercises, 'exercises_completed_percent', 100, {
      lineColor: '#0f9f8f', fillColor: 'rgba(15,159,143,0.08)',
      goodThresh: 70, warnThresh: 40
    });

    // Load webcam session form quality
    const { data: sessions } = await sb.from('exercise_sessions')
      .select('avg_form_score,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }).limit(14);
    this.drawLineChart('prog-form-canvas', sessions, 'avg_form_score', 100, {
      lineColor: '#6554c0', fillColor: 'rgba(101,84,192,0.08)',
      goodThresh: 70, warnThresh: 40
    });
  },

  drawLineChart(canvasId, data, field, maxVal, opts = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '200px';
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 200;
    const padL = 40, padR = 16, padT = 16, padB = 30;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    ctx.clearRect(0, 0, w, h);

    if (!data || data.length === 0) {
      ctx.fillStyle = '#8291a3';
      ctx.font = '13px Manrope, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data yet — complete check-ins to see trends', w / 2, h / 2);
      return;
    }

    const points = data.map((d, i) => {
      const val = d[field] ?? 0;
      const x = padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
      const y = padT + plotH - (val / maxVal) * plotH;
      return { x, y, val, date: new Date(d.created_at) };
    });

    // Grid lines
    ctx.strokeStyle = '#edf3f8';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = padT + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(w - padR, gy);
      ctx.stroke();
      ctx.fillStyle = '#8291a3';
      ctx.font = '10px Manrope, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (i / 4) * maxVal), padL - 6, gy + 3);
    }

    // Fill area
    ctx.beginPath();
    ctx.moveTo(points[0].x, padT + plotH);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = opts.fillColor || 'rgba(23,105,170,0.1)';
    ctx.fill();

    // Line
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = opts.lineColor || '#1769aa';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    points.forEach((p) => {
      let dotColor = opts.lineColor || '#1769aa';
      if (!opts.invertColor) {
        if (opts.goodThresh && p.val >= opts.goodThresh) dotColor = '#248a57';
        else if (opts.warnThresh && p.val >= opts.warnThresh) dotColor = '#b7791f';
        else if (opts.warnThresh && p.val < opts.warnThresh) dotColor = '#c2413a';
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Date labels
    ctx.fillStyle = '#8291a3';
    ctx.font = '10px Manrope, sans-serif';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(points.length / 7));
    points.forEach((p, i) => {
      if (i % step === 0 || i === points.length - 1) {
        ctx.fillText(`${p.date.getDate()}/${p.date.getMonth() + 1}`, p.x, h - 6);
      }
    });
  },

  async saveAssessment() {
    try {
      const required = [
        ['wa-flex', 'ROM flexion'],
        ['wa-ext', 'ROM extension deficit'],
        ['wa-str', 'strength'],
        ['wa-bal', 'balance'],
        ['wa-quad', 'quad activation'],
        ['wa-gait', 'gait status'],
        ['wa-func', 'functional mobility'],
      ];
      const missing = required
        .filter(([id]) => document.getElementById(id).value === '')
        .map(([, label]) => label);
      if (missing.length) {
        throw new Error(`Please enter ${missing.join(', ')} before saving.`);
      }
      await sb.from('weekly_assessments').insert({
        user_id: App.user.id,
        rom_flexion: +document.getElementById('wa-flex').value,
        rom_extension_deficit: +document.getElementById('wa-ext').value,
        muscle_strength_score: +document.getElementById('wa-str').value,
        balance_score: +document.getElementById('wa-bal').value,
        quad_activation_score: +document.getElementById('wa-quad').value,
        gait_status: document.getElementById('wa-gait').value,
        functional_mobility_score: +document.getElementById('wa-func').value,
      });
      document.getElementById('wa-result').innerHTML = '<div class="alert-banner alert-success"><i data-lucide="check-circle-2"></i>Assessment saved</div>';
    } catch (e) {
      document.getElementById('wa-result').innerHTML = `<div class="alert-banner alert-danger"><i data-lucide="circle-alert"></i>${e.message}</div>`;
    }
    App.refreshIcons();
  },
};
