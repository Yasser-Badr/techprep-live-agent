# 🤖 TechPrep Live Agent

**Your 24/7 AI Senior Tech Lead for ANY Tech Stack.**

TechPrep Live Agent is a real-time, voice-first AI companion built with Go and the Gemini Multimodal Live API. It conducts dynamic technical interviews, performs live code reviews via direct GitHub integration, and generates automated architectural scorecards—all designed to help developers practice under pressure without the hassle of screen-sharing latency.

## 🔥 Killer Features
* **Dynamic AI Persona:** Adapts the interview flow based on your specific tech stack (Backend, Frontend, DevOps, etc.).
* **Ultra-Low Latency Voice:** Bidirectional audio streaming using WebSockets and Gemini Live API (`gemini-2.5-flash-native-audio-preview`).
* **Direct GitHub Code Injection:** Paste a GitHub file URL, and the Go backend fetches and injects the raw code directly into the AI's context—eliminating AI visual hallucinations.
* **Automated Scorecard:** Evaluates your performance, highlights bugs, and provides system design advice using Gemini 2.5 Flash Text API after the call ends.
* **Production-Ready Infrastructure:** Fully containerized with **Docker & Docker Compose**, utilizing an Nginx reverse proxy for secure WebSocket (WSS) handling.

---

## 🏗️ Architecture
* **Backend:** Go (Golang) with Clean Architecture.
* **Frontend:** Vanilla JavaScript, Web Audio API, HTML5, CSS3 (Zoom-like dark theme).
* **Infrastructure:** Docker, Docker Compose, Nginx, AWS EC2.
* **AI Models:** Google Gemini Multimodal Live API & Gemini Text API.

---

## 🚀 Quick Start (Recommended: Using Docker)

The easiest way for judges and developers to run this project is using Docker. It spins up both the Go backend and the Nginx reverse proxy automatically.

### Prerequisites
* [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) installed on your machine.
* A Google Gemini API Key.

### Steps to Run
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Yasser-Bader/techprep-live-agent.git
   cd techprep-live-agent

 2. Set up Environment Variables:
   Create a .env file in the root directory and add your Gemini API Key:
   GEMINI_API_KEY=your_actual_api_key_here

 3. Build and Run with Docker Compose:
   docker-compose up -d --build

 4. Access the Application:
   Open your browser and navigate to: http://localhost
   (Note: Browsers require HTTPS or localhost to allow microphone access. Running on localhost works perfectly for testing).
 5. Stop the Application:
   docker-compose down

## 🛠️ Manual Setup (Without Docker)
If you prefer to run the Go application directly on your machine:
 1. Ensure you have Go 1.22+ installed.
 2. Clone the repository and navigate into it.
 3. Export your API key:
   export GEMINI_API_KEY="your_actual_api_key_here"

 4. Download dependencies and run:
   go mod tidy
go run main.go

 5. The server will start at http://localhost:8080.
## 🎮 How to Use (Demo Flow)
 1. Click Start Call and grant microphone permissions.
 2. The AI will introduce itself and ask about your tech stack and if you have any code to share.
 3. Respond using your voice.
 4. Code Review: Paste a link to a raw file from GitHub in the input box and click Fetch GitHub. The AI will instantly read it and start discussing it with you.
 5. Click End Call when finished to receive your detailed architectural Scorecard.

## 🤝 Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any enhancements.

## 📝 License
This project is licensed under the MIT License.


`Built for the Gemini API Developer Hackathon.`
