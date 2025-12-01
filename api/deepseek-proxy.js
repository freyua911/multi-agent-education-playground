import fetch from 'node-fetch'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY is not set on the server' })
    return
  }

  try {
    const { messages, temperature = 0.7, max_tokens = 1000, model = 'deepseek-chat' } = req.body || {}

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages must be a non-empty array' })
      return
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', response.status, errorText)
      res.status(response.status).json({ error: 'DeepSeek API error', detail: errorText })
      return
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content || ''

    res.status(200).json({ content })
  } catch (error) {
    console.error('deepseek-proxy error:', error)
    res.status(500).json({ error: 'Internal Server Error', detail: error.message })
  }
}


