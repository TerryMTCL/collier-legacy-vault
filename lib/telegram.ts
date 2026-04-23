const JOSH_CHAT_ID = '5588600680'
const TELEGRAM_API_BASE = 'https://api.telegram.org'

export async function sendToJosh(message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.warn('TELEGRAM_BOT_TOKEN not set, skipping Telegram notification')
    return
  }

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: JOSH_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Telegram send failed:', error)
    throw new Error(`Telegram API error: ${response.status}`)
  }
}
