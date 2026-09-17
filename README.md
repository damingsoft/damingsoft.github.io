# 大名软件开发博客

https://devblogs.damingsoft.com

## 本地构建

1. 安装好 ruby 环境
2. `bundler install`
3. `bundle exec jekyll serve -P 5555 --trace --host=0.0.0.0`

如果 gem 里没有 `jekyll-paginate` 和 `jekyll-feed`，先装：

```bash
gem install jekyll-paginate jekyll-feed
```

不想走 bundler（`plainwhite.gemspec` 里钉了 `rake ~> 12.0`，本地 rake 版本对不上会直接报错）时，
可以跳过 bundler 直接跑：

```bash
JEKYLL_NO_BUNDLER_REQUIRE=true jekyll serve --host 127.0.0.1 --port 4321
```

## 站点结构（AEO / SEO / GEO 相关）

### 结构化数据（JSON-LD）

**这里的 `_plugins/` 不会有自定义 Ruby 插件。** 本仓库由 GitHub Pages 以 safe 模式构建，
`_plugins/*.rb` 不会被执行，所以所有结构化数据都用纯 Liquid 写在 `_includes/schemas/` 下，
由 `_includes/head.html` 通过 `_includes/schemas/structured-data.html` 按页面类型分发：

| 文件 | 作用 | 出现位置 |
| --- | --- | --- |
| `schemas/website.html` | Organization + WebSite（含站内搜索 SearchAction） | 首页 |
| `schemas/breadcrumb.html` | BreadcrumbList | 除首页外所有页面 |
| `schemas/item-list.html` | ItemList（文章清单） | 首页、分类页、标签页 |
| `schemas/demo-list.html` | ItemList + WebApplication × 9 | /demos/ |
| `schemas/faq.html` | FAQPage（读 front matter 的 `faq`） | 有 `faq` 的页面 |

文章的 BlogPosting 由 `jekyll-seo-tag` 输出，这里只补它没有的实体，避免同一实体出现两份。
代价是首页会有两个 WebSite 节点（gem 一个、这里一个），Google 会按 URL 合并；
CodePool 用 `_plugins/seo_tag_patch.rb` 关掉 gem 自带的 JSON-LD 来彻底解决，
但那套机制在 GitHub Pages 上不生效，所以这里不做。

新增 FAQ 只要在页面 front matter 里写：

```yaml
faq:
  - q: 问题？
    a: 直接回答。
```

可见的问答 HTML 与 FAQPage 读的是同一份数据，改一处两处同步。

### 给 AI / 搜索引擎的入口

- `robots.txt`：显式允许主流生成式 AI 爬虫与国内搜索引擎爬虫，并指向 sitemap。
- `llms.txt`（`permalink: /llms.txt`）：站点说明 + 全部在线工具 + 全部文章的自述文件。
- `sitemap.xml`：需要 `_config.yml` 里的 `url`（以前没配，`<loc>` 全是空的）。
- `feed.xml`：由 `jekyll-feed` 生成，head 里的 `{% feed_meta %}` 输出订阅链接。
- `/page2/` 之后的分页页在 `<head>` 里标了 `noindex, follow`，并且不进 sitemap。

### 在线演示工具

工具本体托管在 `www.dynamsoft.com/codepool/demos/`，**不复制到本仓库**：Dynamsoft SDK 的许可证
绑定域名，拷过来只会拿到一个跑不起来的页面。本仓库负责中文说明、分组导航和教程入口。

单一数据源是 `_data/demos.yml`（`_data/demo_categories.yml` 管分组）：

- `/demos/` 页面（`demos/index.html`）——分组卡片、速览表、常见问题
- 首页顶部的工具区块（`index.html`）
- 侧边栏导航里的「在线演示工具」（`_includes/site-nav.html`）
- 文章底部的「在线试用本文用到的能力」——由每个工具的 `related_posts` 决定
- `llms.txt`、`sitemap.xml`、`schemas/demo-list.html`

**加一个新工具**：把缩略图放到 `assets/demos/<slug>.jpg`，然后在 `_data/demos.yml` 里加一条即可，
上面五处会自动带上。缩略图用本地副本而不是外链原图（原图合计约 950KB，压到 720px 宽的
JPEG 后约 310KB，中国读者首屏更快）。

`related_posts` 里的 URL 必须和文章实际 URL 一致（`permalink: /:title/`，即文件名去掉日期，
大小写保留），写错不会报错，只是文章底部不显示入口。

## 样式

| 文件 | 负责 |
| --- | --- |
| `_sass/_aeo.scss` | 侧边栏导航、`/demos/` 工具卡片与页面、文章页「本文要点」与「相关在线演示」 |
| `_sass/_home.scss` | 首页头部、在线工具区块、常驻搜索框、文章列表节奏 |

两个文件都在 `assets/css/style.scss` 里最后导入，用来覆盖 `plain.scss` 的默认值。

### 覆盖 plain.scss 时的两个坑

**1. `.post p { margin-top: 10px }` 的优先级是 0,1,1**，高于单个类名（0,1,0）。
页面级段落样式必须写成两级选择器，例如 `.demo-page .demo-lede`、`.demo-card .demo-card-actions`。
否则 `margin-top: auto` 这类声明会被静默压掉 —— 工具卡片同一行的按钮对不齐就是这么来的。

**2. `.posts` 在桌面端带着浏览器默认的 `padding-inline-start: 40px`。**
`plain.scss` 只在 `max-width: 768px` 的媒体查询里写了 `padding: 0 !important`，
桌面端没有清零，于是文章列表比页面头部整体右移 40px，整页出现两条左边界。
`_home.scss` 里显式 `padding-left/right: 0` 修掉了它。

排查这类问题不要靠肉眼看缩进：用 Playwright 取 `getBoundingClientRect().left`
把所有块的左边界打印出来比对，一次就能定位到是哪个元素在偏移。

## 首页

- 头部是站点名 + 一句话定位（`{{ site.title }}` + 手写说明），不再输出「首页」这个 H1。
- 在线工具区块只在第 1 页渲染；`/page2/` 起改用一个「全部文章 · 第 N 页」的 H1。
- 搜索框常驻可见，逻辑在 `assets/js/search.js`：`focus` 展开、点击外部收起、Esc 关闭，
  并支持 `?q=` 深链（SearchAction 的落地参数）。
  注意 SimpleJekyllSearch 1.7.4 只监听 `keyup`，所以脚本里额外补了 `input` 监听，
  否则中文输入法用鼠标点候选词提交时搜不出结果。
- 文章列表：日期与分类并排放在左侧，摘要用次要色，分隔线交给 `.post-item`。

## 部署

推送到 `main` 分支即由 GitHub Pages 自动构建。**本地改动不会自动上线**，
构建产物 `_site/` 已在 `.gitignore` 中。

在 WSL 里跑 `jekyll serve` 时记得加 `--force_polling`：repo 在 `/mnt/d` 上，
inotify 在 DrvFs 上不生效，不加这个参数改了文件不会自动重建。
