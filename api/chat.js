// /api/chat.js  — Vercel Serverless Function
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message } = await req.json?.() || req.body || {};
    if (!message) return res.status(400).json({ error: 'No message provided' });

    // Detect a "use web" request
    const webTrigger = /^(use web|web:|search:)/i.test(message);
    let userQuestion = message;
    let webContext = null;

    if (webTrigger) {
      userQuestion = message.replace(/^(use web|web:|search:)\s*/i, '').trim() || message;

      // Ask Tavily
      const tavilyRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query: userQuestion,
          search_depth: 'advanced',
          include_answer: true,
          max_results: 5
        })
      });

      webContext = await tavilyRes.json();
    }

    // Build the prompt for OpenAI
    const messages = [
      {
        role: 'system',
        content:
          'You are ChatOS Web. Be concise, friendly, and practical. ' +
          'If web context is provided, use it to answer and cite sources as [1], [2].'
      },
      {
        role: 'user',
        content: webContext
          ? `Question: ${userQuestion}\n\nWeb context:\n${
              (webContext.answer ? `Direct answer: ${webContext.answer}\n\n` : '') +
              (webContext.results || [])
                .map((r, i) => `[${i + 1}] ${r.title} - ${r.url}\n${(r.content || '').slice(0, 400)}`)
                .join('\n\n')
            }`
          : userQuestion
      }
    ];

    // Call OpenAI (works with your existing OPENAI_API_KEY in Vercel)
    const oi = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // or another chat-capable model you’re using
        messages,
        temperature: 0.3
      })
    }).then(r => r.json());

    const reply = oi?.choices?.[0]?.message?.content || 'Sorry, I could not generate a reply.';

    // Include top sources if we used the web
    const sources = webContext?.results?.slice(0, 3)?.map(r => ({ title: r.title, url: r.url })) || [];

    return res.status(200).json({ reply, sources });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
