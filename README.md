# 🎙️ TechPrep Live Agent

**Your Real-Time AI Technical Interviewer & Code Reviewer**

TechPrep Live Agent is a voice-first, low-latency mock interview simulator tailored for Backend Developers. Built with **Go (Golang)** and powered by the **Gemini Multimodal Live API**, it allows candidates to practice technical interviews, discuss system architecture, and get real-time audio feedback on their actual code.

---

## 🚀 The Hackathon Pivot: A Smart Architecture Decision
During development, we initially aimed to use screen-sharing (Vision) combined with real-time audio. However, due to API constraints where the ultra-fast `native-audio` models did not simultaneously support bidirectional vision streaming, we engineered a **smarter, faster, and more accurate approach**:

We implemented **Direct Code Uploads**. The system parses the exact source code (`.go`, `.js`, `.py`, etc.) and injects it as pure text context directly into the ongoing WebSocket audio stream. 
**The Result?** - **100% Accuracy:** The AI reads the exact syntax, eliminating image-to-text hallucinations.
- **Ultra-Low Latency:** Bypassing image processing keeps the bidirectional audio stream blazing fast.
- **Real-World Feel:** Mimics actual technical interviews where candidates share code snippets or files rather than raw screen pixels.

---

## 🏗️ System Architecture & Clean Code
This project follows the **Standard Go Project Layout** and clean architecture principles to ensure scalability and maintainability:

* **Separation of Concerns:** The Frontend (HTML, CSS, JS) is completely decoupled from the Backend logic, served cleanly as static assets.
* **Interface-Driven Design:** The connection to the AI is abstracted using an `AIClient` interface. This allows the core server to handle WebSockets independently of the AI provider.
* **Graceful Shutdown:** Implemented clean WebSocket closures (`Code 1000`) and comprehensive cleanup of browser audio resources (`AudioContext`, `MediaStream`) to prevent memory leaks and API quota drains.

```text
techprep-live-agent/
├── main.go                 # Application Entry Point
├── internal/
│   ├── agent/
│   │   └── gemini.go       # AIClient Interface & Gemini Implementation
│   └── server/
│       └── handler.go      # WebSocket & Bidi-streaming Logic
└── static/                 # Decoupled Frontend
    ├── index.html
    ├── css/style.css
    └── js/app.js
```
## ✨ Key Features
* Real-time Voice Conversation: Seamless bidirectional audio streaming using Gorilla WebSockets.
* Direct Code Injection: Upload your source code files directly to the AI's context window on the fly.
* Native PCM Audio Processing: Captures 16kHz audio from the microphone and flawlessly plays 24kHz raw PCM responses from Gemini using the browser's Web Audio API.
* Custom AI Persona: Prompt-engineered to act as a strict but helpful Senior Backend Tech Lead.

## 🛠️ Tech Stack
* Backend: Go (Golang), gorilla/websocket, joho/godotenv
* Frontend: Vanilla HTML5, CSS3, ES6 JavaScript, Web Audio API
* AI: Google Gemini Multimodal Live API (models/gemini-2.5-flash-native-audio-preview-09-2025)

## ⚙️ How to Run Locally
### Prerequisites
1. Go: Make sure you have Go installed on your machine.
2. Gemini API Key: Get your API key from  [Google AI Studio](https://aistudio.google.com/?hl=ar-EG).

### Installation Steps
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Yasser-Bader/techprep-live-agent.git](https://github.com/Yasser-Bader/techprep-live-agent.git)
   cd techprep-live-agent

2. **Set up Environment Variables:**

    Create a .env file in the root directory and add your API key:
   ```bash
   GEMINI_API_KEY=your_actual_api_key_here
(Note: The .env file is included in .gitignore to keep your key secure).

3. **Install Dependencies::**
   ```bash
   go mod tidy

4. **Run the Server:**
   ```bash
   go run main.go

5. **Start the Interview:**

    - ​Open your browser and navigate to http://localhost:8080.
    - ​Click Start Audio Interview and allow microphone access.
    - ​Start speaking to your AI Tech Lead!
    - ​Use the upload section to share a code file and ask the AI for a code review.

## 🔮 Future Improvements & Roadmap
* Pluggable AI Models: Thanks to our AIClient interface, we plan to support multiple AI backends (e.g., Anthropic Claude, OpenAI, or future Gemini iterations) allowing users to choose their preferred interviewer's "brain".
* Interruption Support: Add support for conversational interruption (barge-in) for a more natural back-and-forth flow.
* WebRTC Migration: Upgrade from WebSockets to WebRTC for even better audio streaming handling under poor network conditions.
* Interview Reports: Generate an automated summary and score of the candidate's performance at the end of the session.

`Built for the Gemini API Developer Hackathon.`