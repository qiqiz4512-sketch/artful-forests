# 🌳 树木删除流程完整分析报告

## 文档说明
本报告详细记录了树木删除功能的完整代码链路、数据流、以及为什么删除后刷新页面树木会重新出现的根本原因。

---

## 🔴 核心问题描述

**现象**: 用户删除树木后，页面显示树木消失，但刷新页面后树木重新出现。

**原因**: 前端发送了删除请求到Supabase，但没有等待确认，就立即从UI中移除。如果Supabase操作失败或网络延迟，数据库中的树木数据仍然存在，刷新时会被重新加载。

---

## 📍 代码位置地图

### 核心文件清单
| 功能 | 文件路径 | 关键行号 |
|------|--------|--------|
| **前端删除处理** | [src/pages/Index.tsx](src/pages/Index.tsx) | 1444-1461 |
| **客户端API函数** | [src/lib/treeProfileRepository.ts](src/lib/treeProfileRepository.ts) | 381-382 |
| **Supabase Edge Function** | [supabase/functions/secondme-tree-profiles/index.ts](supabase/functions/secondme-tree-profiles/index.ts) | 142-152 |
| **存储管理** | [src/pages/Index.tsx](src/pages/Index.tsx) | 223-244 |
| **树木树状态管理** | [src/stores/useForestStore.ts](src/stores/useForestStore.ts) | 237-241 |
| **远程树木加载** | [src/pages/Index.tsx](src/pages/Index.tsx) | 2298-2395 |

---

## 🔗 删除操作的完整链路

### 阶段1️⃣：前端UI调用
**文件**: [src/pages/Index.tsx](src/pages/Index.tsx) 第 1444-1461 行

```typescript
const handleDeleteTree = useCallback((treeId: string) => {
  // ✅ Step 1: 从本地state移除树木
  setTrees((current) => current.filter((tree) => tree.id !== treeId));
  
  // ✅ Step 2: 从Zustand store中移除
  removeTree(treeId);
  
  // ✅ Step 3: 从localStorage中移除  
  const ownerId = loadSecondMeSession()?.user?.userId ?? null;
  const existing = loadManualTrees(ownerId);
  saveManualTrees(existing.filter((entry) => entry.id !== treeId), ownerId);
  
  // ❌ PROBLEM: Step 4 - 异步调用，不等待结果
  void deleteTreeProfile(treeId);
  
  // ✅ Step 5: 清理交互状态
  if (activeDialogueAgentId === treeId) setActiveDialogueAgent(null);
  setFocusedTreeId((current) => current === treeId ? null : current);
}, [...]);
```

**关键问题**:
- 前3步都是同步操作（立即完成）
- 第4步使用 `void` 前缀忽略Promise
- 第5步紧接着清理交互状态
- **整个操作不等待Supabase确认！**

---

### 阶段2️⃣：调用API层
**文件**: [src/lib/treeProfileRepository.ts](src/lib/treeProfileRepository.ts) 第 381-382 行

```typescript
export const deleteTreeProfile = async (treeId: string): Promise<void> => {
  await invokeTreeProfilesFunction<boolean>('deleteTreeProfile', { treeId });
};
```

**问题分析**:
| 问题 | 详情 |
|------|------|
| **返回类型误导** | `Promise<void>` 表示"不需要返回值"，实际上删除成功状态被丢弃 |
| **返回值未检查** | `<boolean>` 泛型被忽视，未检查true/false |
| **无错误传播** | 如果请求失败，错误被吞掉，前端收不到 |
| **无重试机制** | 单次尝试，如果失败就永久丢失 |

---

### 阶段3️⃣：Edge Function处理
**文件**: [supabase/functions/secondme-tree-profiles/index.ts](supabase/functions/secondme-tree-profiles/index.ts) 第 142-152 行

```typescript
case 'deleteTreeProfile': {
  const treeId = String(payload?.treeId ?? '').trim();
  if (!treeId) return invalid('treeId is required');
  
  // 执行数据库删除操作
  const { error } = await admin
    .from('tree_profiles')
    .delete()
    .eq('secondme_user_id', identity.secondmeUserId)
    .eq('tree_id', treeId);
  
  // 错误处理存在，但前端看不到
  if (error) return jsonResponse({ 
    error: 'tree_profiles_delete_failed', 
    message: error.message 
  }, 400);
  
  return jsonResponse({ data: true });
}
```

**清单检查**:
- ✅ 验证treeId非空
- ✅ 使用正确的where条件（secondme_user_id + tree_id）
- ✅ 返回错误信息
- ❌ 但前端没有捕捉这个错误返回！

---

## 📦 树木数据的加载/缓存机制

### localStorage 树木存储

**存储格式** [src/pages/Index.tsx](src/pages/Index.tsx) 第 223-244行:

```typescript
const loadManualTrees = (userId?: string | null): PersistedManualTreeEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    // 当前user对应的localStorage key
    const raw = localStorage.getItem(resolveManualTreesStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // 降级：尝试上一个已知的userId key
    if (!userId) {
      const lastOwnerId = loadLastKnownOwnerId();
      if (lastOwnerId) {
        const fallbackRaw = localStorage.getItem(
          resolveManualTreesStorageKey(lastOwnerId)
        );
        if (fallbackRaw) {
          const fallbackParsed = JSON.parse(fallbackRaw);
          if (Array.isArray(fallbackParsed)) return fallbackParsed;
        }
      }
    }
    return [];
  } catch {
    return [];
  }
};

const saveManualTrees = (entries: PersistedManualTreeEntry[], userId?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(resolveManualTreesStorageKey(userId), JSON.stringify(entries));
    if (userId) persistOwnerId(userId);
  } catch {
    // Ignore storage quota and private-mode write failures.
  }
};
```

**存储key**: `forest.manual_trees:{userId}` 或 `forest.manual_trees`

**内容**: 数组，包含每棵手动种植的树的完整数据（位置、图像、性格等）

---

### Zustand状态管理

**定义** [src/stores/useForestStore.ts](src/stores/useForestStore.ts) 第 237-241行:

```typescript
removeTree: (id) => {
  set((state) => ({
    agents: withNeighbors(
      state.agents.filter((agent) => agent.id !== id)
    ),
  }));
},
```

**说明**:
- 从`agents`数组中过滤移除指定ID的树
- 然后调用 `withNeighbors()` 重新计算邻域关系
- **这只是内存状态，刷新后会被覆盖**

---

### 远程Supabase树木加载

**方法** [src/pages/Index.tsx](src/pages/Index.tsx) 第 2298-2395行:

```typescript
useEffect(() => {
  if (authInitializing || !username) return;

  const ownerId = loadSecondMeSession()?.user?.userId ?? null;
  if (!ownerId || remoteRestoreOwnerRef.current === ownerId) return;
  remoteRestoreOwnerRef.current = ownerId;

  let cancelled = false;

  const restoreRemoteTrees = async () => {
    // 🔴 关键：从Supabase加载所有树
    const profiles = await fetchAllTreeProfiles();
    if (cancelled || profiles.length === 0) return;

    const existingAgentIds = new Set(
      useForestStore.getState().agents.map((agent) => agent.id)
    );
    const { addTree: storeAddTree } = useForestStore.getState();
    const restoredEntries: PersistedManualTreeEntry[] = [];
    const restoredTrees: TreeData[] = [];

    for (const profile of profiles) {
      // 只恢复手动种植的树
      if (!profile.isManual || !profile.drawingImageData || 
          existingAgentIds.has(profile.treeId)) continue;

      // 从Supabase中读取的数据重新创建树
      const sceneState = (profile.metadata.sceneState ?? {}) as Record<string, unknown>;
      const renderSize = Number(sceneState.renderSize ?? 0);
      const positionX = Number(sceneState.positionX ?? 0);
      const positionY = Number(sceneState.positionY ?? 0);
      
      if (!Number.isFinite(renderSize) || renderSize <= 0) continue;
      if (!Number.isFinite(positionX) || !Number.isFinite(positionY)) continue;

      // 加回到store
      storeAddTree({ ... });
      existingAgentIds.add(profile.treeId);
      restoredTrees.push({ ... });
      restoredEntries.push({ ... });
    }

    if (cancelled || restoredTrees.length === 0) return;

    // 同时更新localStorage ⚠️ 这会覆盖已删除的记录！
    setTrees((prev) => {
      const existingTreeIds = new Set(prev.map((tree) => tree.id));
      const additions = restoredTrees.filter(
        (tree) => !existingTreeIds.has(tree.id)
      );
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });

    const localEntries = loadManualTrees(ownerId);
    saveManualTrees(
      [
        ...localEntries.filter(
          (entry) => !restoredEntries.some((restored) => restored.id === entry.id)
        ),
        ...restoredEntries,  // 🔴 从Supabase加回树木！
      ],
      ownerId,
    );
  };

  void restoreRemoteTrees();

  return () => {
    cancelled = true;
  };
}, [authInitializing, username]);  // 登录完成时和username改变时触发
```

**执行时机**:
- 组件mount且用户登录完成
- 用户名改变时（切换账户）

**执行逻辑**:
1. 调用 `fetchAllTreeProfiles()` 从Supabase获取用户所有树木
2. 遍历每棵树，如果是manual且localStorage中没有，就加回来
3. **直接覆盖localStorage，用Supabase作为源**

---

## 🔴 问题的完整因果链

```
用户点击删除 (UI)
    ↓
handleDeleteTree()
    ├─ setTrees() → 从local state删除 ✅ 立即
    ├─ removeTree() → 从store删除 ✅ 立即  
    ├─ saveManualTrees() → 从localStorage删除 ✅ 立即
    └─ void deleteTreeProfile() → Supabase删除 ❌ 异步，忽略
         ↓
    [UI立即显示树木消失]

用户刷新页面 (F5)
    ↓
useEffect [authInitializing, username]
    ↓
restoreRemoteTrees()
    ├─ fetchAllTreeProfiles() → Supabase查询
    │                           (树仍在DB中！)
    ├─ 从结果中加回树木到store
    └─ saveManualTrees() → localStorage中加回树木

树木重新出现在页面！ 🔄
```

---

## 📊 数据流状态图

```
┌─────────────────┐
│  用户删除树     │
└────────┬────────┘
         │
         ├──► localStorage 清理 ✅
         │
         ├──► Zustand store清理 ✅
         │
         └──► Supabase删除命令 (async, void)
                    │
                    ├─ 成功? → 数据库删除 ✅
                    │
                    └─ 失败? → 前端看不到错误 ❌
                        数据库仍有数据 ❌

────────────────────────────────────────────

┌─────────────────┐
│  页面刷新 (F5)  │
└────────┬────────┘
         │
         ├──► 检查登录状态
         │
         └──► restoreRemoteTrees()
                    │
                    └──► fetchAllTreeProfiles()
                         从Supabase查询
                             │
                             ├─ 删除失败的树在这里出现 ❌
                             │
                             └─ 加回到localStorage和store
                                   │
                                   └─► 树木重新出现！
```

---

## 🔍 根本原因总结

### ❌ 问题1：乐观更新未确认
- **描述**: 前端在Supabase确认之前，就从UI中删除了树
- **代码证据**: `void deleteTreeProfile(treeId);` 
- **后果**: 网络错误或函数失败时，用户没有反馈，数据库数据孤立

### ❌ 问题2：无错误传播机制
- **描述**: deleteTreeProfile() 返回 `Promise<void>`, 删除成功状态被丢弃
- **代码证据**: 
  ```typescript
  await invokeTreeProfilesFunction<boolean>('deleteTreeProfile', { treeId });
  // 返回值被忽视，错误也被吞掉
  ```
- **后果**: 前端完全不知道删除是否成功

### ❌ 问题3：刷新时无校验
- **描述**: restoreRemoteTrees() 直接信任Supabase数据，不校验与localStorage一致性
- **代码证据**: 直接加载fetchAllTreeProfiles()的所有结果
- **后果**: 即使本地删除了，Supabase中的数据也会被重新加载

### ❌ 问题4：单向数据流
- **描述**: 删除操作是前端→Supabase，但加载操作是Supabase→前端，没有同步
- **后果**: 删除失败时，前后端数据不一致，无法自动修复

---

## 🛠️ 修复方案

### 方案A：最小修复（即时可用）

**Step 1**: 修改 [src/lib/treeProfileRepository.ts](src/lib/treeProfileRepository.ts)

```typescript
// 修改返回类型，允许接收错误
export const deleteTreeProfile = async (treeId: string): Promise<boolean> => {
  const result = await invokeTreeProfilesFunction<boolean>(
    'deleteTreeProfile', 
    { treeId }
  );
  return result ?? false;
};
```

**Step 2**: 修改 [src/pages/Index.tsx](src/pages/Index.tsx) handleDeleteTree

```typescript
const handleDeleteTree = useCallback((treeId: string) => {
  // 先尝试删除Supabase
  deleteTreeProfile(treeId)
    .then((success) => {
      if (!success) {
        console.error(`[Delete] Supabase deletion failed for tree: ${treeId}`);
        showTreeNotice(
          '删除失败',
          '请重试或检查网络连接',
          '⚠️',
          3000
        );
        // 的必要时恢复的逻辑...
      } else {
        console.log(`[Delete] Successfully deleted tree: ${treeId}`);
      }
    })
    .catch((err) => {
      console.error(`[Delete] Error deleting tree:`, err);
      showTreeNotice(
        '删除出错',
        err instanceof Error ? err.message : '未知错误',
        '❌',
        3000
      );
    });

  // 同步操作（保持现有逻辑）
  setTrees((current) => current.filter((tree) => tree.id !== treeId));
  removeTree(treeId);
  const ownerId = loadSecondMeSession()?.user?.userId ?? null;
  const existing = loadManualTrees(ownerId);
  saveManualTrees(existing.filter((entry) => entry.id !== treeId), ownerId);
  if (activeDialogueAgentId === treeId) setActiveDialogueAgent(null);
  setFocusedTreeId((current) => current === treeId ? null : current);
}, [...]);
```

---

### 方案B：更安全的方案（推荐）

实现"删除确认"机制：

```typescript
const handleDeleteTree = useCallback(async (treeId: string) => {
  try {
    // 1. 先删除Supabase
    const deleteSuccess = await deleteTreeProfile(treeId);
    
    if (!deleteSuccess) {
      showTreeNotice(
        '删除失败',
        '树木仍在Supabase中，请检查网络并重试',
        '⚠️',
        3000
      );
      return; // 不从UI删除
    }

    // 2. 确认成功后，才从UI删除
    setTrees((current) => current.filter((tree) => tree.id !== treeId));
    removeTree(treeId);
    
    // 3. 从localStorage删除
    const ownerId = loadSecondMeSession()?.user?.userId ?? null;
    const existing = loadManualTrees(ownerId);
    saveManualTrees(existing.filter((entry) => entry.id !== treeId), ownerId);
    
    // 4. 清理交互状态
    if (activeDialogueAgentId === treeId) setActiveDialogueAgent(null);
    setFocusedTreeId((current) => current === treeId ? null : current);

    showTreeNotice('树木已删除', '它回到了森林的怀抱', '🍃', 2200);
  } catch (err) {
    showTreeNotice(
      '删除出错',
      err instanceof Error ? err.message : '未知错误',
      '❌',
      3000
    );
  }
}, [activeDialogueAgentId, removeTree, setActiveDialogueAgent, showTreeNotice]);
```

---

### 方案C：完整同步方案（长期）

在 [src/pages/Index.tsx](src/pages/Index.tsx) 中实现校验逻辑：

```typescript
useEffect(() => {
  if (authInitializing || !username) return;
  
  const ownerId = loadSecondMeSession()?.user?.userId ?? null;
  if (!ownerId) return;
  
  // 定期（如5秒）校验一次本地vs远程数据
  const syncInterval = window.setInterval(async () => {
    const profiles = await fetchAllTreeProfiles();
    const remoteIds = new Set(
      profiles.filter((p) => p.isManual).map((p) => p.treeId)
    );
    
    const localEntries = loadManualTrees(ownerId);
    const localIds = new Set(localEntries.map((e) => e.id));
    
    // 找到本地有但远程没有的（已删除）
    const deletedIds = [...localIds].filter((id) => !remoteIds.has(id));
    
    if (deletedIds.length > 0) {
      // 从本地清理
      saveManualTrees(
        localEntries.filter((e) => !deletedIds.includes(e.id)),
        ownerId
      );
      setTrees((prev) => prev.filter((t) => !deletedIds.includes(t.id)));
    }
    
    // 找到远程有但本地没有的（被其他设备添加）
    const addedIds = [...remoteIds].filter((id) => !localIds.has(id));
    if (addedIds.length > 0) {
      // 从远程加回
      // ... 恢复逻辑
    }
  }, 5000);
  
  return () => window.clearInterval(syncInterval);
}, [username]);
```

---

## 📋 验证清单

在应用修复后，验证以下场景：

- [ ] 删除树木时，Edge Function返回成功/失败状态
- [ ] 前端收到错误时显示通知给用户
- [ ] 删除确认后，Supabase中树木数据实际被删除
- [ ] 页面刷新后，树木不再出现
- [ ] 网络中断时，删除操作能正确反馈错误
- [ ] localStorage和Supabase数据一致

---

## 📚 相关文件完整列表

```
src/
  ├─ pages/
  │   └─ Index.tsx                    # handleDeleteTree, restoreRemoteTrees
  ├─ stores/
  │   └─ useForestStore.ts            # removeTree action
  └─ lib/
      └─ treeProfileRepository.ts     # deleteTreeProfile function

supabase/
  ├─ config.toml                      # Function verify_jwt setting
  ├─ tree_profiles_setup.sql          # Database schema
  └─ functions/
      └─ secondme-tree-profiles/
          └─ index.ts                 # deleteTreeProfile case handler

localStorage keys:
  - forest.manual_trees:{userId}      # Manual trees persistence
  - forest.chat_history:{userId}      # Chat history persistence
  - forest.last_owner_id              # Last known owner
```

---

## 🔗 API调用链路

```
DOM Event: Delete Button Click
    ↓
handleDeleteTree(treeId)
    ↓
deleteTreeProfile(treeId)
    ↓
invokeTreeProfilesFunction<boolean>('deleteTreeProfile', {treeId})
    ↓
supabase.functions.invoke('secondme-tree-profiles', {
  body: { action: 'deleteTreeProfile', payload: { treeId } }
})
    ↓
Edge Function Handler
    ↓
admin.from('tree_profiles').delete()
    .eq('secondme_user_id', identity.secondmeUserId)
    .eq('tree_id', treeId)
    ↓
Database Response
```

---

## 总结

**问题根源**: 前端实现了"乐观删除"（先删UI，再请求服务器），但没有错误处理和确认机制，导致服务器删除失败时数据不一致。

**建议优先级**:
1. 🔴 **高** - 修改deleteTreeProfile返回值，添加错误检查
2. 🔴 **高** - 改为服务器确认后再删UI
3. 🟡 **中** - 添加用户通知和日志
4. 🟢 **低** - 实现校验/同步机制

**预期修复时间**: 2-4小时（实现方案B）

