# 8月22日第二轮扩充 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 不赶时间、不降低详细程度，在逐篇核对来源和内容质量的前提下，为自学总站再增加25篇有针对性的实质补充，把当天真实更新从5篇提高到30篇。

**Architecture:** 保留已经发布的5篇来源型更新；从其余文章中选择25篇，逐篇重读标题、正文和原始来源，增加独立的“第二轮深度补充”。每篇必须有不同的核心问题、原始资料提炼、白话解释、具体场景、执行步骤、停止条件和局限，并保留来源发布日期。宁可延长工作时间也不批量套话；审计按页面标记实际计数，未达到80%时继续如实显示。

**Tech Stack:** Node.js静态页面脚本、HTML、JSON审计、GitHub Pages、Playwright移动端验证。

---

### Task 1: 建立第二轮验收测试

**Files:**
- Create: `tests/publish-2026-08-22-round2.test.mjs`

- [ ] **Step 1:** 检查110篇文章仍完整。
- [ ] **Step 2:** 检查第一轮5篇来源型更新仍存在。
- [ ] **Step 3:** 检查第二轮恰好25篇，并且每篇有不同的主题补充、具体场景、执行步骤、停止条件和原来源链接。
- [ ] **Step 4:** 检查总实质更新为30/110，来源发布日期没有批量改成8月22日。
- [ ] **Step 5:** 先运行测试并确认失败，因为第二轮内容尚不存在。

### Task 2: 生成25篇逐篇补充

**Files:**
- Create: `scripts/publish-2026-08-22-round2.mjs`
- Modify: `site/column/*/*/index.html`

- [ ] **Step 1:** 选择Codex 3篇、每日资讯4篇、金融3篇、财务2篇、论文3篇、健康3篇、哲学1篇、逻辑1篇、管理1篇、历史1篇、TED 3篇。
- [ ] **Step 2:** 从每篇页面读取自己的标题、摘要和原始来源链接，不新增资料包外事实。
- [ ] **Step 3:** 为每篇完整写清原始资料内容、白话解释、具体场景、三步行动、停止条件和局限；内容与该文主题直接对应，不设赶工式压缩。
- [ ] **Step 4:** 只把这25篇的本站最后实质更新日期设为2026-08-22，来源发布日期保持不变。
- [ ] **Step 5:** 运行测试，预期第二轮25篇全部通过。

### Task 3: 更新真实审计与归档

**Files:**
- Modify: `site/audit/index.html`
- Modify: `site/audit/update-2026-08-22.json`
- Modify: `data/update-audit-2026-08-22.json`
- Modify: `site/archive/index.html`
- Modify: `site/index.html`

- [ ] **Step 1:** 审计改为30/110、27.3%，明确仍未达到80%。
- [ ] **Step 2:** 分开列出第一轮5篇来源型更新与第二轮25篇应用型更新。
- [ ] **Step 3:** 首页和8月22日归档只更新当日真实数量，不改写8月16日等历史归档。
- [ ] **Step 4:** 运行全部验收测试。

### Task 4: 发布与验证

**Files:**
- Test: `tests/publish-2026-08-22.test.mjs`
- Test: `tests/publish-2026-08-22-round2.test.mjs`

- [ ] **Step 1:** 检查194个页面全部站内链接。
- [ ] **Step 2:** 用390px与1440px检查首页、审计和抽样文章无横向溢出。
- [ ] **Step 3:** 独立代码审查，阻断问题必须修复。
- [ ] **Step 4:** 提交并推送原仓库main，等待GitHub Pages成功。
- [ ] **Step 5:** 公网验证原网址与审计页，随后调用手机消息推送任务并如实记录结果。
