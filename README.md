# @br4zz4/opencode-smart-session-picker

OpenCode TUI plugin that picks and switches to any session across **all projects**:

- **`/sessions`** slash command (and `/resume`, `/continue` aliases): opens a searchable session picker dialog, replacing the native command.
- **`Ctrl+x l`** keybinding: shadows the native session list; opens the same picker.
- **`Ctrl+o`** keybinding (dedicated fallback): opens the picker without touching the native binding.

Each row shows project name, then session title, then last-updated date/time:

```
podcast  │ Improve intro script  05/09/2026 14:30
```

Rows are grouped by project (section headers) and sorted alphabetically by project, then by most recent update. Archived sessions and subagent (child) sessions are hidden.

Selecting a row navigates to that session (`api.route.navigate("session", …)`).

## Install

Add to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["@br4zz4/opencode-smart-session-picker"]
}
```

Pin a version for stability:

```json
{
  "plugin": ["@br4zz4/opencode-smart-session-picker@0.1.0"]
}
```

Restart opencode. Type `/sessions` in the prompt, or press `Ctrl+o`, to open the picker.

## Keybinding notes

The native session list is `Ctrl+x l` (`session.list` slash `/sessions`, `/resume`, `/continue`). This plugin registers a command with the **same name** (`session.list`) plus a `<leader>l` binding, so `Ctrl+x l`, `/sessions`, `/resume` and `/continue` all open the smart picker instead of the native one. `Ctrl+o` is always available as a dedicated fallback. To fully disable the native binding and keep only the plugin's, set it to `"none"` in `tui.json`:

```json
{
  "keybinds": {
    "session_list": "none"
  }
}
```

## Development

```bash
npm install
npm run build
```

Run opencode against your checkout:

```json
{
  "plugin": ["file:///path/to/opencode-smart-session-picker/dist/index.js"]
}
```

## License

AGPL-3.0 — see [LICENSE](LICENSE).