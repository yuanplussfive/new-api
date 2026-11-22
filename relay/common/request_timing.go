package common

import (
	"encoding/json"
	"strconv"
	"strings"
	"sync"
	"time"

	appcommon "github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
)

const maxTimingSegments = 256

// RequestTiming describes observed upstream stream intervals, not provider CPU
// time or execution of tools on the client. Milestones are not additive phases.
type RequestTiming struct {
	Version          int                    `json:"version"`
	TotalMs          float64                `json:"total_ms"`
	FirstResponseMs  *float64               `json:"first_response_ms,omitempty"`
	FirstContentMs   *float64               `json:"first_content_ms,omitempty"`
	ThinkingMs       float64                `json:"thinking_ms,omitempty"`
	ContentMs        float64                `json:"content_ms,omitempty"`
	ToolGenerationMs float64                `json:"tool_generation_ms,omitempty"`
	ToolCalls        *int                   `json:"tool_calls,omitempty"`
	Segments         []RequestTimingSegment `json:"segments"`
}

type RequestTimingSegment struct {
	Phase      string  `json:"phase"`
	StartMs    float64 `json:"start_ms"`
	DurationMs float64 `json:"duration_ms"`
}

// The recorder retains only timestamps, phase kinds and numeric protocol
// indexes. Response text, arguments, tool names and call IDs are never retained.
type RequestTimingRecorder struct {
	mu             sync.Mutex
	start          time.Time
	last           time.Time
	phaseStart     time.Time
	phase          string
	firstResponse  *float64
	firstContent   *float64
	semanticSeen   bool
	unsupported    bool
	finished       bool
	segmentsCapped bool
	callsCapped    bool
	segments       []RequestTimingSegment
	tools          map[string]struct{}
	claudeBlocks   map[int]string
	result         *RequestTiming
}

func NewRequestTimingRecorder(start time.Time) *RequestTimingRecorder {
	return &RequestTimingRecorder{
		start: start, last: start, phaseStart: start, phase: "waiting",
		tools: make(map[string]struct{}), claudeBlocks: make(map[int]string),
	}
}

func timingMilliseconds(start, end time.Time) float64 {
	return float64(end.Sub(start)) / float64(time.Millisecond)
}

func (r *RequestTimingRecorder) ObserveChunk(data string) {
	r.ObserveChunkAt(data, time.Now())
}

// ObserveChunkAt also provides a deterministic clock boundary for regression
// tests. It never modifies the payload forwarded by the scanner.
func (r *RequestTimingRecorder) ObserveChunkAt(data string, at time.Time) {
	if r == nil || data == "" {
		return
	}
	var frame timingFrame
	validJSON := data != "[DONE]" && appcommon.UnmarshalJsonStr(data, &frame) == nil
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.finished {
		return
	}
	at = r.monotonicTime(at)
	if data == "[DONE]" {
		r.transition("other", at)
		return
	}
	if r.firstResponse == nil {
		value := timingMilliseconds(r.start, at)
		r.firstResponse = &value
	}
	if !validJSON {
		return
	}
	observation := r.classify(frame)
	if observation.unsupported {
		r.unsupported = true
		return
	}
	if observation.flags != 0 {
		r.semanticSeen = true
		if observation.flags&timingContent != 0 && r.firstContent == nil {
			value := timingMilliseconds(r.start, at)
			r.firstContent = &value
		}
		phase := "other"
		switch observation.flags {
		case timingThinking:
			phase = "thinking"
		case timingContent:
			phase = "content"
		case timingTool:
			phase = "tool"
		}
		r.transition(phase, at)
	}
	if observation.terminal || (observation.endPhase != "" && observation.endPhase == r.phase) {
		r.transition("other", at)
	}
}

func (r *RequestTimingRecorder) monotonicTime(at time.Time) time.Time {
	if at.Before(r.last) {
		return r.last
	}
	r.last = at
	return at
}

func (r *RequestTimingRecorder) transition(phase string, at time.Time) {
	if r.segmentsCapped {
		phase = "other"
	}
	if phase == r.phase {
		return
	}
	r.appendInterval(at)
	if len(r.segments) >= maxTimingSegments-1 {
		r.segmentsCapped = true
		phase = "other"
	}
	r.phase = phase
	r.phaseStart = at
}

func (r *RequestTimingRecorder) appendInterval(end time.Time) {
	if !end.After(r.phaseStart) {
		return
	}
	r.segments = append(r.segments, RequestTimingSegment{
		Phase: r.phase, StartMs: timingMilliseconds(r.start, r.phaseStart),
		DurationMs: timingMilliseconds(r.phaseStart, end),
	})
}

// Finalize freezes the response at its end/cancellation boundary. Later log
// generation or settlement calls cannot extend or recalculate any interval.
func (r *RequestTimingRecorder) Finalize(end time.Time) *RequestTiming {
	if r == nil {
		return nil
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.finished {
		r.finished = true
		end = r.monotonicTime(end)
		if r.semanticSeen && !r.unsupported {
			r.appendInterval(end)
			r.result = &RequestTiming{
				Version: 2, TotalMs: timingMilliseconds(r.start, end),
				FirstResponseMs: r.firstResponse, FirstContentMs: r.firstContent,
				Segments: r.segments,
			}
			if !r.callsCapped && len(r.tools) > 0 {
				count := len(r.tools)
				r.result.ToolCalls = &count
			}
			for _, segment := range r.segments {
				switch segment.Phase {
				case "thinking":
					r.result.ThinkingMs += segment.DurationMs
				case "content":
					r.result.ContentMs += segment.DurationMs
				case "tool":
					r.result.ToolGenerationMs += segment.DurationMs
				}
			}
		}
	}
	return cloneRequestTiming(r.result)
}

func (r *RequestTimingRecorder) Snapshot() *RequestTiming {
	if r == nil {
		return nil
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	return cloneRequestTiming(r.result)
}

func cloneRequestTiming(source *RequestTiming) *RequestTiming {
	if source == nil {
		return nil
	}
	result := *source
	result.Segments = append([]RequestTimingSegment{}, source.Segments...)
	if source.FirstResponseMs != nil {
		value := *source.FirstResponseMs
		result.FirstResponseMs = &value
	}
	if source.FirstContentMs != nil {
		value := *source.FirstContentMs
		result.FirstContentMs = &value
	}
	if source.ToolCalls != nil {
		value := *source.ToolCalls
		result.ToolCalls = &value
	}
	return &result
}

const (
	timingThinking = 1 << iota
	timingContent
	timingTool
)

type timingObservation struct {
	flags       int
	terminal    bool
	endPhase    string
	unsupported bool
}

type timingFunction struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type timingFrame struct {
	Type  string          `json:"type"`
	Delta json.RawMessage `json:"delta"`
	Index int             `json:"index"`
	Item  struct {
		Type      string `json:"type"`
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"item"`
	OutputIndex  int `json:"output_index"`
	ContentBlock struct {
		Type     string `json:"type"`
		Text     string `json:"text"`
		Thinking string `json:"thinking"`
		Name     string `json:"name"`
	} `json:"content_block"`
	Choices []struct {
		Index int `json:"index"`
		Delta struct {
			Content          json.RawMessage `json:"content"`
			ReasoningContent string          `json:"reasoning_content"`
			Reasoning        string          `json:"reasoning"`
			ToolCalls        []struct {
				Index    *int            `json:"index"`
				ID       string          `json:"id"`
				Function *timingFunction `json:"function"`
			} `json:"tool_calls"`
			FunctionCall *timingFunction `json:"function_call"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Candidates []struct {
		Index   int `json:"index"`
		Content struct {
			Parts []struct {
				Text         string          `json:"text"`
				Thought      bool            `json:"thought"`
				FunctionCall *timingFunction `json:"functionCall"`
			} `json:"parts"`
		} `json:"content"`
		FinishReason string `json:"finishReason"`
	} `json:"candidates"`
}

func (r *RequestTimingRecorder) noteTool(protocol string, index int) {
	if index < 0 {
		r.callsCapped = true
		return
	}
	key := protocol + ":" + strconv.Itoa(index)
	if _, exists := r.tools[key]; exists {
		return
	}
	if len(r.tools) >= maxTimingSegments {
		r.callsCapped = true
		return
	}
	r.tools[key] = struct{}{}
}

// Argument fragments only continue an already identified chat call. A default
// arguments object without a call ID/name is not evidence that a tool was used.
func (r *RequestTimingRecorder) observeFunctionCall(protocol string, index int, function *timingFunction, callID string) bool {
	_, known := r.tools[protocol+":"+strconv.Itoa(index)]
	identified := strings.TrimSpace(callID) != "" || (function != nil && strings.TrimSpace(function.Name) != "")
	continuation := known && function != nil && strings.TrimSpace(function.Arguments) != ""
	if !identified && !continuation {
		return false
	}
	r.noteTool(protocol, index)
	return true
}

// Only explicit upstream protocol paths are inspected. Full response snapshots,
// usage, request tool definitions and mentions of JSON field names are ignored.
func (r *RequestTimingRecorder) classify(frame timingFrame) timingObservation {
	if frame.Type != "" {
		return r.classifyTypedEvent(frame)
	}
	var observed timingObservation
	if len(frame.Choices) > 1 || len(frame.Candidates) > 1 {
		observed.unsupported = true // Parallel choices do not have one phase clock.
		return observed
	}
	for _, choice := range frame.Choices {
		if choice.Index != 0 {
			observed.unsupported = true
			return observed
		}
		if strings.TrimSpace(choice.Delta.ReasoningContent) != "" || strings.TrimSpace(choice.Delta.Reasoning) != "" {
			observed.flags |= timingThinking
		}
		var text string
		if appcommon.Unmarshal(choice.Delta.Content, &text) == nil && strings.TrimSpace(text) != "" {
			observed.flags |= timingContent
		}
		for position, call := range choice.Delta.ToolCalls {
			index := position
			if call.Index != nil {
				index = *call.Index
			}
			if r.observeFunctionCall("chat", index, call.Function, call.ID) {
				observed.flags |= timingTool
			}
		}
		if r.observeFunctionCall("chat-legacy", 0, choice.Delta.FunctionCall, "") {
			observed.flags |= timingTool
		}
		observed.terminal = choice.FinishReason != ""
	}
	for _, candidate := range frame.Candidates {
		if candidate.Index != 0 {
			observed.unsupported = true
			return observed
		}
		for index, part := range candidate.Content.Parts {
			if strings.TrimSpace(part.Text) != "" {
				if part.Thought {
					observed.flags |= timingThinking
				} else {
					observed.flags |= timingContent
				}
			}
			if part.FunctionCall != nil && strings.TrimSpace(part.FunctionCall.Name) != "" {
				r.noteTool("gemini", index)
				observed.flags |= timingTool
			}
		}
		observed.terminal = candidate.FinishReason != ""
	}
	return observed
}

func (r *RequestTimingRecorder) classifyTypedEvent(frame timingFrame) timingObservation {
	var observed timingObservation
	switch frame.Type {
	case "content_block_start":
		phase := ""
		switch frame.ContentBlock.Type {
		case "thinking":
			phase = "thinking"
			if strings.TrimSpace(frame.ContentBlock.Thinking) != "" {
				observed.flags = timingThinking
			}
		case "text":
			phase = "content"
			if strings.TrimSpace(frame.ContentBlock.Text) != "" {
				observed.flags = timingContent
			}
		case "tool_use":
			if strings.TrimSpace(frame.ContentBlock.Name) != "" {
				phase = "tool"
				r.noteTool("claude", frame.Index)
				observed.flags = timingTool
			}
		}
		if frame.Index >= 0 && len(r.claudeBlocks) < maxTimingSegments {
			r.claudeBlocks[frame.Index] = phase
		}
	case "content_block_delta":
		var delta struct {
			Type        string `json:"type"`
			Text        string `json:"text"`
			Thinking    string `json:"thinking"`
			PartialJSON string `json:"partial_json"`
		}
		if appcommon.Unmarshal(frame.Delta, &delta) != nil {
			return observed
		}
		switch delta.Type {
		case "thinking_delta":
			if strings.TrimSpace(delta.Thinking) != "" {
				observed.flags = timingThinking
			}
		case "text_delta":
			if strings.TrimSpace(delta.Text) != "" {
				observed.flags = timingContent
			}
		case "input_json_delta":
			if r.claudeBlocks[frame.Index] == "tool" && strings.TrimSpace(delta.PartialJSON) != "" {
				r.noteTool("claude", frame.Index)
				observed.flags = timingTool
			}
		}
	case "content_block_stop":
		observed.endPhase = r.claudeBlocks[frame.Index]
		delete(r.claudeBlocks, frame.Index)
	case "message_delta":
		var delta struct {
			StopReason string `json:"stop_reason"`
		}
		if appcommon.Unmarshal(frame.Delta, &delta) == nil {
			observed.terminal = delta.StopReason != ""
		}
	case "message_stop", "response.completed", "response.failed", "response.incomplete":
		observed.terminal = true
	case "response.reasoning_summary_part.added":
		observed.flags = timingThinking
	case "response.output_text.delta", "response.reasoning_summary_text.delta", "response.reasoning_text.delta", "response.function_call_arguments.delta":
		var delta string
		if appcommon.Unmarshal(frame.Delta, &delta) != nil || strings.TrimSpace(delta) == "" {
			return observed
		}
		switch frame.Type {
		case "response.output_text.delta":
			observed.flags = timingContent
		case "response.function_call_arguments.delta":
			r.noteTool("responses", frame.OutputIndex)
			observed.flags = timingTool
		default:
			observed.flags = timingThinking
		}
	case "response.output_item.added":
		switch frame.Item.Type {
		case "reasoning":
			// Some Responses-compatible upstreams (including Codex relays)
			// stream only output-item boundaries, not reasoning deltas. The
			// item type is still an explicit signal that reasoning has begun.
			observed.flags = timingThinking
		case "message":
			observed.flags = timingContent
		case "function_call":
			r.noteTool("responses", frame.OutputIndex)
			observed.flags = timingTool
		}
	case "response.function_call_arguments.done":
		r.noteTool("responses", frame.OutputIndex)
		observed.flags = timingTool
		observed.endPhase = "tool"
	case "response.output_text.done":
		observed.endPhase = "content"
	case "response.reasoning_summary_text.done", "response.reasoning_text.done", "response.reasoning_summary_part.done":
		// Keep the thinking phase open across reasoning part boundaries; the
		// next content or tool event marks the real transition.
	case "response.output_item.done":
		switch frame.Item.Type {
		case "function_call":
			r.noteTool("responses", frame.OutputIndex)
			observed.flags = timingTool
			observed.endPhase = "tool"
		case dto.BuildInCallWebSearchCall, dto.BuildInCallFileSearchCall:
			r.noteTool("responses", frame.OutputIndex)
			observed.flags = timingTool
			observed.endPhase = "tool"
		case "message":
			observed.endPhase = "content"
		}
		// A reasoning item's boundary is not the end of the model's thinking:
		// item-only streams leave gaps between reasoning items, so keep the
		// thinking phase open until content or a tool item actually starts.
	}
	return observed
}
