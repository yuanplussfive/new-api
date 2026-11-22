package common

import (
	"testing"

	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequestActivityCapturesResponsesSemantics(t *testing.T) {
	info := &RelayInfo{}
	info.ObserveResponsesOutputs([]dto.ResponsesOutput{
		{Type: "reasoning", ID: "reasoning-1"},
		{Type: dto.BuildInCallFunctionCall, ID: "call-1", Name: "lookup"},
		{Type: dto.BuildInCallFunctionCall, ID: "call-1", Name: "lookup"},
		{Type: dto.BuildInCallWebSearchCall, ID: "search-1"},
		{Type: "message", ID: "message-1"},
		{Type: "image_generation_call", ID: "image-1"},
	})
	info.ObserveActivityReasoningTokens(128)

	activity := info.ActivitySnapshot()
	require.NotNil(t, activity)
	assert.True(t, activity.Reasoning.Used)
	assert.Equal(t, 128, activity.Reasoning.Tokens)
	require.Len(t, activity.Tools, 2)
	assert.Equal(t, ActivityTool{Type: dto.BuildInCallFunctionCall, Name: "lookup", Count: 1}, activity.Tools[0])
	assert.Equal(t, ActivityTool{Type: dto.BuildInCallWebSearchCall, Count: 1}, activity.Tools[1])
	assert.Contains(t, activity.Outputs, "message")
	assert.Contains(t, activity.Outputs, "image_generation_call")
}

func TestRequestActivityOmitsEmptySnapshots(t *testing.T) {
	info := &RelayInfo{}
	assert.Nil(t, info.ActivitySnapshot())

	info.EnsureActivity()
	assert.Nil(t, info.ActivitySnapshot())
}
