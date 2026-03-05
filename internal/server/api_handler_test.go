package server

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestHandleGitHubFetch_InvalidPayload يختبر حماية السيرفر من البيانات الخاطئة
func TestHandleGitHubFetch_InvalidPayload(t *testing.T) {
	// إنشاء نسخة وهمية من الـ Handler
	handler := NewAPIHandler("dummy_api_key")

	// إرسال JSON خاطئ (مكسور)
	req, err := http.NewRequest("POST", "/api/github", bytes.NewBuffer([]byte(`{invalid_json}`)))
	if err != nil {
		t.Fatal(err)
	}

	// تسجيل الرد
	rr := httptest.NewRecorder()

	// استدعاء الدالة
	handler.HandleGitHubFetch(rr, req)

	// التأكد أن السيرفر رد بـ 400 Bad Request ولم ينهار (No Panic)
	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusBadRequest)
	}
}
