# CEO 第 9 轮审视 — 修改计划

**日期**: 2026-03-16
**轮次**: 9
**运行模式**: Sprint
**Agent 团队**: engineering-database-optimizer, marketing-seo-specialist, design-ux-architect, engineering-senior-developer
**产品目标**: 日本企業データベース — SEO 驱动型企业查询平台

## 态势概览

- 上轮（第 8 轮）修复了 14 项（安全加固、SEO 基础、性能优化），但引发 3 次部署失败（误删 force-dynamic），已通过 hotfix 修复
- 当前部署：SHA 0d8a15c，状态 ✅ 稳定
- 本轮重点：遗留 `example.com` fallback 修复、OFFSET DoS 防护、DB 错误日志、UX 改善

## 团队报告摘要

### engineering-database-optimizer 报告要点
- `pageOffset()` 无上限，?page=99999 触发 OFFSET 49,999,950 → 全表扫描 + DoS
- DB `query()` 无 try/catch + 无错误日志，生产报错无从追查

### marketing-seo-specialist 报告要点
- 4 处 siteUrl fallback 残留 `'https://example.com'` → sitemap/robots/canonical/JSON-LD 全部输出错误域名
- robots.txt 用 route handler 实现（目录名含点），应迁移为 Next.js native robots.ts

### design-ux-architect 报告要点
- SearchBox 空提交静默失败（无任何用户反馈）
- Header 搜索入口是跳转链接，不是真正可输入的搜索框
- IndustryPage 侧边栏显示全国总数（pref.company_count），非该业界数 → 数字误导用户
- 移动端列表页翻页按钮位于长列表底部，体验差

### engineering-senior-developer 报告要点
- 上述问题全部有具体修复方案
- Breadcrumb.tsx 和 company/[id]/page.tsx 中 siteUrl fallback 同为 `'https://example.com'`

## 本轮修复计划（按优先级排序）

| # | 优先级 | 问题 | 修改文件 | 修改方案 |
|---|--------|------|----------|----------|
| 1 | P1 | `siteUrl` fallback `example.com` (4处) | robots.txt/route.ts, sitemap/[file]/route.ts, Breadcrumb.tsx, company/[id]/page.tsx | 改为 `'https://japanese-company-directory.vercel.app'` |
| 2 | P1 | `pageOffset()` 无 MAX_PAGE 保护 | src/lib/queries.ts | 添加 `MAX_PAGE=500`，safePage = min(max(1,page),MAX_PAGE) |
| 3 | P1 | `query()` 无错误日志 | src/lib/db.ts | 添加 try/catch + console.error 记录 sql+params |
| 4 | P2 | SearchBox 空提交无反馈 | src/components/SearchBox.tsx | 添加 showEmptyError state，显示提示文字 |
| 5 | P2 | Header 搜索入口是链接非输入框 | src/app/layout.tsx | 引入 SearchBox (size="sm")，desktop 显示，mobile 保留图标链接 |
| 6 | P2 | robots.txt 用 route handler 实现（非标准） | 迁移：创建 src/app/robots.ts，删除 src/app/robots.txt/route.ts | Next.js native MetadataRoute.Robots |
| 7 | P2 | IndustryPage 侧边栏 company_count 误导 | src/app/[slug]/page.tsx | 删除 IndustryPage 侧边栏的 company_count 显示 |
| 8 | P3 | 移动端翻页体验差（需滚动到底才能翻页） | src/app/[slug]/page.tsx, src/app/[slug]/[sub]/page.tsx | 在公司列表上方加移动端专用的简洁页码提示 |

## 延迟到下一轮

| 问题 | 原因 | 来源 Agent |
|------|------|------------|
| FULLTEXT ngram 搜索索引 | 需要 DB schema 变更，线上不中断迁移复杂 | engineering-database-optimizer |
| 分页前添加 JSON_TABLE 预计算 | 架构级重构 | engineering-database-optimizer |
| BreadcrumbList 最后一项缺 `item` URL | 需要向 Breadcrumb 组件添加 currentUrl prop，涉及所有调用方 | marketing-seo-specialist |
| 速率限制（API 防刷） | 需要 Redis/middleware，架构变更 | engineering-senior-developer |

## 给下一轮 CEO 的交接备忘
- 本轮重点：fallback 修复 + 防护加固 + UX 改善
- 下一轮建议重点：性能优化（DB 查询缓存命中率、CDN 配置）、内容深化（城市×业界页 SEO 元数据）
- 需要用户决策：DB 迁移 schema 变更（FULLTEXT 索引）
- 下一轮推荐 Agent 组合：performance-benchmarker, seo-specialist, content-creator, database-optimizer

## Dev-QA 验证记录

### 第 1 次验证
- 时间：2026-03-16
- 验证 Agent：Code Reviewer
- 结果：9/9 PASS（含旧文件删除确认）
- 失败项：无

### 最终判定：PASS

## 本轮修复执行状态

| # | 优先级 | 问题 | 状态 |
|---|--------|------|------|
| 1 | P1 | `example.com` fallback (4处) | ✅ |
| 2 | P1 | pageOffset() MAX_PAGE=500 | ✅ |
| 3 | P1 | query() 错误日志 | ✅ |
| 4 | P2 | SearchBox 空提交视觉反馈 | ✅ |
| 5 | P2 | Header 内联 SearchBox (desktop) | ✅ |
| 6 | P2 | robots.txt 迁移 native robots.ts | ✅ |
| 7 | P2 | IndustryPage 侧边栏移除误导总数 | ✅ |
| 8 | P3 | 移动端顶部分页 | ✅ |
