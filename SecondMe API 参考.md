# SecondMe API 参考

---
title: SecondMe API 参考
description: SecondMe API 提供用户信息访问和 AI 聊天功能
---

SecondMe API 提供用户信息访问和 AI 聊天功能。

**Base URL**: `https://api.mindverse.com/gate/lab`

---

## 获取用户信息

获取授权用户的基本信息。

```
GET /api/secondme/user/info
```

### 认证

需要 OAuth2 Token。

### 所需权限

`user.info`

### 请求示例

```bash
curl -X GET "https://api.mindverse.com/gate/lab/api/secondme/user/info" \
  -H "Authorization: Bearer lba_at_your_access_token"
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "userId": "12345678",
    "name": "用户名",
    "email": "user@example.com",
    "avatar": "https://cdn.example.com/avatar.jpg",
    "bio": "个人简介",
    "selfIntroduction": "自我介绍内容",
    "profileCompleteness": 85,
    "route": "username"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户 ID |
| name | string | 用户姓名 |
| email | string | 用户邮箱 |
| avatar | string | 头像 URL |
| bio | string | 个人简介 |
| selfIntroduction | string | 自我介绍 |
| profileCompleteness | number | 资料完整度（0-100） |
| route | string | 用户主页路由 |

### 错误码

| 错误码 | 说明 |
|-------|------|
| oauth2.scope.insufficient | 缺少 user.info 权限 |

---

## 获取用户兴趣标签

获取用户的兴趣标签（仅返回有公开内容的标签）。

```
GET /api/secondme/user/shades
```

### 认证

需要 OAuth2 Token。

### 所需权限

`user.info.shades`

### 请求示例

```bash
curl -X GET "https://api.mindverse.com/gate/lab/api/secondme/user/shades" \
  -H "Authorization: Bearer lba_at_your_access_token"
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "shades": [
      {
        "id": 123,
        "shadeName": "科技爱好者",
        "shadeIcon": "https://cdn.example.com/icon.png",
        "confidenceLevel": "HIGH",
        "shadeDescription": "热爱科技",
        "shadeDescriptionThirdView": "他/她热爱科技",
        "shadeContent": "喜欢编程和数码产品",
        "shadeContentThirdView": "他/她喜欢编程和数码产品",
        "sourceTopics": ["编程", "AI"],
        "shadeNamePublic": "科技达人",
        "shadeIconPublic": "https://cdn.example.com/public-icon.png",
        "confidenceLevelPublic": "HIGH",
        "shadeDescriptionPublic": "科技爱好者",
        "shadeDescriptionThirdViewPublic": "一位科技爱好者",
        "shadeContentPublic": "热爱科技",
        "shadeContentThirdViewPublic": "他/她热爱科技",
        "sourceTopicsPublic": ["科技"],
        "hasPublicContent": true
      }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| shades | array | 兴趣标签列表 |
| shades[].id | number | 标签 ID |
| shades[].shadeName | string | 标签名称 |
| shades[].shadeIcon | string | 标签图标 URL |
| shades[].confidenceLevel | string | 置信度：`VERY_HIGH`、`HIGH`、`MEDIUM`、`LOW`、`VERY_LOW` |
| shades[].shadeDescription | string | 标签描述 |
| shades[].shadeDescriptionThirdView | string | 第三人称描述 |
| shades[].shadeContent | string | 标签内容 |
| shades[].shadeContentThirdView | string | 第三人称内容 |
| shades[].sourceTopics | array | 来源主题 |
| shades[].shadeNamePublic | string | 公开标签名称 |
| shades[].shadeIconPublic | string | 公开图标 URL |
| shades[].confidenceLevelPublic | string | 公开置信度 |
| shades[].shadeDescriptionPublic | string | 公开描述 |
| shades[].shadeDescriptionThirdViewPublic | string | 公开第三人称描述 |
| shades[].shadeContentPublic | string | 公开内容 |
| shades[].shadeContentThirdViewPublic | string | 公开第三人称内容 |
| shades[].sourceTopicsPublic | array | 公开来源主题 |
| shades[].hasPublicContent | boolean | 是否有公开内容 |

### 错误码

| 错误码 | 说明 |
|-------|------|
| oauth2.scope.insufficient | 缺少 user.info.shades 权限 |

---

## 获取用户软记忆

获取用户的软记忆数据（个人知识库），支持分页和搜索。

```
GET /api/secondme/user/softmemory
```

### 认证

需要 OAuth2 Token。

### 所需权限

`user.info.softmemory`

### 查询参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 搜索关键词 |
| pageNo | integer | 否 | 页码（默认: 1，最小: 1） |
| pageSize | integer | 否 | 每页大小（默认: 20，最大: 100） |

### 请求示例

```bash
curl -X GET "https://api.mindverse.com/gate/lab/api/secondme/user/softmemory?keyword=爱好&pageNo=1&pageSize=20" \
  -H "Authorization: Bearer lba_at_your_access_token"
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 456,
        "factObject": "兴趣爱好",
        "factContent": "喜欢阅读科幻小说",
        "createTime": 1705315800000,
        "updateTime": 1705315800000
      },
      {
        "id": 457,
        "factObject": "日常作息",
        "factContent": "每天早上 7 点起床",
        "createTime": 1704873600000,
        "updateTime": 1704873600000
      }
    ],
    "total": 100
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| list | array | 软记忆列表 |
| list[].id | number | 软记忆 ID |
| list[].factObject | string | 事实对象/分类 |
| list[].factContent | string | 事实内容 |
| list[].createTime | number | 创建时间（毫秒时间戳） |
| list[].updateTime | number | 更新时间（毫秒时间戳） |
| total | number | 总数 |

### 错误码

| 错误码 | 说明 |
|-------|------|
| oauth2.scope.insufficient | 缺少 user.info.softmemory 权限 |

---

## 添加笔记

> **暂不可用**: 该接口当前暂时不支持，后续将会下线。如需向 AI 分身上报信息，请使用 [上报 Agent Memory 事件](#上报-agent-memory-事件) 接口。

创建一条笔记或记忆，支持文本笔记和链接笔记两种类型。

```
POST /api/secondme/note/add
```

### 认证

需要 OAuth2 Token。

### 所需权限

`note.add`

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| content | string | TEXT 类型必填 | 笔记内容（最大 50000 字符） |
| title | string | 否 | 笔记标题（最大 200 字符） |
| urls | string[] | LINK 类型必填 | URL 列表（最多 10 个） |
| memoryType | string | 否 | 笔记类型：`TEXT`（默认）或 `LINK` |

### 请求示例

**文本笔记：**

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/secondme/note/add" \
  -H "Authorization: Bearer lba_at_your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "今天学习了 Python 的异步编程",
    "title": "学习笔记",
    "memoryType": "TEXT"
  }'
```

**链接笔记：**

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/secondme/note/add" \
  -H "Authorization: Bearer lba_at_your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com/article"],
    "title": "有趣的文章",
    "memoryType": "LINK"
  }'
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "noteId": 12345
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| noteId | number | 创建的笔记 ID |

### 错误码

| 错误码 | 说明 |
|-------|------|
| auth.scope.missing | 缺少 note.add 权限 |
| note.content.required | TEXT 类型笔记必须提供 content |
| note.urls.required | LINK 类型笔记必须提供 urls |

---

## 语音合成 (TTS)

将文本转换为语音音频，返回音频文件的公开 URL。

```
POST /api/secondme/tts/generate
```

### 认证

需要 OAuth2 Token。

### 所需权限

`voice`

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| text | string | 是 | 待转换的文本，最长 10000 字符 |
| emotion | string | 否 | 情绪：`happy`/`sad`/`angry`/`fearful`/`disgusted`/`surprised`/`calm`/`fluent`（默认） |

> **注意**: 语音 ID 自动从用户信息中获取。如需使用 TTS 功能，用户需先在 SecondMe 中设置语音。

### 请求示例

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/secondme/tts/generate" \
  -H "Authorization: Bearer lba_at_your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "你好，这是一段测试语音",
    "emotion": "fluent"
  }'
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "url": "https://cdn.example.com/tts/audio_12345.mp3",
    "durationMs": 2500,
    "sampleRate": 24000,
    "format": "mp3"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| url | string | 音频文件 URL（公有读，永久有效） |
| durationMs | number | 音频时长（毫秒） |
| sampleRate | number | 采样率 (Hz) |
| format | string | 音频格式 |

### 错误码

| 错误码 | 说明 |
|-------|------|
| oauth2.scope.insufficient | 缺少 voice 权限 |
| tts.text.too_long | 文本超过 10000 字符限制 |
| tts.voice_id.not_set | 用户未设置语音 |

---

## 流式聊天

以用户的 AI 分身进行流式对话。

```
POST /api/secondme/chat/stream
```

### 认证

需要 OAuth2 Token。

### 所需权限

`chat`

### 请求头

| 头 | 必需 | 说明 |
|---|------|------|
| Authorization | 是 | Bearer Token |
| Content-Type | 是 | application/json |
| X-App-Id | 否 | 应用 ID，默认 `general` |

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户消息内容 |
| sessionId | string | 否 | 会话 ID，不提供则自动生成新会话 |
| model | string | 否 | LLM 模型，可选值：`anthropic/claude-sonnet-4-5`（默认）、`google_ai_studio/gemini-2.0-flash` |
| systemPrompt | string | 否 | 系统提示词，仅在新会话首次有效 |
| enableWebSearch | boolean | 否 | 是否启用网页搜索，默认 false |

### 请求示例

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/secondme/chat/stream" \
  -H "Authorization: Bearer lba_at_your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，介绍一下自己",
    "systemPrompt": "请用友好的语气回复"
  }'
```

**指定模型:**

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/secondme/chat/stream" \
  -H "Authorization: Bearer lba_at_your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，介绍一下自己",
    "model": "google_ai_studio/gemini-2.0-flash"
  }'
```

**启用 WebSearch:**

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/secondme/chat/stream" \
  -H "Authorization: Bearer lba_at_your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "今天有什么科技新闻",
    "enableWebSearch": true
  }'
```

### 响应

响应类型为 `text/event-stream` (Server-Sent Events)。

**新会话首条消息:**

```
event: session
data: {"sessionId": "labs_sess_a1b2c3d4e5f6"}

```

**聊天内容流:**

```
data: {"choices": [{"delta": {"content": "你好"}}]}

data: {"choices": [{"delta": {"content": "！我是"}}]}

data: {"choices": [{"delta": {"content": "你的 AI 分身"}}]}

data: [DONE]
```

**启用 WebSearch 时的事件流:**

```
event: session
data: {"sessionId": "labs_sess_a1b2c3d4e5f6"}

event: tool_call
data: {"toolName": "web_search", "status": "searching"}

event: tool_result
data: {"toolName": "web_search", "query": "科技新闻", "resultCount": 5}

data: {"choices": [{"delta": {"content": "根据搜索结果..."}}]}

data: [DONE]
```

### 流数据格式

| 事件类型 | 说明 |
|---------|------|
| session | 新会话创建时返回会话 ID |
| tool_call | 工具调用开始，启用 WebSearch 时触发 |
| tool_result | 工具调用结果，包含搜索查询和结果数量 |
| data | 聊天内容增量 |
| [DONE] | 流结束标志 |

### 处理流式响应示例 (Python)

```python
import requests

response = requests.post(
    "https://api.mindverse.com/gate/lab/api/secondme/chat/stream",
    headers={
        "Authorization": "Bearer lba_at_xxx",
        "Content-Type": "application/json"
    },
    json={"message": "你好"},
    stream=True
)

for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('data: '):
            data = line[6:]
            if data == '[DONE]':
                break
            print(data)
```

### 错误码

| 错误码 | 说明 |
|-------|------|
| oauth2.scope.insufficient | 缺少 chat 权限 |
| secondme.user.invalid_id | 无效的用户 ID |
| secondme.stream.error | 流式响应错误 |

---

## 流式动作判断 (Act)

让 AI 分身进行结构化动作判断，以流式方式返回 JSON 结果。

与聊天 API 返回自由文本不同，Act API 约束模型仅根据你的 `actionControl` 指令输出合法 JSON 对象。适用于情感分析、意图分类或任何结构化决策场景。

```
POST /api/secondme/act/stream
```

### 认证

需要 OAuth2 Token。

### 所需权限

`chat`

### 请求头

| 头 | 必需 | 说明 |
|---|------|------|
| Authorization | 是 | Bearer Token |
| Content-Type | 是 | application/json |
| X-App-Id | 否 | 应用 ID，默认 `general` |

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户消息内容 |
| actionControl | string | 是 | 动作控制说明（20-8000 字符），定义模型必须输出的 JSON 结构与判断规则 |
| model | string | 否 | LLM 模型，可选值：`anthropic/claude-sonnet-4-5`（默认）、`google_ai_studio/gemini-2.0-flash` |
| sessionId | string | 否 | 会话 ID，不提供则自动生成 |
| systemPrompt | string | 否 | 系统提示词，仅在新会话首次有效 |

### actionControl 要求

`actionControl` 字段必须：
- 长度在 **20 到 8000 字符** 之间
- 包含 **JSON 结构示例**（带花括号，如 `{"is_liked": boolean}`）
- 包含 **判断规则** 和信息不足时的 **兜底规则**

**actionControl 示例：**

```
仅输出合法 JSON 对象，不要解释。
输出结构：{"is_liked": boolean}。
当用户明确表达喜欢或支持时 is_liked=true，否则 is_liked=false。
```

### 请求示例

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/secondme/act/stream" \
  -H "Authorization: Bearer lba_at_your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我非常喜欢这个产品，太棒了！",
    "actionControl": "仅输出合法 JSON 对象，不要解释。\n输出结构：{\"is_liked\": boolean}。\n当用户明确表达喜欢或支持时 is_liked=true，否则 is_liked=false。"
  }'
```

### 响应

响应类型为 `text/event-stream` (Server-Sent Events)。

**新会话首条消息：**

```
event: session
data: {"sessionId": "labs_sess_a1b2c3d4e5f6"}

```

**动作结果流（JSON 输出）：**

```
data: {"choices": [{"delta": {"content": "{\"is_liked\":"}}]}

data: {"choices": [{"delta": {"content": " true}"}}]}

data: [DONE]
```

**错误事件（流式过程中出错时）：**

```
event: error
data: {"code": 500, "message": "服务内部错误"}
```

### 处理流式响应示例 (Python)

```python
import json
import requests

response = requests.post(
    "https://api.mindverse.com/gate/lab/api/secondme/act/stream",
    headers={
        "Authorization": "Bearer lba_at_xxx",
        "Content-Type": "application/json"
    },
    json={
        "message": "我非常喜欢这个产品！",
        "actionControl": "仅输出合法 JSON 对象。\n"
                         "输出结构：{\"is_liked\": boolean}。\n"
                         "用户表达喜欢时 is_liked=true，否则 false。"
    },
    stream=True
)

session_id = None
result_parts = []
current_event = None

for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('event: '):
            current_event = line[7:]
            continue
        if line.startswith('data: '):
            data = line[6:]
            if data == '[DONE]':
                break
            parsed = json.loads(data)
            if current_event == 'session':
                session_id = parsed.get("sessionId")
            elif current_event == 'error':
                print(f"Error: {parsed}")
                break
            else:
                content = parsed["choices"][0]["delta"].get("content", "")
                result_parts.append(content)
            current_event = None

result = json.loads("".join(result_parts))
print(result)  # {"is_liked": true}
```

### 错误码

| 错误码 | 说明 |
|-------|------|
| auth.scope.missing | 缺少 chat 权限 |
| secondme.act.action_control.empty | actionControl 为空 |
| secondme.act.action_control.too_short | actionControl 过短（最少 20 字符） |
| secondme.act.action_control.too_long | actionControl 过长（最多 8000 字符） |
| secondme.act.action_control.invalid_format | 缺少 JSON 结构示例 |

### 校验错误响应

当 `actionControl` 校验失败时，响应会包含额外的诊断字段：

```json
{
  "code": 400,
  "message": "actionControl 存在常见格式问题，请按 issues 和 suggestions 修正后重试",
  "subCode": "secondme.act.action_control.invalid_format",
  "constraints": {
    "minLength": 20,
    "maxLength": 8000,
    "requiredElements": [
      "输出格式约束（仅输出 JSON）",
      "JSON 字段结构示例（包含花括号）",
      "判定规则",
      "兜底规则"
    ],
    "currentLength": 15
  },
  "issues": [
    {
      "code": "missing_json_structure",
      "message": "未检测到 JSON 花括号结构示例（如 {\"is_liked\": boolean}）"
    }
  ],
  "suggestions": [
    "请明确写出 JSON 结构，例如：{\"is_liked\": boolean}",
    "请明确兜底规则，例如：信息不足时返回 {\"is_liked\": false}",
    "请使用 JSON 布尔 true/false，不要使用 \"True\"/\"False\""
  ]
}
```

---

## 获取会话列表

获取用户的聊天会话列表。

```
GET /api/secondme/chat/session/list
```

### 认证

需要 OAuth2 Token。

### 所需权限

`chat`

### 查询参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| appId | string | 否 | 按应用 ID 筛选 |

### 请求示例

```bash
curl -X GET "https://api.mindverse.com/gate/lab/api/secondme/chat/session/list?appId=general" \
  -H "Authorization: Bearer lba_at_your_access_token"
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "sessions": [
      {
        "sessionId": "labs_sess_a1b2c3d4",
        "appId": "general",
        "lastMessage": "你好，介绍一下自己...",
        "lastUpdateTime": "2024-01-20T15:30:00Z",
        "messageCount": 10
      },
      {
        "sessionId": "labs_sess_e5f6g7h8",
        "appId": "general",
        "lastMessage": "今天天气怎么样？",
        "lastUpdateTime": "2024-01-19T10:00:00Z",
        "messageCount": 5
      }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| sessions | array | 会话列表，按最后更新时间倒序 |
| sessions[].sessionId | string | 会话 ID |
| sessions[].appId | string | 应用 ID |
| sessions[].lastMessage | string | 最后一条消息预览（截断至 50 字） |
| sessions[].lastUpdateTime | string | 最后更新时间（ISO 8601） |
| sessions[].messageCount | number | 消息数量 |

### 错误码

| 错误码 | 说明 |
|-------|------|
| oauth2.scope.insufficient | 缺少 chat 权限 |

---

## 获取会话消息历史

获取指定会话的消息历史。

```
GET /api/secondme/chat/session/messages
```

### 认证

需要 OAuth2 Token。

### 所需权限

`chat`

### 查询参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话 ID |

### 请求示例

```bash
curl -X GET "https://api.mindverse.com/gate/lab/api/secondme/chat/session/messages?sessionId=labs_sess_a1b2c3d4" \
  -H "Authorization: Bearer lba_at_your_access_token"
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "sessionId": "labs_sess_a1b2c3d4",
    "messages": [
      {
        "messageId": "msg_001",
        "role": "system",
        "content": "请用友好的语气回复",
        "senderUserId": 12345,
        "receiverUserId": null,
        "createTime": "2024-01-20T15:00:00Z"
      },
      {
        "messageId": "msg_002",
        "role": "user",
        "content": "你好，介绍一下自己",
        "senderUserId": 12345,
        "receiverUserId": null,
        "createTime": "2024-01-20T15:00:05Z"
      },
      {
        "messageId": "msg_003",
        "role": "assistant",
        "content": "你好！我是你的 AI 分身...",
        "senderUserId": 12345,
        "receiverUserId": null,
        "createTime": "2024-01-20T15:00:10Z"
      }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| sessionId | string | 会话 ID |
| messages | array | 消息列表，按创建时间升序 |
| messages[].messageId | string | 消息 ID |
| messages[].role | string | 角色：`system`/`user`/`assistant` |
| messages[].content | string | 消息内容 |
| messages[].senderUserId | number | 发送方用户 ID |
| messages[].receiverUserId | number | 接收方用户 ID（预留） |
| messages[].createTime | string | 创建时间（ISO 8601） |

### 错误码

| 错误码 | 说明 |
|-------|------|
| oauth2.scope.insufficient | 缺少 chat 权限 |
| secondme.session.unauthorized | 无权访问该会话 |

> **注意**: 如果 sessionId 不存在，接口会返回成功（code=0），但 messages 为空数组。

---

## 上报 Agent Memory 事件

将用户在外部平台的行为事件上报到 Agent Memory Ledger，用于丰富 AI 分身的记忆。

```
POST /api/secondme/agent_memory/ingest
```

### 认证

需要 OAuth2 Token。无特定 scope 要求。

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| channel | ChannelInfo | 是 | 频道信息 |
| action | string | 是 | 动作类型，如 `post`、`reply`、`operate` |
| refs | RefItem[] | 是 | 证据指针数组（至少 1 项） |
| actionLabel | string | 否 | 动作展示文案，传入后优先透传给下游 |
| displayText | string | 否 | 用户可读摘要 |
| eventDesc | string | 否 | 开发者描述（非面向用户） |
| eventTime | integer | 否 | 事件时间戳（毫秒），不传则使用服务器时间 |
| importance | number | 否 | 重要性（0.0 ~ 1.0） |
| idempotencyKey | string | 否 | 幂等键，防止重复上报 |
| payload | object | 否 | 扩展信息 |

### 嵌套类型

**ChannelInfo**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| kind | string | 是 | 资源类型，如 `thread`、`post`、`comment` |
| id | string | 否 | 频道对象 ID |
| url | string | 否 | 跳转链接 |
| meta | object | 否 | 附加信息 |

> **注意**: `platform` 字段由服务端根据应用的 Client ID 自动填充，无需传入。

**RefItem**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| objectType | string | 是 | 对象类型，如 `thread_reply` |
| objectId | string | 是 | 对象 ID |
| type | string | 否 | 类型（默认 `external_action`） |
| url | string | 否 | 跳转链接 |
| contentPreview | string | 否 | 内容预览 |
| snapshot | RefSnapshot | 否 | 证据快照 |

**RefSnapshot**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| text | string | 是 | 原始证据文本片段 |
| capturedAt | integer | 否 | 捕获时间戳（毫秒） |
| hash | string | 否 | 内容哈希，如 `sha256:...` |

### 请求示例

```bash
curl -X POST "https://api.mindverse.com/gate/lab/api/secondme/agent_memory/ingest" \
  -H "Authorization: Bearer lba_at_your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": {
      "kind": "thread"
    },
    "action": "post_created",
    "actionLabel": "发布了新帖子",
    "displayText": "用户在广场发布了一个关于 AI 的帖子",
    "refs": [
      {
        "objectType": "thread",
        "objectId": "thread_12345",
        "contentPreview": "关于 AI 的讨论..."
      }
    ],
    "importance": 0.7,
    "idempotencyKey": "sha256_hash_here"
  }'
```

### 响应

**成功 (200)**

```json
{
  "code": 0,
  "data": {
    "eventId": 123,
    "isDuplicate": false
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| eventId | number | 事件 ID，0 表示重复/无效 |
| isDuplicate | boolean | 是否为重复上报 |

### 错误码

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| agent_memory.write.disabled | 403 | 该用户的 Agent Memory 写入已禁用 |
| agent_memory.ingest.failed | 502 | 上报失败（下游服务错误） |

---

## 通用响应格式

### 成功响应

```json
{
  "code": 0,
  "data": { ... }
}
```

### 错误响应

```json
{
  "code": 403,
  "message": "缺少必需的权限",
  "subCode": "oauth2.scope.insufficient"
}
```

### 认证失败响应

当 Token 无效时：

```json
{
  "detail": "需要认证"
}
```
