# 自学总站多模型任务协作 Implementation Plan

**Status:** 2026-08-24 已实施；下列复选框保留为执行时的原始步骤记录，实际结果与偏差以本页说明、运行文档和演练审计为准。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 D 盘自学总站登记为正式 Codex 项目，建立一个总控任务和四个固定模型分工任务，并把每日自动化安全迁移到新总控。

**Architecture:** 新总控直接运行在 D 盘主项目中并独占 `main` 发布权；四个分工任务直接运行在同一 D 盘项目中，通过任务消息向总控交付来源、初稿、复核和工程结果。四个任务按策略只读，总控在每次派工前后比较完整仓库内容指纹。旧自动化只有在新任务链完成一次不发布演练后才切换，C 盘 Codex 系统数据不移动、不删除。

**Tech Stack:** Codex Desktop 项目与任务工具、GPT-5.6 Sol/Terra/Luna、Git、Node.js、GitHub Pages、现有网站测试脚本。

> **2026-08-24 实施偏差说明：** Codex 默认 worktree 被创建在 C 盘，与“正式项目和项目临时空间优先放 D 盘”的用户要求冲突；迁移 worktree 的任务又未返回可读取正文。因此正式工作任务改为直接在 D 盘项目创建，通过任务策略保持只读，并由总控在每次派工前后核对分支、`HEAD`、索引及全部已跟踪和未跟踪文件的内容哈希。当前 Codex 不提供单任务操作系统级只读沙箱，`publishAllowed=false` 不能冒充技术权限隔离。

---

### Task 1: 登记并核验 D 盘正式项目

**Files:**
- Read: `D:\CodexProjects\codex自学习\.git`
- Read: `D:\CodexProjects\codex自学习\docs\operations\daily-update.md`
- No file modifications

- [ ] **Step 1: 记录当前 Codex 项目列表**

调用 Codex 项目列表工具，确认当前列表中尚无路径 `D:\CodexProjects\codex自学习`。

Expected: 没有该路径，旧任务仍显示旧 C 盘工作目录。

- [ ] **Step 2: 通过 Codex Desktop 把 D 盘目录添加为项目**

选择现有文件夹 `D:\CodexProjects\codex自学习`，不得复制目录、创建新仓库或更改远程地址。

Expected: 新项目名称为“codex自学习”或“自学总站”，路径精确指向 D 盘目录。

- [ ] **Step 3: 重新读取项目列表核验**

Expected:

- `path` 等于 `D:\CodexProjects\codex自学习`；
- `isGitRepository` 等于 `true`；
- 返回稳定 `projectId`，供后续任务创建使用。

- [ ] **Step 4: 核对仓库没有意外变化**

Run:

```powershell
git -C "D:\CodexProjects\codex自学习" status --short --branch
git -C "D:\CodexProjects\codex自学习" remote -v
```

Expected: 项目登记没有生成文件，没有改变 `origin`，主分支仍为 `main`。

### Task 2: 创建新总控任务

**Files:**
- Read: `docs/operations/daily-update.md`
- Read: `docs/superpowers/specs/2026-08-24-multi-model-project-orchestration-design.md`
- No file modifications

- [ ] **Step 1: 在已登记项目中创建本地总控任务**

创建参数：

- 名称：`自学总站｜总控与发布`
- 模型：`gpt-5.6-sol`
- 推理强度：`high`
- 环境：已登记项目的 `local`

初始提示必须要求它读取上述两个文档，声明它是唯一发布者，并且在收到明确派工前不立即更新网站。

- [ ] **Step 2: 等待任务准备完成**

Expected: 返回正式 `threadId` 和 `hostId=local`，状态为可接收消息；不能把 `clientThreadId` 当作正式任务 ID。

- [ ] **Step 3: 固定标题并置顶**

Expected: 侧边栏显示 `自学总站｜总控与发布`，并位于置顶任务区域。

### Task 3: 创建四个按策略只读的分工任务

**Files:**
- Read: `docs/superpowers/specs/2026-08-24-multi-model-project-orchestration-design.md`
- No file modifications

- [ ] **Step 1: 创建来源扫描任务**

- 名称：`自学总站｜来源扫描`
- 模型：`gpt-5.6-luna`
- 推理强度：`medium`
- 环境：该项目的 `local`
- 硬边界：只返回来源候选，不写网站、不提交、不发布。

- [ ] **Step 2: 创建内容撰写任务**

- 名称：`自学总站｜内容撰写`
- 模型：`gpt-5.6-terra`
- 推理强度：`medium`
- 环境：该项目的 `local`
- 硬边界：只使用总控提供的已核验资料包，不补充包外事实，不写正式网站、不发布。

- [ ] **Step 3: 创建事实复核任务**

- 名称：`自学总站｜事实复核`
- 模型：`gpt-5.6-sol`
- 推理强度：`high`
- 环境：该项目的 `local`
- 硬边界：只输出逐篇通过、退回和原因，不写正式网站、不发布。

- [ ] **Step 4: 创建网站工程任务**

- 名称：`自学总站｜网站工程`
- 模型：`gpt-5.6-terra`
- 推理强度：`high`
- 环境：该项目的 `local`
- 硬边界：只处理总控明确批准的内容和测试，不向 `main` 推送、不发布。

- [ ] **Step 5: 等待四个任务全部准备完成**

Expected: 每个任务都有不同的正式 `threadId`，均属于同一 D 盘项目，并显示正确模型和标题。

### Task 4: 保存任务登记表和运行规则

**Files:**
- Create outside repository: `D:\CodexCache\self-learning-orchestration\task-orchestration.json`
- Create: `docs/operations/multi-model-orchestration.md`
- Modify: `docs/operations/daily-update.md`

- [ ] **Step 1: 用真实工具返回值创建任务登记表**

私有登记表必须使用 `schemaVersion=1` 和固定项目路径 `D:\CodexProjects\codex自学习`。`projectId`、总控 `threadId`、四个工作任务 `threadId` 与 `hostId` 必须直接复制本次工具返回值。总控保存 `model=gpt-5.6-sol`、`thinking=high`、`publishAllowed=true`；四个工作任务按 `source_scan`、`content_draft`、`fact_review`、`site_engineering` 写入 `workers`，分别保存实际模型、推理强度和 `publishAllowed=false`。登记表不得提交到公开仓库；禁止编造 ID、推测 ID或保留说明文字作为字段值。

- [ ] **Step 2: 写入任务间交付规则**

`docs/operations/multi-model-orchestration.md` 必须写明：派工顺序、交付字段、返工次数、并发上限、只有总控可发布、任务失败时由总控接管。

- [ ] **Step 3: 更新每日操作文档**

在 `docs/operations/daily-update.md` 的每日顺序中加入：读取私有登记表、按阶段派工、等待结果、记录各任务模型与交付状态。不得删除现有基线、日期、高亮、审计和测试规则。

- [ ] **Step 4: 检查登记表和文档**

Run:

```powershell
Get-Content -Raw "D:\CodexCache\self-learning-orchestration\task-orchestration.json" | ConvertFrom-Json | Format-List
rg -n "source_scan|content_draft|fact_review|site_engineering" docs/operations/multi-model-orchestration.md docs/operations/daily-update.md
git diff --check
```

Expected: JSON 可解析，五个任务均有真实 ID，四个工作任务均禁止发布，文档没有占位符或换行错误。

- [ ] **Step 5: 提交登记表和规则**

```powershell
git add docs/operations/multi-model-orchestration.md docs/operations/daily-update.md
git commit -m "ops: register multi-model task orchestration"
```

### Task 5: 进行不发布的协作演练

**Files:**
- Read outside repository: private task registry
- Create: `data/orchestration-dry-run-2026-08-24.json`
- No website content modifications

- [ ] **Step 1: 来源扫描演练**

总控向来源扫描任务发送一个只读任务：从一个 A 级正式来源中找出一条候选信息，返回标题、链接、发布日期、来源等级和适用专栏；明确禁止写文件和发布。

Expected: 返回结构完整，未修改任何网站文件。

- [ ] **Step 2: 内容初稿演练**

总控把上一步的已核验资料包原样发送给内容撰写任务，要求生成一段不进入网站的初稿。

Expected: 初稿没有资料包外事实，清楚区分来源事实与解释。

- [ ] **Step 3: 事实复核演练**

总控把资料包和初稿发送给事实复核任务。

Expected: 返回通过或退回、逐项理由、来源日期判断和仍不确定内容。

- [ ] **Step 4: 网站工程演练**

向网站工程任务发送“只检查、不修改”的模拟集成请求，要求列出若正式发布需要运行的基线、高亮、日期、链接和布局测试。

Expected: 不修改网站、不提交、不推送，返回的测试顺序与 `docs/operations/daily-update.md` 一致。

- [ ] **Step 5: 保存演练审计**

`data/orchestration-dry-run-2026-08-24.json` 记录五个任务 ID、模型、开始结束时间、是否越权写入、交付是否通过和发现的问题。

- [ ] **Step 6: 核对主仓库未被工作任务污染**

Run:

```powershell
git status --short
git diff -- site data/article-date-ledger.json
```

Expected: `site` 和日期台账没有演练造成的变化；只出现演练审计文件。

- [ ] **Step 7: 提交演练审计**

```powershell
git add data/orchestration-dry-run-2026-08-24.json
git commit -m "test: record multi-model orchestration dry run"
```

### Task 6: 迁移每日自动化

**Files:**
- Read: `%CODEX_HOME%\automations\automation\automation.toml`
- Read outside repository: private task registry
- No direct filesystem edits to automation configuration

- [ ] **Step 1: 读取现有自动化状态**

使用 Codex 自动化查看工具读取 ID `automation`，记录名称、时间、状态、原目标任务和完整提示。

Expected: 名称为“自学总站每日更新”，每天北京时间 02:00 运行，当前目标是旧任务。

- [ ] **Step 2: 更新自动化目标和提示**

使用自动化更新工具：

- 保持 ID、名称、02:00 计划和启用状态不变；
- 把目标任务改成新总控任务的真实 `threadId`；
- 在提示开头要求读取私有任务登记表与 `docs/operations/multi-model-orchestration.md`；
- 明确必须复用四个固定工作任务，不得每天新建任务；
- 保留原有来源、基线、高亮、日期、测试、GitHub Pages和手机汇报要求。

- [ ] **Step 3: 再次查看自动化确认**

Expected: 只存在一条启用的“自学总站每日更新”；目标是新总控；仍为每日 02:00；没有重复自动化。

### Task 7: 最终验证与交接

**Files:**
- Read outside repository: private task registry
- Read: `data/orchestration-dry-run-2026-08-24.json`
- Read: `docs/operations/daily-update.md`
- Read: `docs/operations/multi-model-orchestration.md`

- [ ] **Step 1: 重新列出项目和任务**

Expected: D 盘正式项目存在；新总控和四个工作任务名称、项目、模型、推理强度及状态正确。

- [ ] **Step 2: 运行项目现有测试**

Run:

```powershell
node tests/article-baseline.test.mjs
node tests/article-timeline.test.mjs
node tests/daily-highlights.test.mjs
node tests/internal-links.test.mjs
node tests/visual-style.test.mjs
```

Expected: 全部退出码为 0；本次任务拆分没有破坏网站内容和测试。

- [ ] **Step 3: 检查 Git 状态与提交历史**

Run:

```powershell
git status --short --branch
git log -5 --oneline --decorate
```

Expected: 工作区干净；设计、实施规则和演练审计都有清晰提交。

- [ ] **Step 4: 向新总控发送正式交接消息**

交接消息包含：正式项目路径、四个工作任务 ID、自动化 ID、唯一发布权、手机推送任务 ID和下一次运行时间。新总控必须回复已读取登记表和操作文档。

- [ ] **Step 5: 向用户汇报**

汇报项目登记结果、五个任务及模型、演练结果、自动化目标、C盘未移动内容和下一次自动运行时间。用户确认新总控可用后，再单独归档旧任务；归档前不删除旧会话文件。
