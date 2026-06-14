const TELEGRAM_API = 'https://api.telegram.org/bot';

async function telegramFetch(token, method, init) {
  const res = await fetch(`${TELEGRAM_API}${token}/${method}`, init);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.ok === false) {
    const description = data.description || `${method} gagal`;
    const err = new Error(description);
    err.status = res.status;
    err.telegram = data;
    throw err;
  }

  return data.result;
}

export async function telegramRequest(token, method, payload = {}) {
  return telegramFetch(token, method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function telegramMultipart(token, method, fields = {}, fileField, file) {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  form.append(fileField, new Blob([file.buffer], { type: file.contentType }), file.filename);

  return telegramFetch(token, method, { method: 'POST', body: form });
}

export async function getMe(token) {
  return telegramRequest(token, 'getMe');
}

export async function setWebhook(token, { url, secretToken }) {
  return telegramRequest(token, 'setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true
  });
}

export async function deleteWebhook(token) {
  return telegramRequest(token, 'deleteWebhook', { drop_pending_updates: true });
}

export async function sendMessage(token, chatId, text, opts = {}) {
  return telegramRequest(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...opts
  });
}

export async function editMessageText(token, chatId, messageId, text, opts = {}) {
  return telegramRequest(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...opts
  });
}

export async function answerCallbackQuery(token, callbackQueryId, text = '', opts = {}) {
  return telegramRequest(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    ...opts
  });
}

export async function sendPhotoBuffer(token, chatId, buffer, caption, opts = {}) {
  return telegramMultipart(
    token,
    'sendPhoto',
    {
      chat_id: String(chatId),
      caption,
      parse_mode: 'HTML',
      ...opts
    },
    'photo',
    { buffer, filename: 'qris-payment.png', contentType: 'image/png' }
  );
}

export async function sendDocumentBuffer(token, chatId, buffer, filename, caption, opts = {}) {
  return telegramMultipart(
    token,
    'sendDocument',
    {
      chat_id: String(chatId),
      caption,
      parse_mode: 'HTML',
      ...opts
    },
    'document',
    { buffer, filename, contentType: 'text/plain' }
  );
}

export function inlineKeyboard(rows) {
  return { inline_keyboard: rows };
}
