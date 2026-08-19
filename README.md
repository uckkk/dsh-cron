# dsh-cron · Cron 解析

解析 5 字段 cron 表达式，返回人类可读描述与接下来 N 次执行时间。纯 Node 实现。

## 提供的工具

| 工具 | 作用 |
|---|---|
| `cron_parse` | 解析 cron 表达式 → 描述 + 下次执行时间 |

## 安装

```bash
dsh plugin add dsh-cron
```
安装后在 profile 的 `package.json` 的 `dsh.profile.bundles` 中加入 `"dsh-cron"`。

## 用法示例

```
这个 cron 表达式什么时候跑
→ 调用 cron_parse(expr="*/5 * * * *", count=5)
```

## 安装

```bash
dsh plugin add github:uckkk/dsh-cron
```

> 安装即在本机运行第三方代码，请自行审阅源码。

## 安装

```bash
dsh plugin add github:uckkk/dsh-cron
```

## 使用

安装后在会话中调用该插件注册的工具即可。

## 许可

MIT

> 安装即在本机运行第三方代码，请自行审阅源码。
