# 🎙️ TechPrep Live Agent

**Your Real-Time AI Technical Interviewer & Code Reviewer**

TechPrep Live Agent is a voice-first, low-latency mock interview simulator tailored for Backend Developers. Built with **Go (Golang)** and powered by the **Gemini Multimodal Live API**, it allows candidates to practice technical interviews, discuss system architecture, and get real-time audio feedback on their actual code.

---

## 🚀 The Hackathon Pivot: A Smart Architecture Decision
During development, we initially aimed to use screen-sharing (Vision) combined with real-time audio. However, due to API constraints where the ultra-fast `native-audio` models did not simultaneously support bidirectional vision streaming, we engineered a **smarter, faster, and more accurate approach**:

Instead of relying on image-to-text, we implemented **Direct Code Injection via File Uploads & GitHub Fetching**. 
**The Result?** - **100% Accuracy:** The AI reads the exact syntax, eliminating visual hallucinations.
- **Ultra-Low Latency:** Bypassing image processing keeps the bidirectional audio stream blazing fast.
- **Cost-Optimized:** The system detects if code was actually shared; if not, it gracefully skips unnecessary API evaluation calls.

---

## ✨ Killer Features
* 👔 **Zoom-Like Professional UI:** A clean, split-pane layout featuring a reactive AI Avatar that pulses when speaking, providing a comfortable and distraction-free user experience.
* 🐙 **Live GitHub Integration:** Paste a GitHub file URL, and the Go backend concurrently fetches the raw code using `goroutines` and injects it into the AI's context window.
* 📊 **Automated Interview Scorecard:** Once the interview ends, the system invokes the Gemini 2.5 Flash Text API to evaluate the discussed code, generating a structured scorecard (Code Quality Score, Bugs, Architectural Advice).
* ⚡ **Real-time Voice Conversation:** Seamless bidirectional audio streaming using Gorilla WebSockets and Native PCM Audio Processing (16kHz in, 24kHz out).

---

## 🏗️ System Architecture & Clean Code
This project follows the **Standard Go Project Layout** and clean architecture principles:

* **Separation of Concerns:** The Frontend is entirely decoupled from the Backend logic.
* **Interface-Driven Extensibility:** Built with `CodeFetcher` and `Evaluator` interfaces, allowing easy future integration with other platforms (e.g., GitLab) or AI models (e.g., Anthropic, OpenAI).
* **Concurrency:** Utilizes Go's `goroutines` and `sync.WaitGroup` for non-blocking API calls (like fetching from GitHub).
* **Graceful Shutdown:** Implemented clean WebSocket closures (`Code 1000`) and comprehensive cleanup of browser audio resources to prevent memory leaks.

---

## 🛠️ Tech Stack
* **Backend:** Go (Golang), `gorilla/websocket`, `joho/godotenv`
* **Frontend:** Vanilla HTML5, CSS3 (Zoom-like Dark Theme), ES6 JavaScript, Web Audio API
* **AI Models:** * *Voice:* `gemini-2.5-flash-native-audio-preview` (via Bidi-Streaming)
  * *Evaluation:* `gemini-2.5-flash` (via REST API)

---

## ⚙️ How to Run Locally

### Prerequisites
1. **Go:** Make sure you have Go installed on your machine.
2. **Gemini API Key:** Get your API key from [Google AI Studio](https://aistudio.google.com/).

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Yasser-Bader/techprep-live-agent.git
   cd techprep-live-agent

2. **Set up Environment Variables:**

    Create a .env file in the root directory and add your API key:
   ```bash
   GEMINI_API_KEY=your_actual_api_key_here
(Note: The .env file is included in .gitignore to keep your key secure).

3. **Install Dependencies:**
   ```bash
   go mod tidy

4. **Run the Server:**
   ```bash
   go run main.go

5. **Start the Interview:**

* Open your browser and navigate to http://localhost:8080.
* ​Click Start Call and allow microphone access.
* ​Start speaking to your AI Tech Lead!
* ​Upload a code file or paste a GitHub link to discuss it.
* ​Click End Call to instantly receive your customized Interview Scorecard.

## 🔮 Future Improvements & Roadmap
* Pluggable AI Models: Thanks to our AIClient interface, we plan to support multiple AI backends (e.g., Anthropic Claude, OpenAI, or future Gemini iterations) allowing users to choose their preferred interviewer's "brain".
* Interruption Support: Add support for conversational interruption (barge-in) for a more natural back-and-forth flow.
* WebRTC Migration: Upgrade from WebSockets to WebRTC for even better audio streaming handling under poor network conditions.
* Interview Reports: Generate an automated summary and score of the candidate's performance at the end of the session.

`Built for the Gemini API Developer Hackathon.`