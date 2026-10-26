# Mother AI · JARVIS demo

A lightweight static prototype of the Mother AI project overview and its Chat, Work, and JARVIS views. There is no build step or package installation.

## Run it locally

1. Open this folder in VS Code.
2. Start a static preview using the Live Server extension if it is already available, or run `python -m http.server 8000` from this folder.
3. Open `http://localhost:8000/` in a browser. Select **Try the interactive demo** to open Chat, Work, and JARVIS.

You can also open `index.html` directly in a modern browser. Browser storage behavior for local files can vary, so a local web preview is recommended when checking saved plans.

## What the prototype does

- Create starter plans in Chat and save/review them in Work.
- Keep plans and simulated progress in the current browser using local storage.
- Pause or stop the visual walkthrough; it does not execute tasks.
- Show a black, full-screen JARVIS view with the supplied animated GIF, cyan title, tagline, and microphone button.
- Switch tabs with `Alt+1` for Chat, `Alt+2` for Work, and `Alt+3` for JARVIS. The arrow keys also move between tabs when the tab list has focus.
- Start voice recognition only after the user clicks the microphone. In supported browsers, simple greetings, date/time, and a few web-opening/search commands are handled; spoken responses use browser speech synthesis.

## Privacy and limits

Plan text and demo progress stay in the current browser profile. They are not uploaded, shared with other visitors, or synchronized between devices. Clearing browser site data removes them. The JARVIS GIF is loaded from `https://iili.io/FapFCu9.gif`, so the browser must be able to reach that image host.

Voice input depends on browser support and microphone permission. Speech recognition may be processed by the browser's speech service; processing and privacy behavior depend on the browser. The microphone is not activated automatically. The demo does not implement a wake word, an AI model, a backend, general computer access, background workers, or system automation. A few voice commands open websites or web searches in a new tab; there is no Calculator launch or arbitrary app control. JARVIS does not greet or speak on page load.

## Files

- `index.html` — project overview.
- `demo.html` — Chat, Work, and JARVIS markup and current asset links.
- `site.css`, `jarvis.css`, `workspace.css`, `jarvis-core.css` — overview, shared, workspace, and JARVIS styles.
- `jarvis.js` and `jarvis-v0605.js` — tab shortcuts and local Chat/Work prototype behavior; JARVIS no longer renders the old Canvas animation.
- `jarvis-voice.js` and `jarvis-voice-v0605.js` — click-to-start browser voice interaction and spoken responses.
- `workspace-store.js` — versioned browser-storage helper.
- `plasma-sphere-v0604.js` and earlier versioned JARVIS scripts are historical files and are not loaded by the current demo page.
