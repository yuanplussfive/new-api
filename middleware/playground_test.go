package middleware

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestPlaygroundGeminiModelReadsPathAndGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(
		"POST",
		"/pg/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse",
		strings.NewReader(`{"group":"vip"}`),
	)
	c.Request.Header.Set("Content-Type", "application/json")

	PlaygroundGeminiModel()(c)

	cached, ok := c.Get(contextKeyTaskPluginEndpointModel)
	if !ok {
		t.Fatal("expected model context to be set")
	}
	request, ok := cached.(ModelRequest)
	if !ok {
		t.Fatalf("unexpected model context type %T", cached)
	}
	if request.Model != "gemini-2.5-pro" {
		t.Fatalf("model = %q", request.Model)
	}
	if request.Group != "vip" {
		t.Fatalf("group = %q", request.Group)
	}
	if mode := c.GetInt("relay_mode"); mode == 0 {
		t.Fatal("expected gemini relay mode")
	}
}
