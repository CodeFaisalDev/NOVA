Here is the completely restructured project document with both diagrams — the core 5-phase build roadmap first, then the Phase 6 decentralized mesh architecture.Now the Phase 6 decentralized mesh architecture — this is the most ambitious and academically novel part of the project:---

## Full Restructured Project Document

---

### Phase 1 — Build the Browser Shell

The goal of this phase is one thing: a working Tauri desktop application that can open web pages in a hidden background window and let you control it from a chat UI. Nothing AI-related yet — just the core infrastructure.

What you build: initialize a Tauri 2.0 project with a Next.js + Tailwind frontend. The chat sidebar is purely cosmetic at this stage — just an input box and a message log. The real work is in Rust: write two IPC commands — `navigate_to(url)` to open a hidden `WebviewWindow`, and `get_page_title()` to read back the current page's title. Build a simple address bar so you can visually confirm the hidden browser is loading pages correctly.

Testing gate: type a URL into the chat → the hidden webview loads it → the page title appears in the React UI. Tab navigation, back/forward, and the Tauri window not crashing under multiple loads. Pass all three, move to Phase 2.

---

### Phase 2 — Add the Omniscient (the Brain)

Now you give the browser a mind. The Omniscient is your cloud LLM orchestrator — it receives a natural language goal and returns a structured JSON action plan that the system will execute step by step.

What you build: integrate the Groq API (use `llama-3.3-70b-versatile` — it's free-tier, fast, and reasoning-capable). Write a system prompt that instructs the model to always respond with a JSON array of actions like `[{"action": "navigate", "url": "..."}, {"action": "extract", "target": "product prices"}]`. Display this action plan visibly in the chat sidebar — each step shown as a card with a status indicator (pending / running / done). At this stage, the Brain produces the plan but nothing executes it yet.

Testing gate: type "Find me the latest iPhone price on GSMArena" → the Brain returns a valid multi-step JSON plan → each step card renders correctly in the UI. The plan doesn't need to execute — you just need to see that the Omniscient understands the goal and produces a sensible structured response.

---

### Phase 3 — Add Gemini Nano and Connect to the Omniscient

Now you give the browser hands. Gemini Nano runs locally inside the hidden webview's JavaScript context and handles all text extraction — completely free and private.

What you build: when the Brain's action plan contains an `extract` step, the Tauri backend injects a JavaScript script into the hidden webview using `webview.eval()`. That script reads `document.body.innerText`, passes it to `window.ai.languageModel` (Gemini Nano), and sends back structured JSON via a `window.__tauri__.invoke()` callback. The Brain then receives this data and updates the action plan's status.

Important caveat to handle: `window.ai` is only available in Chrome with a specific Origin Trial flag enabled, not in Tauri's embedded WebView by default. For your thesis demo, the pragmatic fallback is to bundle a small local GGUF model (Qwen2.5-1.5B) through the same FastAPI sidecar you'll build in Phase 4, and use it here too. Document both paths in your thesis — it's a valuable discussion about the gap between Chrome's on-device AI APIs and real desktop deployment.

Testing gate: navigate to any product page → trigger an `extract` action → Gemini Nano (or the local model fallback) returns a JSON object with structured pricing data → that data appears in the chat UI. The Brain doesn't need to do anything clever with it yet — just confirm the extraction pipeline works end to end.

---

### Phase 4 — Add Phi-4 (the Eyes)

This is the hardest phase and your thesis's main technical contribution. You're adding local multimodal vision so the browser can see and click UI elements without parsing any HTML at all.

What you build: set up a Python FastAPI sidecar that Tauri launches automatically on startup. In the sidecar, load a quantized `Phi-4-multimodal-instruct.gguf` model using `llama-cpp-python`. Load the model once at startup and keep it warm — do not load per-request or every click will take 15 seconds. In Rust, use `tauri-plugin-screenshots` to capture the hidden webview as a PNG buffer. Send that buffer (base64-encoded) to the FastAPI sidecar via a localhost HTTP POST. The sidecar runs inference with the prompt: `"You are a UI grounding agent. Return ONLY JSON: {"x": int, "y": int} for the element: [element description]"`. Parse the coordinates in Rust and inject a synthetic `MouseEvent` at those exact coordinates into the webview via `webview.eval()`.

Add a retry loop: after each synthetic click, wait 500ms and check if the URL or page content changed. If not, screenshot again and re-attempt. This is what makes the system genuinely self-healing rather than just different from Playwright.

Testing gate: navigate to Google → ask the Omniscient to click the Search button → Phi-4 returns coordinates → the click fires → Google performs a search. Test on two different websites where the search button has completely different HTML structure, confirming zero DOM dependency.

---

### Phase 5 — Full Agent Control Loop

All three models are now wired together. This phase is about making them work as a single coherent system where the Brain directs, the Hands extract, the Eyes navigate, and the user never writes a line of code.

What you build: a proper orchestration loop. The Brain produces a JSON action plan. Tauri's Rust backend walks through each action step: `navigate` actions go to the WebView directly, `extract` actions route to Gemini Nano, `click` actions route to Phi-4 via the FastAPI sidecar, and `wait` or `check` actions are handled by a DOM change observer. The chat UI shows a real-time log of every step executing, making the agent's reasoning transparent.

Add a task memory: pass the results of each completed step back into the Brain's context window so it can make decisions based on what it has already found. For example, after extracting product prices from three pages, the Brain should be able to write "now compare these and pick the cheapest."

Testing gate: run the full benchmark task from your thesis proposal — "Research the top 3 mechanical keyboards on Amazon, compare prices, and format a Markdown table." The agent should complete this entirely autonomously. Measure: steps completed without human intervention, time to completion, and whether the output is accurate.

---

### Phase 6 — Edge-Compute & Decentralized Orchestration (Extension)

This phase only starts after Phase 5 passes on your own device. This is not just an extension — it's a second research contribution that transforms AetherBrowser from a personal AI browser into a distributed computing platform.

The core concept: instead of one local machine doing all the browser work, you build a system where the Omniscient Brain can recruit other users' browsers as voluntary worker nodes (the Hands). Each Hand is just a browser tab running a lightweight script. The Brain sends each one a small, self-contained micro-task. Each Hand does the work, returns a result, and is given the next task in the queue.

What you build: a WebSocket-based coordinator server (Node.js or Python, 100–200 lines). When a user opens the AetherBrowser extension in their browser, it registers with the coordinator as an available Hand. The Brain, on receiving a large task, estimates how many parallel workers would help and requests that number from the coordinator. Each worker receives one micro-task (one URL to visit, one page to analyze). The Hand executes the task using its own local Gemini Nano instance and posts the result back via WebSocket.

The most important engineering problem you must solve is fault tolerance. Browser tabs close without warning. Your coordinator must implement a heartbeat — every 5 seconds, each worker sends a ping. If a worker misses two consecutive pings, its in-flight task is marked as unfinished and reassigned to the next available worker. This is the "Workers Randomly Quitting" problem described in your spec and solving it cleanly is publishable-level work for a final year thesis.

The security sandbox is actually a feature, not a limitation. Because each Hand runs in a browser, it has zero access to the user's file system, cannot install anything, and cannot be weaponized beyond fetching public web pages. This makes it safe for voluntary participants. Document this explicitly in your thesis — you're not asking users to run arbitrary code on their machines.

Testing gate for Phase 6: run the apartment-search scenario you described (finding 2-bedroom listings with kitchen photo analysis) against a test dataset. Verify: tasks distribute across workers, a manually closed tab causes its task to be reassigned within 10 seconds, and the final output is assembled correctly from partial results. Measure throughput — how many pages per minute with 5 workers vs 1 — and include this graph in your thesis.

---

### Naming Clarification

Throughout your document you've used "Omniscient" — that's a strong and memorable name for the Brain component. Worth formalizing it in your thesis as the official term for the Cloud Orchestrator layer, since it distinguishes your architecture from standard LLM agent frameworks. The three-model naming then becomes: Omniscient (Brain), Nano (Hands), and Phi (Eyes) — all meaningful names that map clearly to their roles.