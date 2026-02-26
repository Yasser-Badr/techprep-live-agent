package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/Yasser-Bader/techprep-live-agent/internal/server" // Make sure this matches your go.mod module name

	"github.com/joho/godotenv"
)

func main() {
	// 1. Load configuration (Environment variables)
	if err := godotenv.Load(); err != nil {
		log.Println("ℹ️ Warning: No .env file found")
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("❌ Critical Error: GEMINI_API_KEY is not set")
	}

	// 2. Initialize the WebSocket handler with dependency injection
	wsHandler := server.NewWSHandler(apiKey)
	apiHandler := server.NewAPIHandler(apiKey) 

	// 3. Define routing
	http.HandleFunc("/ws", wsHandler.HandleConnections)
	http.HandleFunc("/api/github", apiHandler.HandleGitHubFetch)
	http.HandleFunc("/api/evaluate", apiHandler.HandleEvaluate)

	// Serve static files (HTML, CSS, JS) cleanly
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/index.html")
	})

	// 4. Start the server
	port := ":8080"
	fmt.Printf("🚀 TechPrep Server running gracefully on http://localhost%s\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
