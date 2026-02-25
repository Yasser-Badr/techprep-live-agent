package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// 1. التأكد من الـ Headers (إضافتك الممتازة)
	log.Println("/ws incoming headers:", r.Header)
	connHdr := r.Header.Get("Connection")
	upgradeHdr := r.Header.Get("Upgrade")
	if !strings.Contains(strings.ToLower(connHdr), "upgrade") || strings.ToLower(upgradeHdr) != "websocket" {
		log.Println("Bad Request: missing websocket upgrade headers")
		http.Error(w, "Bad Request: this endpoint requires a WebSocket upgrade", http.StatusBadRequest)
		return
	}

	clientConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrading client:", err)
		return
	}
	defer clientConn.Close()
	fmt.Println("✅ Browser connected to Go server")

	// 2. الاتصال بـ Gemini باستخدام v1beta
	apiKey := os.Getenv("GEMINI_API_KEY")
	// الرابط الصحيح لـ AI Studio بناءً على الـ GitHub Issue
	geminiURL := fmt.Sprintf("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=%s", apiKey)
	geminiConn, _, err := websocket.DefaultDialer.Dial(geminiURL, nil)
	if err != nil {
		log.Println("❌ Error connecting to Gemini:", err)
		return
	}
	defer geminiConn.Close()
	fmt.Println("✅ Go server connected to Gemini API")

	// 3. إرسال الإعدادات كـ Raw JSON (مستحيل تترفض أو تدي خطأ 1007)
	// الموديل الصحيح اللي ذكره المطور hangfei لـ AI Studio
	// إرسال الإعدادات + شخصية الانترفيور الصارمة
	// شخصية Tech Lead بيستقبل ملفات كود كنصوص ويتناقش فيها بالصوت
	setupJSON := []byte(`{
		"setup": {
			"model": "models/gemini-2.5-flash-native-audio-preview-09-2025",
			"generationConfig": {
				"responseModalities": ["AUDIO"]
			},
			"systemInstruction": {
				"parts": [{"text": "You are a Senior Software Engineer Tech Lead conducting a live audio interview. The candidate will upload their code files to you directly. Read the code carefully, evaluate it, point out bugs, and ask architectural questions. Always respond naturally using voice as if you are in a real meeting."}]
			}
		}
	}`)
	if err := geminiConn.WriteMessage(websocket.TextMessage, setupJSON); err != nil {
		log.Println("Error sending setup to Gemini:", err)
		return
	}
	fmt.Println("✅ Setup Payload accepted by Gemini!")

	// 4. استقبال الردود من Gemini وتمريرها للمتصفح
	go func() {
		for {
			msgType, message, err := geminiConn.ReadMessage()
			if err != nil {
				log.Println("Gemini disconnected:", err)
				break
			}
			if err := clientConn.WriteMessage(msgType, message); err != nil {
				log.Println("Error forwarding Gemini -> browser:", err)
				break
			}
		}
	}()

	// 5. استقبال الطلبات من المتصفح وتمريرها لـ Gemini
	for {
		msgType, message, err := clientConn.ReadMessage()
		if err != nil {
			log.Println("Browser disconnected:", err)
			break
		}
		if msgType == websocket.CloseMessage {
			if err := geminiConn.WriteMessage(websocket.CloseMessage, message); err != nil {
				if err != websocket.ErrCloseSent {
					log.Println("Error forwarding close browser -> Gemini:", err)
				}
			}
			break
		}

		if err := geminiConn.WriteMessage(msgType, message); err != nil {
			log.Println("Error forwarding browser -> Gemini:", err)
			break
		}
	}
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	http.HandleFunc("/ws", handleConnections)
	http.Handle("/", http.FileServer(http.Dir(".")))

	port := ":8080"
	fmt.Printf("🚀 TechPrep Server running on http://localhost%s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
