---
layout: post
title: "条码、MRZ 与文档边框：一个浏览器扫描器如何同时做三件事"
date: 2026-09-17 11:00:00 +0800
categories: 条码扫描
tags: 条码扫描 MRZ 文档扫描 JavaScript
description: 在线条码 / MRZ / 文档综合扫描器在同一个页面里同时解码条码、解析护照 MRZ、检测文档边框并做透视矫正，靠的不是三个 SDK，而是 Dynamsoft Capture Vision 里三个可切换的任务模板。本文说明三种模式各自用哪个模板、为什么切模式要重置或重新加载设置、MRZ 模式下扫描区域为什么要收缩到画面中段、文档矫正的 ROI 参数怎么写，以及四角拖拽编辑器是怎么实现的。
image: /assets/demos/barcode-mrz-document-scanner.jpg
faq:
  - q: 条码、MRZ、文档检测能同时开启吗？
    a: 这个示例一次只跑一个模式。三种任务的计算量和适用画面范围不同，同时跑既要处理结果归属问题，也会让相机预览的延迟明显上升；需要“一次上传看全部结果”时，分别切换三次即可，因为同一个页面已经加载了全部模型。
  - q: 为什么 MRZ 模式要把扫描区域限制在画面中间？
    a: 因为 MRZ 只在证件下半部分，限制区域能减少无关文字被当成机读区参与识别的机会，也降低了每帧的计算量。示例用的是百分比区域：横向 10%–90%、纵向 30%–70%。
  - q: 文档模式为什么要点“拍摄文档”按钮，而不是自动识别？
    a: 条码和 MRZ 是“读到了就算成功”，文档检测的目标是获得一张完整的原图再矫正。示例让相机先只做边框检测，用户按下去之后才取那一帧的原始全分辨率图像交给编辑器，避免在半按快门的模糊帧上做矫正。
  - q: 识别 MRZ 需要额外下载模型吗？
    a: 需要。除了 DBR、DLR、DDN 三个 WASM 模块，还要加载 MRZ 字符识别与文本行识别两个深度学习模型，以及 TD1/TD2/TD3/签证六套 MRZ 规范，这些都通过 appendDLModelBuffer 和 loadSpec 显式声明。
  - q: 矫正后的文档能保存吗？
    a: 能。编辑器里点“矫正”生成矫正图，“保存”会把结果下载为 PNG；矫正失败时保存按钮不会出现，避免导出一张没矫正过的图。
---

![条码、MRZ 与文档综合扫描器界面](/assets/demos/barcode-mrz-document-scanner.jpg)

把条码识别、护照机读区（MRZ）解析和文档边框检测放进同一个页面，直觉上像是要集成三套 SDK。实际上 Dynamsoft Capture Vision 把它们统一成了“任务模板”：同一批 WASM 模块（DBR 条码、DLR 文字行识别、DDN 文档规范化），同一套 `CaptureVisionRouter` 接口，切换的只是模板名和结果项类型。[条码 / MRZ / 文档综合扫描器](https://www.dynamsoft.com/codepool/demos/barcode-mrz-document-scanner/)就是这三种模式的对照实现。

## 在线演示

[条码 / MRZ / 文档综合扫描器](https://www.dynamsoft.com/codepool/demos/barcode-mrz-document-scanner/)（英文名 Online Barcode, MRZ and Document Scanner）：打开就能用，不需要注册，也不需要安装；三种识别都在浏览器本地完成，图片与摄像头画面不会上传。

配合本文验证时可以这样走一遍：先在「条码」模式上传一张图，再切到「MRZ」模式读一张证件样本，最后切到「文档」模式，拖动四个角点手动调整一次再矫正，对比三种模式各自返回的结果项类型。

## 关键要点

- SDK 为 `dynamsoft-capture-vision-bundle@3.6.3200`，一次加载 `["DBR", "DLR", "DDN"]` 三个模块。
- 三种模式对应四个预设模板：`ReadBarcodes_Default`、`ReadMRZ`、`DetectDocumentBoundaries_Default`、`NormalizeDocument_Default`。
- 判断结果类型靠 `EnumCapturedResultItemType`：条码是 `CRIT_BARCODE`、MRZ 文本行是 `CRIT_TEXT_LINE`、文档四角是 `CRIT_DETECTED_QUAD`、矫正图是 `CRIT_ENHANCED_IMAGE`、原始帧是 `CRIT_ORIGINAL_IMAGE`。
- MRZ 模式额外加载 6 套规范（TD1、TD2、TD2 法语版、TD2 签证、TD3 护照、TD3 签证）和 2 个深度学习模型。
- 文档矫正不自己写单应变换：把四个角点写进 `NormalizeDocument_Default` 的 `roi.points`，把 `roiMeasuredInPercentage` 设为 0（表示像素坐标而非百分比），再 `capture()` 一次。
- 相机模式下 MRZ 的扫描区域收缩到画面中段（横向 10%–90%、纵向 30%–70%），其它模式不限制。

## 三种模式的初始化差异

切换模式时最容易写错的地方是设置状态：条码和文档模式用预设模板，必须先 `resetSettings()` 清掉上一次的改动；MRZ 模式依赖自定义模板文件，用 `initSettings()` 加载：

```js
if (selectedMode == "barcode") {
    await cvr.resetSettings();
    const result = await cvr.capture(img.src, "ReadBarcodes_Default");
    /* 结果项类型：CRIT_BARCODE */
}
else if (selectedMode == "mrz") {
    await cvr.initSettings("./full.json" + ASSET_V);
    const result = await cvr.capture(img.src, "ReadMRZ");
    /* 结果项类型：CRIT_TEXT_LINE */
}
else if (selectedMode == "document") {
    await cvr.resetSettings();
    const result = await cvr.capture(img.src, "DetectDocumentBoundaries_Default");
    /* 结果项类型：CRIT_DETECTED_QUAD */
}
```

三个分支各自负责重置，是因为 `initSettings()` 和 `resetSettings()` 会互相覆盖。如果只在启动时加载一次 `full.json`，那么切回条码模式时 `ReadBarcodes_Default` 会带着 MRZ 模板留下的区域设置运行；反过来，如果从不加载 `full.json`，`ReadMRZ` 模板根本不存在。

`full.json` 里除了用到的四个模板，还定义了 `ReadVINText`、`dcp-mrz` 以及几条 MRZ 文本行规范，方便按需扩展。

### 资源版本号只维护一处

`full.json` 单独请求，必须和页面同时更新，否则浏览器缓存会让新版 JS 配上旧版模板。示例的做法是从当前脚本的 `src` 里取出 `?v=` 片段复用：

```js
const ASSET_V = (function () {
    const src = document.currentScript ? document.currentScript.src : "";
    const i = src.indexOf("?v=");
    return i === -1 ? "" : src.slice(i);
})();
```

这样升级模板时只要改 `index.html` 里 script 标签上的版本号，JSON 请求会跟着变，不必维护第二个版本字符串。

## MRZ 模式：模型和规范都是显式加载的

MRZ 识别属于文字行识别而不是条码识别，所以需要额外的资源和规范声明：

```js
parser = await Dynamsoft.DCP.CodeParser.createInstance();
await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD1_ID");
await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_FRENCH_ID");
await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_ID");
await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_VISA");
await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD3_PASSPORT");
await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD3_VISA");
await Dynamsoft.CVR.CaptureVisionRouter.appendDLModelBuffer("MRZCharRecognition");
await Dynamsoft.CVR.CaptureVisionRouter.appendDLModelBuffer("MRZTextLineRecognition");
```

识别结果是若干条文本行，需要先去掉换行再交给解析器；解析器返回的是字段对象，示例把它们整理成一张表：

```js
function extractMrzInfo(result) {
    const parseResultInfo = {};
    parseResultInfo['Document Type'] = JSON.parse(result.jsonString).CodeType;
    parseResultInfo['Issuing State'] = result.getFieldValue("issuingState");
    parseResultInfo['Surname'] = result.getFieldValue("primaryIdentifier");
    parseResultInfo['Given Name'] = result.getFieldValue("secondaryIdentifier");
    /* 护照用 passportNumber，其它证件用 documentNumber */
}
```

出生日期的两位年份需要一个世纪判断：年份大于当前年份的后两位，就认为是 19xx，否则是 20xx。

```js
if (parseInt(birthYear) > (new Date().getFullYear() % 100)) {
    birthYear = "19" + birthYear;
} else {
    birthYear = "20" + birthYear;
}
```

这就是为什么一个生于 1968 年的人不会被算成 2068 年——但也要注意这套判断的边界：它假设持证人年龄不超过 100 岁。

## 文档模式：检测、编辑、矫正

文档模式的流程和另外两种不同，它是三步而不是一步。

**检测**：使用 `DetectDocumentBoundaries_Default` 模板，得到 `CRIT_DETECTED_QUAD` 结果。文件模式下检测到四角就立即打开编辑器；相机模式下先持续检测边框，等用户按下“拍摄文档”。

**相机取原图**：相机预览是降采样的，直接矫正会损失分辨率，所以文档模式在开始采集前打开一个开关，让 SDK 把原始全分辨率帧一并送回来：

```js
let params = await cvr.getSimplifiedSettings("DetectDocumentBoundaries_Default");
params.outputOriginalImage = true;
await cvr.updateSettings("DetectDocumentBoundaries_Default", params);
cvr.startCapturing("DetectDocumentBoundaries_Default");
```

用户按下拍摄后，收到 `CRIT_ORIGINAL_IMAGE` 时才真正取图并打开编辑器：

```js
if (items[i].type === Dynamsoft.Core.EnumCapturedResultItemType.CRIT_ORIGINAL_IMAGE) {
    if (selectedMode == "document" && isCaptured) {
        isCaptured = false;
        await stopScanning();
        targetCanvas.width = resolution.width;
        targetCanvas.height = resolution.height;
        openEditor(item.imageData.toCanvas().toDataURL());
    }
}
```

**矫正**：编辑器提供四个可拖拽的角点。命中判定用 20 px 的邻域，绘图时用 10 px 半径的圆点表示手柄，同时支持鼠标和触摸。点“矫正”时把四个点写进 ROI 再调用模板：

```js
let params = await cvr.getSimplifiedSettings("NormalizeDocument_Default");
params.roi.points = points;
params.roiMeasuredInPercentage = 0;   // 0 表示像素坐标
await cvr.updateSettings("NormalizeDocument_Default", params);
const result = await cvr.capture(source, "NormalizeDocument_Default");
```

返回结果里取 `CRIT_ENHANCED_IMAGE` 并转成 canvas，就是矫正后的文档：

```js
for (let item of result.items) {
    if (item.type !== Dynamsoft.Core.EnumCapturedResultItemType.CRIT_ENHANCED_IMAGE) continue;
    return await item.toCanvas();
}
```

`NormalizeDocument_Default` 在内部依次做两件事：先按四角做透视矫正，再走一遍图像增强。所以矫正结果不只是“拉正”，通常还更干净一些。

## 相机路径的两个细节

### 扫描区域

MRZ 只在证件下半部分，把扫描区域收窄能显著减少无关文字的干扰：

```js
if (selectedMode == "mrz") {
    cameraEnhancer.setScanRegion({ x: 10, y: 30, width: 80, height: 40, isMeasuredInPercentage: true });
} else {
    cameraEnhancer.setScanRegion(null);
}
```

条码和文档模式必须显式 `setScanRegion(null)`，否则会继承上一个模式留下的区域——切模式时看起来“什么都没识别出来”，原因往往就在这里。

### 相机组件与像素格式

相机用 `CameraView` 加 `CameraEnhancer`，把 SDK 自带的取景界面挂到容器里，并设置像素格式为 10：

```js
cameraView = await Dynamsoft.DCE.CameraView.createInstance();
cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);
cameraEnhancer.setPixelFormat(10);
await cameraEnhancer.open();
```

分辨率在 SDK 触发 `played` 事件后才读得到，`getResolution()` 在 `open()` 之前调用只会拿到空值。示例还顺手把 SDK 取景器里的相机选择器和分辨率选择器隐藏了（通过 shadow root 访问内部节点并用可选链保护），因为页面自己提供了一个设备下拉框。

### 等每一次 capture 完成

这是在文件模式里踩过的坑，代码里留了注释：“每次 capture 都必须 await：加载提示是在这段代码之后关闭的，不 await 就并行发出去，会在解码还在跑的时候就把提示关掉——页面看起来就像卡住了。”任何“发出请求 → 关掉 loading → 立刻看起来没反应”的写法都值得检查一遍。

## 结果项类型速查

统一用类型判断来处理结果是这套架构的核心，因此值得单独记住：

| 类型 | 含义 | 出现在 |
| --- | --- | --- |
| `CRIT_BARCODE` | 一个条码及其位置 | 条码模式 |
| `CRIT_TEXT_LINE` | 一条 MRZ 文本行及位置 | MRZ 模式 |
| `CRIT_DETECTED_QUAD` | 文档四角坐标 | 文档模式 |
| `CRIT_ENHANCED_IMAGE` | 矫正/增强后的图像 | 矫正 |
| `CRIT_ORIGINAL_IMAGE` | 相机原始全分辨率帧 | 文档模式取图 |

## 常见问题

### 条码、MRZ、文档检测能同时开启吗？

这个示例一次只跑一个模式。三种任务的计算量和适用画面范围不同，同时跑既要处理结果归属问题，也会让相机预览的延迟明显上升；需要“一次上传看全部结果”时，分别切换三次即可，因为同一个页面已经加载了全部模型。

### 为什么 MRZ 模式要把扫描区域限制在画面中间？

因为 MRZ 只在证件下半部分，限制区域能减少无关文字被当成机读区参与识别的机会，也降低了每帧的计算量。示例用的是百分比区域：横向 10%–90%、纵向 30%–70%。

### 文档模式为什么要点“拍摄文档”按钮，而不是自动识别？

条码和 MRZ 是“读到了就算成功”，文档检测的目标是获得一张完整的原图再矫正。示例让相机先只做边框检测，用户按下去之后才取那一帧的原始全分辨率图像交给编辑器，避免在半按快门的模糊帧上做矫正。

### 识别 MRZ 需要额外下载模型吗？

需要。除了 DBR、DLR、DDN 三个 WASM 模块，还要加载 MRZ 字符识别与文本行识别两个深度学习模型，以及 TD1/TD2/TD3/签证六套 MRZ 规范，这些都通过 `appendDLModelBuffer` 和 `loadSpec` 显式声明。

### 矫正后的文档能保存吗？

能。编辑器里点“矫正”生成矫正图，“保存”会把结果下载为 PNG；矫正失败时保存按钮不会出现，避免导出一张没矫正过的图。

## 相关阅读

- [扫描车辆 VIN 码的网页应用](/vin-scanner-in-html5-barcode-ocr/)——把 OCR 和条码识别组合在同一个页面里。
- [编写一个从摄像头扫描身份证件的网页应用](/scan-id-card-via-camera-web-app/)——证件类扫描的相机模式实现。
- [编写一个从平板扫描仪扫描身份证件的网页应用](/id-card-flatbed-scanner-web-app/)——换成平板扫描仪作为输入。
- [前端应用中实现快速批量文档扫描](/efficient-bulk-document-scanning-web-app/)——面向多张文档的批量处理。
- [用 Next.js 编写 OCR 护照上 MRZ 的网页应用](/nextjs-mrz-scanner/)——MRZ 识别在框架项目中的组织方式。
