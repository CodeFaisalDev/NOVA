# N.O.V.A. (No-DOM Orchestrated Visual Agent)
## Tri-Model Visual Agentic Desktop Browser
**Complete Project & Technical Documentation**

---

| | |
|---|---|
| **Author** | Faisal Sorkar |
| **Document version** | 1.0 |
| **Project type** | Final Year CS Thesis + Research Portfolio |
| **Target intake** | September 2027 Master's Programme |
| **Domain** | AI · Edge-Compute · Autonomous Web Automation |
| **Primary stack** | Tauri 2.0 · Next.js · Rust · Python · TypeScript |

---

## 1. Executive Summary

AetherBrowser is a local-first AI-powered desktop browser built with Tauri 2.0. It introduces a Tri-Model Architecture that assigns browser automation tasks to three specialized AI models based on complexity, privacy requirements, and computational cost. The system completely bypasses fragile HTML DOM parsing in favour of multimodal visual understanding, making it resilient to website layout changes that break traditional scrapers.

The project is developed in six phases on Linux and produces native installers for Windows, macOS, and Linux via a GitHub Actions CI pipeline. Phases 1 through 5 build the core product. Phase 6 is an extension that transforms the system into a decentralized edge-compute mesh.

> **Core innovation:** No-DOM visual automation: the agent sees and clicks the screen exactly like a human user, using a locally hosted multimodal vision model. No HTML selectors. No scraper breakage when websites update.

## 2. Problem Statement

Current web automation frameworks such as Playwright and Puppeteer rely on hardcoded HTML DOM selectors. When a website updates its layout, class names, or structure, the automation script breaks immediately and silently. Developers must manually patch selectors every time a target website changes — an expensive and unscalable maintenance burden.

Additionally, modern agentic AI workflows route all browser data — including potentially sensitive personal information — to cloud LLMs for processing. This creates two compounding problems: severe privacy risk from transmitting browsing data to third-party servers, and latency bottlenecks from the round-trip cost of cloud inference.

AetherBrowser solves both problems simultaneously with a single architectural decision: a local-first, vision-based agent that reasons about what is on screen rather than what is in the HTML source.

## 3. The Tri-Model Architecture

The system operates on an asynchronous delegation loop between three specialized AI models. The Omniscient acts as the reasoning brain. Gemini Nano acts as the fast local extraction layer. Phi-4 Multimodal acts as the visual navigation layer. Together they form a complete agent that can plan, extract data, and physically interact with web interfaces.

### 3.1 The Omniscient — Cloud Orchestrator

| | |
|---|---|
| **Role** | Complex reasoning, task decomposition, workflow orchestration |
| **Model** | Llama 3.3 70B via Groq API (or Gemini 1.5 Pro) |
| **Runs on** | Cloud (Groq inference infrastructure) |
| **Cost** | Free tier: 14,400 requests/day on Groq |
| **Output format** | JSON action plan array: navigate, extract, click, done |
| **Privacy** | Only the user's task goal is sent to cloud. No browsing data. |

The user provides a natural language goal. The Omniscient translates it into a structured, step-by-step execution graph. It does not directly touch the browser — it acts as a planner and coordinator only.

### 3.2 Gemini Nano — Local Extractor (The Hands)

| | |
|---|---|
| **Role** | Fast local text extraction and structured data formatting |
| **Model** | Gemini Nano via Chrome window.ai API (or Qwen2.5-1.5B fallback) |
| **Runs on** | Locally, inside the hidden WebView's JavaScript context |
| **Cost** | Zero API fees — runs entirely on device |
| **Privacy** | No data leaves the machine during extraction |
| **Fallback** | Qwen2.5-1.5B-Instruct Q4 GGUF via FastAPI sidecar |

When the Omniscient requests data from a web page, Gemini Nano reads `document.body.innerText` inside the hidden WebView and returns structured JSON. It is injected via `webview.eval()` from the Tauri Rust backend.

### 3.3 Phi-4 Multimodal — Visual Navigator (The Eyes)

| | |
|---|---|
| **Role** | No-DOM visual UI grounding and synthetic click injection |
| **Model** | Microsoft Phi-4-multimodal-instruct (5.6B, Q4_K_M GGUF) |
| **Runs on** | Locally via Python FastAPI sidecar bundled in Tauri |
| **Cost** | Zero API fees — full local inference |
| **GPU requirement** | 4GB VRAM minimum; CPU fallback available (slower) |
| **Output** | JSON coordinate object: `{x: int, y: int}` |

The Tauri Rust backend captures a silent screenshot of the hidden WebView using `tauri-plugin-screenshots`. This image is sent base64-encoded to the local Phi-4 FastAPI sidecar. Phi-4 returns pixel coordinates for the requested UI element. The Rust backend injects a synthetic `MouseEvent` at those exact coordinates — no HTML parsing at any step.

> **Self-healing navigation:** If a website updates its button class from `.btn-submit` to `.cta-primary`, traditional Playwright scripts fail silently. AetherBrowser takes a fresh screenshot, sees the button visually, and clicks it anyway. The HTML never matters.

## 4. Complete Technical Stack

| Layer | Technology | Purpose |
|---|---|---|
| Desktop core | Tauri 2.0 (Rust) | Native window, WebView, OS APIs, IPC bridge |
| Frontend UI | Next.js 14 + React | Chat interface, action log, browser toolbar |
| Styling | Tailwind CSS + shadcn/ui | Glassmorphism UI, component library |
| Language (frontend) | TypeScript | Type-safe React and Tauri API calls |
| Language (backend) | Rust | IPC commands, screenshot, mouse injection |
| Cloud AI (Brain) | Groq API — Llama 3.3 70B | Task planning and JSON action graph |
| Local AI (Hands) | Gemini Nano / window.ai | In-page text extraction, zero cost |
| Local AI fallback | Qwen2.5-1.5B GGUF | Fallback for window.ai unavailability |
| Local AI (Eyes) | Phi-4-multimodal GGUF | Visual UI grounding, coordinate return |
| Vision inference | Python FastAPI + llama-cpp-python | Hosts Phi-4 as local HTTP sidecar |
| Screenshots | tauri-plugin-screenshots | Captures hidden WebView as PNG buffer |
| Real-time comms | Tauri IPC + WebSocket | React-to-Rust and sidecar messaging |
| CI / Distribution | GitHub Actions | Builds .deb/.msi/.dmg on every release tag |
| Phase 6 mesh | Node.js WebSocket server | Worker registry, heartbeat, task queue |

## 5. Repository & Folder Structure

All development is done on Linux. The repository is hosted on GitHub as a private repo. The structure below must be maintained throughout all phases.

```text
nova/                          ← project root
├── app/                       ← Next.js App Router pages
│   └── page.tsx               ← main browser + chat UI
├── components/
│   ├── ChatSidebar.tsx        ← agent message log + input
│   ├── ActionCard.tsx         ← one card per Brain step
│   ├── BrowserToolbar.tsx     ← page title + nav controls
│   └── AgentStatus.tsx        ← live agent state indicator
├── lib/
│   ├── brain.ts               ← Groq API calls (Omniscient)
│   ├── schema.ts              ← JSON action plan types
│   └── ipc.ts                 ← Tauri invoke wrappers
├── src-tauri/
│   ├── src/
│   │   ├── main.rs            ← Tauri app entry point
│   │   ├── browser.rs         ← IPC: navigate, screenshot, click
│   │   └── agent.rs           ← orchestration loop (Phase 5)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── sidecar/                   ← Python FastAPI for Phi-4 (Phase 4)
│   ├── main.py
│   └── requirements.txt
├── models/                    ← GGUF model files (gitignored)
├── .github/workflows/
│   └── release.yml            ← cross-platform build CI
├── .env.local                 ← API keys (gitignored)
└── next.config.ts