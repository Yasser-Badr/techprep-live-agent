package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
)

type CodeFetcher interface {
	Fetch(url string) (string, error)
}

type Evaluator interface {
	Evaluate(codeContext string) (string, error)
}

type APIHandler struct {
	APIKey string
}

func NewAPIHandler(apiKey string) *APIHandler {
	return &APIHandler{APIKey: apiKey}
}

// 1. Fetch the code from GitHub
func (h *APIHandler) HandleGitHubFetch(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	rawURL := strings.Replace(req.URL, "github.com", "raw.githubusercontent.com", 1)
	rawURL = strings.Replace(rawURL, "/blob/", "/", 1)

	var code string
	var fetchErr error
	var wg sync.WaitGroup

	wg.Add(1)
	go func(url string) {
		defer wg.Done()
		resp, err := http.Get(url)
		if err != nil || resp.StatusCode != 200 {
			fetchErr = fmt.Errorf("failed to fetch from GitHub")
			return
		}
		defer resp.Body.Close()
		bodyBytes, _ := io.ReadAll(resp.Body)
		code = string(bodyBytes)
	}(rawURL)

	wg.Wait()

	if fetchErr != nil {
		http.Error(w, fetchErr.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"code": code})
}

// 2. Final Rating (100% safe and anti-collapse)
func (h *APIHandler) HandleEvaluate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CodeContext string `json:"code_context"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// Use the stable 2.5 text model
	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", h.APIKey)

	prompt := fmt.Sprintf(`You are an expert Backend Tech Lead. Evaluate the following code and provide a scorecard. 
	Format as cleanly separated plain text (No Markdown bolding).
	Include: 
	1. Code Quality Score (out of 10)
	2. Main Bugs/Issues
	3. Architectural Advice
	
	Code context: %s`, req.CodeContext)

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": prompt}}},
		},
	}
	jsonData, _ := json.Marshal(payload)

	resp, err := http.Post(geminiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("❌ Failed to reach Gemini API: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"evaluation": "Failed to connect to AI server."})
		return
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)

	// If Google rejects the request for any reason, we will print the reason in the Terminal so we know it
	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ Gemini API Error: %s", string(bodyBytes))
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"evaluation": "AI Evaluation failed. Please check the terminal logs for details."})
		return
	}

	// Read JSON in a structurally safe way to prevent Panics
	type GeminiResponse struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	var result GeminiResponse
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		log.Printf("❌ Error parsing JSON: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"evaluation": "Could not parse evaluation format."})
		return
	}

	// Extract the text and send it to the browser
	if len(result.Candidates) > 0 && len(result.Candidates[0].Content.Parts) > 0 {
		evaluationText := result.Candidates[0].Content.Parts[0].Text
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"evaluation": evaluationText})
	} else {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"evaluation": "AI returned an empty evaluation."})
	}
}

// =====================================================================
// VERSION 2: Full Repository Analysis OR Single File (Smart Fetch)
// =====================================================================
// This version checks if the URL is a single file or a full repository.
// If it's a full repo, it fetches the README.md to understand the architecture.
func (h *APIHandler) HandleGitHubFetchV2(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	urlStr := req.URL
	var finalContext string

	// Condition 1: Check if it's a single file (URL contains "/blob/")
	if strings.Contains(urlStr, "/blob/") {
		// Convert normal GitHub URL to Raw content URL
		rawURL := strings.Replace(urlStr, "github.com", "raw.githubusercontent.com", 1)
		rawURL = strings.Replace(rawURL, "/blob/", "/", 1)

		resp, err := http.Get(rawURL)
		if err != nil || resp.StatusCode != 200 {
			http.Error(w, "Failed to fetch single file from GitHub", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		
		bodyBytes, _ := io.ReadAll(resp.Body)
		finalContext = string(bodyBytes)

	} else {
		// Condition 2: It is a Full Repository URL (e.g., https://github.com/owner/repo)
		// Extract owner and repo name from the URL
		urlParts := strings.Split(strings.TrimPrefix(urlStr, "https://github.com/"), "/")
		if len(urlParts) < 2 {
			http.Error(w, "Invalid GitHub Repository URL", http.StatusBadRequest)
			return
		}
		
		owner := urlParts[0]
		repo := strings.TrimSuffix(urlParts[1], ".git") // Remove .git if exists

		// Fetch the README.md file as the primary architectural context
		readmeURL := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/main/README.md", owner, repo)
		resp, err := http.Get(readmeURL)
		
		readmeContent := "No README.md found in the main branch."
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			bodyBytes, _ := io.ReadAll(resp.Body)
			readmeContent = string(bodyBytes)
		}

		// Inject instructions for the AI to review it as a full architecture
		finalContext = fmt.Sprintf("Repository: %s/%s\n\n--- ARCHITECTURE & README ---\n%s\n\n[System Note: The candidate shared a full repository. Discuss the overall system design, project structure, and purpose based on this README.]", owner, repo, readmeContent)
	}

	// Return the formatted context back to the frontend
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"code": finalContext})
}
