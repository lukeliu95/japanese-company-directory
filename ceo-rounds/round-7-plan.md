# CEO 第 7 轮审视 — 修改计划

**日期**: 2026-03-16
**轮次**: 7
**运行模式**: Sprint
**Agent 团队**: engineering-database-optimizer, engineering-frontend-developer
**产品目标**: 提升列表页性能，让页面显示更快

## 态势概览

- 部署状态：✅ 891c9b0 success（hotfix 后稳定）
- 上一轮：Round 6 + hotfix（回滚 connectionLimit/queueLimit）
- 当前性能瓶颈（列表页）：
  - IndustryPage / CrossPage 调用 `getAllPrefectures()`（未缓存，47-branch CASE 全表扫描）
  - `getIndustriesByPrefecture()` 无缓存（JSON_TABLE CROSS JOIN，被 3 处调用）
  - `getCitiesByPrefecture()` 无缓存（REGEXP_SUBSTR 全表扫描）
  - `resolvePageType()` 在 generateMetadata + page 组件中各调一次（双倍 DB 查询）
  - generateMetadata 调用完整分页查询（50条数据）仅为取 total 计数

## 本轮修复计划（按优先级排序）

| # | 优先级 | 问题 | 修改文件 | 修改方案 |
|---|--------|------|----------|----------|
| 1 ✅ | P0 | IndustryPage 调用未缓存 `getAllPrefectures()` | src/app/[slug]/page.tsx:217 | 替换为 `getCachedPrefectures()` |
| 2 ✅ | P0 | CrossPage 调用未缓存 `getAllPrefectures()` | src/app/[slug]/[sub]/page.tsx:267 | 替换为 `getCachedPrefectures()` |
| 3 ✅ | P1 | `getCitiesByPrefecture` 无缓存 | src/lib/queries.ts | 新增 `getCachedCitiesByPrefecture(unstable_cache, 24h)` |
| 4 ✅ | P1 | `getIndustriesByPrefecture` 无缓存，3处调用 | src/lib/queries.ts + [slug]+[sub] | 新增 `getCachedIndustriesByPrefecture(unstable_cache, 24h)` |
| 5 ✅ | P1 | `resolvePageType` 双重调用（generateMetadata + page 组件） | src/app/[slug]/[sub]/page.tsx | `React.cache` 包裹 `resolvePageType` |
| 6 ✅ | P1 | generateMetadata 调用完整分页查询仅为取 total | src/app/[slug]/page.tsx:46-65 | 改用 `getCachedPrefectures()/getCachedIndustries()` 读取 company_count |
| 7 ✅ | P2 | cross页generateMetadata调用完整分页查询仅为取 total | src/app/[slug]/[sub]/page.tsx:81 | 新增 `getCachedPrefectureIndustryCount`，替换完整查询 |

## 延迟到下一轮

| 问题 | 原因 |
|------|------|
| FULLTEXT ngram 索引替换 LIKE 搜索 | 需要 DB schema 变更 |
| React Suspense Streaming（侧边栏延迟加载） | 需要组件重构 |
| 分页列表查询缓存（第1页热点） | 需评估缓存存储成本 |
| prefecture/industry 预计算表 | 需要定时任务 |

## Dev-QA 验证记录

### 第 1 次验证
- 时间：2026-03-16
- 验证 Agent：general-purpose（Dev-QA 模式）
- 结果：9/9 PASS
- 失败项：无
- 新发现问题：`unstable_cache` key 不含参数（由框架自动合并）—— 属已知行为，非 bug

### 最终判定：PASS

## 给下一轮 CEO 的交接备忘

- 本轮重点：列表页服务端缓存
- 下一轮可考虑：Suspense Streaming、搜索 FULLTEXT 索引
- 警告：connectionLimit/queueLimit 激进降低需要真实监控数据支撑
