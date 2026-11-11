const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("cue", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (s) => ipcRenderer.invoke("settings:set", s),
  randomRoom: () => ipcRenderer.invoke("settings:randomRoom"),
  send: (t) => ipcRenderer.invoke("send", t),
  closeSend: () => ipcRenderer.send("send:close"),
  resize: (w, h) => ipcRenderer.send("resize", { w, h }),
  move: (x, y) => ipcRenderer.send("move", { x, y }),
  getBounds: () => ipcRenderer.invoke("overlay:bounds"),
  on: (ch, fn) => ipcRenderer.on(ch, (_e, v) => fn(v)),
});
