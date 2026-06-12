import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import WebSocket from 'ws';

dotenv.config();

if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: ['http://federalpolicy.site.je:5174', 'http://localhost:5174'] }));
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', app: 'Federal Policy 24 API' });
});

app.post('/api/email/welcome', async (req, res) => {
  const { email, name } = req.body;
  try {
    const { data, error } = await resend.emails.send({
      from: 'Federal Policy 24 <onboarding@resend.dev>',
      to: email,
      subject: `Welcome to Federal Policy 24, ${name}!`,
      html: `<h1>Welcome ${name}!</h1><p>Your account is ready.</p>`,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cases', async (req, res) => {
  const { title, description, user_id } = req.body;
  const { data, error } = await supabase
    .from('cases')
    .insert({ title, description, user_id })
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true, case: data[0] });
});

app.get('/api/cases/:userId', async (req, res) => {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', req.params.userId);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`🚀 Federal Policy 24 API on http://federalpolicy.site.je:${PORT}`);
});
