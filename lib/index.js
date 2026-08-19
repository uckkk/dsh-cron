// dsh-cron — cron 表达式解析（DeepSeek Harness）。
// 解析 5 字段 cron 表达式，计算接下来 N 次执行时间，并给出人类可读描述。纯 Node。
import { defineTool } from "@deepseek-ai/dsh-tools";

const name = "Cron 解析";
const inject = ["tools"];

const FIELD_NAMES = ["分钟", "小时", "日", "月", "星期"];

function parseField(field, min, max, names) {
  // 返回 { values: Set, desc: string }
  const parts = String(field).split(",");
  const values = new Set();
  const descs = [];
  for (const part of parts) {
    if (part === "*" || part === "?") {
      for (let v = min; v <= max; v++) values.add(v);
      descs.push("每" + (names ? "个" : ""));
      continue;
    }
    const stepMatch = /^\*\/(\d+)$/.exec(part);
    if (stepMatch) {
      const step = Number(stepMatch[1]);
      for (let v = min; v <= max; v += step) values.add(v);
      descs.push(`每 ${step} ${names || "个单位"}`);
      continue;
    }
    const rangeMatch = /^(\d+)-(\d+)$/.exec(part);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]), b = Number(rangeMatch[2]);
      for (let v = a; v <= b; v++) values.add(v);
      descs.push(`${a} 到 ${b}`);
      continue;
    }
    const rangeStepMatch = /^(\d+)-(\d+)\/(\d+)$/.exec(part);
    if (rangeStepMatch) {
      const a = Number(rangeStepMatch[1]), b = Number(rangeStepMatch[2]), step = Number(rangeStepMatch[3]);
      for (let v = a; v <= b; v += step) values.add(v);
      descs.push(`${a} 到 ${b} 每 ${step}`);
      continue;
    }
    if (/^\d+$/.test(part)) {
      const v = Number(part);
      if (v >= min && v <= max) { values.add(v); descs.push(String(v)); }
    }
  }
  return { values, desc: descs.join("、") };
}

function cronMatches(expr, date) {
  const [minF, hourF, dayF, monthF, dowF] = expr.trim().split(/\s+/);
  const min = parseField(minF, 0, 59);
  const hour = parseField(hourF, 0, 23);
  const day = parseField(dayF, 1, 31);
  const month = parseField(monthF, 1, 12);
  const dow = parseField(dowF, 0, 7);
  const dowVal = date.getUTCDay(); // 0=Sun..6=Sat
  const dowOk = dow.values.has(dowVal) || (dow.values.has(7) && dowVal === 0);
  return min.values.has(date.getUTCMinutes())
    && hour.values.has(date.getUTCHours())
    && day.values.has(date.getUTCDate())
    && month.values.has(date.getUTCMonth() + 1)
    && dowOk;
}

function humanDesc(expr) {
  const [minF, hourF, dayF, monthF, dowF] = expr.trim().split(/\s+/);
  const m = parseField(minF, 0, 59).desc;
  const h = parseField(hourF, 0, 23).desc;
  const d = parseField(dayF, 1, 31).desc;
  const mo = parseField(monthF, 1, 12).desc;
  const dow = parseField(dowF, 0, 7).desc;
  return `分钟[${m}] 小时[${h}] 日[${d}] 月[${mo}] 星期[${dow}]`;
}

function nextRuns(expr, count, from) {
  const runs = [];
  let t = new Date(from);
  t.setUTCSeconds(0, 0);
  t.setUTCMinutes(t.getUTCMinutes() + 1); // 从下一分钟开始
  let guard = 0;
  while (runs.length < count && guard < 525600) { // 最多扫一年
    if (cronMatches(expr, t)) runs.push(new Date(t));
    t.setUTCMinutes(t.getUTCMinutes() + 1);
    guard++;
  }
  return runs;
}

async function apply(ctx, _config) {
  ctx.tools.register(defineTool({
    name: "cron_parse",
    description:
      "解析 5 字段 cron 表达式（分 时 日 月 周），返回人类可读描述 + 接下来 N 次执行时间（ISO 格式）。用于理解/调试 cron 定时任务。`expr` 传 cron 表达式；`count` 默认 5；`from` 传起始时间（ISO，默认当前时间）。",
    parameters: {
      expr: { type: "string", required: true, description: "5 字段 cron 表达式，如 \"*/5 * * * *\"。" },
      count: { type: "integer", description: "计算接下来多少次执行，默认 5。" },
      from: { type: "string", description: "起始时间（ISO），默认当前时间。" },
    },
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          description: { type: "string", required: true },
          nextRuns: { type: "array", required: true, items: { type: "string" } },
          count: { type: "integer", required: true },
        },
      },
      render: (_args, value) => [{
        type: "text",
        text: `cron 解析：${value.description}\n接下来 ${value.count} 次执行：\n${value.nextRuns.map((t) => "  - " + t).join("\n")}`,
      }],
    },
    execute: async (args) => {
      const expr = args.expr;
      const parts = expr.trim().split(/\s+/);
      if (parts.length !== 5) throw new Error(`cron 表达式应为 5 字段（分 时 日 月 周），得到 ${parts.length} 字段`);
      const count = args.count || 5;
      const from = args.from ? new Date(args.from) : new Date();
      if (isNaN(from.getTime())) throw new Error("from 时间格式无效");
      const runs = nextRuns(expr, count, from);
      return {
        description: humanDesc(expr),
        nextRuns: runs.map((d) => d.toISOString()),
        count: runs.length,
      };
    },
  }));
}

export { apply, inject, name };
