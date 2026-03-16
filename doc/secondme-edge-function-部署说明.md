# SecondMe Edge Function 部署说明

当前项目的 SecondMe 登录流程依赖 Supabase Edge Function：

- 函数名：secondme-oauth-exchange
- Supabase 项目 ref：giooyiclaivgxmedfljk
- 作用：在服务端使用 Client Secret 完成授权码换 Token，并拉取用户信息

如果这个函数没有部署，前端回调后会看到：

- Failed to send a request to the Edge Function

## 1. 登录 Supabase CLI

本机没有全局安装 Supabase CLI，可以直接使用 npx：

```powershell
npx -y supabase login
```

如果你不想走浏览器登录，也可以先去 Supabase Dashboard 生成 Personal Access Token，再执行：

```powershell
npx -y supabase login --token 你的_PAT
```

## 2. 关联到当前 Supabase 项目

```powershell
npx -y supabase link --project-ref giooyiclaivgxmedfljk
```

说明：

- 如果命令提示输入数据库密码，而你暂时只部署 Edge Function，可以先直接回车跳过。
- Edge Function 部署和 Secrets 配置不依赖数据库密码。

## 3. 配置服务端 Secrets

当前函数会读取以下服务端环境变量：

- SECONDME_CLIENT_ID
- SECONDME_CLIENT_SECRET
- SECONDME_API_BASE_URL（可选，默认就是官方地址）

执行命令：

```powershell
npx -y supabase secrets set --project-ref giooyiclaivgxmedfljk SECONDME_CLIENT_ID="554849da-7550-4dee-92f7-f5d36c88953c" SECONDME_CLIENT_SECRET="把你的真实 Client Secret 填这里"
```

如果你也想显式指定 API Base URL：

```powershell
npx -y supabase secrets set --project-ref giooyiclaivgxmedfljk SECONDME_API_BASE_URL="https://api.mindverse.com/gate/lab"
```

注意：

- SECONDME_CLIENT_SECRET 是服务端密钥，不要放到前端代码里使用。
- 即使 .env.local 里写了 SECONDME_CLIENT_SECRET，浏览器端也不会自动把它变成 Supabase Edge Function 的服务端变量。

## 4. 部署 Edge Function

这个项目已经包含函数源码：

- [supabase/functions/secondme-oauth-exchange/index.ts](supabase/functions/secondme-oauth-exchange/index.ts)

部署命令：

```powershell
npx -y supabase functions deploy secondme-oauth-exchange --project-ref giooyiclaivgxmedfljk --no-verify-jwt
```

这里加 --no-verify-jwt 的原因是：

- 当前登录回调发生在用户还没有 Supabase Auth 会话之前。
- 前端需要先调用这个函数完成 SecondMe token 交换。
- 如果函数要求 Supabase JWT，这一步会直接被 401 拦截。

仓库里也已经补了函数配置：

- [supabase/config.toml](supabase/config.toml)

其中把 secondme-oauth-exchange 设置为了：

```toml
[functions.secondme-oauth-exchange]
verify_jwt = false
```

## 5. 部署后验证

先查看函数列表：

```powershell
npx -y supabase functions list --project-ref giooyiclaivgxmedfljk
```

再查看 secrets 是否存在：

```powershell
npx -y supabase secrets list --project-ref giooyiclaivgxmedfljk
```

然后重新打开本地页面：

- http://localhost:8081/

确认 SecondMe 应用后台的 redirect_uri 白名单中也包含：

- http://localhost:8081/

## 6. 预期错误分层

部署前：

- 404 Not Found
- Failed to send a request to the Edge Function

部署后如果密钥没配对：

- token_exchange_failed
- oauth2.client.secret_mismatch
- missing_required_fields

部署后如果 redirect_uri 不一致：

- oauth2.redirect_uri.mismatch

这时就说明链路已经走到函数内部了，不再是“函数不存在”这一层问题。