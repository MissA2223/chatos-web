// api/chat.js
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing message' });
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              "You are Aeris for Adrienne. Be warm, concise, and helpful. No fluff."
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = data?.error?.message || 'OpenAI API error';
      return res.status(r.status).json({ error: msg });
    }

    const reply =
      data?.choices?.[0]?.message?.content?.trim() || 'No response.';

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
