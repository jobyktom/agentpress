# Deploying AgentPress on Hostinger

AgentPress is one Node.js process that serves the website, the dashboard, the API and the chat widget. You can run it in either of two ways:

- **Option A: Node.js web app hosting** on Business or Cloud plans. This is the easiest, managed from hPanel.
- **Option B: a Hostinger VPS.** This gives you full control and is best for many channels or heavy traffic.

Either way you need **Node.js 22.5 or newer** and **HTTPS** on your domain. Meta, Telegram, Viber and Slack only send webhooks to https URLs.

---

## Option A: Node.js web app (hPanel)

Hostinger's menu names change from time to time, so look for the equivalent if a label differs.

1. In **hPanel**, open **Websites** and choose **Add website**, then the **Node.js** app option.
2. Choose **Import from GitHub** and pick `jobyktom/agentpress`, or upload a zip of the repository.
3. Set the build settings:
   - **Node version:** 22.x (or newer)
   - **Install command:** `npm install`
   - **Build command:** `npm run build`
   - **Start command:** `npm start`
   - **Entry file**, if it's asked for: `server/index.js`
4. Add these **environment variables**:
   ```
   PUBLIC_URL=https://your-domain.com
   AGENTPRESS_DB=/home/<your-user>/agentpress-data/agentpress.db
   ANTHROPIC_API_KEY=sk-ant-...        # optional, enables full AI replies
   SEED_DEMO=0                         # after you've created your own account
   ```
   Put the database **outside** the app folder, because redeploys replace the app folder.
5. Deploy, then attach your domain and turn on the free **SSL** certificate.
6. Open `https://your-domain.com/api/health`. You should see `{"ok":true}`.

Hostinger sets `PORT` for you, and AgentPress reads it automatically.

---

## Option B: VPS (Ubuntu)

```bash
# 1. Install Node 22 and tools
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm install -g pm2

# 2. Get the code and build it
git clone https://github.com/jobyktom/agentpress.git
cd agentpress
npm install
npm run build
cp .env.example .env    # then edit PUBLIC_URL, AGENTPRESS_DB, ANTHROPIC_API_KEY

# 3. Run it forever
pm2 start server/index.js --name agentpress
pm2 save && pm2 startup
```

Next, put nginx in front of the app. Save this as `/etc/nginx/sites-available/agentpress` and link it into `sites-enabled`:

```nginx
server {
  server_name your-domain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    # live inbox, logs and chat use server-sent events
    proxy_buffering off;
    proxy_read_timeout 1h;
  }
}
```

Finally, enable HTTPS:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

To update later, run:

```bash
git pull && npm install && npm run build && pm2 restart agentpress
```

---

## After deploying

1. Log in. The demo account is `demo@agentpress.dev` / `demo1234` unless `SEED_DEMO=0`. Then create your own account and **change or delete the demo account**.
2. Open an agent, go to **Channels**, and connect WhatsApp, Telegram, Viber and the rest. Each channel's dialog shows the webhook URL to paste into the provider.
3. Back up the database file (`AGENTPRESS_DB`) regularly. It holds all agents, conversations and settings.
