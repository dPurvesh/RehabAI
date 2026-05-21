// Flask API Client
const API_BASE = (window.KNEE_CONFIG && window.KNEE_CONFIG.API_BASE_URL) || window.location.origin;
const REQUEST_TIMEOUT_MS = 30000;  // 30s default

async function request(path, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message = payload?.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot reach server. Check internet connectivity and backend status.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const api = {
  async predict(data) {
    return request('/api/predict', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
  },
  async health() { return request('/api/health'); },
  async encodings() { return request('/api/encodings'); },
  async generatePlan(ctx) {
    return request('/api/generate-plan', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(ctx) });
  },
  async chat(message, ctx) {
    return request('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message, patient_context: ctx }) });
  },
  async extractReport(text) {
    return request('/api/extract-report', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ text }) }, 45000);  // 45s for PDF parsing
  },
  async voiceCoach(message, ctx) {
    return request('/api/voice/coach', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message, patient_context: ctx }) });
  },
  async voiceMotivate() {
    return request('/api/voice/motivate', { method:'POST', headers:{'Content-Type':'application/json'} });
  },
  async generateMeal(data) {
    return request('/api/meal/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }, 60000);  // 60s for full meal plan generation
  },
};

