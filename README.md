# Mother AI · JARVIS demo

A lightweight static prototype with a project overview and Chat, Work, and JARVIS views. There is no build step or package installation.

## Run it locally

1. Open this folder in VS Code.
2. Start a static preview using Live Server if it is already available, or run `python -m http.server 8000` from this folder.
3. Open `http://localhost:8000/` in a browser. Select **Try the interactive demo**.

## What it does

- Create starter plans in Chat and save/review them in Work. Progress is a local simulation.
- Show the supplied animated visual on a black screen, without a heading or welcome text. Chat, Work, and JARVIS tabs remain at the top.
- Add subtle orbit rings and an audio-reactive pulse: the visual expands while listening and pulses while speaking.
- Greet once when the JARVIS tab is first opened in a fresh page session: “Hey, boss. What's new?”
- Click the microphone once to begin a voice conversation. It listens for one phrase at a time and resumes after a spoken response. Click again to stop. Silence and browser errors are reported as status feedback; they are not treated as assistant replies.
- Use **Dock** to keep a compact assistant widget visible while switching between this page's Chat and Work tabs. The dock includes its own microphone and expand control.
- Switch tabs with `Alt+1`, `Alt+2`, `Alt+3`, or arrow keys when the tab list is focused.

## Limits and privacy

Voice input uses the browser's SpeechRecognition support and requires microphone permission. Recognition availability and processing depend on the browser; some browsers rely on an online speech service. The visual state reacts to the browser's listening and speech-synthesis events. The microphone does not start until clicked.

Dock keeps the assistant available across views in this page. A web page cannot guarantee an ongoing microphone session when the browser tab is hidden, the app is minimized, or the device sleeps; browsers may pause or stop voice services in those states. This prototype has no AI model or backend. It only handles simple greetings, date/time, and selected website/search commands. It does not provide general computer access or execute system tasks.

Saved plans and demo progress stay in the current browser profile. They are not uploaded or synchronized. The visual GIF is loaded from `https://iili.io/FapFCu9.gif`, so the browser needs access to that host.

## Files

- `index.html` — project overview.
- `demo.html` — Chat, Work, and JARVIS markup and active asset links.
- `jarvis.css`, `workspace.css`, `jarvis-core.css` — shared, workspace, and JARVIS styles.
- `jarvis.js`, `jarvis-v0609.js` — tab navigation, greeting trigger, and dock behavior.
- `jarvis-voice.js`, `jarvis-voice-v0609.js` — voice recognition, error handling, speech response, and visual states.
- `workspace-store.js` — versioned browser-storage helper.
- Earlier animation files are historical and are not loaded by the current demo.
