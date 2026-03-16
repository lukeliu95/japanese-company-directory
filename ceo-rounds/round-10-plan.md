# CEO 第 10 轮审视 — 修改计划

**日期**: 2026-03-16
**轮次**: 10
**运行模式**: Sprint
**Agent 团队**: engineering-senior-developer, engineering-database-optimizer, design-ux-architect, marketing-seo-specialist（Round 9 后台报告）
**产品目标**: 日本企業データベース — SEO 驱动型企业查询平台

## 态势概览

- 第 9 轮 8 项全部修复，部署成功（SHA 22c9f45）
- 后台 4 个 Agent 完成 Round 9 全量代码审视，提交完整报告
- 已在 Round 9 修复的问题（example.com fallback、robots.ts、SearchBox 空提交、Header 搜索、移动端分页等）不再重复
- 本轮处理报告中新发现的可执行修复项

## 报告中已修复（Round 9）的误报确认

| Agent 报告 | 问题 | 状态 |
|---|---|---|
| UX P0-2: Header 搜索非 SearchBox | ✅ Round 9 已修复 |
| UX P0-1: SearchBox 空提交 | ✅ Round 9 已修复 |
| SEO P0: example.com fallback | ✅ Round 9 已修复 |
| SEO P1-1: robots.txt 迁移 | ✅ Round 9 已修复 |
| Dev P1-2/P1-3: DB 日志/MAX_PAGE | ✅ Round 9 已修复 |
| UX P1-1: city_slug 非日文 | ❌ 误报（city_slug 是 REGEXP_SUBSTR 提取的日文市名） |
| SEO P1-3: openGraph url 相对路径 | ❌ 误报（metadataBase 已设置，Next.js 自动拼接） |
| SEO P3-3: ItemList numberOfItems | ❌ 误报（total 是语义正确的总量，items.length 是当前页） |

## 本轮修复计划（按优先级排序）

| # | 优先级 | 问题 | 修改文件 | 修改方案 |
|---|--------|------|----------|----------|
| 1 | P1 | industries.xml sitemap 含1,833个交叉页（含空数据），薄内容风险 | src/app/sitemap/industries.xml/route.ts | 用 getCachedIndustriesByPrefecture 过滤，只输出有数据的组合 |
| 2 | P2 | Footer 行业名显示 "IT業界の会社" 而非 "IT業界"，与其他地方不一致 | src/app/layout.tsx | 添加 .replace 清理 |
| 3 | P2 | DB 连接池 connectionLimit=5 在并发场景极易耗尽 | src/lib/db.ts | 提升至 10 |
| 4 | P2 | 企业详情页「代表取締役」硬编码，非株式会社形态企业显示错误 | src/app/company/[id]/page.tsx | 改为 "代表者" 通用标签 |
| 5 | P2 | Organization JSON-LD `founder` 字段语义错误（代表者≠创始人） | src/app/company/[id]/page.tsx | 改为 `member` 类型 + roleName |

## 延迟到下一轮

| 问题 | 原因 |
|------|------|
| searchCompanies FULLTEXT 索引 | 需 DB schema 变更 + ngram parser 配置 |
| JSON_SEARCH 迁移多值索引 | 需 DB schema 变更 |
| BreadcrumbList 最后一项 `item` | 需 Breadcrumb API 扩展 + 所有调用方改造 |
| CrossPage 侧边栏推荐精准化 | 需新增 API，架构变更 |
| unstable_cache key 细粒度 tags | 低风险（Next.js 已自动追加参数到 key） |

## Dev-QA 验证记录

### 验证结果
- TypeScript 编译：✅ 零错误
- 修复均为 ≤10 行改动，低回归风险
- industries.xml 使用已缓存的 getCachedIndustriesByPrefecture，无新 DB 调用风险

### 最终判定：PASS

## 本轮修复执行状态

| # | 优先级 | 问题 | 状态 |
|---|--------|------|------|
| 1 | P1 | industries.xml 过滤零数据交叉页 | ✅ |
| 2 | P2 | Footer 行业名清理 | ✅ |
| 3 | P2 | DB 连接池 5 → 10 | ✅ |
| 4 | P2 | 代表者标题 "代表取締役" → "代表者" | ✅ |
| 5 | P2 | Organization JSON-LD founder → member | ✅ |
