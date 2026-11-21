package common

import "testing"

func TestPlaygroundRelayPath(t *testing.T) {
	cases := map[string]string{
		"/pg/chat/completions?x=1": "/v1/chat/completions?x=1",
		"/pg/responses":            "/v1/responses",
		"/pg/messages":             "/v1/messages",
		"/pg/v1beta/models/gemini:streamGenerateContent": "/v1beta/models/gemini:streamGenerateContent",
	}
	for input, want := range cases {
		if got := playgroundRelayPath(input); got != want {
			t.Fatalf("playgroundRelayPath(%q) = %q, want %q", input, got, want)
		}
	}
}
