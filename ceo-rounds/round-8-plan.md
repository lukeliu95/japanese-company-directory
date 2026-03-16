# CEO 第 8 轮审视 — 修改计划

**日期**: 2026-03-16
**轮次**: 8
**运行模式**: Full
**Agent 团队**: marketing-seo-specialist, design-ux-architect, engineering-security-engineer, engineering-senior-developer, testing-performance-benchmarker
**产品目标**: 提升整体产品质量——SEO 可发现性、安全性、性能

## 态势概览

- 部署状态：✅ e665863 success（Round 7 缓存修复已上线）
- 上一轮：Round 7（列表页服务端缓存全面覆盖）
- 本轮发现：5 个 Agent 并行审视，发现 15 个问题

## 本轮修复计划（按优先级排序）

| # | 优先级 | 问题 | 修改文件 | 修改方案 |
|---|--------|------|----------|----------|
| 1 ✅ | P0 | `force-dynamic` 覆盖 `revalidate`，首页 ISR 失效 | src/app/page.tsx | 删除第11行 `export const dynamic = 'force-dynamic'`，revalidate 改为 3600 |
| 2 ✅ | P0 | `metadataBase` 缺失，所有列表页 canonical URL 为相对路径（无效） | src/app/layout.tsx | 在 metadata 对象添加 `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://japanese-company-directory.vercel.app')` |
| 3 ✅ | P0 | 数据库密码明文硬编码在源码中 | src/lib/db.ts | 移除密码/用户名/host 的 hardcode fallback，仅保留 port/database/charset 安全默认值 |
| 4 ✅ | P0 | sitemap 路由均有 `force-dynamic`+`revalidate` 矛盾；areas.xml 使用未缓存查询（47次并发 DB 调用） | sitemap.xml/route.ts, areas.xml/route.ts, industries.xml/route.ts | 移除 `force-dynamic`；areas.xml 改用 getCachedPrefectures/getCachedCitiesByPrefecture；industries.xml 改用 getCachedIndustries |
| 5 ✅ | P1 | 缺少 HTTP 安全头（X-Frame-Options, X-Content-Type-Options, HSTS 等） | next.config.ts | 添加 headers() 配置 + images.remotePatterns |
| 6 ✅ | P1 | SITE_URL fallback 为 `https://example.com`，影响 sitemap/JSON-LD/canonical | 多个文件 | 替换为 `https://japanese-company-directory.vercel.app` |
| 7 ✅ | P1 | `[slug]/page.tsx` 缺少 `generateStaticParams`，ISR 在首次访问才生成（冷启动慢） | src/app/[slug]/page.tsx | 导出 generateStaticParams，预构建 47 都道府県 + 所有行业页 |
| 8 ✅ | P1 | 列表页 generateMetadata 缺少 openGraph，社交分享无预览图 | src/app/[slug]/page.tsx | 为 Prefecture/Industry generateMetadata 添加 openGraph 字段 |
| 9 ✅ | P1 | 搜索 API 无输入长度限制；searchCompanies LIKE 未转义 `%`/`_` 元字符（注入风险） | src/app/api/search/route.ts, src/lib/queries.ts | 添加 100 字符长度限制；添加 escapeLike() 辅助函数 |
| 10 ✅ | P2 | SearchResults.tsx 搜索结果标签显示原始值（含"業界の会社"等后缀） | src/app/search/SearchResults.tsx | 标签渲染时清理后缀 |
| 11 ✅ | P2 | layout.tsx 使用裸 `<img>` 加载外部 logo，无 LCP 优化，no width/height | src/app/layout.tsx | 改用 next/image `<Image priority>` |
| 12 ✅ | P2 | city/cross 页 generateMetadata 缺少 openGraph | src/app/[slug]/[sub]/page.tsx | 添加 openGraph 字段 |
| 13 ✅ | P2 | Pagination 组件 `gap-1` 导致移动端触摸目标过小（<44px） | src/components/Pagination.tsx | gap-1 → gap-2 |
| 14 ✅ | P2 | `getCachedRecentCompanies` cache key 不含 limit 参数，不同 limit 调用会命中同一缓存 | src/lib/queries.ts | cache key 改为 `['recent-companies', String(limit)]` |

## 延迟到下一轮

| 问题 | 原因 |
|------|------|
| 数据库密码轮换（AWS RDS + Vercel env var） | 需要用户操作；已移除代码中的 hardcode |
| SSL `rejectUnauthorized: true` | 需要配置 AWS RDS CA 证书 |
| 搜索 API 速率限制 | 需要 Upstash KV 外部依赖 |
| Header 搜索框重设计 | 较大 UX 重构 |
| `[slug]/[sub]/page.tsx` generateStaticParams | 城市页+cross页组合数量极大，需要评估构建预算 |
| CSP Content-Security-Policy | 需要详细配置，避免破坏现有功能 |

## Dev-QA 验证记录

### 第 1 次验证
- 时间：2026-03-16
- 验证 Agent：general-purpose（Dev-QA 模式）
- 结果：14/14 PASS
- 失败项：无
- 新发现问题：CrossPage Pagination basePath 未 encodeURIComponent（当前 industrySlug 均为 ASCII，实际无影响）—— 记入延迟项

### 最终判定：PASS

## 给下一轮 CEO 的交接备忘

- 本轮重点：安全加固 + SEO 基础修复 + 性能小优化
- 下一轮可考虑：FULLTEXT 搜索索引、Suspense Streaming、generateStaticParams for [sub]
- 警告：需提醒用户在 Vercel 中设置 MYSQL_PASSWORD 等环境变量，并在 AWS RDS 轮换密码
