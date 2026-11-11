// Transport layer: ntfy.sh pub/sub. No Electron dependency, so it is testable alone.
// subscribe() streams JSON lines from  <server>/<room>/json ; publish() POSTs plain text.

function url(server, room) {
  return `${server.replace(/\/+$/, "")}/${encodeURIComponent(room)}`;
}

async function publish(server, room, text) {
  const res = await fetch(url(server, room), { method: "POST", body: text });
  if (!res.ok) throw new Error(`publish failed: HTTP ${res.status}`);
}

// Returns { stop() }. Reconnects with backoff. onStatus("connected"|"reconnecting"|"stopped").
function subscribe(server, room, onMessage, onStatus = () => {}) {
  let stopped = false;
  let ctrl = null;
  let delay = 1000;

  async function loop() {
    while (!stopped) {
      ctrl = new AbortController();
      try {
        const res = await fetch(`${url(server, room)}/json`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        onStatus("connected");
        delay = 1000;
        const dec = new TextDecoder();
        let buf = "";
        for await (const chunk of res.body) {
          buf += dec.decode(chunk, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line) continue;
            try {
              const ev = JSON.parse(line);
              if (ev.event === "message" && typeof ev.message === "string") onMessage(ev.message);
            } catch {}
          }
        }
      } catch (e) {
        if (stopped) break;
      }
      if (stopped) break;
      onStatus("reconnecting");
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 15000);
    }
    onStatus("stopped");
  }
  loop();
  return { stop() { stopped = true; if (ctrl) ctrl.abort(); } };
}

function randomRoom() {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "cuebox-";
  const b = require("crypto").randomBytes(12);
  for (const x of b) s += a[x % a.length];
  return s;
}

module.exports = { publish, subscribe, randomRoom };
