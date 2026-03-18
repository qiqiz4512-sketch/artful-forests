import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const secondMeClientId = env.VITE_SECONDME_CLIENT_ID?.trim() ?? "";
  const secondMeClientSecret = env.SECONDME_CLIENT_SECRET?.trim() ?? "";
  const secondMeApiBaseUrl = (env.SECONDME_API_BASE_URL?.trim() || "https://api.mindverse.com/gate/lab").replace(/\/$/, "");

  return {
    appType: "spa",
    server: {
      host: "127.0.0.1",
      port: 8080,
      hmr: {
        host: "localhost",
        port: 8080,
        overlay: false,
      },
    },
    plugins: [
      react(),
      {
        name: "spa-fallback",
        configureServer(server) {
          // Middleware must be added as a post-processing step to avoid interfering with Vite's asset resolution
          return () => {
            server.middlewares.use((req, res, next) => {
              const url = req.url.split("?")[0];
              
              // Explicitly allow static assets, API routes, and Vite internal requests
              if (/\.(js|jsx|ts|tsx|css|json|woff2?|eot|ttf|otf|svg|png|jpg|gif|ico|webp)$/i.test(url) ||
                  url.startsWith("/api") ||
                  url.startsWith("/@") ||
                  url === "/index.html") {
                return next();
              }
              
              // For all other navigation routes, serve index.html
              req.url = "/index.html";
              next();
            });
          };
        },
      },
      {
        name: "secondme-dev-exchange",
        configureServer(server) {
          server.middlewares.use("/api/secondme/oauth/exchange", async (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

            if (req.method === "OPTIONS") {
              res.statusCode = 200;
              res.end("ok");
              return;
            }

            if (req.method !== "POST") {
              res.statusCode = 405;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "method_not_allowed" }));
              return;
            }

            if (!secondMeClientId || !secondMeClientSecret) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                error: "missing_server_credentials",
                message: "本地开发代理缺少 SECONDME_CLIENT_ID 或 SECONDME_CLIENT_SECRET",
              }));
              return;
            }

            try {
              const rawBody = await new Promise<string>((resolve, reject) => {
                let body = "";
                req.on("data", (chunk) => {
                  body += chunk;
                });
                req.on("end", () => resolve(body));
                req.on("error", reject);
              });

              const payload = rawBody ? JSON.parse(rawBody) as { code?: string; redirectUri?: string; clientId?: string } : {};
              const code = payload.code?.trim() ?? "";
              const redirectUri = payload.redirectUri?.trim() ?? "";
              const resolvedClientId = payload.clientId?.trim() || secondMeClientId;

              if (!code || !redirectUri || !resolvedClientId) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({
                  error: "missing_required_fields",
                  message: "code、redirectUri、clientId 为必填项",
                }));
                return;
              }

              const tokenResponse = await fetch(`${secondMeApiBaseUrl}/api/oauth/token/code`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  grant_type: "authorization_code",
                  code,
                  redirect_uri: redirectUri,
                  client_id: resolvedClientId,
                  client_secret: secondMeClientSecret,
                }),
              });

              const tokenPayload = await tokenResponse.json().catch(() => null);
              if (!tokenResponse.ok || tokenPayload?.code !== 0 || !tokenPayload?.data?.accessToken) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({
                  error: "token_exchange_failed",
                  details: tokenPayload,
                }));
                return;
              }

              const accessToken = tokenPayload.data.accessToken as string;
              const refreshToken = tokenPayload.data.refreshToken as string | undefined;
              const expiresIn = Number(tokenPayload.data.expiresIn ?? 0);
              const scope = tokenPayload.data.scope ?? [];

              const userInfoResponse = await fetch(`${secondMeApiBaseUrl}/api/secondme/user/info`, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              const userInfoPayload = await userInfoResponse.json().catch(() => null);

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                accessToken,
                refreshToken: refreshToken ?? null,
                expiresIn,
                scope,
                user: userInfoPayload?.data
                  ? {
                      userId: String(userInfoPayload.data.userId ?? ""),
                      name: userInfoPayload.data.name ?? null,
                      email: userInfoPayload.data.email ?? null,
                      avatar: userInfoPayload.data.avatar ?? null,
                      route: userInfoPayload.data.route ?? null,
                    }
                  : null,
              }));
            } catch (error) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                error: "unexpected_error",
                message: error instanceof Error ? error.message : "Unknown error",
              }));
            }
          });
        },
      },
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
