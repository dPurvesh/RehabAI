// Physio Dashboard — Full portal for physiotherapists
const PhysioDashboardPage = {
  selectedPatient: null,

  async render() {
    const el = document.getElementById('page-content');
    const physioCode = App.profile?.physio_code || 'N/A';
    const name = App.profile?.full_name || 'Doctor';

    el.innerHTML = `
      <div class="page-header rich" style="background:linear-gradient(135deg,#0f766e,#14b8a6,#2dd4bf);border-radius:16px;padding:32px;color:#fff;margin-bottom:24px;position:relative;overflow:hidden">
        <div style="position:absolute;top:-30px;right:-30px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.08)"></div>
        <div style="position:absolute;bottom:-40px;left:30%;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.05)"></div>
        <div style="position:relative">
          <div class="header-eyebrow" style="color:rgba(255,255,255,0.85)"><i data-lucide="stethoscope"></i> Physiotherapist Portal</div>
          <h1 style="color:#fff;margin-bottom:4px">Welcome, Dr. ${this.escapeHtml(name)}</h1>
          <p style="opacity:0.85">Monitor your patients' recovery progress, review check-ins, and manage meeting requests.</p>
          <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <div style="background:rgba(255,255,255,0.2);padding:8px 16px;border-radius:10px;font-weight:700;font-size:0.95rem;letter-spacing:1px;backdrop-filter:blur(4px)">
              <i data-lucide="key-round" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i>
              Your Code: <span id="physio-code-display">${this.escapeHtml(physioCode)}</span>
            </div>
            <button class="btn" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);font-size:0.8rem" onclick="PhysioDashboardPage.copyCode()">
              <i data-lucide="copy"></i> Copy Code
            </button>
          </div>
          <p style="margin-top:8px;font-size:0.8rem;opacity:0.7">Share this code with your patients so they can link to you during onboarding.</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px" id="physio-stats-row">
        <div class="card" style="text-align:center;padding:20px">
          <div style="font-size:2rem;font-weight:800;color:#0f766e" id="physio-patient-count">0</div>
          <div style="font-size:0.8rem;color:var(--ink-soft);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Active Patients</div>
        </div>
        <div class="card" style="text-align:center;padding:20px">
          <div style="font-size:2rem;font-weight:800;color:#f59e0b" id="physio-pending-meets">0</div>
          <div style="font-size:0.8rem;color:var(--ink-soft);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Pending Requests</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <div style="width:36px;height:36px;border-radius:10px;background:#0f766e22;display:flex;align-items:center;justify-content:center"><i data-lucide="users" style="color:#0f766e;width:18px;height:18px"></i></div>
          <div style="font-weight:700;font-size:1rem">My Patients</div>
        </div>
        <div id="physio-patients-list"><div class="meal-loading"><div class="meal-loading-spinner"></div><p>Loading patients...</p></div></div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <div style="width:36px;height:36px;border-radius:10px;background:#f59e0b22;display:flex;align-items:center;justify-content:center"><i data-lucide="calendar-clock" style="color:#f59e0b;width:18px;height:18px"></i></div>
          <div style="font-weight:700;font-size:1rem">Meeting Requests</div>
        </div>
        <div id="physio-meetings-list"><p style="color:var(--ink-soft);font-size:0.9rem">Loading...</p></div>
      </div>

      <div id="physio-patient-detail" style="display:none"></div>`;

    App.refreshIcons();
    await this.loadPatients();
    await this.loadMeetings();
  },

  copyCode() {
    const code = App.profile?.physio_code || '';
    navigator.clipboard.writeText(code).then(() => {
      const btn = event.target.closest('button');
      const orig = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="check"></i> Copied!';
      App.refreshIcons();
      setTimeout(() => { btn.innerHTML = orig; App.refreshIcons(); }, 2000);
    });
  },

  async loadPatients() {
    const list = document.getElementById('physio-patients-list');
    const { data: links, error } = await sb.from('physio_patients')
      .select('patient_id, linked_at, status')
      .eq('physio_id', App.user.id)
      .eq('status', 'active');

    if (error || !links?.length) {
      list.innerHTML = `
        <div class="empty-state" style="padding:24px;text-align:center">
          <i data-lucide="user-search" style="width:48px;height:48px;color:var(--ink-faint);margin-bottom:12px"></i>
          <h3 style="color:var(--ink-soft)">No patients linked yet</h3>
          <p style="color:var(--ink-faint);font-size:0.9rem">Share your Physio Code with patients so they can link to you during onboarding.</p>
        </div>`;
      App.refreshIcons();
      document.getElementById('physio-patient-count').textContent = '0';
      return;
    }

    document.getElementById('physio-patient-count').textContent = links.length;

    // Fetch patient profiles & latest checkins
    const patientIds = links.map(l => l.patient_id);
    const { data: profiles } = await sb.from('profiles').select('id, full_name, email').in('id', patientIds);
    const { data: patientProfiles } = await sb.from('patient_profiles').select('user_id, injury_type, injury_severity, surgery_date').in('user_id', patientIds);

    const profileMap = {};
    (profiles || []).forEach(p => profileMap[p.id] = p);
    const ppMap = {};
    (patientProfiles || []).forEach(p => ppMap[p.user_id] = p);

    const severityColors = { mild: '#10b981', moderate: '#f59e0b', severe: '#ef4444' };

    list.innerHTML = links.map(link => {
      const prof = profileMap[link.patient_id] || {};
      const pp = ppMap[link.patient_id] || {};
      const initials = (prof.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const injury = (pp.injury_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const sevColor = severityColors[pp.injury_severity] || '#6366f1';
      const joinedDate = link.linked_at ? new Date(link.linked_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

      return `
        <div class="card" style="margin-bottom:12px;padding:18px;border-left:4px solid ${sevColor};display:flex;align-items:center;gap:16px;cursor:pointer;transition:transform 0.15s" onclick="PhysioDashboardPage.viewPatient('${link.patient_id}')" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='none'">
          <div style="width:48px;height:48px;border-radius:14px;background:${sevColor}15;border:2px solid ${sevColor};display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:800;color:${sevColor};flex-shrink:0">${initials}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:1rem;color:var(--ink)">${this.escapeHtml(prof.full_name || 'Patient')}</div>
            <div style="color:var(--ink-soft);font-size:0.85rem;margin-top:2px">${injury || 'Unknown injury'}</div>
            <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
              ${pp.injury_severity ? `<span style="font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:12px;background:${sevColor}15;color:${sevColor};text-transform:capitalize">${pp.injury_severity}</span>` : ''}
              <span style="font-size:0.72rem;color:var(--ink-faint)">Linked ${joinedDate}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0">
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();PhysioDashboardPage.showMeetingForm('${link.patient_id}','${this.escapeHtml(prof.full_name || 'Patient')}')">
              <i data-lucide="video"></i> Meet
            </button>
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();PhysioDashboardPage.viewPatient('${link.patient_id}')">
              <i data-lucide="eye"></i> View
            </button>
          </div>
        </div>`;
    }).join('');
    App.refreshIcons();
  },

  async viewPatient(patientId) {
    const detail = document.getElementById('physio-patient-detail');
    detail.style.display = 'block';
    detail.innerHTML = '<div class="card"><div class="meal-loading"><div class="meal-loading-spinner"></div><p>Loading patient data...</p></div></div>';
    detail.scrollIntoView({ behavior: 'smooth' });

    // Fetch everything in parallel
    const [profileRes, ppRes, checkinsRes, journeyRes, predRes] = await Promise.all([
      sb.from('profiles').select('full_name, email, created_at').eq('id', patientId).single(),
      sb.from('patient_profiles').select('*').eq('user_id', patientId).single(),
      sb.from('daily_checkins').select('*').eq('user_id', patientId).order('checkin_date', { ascending: false }).limit(7),
      sb.from('recovery_journey').select('*').eq('user_id', patientId).order('milestone_date', { ascending: false }).limit(5),
      sb.from('ml_predictions').select('*').eq('user_id', patientId).order('created_at', { ascending: false }).limit(1).single(),
    ]);

    const prof = profileRes.data || {};
    const pp = ppRes.data || {};
    const checkins = checkinsRes.data || [];
    const journey = journeyRes.data || [];
    const pred = predRes.data || {};
    const injury = (pp.injury_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const joinDate = prof.created_at ? new Date(prof.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
    const dn = prof.created_at ? Math.max(1, Math.ceil((Date.now() - new Date(prof.created_at).getTime()) / 86400000)) : 1;
    const daysRemaining = Math.max(0, 30 - dn);
    const surgeryDate = pp.surgery_date ? new Date(pp.surgery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const initials = (prof.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // Recovery score
    const score = pred.recovery_score ?? 0;
    const hasPred = !!predRes.data;
    const scoreCol = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
    const circ = 2 * Math.PI * 52;
    const dashOffset = hasPred ? circ - (circ * score / 100) : circ;
    
    // Risk
    const risk = (pred.risk_level || '—').replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
    const riskCol = String(pred.risk_level).toUpperCase() === 'LOW' ? '#10b981' : String(pred.risk_level).toUpperCase() === 'MEDIUM' ? '#f59e0b' : '#ef4444';
    
    // Phase & Rate
    const phase = (pred.rehab_phase || '—').replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
    const rate = (pred.recovery_rate || '—').replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
    const sevColors = { mild: '#10b981', moderate: '#f59e0b', severe: '#ef4444' };
    const sevCol = sevColors[pp.injury_severity] || '#6366f1';

    detail.innerHTML = `
      <div class="card" style="margin-bottom:20px;border-top:4px solid #0f766e">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:54px;height:54px;border-radius:16px;background:${sevCol}15;border:2px solid ${sevCol};display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:800;color:${sevCol};flex-shrink:0">${initials}</div>
            <div>
              <h3 style="margin:0">${this.escapeHtml(prof.full_name || 'Patient')}</h3>
              <div style="font-size:0.85rem;color:var(--ink-soft)">${injury || 'Unknown'} · ${(pp.injury_severity||'—').replace(/\b\w/g,c=>c.toUpperCase())} severity · ${pp.affected_side||'—'} side</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('physio-patient-detail').style.display='none'"><i data-lucide="x"></i> Close</button>
        </div>

        <!-- ML Predictions Dashboard -->
        <div style="display:grid;grid-template-columns:200px 1fr;gap:16px;margin-bottom:20px">
          <!-- Recovery Score Ring -->
          <div style="text-align:center;padding:20px;background:#f8fafc;border-radius:14px">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-faint);margin-bottom:8px">Recovery Score</div>
            <div style="width:120px;height:120px;margin:0 auto;position:relative">
              <svg viewBox="0 0 120 120" style="transform:rotate(-90deg)">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" stroke-width="10"></circle>
                <circle cx="60" cy="60" r="52" fill="none" stroke="${scoreCol}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}" style="transition:stroke-dashoffset 1s"></circle>
              </svg>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                <div style="font-size:2.2rem;font-weight:800;color:${scoreCol}">${hasPred ? Math.round(score) : '--'}</div>
                <div style="font-size:0.7rem;color:var(--ink-faint)">RECOVERY</div>
              </div>
            </div>
          </div>

          <!-- Stats Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div style="padding:16px;background:#f8fafc;border-radius:12px;border-left:3px solid ${riskCol}">
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-faint)">Risk Level</div>
              <div style="font-size:1.4rem;font-weight:800;color:${riskCol};margin-top:4px">${hasPred ? risk : '--'}</div>
            </div>
            <div style="padding:16px;background:#f8fafc;border-radius:12px;border-left:3px solid #6366f1">
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-faint)">Rehab Phase</div>
              <div style="font-size:1.2rem;font-weight:800;color:#6366f1;margin-top:4px">${hasPred ? phase : '--'}</div>
            </div>
            <div style="padding:16px;background:#f8fafc;border-radius:12px;border-left:3px solid #8b5cf6">
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-faint)">Days Remaining</div>
              <div style="font-size:1.8rem;font-weight:800;color:#8b5cf6;margin-top:4px">${daysRemaining}</div>
            </div>
            <div style="padding:16px;background:#f8fafc;border-radius:12px;border-left:3px solid #f59e0b">
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-faint)">Recovery Rate</div>
              <div style="font-size:1.4rem;font-weight:800;color:#f59e0b;margin-top:4px">${hasPred ? rate : '--'}</div>
            </div>
            <div style="padding:16px;background:#f8fafc;border-radius:12px;border-left:3px solid #0f766e">
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-faint)">Recovery Day</div>
              <div style="font-size:1.8rem;font-weight:800;color:#0f766e;margin-top:4px">Day ${dn}</div>
            </div>
            <div style="padding:16px;background:#f8fafc;border-radius:12px;border-left:3px solid #ec4899">
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-faint)">Surgery Date</div>
              <div style="font-size:1rem;font-weight:800;color:#ec4899;margin-top:4px">${surgeryDate}</div>
            </div>
          </div>
        </div>

        ${pred.physio_alert ? `<div style="padding:12px 16px;background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;margin-bottom:16px;display:flex;align-items:center;gap:10px;font-size:0.88rem;color:#b91c1c;font-weight:600"><i data-lucide="triangle-alert" style="width:18px;height:18px;flex-shrink:0"></i> Physio alert: patient should be contacted before increasing exercise intensity.</div>` : ''}

        <!-- Medical Profile Summary -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:20px;padding:16px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0">
          <div><span style="font-size:0.72rem;color:#065f46;font-weight:700;text-transform:uppercase">Age</span><div style="font-weight:700;color:#065f46">${pp.age || '—'} yrs</div></div>
          <div><span style="font-size:0.72rem;color:#065f46;font-weight:700;text-transform:uppercase">BMI</span><div style="font-weight:700;color:#065f46">${pp.bmi ? parseFloat(pp.bmi).toFixed(1) : '—'}</div></div>
          <div><span style="font-size:0.72rem;color:#065f46;font-weight:700;text-transform:uppercase">Graft Type</span><div style="font-weight:700;color:#065f46">${(pp.graft_type||'—').replace(/_/g,' ')}</div></div>
          <div><span style="font-size:0.72rem;color:#065f46;font-weight:700;text-transform:uppercase">Member Since</span><div style="font-weight:700;color:#065f46">${joinDate}</div></div>
        </div>

        <h4 style="margin-bottom:10px"><i data-lucide="clipboard-check" style="width:16px;height:16px;vertical-align:middle"></i> Recent Check-ins (Last 7)</h4>
        ${checkins.length ? `
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
              <thead><tr style="background:#f1f5f9">
                <th style="padding:8px;text-align:left">Date</th>
                <th style="padding:8px;text-align:center">Pain</th>
                <th style="padding:8px;text-align:center">Sleep (h)</th>
                <th style="padding:8px;text-align:center">Exercise %</th>
                <th style="padding:8px;text-align:center">Mood</th>
                <th style="padding:8px;text-align:center">Steps</th>
              </tr></thead>
              <tbody>
                ${checkins.map(c => {
                  const painColor = c.pain_level <= 3 ? '#10b981' : c.pain_level <= 6 ? '#f59e0b' : '#ef4444';
                  return `<tr style="border-bottom:1px solid #f1f5f9">
                    <td style="padding:8px;font-weight:600">${new Date(c.checkin_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</td>
                    <td style="padding:8px;text-align:center"><span style="color:${painColor};font-weight:700">${c.pain_level ?? '—'}</span>/10</td>
                    <td style="padding:8px;text-align:center">${c.sleep_hours ?? '—'}</td>
                    <td style="padding:8px;text-align:center">${c.exercises_completed_percent ?? '—'}%</td>
                    <td style="padding:8px;text-align:center">${c.mood_score ?? '—'}/10</td>
                    <td style="padding:8px;text-align:center">${c.steps_walked ?? '—'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>` : '<p style="color:var(--ink-faint);font-size:0.9rem">No check-ins recorded yet.</p>'}

        <h4 style="margin-top:20px;margin-bottom:10px"><i data-lucide="map" style="width:16px;height:16px;vertical-align:middle"></i> Recent Milestones</h4>
        ${journey.length ? journey.map(m => `
          <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <div style="width:8px;height:8px;border-radius:50%;background:#0f766e;margin-top:6px;flex-shrink:0"></div>
            <div>
              <div style="font-weight:700;font-size:0.9rem">${this.escapeHtml(m.title)}</div>
              <div style="font-size:0.78rem;color:var(--ink-faint)">${new Date(m.milestone_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
            </div>
          </div>`).join('') : '<p style="color:var(--ink-faint);font-size:0.9rem">No milestones logged yet.</p>'}
      </div>`;
    App.refreshIcons();
  },

  async loadMeetings() {
    const list = document.getElementById('physio-meetings-list');
    const { data, error } = await sb.from('meeting_requests')
      .select('*')
      .or(`from_id.eq.${App.user.id},to_id.eq.${App.user.id}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data?.length) {
      list.innerHTML = '<p style="color:var(--ink-faint);font-size:0.9rem">No meeting requests yet.</p>';
      document.getElementById('physio-pending-meets').textContent = '0';
      return;
    }

    const pending = data.filter(m => m.status === 'pending' && m.to_id === App.user.id);
    document.getElementById('physio-pending-meets').textContent = pending.length;

    // Collect all user IDs we need names for
    const userIds = [...new Set(data.flatMap(m => [m.from_id, m.to_id]))];
    const { data: profiles } = await sb.from('profiles').select('id, full_name').in('id', userIds);
    const nameMap = {};
    (profiles || []).forEach(p => nameMap[p.id] = p.full_name);

    const statusColors = { pending: '#f59e0b', accepted: '#10b981', declined: '#ef4444' };
    const statusIcons = { pending: 'clock', accepted: 'check-circle-2', declined: 'x-circle' };

    list.innerHTML = data.map(m => {
      const isIncoming = m.to_id === App.user.id;
      const otherName = nameMap[isIncoming ? m.from_id : m.to_id] || 'Unknown';
      const col = statusColors[m.status] || '#6366f1';
      const icon = statusIcons[m.status] || 'clock';
      const dateStr = m.preferred_date ? new Date(m.preferred_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '';
      const timeStr = m.preferred_time || '';

      return `
        <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #f1f5f9">
          <div style="width:36px;height:36px;border-radius:10px;background:${col}15;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i data-lucide="${icon}" style="width:18px;height:18px;color:${col}"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:0.9rem">${isIncoming ? '📥' : '📤'} ${isIncoming ? 'From' : 'To'}: ${this.escapeHtml(otherName)}</div>
            ${m.message ? `<div style="font-size:0.82rem;color:var(--ink-soft);margin-top:2px">${this.escapeHtml(m.message)}</div>` : ''}
            ${dateStr ? `<div style="font-size:0.78rem;color:var(--ink-faint);margin-top:2px">📅 ${dateStr} ${timeStr ? '⏰ ' + timeStr : ''}</div>` : ''}
          </div>
          <span style="font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:12px;background:${col}15;color:${col};text-transform:capitalize">${m.status}</span>
          ${isIncoming && m.status === 'pending' ? `
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm" style="background:#10b98122;color:#10b981;border:1px solid #10b98144;font-size:0.75rem" onclick="PhysioDashboardPage.respondMeeting('${m.id}','accepted')">Accept</button>
              <button class="btn btn-sm" style="background:#ef444422;color:#ef4444;border:1px solid #ef444444;font-size:0.75rem" onclick="PhysioDashboardPage.respondMeeting('${m.id}','declined')">Decline</button>
            </div>` : ''}
        </div>`;
    }).join('');
    App.refreshIcons();
  },

  showMeetingForm(toId, toName) {
    const detail = document.getElementById('physio-patient-detail');
    detail.style.display = 'block';
    detail.innerHTML = `
      <div class="card" style="border-top:4px solid #f59e0b">
        <h3 style="margin-bottom:16px"><i data-lucide="video" style="width:18px;height:18px;vertical-align:middle;margin-right:6px"></i> Request Meeting with ${this.escapeHtml(toName)}</h3>
        <div class="form-group">
          <label class="form-label">Message (optional)</label>
          <textarea class="form-textarea" id="meet-msg" rows="3" placeholder="e.g. Let's discuss your ROM progress and adjust exercises..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Preferred Date</label>
            <input class="form-input" id="meet-date" type="date" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Preferred Time</label>
            <input class="form-input" id="meet-time" type="time" value="10:00">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-secondary" onclick="document.getElementById('physio-patient-detail').style.display='none'">Cancel</button>
          <button class="btn btn-primary" id="meet-send-btn" onclick="PhysioDashboardPage.sendMeeting('${toId}')"><i data-lucide="send"></i> Send Request</button>
        </div>
      </div>`;
    App.refreshIcons();
    detail.scrollIntoView({ behavior: 'smooth' });
  },

  async sendMeeting(toId) {
    const btn = document.getElementById('meet-send-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const { error } = await sb.from('meeting_requests').insert({
        from_id: App.user.id,
        to_id: toId,
        from_role: 'physio',
        message: (document.getElementById('meet-msg').value || '').trim(),
        preferred_date: document.getElementById('meet-date').value || null,
        preferred_time: document.getElementById('meet-time').value || null,
      });

      if (error) {
        document.getElementById('physio-patient-detail').innerHTML += `<div style="color:#ef4444;font-size:0.8rem;margin-top:8px;padding:8px">Error: ${error.message}</div>`;
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send"></i> Send Request';
        App.refreshIcons();
        return;
      }

      document.getElementById('physio-patient-detail').innerHTML = `
        <div class="card"><div class="alert-banner alert-success" style="margin-bottom:16px"><i data-lucide="check-circle-2"></i> Meeting request sent successfully!</div></div>`;
      App.refreshIcons();
      await this.loadMeetings();
      setTimeout(() => { document.getElementById('physio-patient-detail').style.display = 'none'; }, 3000);
    } catch (err) {
      document.getElementById('physio-patient-detail').innerHTML += `<div style="color:#ef4444;font-size:0.8rem;margin-top:8px;padding:8px">Exception: ${err.message}</div>`;
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="send"></i> Send Request';
      App.refreshIcons();
    }
  },

  async respondMeeting(id, status) {
    try {
      const { error } = await sb.from('meeting_requests').update({ status }).eq('id', id);
      if (error) { 
        alert('Failed: ' + error.message); 
        return; 
      }
      await this.loadMeetings();
    } catch (err) {
      console.error(err);
    }
  },

  escapeHtml(text) {
    return String(text ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  },
};
