// =======================
// 📁 server/index.ts
// =======================

// 引入 express 框架，以及 Request/Response 类型用于 TypeScript 类型提示
import express, { type Request, type Response } from "express";

// 从 MCP SDK 引入 McpServer（负责处理 MCP 协议请求）
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// 从 MCP SDK 引入 StreamableHTTPServerTransport（负责在 HTTP 上传输 MCP 数据流）
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Node 内置的 crypto 模块，用于生成唯一的 session ID（UUID）
import { randomUUID } from "node:crypto";

// 引入 zod，用于定义输入参数的结构（即输入的 JSON 长什么样）
import { z } from "zod";

// 引入你自己写的塔罗牌逻辑函数
import { drawCard } from "./tarot.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// =======================
// 🚀 1. 创建 Express 应用
// =======================
const app = express();
app.use(express.json()); // 让 express 自动解析 JSON 请求体

// =======================
// 💫 2. 创建 MCP Server 实例
// =======================
const server = new McpServer({
  name: "dailycard",   // 服务器名称（客户端会显示）
  version: "1.0.0",    // 版本号（方便后续管理）
});

// ========== 🧩 注册 DailyCard 组件模板 ==========

// 当前文件路径解析（兼容 ESM 模式）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 模板 URI（告诉 ChatGPT 这是哪个组件）
const TEMPLATE_URI = "ui://widget/dailycard.html";

// 读取打包好的 dailycard.js（我们在第三步打包生成的）
const dailycardJS = fs.readFileSync(
  path.join(__dirname, "../web/dist/dailycard.js"),
  "utf-8"
);

// 注册模板资源（这一步非常关键）
server.registerResource(
  "dailycard-widget",               // 资源唯一 ID（随便命名）
  TEMPLATE_URI,                     // 模板的 URI
  {
    "openai/widgetDescription": "DailyCard 塔罗牌展示卡片",  // 告诉 ChatGPT 这是什么
    "openai/widgetPrefersBorder": true                        // 显示边框（可选）
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
        `
      }
    ]
  })
);

// =======================
// 🔮 3. 注册一个工具（tool）
// =======================
server.registerTool(
    "dailycard.draw",
    {
      title: "抽一张塔罗牌",
      description: "随机抽取一张塔罗牌，包含正/逆位与今日运势。",
      inputSchema: { dummy: z.string().optional() },
      _meta: {
        "openai/outputTemplate": TEMPLATE_URI, // 告诉 ChatGPT：使用我们注册的模板
        "openai/toolInvocation/invoking": "正在为你抽取今日的塔罗牌...",
        "openai/toolInvocation/invoked": "已为你抽出今日塔罗牌。"
      }
    },
    async () => {
      const r = drawCard();
      return {
        structuredContent: {
          card: {
            name: r.name,
            orientation: r.orientation,
            keywords: r.keywords,
            description: r.description
          }
        },
        content: [
          {
            type: "text",
            text: `你抽到了 **${r.name}**（${r.orientation === "upright" ? "正位" : "逆位"}）！`
          }
        ]
      };
    }
  );

// =======================
// 🌐 4. 设置传输层（Transport）
// =======================
// 负责“如何接收与发送请求”
// 我们用 HTTP 协议的 Streamable 版本，适配 MCP Inspector / ChatGPT
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(), // 每个会话生成唯一 ID
});

// 将 transport 与 MCP Server 连接，让 server 能通过它接收请求
await server.connect(transport);

// =======================
// 🧩 5. 定义 /mcp 路由
// =======================
// 当有客户端（比如 MCP Inspector）POST 到 /mcp 时，就交给 transport 来处理
app.post("/mcp", async (req: Request, res: Response) => {
  // transport 解析请求 -> 转交给 MCP Server -> 由注册的工具响应
  await transport.handleRequest(req, res, req.body);
});

// =======================
// 🏁 6. 启动服务器
// =======================
const PORT = 3030;
app.listen(PORT, () => {
  console.log(`✅ DailyCard MCP Server 已启动：http://localhost:${PORT}/mcp`);
});

// =======================
// ⏳ 7. 防止进程自动退出
// =======================
process.stdin.resume();