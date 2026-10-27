import { createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto';

// Each adapter turns provider webhooks into { externalId, userName, text }
// events and knows how to send a reply back. `setup` registers our webhook
// with the provider when it offers an API for that.

const json = (url, body, headers = {}) => fetch(url, {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
}).then(async (r) => { const t = await r.text(); if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 300)}`); try { return JSON.parse(t); } catch { return t; } });

const safeEq = (a, b) => { const x = Buffer.from(a || ''); const y = Buffer.from(b || ''); return x.length === y.length && timingSafeEqual(x, y); };

const metaVerify = (req, cfg) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === cfg.verifyToken) return req.query['hub.challenge'];
  return null;
};
const metaSignature = (req, cfg) => {
  if (!cfg.appSecret) return true;
  const sig = req.headers['x-hub-signature-256'];
  const expected = 'sha256=' + createHmac('sha256', cfg.appSecret).update(req.rawBody || '').digest('hex');
  return safeEq(sig, expected);
};

const withChoices = (text, choices) => choices?.length ? `${text}\n\n${choices.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : text;

export const adapters = {
  webchat: { parse: () => [], send: async () => {} },
  api: { parse: () => [], send: async () => {} },

  telegram: {
    async setup(cfg, hookUrl) {
      const me = await json(`https://api.telegram.org/bot${cfg.botToken}/getMe`, {});
      await json(`https://api.telegram.org/bot${cfg.botToken}/setWebhook`, { url: hookUrl, secret_token: cfg._secret, allowed_updates: ['message', 'callback_query'] });
      return { info: `Connected as @${me.result?.username}` };
    },
    authorize: (req, cfg) => safeEq(req.headers['x-telegram-bot-api-secret-token'], cfg._secret),
    parse(req) {
      const u = req.body || {};
      const m = u.message || u.callback_query?.message;
      const from = u.message?.from || u.callback_query?.from;
      const text = u.message?.text || u.callback_query?.data;
      if (!m || !text) return [];
      return [{ externalId: String(m.chat.id), userName: [from?.first_name, from?.last_name].filter(Boolean).join(' ') || 'Telegram user', text }];
    },
    send(cfg, to, text, choices) {
      const reply_markup = choices?.length ? { inline_keyboard: choices.map((c) => [{ text: c, callback_data: c.slice(0, 64) }]) } : undefined;
      return json(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, { chat_id: to, text, reply_markup });
    },
  },

  viber: {
    async setup(cfg, hookUrl) {
      const r = await json('https://chatapi.viber.com/pa/set_webhook', { url: hookUrl, event_types: ['delivered', 'seen', 'failed', 'conversation_started'], send_name: true }, { 'X-Viber-Auth-Token': cfg.authToken });
      if (r.status !== 0) throw new Error(r.status_message || 'Viber rejected the webhook');
      return { info: 'Webhook registered with Viber' };
    },
    authorize(req, cfg) {
      const sig = req.headers['x-viber-content-signature'];
      return safeEq(sig, createHmac('sha256', cfg.authToken).update(req.rawBody || '').digest('hex'));
    },
    parse(req) {
      const b = req.body || {};
      if (b.event === 'message' && b.message?.type === 'text') return [{ externalId: b.sender.id, userName: b.sender.name || 'Viber user', text: b.message.text }];
      return [];
    },
    send(cfg, to, text, choices) {
      const keyboard = choices?.length ? { Type: 'keyboard', DefaultHeight: false, Buttons: choices.map((c) => ({ ActionType: 'reply', ActionBody: c, Text: c, Columns: 6, Rows: 1 })) } : undefined;
      return json('https://chatapi.viber.com/pa/send_message', { receiver: to, type: 'text', text, sender: { name: cfg.senderName || 'Assistant', avatar: cfg.senderAvatar || undefined }, keyboard, min_api_version: 3 }, { 'X-Viber-Auth-Token': cfg.authToken });
    },
  },

  whatsapp: {
    verify: metaVerify,
    authorize: metaSignature,
    parse(req) {
      const out = [];
      for (const e of req.body?.entry || []) for (const c of e.changes || []) {
        const v = c.value || {};
        const names = Object.fromEntries((v.contacts || []).map((x) => [x.wa_id, x.profile?.name]));
        for (const m of v.messages || []) {
          const text = m.text?.body || m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || m.button?.text;
          if (text) out.push({ externalId: m.from, userName: names[m.from] || m.from, text });
        }
      }
      return out;
    },
    send(cfg, to, text, choices) {
      const url = `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`;
      const auth = { Authorization: `Bearer ${cfg.accessToken}` };
      if (choices?.length && choices.length <= 3) {
        return json(url, { messaging_product: 'whatsapp', to, type: 'interactive', interactive: { type: 'button', body: { text }, action: { buttons: choices.map((c, i) => ({ type: 'reply', reply: { id: `c${i}`, title: c.slice(0, 20) } })) } } }, auth);
      }
      return json(url, { messaging_product: 'whatsapp', to, type: 'text', text: { body: withChoices(text, choices) } }, auth);
    },
  },

  messenger: {
    verify: metaVerify,
    authorize: metaSignature,
    parse(req) {
      const out = [];
      for (const e of req.body?.entry || []) for (const m of e.messaging || []) {
        const text = m.message?.quick_reply?.payload || m.message?.text || m.postback?.title;
        if (text && !m.message?.is_echo) out.push({ externalId: m.sender.id, userName: 'Messenger user', text });
      }
      return out;
    },
    send(cfg, to, text, choices) {
      const quick_replies = choices?.length ? choices.slice(0, 13).map((c) => ({ content_type: 'text', title: c.slice(0, 20), payload: c })) : undefined;
      return json(`https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(cfg.pageAccessToken)}`, { recipient: { id: to }, messaging_type: 'RESPONSE', message: { text, quick_replies } });
    },
  },

  instagram: {
    verify: metaVerify,
    authorize: metaSignature,
    parse(req) { return adapters.messenger.parse(req).map((e) => ({ ...e, userName: 'Instagram user' })); },
    send(cfg, to, text, choices) {
      return json(`https://graph.facebook.com/v21.0/${cfg.igUserId}/messages?access_token=${encodeURIComponent(cfg.pageAccessToken)}`, { recipient: { id: to }, message: { text: withChoices(text, choices) } });
    },
  },

  slack: {
    authorize(req, cfg) {
      const ts = req.headers['x-slack-request-timestamp'];
      if (!ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
      const expected = 'v0=' + createHmac('sha256', cfg.signingSecret).update(`v0:${ts}:${req.rawBody}`).digest('hex');
      return safeEq(req.headers['x-slack-signature'], expected);
    },
    challenge: (req) => (req.body?.type === 'url_verification' ? { challenge: req.body.challenge } : null),
    parse(req) {
      const e = req.body?.event;
      if (!e || e.bot_id || e.subtype || !['message', 'app_mention'].includes(e.type)) return [];
      return [{ externalId: e.channel, userName: e.user, text: (e.text || '').replace(/<@[^>]+>\s*/g, '') }];
    },
    send(cfg, to, text, choices) {
      return json('https://slack.com/api/chat.postMessage', { channel: to, text: withChoices(text, choices) }, { Authorization: `Bearer ${cfg.botToken}` });
    },
  },

  teams: {
    parse(req) {
      const a = req.body || {};
      if (a.type !== 'message' || !a.text) return [];
      return [{ externalId: a.conversation.id, userName: a.from?.name || 'Teams user', text: a.text.replace(/<at>.*?<\/at>/g, '').trim(), reply: { serviceUrl: a.serviceUrl, activityId: a.id } }];
    },
    async send(cfg, to, text, choices, ctx = {}) {
      if (!ctx.serviceUrl) throw new Error('Teams needs the serviceUrl from an incoming message');
      const tok = await fetch('https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token', {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: cfg.appId, client_secret: cfg.appPassword, scope: 'https://api.botframework.com/.default' }),
      }).then((r) => r.json());
      const suggestedActions = choices?.length ? { actions: choices.map((c) => ({ type: 'imBack', title: c, value: c })) } : undefined;
      return json(`${ctx.serviceUrl.replace(/\/$/, '')}/v3/conversations/${encodeURIComponent(to)}/activities`, { type: 'message', text, suggestedActions }, { Authorization: `Bearer ${tok.access_token}` });
    },
  },

  line: {
    authorize(req, cfg) {
      return safeEq(req.headers['x-line-signature'], createHmac('sha256', cfg.channelSecret).update(req.rawBody || '').digest('base64'));
    },
    parse(req) {
      return (req.body?.events || []).filter((e) => e.type === 'message' && e.message?.type === 'text')
        .map((e) => ({ externalId: e.source.userId || e.source.groupId, userName: 'LINE user', text: e.message.text }));
    },
    send(cfg, to, text, choices) {
      const quickReply = choices?.length ? { items: choices.slice(0, 13).map((c) => ({ type: 'action', action: { type: 'message', label: c.slice(0, 20), text: c } })) } : undefined;
      return json('https://api.line.me/v2/bot/message/push', { to, messages: [{ type: 'text', text, quickReply }] }, { Authorization: `Bearer ${cfg.channelAccessToken}` });
    },
  },

  discord: {
    // Discord bots receive messages over the Gateway websocket; we support
    // the HTTP interactions endpoint for the /ask slash command.
    authorize(req, cfg) {
      try {
        const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(cfg.publicKey, 'hex')]), format: 'der', type: 'spki' });
        const ts = req.headers['x-signature-timestamp'] || '';
        return verify(null, Buffer.from(ts + (req.rawBody || '')), key, Buffer.from(req.headers['x-signature-ed25519'] || '', 'hex'));
      } catch { return false; }
    },
    // PING must be answered with PONG; commands get a deferred reply that
    // the follow-up message then fills in.
    ack(req, res) {
      res.json({ type: req.body?.type === 1 ? 1 : 5 });
    },
    parse(req) {
      const i = req.body || {};
      if (i.type !== 2) return [];
      const text = i.data?.options?.find((o) => o.name === 'message')?.value;
      return text ? [{ externalId: i.channel_id, userName: i.member?.user?.username || i.user?.username || 'Discord user', text, reply: { interactionToken: i.token, at: Date.now() } }] : [];
    },
    send(cfg, to, text, choices, ctx = {}) {
      const content = withChoices(text, choices).slice(0, 2000);
      // Interaction tokens last 15 minutes; after that post to the channel.
      if (ctx.interactionToken && Date.now() - ctx.at < 14 * 60000) {
        return json(`https://discord.com/api/v10/webhooks/${cfg.applicationId}/${ctx.interactionToken}`, { content });
      }
      return json(`https://discord.com/api/v10/channels/${to}/messages`, { content }, { Authorization: `Bot ${cfg.botToken}` });
    },
  },

  twilio: {
    authorize(req, cfg) {
      const params = req.body || {};
      const data = cfg._url + Object.keys(params).sort().map((k) => k + params[k]).join('');
      return safeEq(req.headers['x-twilio-signature'], createHmac('sha1', cfg.authToken).update(data).digest('base64'));
    },
    parse(req) {
      const b = req.body || {};
      return b.Body ? [{ externalId: b.From, userName: b.From, text: b.Body }] : [];
    },
    send(cfg, to, text, choices) {
      return fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64'), 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: to, From: cfg.phoneNumber, Body: withChoices(text, choices) }),
      }).then((r) => { if (!r.ok) throw new Error(`Twilio HTTP ${r.status}`); });
    },
    respondEmpty: (res) => res.type('text/xml').send('<Response></Response>'),
  },

  email: {
    // Accepts inbound-parse JSON ({ from, subject, text }) from providers such as Resend, Postmark or SendGrid.
    parse(req) {
      const b = req.body || {};
      const from = b.from?.email || b.From || b.from;
      const text = b.text || b.TextBody || b['stripped-text'];
      return from && text ? [{ externalId: String(from), userName: String(from), text: String(text).split(/\n>|\nOn .* wrote:/)[0].trim() }] : [];
    },
    send(cfg, to, text, choices) {
      return json('https://api.resend.com/emails', { from: cfg.replyFrom, to, subject: 'Re: your message', text: withChoices(text, choices) }, { Authorization: `Bearer ${cfg.resendApiKey}` });
    },
  },
};

export function missingFields(type, cfg, fields) {
  return fields.filter((f) => !cfg[f] && !['senderAvatar', 'appSecret'].includes(f));
}
