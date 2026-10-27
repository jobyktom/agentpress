import { Globe, MessageCircle, Send, Phone, ThumbsUp, Camera, Hash, Users, Gamepad2, MessageSquare, Smartphone, Mail, Code2 } from 'lucide-react';

// Neutral, original channel tiles (brand colours + generic glyphs).
export const CHANNEL_META = {
  webchat:   { name: 'Web chat', color: '#6d5efc', icon: Globe, blurb: 'Embed a chat bubble on any website or share a hosted chat page.', category: 'Website' },
  whatsapp:  { name: 'WhatsApp', color: '#25d366', icon: Phone, blurb: 'Reply on WhatsApp Business through the Cloud API.', category: 'Messaging' },
  telegram:  { name: 'Telegram', color: '#229ed9', icon: Send, blurb: 'Connect a Telegram bot with its BotFather token.', category: 'Messaging' },
  viber:     { name: 'Viber', color: '#7360f2', icon: MessageCircle, blurb: 'Answer Viber chats through a Viber bot account.', category: 'Messaging' },
  messenger: { name: 'Messenger', color: '#0084ff', icon: ThumbsUp, blurb: 'Handle Facebook Page messages with quick replies.', category: 'Social' },
  instagram: { name: 'Instagram', color: '#e1306c', icon: Camera, blurb: 'Reply to Instagram direct messages.', category: 'Social' },
  slack:     { name: 'Slack', color: '#4a154b', icon: Hash, blurb: 'Answer in channels and DMs inside your Slack workspace.', category: 'Team' },
  teams:     { name: 'Microsoft Teams', color: '#5059c9', icon: Users, blurb: 'Bring your agent into Teams chats via Azure Bot.', category: 'Team' },
  discord:   { name: 'Discord', color: '#5865f2', icon: Gamepad2, blurb: 'Respond to the /ask slash command in your server.', category: 'Community' },
  line:      { name: 'LINE', color: '#06c755', icon: MessageSquare, blurb: 'Serve customers on LINE Official Accounts.', category: 'Messaging' },
  twilio:    { name: 'Twilio SMS', color: '#f22f46', icon: Smartphone, blurb: 'Two-way SMS on any Twilio phone number.', category: 'SMS & email' },
  email:     { name: 'Email', color: '#0f766e', icon: Mail, blurb: 'Answer inbound email via Resend, Postmark or SendGrid parse.', category: 'SMS & email' },
  api:       { name: 'REST API', color: '#14112b', icon: Code2, blurb: 'Talk to your agent from your own app or backend.', category: 'Developers' },
};

export function ChannelIcon({ type, className = 'h-10 w-10', iconClass = 'h-5 w-5' }) {
  const m = CHANNEL_META[type] || CHANNEL_META.api;
  const Icon = m.icon;
  return <span className={`grid shrink-0 place-items-center rounded-xl text-white ${className}`} style={{ background: m.color }}><Icon className={iconClass} /></span>;
}

// Setup guidance shown in each channel's connect dialog.
export const CHANNEL_GUIDES = {
  whatsapp: {
    steps: ['In Meta for Developers, create an app and add the WhatsApp product.', 'Copy the Phone number ID and a permanent access token from WhatsApp › API Setup.', 'Pick any verify token, paste the webhook URL below into WhatsApp › Configuration and subscribe to "messages".'],
    labels: { phoneNumberId: 'Phone number ID', accessToken: 'Permanent access token', verifyToken: 'Verify token (you choose it)', appSecret: 'App secret (recommended, verifies signatures)' },
  },
  telegram: {
    steps: ['Open @BotFather in Telegram and send /newbot.', 'Copy the bot token it gives you and paste it below.', 'Save. We register the webhook with Telegram automatically.'],
    labels: { botToken: 'Bot token' },
  },
  viber: {
    steps: ['Create a bot account at partners.viber.com.', 'Copy its authentication token.', 'Save. We register the webhook with Viber automatically (your site must use HTTPS).'],
    labels: { authToken: 'Authentication token', senderName: 'Sender name shown to users', senderAvatar: 'Sender avatar URL (optional)' },
  },
  messenger: {
    steps: ['Create a Meta app with the Messenger product and connect your Facebook Page.', 'Generate a Page access token.', 'Add the webhook URL below with your verify token and subscribe to messages and messaging_postbacks.'],
    labels: { pageId: 'Page ID', pageAccessToken: 'Page access token', verifyToken: 'Verify token (you choose it)', appSecret: 'App secret (recommended)' },
  },
  instagram: {
    steps: ['Link an Instagram professional account to a Facebook Page.', 'In your Meta app add Instagram messaging and generate a Page access token.', 'Add the webhook URL below and subscribe to messages.'],
    labels: { igUserId: 'Instagram user ID', pageAccessToken: 'Page access token', verifyToken: 'Verify token (you choose it)', appSecret: 'App secret (recommended)' },
  },
  slack: {
    steps: ['Create a Slack app at api.slack.com/apps and add the chat:write, app_mentions:read and im:history scopes.', 'Install it to your workspace and copy the Bot User OAuth token and Signing secret.', 'Enable Event Subscriptions with the webhook URL below and subscribe to app_mention and message.im.'],
    labels: { botToken: 'Bot user OAuth token', signingSecret: 'Signing secret' },
  },
  teams: {
    steps: ['Create an Azure Bot resource (multi-tenant) and note its App ID.', 'Create a client secret for the app registration.', 'Set the messaging endpoint to the webhook URL below and add the Teams channel.'],
    labels: { appId: 'Microsoft App ID', appPassword: 'Client secret' },
  },
  discord: {
    steps: ['Create an application at discord.com/developers and add a bot.', 'Register a slash command named "ask" with a string option named "message".', 'Set the Interactions endpoint URL to the webhook URL below.'],
    labels: { applicationId: 'Application ID', botToken: 'Bot token', publicKey: 'Public key' },
  },
  line: {
    steps: ['Create a Messaging API channel in the LINE Developers console.', 'Issue a long-lived channel access token and copy the channel secret.', 'Paste the webhook URL below and turn on "Use webhook".'],
    labels: { channelAccessToken: 'Channel access token', channelSecret: 'Channel secret' },
  },
  twilio: {
    steps: ['Buy or pick an SMS-capable number in Twilio.', 'Copy your Account SID and Auth token.', 'Set the number\'s "A message comes in" webhook to the URL below (HTTP POST).'],
    labels: { accountSid: 'Account SID', authToken: 'Auth token', phoneNumber: 'Twilio phone number (+15551234567)' },
  },
  email: {
    steps: ['Set up an inbound route with your email provider that POSTs JSON to the webhook URL below.', 'Add a verified sending domain for replies.', 'Paste your Resend API key so the agent can reply.'],
    labels: { inboundAddress: 'Inbound address', replyFrom: 'Reply from (support@yourdomain.com)', resendApiKey: 'Resend API key' },
  },
};
