// =======================
// 📁 server/index.ts（最终稳定版）
// =======================

import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { drawCard } from "./tarot.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// =======================
// 🚀 1. 创建 Express 应用
// =======================
const app = express();
// ✅ 允许任意类型请求体，避免 ChatGPT 探测阶段被拦截
app.use(express.raw({ type: "*/*", limit: "2mb" }));

// =======================
// 💫 2. 准备共享资源
// =======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_URI = "ui://widget/dailycard.html";

const dailycardJS = fs.readFileSync(
  path.join(__dirname, "../web/dist/dailycard.js"),
  "utf-8"
);

// =======================
// 🌐 3. 创建单一 MCP Server 实例
// =======================
const server = new McpServer({
  name: "dailycard",
  version: "1.0.0",
});

// 注册组件模板
server.registerResource(
  "dailycard-widget",
  TEMPLATE_URI,
  {
    "openai/widgetDescription": "DailyCard 塔罗牌展示卡片",
    "openai/widgetPrefersBorder": true,
  },
  async () => ({
    contents: [
      {
        uri: TEMPLATE_URI,
        mimeType: "text/html+skybridge",
        text: `
          <div id="dailycard-root"></div>
          <script type="module">
            ${dailycardJS}
          </script>
        `,
      },
    ],
  })
);

// 注册工具
server.registerTool(
  "dailycard.draw",
  {
    title: "抽一张塔罗牌",
    description: "随机抽取一张塔罗牌，包含正/逆位与今日运势。",
    inputSchema: { dummy: z.string().optional() },
    _meta: {
      "openai/outputTemplate": TEMPLATE_URI,
      "openai/toolInvocation/invoking": "正在为你抽取今日的塔罗牌...",
      "openai/toolInvocation/invoked": "已为你抽出今日塔罗牌。",
    },
  },
  async () => {
    const r = drawCard();
    return {
      structuredContent: {
        card: {
          name: r.name,
          orientation: r.orientation,
          keywords: r.keywords,
          description: r.description,
        },
      },
      content: [
        {
          type: "text",
          text: `你抽到了 **${r.name}**（${
            r.orientation === "upright" ? "正位" : "逆位"
          }）！`,
        },
      ],
    };
  }
);

// =======================
// 🔗 4. Transport 和连接状态管理
// =======================
let transport: StreamableHTTPServerTransport | null = null;
let isConnected = false;

async function ensureConnected() {
  if (!isConnected || !transport) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    await server.connect(transport);
    isConnected = true;
    console.log("🔗 MCP Server 已连接");
  }
}

async function resetConnection() {
  if (isConnected) {
    try {
      await server.close();
      console.log("🔌 已断开旧连接");
    } catch (e) {
      // 忽略关闭错误
    }
    isConnected = false;
    transport = null;
  }
  await ensureConnected();
}

// 初始连接
await ensureConnected();

// =======================
// 💬 5. MCP 路由（支持多会话）
// =======================
app.all("/mcp", async (req: Request, res: Response) => {
  console.log("🔥 收到请求:", req.method, req.url);

  // 1️⃣ 探测阶段（GET/HEAD/OPTIONS/DELETE）
  if (["GET", "HEAD"].includes(req.method)) {
    return res
      .status(200)
      .send("✅ DailyCard MCP endpoint alive. Use POST for JSON-RPC.");
  }
  if (["OPTIONS", "DELETE"].includes(req.method)) {
    return res.sendStatus(204);
  }

  // 2️⃣ 只处理 POST 请求
  if (req.method === "POST") {
    try {
      let body: any = req.body;
      console.log("📥 原始 body 类型:", typeof body, "是 Buffer?", Buffer.isBuffer(body));
      
      if (Buffer.isBuffer(body)) {
        const bodyStr = body.length ? body.toString("utf-8") : undefined;
        console.log("📄 Buffer 转字符串:", bodyStr?.substring(0, 100));
        body = bodyStr;
      }
      
      if (typeof body === "string" && body.trim()) {
        try { 
          body = JSON.parse(body);
          console.log("✅ JSON 解析成功");
        } catch (e) { 
          console.warn("⚠️ Body 非 JSON:", body?.substring(0, 100));
        }
      }
  
      console.log("📦 当前请求 method:", body?.method);
      console.log("📦 完整 body:", JSON.stringify(body, null, 2));
  
      // ✅ 特殊处理 notifications 类型请求
      if (body?.method?.startsWith("notifications/")) {
        return res.sendStatus(204);
      }
      
      // ✅ 如果是 initialize 请求，重置连接以支持多次初始化
      if (body?.method === "initialize") {
        console.log("📥 收到 initialize 请求，重置连接");
        await resetConnection();
      }
      
      // ✅ 使用 transport 处理请求
      if (!transport) {
        throw new Error("Transport not initialized");
      }
      await transport.handleRequest(req, res, body);
    } catch (err) {
      console.error("❌ MCP error:", err);
      // 只在响应未发送时才返回错误
      if (!res.headersSent) {
        const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
        res.status(500).json({ error: message });
      }
    }
  } else {
    res.setHeader("Allow", "GET,HEAD,OPTIONS,POST,DELETE");
    res.sendStatus(405);
  }
});

// =======================
// 🏁 7. 启动服务器
// =======================
const PORT = 3030;
app.listen(PORT, () => {
  console.log(`✅ DailyCard MCP Server 已启动：http://localhost:${PORT}/mcp`);
});

// =======================
// ⏳ 8. 防止退出
// =======================
process.stdin.resume();