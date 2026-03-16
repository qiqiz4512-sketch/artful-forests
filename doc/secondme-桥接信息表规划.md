# SecondMe 桥接信息表规划

## 目标

在现有 Supabase 认证体系下，建立一套可审计、可增量同步、可权限隔离的数据桥接层，用于在本地森林数据与 SecondMe 之间进行双向交换。

## 表清单与职责

1. `public.secondme_identities`
- 用户与 SecondMe 身份绑定（1:1）
- 保存 SecondMe 用户 ID、代理 ID、状态、Token 过期时间、最后同步时间

2. `public.secondme_data_sources`
- 记录哪些本地数据被纳入同步（聊天记录、树资料、手动上传等）
- 支持每个源独立开关和扩展元数据

3. `public.secondme_consent_scopes`
- 用户授权范围控制（allow/deny/mask）
- 可按 scope 做细粒度数据共享策略

4. `public.secondme_outbox`
- 本地发往 SecondMe 的事件队列
- 支持重试、去重键、失败转死信

5. `public.secondme_inbox`
- SecondMe 回流事件日志
- 支持幂等（external_event_id 唯一）、处理状态和错误记录

6. `public.secondme_sync_jobs`
- 同步任务生命周期（queued/running/success/failed）
- 汇总成功数/失败数，便于可观测与告警

7. `public.secondme_sync_checkpoints`
- 增量同步游标（时间戳、偏移量、最后事件 ID）
- 避免全量重扫

8. `public.secondme_audit_logs`
- 审计日志（谁在什么时候对什么资源做了什么）
- 便于风控、合规和问题追踪

## 关键关系

- `auth.users (1) -> (1) secondme_identities`
- `secondme_identities (1) -> (N) secondme_data_sources`
- `secondme_identities (1) -> (N) secondme_consent_scopes`
- `secondme_identities (1) -> (N) secondme_outbox`
- `secondme_identities (1) -> (N) secondme_inbox`
- `secondme_identities (1) -> (N) secondme_sync_jobs`
- `secondme_identities (1) -> (N) secondme_sync_checkpoints`

## 推荐数据流

1. 用户完成 SecondMe SSO 后，创建/更新 `secondme_identities`。
2. 前端或后端配置可同步数据源，写入 `secondme_data_sources`。
3. 业务事件入 `secondme_outbox`，Worker 按状态拉取并投递到 SecondMe。
4. 成功投递后更新 outbox 状态，并刷新 `last_synced_at`。
5. SecondMe webhook 回调写入 `secondme_inbox`，内部消费者再落地到业务表。
6. 每次批处理更新 `secondme_sync_jobs` 和 `secondme_sync_checkpoints`。
7. 全流程关键动作写入 `secondme_audit_logs`。

## 最小 RPC 接口（已在 SQL 提供）

1. `secondme_upsert_identity`
- 作用：绑定或更新当前用户的 SecondMe 身份信息

2. `secondme_enqueue_outbox`
- 作用：将本地事件放入出站队列，等待 Worker 投递

3. `secondme_ingest_inbox`
- 作用：记录 SecondMe 回流事件（支持 external_event_id 幂等）

4. `secondme_mark_inbox_processed`
- 作用：处理完成后回写 processed 状态

## 标准 Payload 模板

### chat_history

```json
{
  "event": "chat.message.created",
  "version": "1.0",
  "data": {
    "messageId": "chat-1730000000000-1",
    "speakerId": "tree_a",
    "listenerId": "tree_b",
    "message": "今晚的风有点凉。",
    "type": "chat",
    "createdAt": 1730000000000
  },
  "context": {
    "world": "forest-main",
    "weather": "night"
  }
}
```

### tree_profile

```json
{
  "event": "tree.profile.updated",
  "version": "1.0",
  "data": {
    "treeId": "tree_a",
    "name": "云杉",
    "personality": "温柔",
    "energy": 76,
    "socialCircle": {
      "friends": ["tree_b"],
      "family": [],
      "partner": null
    },
    "metadata": {
      "bio": "喜欢晨风",
      "lastWords": "我会长高的"
    }
  }
}
```

### memory_note

```json
{
  "event": "tree.memory.updated",
  "version": "1.0",
  "data": {
    "treeId": "tree_a",
    "lastTopic": "天气",
    "timestamp": 1730000000000,
    "interactionHistory": [
      {
        "agentId": "tree_b",
        "personalityImpression": "可靠",
        "lastTopic": "露水",
        "timestamp": 1730000000000
      }
    ]
  }
}
```

## 与当前森林项目的映射建议

- `chat_history` -> 映射 `useForestStore.chatHistory`
- `tree_profile` -> 映射 `agents[].metadata + personality + socialCircle`
- `memory_note` -> 映射 `agents[].memory`
- 建议使用 `source_key` 规范：
  - `chat:global`
  - `tree:{agentId}`
  - `memory:{agentId}`

## 安全与治理建议

1. 开启全部桥接表 RLS，并通过 `auth.uid()` 约束用户级访问。
2. Token 建议仅存加密值（当前表已预留 `token_encrypted` 字段）。
3. 对出站事件引入 `dedupe_key`，避免重复投递。
4. 对入站事件使用 `external_event_id` 幂等。
5. 对失败任务采用指数退避，超过阈值转 `dead`。

## 已落地文件

- 建表 SQL: `supabase/secondme_bridge_setup.sql`
