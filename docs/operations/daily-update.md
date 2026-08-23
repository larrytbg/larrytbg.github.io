# 自学总站每日更新

## 固定目标

- 每天北京时间 02:00 开始，目标 06:20 完成，最迟 06:30 发布。
- 仓库固定为 `D:\CodexProjects\codex自学习`。
- 正式网址固定为 `https://larrytbg.github.io/`，不另建站点。
- 质量顺序：来源真实、初学者能读懂、分析完整、更新数量、发布时间。

## 每日顺序

1. 归档当前线上版本，读取上一日审计和 `data/article-date-ledger.json`。
2. 在修改任何正文前保存语义基线：

   ```powershell
   node scripts/capture-article-baseline.mjs --site site --date YYYY-MM-DD --out data/article-baseline-YYYY-MM-DD.json
   ```

3. 依次扫描第一、第二、第三资源库；第二、第三库只在前一层不足时启用。
4. 核验资料来源，逐篇完成内容更新。原文日期能够核准时写入详情页，不能核准时隐藏，不写“待核”。
5. 生成当天审计 JSON。每个可以高亮的文章记录必须包含：
   - `target`：如 `daily/03`；
   - `changeType`：`new` 或 `updated`；
   - `changeSummary`：逐篇真实变化；
   - `sourceVerification.ok`：必须为 `true`。
6. 使用更新前基线和日期台账运行高亮验证：

   ```powershell
   node scripts/apply-daily-highlights.mjs --date YYYY-MM-DD --audit data/update-audit-YYYY-MM-DD.json --site site --baseline data/article-baseline-YYYY-MM-DD.json --ledger data/article-date-ledger.json
   ```

   这一步会先验证正文真实差异，再更新文章的本站日期台账。已有文章如果没有新增来源，必须新增带当天日期的 `data-substantive-update="YYYY-MM-DD"` 实质内容区块，否则拒绝高亮。

7. 把日期台账渲染到首页、专栏目录和文章详情页：

   ```powershell
   node scripts/apply-article-dates.mjs --site site --ledger data/article-date-ledger.json
   ```

8. 运行内容验收、内部链接、390px 手机及 1440px 电脑布局测试。
9. 测试全部通过后提交并推送 `main`，等待 GitHub Actions 成功，再检查正式网址。
10. 向“手机消息推送”任务发送简短完工消息；没有服务端成功回执时记录为失败。

## 日期标准

- 首页、今日必读和专栏目录以本站时间为主：新文章显示 `本站发布：YYYY-MM-DD`，真实补充新内容后显示 `本站更新：YYYY-MM-DD`。
- 文章详情页显示本站首次发布、本站最后更新；原文日期只在能够核准时显示。
- `资料发布日期待核` 和 `历史日期待核` 不得出现在公开页面。
- 当前文章的首次本站发布日期来自 Git 中该标题第一次出现的日期；整站重新构建不得改变它。

## 高亮判定

- `今日新增`：当天首次收录的新主题或新资料，即使复用了原有十项中的位置。
- `今日更新`：原主题和主要资料不变，但事实、数据、机制、例子、方法、局限或课程内容发生实质变化。
- 只改日期、排版、标点、标题或同义改写，不得进入当天高亮清单。
- 重新总结旧资料、复查链接或重新部署，不得进入当天高亮清单。
- 高亮程序必须比较更新前语义哈希；只有审计声明而没有正文差异时直接失败。
- `今日新增` 必须能够证明标题或主要来源发生变化；`今日更新` 必须有新增来源，或有带当天日期的实质更新区块。
- 每次运行先清除全部旧标记，再只添加当天审计中的标记；当天没有真实更新时标记数为 0。
- 测试夹具只用于自动测试，严禁作为当天真实更新发布。

## 失败处理

- 审计字段缺失、来源未核验、测试失败、部署失败或公网验证失败时，不发布半成品，保留上一版网站。
- 临时断网时保留检查点，按约 2 分钟、5 分钟、15 分钟重试。
- 未达到目标更新率必须汇报实际数量和比例，不能通过模板、改日期或同义改写凑数。

## 人工复核

发布前随机抽查每个专栏至少一篇，确认正文变化与审计 `changeSummary` 一致；检查首页和十一项专栏目录中的高亮集合与审计集合一致，并确认手机页面没有横向溢出。
