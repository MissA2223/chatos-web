// api/chat.js
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { message } = req.body || {};
    if (!message) {
      res.status(400).json({ error: 'Missing message' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Missing API key' });
      return;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Aeris, Adrienne’s helpful and friendly assistant.' },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();
    res.status(200).json({ reply: data.choices?.[0]?.message?.content || 'No response.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
