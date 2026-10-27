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
    var accent = w.primaryColor || '#9a7b4f';
    var head = w.headerColor || '#1e2a24';
    var left = w.position === 'left';
    var side = left ? 'left' : 'right';
    var title = w.title || cfg.name;
    var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.6A7.5 7.5 0 1 1 20 11.5z"/></svg>';
    root.innerHTML = '<style>' +
      ':host{all:initial}*{box-sizing:border-box;font-family:Geist,Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}' +
      '.launcher{position:fixed;bottom:20px;' + side + ':20px;height:58px;min-width:58px;padding:0 18px;border-radius:29px;border:0;background:' + head + ';color:#f6f3ec;cursor:pointer;box-shadow:0 2px 4px rgba(20,24,22,.12),0 14px 32px -8px rgba(20,24,22,.45);display:flex;align-items:center;justify-content:center;gap:8px;font-size:15px;font-weight:600;z-index:2147483000;transition:transform .2s}' +
      '.launcher:hover{transform:translateY(-2px)}.launcher svg{width:24px;height:24px}' +
      '.panel{' + (inline ? 'position:relative;width:100%;height:100%;' : 'position:fixed;bottom:92px;' + side + ':20px;width:384px;height:620px;max-height:calc(100vh - 116px);box-shadow:0 2px 6px rgba(20,24,22,.08),0 32px 64px -16px rgba(20,24,22,.38);') + 'max-width:calc(100vw - 32px);background:#fbfaf6;border-radius:18px;display:flex;flex-direction:column;overflow:hidden;z-index:2147483000;color:#1d2420;border:1px solid rgba(20,24,22,.08)}' +
      '.panel.hidden{display:none}' +
      '.head{background:' + head + ';color:#f6f3ec;padding:16px 18px;display:flex;align-items:center;gap:12px}' +
      '.av{width:42px;height:42px;border-radius:50%;background:#efe9dc;color:' + head + ';display:grid;place-items:center;flex-shrink:0;box-shadow:inset 0 0 0 3px rgba(255,255,255,.35)}.av svg{width:22px;height:22px}' +
      '.ti{font-weight:700;font-size:17px;letter-spacing:-.01em}.st{font-size:12.5px;opacity:.82;display:flex;align-items:center;gap:6px;margin-top:2px}.dot{width:7px;height:7px;border-radius:50%;background:#7bc38f}' +
      '.x{margin-left:auto;background:none;border:0;color:#f6f3ec;cursor:pointer;width:32px;height:32px;border-radius:8px;opacity:.75;display:grid;place-items:center}.x:hover{opacity:1;background:rgba(255,255,255,.08)}.x svg{width:18px;height:18px}' +
      '.body{flex:1;overflow-y:auto;padding:20px 18px 12px;display:flex;flex-direction:column;gap:10px}' +
      '.m{max-width:86%;padding:11px 15px;border-radius:12px;font-size:14.5px;line-height:1.5;word-wrap:break-word;animation:in .25s ease both}.m a{color:inherit}' +
      '@keyframes in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}' +
      '.bot{background:#e8ede6;color:#25302a;align-self:flex-start}' +
      '.agent{background:#f3ead8;color:#3a2f1c;align-self:flex-start;border:1px solid #e6d7b8}.who{font-size:11.5px;opacity:.7;margin-bottom:3px;font-weight:600}' +
      '.user{background:' + accent + ';color:#fbf8f2;align-self:flex-end;box-shadow:inset 0 1px 0 rgba(255,255,255,.15)}' +
      '.src{font-size:11.5px;opacity:.65;margin-top:6px}' +
      '.chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;margin:2px 0 4px}.chip{border:1px solid ' + accent + ';color:' + accent + ';background:transparent;border-radius:999px;padding:7px 13px;font-size:13.5px;font-weight:500;cursor:pointer;transition:background .15s,color .15s}.chip:hover{background:' + accent + ';color:#fbf8f2}' +
      '.typing{align-self:flex-start;background:#e8ede6;border-radius:12px;padding:13px 16px;display:flex;gap:5px}.typing i{width:6px;height:6px;border-radius:50%;background:#7e8a82;animation:b 1.1s infinite}.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}@keyframes b{0%,60%,100%{transform:translateY(0);opacity:.6}30%{transform:translateY(-4px);opacity:1}}' +
      '.foot{padding:12px 14px 14px}' +
      '.box{display:flex;align-items:flex-end;gap:8px;border:1px solid #e1ddd3;background:#fff;border-radius:14px;padding:6px 6px 6px 14px;box-shadow:0 1px 2px rgba(20,24,22,.04)}.box:focus-within{border-color:' + accent + '}' +
      '.in{flex:1;border:0;background:transparent;padding:8px 0;font-size:14.5px;outline:none;resize:none;max-height:110px;color:#1d2420}.in::placeholder{color:#9a9f98}' +
      '.send{border:0;background:' + accent + ';color:#fff;border-radius:50%;width:36px;height:36px;cursor:pointer;display:grid;place-items:center;flex-shrink:0}.send:disabled{opacity:.45}.send svg{width:17px;height:17px}' +
      '.pw{text-align:center;font-size:11px;color:#9a9f98;padding:0 0 10px}.pw a{color:inherit;text-decoration:none;font-weight:600}' +
      '.rate{display:flex;gap:6px;justify-content:center;font-size:12.5px;color:#6b726c;align-items:center;padding:6px}.rate button{border:1px solid #e1ddd3;background:#fff;border-radius:999px;cursor:pointer;font-size:12.5px;padding:4px 10px;color:#3a423d}' +
      '@media (prefers-reduced-motion:reduce){.m,.typing i{animation:none}}' +
      '</style>' +
      (inline ? '' : '<button class="launcher" aria-label="Open chat">' + icon + (w.launcherText ? '<span>' + esc(w.launcherText) + '</span>' : '') + '</button>') +
      '<div class="panel ' + (inline ? '' : 'hidden') + '" role="dialog" aria-label="' + esc(title) + '">' +
      '<div class="head"><div class="av">' + icon + '</div><div><div class="ti">' + esc(title) + '</div><div class="st"><span class="dot"></span>' + esc(w.subtitle || 'Online') + '</div></div>' + (inline ? '' : '<button class="x" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>') + '</div>' +
      '<div class="body" aria-live="polite"></div>' +
      '<div class="foot"><div class="box"><textarea class="in" rows="1" placeholder="Type your question…" aria-label="Message"></textarea><button class="send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div></div>' +
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
      var r = document.createElement('div'); r.className = 'rate'; r.innerHTML = 'Was this helpful? <button data-v="5">Yes</button><button data-v="1">No</button>';
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
