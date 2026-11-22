package common

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/relaykit/relayconvert"
	"github.com/QuantumNous/new-api/relaykit/relayconvert/convmeta"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRelayInfoGetFinalRequestRelayFormatPrefersExplicitFinal(t *testing.T) {
	info := &RelayInfo{
		RelayFormat:             types.RelayFormatOpenAI,
		RequestConversionChain:  []types.RelayFormat{types.RelayFormatOpenAI, types.RelayFormatClaude},
		FinalRequestRelayFormat: types.RelayFormatOpenAIResponses,
	}

	require.Equal(t, types.RelayFormat(types.RelayFormatOpenAIResponses), info.GetFinalRequestRelayFormat())
}

func TestRelayInfoGetFinalRequestRelayFormatFallsBackToConversionChain(t *testing.T) {
	info := &RelayInfo{
		RelayFormat:            types.RelayFormatOpenAI,
		RequestConversionChain: []types.RelayFormat{types.RelayFormatOpenAI, types.RelayFormatClaude},
	}

	require.Equal(t, types.RelayFormat(types.RelayFormatClaude), info.GetFinalRequestRelayFormat())
}

func TestRelayInfoGetFinalRequestRelayFormatFallsBackToRelayFormat(t *testing.T) {
	info := &RelayInfo{
		RelayFormat: types.RelayFormatGemini,
	}

	require.Equal(t, types.RelayFormat(types.RelayFormatGemini), info.GetFinalRequestRelayFormat())
}

func TestRelayInfoGetFinalRequestRelayFormatNilReceiver(t *testing.T) {
	var info *RelayInfo
	require.Equal(t, types.RelayFormat(""), info.GetFinalRequestRelayFormat())
}

func TestRelayInfoMetaTypedNilReceiver(t *testing.T) {
	var info *RelayInfo
	var meta convmeta.Meta = info

	assert.Empty(t, meta.GetOriginModelName())
	assert.Empty(t, meta.GetUpstreamModelName())
	assert.False(t, meta.HasChannelMeta())
	assert.Zero(t, meta.GetChannelID())
	assert.Zero(t, meta.GetChannelType())
	assert.False(t, meta.GetIsStream())
	assert.Empty(t, meta.GetReasoningEffort())
	assert.Nil(t, meta.ReasoningState())
	assert.Zero(t, meta.GetEstimatePromptTokens())
	assert.Zero(t, meta.GetSendResponseCount())

	assert.NotPanics(t, func() {
		meta.SetReasoningEffort("high")
		meta.IncrSendResponseCount()
		meta.AppendRequestConversion(types.RelayFormatClaude)
		meta.SetResponsesToolState(&convmeta.ResponsesToolState{})
	})
	assert.Nil(t, meta.ResponsesToolState())

	firstState := meta.EnsureClaudeConvertInfo()
	secondState := meta.EnsureClaudeConvertInfo()
	require.NotNil(t, firstState)
	require.NotNil(t, secondState)
	assert.Equal(t, convmeta.LastMessageTypeNone, firstState.LastMessagesType)
	assert.NotSame(t, firstState, secondState)

	firstOptions := meta.ConvOptions()
	secondOptions := meta.ConvOptions()
	require.NotNil(t, firstOptions)
	require.NotNil(t, secondOptions)
	assert.NotSame(t, firstOptions, secondOptions)
	assert.NotNil(t, firstOptions.Claude.DefaultMaxTokens)
	assert.NotNil(t, firstOptions.Gemini.SupportsImagine)
	assert.NotNil(t, firstOptions.Gemini.SafetySetting)
	assert.NotNil(t, firstOptions.PreserveThinkingSuffix)
	assert.NotNil(t, firstOptions.PreserveEffortTail)
}

func TestRelayInfoResponsesToolStateRoundTrip(t *testing.T) {
	info := &RelayInfo{}
	state := &convmeta.ResponsesToolState{CustomToolNames: map[string]struct{}{"exec": {}}}

	info.SetResponsesToolState(state)
	assert.Same(t, state, info.ResponsesToolState())
	assert.True(t, convmeta.ResponsesToolStateOf(info).IsCustomTool("exec"))

	info.SetResponsesToolState(nil)
	assert.Nil(t, info.ResponsesToolState())
	assert.False(t, convmeta.ResponsesToolStateOf(info).IsCustomTool("exec"))
}

func TestGenRelayInfoCapturesRequestReasoningEffort(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name        string
		path        string
		relayFormat types.RelayFormat
		request     dto.Request
		expected    string
	}{
		{
			name:        "OpenAI chat top-level effort",
			path:        "/v1/chat/completions",
			relayFormat: types.RelayFormatOpenAI,
			request:     &dto.GeneralOpenAIRequest{Model: "gpt-5.6-sol", ReasoningEffort: " high "},
			expected:    "high",
		},
		{
			name:        "OpenRouter nested chat effort",
			path:        "/v1/chat/completions",
			relayFormat: types.RelayFormatOpenAI,
			request:     &dto.GeneralOpenAIRequest{Model: "anthropic/claude", Reasoning: json.RawMessage(`{"effort":"xhigh"}`)},
			expected:    "xhigh",
		},
		{
			name:        "OpenAI Responses effort",
			path:        "/v1/responses",
			relayFormat: types.RelayFormatOpenAIResponses,
			request:     &dto.OpenAIResponsesRequest{Model: "gpt-5.6-sol", Reasoning: &dto.Reasoning{Effort: "max"}},
			expected:    "max",
		},
		{
			name:        "explicit none is preserved",
			path:        "/v1/responses",
			relayFormat: types.RelayFormatOpenAIResponses,
			request:     &dto.OpenAIResponsesRequest{Model: "gpt-5.6-sol", Reasoning: &dto.Reasoning{Effort: "none"}},
			expected:    "none",
		},
		{
			name:        "non-string nested effort is ignored",
			path:        "/v1/chat/completions",
			relayFormat: types.RelayFormatOpenAI,
			request:     &dto.GeneralOpenAIRequest{Model: "anthropic/claude", Reasoning: json.RawMessage(`{"effort":42}`)},
			expected:    "",
		},
		{
			name:        "Claude output config effort",
			path:        "/v1/messages",
			relayFormat: types.RelayFormatClaude,
			request:     &dto.ClaudeRequest{Model: "claude-opus-4-7", OutputConfig: json.RawMessage(`{"effort":"medium"}`)},
			expected:    "medium",
		},
		{
			name:        "Gemini thinking level",
			path:        "/v1beta/models/gemini-3-pro:generateContent",
			relayFormat: types.RelayFormatGemini,
			request: &dto.GeminiChatRequest{GenerationConfig: dto.GeminiChatGenerationConfig{
				ThinkingConfig: &dto.GeminiThinkingConfig{ThinkingLevel: "low"},
			}},
			expected: "low",
		},
		{
			name:        "Gemini uppercase enum thinking level is canonicalized",
			path:        "/v1beta/models/gemini-3.7-flash:generateContent",
			relayFormat: types.RelayFormatGemini,
			request: &dto.GeminiChatRequest{GenerationConfig: dto.GeminiChatGenerationConfig{
				ThinkingConfig: &dto.GeminiThinkingConfig{ThinkingLevel: " MEDIUM "},
			}},
			expected: "medium",
		},
		{
			name:        "Gemini unknown thinking level is recorded as sent",
			path:        "/v1beta/models/gemini-3.7-flash:generateContent",
			relayFormat: types.RelayFormatGemini,
			request: &dto.GeminiChatRequest{GenerationConfig: dto.GeminiChatGenerationConfig{
				ThinkingConfig: &dto.GeminiThinkingConfig{ThinkingLevel: "ULTRA"},
			}},
			expected: "ULTRA",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
			ctx.Request = httptest.NewRequest("POST", tt.path, nil)

			info, err := GenRelayInfo(ctx, tt.relayFormat, tt.request, nil)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, info.ReasoningEffort)
		})
	}
}

func TestGenRelayInfoKeepsOriginAndLeavesBillingUnset(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)
	const model = "qwen3.8-max@thinking:on@temperature:0.2"
	ctx.Set("original_model", model)

	info, err := GenRelayInfo(ctx, types.RelayFormatOpenAI, &dto.GeneralOpenAIRequest{Model: model}, nil)
	require.NoError(t, err)
	assert.Equal(t, model, info.OriginModelName)
	assert.Empty(t, info.BillingModelName)
	assert.Equal(t, model, info.GetBillingModelName())
}

func TestInitChannelMetaRestoresRequestReasoningEffortForRetry(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest("POST", "/v1/responses", nil)
	request := &dto.OpenAIResponsesRequest{
		Model:     "gpt-5.6-sol",
		Reasoning: &dto.Reasoning{Effort: "max"},
	}
	info, err := GenRelayInfo(ctx, types.RelayFormatOpenAIResponses, request, nil)
	require.NoError(t, err)

	info.SetReasoningEffort("high")
	info.InitChannelMeta(ctx)
	assert.Equal(t, "max", info.ReasoningEffort)

	info.SetReasoningEffort("low")
	info.InitChannelMeta(ctx)
	assert.Equal(t, "max", info.ReasoningEffort)
}

func TestInitChannelMetaAppliesAdvancedCustomRoutePassThrough(t *testing.T) {
	gin.SetMode(gin.TestMode)
	advancedCustom := &dto.AdvancedCustomConfig{
		Routes: []dto.AdvancedCustomRoute{
			{
				IncomingPath:           "/v1/chat/completions",
				UpstreamPath:           "/v1/chat/completions",
				Models:                 []string{"native-model"},
				PassThroughBodyEnabled: true,
			},
			{
				IncomingPath: "/v1/chat/completions",
				UpstreamPath: "/v1/messages",
				Converter:    relayconvert.ConverterOpenAIChatToClaudeMessages,
			},
		},
	}
	require.NoError(t, advancedCustom.Validate())

	tests := []struct {
		name            string
		channelType     int
		channelSetting  dto.ChannelSettings
		model           string
		wantPassThrough bool
		wantEffort      string
	}{
		{
			name:            "matched route enables pass-through and drops reasoning effort",
			channelType:     constant.ChannelTypeAdvancedCustom,
			model:           "native-model",
			wantPassThrough: true,
			wantEffort:      "",
		},
		{
			name:            "fallback converter route keeps conversion",
			channelType:     constant.ChannelTypeAdvancedCustom,
			model:           "other-model",
			wantPassThrough: false,
			wantEffort:      "high",
		},
		{
			name:            "channel-level pass-through still applies to converter route",
			channelType:     constant.ChannelTypeAdvancedCustom,
			channelSetting:  dto.ChannelSettings{PassThroughBodyEnabled: true},
			model:           "other-model",
			wantPassThrough: true,
			wantEffort:      "",
		},
		{
			name:            "route flag is ignored for other channel types",
			channelType:     constant.ChannelTypeOpenAI,
			model:           "native-model",
			wantPassThrough: false,
			wantEffort:      "high",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
			ctx.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)
			ctx.Set("original_model", tt.model)
			common.SetContextKey(ctx, constant.ContextKeyChannelType, tt.channelType)
			common.SetContextKey(ctx, constant.ContextKeyChannelSetting, tt.channelSetting)
			common.SetContextKey(ctx, constant.ContextKeyChannelOtherSetting, dto.ChannelOtherSettings{AdvancedCustom: advancedCustom})

			info, err := GenRelayInfo(ctx, types.RelayFormatOpenAI, &dto.GeneralOpenAIRequest{Model: tt.model, ReasoningEffort: "high"}, nil)
			require.NoError(t, err)

			info.InitChannelMeta(ctx)

			assert.Equal(t, tt.wantPassThrough, info.ChannelSetting.PassThroughBodyEnabled)
			assert.Equal(t, tt.wantEffort, info.ReasoningEffort)
		})
	}
}

func TestInitChannelMetaResetsPerAttemptStreamStateAndPreservesRequestState(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)

	info, err := GenRelayInfo(ctx, types.RelayFormatOpenAI, &dto.GeneralOpenAIRequest{Model: "gpt-test"}, nil)
	require.NoError(t, err)

	claudeState := relayconvert.NewClaudeToChatStreamState()
	_, err = claudeState.ConvertChunk(&dto.ClaudeResponse{
		Type:  "content_block_start",
		Index: ptr(7),
		ContentBlock: &dto.ClaudeMediaMessage{
			Type: "tool_use",
			Id:   "toolu_1",
			Name: "lookup",
		},
	})
	require.NoError(t, err)
	_, err = claudeState.ConvertChunk(&dto.ClaudeResponse{
		Type:  "content_block_delta",
		Index: ptr(7),
		Delta: &dto.ClaudeMediaMessage{
			Type:        "input_json_delta",
			PartialJson: ptr(`{"q":"x"}`),
		},
	})
	require.NoError(t, err)

	geminiState, err := relayconvert.NewResponseStreamState(types.RelayFormatOpenAI, types.RelayFormatGemini, relayconvert.ResponseStreamOptions{
		ID:    "chatcmpl_1",
		Model: "gpt-test",
	})
	require.NoError(t, err)

	info.SendResponseCount = 3
	info.ClaudeToChatStreamState = claudeState
	info.ChatToGeminiStreamState = geminiState
	info.LastError = types.NewError(assert.AnError, types.ErrorCodeBadResponseBody)
	info.StreamStatus = NewStreamStatus()
	info.StreamStatus.RecordError("attempt 1 soft error")
	info.RecordConversionDiagnostics(context.Background(), []types.ConversionDiagnostic{{
		Code:     "test.loss",
		Message:  "attempt 1 conversion loss",
		Severity: types.ConversionDiagnosticWarning,
		From:     types.RelayFormatClaude,
		To:       types.RelayFormatOpenAI,
	}})

	info.InitChannelMeta(ctx)

	assert.Zero(t, info.SendResponseCount)
	assert.Nil(t, info.ClaudeToChatStreamState)
	assert.Nil(t, info.ChatToGeminiStreamState)

	require.NotNil(t, info.StreamStatus)
	assert.True(t, info.StreamStatus.HasErrors())
	assert.Equal(t, 1, info.StreamStatus.TotalErrorCount())
	diagnostics := info.ConversionDiagnostics()
	require.Len(t, diagnostics, 1)
	assert.Equal(t, "test.loss", diagnostics[0].Code)
	require.NotNil(t, info.LastError)

	freshClaude := relayconvert.NewClaudeToChatStreamState()
	_, err = freshClaude.ConvertChunk(&dto.ClaudeResponse{
		Type:  "content_block_delta",
		Index: ptr(7),
		Delta: &dto.ClaudeMediaMessage{
			Type:        "input_json_delta",
			PartialJson: ptr(`{"q":"x"}`),
		},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unknown content block index")

	info.IncrSendResponseCount()
	responses := relayconvert.StreamResponseOpenAI2Claude(&dto.ChatCompletionsStreamResponse{
		Id:    "chatcmpl_retry",
		Model: "gpt-test",
		Choices: []dto.ChatCompletionsStreamResponseChoice{{
			Delta: dto.ChatCompletionsStreamResponseChoiceDelta{Content: ptr("hello")},
		}},
	}, info)
	require.NotEmpty(t, responses)
	assert.Equal(t, "message_start", responses[0].Type)
}

func ptr[T any](value T) *T {
	return &value
}

func TestRequestTimingIgnoresEmptyToolAndReasoningFields(t *testing.T) {
	start := time.Unix(1_800_000_000, 0)
	for _, fields := range []string{
		`"tool_calls":null,"function_call":null,"reasoning_content":null`,
		`"tool_calls":[],"function_call":{},"reasoning_content":""`,
		`"tool_calls":[{}],"function_call":{"name":"","arguments":""},"reasoning":""`,
		`"tool_calls":[{"function":{}},{"function":{"name":"","arguments":""}}]`,
		`"tool_calls":[{"function":{"arguments":"{}"}}],"function_call":{"arguments":"{}"}`,
	} {
		t.Run(fields, func(t *testing.T) {
			r := NewRequestTimingRecorder(start)
			r.ObserveChunkAt(`{"choices":[{"delta":{"content":"answer",`+fields+`}}]}`, start.Add(100*time.Millisecond))
			r.ObserveChunkAt(`{"choices":[{"delta":{"content":"continued",`+fields+`}}]}`, start.Add(200*time.Millisecond))
			r.ObserveChunkAt(`{"choices":[{"delta":{},"finish_reason":"stop"}]}`, start.Add(300*time.Millisecond))
			timing := r.Finalize(start.Add(400 * time.Millisecond))
			require.NotNil(t, timing)
			assert.Zero(t, timing.ThinkingMs)
			assert.Zero(t, timing.ToolGenerationMs)
			assert.Nil(t, timing.ToolCalls)
			assert.Equal(t, float64(200), timing.ContentMs)
		})
	}
}

func TestRequestTimingUsesExclusiveIntervalsAndFreezesAtCompletion(t *testing.T) {
	start := time.Unix(1_800_000_000, 0)
	r := NewRequestTimingRecorder(start)
	for _, event := range []struct {
		at   int
		data string
	}{
		{10, `{"choices":[{"delta":{"role":"assistant","content":"","tool_calls":null}}]}`},
		{100, `{"choices":[{"delta":{"reasoning_content":"private reasoning"}}]}`},
		{150, `{"choices":[{"delta":{"reasoning_content":"continued"}}]}`},
		{300, `{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"private_tool","arguments":""}}]}}]}`},
		{350, `{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"private arguments"}}]}}]}`},
		{400, `{"choices":[{"delta":{"content":"answer"}}]}`},
		{450, `{"choices":[{"delta":{"reasoning_content":"more reasoning"}}]}`},
		{500, `{"choices":[{"delta":{"content":"final answer"}}]}`},
		{600, `{"choices":[{"delta":{},"finish_reason":"stop"}]}`},
		{650, `{"choices":[],"usage":{"completion_tokens":100}}`},
	} {
		r.ObserveChunkAt(event.data, start.Add(time.Duration(event.at)*time.Millisecond))
	}
	require.Nil(t, r.Snapshot(), "unfinished responses must not be logged as complete timings")
	timing := r.Finalize(start.Add(700 * time.Millisecond))
	require.NotNil(t, timing)
	assert.Equal(t, 2, timing.Version)
	assert.Equal(t, float64(700), timing.TotalMs)
	require.NotNil(t, timing.FirstResponseMs)
	require.NotNil(t, timing.FirstContentMs)
	assert.Equal(t, float64(10), *timing.FirstResponseMs)
	assert.Equal(t, float64(400), *timing.FirstContentMs)
	assert.Equal(t, float64(250), timing.ThinkingMs)
	assert.Equal(t, float64(150), timing.ContentMs)
	assert.Equal(t, float64(100), timing.ToolGenerationMs)
	require.NotNil(t, timing.ToolCalls)
	assert.Equal(t, 1, *timing.ToolCalls)
	assert.Equal(t, []RequestTimingSegment{
		{Phase: "waiting", StartMs: 0, DurationMs: 100},
		{Phase: "thinking", StartMs: 100, DurationMs: 200},
		{Phase: "tool", StartMs: 300, DurationMs: 100},
		{Phase: "content", StartMs: 400, DurationMs: 50},
		{Phase: "thinking", StartMs: 450, DurationMs: 50},
		{Phase: "content", StartMs: 500, DurationMs: 100},
		{Phase: "other", StartMs: 600, DurationMs: 100},
	}, timing.Segments)
	assert.Equal(t, timing, r.Finalize(start.Add(time.Hour)))
	r.ObserveChunkAt(`{"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"name":"late"}}]}}]}`, start.Add(time.Hour))
	assert.Equal(t, timing, r.Snapshot())
	encoded, err := common.Marshal(timing)
	require.NoError(t, err)
	assert.NotContains(t, string(encoded), "private")
	assert.NotContains(t, string(encoded), "answer")
	timing.Segments[0].Phase = "modified"
	*timing.FirstContentMs = 9999
	assert.Equal(t, "waiting", r.Snapshot().Segments[0].Phase)
	assert.Equal(t, float64(400), *r.Snapshot().FirstContentMs)
}

func TestRequestTimingRecognizesExplicitProtocolEvents(t *testing.T) {
	start := time.Unix(1_800_000_000, 0)
	for _, test := range []struct {
		name                    string
		frames                  []string
		thinking, content, tool float64
		calls                   int
	}{
		{"claude tool generation", []string{
			`{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","name":"lookup","input":{}}}`,
			`{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{}"}}`,
			`{"type":"content_block_stop","index":0}`,
		}, 0, 0, 200, 1},
		{"claude reasoning to text", []string{
			`{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"plan"}}`,
			`{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"answer"}}`,
			`{"type":"message_stop"}`,
		}, 100, 100, 0, 0},
		{"responses function generation", []string{
			`{"type":"response.output_item.added","output_index":0,"item":{"type":"function_call","name":"lookup","arguments":""}}`,
			`{"type":"response.function_call_arguments.delta","output_index":0,"delta":"{}"}`,
			`{"type":"response.function_call_arguments.done","output_index":0,"arguments":"{}"}`,
			`{"type":"response.output_item.done","output_index":0,"item":{"type":"function_call","name":"lookup","arguments":"{}"}}`,
		}, 0, 0, 200, 1},
		{"responses function item done only", []string{
			`{"type":"response.output_item.done","output_index":0,"item":{"type":"function_call","name":"lookup","arguments":"{}"}}`,
		}, 0, 0, 0, 1},
		{"responses web search item done only", []string{
			`{"type":"response.output_item.done","output_index":0,"item":{"type":"web_search_call","name":""}}`,
		}, 0, 0, 0, 1},
		{"responses function arguments done only", []string{
			`{"type":"response.function_call_arguments.done","output_index":0,"arguments":"{}"}`,
		}, 0, 0, 0, 1},
		{"responses reasoning to text", []string{
			`{"type":"response.reasoning_summary_text.delta","delta":"plan"}`,
			`{"type":"response.output_text.delta","delta":"answer"}`,
			`{"type":"response.output_text.done","text":"answer"}`,
		}, 100, 100, 0, 0},
		{"responses item boundaries without deltas", []string{
			`{"type":"response.output_item.added","output_index":0,"item":{"type":"reasoning"}}`,
			`{"type":"response.output_item.done","output_index":0,"item":{"type":"reasoning"}}`,
			`{"type":"response.output_item.added","output_index":1,"item":{"type":"message"}}`,
			`{"type":"response.output_text.delta","output_index":1,"delta":"answer"}`,
			`{"type":"response.completed"}`,
		}, 200, 200, 0, 0},
		{"responses summary part boundaries", []string{
			`{"type":"response.reasoning_summary_part.added","output_index":0}`,
			`{"type":"response.reasoning_summary_part.done","output_index":0}`,
			`{"type":"response.output_text.delta","output_index":1,"delta":"answer"}`,
			`{"type":"response.completed"}`,
		}, 200, 100, 0, 0},
		{"gemini thought function and text", []string{
			`{"candidates":[{"content":{"parts":[{"thought":true,"text":"plan"}]}}]}`,
			`{"candidates":[{"content":{"parts":[{"functionCall":{"name":"lookup","args":{}}}]}}]}`,
			`{"candidates":[{"content":{"parts":[{"text":"answer"}]}}]}`,
			`{"candidates":[{"finishReason":"STOP"}]}`,
		}, 100, 100, 100, 1},
		{"mixed event is not double counted", []string{
			`{"choices":[{"delta":{"reasoning_content":"plan","content":"answer"}}]}`,
			`{"choices":[{"delta":{},"finish_reason":"stop"}]}`,
		}, 0, 0, 0, 0},
		{"quoted tool words are text", []string{
			`{"choices":[{"delta":{"content":"reasoning_content and tool_calls are words"}}]}`,
			`{"choices":[{"delta":{},"finish_reason":"stop"}]}`,
		}, 0, 100, 0, 0},
	} {
		t.Run(test.name, func(t *testing.T) {
			r := NewRequestTimingRecorder(start)
			for index, data := range test.frames {
				r.ObserveChunkAt(data, start.Add(time.Duration(index+1)*100*time.Millisecond))
			}
			timing := r.Finalize(start.Add(time.Second))
			require.NotNil(t, timing)
			assert.Equal(t, test.thinking, timing.ThinkingMs)
			assert.Equal(t, test.content, timing.ContentMs)
			assert.Equal(t, test.tool, timing.ToolGenerationMs)
			if test.calls == 0 {
				assert.Nil(t, timing.ToolCalls)
			} else {
				require.NotNil(t, timing.ToolCalls)
				assert.Equal(t, test.calls, *timing.ToolCalls)
			}
			var end, sum float64
			for _, segment := range timing.Segments {
				assert.GreaterOrEqual(t, segment.StartMs, end)
				assert.Greater(t, segment.DurationMs, float64(0))
				end = segment.StartMs + segment.DurationMs
				sum += segment.DurationMs
			}
			assert.InDelta(t, timing.TotalMs, sum, 0.001)
		})
	}
}

func TestRequestTimingOmitsUnobservableAndUnsupportedOutput(t *testing.T) {
	start := time.Unix(1_800_000_000, 0)
	for _, data := range []string{
		`{"choices":[{"delta":{"role":"assistant","content":"","reasoning_content":"","tool_calls":[]}}]}`,
		`{"choices":[],"usage":{"reasoning_tokens":100}}`,
		`{"tools":[{"type":"function","function":{"name":"lookup"}}]}`,
		`{"output":[{"type":"function_call","name":"lookup","arguments":"{}"}]}`,
		`{"type":"response.completed","response":{"output":[{"type":"function_call","name":"lookup"}]}}`,
		`{"unknown":{"tool_calls":[{"function":{"name":"lookup"}}]}}`,
		`{"choices":[{"index":1,"delta":{"content":"parallel output"}}]}`,
		`{"candidates":[{"index":0,"content":{"parts":[{"text":"a"}]}},{"index":1,"content":{"parts":[{"text":"b"}]}}]}`,
		`{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","name":""}}`,
		`{"type":"response.function_call_arguments.delta","delta":""}`,
		`{"type":"response.web_search_call.in_progress","item_id":"not an external function"}`,
		`not-json`, `null`, `[DONE]`,
	} {
		t.Run(data, func(t *testing.T) {
			r := NewRequestTimingRecorder(start)
			r.ObserveChunkAt(data, start.Add(time.Millisecond))
			assert.Nil(t, r.Finalize(start.Add(time.Second)))
		})
	}
}

func TestRequestTimingBoundsHistoryAndDoesNotLeakAcrossRetries(t *testing.T) {
	start := time.Unix(1_800_000_000, 0)
	r := NewRequestTimingRecorder(start)
	for i := range maxTimingSegments + 3 {
		data := `{"choices":[{"delta":{"content":"answer"}}]}`
		if i%2 == 0 {
			data = `{"choices":[{"delta":{"reasoning_content":"plan"}}]}`
		}
		r.ObserveChunkAt(data, start.Add(time.Duration(i+1)*time.Millisecond))
	}
	timing := r.Finalize(start.Add(time.Second))
	require.NotNil(t, timing)
	assert.LessOrEqual(t, len(timing.Segments), maxTimingSegments)
	assert.Equal(t, "other", timing.Segments[len(timing.Segments)-1].Phase)

	info := &RelayInfo{StartTime: start, IsStream: true, Timing: r}
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/v1/chat/completions", nil)
	info.InitChannelMeta(c)
	require.Nil(t, info.Timing)
	info.BeginStreamTiming()
	info.Timing.ObserveChunkAt(`{"choices":[{"delta":{"content":"retry answer","tool_calls":null}}]}`, start.Add(300*time.Millisecond))
	result := info.Timing.Finalize(start.Add(500 * time.Millisecond))
	require.NotNil(t, result)
	assert.Zero(t, result.ThinkingMs)
	assert.Nil(t, result.ToolCalls)
	assert.Equal(t, RequestTimingSegment{Phase: "waiting", StartMs: 0, DurationMs: 300}, result.Segments[0])
	assert.Equal(t, float64(500), result.TotalMs)
}

func TestRequestTimingZeroDurationToolKeepsOnlyObservedCallCount(t *testing.T) {
	start := time.Unix(1_800_000_000, 0)
	r := NewRequestTimingRecorder(start)
	at := start.Add(100 * time.Microsecond)
	r.ObserveChunkAt(`{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"lookup"}}]}}]}`, at)
	r.ObserveChunkAt(`[DONE]`, at)
	timing := r.Finalize(at)
	require.NotNil(t, timing)
	require.NotNil(t, timing.ToolCalls)
	assert.Equal(t, 1, *timing.ToolCalls)
	assert.Zero(t, timing.ToolGenerationMs)
	assert.Equal(t, float64(0.1), timing.TotalMs)
	assert.Equal(t, []RequestTimingSegment{{Phase: "waiting", StartMs: 0, DurationMs: 0.1}}, timing.Segments)
}

func TestRequestTimingEmptyClaudeToolBlockDoesNotAuthorizeArgumentFragments(t *testing.T) {
	start := time.Unix(1_800_000_000, 0)
	r := NewRequestTimingRecorder(start)
	r.ObserveChunkAt(`{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","name":""}}`, start.Add(time.Millisecond))
	r.ObserveChunkAt(`{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{}"}}`, start.Add(2*time.Millisecond))
	assert.Nil(t, r.Finalize(start.Add(3*time.Millisecond)))
}
