// api/chat.js
const OpenAI = require("openai");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "No message" });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Aeris inside ChatOS Web. Be concise, warm, and helpful." },
        { role: "user", content: message }
      ]
    });

    const reply = chat.choices?.[0]?.message?.content || "…";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
