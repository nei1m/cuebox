# Cuebox

A tiny transparent always-on-top box that flashes short messages you send from anywhere (your PC, your phone) onto a friend's screen. Example: you type `Q1D`, it pops up for a couple of seconds, then fades.

- **Transport:** free [ntfy.sh](https://ntfy.sh) pub/sub. No server, no accounts, no bot tokens. The *room* is a random topic name that acts as a shared secret.
- **Receiver (Windows):** Electron overlay. Click-through, always on top, movable/resizable in edit mode, adjustable opacity/size/colour/duration, history with prev/next hotkeys.
- **Sender:** the same app (quick-send hotkey) or `web/index.html` (host on GitHub Pages, works on a phone).

## Setup
1. Download `Cuebox.exe` from Releases (or `npm install && npm start`).
2. Tray icon -> **Settings**. Click **Generate** for a room, copy it, send it to your friend, **Save**. Your friend pastes the same room.
3. Tray -> **Show test message** to check it works.
4. **Edit mode** (default `Ctrl+Alt+E`): drag the box, resize with the blue corner, press the hotkey again to lock it (click-through again).
5. Send: `Ctrl+Alt+S` pops a one-line input; Enter sends. Or use the web page.

## Default keybinds (all rebindable, up to 3 per action)
| Action | Default |
|---|---|
| Previous message | `Ctrl+Alt+A` |
| Next message | `Ctrl+Alt+D` |
| Edit mode | `Ctrl+Alt+E` |
| Quick send | `Ctrl+Alt+S` |

Avoid bare `Shift+D`-style binds: a global hotkey blocks that key in every other app.

## Notes
- Overlay shows over windowed/borderless games, not exclusive fullscreen.
- Anyone who knows the room name can read and send, so keep it random.
- Self-hosted ntfy: set **Server** in Settings.

`npm run test:relay` runs a send/receive round trip against ntfy.sh.
