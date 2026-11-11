const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen, nativeImage } = require("electron");
const path = require("path");
const settings = require("./settings");
const relay = require("./relay");

let S;                 // current settings
let overlay, settingsWin, sendWin, tray;
let sub = null;
let status = "idle";
let editMode = false;
let history = [];
let idx = -1;

if (!app.requestSingleInstanceLock()) app.quit();

function createOverlay() {
  overlay = new BrowserWindow({
    ...S.bounds,
    frame: false, transparent: true, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false,
    resizable: false, show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true);
  overlay.loadFile(path.join(__dirname, "overlay.html"));
  overlay.once("ready-to-show", () => { overlay.showInactive(); pushStyle(); });
}

function pushStyle() {
  if (!overlay) return;
  overlay.webContents.send("style", {
    duration: S.duration, bgOpacity: S.bgOpacity, fontSize: S.fontSize,
    textColor: S.textColor, bgColor: S.bgColor,
  });
}

function show(text) {
  if (overlay) overlay.webContents.send("show", { text, duration: S.duration });
}

function onIncoming(text) {
  history.push(text);
  if (history.length > S.historyMax) history.shift();
  idx = history.length - 1;
  show(text);
}

function step(d) {
  if (!history.length) return;
  idx = Math.max(0, Math.min(history.length - 1, idx + d));
  show(history[idx]);
}

function setEditMode(on) {
  editMode = on;
  if (!overlay) return;
  overlay.setIgnoreMouseEvents(!on);
  overlay.setFocusable(on);
  overlay.webContents.send("edit", on);
  if (!on) saveBounds();
  buildTray();
}

function saveBounds() {
  if (!overlay) return;
  S.bounds = overlay.getBounds();
  settings.save(S);
}

function registerKeys() {
  globalShortcut.unregisterAll();
  const act = {
    prev: () => step(-1),
    next: () => step(1),
    edit: () => setEditMode(!editMode),
    send: () => toggleSend(),
  };
  for (const [name, fn] of Object.entries(act)) {
    for (const acc of (S.keys[name] || []).slice(0, 3)) {
      if (!acc) continue;
      try { globalShortcut.register(acc, fn); } catch (e) { console.error("bad accelerator", acc, e.message); }
    }
  }
}

function connect() {
  if (sub) { sub.stop(); sub = null; }
  if (!S.room) { status = "no room set"; buildTray(); return; }
  sub = relay.subscribe(S.server, S.room, onIncoming, (st) => { status = st; buildTray(); });
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) return settingsWin.focus();
  settingsWin = new BrowserWindow({
    width: 560, height: 760, title: "Cuebox settings", autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  settingsWin.loadFile(path.join(__dirname, "settings.html"));
}

function toggleSend() {
  if (sendWin && !sendWin.isDestroyed()) { sendWin.close(); return; }
  const d = screen.getPrimaryDisplay().workArea;
  sendWin = new BrowserWindow({
    width: 420, height: 56, x: d.x + Math.round((d.width - 420) / 2), y: d.y + Math.round(d.height / 3),
    frame: false, alwaysOnTop: true, skipTaskbar: true, resizable: false,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  sendWin.setAlwaysOnTop(true, "screen-saver");
  sendWin.loadFile(path.join(__dirname, "send.html"));
  sendWin.on("blur", () => { if (sendWin && !sendWin.isDestroyed()) sendWin.close(); });
}

function buildTray() {
  const menu = Menu.buildFromTemplate([
    { label: `Status: ${status}`, enabled: false },
    { type: "separator" },
    { label: editMode ? "Finish editing (lock box)" : "Edit box (move / resize)", click: () => setEditMode(!editMode) },
    { label: "Send a message…", click: toggleSend },
    { label: "Show test message", click: () => show("Test: Q1D") },
    { label: "Settings…", click: openSettings },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);
  if (!tray) {
    const img = nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGElEQVQ4jWNgGAWjYBSMglEwCkbBKBgFAAAEEAABkE8KkwAAAABJRU5ErkJggg==");
    tray = new Tray(img);
    tray.setToolTip("Cuebox");
    tray.on("click", () => tray.popUpContextMenu());
  }
  tray.setContextMenu(menu);
}

// ---- IPC ----
ipcMain.handle("settings:get", () => S);
ipcMain.handle("settings:randomRoom", () => relay.randomRoom());
ipcMain.handle("settings:set", (_e, next) => {
  const roomChanged = next.room !== S.room || next.server !== S.server;
  S = { ...S, ...next, bounds: S.bounds };
  settings.save(S);
  registerKeys();
  pushStyle();
  if (roomChanged) connect();
  return true;
});
ipcMain.handle("send", async (_e, text) => {
  if (!S.room) throw new Error("No room set. Open Settings first.");
  await relay.publish(S.server, S.room, text);
  return true;
});
ipcMain.on("send:close", () => { if (sendWin && !sendWin.isDestroyed()) sendWin.close(); });
ipcMain.on("resize", (_e, { w, h }) => {
  if (!overlay || !editMode) return;
  overlay.setBounds({ ...overlay.getBounds(), width: Math.max(80, Math.round(w)), height: Math.max(40, Math.round(h)) });
});
ipcMain.on("move", (_e, { x, y }) => {
  if (!overlay || !editMode) return;
  const b = overlay.getBounds();
  overlay.setBounds({ ...b, x: Math.round(x), y: Math.round(y) });
});
ipcMain.handle("overlay:bounds", () => overlay && overlay.getBounds());

app.whenReady().then(() => {
  S = settings.load();
  createOverlay();
  buildTray();
  registerKeys();
  connect();
  if (!S.room) openSettings();
});
app.on("window-all-closed", (e) => e.preventDefault());
app.on("will-quit", () => globalShortcut.unregisterAll());
