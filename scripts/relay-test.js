// End-to-end test of the relay layer against the real ntfy.sh. No Electron needed.
const { publish, subscribe, randomRoom } = require("../src/relay");
const room = randomRoom();
const server = process.env.CUE_SERVER || "https://ntfy.sh";
const msgs = ["Q1D", "hello", "Q2B"];
const got = [];
let t0;
const sub = subscribe(server, room, (m) => { got.push([m, Date.now() - t0]); }, async (st) => {
  if (st === "connected" && !t0) {
    t0 = Date.now();
    for (const m of msgs) { t0 = Date.now(); await publish(server, room, m); await new Promise(r => setTimeout(r, 400)); }
    setTimeout(() => {
      sub.stop();
      console.log("room", room, "\nreceived:", got);
      const ok = JSON.stringify(got.map(g => g[0])) === JSON.stringify(msgs);
      console.log(ok ? "PASS" : "FAIL"); process.exit(ok ? 0 : 1);
    }, 1500);
  }
});
setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, 20000);
