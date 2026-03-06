package server

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestHandleGitHubFetch_InvalidPayload Tests the server's protection against incorrect data
func TestHandleGitHubFetch_InvalidPayload(t *testing.T) {
	// Create a fake copy of the Handler
	handler := NewAPIHandler("dummy_api_key")

	// Sending wrong JSON (broken)
	req, err := http.NewRequest("POST", "/api/github", bytes.NewBuffer([]byte(`{invalid_json}`)))
	if err != nil {
		t.Fatal(err)
	}

	// Register reply
	rr := httptest.NewRecorder()

	// Call function
	handler.HandleGitHubFetch(rr, req)

	//Ensure that the server responded with 400 Bad Request and did not crash (No Panic)
	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusBadRequest)
	}
}
