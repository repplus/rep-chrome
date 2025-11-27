<p align="center">
  <!-- Chrome Supported -->
  <img src="https://img.shields.io/badge/Chrome-Supported-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Supported">

  <!-- AppSec Tool -->
  <img src="https://img.shields.io/badge/AppSec-Tool-blueviolet" alt="AppSec Tool">

  <!-- Bug Bounty Friendly -->
  <img src="https://img.shields.io/badge/Bug%20Bounty-Friendly-orange" alt="Bug Bounty Friendly">

  <!-- Stars -->
  <a href="https://github.com/bscript/rep/stargazers">
    <img src="https://img.shields.io/github/stars/bscript/rep?style=social" alt="GitHub Stars">
  </a>

   <!-- Discord -->
  <a href="https://discord.gg/rMcKHSbG">
        <img src="https://img.shields.io/discord/1442955541293961429.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2" alt="Discord">
  </a>

  <!-- Sponsor -->
  <a href="https://github.com/sponsors/bscript">
    <img src="https://img.shields.io/badge/Sponsor-%F0%9F%92%96-ea4aaa?style=flat-square" alt="Sponsor">
  </a>
</p>

# rep+

rep+ is a lightweight Chrome DevTools extension inspired by Burp Suite's Repeater, now supercharged with AI. I often need to poke at a few requests without spinning up the full Burp stack, so I built this extension to keep my workflow fast, focused, and intelligent with integrated LLM support.

[![Watch Demo](https://img.shields.io/badge/Demo-Video-red?style=for-the-badge&logo=youtube)](https://video.twimg.com/amplify_video/1992382891196571648/pl/zE5-oOXgVua1ZBQn.m3u8?tag=14)

## What it does

- **No Proxy Setup**: Works directly in Chrome. No need to configure system proxies or install CA certificates like in Burp Suite.
- **Capture & Replay**: Captures every HTTP request you trigger while testing. Replay any request and freely manipulate the raw method, path, headers, or body to probe endpoints.
- **Multi-tab Capture**: Captures network requests from **all open tabs**, not just the inspected one.
  - **Global Visibility**: Monitor traffic across your entire browser session.
  - **Visual Indicators**: Requests from other tabs are marked with a globe icon 🌍 for easy distinction.
  - **Smart Filtering**: Automatically deduplicates requests to keep your workspace clean.
  - **Privacy First (Optional Permissions)**: Broad permissions (`webRequest`, `<all_urls>`) are **NOT** granted by default. They are requested at **runtime** only when you explicitly click the globe icon to enable this feature. This ensures rep+ remains lightweight and respects your privacy until you need the extra power.
- **Hierarchical Request Grouping**: Intelligent organization of captured requests for better visibility.
  - **Page-Based Grouping**: Requests are grouped by the page that initiated them (📄 icon).
  - **Third-Party Detection**: Automatically identifies and nests third-party domains (CDNs, APIs, analytics) under the parent page (🌐 icon).
  - **Smart Ordering**: First-party requests appear at the top, followed by third-party domain groups.
  - **Collapsible Tree**: All groups start collapsed by default to keep the view clean. Use the toggle button to expand/collapse all at once.
  - **Context-Aware**: Understand which resources belong to which page, making it easier to analyze complex web applications.
  - **Group Starring**: Star an entire Page Group (📄) or Domain Group (🌐) to track it.
    - **Focused Tracking**: Starring a Page Group only stars first-party requests (same domain), ignoring third-party noise.
    - **Auto-Star**: New requests belonging to a starred group are automatically starred as they arrive.
- **Filters & Regex**: Powerful search across URL, domain, headers, and body. Toggle **Regex Mode** for advanced pattern matching (e.g., finding specific tokens or IDs).
- **Converters**: Right-click context menu to instantly encode/decode data:
  - Base64
  - URL Encode/Decode
  - JWT Decode (view payload instantly)
  - Hex / UTF-8
- **Screenshots**: Built-in screenshot tool to capture the request/response pair for bug reports.
- **History & Navigation**: Undo/redo support for edits and history navigation for selected requests.
- **Starring**: Pin important requests to keep them at the top of your list.
  - **Individual Requests**: Star specific requests manually.
  - **Group Starring**: Star entire groups to automatically track all current and future requests from that page or domain.
- **Clear Workspace**: Instantly clear all captured requests with a single click to start a fresh session.
- **Export & Import**: Export requests as JSON to share findings with teammates or import them later. Perfect for rep+ ↔ rep+ workflows.
- **Bulk Replay**: Burp Suite Intruder-style attacks with four attack modes:
  - **Sniper**: Tests each position independently with its own payloads
  - **Battering Ram**: All positions receive the same payload
  - **Pitchfork**: Zips payloads across positions (index-wise)
  - **Cluster Bomb**: Tests all combinations (Cartesian product)
  
  Mark multiple parameters with `§`, choose your attack type, configure payloads (List or Numbers) for each position, and inspect detailed results for every attempt. Includes pause/resume functionality for long-running attacks.
  - **Response Diff**: Git-style diff view to highlight changes between the baseline response and each attack result. Toggle "Diff View" to see additions (green) and deletions (red) at a glance.
- **Unified Extractor**: A powerful tool to analyze JavaScript files, combining two key features:
  - **Secret Scanner**: Automatically scans captured JS files for hardcoded secrets (API keys, tokens, private keys).
    - **Smart Detection**: Uses entropy analysis and advanced filtering to minimize false positives.
    - **Confidence Scores**: Flags findings as High, Medium, or Low confidence.
  - **Endpoint Extractor**: Extracts API endpoints, URLs, and paths from JS files.
    - **Smart Extraction**: Finds full URLs, relative paths, and GraphQL endpoints.
    - **Method Detection**: Guesses HTTP methods (GET, POST, etc.) from context.
    - **One-Click Copy**: Instantly copy relative paths as full URLs (reconstructs the base URL automatically).
- **Theme Support**: Auto-detects system theme (Light/Dark) and includes a quick toggle button ☀️/🌙 in the UI.
- **AI Capabilities**: Integrated with Anthropic's Claude to help you understand requests and responses.
  - **Explain Request**: Click the ✨ button to get a detailed explanation of the current request.
  - **Suggest Attack Vectors**: Click the ▼ menu and select **Suggest Attack Vectors** to get a prioritized security checklist of potential vulnerabilities (IDOR, SQLi, etc.) tailored to the current request.
  - **Context Menu**: Highlight any text (header, parameter, error), right-click, and select **"Explain with AI"** for a targeted explanation.
  - **Streaming Responses**: Explanations appear in real-time.
  - **Configuration**: Configure your Anthropic API Key and Model (Claude 3.5 Sonnet, Opus, Haiku) in the Settings 🤖 menu.

## ⚠️ Limitations

rep+ runs inside Chrome DevTools, so:

- No raw HTTP/1 or malformed requests (fetch() limitation)
- Some headers can’t be overridden (browser sandbox)
- No raw TCP sockets (no smuggling/pipelining tests)
- DevTools panel constraints limit certain UI setups

rep+ is best for quick testing, replaying, and experimenting — not full low-level HTTP work.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bscript/rep.git
   ```
2. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/` in your browser.
   - Enable **Developer mode** (toggle in the top right corner).
3. **Load the Extension**:
   - Click **Load unpacked**.
   - Select the `rep` folder you just cloned.
4. **Open DevTools**:
   - Press `F12` or right-click -> Inspect.
   - Look for the **rep+** tab (you might need to click the `>>` overflow menu).

This combo makes rep+ handy for bug bounty hunters and vulnerability researchers who want Burp-like iteration without the heavyweight UI. Install the extension, open DevTools, head to the rep+ panel, and start hacking. 😎

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=bscript/rep&type=date&legend=top-left)](https://www.star-history.com/#bscript/rep&type=date&legend=top-left)

## Found a Bug or Issue?

If you encounter any bugs, unexpected behavior, or have feature requests, please help me improve **rep+** by [opening an issue here](https://github.com/bscript/rep/issues).  
I’ll do my best to address it as quickly as possible! 🙏

## ❤️ Support the Project

I maintain **rep+** alone, in my free time.  
Sponsorship helps me keep improving the extension, adding new features, and responding to issues quickly.

If **rep+ saved you time** during testing, development, or bug bounty work, please consider supporting the project.  
**Every dollar helps. ❤️**

<h3 align="center">Maintained by</h3>

<p align="center">
  <a href="https://github.com/bscript">
    <img src="https://avatars.githubusercontent.com/u/43368124?v=4&s=60" width="60" style="border-radius:50%;" alt="Maintainer"/>
  </a>
</p>

---

<h3 align="center">Sponsors</h3>
<p align="center">
  <a href="https://github.com/projectdiscovery">
    <img src="https://avatars.githubusercontent.com/u/50994705?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/Snownin9">
    <img src="https://avatars.githubusercontent.com/u/218675317?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/exxoticx">
    <img src="https://avatars.githubusercontent.com/u/50809037?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/eduquintanilha">
    <img src="https://avatars.githubusercontent.com/u/14018253?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
  &nbsp;&nbsp;
   <a href="https://github.com/Snownull">
    <img src="https://avatars.githubusercontent.com/u/190537179?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
   &nbsp;&nbsp;
   <a href="https://github.com/assem-ch">
    <img src="https://avatars.githubusercontent.com/u/315228?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
   &nbsp;&nbsp;
   <a href="https://github.com/MrTurvey">
    <img src="https://avatars.githubusercontent.com/u/5578593?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
   &nbsp;&nbsp;
   <a href="https://github.com/greenat92">
    <img src="https://avatars.githubusercontent.com/u/8342706?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/sponsors/bscript">
    <img src="https://img.shields.io/badge/Become%20a%20Sponsor-%F0%9F%92%96-ea4aaa?style=for-the-badge" alt="Become a Sponsor"/>
  </a>
  <a href="https://github.com/user-attachments/assets/8e6933b5-8579-480b-99cf-161a392b4153">
    <img src="https://img.shields.io/badge/Bitcoin%20Sponsor-₿-f7931a?style=for-the-badge&logo=bitcoin&logoColor=white" alt="Bitcoin Sponsor"/>
  </a>
</p>

