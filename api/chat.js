export default async function handler(req, res) {
  try {
    const { messages = [], useWeb = false } = await req.json
      ? await req.json()
      : req.body;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    const SYSTEM_PROMPT = `
You are ChatOS—helpful, concise, upbeat.
If web sources are provided, ground your answer in them and cite like [1], [2].
If there are no sources and the question looks time-sensitive, say you can search if the user enables "Use web".
Never volunteer model internals unless asked.
`.trim();

    const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const looksRecent = /\b(today|latest|news|price|score|schedule|release|2024|2025|law|earnings|weather)\b/i.test(lastUser);

    let sources = [];
    if (useWeb || looksRecent) {
      const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
      if (TAVILY_API_KEY) {
        const tav = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TAVILY_API_KEY}`
          },
          body: JSON.stringify({
            query: lastUser,
            search_depth: 'basic',
            max_results: 5
          })
        });
        const t = await tav.json();
        sources = (t.results || []).slice(0, 5);
      }
    }

    const sourceBlock = sources.length
      ? sources.map((r, i) => `[${i + 1}] ${r.title} - ${r.url}\n${(r.content || '').slice(0, 300)}`).join('\n\n')
      : '';

    const msgs = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (sources.length) {
      msgs.push({
        role: 'user',
        content: `Use ONLY the sources below to answer. Cite like [1], [2]. If they don't contain the answer, say so briefly.\n\n${sourceBlock}\n\nQuestion: ${lastUser}`
      });
    } else {
      msgs.push(...messages);
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: msgs,
        temperature: 0.6,
        max_tokens: 500
      })
    });

    const j = await r.json();
    const reply = j.choices?.[0]?.message?.content || 'No response.';

    res.status(200).json({
      reply,
      sources: sources.map(s => ({ title: s.title, url: s.url }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
