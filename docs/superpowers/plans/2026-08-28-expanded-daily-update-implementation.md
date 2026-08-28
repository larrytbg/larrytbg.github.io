# 2026-08-28 Expanded Daily Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 2026-08-28 已发布的 8 篇真实更新扩大到最多 15 篇，并完成同日重新发布。

**Architecture:** 总控检索并筛选新增 A 级来源，复用既有 Terra 与 Sol 固定任务完成两阶段只读处理；只有总控合并内容、生成审计、运行测试并发布。当天已使用的 Luna 与 Spark 不再重复调用。

**Tech Stack:** Node.js ESM、静态 HTML、JSON 审计与日期台账、GitHub Pages、GitHub Actions。

---

### Task 1: 建立续发证据包

**Files:**
- Create outside repository: `daily/2026-08-28/expansion-source-package.json`
- Read: `data/update-audit-2026-08-28.json`

- [ ] 核对 `main`、干净工作树、当前 8 篇审计和当天原始基线。
- [ ] 检索过去 24 小时的 A 级来源，并排除当前审计及 8 月 27 日审计的重复来源。
- [ ] 只保留能核准发布日期、3—5 条关键事实和明确边界的候选，最多 7 篇。

### Task 2: 生成与复核新增深度稿

**Files:**
- Read outside repository: expansion evidence package
- Reuse fixed read-only tasks: `content_draft`, `fact_review`

- [ ] 每次派工前捕获仓库指纹，返回后立即验证无越权变化。
- [ ] Terra 每批最多五篇，用两轮以内生成七段式深度稿。
- [ ] Sol 每批最多五篇，用两轮以内返回 PASS、REVISE 或 REJECT。
- [ ] 只应用最小事实修订；一次修订后仍不通过的条目当天放弃。

### Task 3: 测试驱动地扩展发布脚本

**Files:**
- Modify: `tests/daily-2026-08-28-content.test.mjs`
- Modify: `scripts/publish-2026-08-28.mjs`
- Create outside repository: final merged approved JSON

- [ ] 先修改专项测试，使其期望最终审计数量、分类、目标集合和新增详情页。
- [ ] 运行专项测试并确认因仍为 8 篇而失败。
- [ ] 最小修改发布脚本，使它接受合并后的 15 篇批准包并重新生成同日输出。
- [ ] 运行专项测试并确认全部通过。

### Task 4: 完整验证与重新发布

**Files:**
- Modify: `data/update-audit-2026-08-28.json`
- Modify: `data/article-date-ledger.json`
- Modify: `site/**`

- [ ] 运行当日内容、时间线、基线、高亮、内部链接、样式和浏览器高亮测试。
- [ ] 扫描新增行，确认没有内部任务 ID、本机私有路径或私有登记表泄漏。
- [ ] 请求独立只读差异审查并处理 Critical/Important 问题。
- [ ] 提交并推送 `main`，等待 GitHub Actions 成功。
- [ ] 核验 `https://larrytbg.github.io/` 与公开审计返回 HTTP 200 并包含最终数量。
- [ ] 发送手机完工通知，记录 `status=accepted` 和非空消息 ID。
