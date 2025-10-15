// Vercel Serverless Function: /api/chat
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // parse body safely
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const raw = (body?.message ?? '').toString().trim();
    if (!raw) return res.status(400).json({ error: 'No message provided' });

    // detect "use web:" trigger
    const webTrigger = /^use\s*web\s*:/i.test(raw);
    const userQuestion = webTrigger ? raw.replace(/^use\s*web\s*:/i, '').trim() : raw;

    // optional: fetch from Tavily
    let webContext = null;
    if (webTrigger) {
      const key = process.env.TAVILY_API_KEY;
      if (!key) {
        webContext = { answer: null, results: [], note: 'TAVILY_API_KEY missing' };
      } else {
        const tvRes = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: key,
            query: userQuestion,
            search_depth: 'advanced',
            include_answer: true,
            max_results: 5
          })
        });
        const tvJson = await tvRes.json();
        if (!tvRes.ok) {
          console.error('Tavily error', tvJson);
          webContext = { answer: null, results: [], note: 'Tavily error' };
        } else {
          webContext = tvJson;
        }
      }
    }

    // build messages for OpenAI
    const messages = [
      {
        role: 'system',
        content:
          'You are ChatOS Web. Be concise, friendly, and practical. ' +
          'If web context is provided, use it and cite sources as [1], [2].'
      }
    ];

    if (webContext) {
      const list = (webContext.results || [])
        .map((r, i) => `[${i + 1}] ${r.title || ''} - ${r.url}\n${(r.content || '').slice(0, 400)}`)
        .join('\n\n');

      messages.push({
        role: 'user',
        content:
          `Question: ${userQuestion}\n\n` +
          (webContext.answer ? `Direct answer: ${webContext.answer}\n\n` : '') +
          (list ? `Web results:\n${list}` : 'No web results available.')
      });
    } else {
      messages.push({ role: 'user', content: userQuestion });
    }

    // call OpenAI
    const oiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages
      })
    });

    const oiJson = await oiRes.json();
    if (!oiRes.ok) {
      console.error('OpenAI error', oiJson);
      return res.status(500).json({ error: 'AI request failed' });
    }

    const reply = oiJson?.choices?.[0]?.message?.content || 'Sorry, I could not generate a reply.';
    const sources = webContext && Array.isArray(webContext.results)
      ? webContext.results.slice(0, 3).map(r => ({ title: r.title, url: r.url }))
      : [];

    return res.status(200).json({ reply, sources });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', detail: String(err?.message || err) });
  }
}
