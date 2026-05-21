const API = process.env.EXPO_PUBLIC_FLASK_API_URL || 'http://127.0.0.1:5000';

export async function predict(data: Record<string, any>) {
  const res = await fetch(`${API}/api/predict`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${API}/api/health`);
  return res.json();
}

export async function getEncodings() {
  const res = await fetch(`${API}/api/encodings`);
  return res.json();
}

export async function generatePlan(context: Record<string, any>) {
  const res = await fetch(`${API}/api/generate-plan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });
  return res.json();
}

export async function chatWithAI(message: string, context: Record<string, any>) {
  const res = await fetch(`${API}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, patient_context: context }),
  });
  return res.json();
}

export async function extractReport(text: string) {
  const res = await fetch(`${API}/api/extract-report`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return res.json();
}
