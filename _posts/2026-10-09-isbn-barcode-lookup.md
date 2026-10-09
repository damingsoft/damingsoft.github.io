---
layout: post
title: "在线 ISBN 条码查询：从 Bookland EAN-13 到 Open Library"
date: 2026-10-09 15:30:00 +0800
categories: 条码扫描
tags: 条码扫描 ISBN EAN-13 图书查询 校验位
description: 图书封底的 EAN-13 不只是商品条码——978 开头意味着它可以翻译成 ISBN，而 ISBN-10 和 ISBN-13 之间还有一套 mod-11 校验和 X 校验位的转换规则。本文说明在线 ISBN 条码查询如何把解码、校验、互转和图书查询串成一条链路，以及 Open Library 与 Google Books 两个数据源各自的 CORS 边界。
image: /assets/demos/isbn-barcode-lookup.jpg
faq:
  - q: 图书条码和普通商品条码有什么区别？
    a: 编码格式相同，都是 EAN-13，但前缀是 978 或 979（Bookland）。这两个前缀 reserved 给图书，所以 978 开头的 EAN-13 去掉前缀和校验位就是 ISBN-13 本身。
  - q: ISBN-10 和 ISBN-13 怎么互转？
    a: ISBN-13（978 开头）去掉 978 和末位校验得到前 9 位，加上 mod-11 算出的校验位（可能为 X）就是 ISBN-10；反向则把前 9 位套上 978 重算 EAN 校验位。两个方向的校验位都会重新验证。
  - q: 为什么 ISBN-10 的校验位会出现字母 X？
    a: mod-11 校验的结果范围是 0–10，10 无法用一位数字表示，规范规定用罗马数字 X 表示。X 是合法校验位，不是错误。
  - q: 图书信息从哪里来？
    a: Open Library（互联网档案馆）优先，Google Books 兜底。页面对 Open Library 用的是 /isbn/{code}.json 单书接口——它的 CORS 头能跟随重定向链传下来；search.json 检索接口则不行，浏览器调不了。
  - q: 扫到非图书的 EAN-13 会怎样？
    a: 页面识别出前缀不是 978/979，明确报告这不是图书条码，并提供到 UPC 商品条码查询的跳转链接，而不是拿错误的号码去图书库里硬查。
---

![在线 ISBN 条码查询界面](/assets/demos/isbn-barcode-lookup.jpg)

图书封底那个条码看着就是普通 EAN-13，但它比商品条码多一层身份：978/979 前缀让它同时是一个 ISBN。这层身份带来一串普通商品条码没有的问题——ISBN-13 和 ISBN-10 的互转规则、mod-11 校验里那个神秘的 X、注册组的划分，以及「查图书该去哪个数据库」。 [在线 ISBN 条码查询](https://www.dynamsoft.com/codepool/demos/isbn-barcode-lookup/)（英文名 Online ISBN Barcode Lookup）把这条链路完整串起来：摄像头或图片识别封面条码，本地完成全部校验与互转，再到 Open Library 查出书名、作者和封面。页面打开时自动解码内置的《Clean Code》封底照片作为示例。

## 在线演示

[在线 ISBN 条码查询](https://www.dynamsoft.com/codepool/demos/isbn-barcode-lookup/)（英文名 Online ISBN Barcode Lookup）：上传图片或直接输入 ISBN 都能走完整流程；校验与互转全部在浏览器本地完成，发给图书数据库的只有 ISBN 数字本身。

配合本文验证时可以这样走一遍：先看内置示例的逐步输出，再手动输入一个带 X 校验位的 ISBN-10（随便找一本老书），观察它被转换成 ISBN-13 并查到结果。

## 关键要点

- 识别封面的 Bookland EAN-13，非 978/979 前缀明确报告为非图书条码并交叉链接到 UPC 查询工具。
- ISBN-13 校验位、ISBN-10 的 mod-11 校验（含 X）全部本地计算并展示过程。
- ISBN-10 ↔ ISBN-13 双向转换，转换后重新验证校验位。
- 注册组按 ISBN 段解析（0/1 英语、2 法语、3 德语、7 中文等）。
- 图书查询 Open Library 优先、Google Books 兜底；每个作者名需要单独一次请求补全。
- 内置示例是真实图书封底照片，在 Open Library 里确实存在，端到端可复现。

## 第一步：识别这是不是图书

EAN-13 的前三位决定号码的「户口」：978/979 是 Bookland（图书）专用段，其余是普通商品。所以链路的第一步是判断前缀——不是图书的 EAN-13 会被明确告知，并给出[UPC 商品条码查询](https://www.dynamsoft.com/codepool/demos/upc-barcode-lookup/)的跳转，而不是拿着一个日用品号码去图书库里碰运气。

确认是图书后，前 9 位（去掉 978 和校验位）直接就是 ISBN 的主体部分，注册组（0/1 英语、2 法语、3 德语、7 中文……）和 registrant 段随之解析出来。

## 第二步：mod-11 校验与 X 的来历

ISBN-10 用 mod-11 校验，这是它和 EAN-13 最不一样的地方：

```js
// ISBN-10 校验：每位乘以递减权重，和对 11 取模
function isbn10Check(first9) {
  var sum = 0;
  for (var i = 0; i < 9; i++) sum += first9[i] * (10 - i);
  var check = (11 - (sum % 11)) % 11;
  return check === 10 ? "X" : String(check); // 10 用罗马数字 X 表示
}
```

校验值范围是 0–10，而校验位只能占一个字符，10 就用 X 表示。X 出现在校验位上是完全合法的，一些解析库把它当错误处理是它们的问题。页面双向转换时都会重新验证：ISBN-10 → ISBN-13 套上 978 重算 EAN 校验位，ISBN-13 → ISBN-10 用 mod-11 重算，两边对不上就明确报出来。

## 第三步：查图书，以及两个数据源的边界

浏览器查图书数据同样过 CORS 这一关，两个数据源的能力边界在实现时都摸清了：

**Open Library**（互联网档案馆）是首选。它的 `/isbn/{code}.json` 单书接口在重定向链上保持 CORS 头，浏览器可以直接调；但同域的 `search.json` 检索接口不发 CORS 头，浏览器调不了——这也是页面只走单书查询的原因。另一个实现细节：书名的作者字段只给 author key，作者姓名需要按 key 再发一次请求补全，一本书几个作者就多几次请求。

**Google Books** 是兜底：`volumes?q=isbn:<code>` 免 key、CORS 开放。Open Library 没有收录的书（尤其是较新的版本或小语种出版物）常能在这里查到，封面图也是按封面 ID 或 ISBN 拼装 URL 拉取。

两级都查不到时，本地分析（校验位、互转结果、注册组）依然完整有效——这部分不依赖任何外部服务。

## 边界

Open Library 和 Google Books 都是聚合型数据库，收录有缺口；查询结果为空不代表 ISBN 无效——校验位通过就说明号码本身合法。批量扫描书库、图书馆盘点这类场景请配合[在线条码扫描器](https://www.dynamsoft.com/codepool/demos/barcode-scanner/)的批量图片模式；普通商品条码走[在线 UPC 条码查询](https://www.dynamsoft.com/codepool/demos/upc-barcode-lookup/)。
