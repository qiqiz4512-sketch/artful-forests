# OAuth2 API 参考

---
title: OAuth2 API 参考
description: OAuth2 授权码流程相关的 API 接口详细文档
---

本文档描述 OAuth2 授权码流程相关的 API 接口。

**Base URL**: `https://api.mindverse.com/gate/lab`

---

## 授权入口（前端重定向）

对于 Web 应用，推荐使用标准的 OAuth2 重定向方式发起授权。

```
GET https://go.second.me/oauth/
```

### 说明

将用户重定向到此 URL 进行登录和授权。用户完成授权后，会被重定向回你的 `redirect_uri`，URL 中包含授权码。

### 请求参数

通过 URL Query 参数传递：

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| client_id | string | 是 | 应用的 Client ID |
| redirect_uri | string | 是 | 授权后的回调 URL，必须与应用配置一致 |
| response_type | string | 是 | 固定值 `code` |
| state | string | 是 | CSRF 保护参数，建议使用随机字符串 |

### URL 示例

```
https://go.second.me/oauth/?client_id=your_client_id&redirect_uri=https://your-app.com/callback&response_type=code&state=abc123
```

### 回调响应

授权成功后，用户被重定向到：

```
https://your-app.com/callback?code=lba_ac_xxxxx...&state=abc123
```

| 参数 | 类型 | 说明 |
|------|------|------|
| code | string | 授权码，5 分钟内有效 |
| state | string | 原样返回的 state 参数 |

授权失败时：

```
https://your-app.com/callback?error=access_denied&error_description=User%20denied%20access&state=abc123
```

---

## 用户授权（服务端接口）

服务端直接发起 OAuth2 授权请求，获取授权码。适用于已有用户登录态的场景。

```
POST /api/oauth/authorize/external
```

### 认证

需要用户登录状态（Bearer Token）。

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| clientId | string | 是 | 应用的 Client ID |
| redirectUri | string | 是 | 授权后的回调 URL，必须与应用配置一致 |
| scope | string[] | 是 | 请求的权限列表 |
| state | string | 否 | CSRF 保护参数，会原样返回 |

### 请求示例

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/oauth/authorize/external" \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "your_client_id",
    "redirectUri": "https://your-app.com/callback",
    "scope": ["user.info", "chat"],
    "state": "abc123"
  }'
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "code": "lba_ac_xxxxx...",
    "state": "abc123"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | string | 授权码，5 分钟内有效 |
| state | string | 原样返回的 state 参数 |

### 错误码

| 错误码 | 说明 |
|-------|------|
| oauth2.application.not_found | 应用不存在 |
| oauth2.redirect_uri.mismatch | Redirect URI 不匹配 |
| oauth2.scope.invalid | 无效的权限 |

---

## 授权码换 Token

用授权码交换 Access Token 和 Refresh Token。

```
POST /api/oauth/token/code
```

### 认证

无需认证（公开接口）。

### 请求格式

`Content-Type: application/x-www-form-urlencoded`

> **注意**: 必须使用 `application/x-www-form-urlencoded` 格式发送请求体，不能使用 JSON 格式（`application/json`）。使用错误的格式会导致 `Field required` 验证错误。

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| grant_type | string | 是 | 固定值 `authorization_code` |
| code | string | 是 | 上一步获取的授权码 |
| redirect_uri | string | 是 | 必须与授权请求中的值一致 |
| client_id | string | 是 | 应用的 Client ID |
| client_secret | string | 是 | 应用的 Client Secret |

### 请求示例

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/oauth/token/code" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=lba_ac_xxxxx..." \
  -d "redirect_uri=https://your-app.com/callback" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret"
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "accessToken": "lba_at_xxxxx...",
    "refreshToken": "lba_rt_xxxxx...",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "scope": ["user.info", "chat"]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| accessToken | string | 访问令牌，2 小时有效 |
| refreshToken | string | 刷新令牌，30 天有效 |
| tokenType | string | 令牌类型，固定为 `Bearer` |
| expiresIn | number | Access Token 有效期（秒） |
| scope | string[] | 授予的权限列表 |

### 错误码

| 错误码 | 说明 |
|-------|------|
| oauth2.grant_type.invalid | 无效的 grant_type |
| oauth2.code.invalid | 授权码无效 |
| oauth2.code.expired | 授权码已过期 |
| oauth2.code.used | 授权码已被使用 |
| oauth2.redirect_uri.mismatch | Redirect URI 不匹配 |
| oauth2.client.secret_mismatch | Client Secret 不匹配 |

---

## 刷新 Token

使用 Refresh Token 获取新的 Access Token。

```
POST /api/oauth/token/refresh
```

### 认证

无需认证（公开接口）。

### 请求格式

`Content-Type: application/x-www-form-urlencoded`

> **注意**: 必须使用 `application/x-www-form-urlencoded` 格式发送请求体，不能使用 JSON 格式（`application/json`）。使用错误的格式会导致 `Field required` 验证错误。

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| grant_type | string | 是 | 固定值 `refresh_token` |
| refresh_token | string | 是 | 之前获取的 Refresh Token |
| client_id | string | 是 | 应用的 Client ID |
| client_secret | string | 是 | 应用的 Client Secret |

### 请求示例

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/oauth/token/refresh" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=lba_rt_xxxxx..." \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret"
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "accessToken": "lba_at_new_xxxxx...",
    "refreshToken": "lba_rt_xxxxx...",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "scope": ["user.info", "chat"]
  }
}
```

> **注意**: 刷新时不会轮换 Refresh Token，返回的 `refreshToken` 与请求中传入的相同。Refresh Token 在 30 天有效期内可重复使用，过期后需重新授权。

### 错误码

| 错误码 | 说明 |
|-------|------|
| oauth2.grant_type.invalid | 无效的 grant_type |
| oauth2.refresh_token.invalid | Refresh Token 无效 |
| oauth2.refresh_token.expired | Refresh Token 已过期 |
| oauth2.refresh_token.revoked | Refresh Token 已被撤销 |
| oauth2.client.secret_mismatch | Client Secret 不匹配 |

---

## 通用错误响应格式

所有 API 错误都遵循统一的响应格式：

```json
{
  "code": 400,
  "message": "错误描述",
  "subCode": "oauth2.xxx.xxx"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 业务状态码，0 表示成功，非 0 表示错误 |
| message | string | 人类可读的错误描述 |
| subCode | string | 机器可读的错误码 |
