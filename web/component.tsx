// =======================
// 📁 web/component.tsx
// 说明：这是给 ChatGPT 内嵌的前端卡片组件
// 先写成独立组件并打包成 JS，下一步再接到服务器里。
// =======================

import React, { useEffect, useState } from "react"; // React 基础能力
import { createRoot } from "react-dom/client";      // React 18 的挂载 API

// —— 样式：做一个简洁的“卡片”外观 ——
// 说明：这里用纯字符串内联样式，避免引入 CSS 打包复杂度
const styles = `
  .dc-card { border-radius: 16px; padding: 16px; box-shadow: 0 6px 24px rgba(0,0,0,.08); background: #fff; }
  .dc-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
  .dc-badge { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 9999px; background: #f4f4f5; margin-left: 8px; }
  .dc-keywords { font-size: 12px; opacity: .8; margin-top: 6px; }
  .dc-desc { margin-top: 12px; line-height: 1.6; }
`;

// —— 定义我们希望组件接收到的数据结构 ——
// 后面接到 ChatGPT 时，会把“抽到的牌”作为 structuredContent 注入给组件
type ToolOutput = {
  card?: {
    name: string;
    orientation: "upright" | "reversed";
    keywords: string[];
    description: string;
  };
};

// 声明全局 window.openai：Apps SDK 在 iframe 里会注入它
declare global {
  interface Window {
    openai?: {
      // 约定：服务器返回的 structuredContent 会被放到这里
      toolOutput?: ToolOutput;
    };
  }
}

// —— 组件本体 ——
// 1) 启动时从 window.openai.toolOutput 里取数据
// 2) 渲染成一张卡片（牌名 + 正/逆位徽标 + 关键词 + 今日运势）
function App() {
  const [out, setOut] = useState<ToolOutput | null>(null);

  useEffect(() => {
    // 从 ChatGPT 注入的上下文中取出工具输出（后面第4步我们会把服务器接上）
    setOut(window.openai?.toolOutput ?? null);
  }, []);

  // 如果还没有数据（比如单独在浏览器里打开），给个占位
  if (!out?.card) {
    return (
      <div className="dc-card">
        <style>{styles}</style>
        DailyCard 组件就绪，等待抽卡结果…
      </div>
    );
  }

  const c = out.card;

  return (
    <div className="dc-card">
      <style>{styles}</style>
      <div className="dc-title">
        {c.name}
        <span className="dc-badge">{c.orientation === "upright" ? "正位" : "逆位"}</span>
      </div>
      <div className="dc-keywords">关键词：{c.keywords.join("、")}</div>
      <div className="dc-desc">今日运势：{c.description}</div>
    </div>
  );
}

// —— 把 React 组件挂到页面上 ——
// 注意：真正接入 ChatGPT 时，我们会在“模板 HTML”里放一个 #dailycard-root 容器
const rootEl = document.getElementById("dailycard-root") || (() => {
  // 为了单独预览时也能工作，若没有容器就临时创建一个
  const div = document.createElement("div");
  div.id = "dailycard-root";
  document.body.appendChild(div);
  return div;
})();

createRoot(rootEl).render(<App />);