# AgentPress

AgentPress is a full-stack platform for building, launching and monitoring customer-facing AI agents on web chat, WhatsApp, Telegram, Viber, Messenger, Instagram, Slack, Microsoft Teams, Discord, LINE, Twilio SMS, email and a REST API.

It includes a marketing site, a multi-workspace dashboard, an agent studio, a shared human inbox and an embeddable chat widget. It runs as a single Node.js app with an embedded SQLite database.

> AgentPress is an original product inspired by the category Botpress helped define. Its code, copy, logo and design are its own.

## Features

**Marketing site.** Home, Product, Channels, Pricing and Docs pages, sign up and log in, and a live demo chat bubble.

**Workspaces.** Multiple workspaces, an agent gallery, usage against plan limits, members with viewer, editor, admin and owner roles, and API keys.

**Agent studio**
- *Build*
  - **Instructions:** identity, communication, memory and safety, plus greeting, suggested replies, model and effort.
  - **Playbooks:** visual flows with message, ask (with validation), condition, call tool, set variable, AI reply, handoff and end steps.
  - **Knowledge:** FAQs, documents and imported web pages, retrieved with BM25. Replies cite their sources.
  - **Tools:** HTTP actions with templated URLs, headers and bodies, plus a test console.
  - **Escalation:** handoff on keywords, frustration or the AI's own decision.
- *Deploy*
  - **Channels:** 13 channels with guided setup, signed webhooks and automatic webhook registration for Telegram and Viber.
  - **Web chat:** appearance settings, a live preview, the embed snippet and a hosted chat page.
- *Monitor*
  - **Conversations:** a full transcript with a per-reply trace.
  - **Analytics:** resolution rate, handoffs, latency, satisfaction, channel mix and knowledge gaps, with one-click "answer as FAQ".
  - **Simulations:** saved test conversations with expected phrases.
  - **Logs:** a live log stream.
  - **Versions:** publish history with restore.
- *Preview panel:* chat with the working copy (unpublished changes included) next to any page.
- *Working copy vs. published:* edits autosave and live channels keep the published version until you publish.

**Inbox.** Escalations from every agent and channel, updated live. Take over a chat, reply on its original channel, hand it back to the agent or close it.

### Improvements over typical builders

- Visual, deterministic playbooks work together with LLM instructions, so you don't have to choose between a prompt-only bot and a flow-only bot.
- The human inbox is built in rather than sold as a separate helpdesk.
- More channels out of the box: Viber, LINE, Teams, Discord, SMS and email.
- Simulations and one-click version restore make releases safer.
- Knowledge gaps feed straight back into the knowledge base.
- Agents work without an LLM key by answering from knowledge and running playbooks, so you can build and demo for free.

## Quick start

```bash
npm install
npm run build      # builds the web app into web/dist
npm start          # http://localhost:3000
```

On first start the server creates a demo account (**demo@agentpress.dev / demo1234**) with three agents and two weeks of sample traffic. Set `SEED_DEMO=0` to skip it.

For development, run `npm run dev:server` and `npm run dev:web` in two terminals, then open http://localhost:5173. Vite proxies `/api` to the server.

Run the tests with `npm test`. It covers the whole API end to end: accounts, roles, agents, knowledge, tools, preview, publishing, the web chat widget, the REST API, and an inbound and outbound round trip on all 13 channels, with provider APIs faked so it runs offline.

For a browser run of every screen, start a server on a fresh database and run `npm run test:browser` (needs Playwright with Chromium):

```bash
npm run build && PORT=3999 AGENTPRESS_DB=/tmp/e2e.db npm start &
BASE=http://localhost:3999 npm run test:browser
```

Website import and HTTP tools refuse private and loopback addresses. Set `ALLOW_PRIVATE_FETCH=1` if an agent needs to call an intranet API.

### Configuration

Copy `.env.example` to `.env`. The important settings are:

| Variable | Purpose |
|---|---|
| `PUBLIC_URL` | Your public https URL. Channel webhook URLs are built from it. |
| `AGENTPRESS_DB` | Path to the SQLite file. Keep it outside the app folder on hosts that redeploy by replacing the folder. |
| `ANTHROPIC_API_KEY` | Turns on generative replies, tool use and AI-initiated handoff. The default model is `claude-opus-5-5`; each agent can pick a model and effort level. |

Node.js 22.5 or newer is required, because the app uses the built-in `node:sqlite` module.

## Embedding web chat

```html
<script src="https://YOUR-DOMAIN/widget.js" data-agent="AGENT_ID" async></script>
```

You can control the widget from your page with `window.AgentPress.open()`, `.close()` and `.send("text")`.

## Project layout

```
server/            Express API, runtime engine, channel adapters, SQLite
  engine.js        playbook runner, LLM + tool loop, retrieval fallback
  knowledge.js     chunking, BM25 search, web page import
  channels/        WhatsApp, Telegram, Viber, Messenger, Instagram, Slack, Teams, Discord, LINE, Twilio, email
  routes/api.js    authenticated dashboard API
  routes/public.js web chat, REST API channel, provider webhooks
  public/widget.js embeddable chat widget (no dependencies)
web/               React + Vite + Tailwind front end (marketing site + dashboard)
```

## Deploying to Hostinger

See [DEPLOY-HOSTINGER.md](DEPLOY-HOSTINGER.md).
