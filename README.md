# TechPrep Live Agent 🤖🎤

**An interactive, real-time AI Technical Interviewer tailored for Backend Developers.**

TechPrep Live Agent is a voice-first, low-latency interview simulator built to help developers practice technical interviews, architecture discussions, and code reviews in real-time. Powered by the **Gemini Multimodal Live API** and built with **Go (Golang)**.

## 🚀 The Hackathon Pivot (Architecture Decision)
Initially, the goal was to use screen-sharing for the AI to review code. However, due to API limitations with the native-audio models not supporting vision endpoints in bidirectional streaming simultaneously, we engineered a **smarter, faster, and more accurate approach**:
Instead of relying on image-to-text inference (which can be slow and error-prone for syntax), the agent allows the candidate to **upload code files directly**. The system parses the exact source code and streams it as pure text context to the native-audio Gemini model. 
**Result:** 100% accurate code reads, zero hallucination on syntax, and blazing fast audio responses.

## ✨ Features
* **Real-time Voice Conversation:** Bidirectional, low-latency audio streaming using WebSockets.
* **Direct Code Upload:** Upload your `.go`, `.py`, `.js` or any text files. The AI reads it instantly and starts the code review.
* **Native PCM Audio Processing:** Captures 16kHz audio from the user and plays 24kHz raw PCM responses from Gemini flawlessly using the Web Audio API.
* **Lightweight Go Backend:** Clean WebSocket handling, graceful shutdowns, and error-free payload parsing.

## 🛠️ Tech Stack
* **Backend:** Go (Golang), Gorilla WebSockets.
* **Frontend:** Vanilla HTML/JS, Web Audio API.
* **AI:** Google Gemini Multimodal Live API (`models/gemini-2.5-flash-native-audio-preview-09-2025`).

## ⚙️ How to Run Locally

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

## Future Improvements
- Add support for conversational interruption (barge-in).
- Implement WebRTC for even better audio streaming handling.
- Add an interview summary generation at the end of the session.

` Built for the Gemini API Developer Hackathon.`
