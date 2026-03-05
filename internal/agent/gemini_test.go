package agent

import (
	"testing"
)

// TestPersonaSelection يختبر أن قاموس الشخصيات يحتوي على الشخصيات الأساسية
func TestPersonaSelection(t *testing.T) {
	// 1. التأكد من وجود شخصية Senior Tech Lead (الافتراضية)
	text, exists := AvailablePersonas["senior-tech-lead"]
	if !exists {
		t.Errorf("Expected 'senior-tech-lead' persona to exist")
	}
	if text == "" {
		t.Errorf("Expected 'senior-tech-lead' prompt to not be empty")
	}

	// 2. التأكد من إنشاء הـ Agent بنجاح
	agent := NewGeminiAgent()
	if agent == nil {
		t.Errorf("Expected NewGeminiAgent to return a valid instance, got nil")
	}
}
