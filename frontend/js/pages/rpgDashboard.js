// RPG Gamification Dashboard
const RPGDashboardPage = {
  STORAGE_KEY: 'rehabai_rpg_data',
  XP_PER_LEVEL: 100,

  defaultData() {
    return {
      characterName: App.profile?.full_name || 'Warrior',
      level: 1,
      totalXP: 0,
      stats: { endurance: 0, strength: 0, flexibility: 0, consistency: 0 },
      workouts: [],
      achievements: [],
      streak: 0,
      lastWorkoutDate: null,
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) return { ...this.defaultData(), ...JSON.parse(raw) };
    } catch {}
    return this.defaultData();
  },

  save(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  render() {
    const el = document.getElementById('page-content');
    const data = this.load();

    const xpPercent = (data.stats.endurance + data.stats.strength + data.stats.flexibility + data.stats.consistency) / 4;

    let canLog = true;
    let cooldownMsg = '';
    const lastW = data.workouts.length ? data.workouts[data.workouts.length - 1] : null;
    if (lastW) {
      const lastTime = new Date(lastW.date).getTime();
      const cooldownMs = (lastW.duration * 60000) + (60 * 60000); // Duration + 1 hr
      const now = Date.now();
      if (now < lastTime + cooldownMs) {
        canLog = false;
        const rem = (lastTime + cooldownMs) - now;
        const rH = Math.floor(rem / 3600000);
        const rM = Math.floor((rem % 3600000) / 60000);
        cooldownMsg = `Healthy recovery requires rest. Next workout unlocks in ${rH > 0 ? rH + 'h ' : ''}${rM}m.`;
      }
    }

    el.innerHTML = `
      <div class="page-header rich">
        <div>
          <div class="header-eyebrow"><i data-lucide="trophy"></i> RPG fitness gamification</div>
          <h1>Warrior Dashboard</h1>
          <p>Log workouts, gain XP, level up your recovery character, and unlock achievements!</p>
        </div>
        <div class="header-pills">
          <span class="pill"><i data-lucide="star"></i>Level ${data.level}</span>
          <span class="pill"><i data-lucide="flame"></i>${data.streak} day streak</span>
        </div>
      </div>

      <div class="rpg-layout">
        <div class="rpg-character-panel">
          <div class="card rpg-character-card">
            <div class="rpg-avatar-area">
              <div class="rpg-avatar" id="rpg-avatar">
                ${this.renderAvatar(data.level)}
              </div>
              <div class="rpg-level-ring">
                <svg viewBox="0 0 120 120">
                  <circle class="rpg-ring-bg" cx="60" cy="60" r="52"></circle>
                  <circle class="rpg-ring-fg" cx="60" cy="60" r="52"
                    stroke-dasharray="326.73"
                    stroke-dashoffset="${326.73 - (326.73 * xpPercent / 100)}"></circle>
                </svg>
              </div>
            </div>
            <h3 class="rpg-name">${this.escapeHtml(data.characterName)}</h3>
            <div class="rpg-class">${this.getClassName(data.level)}</div>
            <div class="rpg-xp-bar">
              <div class="rpg-xp-fill" style="width:${xpPercent}%"></div>
              <span class="rpg-xp-text">${Math.round(xpPercent)}% to next level</span>
            </div>
            <div class="rpg-total-xp">Level up requires 100/100 in all stats</div>
          </div>

          <div class="card rpg-stats-card">
            <div class="card-title"><i data-lucide="bar-chart-3"></i> Character Stats</div>
            ${this.renderStatBar('Endurance', data.stats.endurance, '#6366f1')}
            ${this.renderStatBar('Strength', data.stats.strength, '#f43f5e')}
            ${this.renderStatBar('Flexibility', data.stats.flexibility, '#10b981')}
            ${this.renderStatBar('Consistency', data.stats.consistency, '#f59e0b')}
          </div>
        </div>

        <div class="rpg-main-panel">
          <div class="card rpg-log-card">
            <div class="card-title"><i data-lucide="plus-circle"></i> Log Workout</div>
            <div class="rpg-log-form">
              <div class="form-group">
                <label>Workout Type</label>
                <select id="rpg-workout-type" class="form-select">
                  <option value="stretching">Stretching / Flexibility</option>
                  <option value="strength">Strength Training</option>
                  <option value="cardio">Cardio / Walking</option>
                  <option value="balance">Balance Exercises</option>
                  <option value="physio">Physiotherapy Session</option>
                  <option value="yoga">Yoga / Meditation</option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Duration (min)</label>
                  <input type="number" id="rpg-duration" class="form-input" value="20" min="1" max="180">
                </div>
                <div class="form-group">
                  <label>Intensity (1-5)</label>
                  <input type="number" id="rpg-intensity" class="form-input" value="3" min="1" max="5">
                </div>
              </div>
              <div class="form-group">
                <label>Notes (optional)</label>
                <input type="text" id="rpg-notes" class="form-input" placeholder="How did it go?">
              </div>
              <button class="btn btn-primary btn-full ${canLog ? '' : 'disabled'}" onclick="${canLog ? 'RPGDashboardPage.logWorkout()' : 'return false'}">
                <i data-lucide="sword"></i> ${canLog ? 'Complete Quest' : 'Resting Phase'}
              </button>
              ${!canLog ? `<div style="text-align:center;font-size:12px;color:var(--danger);margin-top:10px;font-weight:600;"><i data-lucide="timer" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i>${cooldownMsg}</div>` : ''}
            </div>
          </div>

          <div class="card rpg-achievements-card">
            <div class="card-title"><i data-lucide="award"></i> Achievements</div>
            <div class="rpg-badges-grid" id="rpg-badges">
              ${this.renderAchievements(data)}
            </div>
          </div>

          <div class="card rpg-history-card">
            <div class="card-title"><i data-lucide="scroll-text"></i> Quest Log</div>
            <div class="rpg-history" id="rpg-history">
              ${this.renderHistory(data.workouts)}
            </div>
          </div>
        </div>
      </div>

      <div id="rpg-levelup-overlay" class="rpg-levelup-overlay hidden"></div>`;

    App.refreshIcons();

    // Animate stat bars after render
    setTimeout(() => {
      document.querySelectorAll('.rpg-stat-fill').forEach(bar => {
        bar.style.width = bar.dataset.width;
      });
    }, 100);
  },

  renderAvatar(level) {
    const gradients = [
      'linear-gradient(135deg, #6366f1, #8b5cf6)',  // L1-4: Indigo
      'linear-gradient(135deg, #3b82f6, #06b6d4)',  // L5-9: Blue
      'linear-gradient(135deg, #10b981, #059669)',  // L10-14: Emerald
      'linear-gradient(135deg, #f59e0b, #ef4444)',  // L15-19: Fire
      'linear-gradient(135deg, #fbbf24, #f59e0b)',  // L20+: Gold
    ];
    const gIdx = level >= 20 ? 4 : level >= 15 ? 3 : level >= 10 ? 2 : level >= 5 ? 1 : 0;
    const tier = level >= 20 ? '👑' : level >= 15 ? '⚔️' : level >= 10 ? '🛡️' : level >= 5 ? '💪' : '🌱';
    return `
      <div class="rpg-avatar-inner" style="background: ${gradients[gIdx]}; box-shadow: 0 12px 28px rgba(99,102,241,0.3);">
        <span class="rpg-avatar-emoji" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.15));">${tier}</span>
      </div>`;
  },

  getClassName(level) {
    if (level >= 20) return '🏆 Legendary Champion';
    if (level >= 15) return '⚔️ Master Warrior';
    if (level >= 10) return '🛡️ Iron Guardian';
    if (level >= 5) return '💪 Rising Fighter';
    return '🌱 Recovery Recruit';
  },

  renderStatBar(label, value, color) {
    const pct = Math.min(100, Math.max(0, value));
    return `
      <div class="rpg-stat-row">
        <span class="rpg-stat-label">${label}</span>
        <div class="rpg-stat-bar-track" style="background: #edf3f8;">
          <div class="rpg-stat-fill" data-width="${pct}%" style="width:0%;background:${color};box-shadow:0 0 10px ${color}66;"></div>
        </div>
        <span class="rpg-stat-val" style="min-width:45px;text-align:right;">${Math.round(pct)}<span style="font-size:10px;color:var(--ink-faint)">/100</span></span>
      </div>`;
  },

  renderAchievements(data) {
    const allAchievements = [
      { id: 'first_workout', name: 'First Steps', icon: '🎯', desc: 'Log your first workout' },
      { id: 'streak_3', name: 'Hat Trick', icon: '🔥', desc: '3-day workout streak' },
      { id: 'streak_7', name: 'Iron Will', icon: '⚡', desc: '7-day workout streak' },
      { id: 'level_5', name: 'Rising Star', icon: '⭐', desc: 'Reach Level 5' },
      { id: 'level_10', name: 'Unstoppable', icon: '🚀', desc: 'Reach Level 10' },
      { id: 'workouts_10', name: 'Dedicated', icon: '💎', desc: 'Complete 10 workouts' },
      { id: 'workouts_25', name: 'Warrior', icon: '🗡️', desc: 'Complete 25 workouts' },
      { id: 'xp_500', name: 'XP Hunter', icon: '🏅', desc: 'Earn 500 total XP' },
      { id: 'variety', name: 'Jack of All', icon: '🎭', desc: 'Try all 6 workout types' },
      { id: 'hour_session', name: 'Endurance', icon: '⏱️', desc: 'Log a 60+ min workout' },
    ];

    return allAchievements.map(a => {
      const unlocked = data.achievements.includes(a.id);
      return `<div class="rpg-badge ${unlocked ? 'unlocked' : 'locked'}">
        <span class="rpg-badge-icon">${a.icon}</span>
        <span class="rpg-badge-name">${a.name}</span>
        <span class="rpg-badge-desc">${a.desc}</span>
      </div>`;
    }).join('');
  },

  renderHistory(workouts) {
    if (!workouts.length) {
      return '<div class="rpg-empty">No quests completed yet. Log your first workout above!</div>';
    }
    return workouts.slice(-10).reverse().map(w => {
      const icons = { stretching: '🧘', strength: '🏋️', cardio: '🏃', balance: '⚖️', physio: '🏥', yoga: '🧘‍♂️' };
      const dt = new Date(w.date);
      const timeAgo = this.timeAgo(dt);
      return `<div class="rpg-history-item">
        <span class="rpg-history-icon">${icons[w.type] || '💪'}</span>
        <div class="rpg-history-info">
          <strong>${this.escapeHtml(w.type.charAt(0).toUpperCase() + w.type.slice(1))}</strong>
          <span>${w.duration}min · Intensity ${w.intensity}/5 · +${w.xpGained}XP</span>
          ${w.notes ? `<span class="rpg-history-note">${this.escapeHtml(w.notes)}</span>` : ''}
        </div>
        <span class="rpg-history-time">${timeAgo}</span>
      </div>`;
    }).join('');
  },

  logWorkout() {
    const type = document.getElementById('rpg-workout-type').value;
    const duration = parseInt(document.getElementById('rpg-duration').value) || 20;
    const intensity = Math.min(5, Math.max(1, parseInt(document.getElementById('rpg-intensity').value) || 3));
    const notes = document.getElementById('rpg-notes').value.trim();

    const data = this.load();

    // Calculate XP: base 10 + duration bonus + intensity bonus
    const xpGained = 10 + Math.floor(duration / 5) * 2 + intensity * 3;

    const workout = {
      type,
      duration,
      intensity,
      notes,
      xpGained,
      date: new Date().toISOString(),
    };

    data.workouts.push(workout);
    data.totalXP += xpGained;

    // Stat updates based on workout type
    const statMap = {
      stretching: 'flexibility',
      strength: 'strength',
      cardio: 'endurance',
      balance: 'flexibility',
      physio: 'consistency',
      yoga: 'flexibility',
    };
    const mainStat = statMap[type] || 'endurance';
    
    // Add XP to stats up to max 100
    data.stats[mainStat] = Math.min(100, data.stats[mainStat] + xpGained);
    data.stats.consistency = Math.min(100, data.stats.consistency + Math.floor(xpGained / 2));
    
    // Distribute a tiny bit of secondary XP to other stats just to prevent extreme bottlenecks
    for (const s of ['endurance', 'strength', 'flexibility']) {
      if (s !== mainStat) data.stats[s] = Math.min(100, data.stats[s] + 2);
    }

    // Streak calculation
    const today = new Date().toDateString();
    const lastDate = data.lastWorkoutDate ? new Date(data.lastWorkoutDate).toDateString() : null;
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (lastDate === yesterday) {
        data.streak += 1;
      } else if (lastDate !== today) {
        data.streak = 1;
      }
      data.lastWorkoutDate = new Date().toISOString();
    }

    // Level up check: requires all 4 stats to be 100
    let leveledUp = false;
    if (data.stats.endurance === 100 && data.stats.strength === 100 && data.stats.flexibility === 100 && data.stats.consistency === 100) {
      data.level += 1;
      data.stats = { endurance: 0, strength: 0, flexibility: 0, consistency: 0 };
      leveledUp = true;
    }

    // Check achievements
    this.checkAchievements(data);

    this.save(data);

    if (leveledUp) {
      this.showLevelUp(data.level);
    }

    // Re-render
    this.render();
  },

  checkAchievements(data) {
    const add = (id) => { if (!data.achievements.includes(id)) data.achievements.push(id); };

    if (data.workouts.length >= 1) add('first_workout');
    if (data.streak >= 3) add('streak_3');
    if (data.streak >= 7) add('streak_7');
    if (data.level >= 5) add('level_5');
    if (data.level >= 10) add('level_10');
    if (data.workouts.length >= 10) add('workouts_10');
    if (data.workouts.length >= 25) add('workouts_25');
    if (data.totalXP >= 500) add('xp_500');

    const types = new Set(data.workouts.map(w => w.type));
    if (types.size >= 6) add('variety');

    if (data.workouts.some(w => w.duration >= 60)) add('hour_session');
  },

  showLevelUp(newLevel) {
    const overlay = document.getElementById('rpg-levelup-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="rpg-levelup-content">
        <div class="rpg-levelup-particles" id="rpg-particles"></div>
        <div class="rpg-levelup-badge">
          <span class="rpg-levelup-icon">⚔️</span>
          <h2>LEVEL UP!</h2>
          <div class="rpg-levelup-level">Level ${newLevel}</div>
          <p class="rpg-levelup-class">${this.getClassName(newLevel)}</p>
          <button class="btn btn-primary" onclick="RPGDashboardPage.closeLevelUp()">Continue Quest</button>
        </div>
      </div>`;
    this.createConfetti();
  },

  closeLevelUp() {
    const overlay = document.getElementById('rpg-levelup-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  createConfetti() {
    const container = document.getElementById('rpg-particles');
    if (!container) return;
    const colors = ['#6366f1', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#ec4899'];
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
      container.appendChild(confetti);
    }
  },

  timeAgo(date) {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
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
