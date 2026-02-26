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

// 1. جلب الكود من GitHub
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

// 2. التقييم النهائي (آمن 100% ومضاد للانهيار)
func (h *APIHandler) HandleEvaluate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CodeContext string `json:"code_context"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// استخدام موديل 2.5 المستقر للنصوص
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

	// لو جوجل رفضت الطلب لأي سبب، هنطبع السبب في الـ Terminal عشان نعرفه
	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ Gemini API Error: %s", string(bodyBytes))
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"evaluation": "AI Evaluation failed. Please check the terminal logs for details."})
		return
	}

	// قراءة الـ JSON بطريقة هيكلية آمنة لمنع الـ Panics
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

	// استخراج النص وإرساله للمتصفح
	if len(result.Candidates) > 0 && len(result.Candidates[0].Content.Parts) > 0 {
		evaluationText := result.Candidates[0].Content.Parts[0].Text
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"evaluation": evaluationText})
	} else {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"evaluation": "AI returned an empty evaluation."})
	}
}
