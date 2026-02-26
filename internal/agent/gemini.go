package agent

import (
	"fmt"
	"log"

	"github.com/gorilla/websocket"
)

// AIClient defines the behavior for any AI streaming service
// This allows future scalability (e.g., adding OpenAI or Anthropic later)
type AIClient interface {
	Connect(apiKey string) error
	InitializeSession() error
	ReadMessage() (int, []byte, error)
	WriteMessage(msgType int, data []byte) error
	Close() error
}

// GeminiAgent implements the AIClient interface for Google's Gemini API
type GeminiAgent struct {
	conn *websocket.Conn
}

// NewGeminiAgent creates a new instance of the Gemini AI client
func NewGeminiAgent() *GeminiAgent {
	return &GeminiAgent{}
}

// Connect establishes the WebSocket connection to the Gemini Multimodal Live API
func (g *GeminiAgent) Connect(apiKey string) error {
	geminiURL := fmt.Sprintf("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=%s", apiKey)

	conn, _, err := websocket.DefaultDialer.Dial(geminiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to Gemini: %w", err)
	}
	g.conn = conn
	return nil
}

// InitializeSession sends the initial configuration and persona payload to the AI
func (g *GeminiAgent) InitializeSession() error {
	setupJSON := []byte(`{
		"setup": {
			"model": "models/gemini-2.5-flash-native-audio-preview-09-2025",
			"generationConfig": {
				"responseModalities": ["AUDIO"]
			},
			"systemInstruction": {
				"parts": [{"text": "You are a Senior Backend Tech Lead conducting a live audio interview. The candidate will upload their code files to you directly. Read the code carefully, evaluate it, point out bugs, and ask architectural questions. Always respond naturally using voice as if you are in a real meeting."}]
			}
		}
	}`)

	if err := g.conn.WriteMessage(websocket.TextMessage, setupJSON); err != nil {
		return fmt.Errorf("failed to send setup payload: %w", err)
	}
	log.Println("✅ Setup Payload accepted by Gemini")
	return nil
}

// ReadMessage reads incoming responses from the AI
func (g *GeminiAgent) ReadMessage() (int, []byte, error) {
	return g.conn.ReadMessage()
}

// WriteMessage sends client data (audio chunks or text context) to the AI
func (g *GeminiAgent) WriteMessage(msgType int, data []byte) error {
	return g.conn.WriteMessage(msgType, data)
}

// Close gracefully terminates the AI connection
func (g *GeminiAgent) Close() error {
	if g.conn != nil {
		// Send a secure shutdown message to Google before disconnecting
		closeMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "User ended the session gracefully")
		_ = g.conn.WriteMessage(websocket.CloseMessage, closeMsg)

		log.Println("🔒 AI Agent connection closed safely")
		return g.conn.Close()
	}
	return nil
}
