package server

import (
	"log"
	"net/http"
	"strings"

	"github.com/Yasser-Bader/techprep-live-agent/internal/agent" // Make sure this matches your module name

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// WSHandler manages the WebSocket connection between the Browser and the AI
type WSHandler struct {
	APIKey string
}

// NewWSHandler creates a new handler instance injected with dependencies
func NewWSHandler(apiKey string) *WSHandler {
	return &WSHandler{
		APIKey: apiKey,
	}
}

// HandleConnections upgrades the HTTP request and manages the bidi-streaming
func (h *WSHandler) HandleConnections(w http.ResponseWriter, r *http.Request) {
	// 1. Validate WebSocket Upgrade Headers
	connHdr := r.Header.Get("Connection")
	upgradeHdr := r.Header.Get("Upgrade")
	if !strings.Contains(strings.ToLower(connHdr), "upgrade") || strings.ToLower(upgradeHdr) != "websocket" {
		http.Error(w, "Bad Request: requires a WebSocket upgrade", http.StatusBadRequest)
		return
	}

	// 2. Upgrade the client connection
	clientConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("❌ Error upgrading client connection:", err)
		return
	}
	defer clientConn.Close()
	log.Println("✅ Browser connected to Go server")

	// 3. Initialize the AI Client via the Interface
	var aiClient agent.AIClient = agent.NewGeminiAgent()
	if err := aiClient.Connect(h.APIKey); err != nil {
		log.Println("❌ Error connecting to AI Agent:", err)
		return
	}
	defer aiClient.Close()
	log.Println("✅ Go server connected to Gemini API")

	if err := aiClient.InitializeSession(); err != nil {
		log.Println("❌ Error initializing AI session:", err)
		return
	}

	// 4. Goroutine: Forward messages from AI -> Browser
	go func() {
		for {
			msgType, message, err := aiClient.ReadMessage()
			if err != nil {
				log.Println("⚠️ AI Agent disconnected:", err)
				break
			}
			if err := clientConn.WriteMessage(msgType, message); err != nil {
				log.Println("❌ Error forwarding AI -> browser:", err)
				break
			}
		}
	}()

	// 5. Main Loop: Forward messages from Browser -> AI
	for {
		msgType, message, err := clientConn.ReadMessage()
		if err != nil {
			log.Println("⚠️ Browser disconnected:", err)
			break
		}

		if msgType == websocket.CloseMessage {
			_ = aiClient.WriteMessage(websocket.CloseMessage, message)
			break
		}

		if err := aiClient.WriteMessage(msgType, message); err != nil {
			log.Println("❌ Error forwarding browser -> AI:", err)
			break
		}
	}
}
