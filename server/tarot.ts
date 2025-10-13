// server/tarot.ts
export type Orientation = "upright" | "reversed";

type Card = {
  name: string;
  upright: { keywords: string[]; daily: string };
  reversed: { keywords: string[]; daily: string };
};

// 只放三张示例牌，后面可以扩展到78张
const DECK: Card[] = [
  {
    name: "The Fool",
    upright: {
      keywords: ["开始", "信任", "自由"],
      daily: "今天是适合尝试新事物的一天，勇敢迈出第一步吧。"
    },
    reversed: {
      keywords: ["冲动", "犹豫", "鲁莽"],
      daily: "行动前请三思，不要因为一时冲动而失去方向。"
    }
  },
  {
    name: "The Magician",
    upright: {
      keywords: ["专注", "意志", "创造力"],
      daily: "专注于你的目标，你的能量会被世界回应。"
    },
    reversed: {
      keywords: ["分心", "拖延", "自我怀疑"],
      daily: "重新聚焦，别被琐事牵着走，找回掌控感。"
    }
  },
  {
    name: "The High Priestess",
    upright: {
      keywords: ["直觉", "内在智慧", "平静"],
      daily: "你已经知道答案，信任自己的直觉。"
    },
    reversed: {
      keywords: ["压抑", "焦虑", "迷茫"],
      daily: "放松自己，试着聆听内心真实的声音。"
    }
  }
];

// 简单随机函数
function randomChoice<T>(arr: T[]): T {
  const i = Math.floor(Math.random() * arr.length);
  return arr[i]!;
}

export function drawCard() {
  const card = randomChoice(DECK);
  const orientation: Orientation = Math.random() < 0.5 ? "upright" : "reversed";
  const data = orientation === "upright" ? card.upright : card.reversed;

  return {
    name: card.name,
    orientation,
    keywords: data.keywords,
    description: data.daily
  };
}