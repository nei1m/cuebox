const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const DEFAULTS = {
  room: "",
  server: "https://ntfy.sh",
  duration: 3,            // seconds a message stays visible
  bgOpacity: 0.55,        // 0..1 box background
  fontSize: 42,           // px
  textColor: "#ffffff",
  bgColor: "#000000",
  historyMax: 50,
  bounds: { x: 100, y: 40, width: 360, height: 110 },
  keys: {                 // up to 3 accelerators per action
    prev: ["Control+Alt+A"],
    next: ["Control+Alt+D"],
    edit: ["Control+Alt+E"],
    send: ["Control+Alt+S"],
  },
};

const file = () => path.join(app.getPath("userData"), "settings.json");

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), "utf8"));
    return { ...DEFAULTS, ...raw, keys: { ...DEFAULTS.keys, ...(raw.keys || {}) }, bounds: { ...DEFAULTS.bounds, ...(raw.bounds || {}) } };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function save(s) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(s, null, 2));
}

module.exports = { load, save, DEFAULTS };
