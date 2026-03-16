# API 参考

---
title: API 参考
description: SecondMe API 提供 OAuth2 和 SecondMe 两组接口
---

SecondMe API 提供以下接口分组：

## OAuth2 接口

标准 OAuth2 授权码流程相关接口。

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/oauth/authorize/external` | POST | 用户授权，获取授权码 |
| `/api/oauth/token/code` | POST | 授权码换 Token |
| `/api/oauth/token/refresh` | POST | 刷新 Access Token |

[查看 OAuth2 API 详情](/zh/docs/api-reference/oauth)

## SecondMe 接口

用户信息访问和 AI 聊天功能。

| 端点 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/secondme/user/info` | GET | user.info | 获取用户信息 |
| `/api/secondme/user/shades` | GET | user.info.shades | 获取用户兴趣标签 |
| `/api/secondme/user/softmemory` | GET | user.info.softmemory | 获取用户软记忆 |
| `/api/secondme/note/add` | POST | note.add | 添加笔记（暂不可用） |
| `/api/secondme/chat/stream` | POST | chat | 流式聊天 (SSE) |
| `/api/secondme/chat/session/list` | GET | chat | 获取会话列表 |
| `/api/secondme/chat/session/messages` | GET | chat | 获取会话消息 |
| `/api/secondme/agent_memory/ingest` | POST | — | 上报 Agent Memory 事件 |

[查看 SecondMe API 详情](/zh/docs/api-reference/secondme)

## Base URL

所有 API 请求的基础 URL：

```
https://api.mindverse.com/gate/lab
```

## 认证

所有 SecondMe 接口需要在请求头中携带认证信息：

```http
Authorization: Bearer <token>
```

其中 `<token>` 为 OAuth2 Access Token: `lba_at_xxxxx...`

## 响应格式

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "错误描述",
  "subCode": "module.resource.reason"
}
```

查看 [错误码参考](/zh/docs/errors) 了解所有错误码。
