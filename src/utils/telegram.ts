// Telegram Bot API orqali xabar yuborish.
// Token va chat_id Sozlamalardan olinadi.

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!botToken || !chatId) return { ok: false, error: 'Bot token yoki chat ID kiritilmagan' };
  try {
    // Telegram xabari uzunligi 4096 belgi bilan cheklangan — bo'lib yuboramiz
    const chunks = chunkText(text, 3800);
    for (const part of chunks) {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: part, disable_web_page_preview: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        return { ok: false, error: json?.description || `HTTP ${res.status}` };
      }
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let cur = '';
  for (const line of text.split('\n')) {
    if ((cur + '\n' + line).length > max) {
      if (cur) out.push(cur);
      cur = line;
    } else {
      cur = cur ? cur + '\n' + line : line;
    }
  }
  if (cur) out.push(cur);
  return out;
}
