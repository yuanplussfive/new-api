/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
package middleware

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"

	"github.com/gin-gonic/gin"
)

// PlaygroundGeminiModel resolves the model and group for Gemini playground
// requests, whose model lives in the URL path instead of the JSON body. It must
// run before Distribute so channel selection sees the same request shape as the
// public /v1beta/models route.
func PlaygroundGeminiModel() gin.HandlerFunc {
	return func(c *gin.Context) {
		const prefix = "/pg/v1beta/models/"
		path := c.Request.URL.Path
		if !strings.HasPrefix(path, prefix) {
			c.Next()
			return
		}

		modelName := strings.TrimPrefix(path, prefix)
		if index := strings.Index(modelName, ":"); index >= 0 {
			modelName = modelName[:index]
		}
		if modelName == "" {
			c.Next()
			return
		}

		var body struct {
			Group string `json:"group"`
		}
		_ = common.UnmarshalBodyReusable(c, &body)
		c.Set(contextKeyTaskPluginEndpointModel, ModelRequest{
			Model: modelName,
			Group: body.Group,
		})
		c.Set("relay_mode", relayconstant.RelayModeGemini)
		c.Next()
	}
}
