// /api/chat.js — Vercel serverless function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- read JSON body safely
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const message = (body?.message || '').toString().trim();
    if (!message) return res.status(400).json({ error: 'No message provided' });

    // --- detect "web:" trigger
    const webTrigger = /^\s*(use web|web:|search:)/i.test(message);
    let userQuestion = message.replace(/^\s*(use web|web:|search:)\s*/i, '').trim() || message;

    // --- optional web search via Tavily
    let webContext = null;
    if (webTrigger) {
      const tvRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
  'Content-Type': 'application/json',
  'X-API-Key': process.env.TAVILY_API_KEY,
}
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: userQuestion,
          search_depth: 'advanced',
          include_answer: true,
          max_results: 5
        })
      });

      const tvJson = await tvRes.json().catch(() => ({}));
      if (!tvRes.ok) {
        console.error('Tavily error:', tvRes.status, tvJson);
        return res.status(502).json({ error: `Web search failed (${tvRes.status})` });
      }

      webContext = {
        answer: tvJson?.answer,
        results: (tvJson?.results || []).map(r => ({
          title: r.title, url: r.url, content: r.content || ''
        }))
      };
    }

    // --- call OpenAI
    const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',          // <-- model name lives here
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are ChatOS Web. Be concise, friendly, and practical. ' +
              'If web context is provided, answer using it and cite sources as [1], [2].'
          },
          webContext
            ? {
                role: 'user',
                content:
                  `Question: ${userQuestion}\n\n` +
                  `Web context:\n` +
                  (webContext.answer ? `Direct answer: ${webContext.answer}\n\n` : '') +
                  webContext.results
                    .map((r, i) =>
                      `[${i + 1}] ${r.title} — ${r.url}\n${r.content.slice(0, 400)}`
                    )
                    .join('\n\n')
              }
            : { role: 'user', content: userQuestion }
        ]
      })
    });

    if (!oaiRes.ok) {
      const errText = await oaiRes.text();
      console.error('OpenAI error:', oaiRes.status, errText);
      return res.status(oaiRes.status).json({ error: `OpenAI error ${oaiRes.status}` });
    }

    const oai = await oaiRes.json();
    const reply = oai?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      console.error('OpenAI empty response:', oai);
      return res.status(502).json({ error: 'Empty response from OpenAI' });
    }

    const sources =
      webContext?.results?.slice(0, 3)?.map(r => ({ title: r.title, url: r.url })) || [];

    return res.status(200).json({ reply, sources });
  } catch (err) {
    console.error('Handler crash:', err);
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
