export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Use POST /api/chat' });
    }

    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Missing message' });

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are ChatOS: safety-first, warm, concise. No background work or future promises." },
          { role: "user", content: message }
        ]
      })
    });

    const j = await r.json();
    const reply = j?.choices?.[0]?.message?.content || "(no reply)";
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
