package agent

import (
	"testing"
)

// TestPersonaSelection Tests that the character dictionary contains the basic characters
func TestPersonaSelection(t *testing.T) {
	// 1. Ensure that the (default) Senior Tech Lead character is present
	text, exists := AvailablePersonas["senior-tech-lead"]
	if !exists {
		t.Errorf("Expected 'senior-tech-lead' persona to exist")
	}
	if text == "" {
		t.Errorf("Expected 'senior-tech-lead' prompt to not be empty")
	}

	// 2. Ensure that the Agent was created successfully
	agent := NewGeminiAgent()
	if agent == nil {
		t.Errorf("Expected NewGeminiAgent to return a valid instance, got nil")
	}
}
