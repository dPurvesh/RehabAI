const Tutorial = {
  index: 0,
  manual: false,
  steps: [
    {
      page: 'dashboard',
      icon: 'layout-dashboard',
      title: 'Welcome to RehabAI',
      text: 'This is your recovery command center. It shows recovery score, risk level, rehab phase, days remaining, and quick actions.',
      action: 'Start with the dashboard after every check-in to understand today\'s recovery status.',
    },
    {
      page: 'checkin',
      icon: 'clipboard-check',
      title: 'Daily Check-in',
      text: 'Enter pain, swelling, stiffness, exercise, sleep, and medical signals. These values feed the ML prediction model.',
      action: 'Complete this once per day before reviewing predictions.',
    },
    {
      page: 'exercises',
      icon: 'dumbbell',
      title: 'Exercise Library',
      text: 'Browse phase-based knee rehab exercises. Use Play Demo for animated guidance and Start Knee Camera for lower-limb tracking.',
      action: 'Use Play Demo before trying a movement, then use Knee Camera to check hip-knee-ankle alignment.',
    },
    {
      page: 'chat',
      icon: 'bot',
      title: 'AI Assistant',
      text: 'Ask RehabAI recovery questions. It uses your injury, phase, pain, and latest score as context.',
      action: 'Use it for guidance, but keep medical decisions with your physiotherapist.',
    },
    {
      page: 'progress',
      icon: 'trending-up',
      title: 'Progress Tracking',
      text: 'View recovery score trends and save weekly clinical assessment values like ROM, strength, balance, gait, and mobility.',
      action: 'Update assessments weekly so predictions have better clinical context.',
    },
    {
      page: 'journey',
      icon: 'trophy',
      title: 'Recovery Journey',
      text: 'Log personal wins and clinical milestones. This helps patients stay motivated during long rehab periods.',
      action: 'Record milestones like walking without support, lower pain, better ROM, or completed physio sessions.',
    },
    {
      page: 'report',
      icon: 'file-text',
      title: 'Medical Report AI',
      text: 'Paste MRI notes, surgery summaries, or discharge notes. Gemini extracts diagnosis, surgery details, restrictions, medication, and physiotherapy instructions.',
      action: 'Use this to quickly convert report text into structured rehab context.',
    },
    {
      page: 'emergency',
      icon: 'siren',
      title: 'Emergency Contacts',
      text: 'Store physiotherapist, surgeon, family, and emergency contacts so help is easy to find.',
      action: 'Add contacts before starting active rehab routines.',
    },
    {
      page: 'profile',
      icon: 'user-round',
      title: 'Profile',
      text: 'Review your medical profile details: injury type, surgery, severity, affected side, BMI, activity level, and comorbidities.',
      action: 'Keep this accurate because RehabAI uses it for predictions and personalization.',
    },
  ],

  start(options = {}) {
    this.manual = Boolean(options.manual);
    this.index = 0;
    this.render();
    this.goToStep(0);
  },

  maybeAutoStart() {
    if (!App.user) return;
    const key = this.storageKey();
    if (localStorage.getItem(key) === 'yes') return;
    setTimeout(() => this.start({ manual: false }), 450);
  },

  storageKey() {
    return `rehabai_tutorial_seen_${App.user?.id || 'guest'}`;
  },

  render() {
    document.getElementById('tutorial-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', `
      <div class="tutorial-modal" id="tutorial-modal">
        <div class="tutorial-panel">
          <div class="tutorial-top">
            <div>
              <div class="header-eyebrow"><i data-lucide="map"></i>Web app tutorial</div>
              <h2 id="tutorial-title">Welcome to RehabAI</h2>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="Tutorial.finish(false)"><i data-lucide="x"></i>Close</button>
          </div>
          <div class="tutorial-content">
            <div class="tutorial-visual">
              <div class="tutorial-icon" id="tutorial-icon"></div>
              <div class="tutorial-route" id="tutorial-route"></div>
            </div>
            <div class="tutorial-copy">
              <p id="tutorial-text"></p>
              <div class="tutorial-action" id="tutorial-action"></div>
              <div class="tutorial-progress" id="tutorial-progress"></div>
            </div>
          </div>
          <div class="tutorial-footer">
            <button class="btn btn-secondary" id="tutorial-prev" onclick="Tutorial.prev()"><i data-lucide="arrow-left"></i>Back</button>
            <button class="btn btn-secondary" onclick="Tutorial.finish(true)">Skip Tutorial</button>
            <button class="btn btn-primary" id="tutorial-next" onclick="Tutorial.next()">Next<i data-lucide="arrow-right"></i></button>
          </div>
        </div>
      </div>
    `);
    App.refreshIcons();
  },

  goToStep(nextIndex) {
    this.index = Math.max(0, Math.min(nextIndex, this.steps.length - 1));
    const step = this.steps[this.index];
    if (App.currentPage !== step.page) {
      location.hash = `#${step.page}`;
    }

    document.getElementById('tutorial-title').textContent = step.title;
    document.getElementById('tutorial-text').textContent = step.text;
    document.getElementById('tutorial-action').textContent = step.action;
    document.getElementById('tutorial-route').textContent = `${this.index + 1} of ${this.steps.length} - ${this.pageLabel(step.page)}`;
    document.getElementById('tutorial-icon').innerHTML = `<i data-lucide="${step.icon}"></i>`;
    document.getElementById('tutorial-progress').innerHTML = this.steps
      .map((_, i) => `<span class="${i === this.index ? 'active' : i < this.index ? 'done' : ''}"></span>`)
      .join('');

    document.getElementById('tutorial-prev').disabled = this.index === 0;
    document.getElementById('tutorial-next').innerHTML = this.index === this.steps.length - 1
      ? 'Finish<i data-lucide="check"></i>'
      : 'Next<i data-lucide="arrow-right"></i>';
    App.refreshIcons();
  },

  pageLabel(page) {
    return page
      .replace('checkin', 'Daily Check-in')
      .replace('chat', 'AI Assistant')
      .replace('report', 'Medical Report')
      .replace(/^\w/, (m) => m.toUpperCase());
  },

  next() {
    if (this.index >= this.steps.length - 1) {
      this.finish(true);
      return;
    }
    this.goToStep(this.index + 1);
  },

  prev() {
    this.goToStep(this.index - 1);
  },

  finish(markSeen) {
    document.getElementById('tutorial-modal')?.remove();
    if (markSeen && App.user) {
      localStorage.setItem(this.storageKey(), 'yes');
    }
  },
};
