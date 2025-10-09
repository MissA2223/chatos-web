// File: api/chat.js
module.exports = async (req, res) => {
  // Only allow POST from the browser
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { message } = req.body || {};
    if (!message) {
      res.status(400).json({ error: 'Missing "message" in body' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
      return;
    }

    // Call OpenAI with plain fetch (no extra deps)
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Aeris, Adrienne’s friendly assistant. Be concise, warm, and practical.' },
          { role: 'user', content: message }
        ]
      })
    });

    if (!r.ok) {
      const text = await r.text();
      res.status(r.status).json({ error: `OpenAI error ${r.status}`, detail: text });
      return;
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || 'No reply.';
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: String(err) });
  }
};
