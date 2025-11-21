# rep+

rep+ is a lightweight Chrome DevTools extension inspired by Burp Suite's Repeater. I often need to poke at a few requests without spinning up the full Burp stack, so I built this extension with the help of LLM (Gemini 3) to keep my workflow fast and focused.

## What it does

- **Capture & Replay**: Captures every HTTP request you trigger while testing. Replay any request and freely manipulate the raw method, path, headers, or body to probe endpoints.
- **Filters & Regex**: Powerful search across URL, headers, and body. Toggle **Regex Mode** for advanced pattern matching (e.g., finding specific tokens or IDs).
- **Converters**: Right-click context menu to instantly encode/decode data:
  - Base64
  - URL Encode/Decode
  - JWT Decode (view payload instantly)
  - Hex / UTF-8
- **Screenshots**: Built-in screenshot tool to capture the request/response pair for bug reports.
- **History & Navigation**: Undo/redo support for edits and history navigation for selected requests.
- **Starring**: Pin important requests to keep them at the top of your list.

This combo makes rep+ handy for bug bounty hunters and vulnerability researchers who want Burp-like iteration without the heavyweight UI. Install the extension, open DevTools, head to the rep+ panel, and start hacking. 😎

### Demo
![Image](https://github.com/user-attachments/assets/a4767b2d-9246-4f69-a7cd-a99c05edc78e)
