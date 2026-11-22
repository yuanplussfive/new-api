package common

import (
	"fmt"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/relaykit/dto"
)

const (
	requestActivityVersion = 1
	maxActivityTools       = 64
	maxActivityOutputs     = 16
	maxActivityToolName    = 128
)

// RequestActivity records what a model actually produced, independent of the
// transport. Timing remains stream-only; activity is available for both
// streamed and buffered responses.
type RequestActivity struct {
	Version   int                `json:"version"`
	Reasoning *ActivityReasoning `json:"reasoning,omitempty"`
	Tools     []ActivityTool     `json:"tools,omitempty"`
	Outputs   []string           `json:"outputs,omitempty"`

	mu         sync.Mutex
	toolSeen   map[string]struct{}
	outputSeen map[string]struct{}
}

type ActivityReasoning struct {
	Used   bool `json:"used"`
	Tokens int  `json:"tokens,omitempty"`
}

type ActivityTool struct {
	Type  string `json:"type"`
	Name  string `json:"name,omitempty"`
	Count int    `json:"count"`
}

func NewRequestActivity() *RequestActivity {
	return &RequestActivity{
		Version:    requestActivityVersion,
		toolSeen:   make(map[string]struct{}),
		outputSeen: make(map[string]struct{}),
	}
}

func (a *RequestActivity) UseReasoning() {
	if a == nil {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.Reasoning == nil {
		a.Reasoning = &ActivityReasoning{}
	}
	a.Reasoning.Used = true
}

func (a *RequestActivity) SetReasoningTokens(tokens int) {
	if a == nil || tokens <= 0 {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.Reasoning == nil {
		a.Reasoning = &ActivityReasoning{}
	}
	a.Reasoning.Used = true
	if tokens > a.Reasoning.Tokens {
		a.Reasoning.Tokens = tokens
	}
}

func (a *RequestActivity) ObserveOutput(outputType string) {
	if a == nil {
		return
	}
	outputType = strings.TrimSpace(outputType)
	if outputType == "" {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if _, exists := a.outputSeen[outputType]; exists {
		return
	}
	if len(a.Outputs) >= maxActivityOutputs {
		return
	}
	a.outputSeen[outputType] = struct{}{}
	a.Outputs = append(a.Outputs, outputType)
}

// ObserveTool counts one generated tool call. key deduplicates repeated
// observations of the same upstream item; when empty, every call is counted.
func (a *RequestActivity) ObserveTool(toolType, name, key string) {
	if a == nil {
		return
	}
	toolType = strings.TrimSpace(toolType)
	if toolType == "" {
		return
	}
	name = strings.TrimSpace(name)
	if len(name) > maxActivityToolName {
		name = name[:maxActivityToolName]
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if key != "" {
		if _, exists := a.toolSeen[key]; exists {
			return
		}
		if len(a.Tools) >= maxActivityTools {
			return
		}
		a.toolSeen[key] = struct{}{}
	} else if len(a.Tools) >= maxActivityTools {
		return
	}
	a.Tools = append(a.Tools, ActivityTool{Type: toolType, Name: name, Count: 1})
}

func (a *RequestActivity) HasData() bool {
	if a == nil {
		return false
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	return (a.Reasoning != nil && a.Reasoning.Used) ||
		len(a.Tools) > 0 || len(a.Outputs) > 0
}

func (a *RequestActivity) Snapshot() *RequestActivity {
	if a == nil {
		return nil
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if !(a.Reasoning != nil && a.Reasoning.Used) && len(a.Tools) == 0 && len(a.Outputs) == 0 {
		return nil
	}
	snapshot := &RequestActivity{
		Version: requestActivityVersion,
		Tools:   append([]ActivityTool(nil), a.Tools...),
		Outputs: append([]string(nil), a.Outputs...),
	}
	if a.Reasoning != nil && a.Reasoning.Used {
		reasoning := *a.Reasoning
		snapshot.Reasoning = &reasoning
	}
	return snapshot
}

// ActivityToolKey returns a stable dedupe key for a protocol item. Callers
// should prefer an upstream item ID and fall back to the output index.
func ActivityToolKey(protocol, itemType, id string, index int) string {
	if strings.TrimSpace(id) != "" {
		return protocol + ":" + itemType + ":" + strings.TrimSpace(id)
	}
	return fmt.Sprintf("%s:%s:index:%d", protocol, itemType, index)
}

func (info *RelayInfo) EnsureActivity() *RequestActivity {
	if info == nil {
		return nil
	}
	if info.Activity == nil {
		info.Activity = NewRequestActivity()
	}
	return info.Activity
}

func (info *RelayInfo) ObserveActivityReasoning() {
	info.EnsureActivity().UseReasoning()
}

func (info *RelayInfo) ObserveActivityReasoningTokens(tokens int) {
	info.EnsureActivity().SetReasoningTokens(tokens)
}

func (info *RelayInfo) ObserveActivityOutput(outputType string) {
	info.EnsureActivity().ObserveOutput(outputType)
}

func (info *RelayInfo) ObserveActivityTool(toolType, name, key string) {
	info.EnsureActivity().ObserveTool(toolType, name, key)
}

func (info *RelayInfo) ActivitySnapshot() *RequestActivity {
	if info == nil {
		return nil
	}
	return info.Activity.Snapshot()
}

func (info *RelayInfo) ObserveResponsesOutput(output *dto.ResponsesOutput, index int) {
	if info == nil || output == nil {
		return
	}
	outputType := strings.TrimSpace(output.Type)
	if outputType == "" {
		return
	}
	info.ObserveActivityOutput(outputType)
	switch outputType {
	case "reasoning":
		info.ObserveActivityReasoning()
	case dto.BuildInCallWebSearchCall, dto.BuildInCallFileSearchCall, dto.BuildInCallFunctionCall,
		dto.BuildInCallToolUse, "custom_tool_call", "mcp_call", "computer_call", "code_interpreter_call":
		itemID := output.ID
		if strings.TrimSpace(itemID) == "" {
			itemID = output.CallId
		}
		info.ObserveActivityTool(outputType, output.Name, ActivityToolKey("responses", outputType, itemID, index))
	}
}

func (info *RelayInfo) ObserveResponsesOutputs(outputs []dto.ResponsesOutput) {
	for index := range outputs {
		info.ObserveResponsesOutput(&outputs[index], index)
	}
}
