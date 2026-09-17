---
layout: post
title: "JavaScript 在线条码扫描器：摄像头、图片、PDF、视频四种输入怎么处理"
date: 2026-09-17 09:00:00 +0800
categories: 条码扫描
tags: 条码扫描 条码识别 JavaScript 基准测试
description: 在线条码扫描器用 Dynamsoft Barcode Reader 在浏览器里识别条码，摄像头、图片、多页 PDF/TIFF、MP4 视频四种输入走的其实是同一条识别路径。本文说明每种输入各自需要的预处理、为什么 PDF 和 TIFF 必须自己先渲染成图片、默认模板没开启的 DotCode 和 Pharmacode 怎么补，以及基准测试模式里召回率、准确率、码制一致性和识别框重叠率分别怎么算。
image: /assets/demos/barcode-scanner.jpg
faq:
  - q: 在浏览器里识别条码需要把图片上传到服务器吗？
    a: 不需要。识别通过 WebAssembly 在浏览器内完成，上传的图片、PDF、视频帧和摄像头画面都不会离开本机，页面关闭后本地也不会留下副本。
  - q: 为什么扫描器要把 PDF 和 TIFF 先渲染成图片？
    a: SDK 的 capture() 交给浏览器解码（createImageBitmap 或 img 元素），只能处理浏览器自己能显示的格式；而多页入口 captureMultiPages() 只接受 application/pdf。所以 PDF 用 pdf.js 逐页渲染、TIFF 用 UTIF 解码，再按普通图片路径识别，翻页、框选和基准测试的代码因此可以完全共用。
  - q: 基准测试里的识别率是怎么算的？
    a: 导入带真值的 annotations.json（或生成器导出的数据集 ZIP）后逐张比对：正确解码数除以应有条码数得到召回率，正确解码数除以实际解码数得到准确率，两者都以条码文本匹配为准。
  - q: SDK 把码制名称写得不一样，会把正确识别判成失败吗？
    a: 不会。码制一致性和识别框重叠率只作为提示性指标，且只在文本已经匹配的条码对之间统计，不会因为 Data Matrix 被写成 DataMatrix、或识别框略有偏移而否定一次正确的文本识别。
  - q: 在线扫描器默认支持哪些码制？
    a: 页面用的 ReadBarcodes_Default 模板默认开启 52 种码制里的 32 种，示例又补上了 DotCode、Pharmacode 单轨和 Pharmacode 双轨，实际覆盖 35 种常见一维码与二维码。
---

![在线条码扫描器界面](/assets/demos/barcode-scanner.jpg)

浏览器里做条码识别，难点从来不是“调一个解码函数”，而是输入不止一种：用户可能拖进来一张 JPG、一份扫描件 PDF、一段手机拍的 MP4，也可能直接把摄像头对准货架。这四种输入在 Dynamsoft Barcode Reader 的 Web SDK 里最终都走同一个 `capture()` 调用，但进入这个调用之前要做的事情完全不同——这正是[在线条码扫描器](https://www.dynamsoft.com/codepool/demos/barcode-scanner/)这个示例主要解决的问题。

## 在线演示

[在线条码扫描器](https://www.dynamsoft.com/codepool/demos/barcode-scanner/)（英文名 Online Barcode Scanner）：打开就能用，不需要注册，也不需要安装；图片、PDF、视频帧和摄像头画面都在浏览器本地处理，不会上传到服务器。

配合本文验证时可以这样走一遍：先拖一张带条码的照片进去，看识别框与结果面板；再切到「基准测试」模式，导入生成器导出的数据集 ZIP，观察召回率、准确率、码制一致性和框重叠率分别是被哪一段逻辑算出来的。

## 关键要点

- SDK 版本锁定在 `dynamsoft-barcode-reader-bundle@11.6.3200`，从 jsDelivr 以普通 `<script>` 引入，识别全部在浏览器内完成。
- 四种输入统一收敛到 `cvr.capture(source, "ReadBarcodes_Default")`：图片直接传 src，视频和摄像头传 canvas，PDF/TIFF 先逐页渲染成 canvas 再传。
- PDF 用 pdf.js 5.4.149 逐页渲染（长边不超过 2000 px，`isEvalSupported: false`），TIFF 用 UTIF 3.1.0 解码、pako 2.1.0 解开 Deflate 压缩，单份文档最多加载 50 页。
- 默认模板只开启 32 种码制，示例通过简化设置补上 DotCode、Pharmacode 单轨、Pharmacode 双轨。
- 基准测试模式除召回率与准确率外，还统计码制一致性与识别框 IoU（阈值 0.5），后两者只作参考、不影响文本层面的判定。

## 四种输入，一条识别路径

先把整体结构说清楚：页面只创建一个 `CaptureVisionRouter` 实例，所有输入最终都变成“一张能被浏览器解码的图片”，再交给同一个模板名识别。

| 输入类型 | 预处理 | 交给 SDK 的形式 |
| --- | --- | --- |
| 图片（JPG/PNG/GIF/BMP/WebP） | `FileReader.readAsDataURL` | 图片 src 字符串 |
| 多页 PDF | pdf.js 逐页渲染到 canvas | canvas 或 PNG data URL |
| 多页 TIFF | UTIF 解码为 RGBA、pako 解压 | canvas 或 PNG data URL |
| 视频（MP4/WebM/MOV） | `URL.createObjectURL` + 播放 | 逐帧 canvas |
| 摄像头 | `getUserMedia` 取流 | 逐帧 canvas |

这样做的直接好处是：框选标注、结果面板、基准测试这三块代码只需要写一份，因为它们看到的永远是一张图加一组识别结果。README 里把原因写得很直白——`capture()` 会把 Blob 交给 `createImageBitmap()` 或 `<img>`，于是它只能解码浏览器自己认识的东西；而多页入口 `captureMultiPages()` 又只接受 `application/pdf`，浏览器里除 Safari 之外都不能解码 TIFF。

### PDF 与 TIFF 的渲染细节

PDF 部分用动态 `import()` 在第一次遇到文档时才下载 pdf.js，worker 路径同时指定：

```js
const PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149';
const PAKO_URL = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
const UTIF_URL = 'https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js';
```

渲染时按长边 2000 px 反推缩放比例，并关掉 pdf.js 的 eval：

```js
const pdf = await pdfjsLib.getDocument({ data: data, isEvalSupported: false }).promise;
// scale = Math.min(3, Math.max(1, 2000 / Math.max(width, height)))
```

TIFF 的坑更具体。UTIF 遇到不支持的压缩方式时会解出一片噪声而不是报错，所以代码先检查压缩标记；Adobe Deflate（32946）与标准 Deflate（8）实际上是同一套算法，先改标签再交给 UTIF：

```js
const compression = (ifd.t259 && ifd.t259[0]) || 1;
if (compression === TIFF_ADOBE_DEFLATE) {
    ifd.t259 = [8];
} else if (TIFF_READABLE_COMPRESSION.indexOf(compression) === -1) {
    throw new Error('this TIFF uses compression ' + compression + ', which is not supported.');
}
```

## 初始化顺序：许可证、WASM、Router

三个步骤的顺序不能颠倒，许可证必须在创建任何组件之前激活，否则 `CaptureVisionRouter.createInstance()` 会直接抛错：

```js
await Dynamsoft.License.LicenseManager.initLicense(licenseKey, true);
if (!wasmLoaded) {
    await Dynamsoft.Core.CoreModule.loadWasm(['DBR']);
    wasmLoaded = true;
}
if (!cvr) {
    cvr = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
}
```

`loadWasm(['DBR'])` 用一个 `wasmLoaded` 标志位保护，避免切换输入模式时重复加载。许可证则按域名选择：托管在 dynamsoft.com 上的页面用绑定该域名的 Codepool 许可证，其它主机（本地调试、fork）自动回退到 SDK 的公共 24 小时试用 key，并在控制台打印一行说明，同时上报一条 `license_fallback` 事件——这样把示例克隆到自己机器上时不会卡在看不到原因的初始化失败上。

## 逐帧识别：视频与摄像头

视频和摄像头都不使用定时器，而是跟随 `requestAnimationFrame` 取帧，一帧一次 `capture()`。视频路径会先把当前画面画进临时 canvas，再编码成 JPEG 数据 URL 送进 SDK：

```js
let result = await cvr.capture(canvas.toDataURL('image/jpeg'), dynamsoftTemplate);
```

连续帧会反复读到同一个条码，因此结果按“码制 + 文本”组成 key 去重，同一个条码只显示一次：

```js
const key = '[' + item.formatString + '] ' + item.text;
```

识别框直接画在覆盖层 canvas 上：文件模式用红色（`#ff0000`，线宽 2），视频和摄像头用绿色（`#00ff00`，线宽 3），位置取自结果的 `location.points` 四个角点。点击图片区域可以直接唤出文件选择框，也支持拖放和 `Ctrl+V` 粘贴。

## 补上默认模板没开启的码制

`ReadBarcodes_Default` 只覆盖 32 种码制，DotCode 和两种 Pharmacode 都不在其中。示例通过简化设置接口读取当前配置、按位或上缺失的码制再写回：

```js
const settings = await cvr.getSimplifiedSettings(taskName);
let mask = BigInt(settings.barcodeSettings.barcodeFormatIds);
EXTRA_BARCODE_FORMATS.forEach(function (name) {
    const bit = enumFormats[name];
    if ((mask & BigInt(bit)) !== BigInt(bit)) { mask |= BigInt(bit); }
});
settings.barcodeSettings.barcodeFormatIds = mask;
await cvr.updateSettings(taskName, settings);
```

这里有个容易踩的坑：`BarcodeFormatIds` 在模板 JSON 里写的是码制名称，在简化设置对象里却是数值掩码，而且是 BigInt——`BF_ALL` 单独一个值就超过了 JavaScript 安全整数范围，用 JSON 数字根本装不下。手写模板 JSON 时如果混用了两套写法，通常会在 `startCapturing()` 阶段收到 `[-10038] BarcodeFormatIds: The parameter value is invalid or out of range`，而报错信息指向码制列表，真正的问题却在模板本身。另外每次调用 `resetSettings()` 之后都要重新补一遍。

## 基准测试：召回率、准确率与两个提示性指标

这是这个示例最有价值的部分。导入带真值的标注文件后，每张图会逐条比对，指标定义如下（设应有条码数为 E、实际解码数为 D、正确匹配数为 TP）：

- **召回率（Recall）= TP / E**：该读出来的读出来了多少。
- **准确率（Precision）= TP / (TP + FP)**：读出来的结果里有多少是对的。
- **码制一致性**：只在已经匹配上的条码对里统计，并且先做名称归一（`CODE39EXTENDED` 折叠为 `CODE39`、`UPCA` 折叠为 `EAN13` 等），避免同一码制的不同写法被当成不一致。
- **识别框重叠率**：对匹配上的条码对计算四边形 IoU，阈值 0.5，报告平均值。

文本匹配本身是宽松但确定的：先精确匹配，再接受 UPC-A 12 位与 EAN-13 前导 0 的等价形式，最后允许“检测结果以期望值开头且多出不超过 2 个字符”。匹配采用贪心的一对一策略，每个期望值只用一次，每个检测结果也只用一次。

关键的一点是：码制一致性和框重叠率是**提示性**的。文本匹配正确，就不会因为 SDK 把码制名字写得不同、或框画得偏了一点而被判为失败——但这两个指标会单独显示出来，用来判断“读对了”之外的质量问题。

结果表格在存在真值时列出 `图片 / 识别到 / 应有 / 正确 / 漏检 / 召回率 / 码制 / 框 IoU / 耗时 / 详情`，召回率按 0.9 和 0.7 两档着色，并且可以一键导出成一份独立的 HTML 报告。

### 数据集 ZIP 与真值格式

标注文件支持两种来源：手工准备的 `annotations.json`，或者直接拖入[条码与二维码生成器](https://www.dynamsoft.com/codepool/demos/barcode-qrcode-generator/)导出的数据集 ZIP。ZIP 读取是自己实现的：从文件尾部向前最多 65535 字节搜索 EOCD 签名，再遍历中央目录，`store` 方式直接取用、`deflate` 方式用 `DecompressionStream('deflate-raw')` 解压，其它压缩方式明确拒绝。

标注结构如下，`text` 是匹配依据，`format` 与 `points` 可选：

```json
{
  "images": [
    {
      "file": "barcode-stress-a1b2c3-001.png",
      "width": 1280, "height": 960,
      "degradations": { "blur": 1.8, "rotate": -12 },
      "barcodes": [ { "text": "DS-0001-0002", "format": "QR_CODE", "points": [[10,10],[210,10],[210,210],[10,210]] } ]
    }
  ]
}
```

图片文件名必须与 `file` 字段一致；多页 PDF 或 TIFF 会展开成 `report.pdf — page 2 of 3` 这样的名字，所以标注要按单页文件逐条准备。Dynamsoft 也在 GitHub 上公开了一份[挑战性图像数据集](https://github.com/Dynamsoft/datasets-from-dynamsoft/tree/main/challenging-images)，格式与此兼容，可以直接用来跑一遍看看参数调整前后的差别。

## 常见问题

### 在浏览器里识别条码需要把图片上传到服务器吗？

不需要。识别通过 WebAssembly 在浏览器内完成，上传的图片、PDF、视频帧和摄像头画面都不会离开本机，页面关闭后本地也不会留下副本。

### 为什么扫描器要把 PDF 和 TIFF 先渲染成图片？

SDK 的 `capture()` 交给浏览器解码（`createImageBitmap` 或 `img` 元素），只能处理浏览器自己能显示的格式；而多页入口 `captureMultiPages()` 只接受 `application/pdf`。所以 PDF 用 pdf.js 逐页渲染、TIFF 用 UTIF 解码，再按普通图片路径识别，翻页、框选和基准测试的代码因此可以完全共用。

### 基准测试里的识别率是怎么算的？

导入带真值的 `annotations.json`（或生成器导出的数据集 ZIP）后逐张比对：正确解码数除以应有条码数得到召回率，正确解码数除以实际解码数得到准确率，两者都以条码文本匹配为准。

### SDK 把码制名称写得不一样，会把正确识别判成失败吗？

不会。码制一致性和识别框重叠率只作为提示性指标，且只在文本已经匹配的条码对之间统计，不会因为 Data Matrix 被写成 DataMatrix、或识别框略有偏移而否定一次正确的文本识别。

### 在线扫描器默认支持哪些码制？

页面用的 `ReadBarcodes_Default` 模板默认开启 52 种码制里的 32 种，示例又补上了 DotCode、Pharmacode 单轨和 Pharmacode 双轨，实际覆盖 35 种常见一维码与二维码。

## 运行环境与授权

托管在 Dynamsoft 上的在线工具打开即用，不需要注册，也不需要安装任何东西。想把这套代码跑在自己的域名下，则需要一个属于自己的 Dynamsoft 许可证——页面里内置的 Codepool 许可证绑定在 dynamsoft.com 域名上，换域名后不会激活，只会回退到 24 小时试用 key。摄像头访问要求 HTTPS 或 localhost。

## 相关阅读

- [条码识别速度究竟可以有多快？](/Dynamsoft-Fast-Barcode-Scanning/)——同一条识别管线在速度与准确率之间的取舍。
- [二维码识别 SDK 性能测试与比较](/qr-code-reading-benchmark-and-comparison/)——本文基准测试模式的方法论背景。
- [前端扫描 EAN/UPC 格式的条形码及其附加码](/scan-ean-upc-and-its-add-on-javascript/)——一维码附加码这类特殊场景。
- [基于 Remix 构建一个条码扫描 Web 应用](/remix-barcode-qr-code-scanner/)——把相同的 SDK 用在框架项目里。
