// api/chat.js
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const message = body.message;
    if (!message) {
      res.status(400).json({ error: 'Missing message' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Aeris inside ChatOS Web — concise, helpful, warm.' },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || 'Upstream API error';
      res.status(r.status).json({ error: msg });
      return;
    }

    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'No reply';
    res.status(200).json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Server crashed' });
  }
};
