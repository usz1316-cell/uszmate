export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { messages, system } = req.body;
    let response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: system,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: messages
      })
    });
    let data = await response.json();
    let iterations = 0;
    while (data.stop_reason === 'tool_use' && iterations < 5) {
      iterations++;
      const assistantContent = data.content;
      const toolUseBlock = assistantContent.find(b => b.type === 'tool_use');
      if (!toolUseBlock) break;
      const updatedMessages = [
        ...messages,
        { role: 'assistant', content: assistantContent },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: '' }] }
      ];
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: system,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: updatedMessages
        })
      });
      data = await response.json();
    }
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('\n');
    return res.status(200).json({ reply: text || JSON.stringify(data) });
  } catch (error) {
    return res.status(500).json({ reply: 'Sunucu hatasi: ' + error.message });
  }
}
