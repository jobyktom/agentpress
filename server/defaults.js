// Shape of an agent's configuration. The working copy is edited in the studio;
// publishing snapshots it into `published` and the versions table.
export function defaultConfig(name = 'New agent', description = '') {
  return {
    model: 'claude-opus-5-5',
    effort: 'low',
    greeting: `Hi! I'm ${name}. How can I help you today?`,
    suggestions: ['What can you do?', 'Talk to a human'],
    instructions: {
      identity: description || `You are ${name}, a friendly and capable assistant.`,
      communication: 'Be concise and warm. Use short paragraphs. Ask one clarifying question when a request is ambiguous.',
      memory: 'Remember the user\'s name and earlier answers within the conversation and do not ask for them twice.',
      safety: 'Never invent policies, prices or order details. If you are unsure, say so and offer a human handoff.',
    },
    variables: [],
    playbooks: [],
    knowledge: [],
    tools: [],
    escalation: {
      enabled: true,
      keywords: ['human', 'agent', 'representative', 'speak to someone'],
      message: 'I\'m connecting you with a member of our team. They\'ll reply here shortly.',
      offHoursMessage: 'Our team is offline right now, but we\'ve logged your request and will reply soon.',
      negativeSentiment: true,
    },
    webchat: {
      title: name,
      subtitle: 'Website assistant',
      primaryColor: '#9a7b4f',
      headerColor: '#1e2a24',
      position: 'right',
      showPoweredBy: true,
      launcherText: '',
    },
  };
}

export const CHANNEL_TYPES = {
  webchat:   { name: 'Web chat', fields: [] },
  whatsapp:  { name: 'WhatsApp', fields: ['phoneNumberId', 'accessToken', 'verifyToken', 'appSecret'] },
  telegram:  { name: 'Telegram', fields: ['botToken'] },
  viber:     { name: 'Viber', fields: ['authToken', 'senderName', 'senderAvatar'] },
  messenger: { name: 'Messenger', fields: ['pageId', 'pageAccessToken', 'verifyToken', 'appSecret'] },
  instagram: { name: 'Instagram', fields: ['igUserId', 'pageAccessToken', 'verifyToken', 'appSecret'] },
  slack:     { name: 'Slack', fields: ['botToken', 'signingSecret'] },
  teams:     { name: 'Microsoft Teams', fields: ['appId', 'appPassword'] },
  discord:   { name: 'Discord', fields: ['applicationId', 'botToken', 'publicKey'] },
  line:      { name: 'LINE', fields: ['channelAccessToken', 'channelSecret'] },
  twilio:    { name: 'Twilio SMS', fields: ['accountSid', 'authToken', 'phoneNumber'] },
  email:     { name: 'Email', fields: ['inboundAddress', 'replyFrom', 'resendApiKey'] },
  api:       { name: 'REST API', fields: [] },
};
