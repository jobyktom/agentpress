/* AgentPress web chat widget.
 * <script src="https://YOUR-HOST/widget.js" data-agent="AGENT_ID" async></script>
 * Optional: data-mode="inline" data-target="#element" renders inside a container.
 * window.AgentPress.open() / .close() / .send(text) control it from your page. */
(function () {
  var script = document.currentScript || document.querySelector('script[data-agent]');
  if (!script) return;
  var agentId = script.getAttribute('data-agent');
  var base = (script.getAttribute('data-host') || new URL(script.src).origin).replace(/\/$/, '');
  var inline = script.getAttribute('data-mode') === 'inline';
  var key = 'agentpress:' + agentId;
  var userId;
  try { userId = localStorage.getItem(key); } catch (e) {}
  if (!userId) {
    userId = 'u-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem(key, userId); } catch (e) {}
  }

  var host = document.createElement('div');
  host.id = 'agentpress-widget';
  var target = inline ? document.querySelector(script.getAttribute('data-target') || 'body') : document.body;
  target.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function md(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>').replace(/\n/g, '<br>');
  }

  fetch(base + '/api/chat/' + agentId + '/config').then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
    if (!cfg) return;
    var w = cfg.webchat || {};
    var color = w.primaryColor || cfg.color || '#6d5efc';
    var left = w.position === 'left';
    root.innerHTML = '<style>' +
      ':host{all:initial}*{box-sizing:border-box;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      '.launcher{position:fixed;bottom:20px;' + (left ? 'left' : 'right') + ':20px;height:56px;min-width:56px;padding:0 18px;border-radius:28px;border:0;background:' + color + ';color:#fff;cursor:pointer;box-shadow:0 10px 30px rgba(20,16,60,.25);display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;z-index:2147483000;transition:transform .2s}' +
      '.launcher:hover{transform:translateY(-2px)}.launcher svg{width:24px;height:24px}' +
      '.panel{' + (inline ? 'position:relative;width:100%;height:100%;' : 'position:fixed;bottom:88px;' + (left ? 'left' : 'right') + ':20px;width:380px;height:600px;max-height:calc(100vh - 110px);box-shadow:0 24px 60px rgba(20,16,60,.28);') + 'max-width:calc(100vw - 32px);background:#fff;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;z-index:2147483000;color:#14112b}' +
      '.panel.hidden{display:none}' +
      '.head{background:linear-gradient(135deg,' + color + ',#1b1640);color:#fff;padding:18px;display:flex;align-items:center;gap:12px}' +
      '.av{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.18);display:grid;place-items:center;font-weight:700;font-size:18px}' +
      '.ti{font-weight:700;font-size:16px}.st{font-size:12px;opacity:.85;display:flex;align-items:center;gap:6px}.dot{width:7px;height:7px;border-radius:50%;background:#4ade80}' +
      '.x{margin-left:auto;background:none;border:0;color:#fff;cursor:pointer;font-size:22px;opacity:.8}' +
      '.body{flex:1;overflow-y:auto;padding:16px;background:#f7f7fb;display:flex;flex-direction:column;gap:8px}' +
      '.m{max-width:82%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.45;word-wrap:break-word}.m a{color:inherit}' +
      '.bot{background:#fff;border:1px solid #ebeaf3;border-bottom-left-radius:4px;align-self:flex-start}' +
      '.agent{background:#fff7e6;border:1px solid #fde7b0;border-bottom-left-radius:4px;align-self:flex-start}.who{font-size:11px;color:#8a6d1f;margin-bottom:2px;font-weight:600}' +
      '.user{background:' + color + ';color:#fff;border-bottom-right-radius:4px;align-self:flex-end}' +
      '.src{font-size:11px;color:#7a7896;margin-top:4px}' +
      '.chips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 4px}.chip{border:1px solid ' + color + ';color:' + color + ';background:#fff;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer}.chip:hover{background:' + color + ';color:#fff}' +
      '.typing{align-self:flex-start;background:#fff;border:1px solid #ebeaf3;border-radius:16px;padding:12px 14px;display:flex;gap:4px}.typing i{width:6px;height:6px;border-radius:50%;background:#b3b1c9;animation:b 1s infinite}.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}@keyframes b{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}' +
      '.foot{border-top:1px solid #ebeaf3;padding:10px;display:flex;gap:8px;background:#fff}' +
      '.in{flex:1;border:1px solid #e2e1ee;border-radius:12px;padding:10px 12px;font-size:14px;outline:none;resize:none;max-height:100px}.in:focus{border-color:' + color + '}' +
      '.send{border:0;background:' + color + ';color:#fff;border-radius:12px;width:42px;cursor:pointer}.send:disabled{opacity:.5}' +
      '.pw{text-align:center;font-size:11px;color:#9a98b4;padding:0 0 8px;background:#fff}.pw a{color:inherit}' +
      '.rate{display:flex;gap:4px;justify-content:center;font-size:12px;color:#7a7896;align-items:center;padding:4px}.rate button{border:0;background:none;cursor:pointer;font-size:16px}' +
      '</style>' +
      (inline ? '' : '<button class="launcher" aria-label="Open chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>' + (w.launcherText ? '<span>' + esc(w.launcherText) + '</span>' : '') + '</button>') +
      '<div class="panel ' + (inline ? '' : 'hidden') + '" role="dialog" aria-label="' + esc(w.title || cfg.name) + '">' +
      '<div class="head"><div class="av">' + esc((w.title || cfg.name).charAt(0)) + '</div><div><div class="ti">' + esc(w.title || cfg.name) + '</div><div class="st"><span class="dot"></span>' + esc(w.subtitle || 'Online') + '</div></div>' + (inline ? '' : '<button class="x" aria-label="Close">×</button>') + '</div>' +
      '<div class="body" aria-live="polite"></div>' +
      '<div class="foot"><textarea class="in" rows="1" placeholder="Type a message…" aria-label="Message"></textarea><button class="send" aria-label="Send">➤</button></div>' +
      (w.showPoweredBy !== false ? '<div class="pw">Powered by <a href="' + base + '" target="_blank" rel="noopener">AgentPress</a></div>' : '') +
      '</div>';

    var panel = root.querySelector('.panel'), body = root.querySelector('.body'), input = root.querySelector('.in'), send = root.querySelector('.send');
    var launcher = root.querySelector('.launcher'), closeBtn = root.querySelector('.x');
    var loaded = false, stream = null, typingEl = null, rated = false;

    function scroll() { body.scrollTop = body.scrollHeight; }
    function typing(on) {
      if (on && !typingEl) { typingEl = document.createElement('div'); typingEl.className = 'typing'; typingEl.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(typingEl); scroll(); }
      if (!on && typingEl) { typingEl.remove(); typingEl = null; }
    }
    function clearChips() { root.querySelectorAll('.chips').forEach(function (c) { c.remove(); }); }
    function chips(list) {
      if (!list || !list.length) return;
      var c = document.createElement('div'); c.className = 'chips';
      list.forEach(function (t) { var b = document.createElement('button'); b.className = 'chip'; b.textContent = t; b.onclick = function () { submit(t); }; c.appendChild(b); });
      body.appendChild(c); scroll();
    }
    function add(m) {
      var el = document.createElement('div');
      el.className = 'm ' + (m.role === 'user' ? 'user' : m.role === 'agent' ? 'agent' : 'bot');
      el.innerHTML = (m.role === 'agent' ? '<div class="who">' + esc((m.meta && m.meta.author) || 'Support team') + '</div>' : '') + md(m.text);
      if (m.meta && m.meta.sources && m.meta.sources.length) el.innerHTML += '<div class="src">Source: ' + m.meta.sources.map(function (s) { return s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a>' : esc(s.title); }).join(', ') + '</div>';
      body.appendChild(el); scroll();
    }
    function rate() {
      if (rated || root.querySelector('.rate')) return;
      var r = document.createElement('div'); r.className = 'rate'; r.innerHTML = 'Was this helpful? <button data-v="5">👍</button><button data-v="1">👎</button>';
      r.querySelectorAll('button').forEach(function (b) { b.onclick = function () { rated = true; fetch(base + '/api/chat/' + agentId + '/rating', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: userId, rating: Number(b.dataset.v) }) }); r.textContent = 'Thanks for the feedback!'; }; });
      body.appendChild(r); scroll();
    }
    function listen() {
      if (stream || !window.EventSource) return;
      stream = new EventSource(base + '/api/chat/' + agentId + '/stream?userId=' + encodeURIComponent(userId));
      stream.addEventListener('message', function (e) { var p = JSON.parse(e.data); typing(false); add(p.message); });
      stream.addEventListener('status', function (e) { var p = JSON.parse(e.data); if (p.status === 'closed') rate(); });
      stream.onerror = function () { stream.close(); stream = null; setTimeout(listen, 5000); };
    }
    function load() {
      if (loaded) return; loaded = true;
      fetch(base + '/api/chat/' + agentId + '/history?userId=' + encodeURIComponent(userId)).then(function (r) { return r.json(); }).then(function (h) {
        add({ role: 'bot', text: cfg.greeting });
        h.messages.forEach(add);
        if (!h.messages.length) chips(cfg.suggestions);
        else { var last = h.messages[h.messages.length - 1]; if (last.meta && last.meta.choices) chips(last.meta.choices); listen(); }
      });
    }
    function submit(text) {
      text = (text || '').trim(); if (!text) return;
      clearChips(); input.value = ''; send.disabled = true;
      add({ role: 'user', text: text }); typing(true);
      fetch(base + '/api/chat/' + agentId + '/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: userId, text: text }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error); return j; }); })
        .then(function (res) {
          typing(false);
          var bots = res.messages.filter(function (m) { return m.role !== 'user'; });
          bots.forEach(add);
          var last = bots[bots.length - 1]; if (last && last.meta) chips(last.meta.choices);
          if (res.conversation.status === 'human' && !bots.length) typing(true);
          listen();
        })
        .catch(function (e) { typing(false); add({ role: 'bot', text: e.message || 'Connection problem. Please try again.' }); })
        .finally(function () { send.disabled = false; input.focus(); });
    }
    function open() { panel.classList.remove('hidden'); load(); setTimeout(function () { input.focus(); }, 50); }
    function close() { if (!inline) panel.classList.add('hidden'); }

    if (launcher) launcher.onclick = function () { panel.classList.contains('hidden') ? open() : close(); };
    if (closeBtn) closeBtn.onclick = close;
    send.onclick = function () { submit(input.value); };
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input.value); } });
    if (inline) load();
    window.AgentPress = { open: open, close: close, send: function (t) { open(); submit(t); } };
  });
})();
