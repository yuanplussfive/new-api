package service

import (
	"bytes"
	"context"
	"crypto/md5" // Required by the Afdian Open API signing protocol, not used for password storage.
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
)

var afdianHTTPClient = &http.Client{
	Timeout:       15 * time.Second,
	CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse },
}

// QueryAfdianOrder uses a fixed TLS origin so credentials never go to a
// configurable or callback-supplied URL. Provider messages/bodies may contain
// echoed credentials and must not be returned or logged.
func QueryAfdianOrder(ctx context.Context, client *http.Client, config setting.AfdianConfig, outTradeNo string) (*model.AfdianPayment, error) {
	if len(outTradeNo) == 0 || len(outTradeNo) > 64 {
		return nil, errors.New("invalid Afdian order number")
	}
	params, err := common.Marshal(map[string]any{"out_trade_no": outTradeNo, "page": 1, "per_page": 100})
	if err != nil {
		return nil, err
	}
	ts := time.Now().Unix()
	digest := md5.Sum([]byte(config.APIToken + "params" + string(params) + "ts" + strconv.FormatInt(ts, 10) + "user_id" + config.UserID))
	body, err := common.Marshal(map[string]any{"user_id": config.UserID, "params": string(params), "ts": ts, "sign": hex.EncodeToString(digest[:])})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://afdian.com/api/open/query-order", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	// Afdian's edge rejects Go's default client before Open API verification.
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; NewAPI-Afdian/1.0; +https://github.com/QuantumNous/new-api)")
	if client == nil {
		client = afdianHTTPClient
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.New("Afdian order query unavailable")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Afdian order query HTTP %d", resp.StatusCode)
	}
	response, err := io.ReadAll(io.LimitReader(resp.Body, (1<<20)+1))
	if err != nil || len(response) > 1<<20 {
		return nil, errors.New("invalid Afdian order query response")
	}
	var result struct {
		EC   int `json:"ec"`
		Data struct {
			List []model.AfdianPayment `json:"list"`
		} `json:"data"`
	}
	if err := common.Unmarshal(response, &result); err != nil || result.EC != 200 {
		return nil, errors.New("Afdian order query rejected")
	}
	for _, order := range result.Data.List {
		if order.OutTradeNo == outTradeNo {
			return &order, nil
		}
	}
	return nil, errors.New("Afdian paid order not found")
}
