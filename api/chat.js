export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, system } = req.body;
    
    // İlk istek - web search tool ile
    let response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: system,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: messages
      })
    });

    let data = await response.json();
    
    // Tool kullanıldıysa, tool sonuçlarıyla tekrar çağır
    while (data.stop_reason === 'tool_use') {
      const toolUseBlocks = data.content.filter(b => b.type === 'tool_use');
      const toolResults = toolUseBlocks.map(block => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: block.type === 'tool_use' ? (block.content || '') : ''
      }));

      const updatedMessages = [
        ...messages,
        { role: 'assistant', content: data.content },
        { role: 'user', content: toolResults }
      ];

      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: system,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: updatedMessages
        })
      });

      data = await response.json();
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'API error: ' + error.message });
  }
}
