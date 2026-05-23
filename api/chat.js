export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, system } = req.body;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        system: system,
        messages: messages
      })
    });

    const data = await response.json();
    
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('\n');
    
    if (text) {
      return res.status(200).json({ reply: text });
    } else {
      return res.status(200).json({ reply: JSON.stringify(data) });
    }
    
  } catch (error) {
    return res.status(500).json({ reply: 'Sunucu hatasi: ' + error.message });
  }
}
