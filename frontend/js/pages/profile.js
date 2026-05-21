// Profile Page
const ProfilePage = {
  async render() {
    const p = App.profile || {};
    const pp = App.patientProfile || {};
    const el = document.getElementById('page-content');

    // Fetch Physio Link Status
    let physioHtml = '';
    if (p.role === 'patient') {
      const { data: link } = await sb.from('physio_patients')
        .select('physio_id')
        .eq('patient_id', App.user.id)
        .eq('status', 'active')
        .single();
        
      if (link) {
        const { data: physio } = await sb.from('profiles').select('full_name').eq('id', link.physio_id).single();
        physioHtml = `
          <div class="card" style="margin-bottom:20px;border-left:4px solid #10b981">
            <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:10px"><i data-lucide="stethoscope" style="width:18px;height:18px;vertical-align:middle;margin-right:6px"></i> My Physiotherapist</div>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div>
                <div style="font-weight:600">${physio?.full_name || 'Linked Physio'}</div>
                <div style="font-size:0.8rem;color:var(--ink-soft)">Monitoring your recovery progress</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="ProfilePage.unlinkPhysio('${link.physio_id}')">Unlink</button>
            </div>
          </div>`;
      } else {
        physioHtml = `
          <div class="card" style="margin-bottom:20px">
            <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:10px"><i data-lucide="link" style="width:18px;height:18px;vertical-align:middle;margin-right:6px"></i> Link Physiotherapist</div>
            <p style="font-size:0.85rem;color:var(--ink-soft);margin-bottom:12px">Enter your physiotherapist's unique code to allow them to monitor your recovery remotely.</p>
            <div style="display:flex;gap:10px">
              <input class="form-input" id="profile-physio-code" placeholder="e.g. PHY-A3F9K2" style="text-transform:uppercase">
              <button class="btn btn-primary" onclick="ProfilePage.linkPhysio()">Link</button>
            </div>
            <div id="profile-physio-msg" style="margin-top:8px;font-size:0.85rem"></div>
          </div>`;
      }
    }

    const injuryLabel = (pp.injury_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const severityColor = { mild: '#10b981', moderate: '#f59e0b', severe: '#ef4444' }[pp.injury_severity] || '#6366f1';
    const initials = (p.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const joinDate = p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
    const isPhysio = p.role === 'physio';
    const heroGradient = isPhysio
      ? 'linear-gradient(135deg,#0f766e,#14b8a6,#2dd4bf)'
      : 'linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa)';

    // Build role-specific badge pills
    let heroPills = '';
    if (isPhysio) {
      if (p.physio_specialization) heroPills += `<span style="padding:4px 12px;border-radius:20px;background:rgba(255,255,255,0.2);font-size:0.78rem;font-weight:600">${p.physio_specialization}</span>`;
      if (p.physio_hospital) heroPills += `<span style="padding:4px 12px;border-radius:20px;background:rgba(255,255,255,0.15);font-size:0.78rem;font-weight:600">${p.physio_hospital}</span>`;
    } else {
      if (pp.injury_type) heroPills += `<span style="padding:4px 12px;border-radius:20px;background:rgba(255,255,255,0.2);font-size:0.78rem;font-weight:600">${injuryLabel}</span>`;
      if (pp.injury_severity) heroPills += `<span style="padding:4px 12px;border-radius:20px;background:${severityColor}44;border:1px solid ${severityColor};font-size:0.78rem;font-weight:600;color:#fff;text-transform:capitalize">${pp.injury_severity} severity</span>`;
    }

    // Build the main body section depending on role
    let bodyHtml = '';
    if (isPhysio) {
      bodyHtml = `
        ${physioHtml}

        <!-- Physio Code Card -->
        <div class="card" style="margin-bottom:20px;border-left:4px solid #0f766e">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <div style="width:36px;height:36px;border-radius:10px;background:#0f766e22;display:flex;align-items:center;justify-content:center"><i data-lucide="key-round" style="color:#0f766e;width:18px;height:18px"></i></div>
            <div style="font-weight:700;font-size:1rem">My Physio Code</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <div style="font-size:1.6rem;font-weight:800;letter-spacing:3px;color:#0f766e;font-family:monospace">${p.physio_code || '—'}</div>
            <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${p.physio_code || ''}').then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)})">Copy</button>
          </div>
          <p style="font-size:0.8rem;color:var(--ink-faint);margin-top:8px">Share this code with patients so they can link to you and allow remote monitoring.</p>
        </div>

        <!-- Professional Details -->
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
            <div style="width:36px;height:36px;border-radius:10px;background:#0f766e22;display:flex;align-items:center;justify-content:center"><i data-lucide="stethoscope" style="color:#0f766e;width:18px;height:18px"></i></div>
            <div style="font-weight:700;font-size:1rem">Professional Details</div>
          </div>
          <div class="info-grid">
            ${this.row('🏥 Hospital / Clinic', p.physio_hospital)}
            ${this.row('🎓 Specialization', p.physio_specialization)}
            ${this.row('📜 Qualification', p.physio_qualification)}
            ${this.row('🪪 License No.', p.physio_license)}
            ${this.row('📅 Experience', p.physio_experience_years ? p.physio_experience_years + ' years' : null)}
            ${this.row('📍 City', p.physio_city)}
            ${this.row('🗺️ State', p.physio_state)}
            ${this.row('📞 Phone', p.physio_phone)}
          </div>
          ${p.physio_bio ? `<div style="margin-top:14px;padding:14px;background:#f8fafc;border-radius:10px;font-size:0.88rem;color:var(--ink-soft);line-height:1.6"><strong style="color:var(--ink)">Bio:</strong> ${p.physio_bio}</div>` : ''}
        </div>`;
    } else {
      bodyHtml = `
        <!-- Stats Row (patient only) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px;margin-bottom:20px">
          ${this.statCard('🎂', 'Age', pp.age ? pp.age + ' yrs' : '—')}
          ${this.statCard('⚖️', 'BMI', pp.bmi ? parseFloat(pp.bmi).toFixed(1) : '—')}
          ${this.statCard('🦵', 'Graft', (pp.graft_type || 'none').replace(/_/g, ' '))}
          ${this.statCard('📅', 'Member Since', joinDate)}
        </div>

        ${physioHtml}

        <!-- Medical Details -->
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
            <div style="width:36px;height:36px;border-radius:10px;background:#6366f122;display:flex;align-items:center;justify-content:center"><i data-lucide="stethoscope" style="color:#6366f1;width:18px;height:18px"></i></div>
            <div style="font-weight:700;font-size:1rem;color:var(--text-primary)">Medical Profile</div>
          </div>
          <div class="info-grid">
            ${this.row('🦴 Injury Type', pp.injury_type)}
            ${this.row('⚡ Severity', pp.injury_severity)}
            ${this.row('🔪 Surgery', pp.surgery_type)}
            ${this.row('📅 Surgery Date', pp.surgery_date)}
            ${this.row('🦵 Affected Side', pp.affected_side)}
            ${this.row('💊 Comorbidities', pp.comorbidities)}
            ${this.row('🏃 Pre-injury Activity', pp.activity_before_injury)}
            ${this.row('👨‍⚕️ Surgeon', pp.surgeon_name)}
            ${this.row('🏥 Physiotherapist', pp.physio_name)}
          </div>
        </div>`;
    }

    el.innerHTML = `
      <div class="page-header rich">
        <div>
          <div class="header-eyebrow"><i data-lucide="${isPhysio ? 'stethoscope' : 'user-round'}"></i> ${isPhysio ? 'Physiotherapist profile' : 'Patient record'}</div>
          <h1>My Profile</h1>
          <p>${isPhysio ? 'Your professional details and Physio Code for the RehabAI portal.' : 'Your personal and medical details used by RehabAI for predictions and guidance.'}</p>
        </div>
      </div>

      <!-- Hero Profile Card -->
      <div class="card" style="margin-bottom:20px;background:${heroGradient};border:none;padding:32px;position:relative;overflow:hidden">
        <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.07)"></div>
        <div style="position:absolute;bottom:-60px;left:-20px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,0.05)"></div>
        <div style="display:flex;align-items:center;gap:20px;position:relative">
          <div style="width:80px;height:80px;border-radius:20px;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:#fff;flex-shrink:0">${initials}</div>
          <div style="color:#fff">
            <div style="font-size:1.6rem;font-weight:800;letter-spacing:-0.5px">${isPhysio ? 'Dr. ' : ''}${p.full_name || (isPhysio ? 'Doctor' : 'Patient')}</div>
            <div style="opacity:0.85;font-size:0.9rem;margin-top:4px">${p.email || ''}</div>
            <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
              ${heroPills}
              <span style="padding:4px 12px;border-radius:20px;background:rgba(255,255,255,0.15);font-size:0.78rem;font-weight:600">Since ${joinDate}</span>
            </div>
          </div>
        </div>
      </div>

      ${bodyHtml}

      <!-- Account Actions -->
      <div class="card" style="margin-bottom:20px">
        <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:16px">Account</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${isPhysio
            ? `<button class="btn btn-secondary" onclick="App.showPhysioOnboarding()" style="flex:1;min-width:150px"><i data-lucide="edit-3"></i>Update Professional Info</button>`
            : `<button class="btn btn-secondary" onclick="App.showOnboarding()" style="flex:1;min-width:150px"><i data-lucide="edit-3"></i>Update Medical Info</button>`}
          <button class="btn btn-danger" onclick="App.signOut()" style="flex:1;min-width:150px"><i data-lucide="log-out"></i>Sign Out</button>
        </div>
      </div>`;
    App.refreshIcons();
  },

  async linkPhysio() {
    const code = document.getElementById('profile-physio-code').value.trim().toUpperCase();
    const msg = document.getElementById('profile-physio-msg');
    if (!code) { msg.textContent = 'Please enter a code'; msg.style.color = '#ef4444'; return; }
    
    try {
      const { data, error } = await sb.rpc('lookup_physio_by_code', { p_code: code });
      
      if (error) {
        msg.textContent = 'Error: ' + error.message; msg.style.color = '#ef4444'; return;
      }
      if (!data || data.length === 0) {
        msg.textContent = 'No physio found with code ' + code; msg.style.color = '#ef4444'; return;
      }
      
      const physioId = data[0].id;
      
      const { error: linkErr } = await sb.from('physio_patients').upsert({
        physio_id: physioId,
        patient_id: App.user.id,
        status: 'active'
      });
      
      if (linkErr) {
        msg.textContent = 'Failed to link: ' + linkErr.message; msg.style.color = '#ef4444'; return;
      }
      
      msg.textContent = 'Physiotherapist linked successfully!';
      msg.style.color = '#10b981';
      setTimeout(() => this.render(), 1000);
    } catch (err) {
      console.error('[LinkPhysio] Exception:', err);
      msg.textContent = 'Network or system error. Please try again.';
      msg.style.color = '#ef4444';
    }
  },

  async unlinkPhysio(physioId) {
    if(!confirm("Are you sure you want to remove your physiotherapist? They will no longer be able to see your recovery data.")) return;
    await sb.from('physio_patients').delete().eq('patient_id', App.user.id).eq('physio_id', physioId);
    this.render();
  },

  statCard(icon, label, value) {
    return `<div class="card" style="padding:16px;text-align:center">
      <div style="font-size:1.6rem;margin-bottom:6px">${icon}</div>
      <div style="font-size:1rem;font-weight:700;color:var(--text-primary)">${value}</div>
      <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px">${label}</div>
    </div>`;
  },

  row(label, value) {
    const formatted = value ? value.toString().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
    return `<div class="info-row"><span class="info-key">${label}</span><span class="info-val">${formatted}</span></div>`;
  },
};
