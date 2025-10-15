// /api/chat.js — Vercel Serverless Function

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1) Parse body safely
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const raw = (body?.message ?? '').toString().trim();
    if (!raw) return res.status(400).json({ error: 'No message provided' });

    // 2) Detect "use web" trigger and normalize question text
    const webPrefix = /^(\s*(use\s*web|web|search)\s*:?\s*)/i;
    const useWeb = webPrefix.test(raw);
    const userQuestion = raw.replace(webPrefix, '').trim() || raw;

    // 3) Optionally fetch web context via Tavily
    let webContext = null;
    if (useWeb) {
      if (process.env.TAVILY_API_KEY) {
        try {
          const tvRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Tavily accepts this header name:
              'X-API-Key': process.env.TAVILY_API_KEY,
            },
            body: JSON.stringify({
              query: userQuestion,
              search_depth: 'advanced',
              include_answer: true,
              max_results: 5,
            }),
          });
          if (!tvRes.ok) throw new Error(`Tavily HTTP ${tvRes.status}`);
          webContext = await tvRes.json();
        } catch (e) {
          console.error('Tavily error:', e);
          // Don’t crash the whole reply—just continue without web.
          webContext = { error: 'web_unavailable' };
        }
      } else {
        console.warn('TAVILY_API_KEY missing on server');
        webContext = { error: 'web_unavailable' };
      }
    }

    // 4) Build the prompt
    const systemMsg =
      'You are ChatOS Web. Be concise, friendly, and practical.' +
      (useWeb ? ' If web context is provided, answer using it and cite sources as [1], [2].' : '');

    const userMsg =
      useWeb && webContext && !webContext.error
        ? `Question: ${userQuestion}\n\n` +
          `web context:\n` +
          (webContext.results || [])
            .map(
              (r, i) =>
                `[${i + 1}] ${r.title} — ${r.url}\n${(r.content || '').slice(0, 500)}`
            )
            .join('\n\n') +
          `\n\nIf possible, include citations like [1], [2].`
        : userQuestion;

    // 5) Call OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY missing on server' });
    }

    const oiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
      }),
    });

    const oi = await oiRes.json();
    const reply =
      oi?.choices?.[0]?.message?.content || 'Sorry, I could not generate a reply.';

    // 6) Include top sources (if web used & available)
    let sources = null;
    if (useWeb && webContext && !webContext.error && webContext.results?.length) {
      sources = webContext.results.slice(0, 3).map((r) => ({
        title: r.title,
        url: r.url,
      }));
    }

    return res.status(200).json({
      reply,
      sources,
      used_web: useWeb && !webContext?.error,
    });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
