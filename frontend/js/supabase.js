// Supabase Client
const runtimeConfig = window.KNEE_CONFIG || {};
const SUPABASE_URL = runtimeConfig.SUPABASE_URL || 'https://fwpfixmbsczsekzjsxtj.supabase.co';
const SUPABASE_KEY = runtimeConfig.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3cGZpeG1ic2N6c2VrempzeHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzMyNjAsImV4cCI6MjA5NDYwOTI2MH0.ejjrni55bz3gsf4DS5iGjd5r2HiULHoogqs0h7A0WpM';

if (!SUPABASE_URL || !SUPABASE_KEY) {
	console.error('Missing Supabase runtime configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY on the backend environment.');
}

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
