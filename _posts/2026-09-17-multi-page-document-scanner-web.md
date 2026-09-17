---
layout: post
title: "多页文档扫描 Web 应用：自动拍摄、透视校正与三种导出方式"
date: 2026-09-17 11:30:00 +0800
categories: 文档扫描
tags: 文档扫描 JavaScript PDF
description: 用摄像头连续拍多页文档，难点在于"什么时候该自动按下快门"，以及拍完之后如何处理翻页、重排、滤镜和导出。本文说明在线多页扫描器如何用四边形 IoU 与面积变化判定画面稳定、为什么手动拍摄要留 500 毫秒的容错窗口、矫正为什么要交给 Document Normalizer 的 ROI 参数，以及 PDF、图片、长图三种导出各自的实现与限制。
image: /assets/demos/multi-document-capture.jpg
faq:
  - q: 自动拍摄会不会拍到模糊的一帧？
    a: 不会拍到你正在移动时的画面。判据是连续若干帧里文档四边形的重叠度和面积都几乎不变，默认要求连续 3 帧满足条件才触发；移动过程中 IoU 会跌破阈值，计数会清零重新累计。
  - q: 按下拍摄键却没有检测到文档会怎样？
    a: 会等最多 500 毫秒。如果这期间有一帧检测到四边形，就用它做透视矫正；超时则直接用原始画面，并提示“未检测到文档，使用原始图像”。也就是说按下去一定会有结果，不会静默失败。
  - q: 长图导出是怎么把多页拼起来的？
    a: 优先用 OpenCV.js 做模板匹配：把上一页底部的一条窄带当作模板，在下一张图的上部搜索最匹配的位置，据此裁掉重复部分再拼接；OpenCV 不可用或匹配置信度不足时，回退到内置的启发式算法（行边缘与文字密度的组合信号）。
  - q: 能导出多页 TIFF 吗？
    a: 这个示例不支持。可选的导出是 PDF、逐页 PNG 和拼接长图。需要多页 TIFF 的场景可以改用 PDF 与图像标注工作台，那边的文档引擎提供多页 TIFF 写入。
  - q: 导出 PDF 为什么会打开新标签页而不是下载？
    a: PDF 由 jsPDF 在浏览器内生成，通过 Blob URL 在新的标签页打开，方便先预览再决定是否保存。逐页图片导出则是直接触发下载。
---

![在线多页文档扫描器界面](/assets/demos/multi-document-capture.jpg)

用摄像头拍文档，第一步就卡住：什么时候该按快门？让人手动按，手里还要拿着纸，体验很差；让它定时拍，会拍到一堆模糊帧。再往后还有一整套流程要走——透视矫正、翻页预览、重排、滤镜、导出成一份能用的 PDF。[在线多页文档扫描器](https://www.dynamsoft.com/codepool/demos/multi-document-capture/)把这条链路完整实现了一遍，全部在浏览器内完成。

## 在线演示

[在线多页文档扫描器](https://www.dynamsoft.com/codepool/demos/multi-document-capture/)（英文名 Online Multi-Page Document Scanner）：打开就能用，不需要注册，也不需要安装；采集、矫正和导出全部在浏览器内完成，拍到的页面不会上传。摄像头访问需要 HTTPS 或 localhost。

配合本文验证时可以这样走一遍：把一页纸平放在桌面上，等它自动拍下第一张，翻页后再拍第二张，然后在结果页试一次详情顺序调整与色彩滤镜切换，最后分别导出 PDF 和拼接长图。

## 关键要点

- SDK 为 `dynamsoft-capture-vision-bundle@3.6.3200`，但只加载 `["DDN"]`（文档规范化）一个模块；PDF 导出用 jsPDF 2.5.1，长图拼接按需加载 OpenCV.js 4.10.0。
- 用两个预设模板：`DetectDocumentBoundaries_Default` 做实时边框检测，`NormalizeDocument_Default` 做透视矫正与增强。
- 自动拍摄判据：文档四边形的外接框 IoU ≥ 0.85 **且**面积变化 ≤ 0.15，连续满足 3 帧才触发；三个阈值都能在设置面板里实时调整。
- 手动拍摄有 500 毫秒容错窗口，窗口内没有检测到文档就退回原始画面并提示。
- 三种导出：A4 PDF（jsPDF）、逐页 PNG、拼接长图（OpenCV.js 模板匹配 + 内置启发式回退）。

## 自动拍摄：稳定就是“几乎不动”

判断“用户已经把证件摆好”这件事，示例用的是几何量而不是图像清晰度：把文档四边形的外接矩形做 IoU，再算一次真实多边形的面积变化率。

```js
const quadStabilizer = {
    enabled: true,
    iouThreshold: 0.85,      // 前后两帧四边形的 IoU 下限
    areaDeltaThreshold: 0.15, // 面积变化率上限
    stableFrameCount: 3,      // 连续满足条件的帧数
};

function isQuadStable(current, previous) {
    return iou >= quadStabilizer.iouThreshold && areaDelta <= quadStabilizer.areaDeltaThreshold;
}
```

主循环里的计数逻辑很关键：不稳定时计数清零而不是保留，避免“抖两下又稳住”被误判为稳定。

```js
} else if (isQuadStable(quad, lastQuad)) {
    stableCounter += 1;
    lastQuad = quad;
} else {
    stableCounter = 0;
    lastQuad = quad;
}
if (quadStabilizer.enabled && stableCounter >= quadStabilizer.stableFrameCount) {
    resetStabilizer();
    await performCapture({ autoCaptured: true, quadPoints: quad });
}
```

计数清零时仍然更新 `lastQuad`，否则一次抖动之后需要连续两帧才恢复比较，手感会变迟钝。拍摄完成后有 1500 毫秒的冷却期，避免相机还没离开就再次触发；同时处理中的帧会被直接跳过，防止同一帧进入两次矫正。

三个阈值都做成了滑杆：IoU 0.50–1.00、面积变化 0.01–0.50、稳定帧数 1–10。文档平放在桌面上时可以调松一点提高速度；手持拍摄时调紧一点更保险。

### 手动拍摄为什么还要等

按下快门的那一刻，当前帧可能刚好没有检测到四边形（手抖、反光）。示例的处理是：先记下“有待处理的手动拍摄”，等下一帧的处理结果；如果 500 毫秒内仍然没有四边形，就用原始画面拍下去，并提示“未检测到文档，使用原始图像”。

```js
captureTimeoutId = setTimeout(async () => {
    if (manualCapturePending) {
        manualCapturePending = false;
        await performCapture({ autoCaptured: false, quadPoints: null });
    }
}, 500);
```

按了就有结果，只是结果可能是“没矫正的原图”。这比什么都不发生要好得多。

## 矫正：把四个点交给模板

透视矫正不自己写单应矩阵，而是把角点写进 `NormalizeDocument_Default` 的 ROI 再让 SDK 处理：

```js
const settings = await cvr.getSimplifiedSettings(NORMALIZE_TEMPLATE);
settings.roi.points = points;
settings.roiMeasuredInPercentage = 0;   // 0 = 像素坐标
await cvr.updateSettings(NORMALIZE_TEMPLATE, settings);
const normalizedResult = await cvr.capture(frameCanvas, NORMALIZE_TEMPLATE);
```

模板内部依次执行文档去斜（`ST_DOCUMENT_DESKEWING`）与图像增强（`ST_IMAGE_ENHANCEMENT`），所以出来的图不仅被拉正，通常对比度也更好。检测模板则是一条完整的流水线：区域预检测、长直线与逻辑线装配、角点检测、边缘检测、四边形检测，内部会把图像缩到短边 1000 px 上做局部二值化（块大小 25×25，阈值补偿 5）。

单帧矫正是整条链路里最慢的一步，尤其在引擎还没预热时，所以这一步外面包了一层进度反馈——代码注释里写得很直接：“冷启动时的单帧矫正是在这个示例里最慢的一步，而它以前完全没有反馈。”

### 四角手动编辑

检测不准时可以打开“编辑四角”界面，拖动四个手柄重新框选。命中半径 30 px，手柄半径 14 px，应用后重新走一次矫正并替换当前页。设置面板里还有一个隐藏的保底：如果某帧完全没检测到文档，会生成一个向内缩进 8% 的默认四边形（缩进量夹在 1–96 px 之间）交给用户调整，而不是给一个空状态。

## 拍完之后的编辑能力

一页拍完进入结果页，顶部一排操作：

| 操作 | 行为 |
| --- | --- |
| 继续 | 回到相机继续采集下一页 |
| 重拍 | 回到相机，拍完替换当前页而不是追加 |
| 编辑 | 打开四角编辑器，修正检测结果 |
| 旋转 | 顺时针旋转 90° |
| 排序 | 打开重排界面，拖拽调整页序 |
| 保存 | 打开导出菜单 |

重排界面同时支持鼠标拖拽和触摸：触摸时会把被拖动的项克隆一份、改成 `position: fixed` 跟随手指，松开时用 `document.elementFromPoint()` 找到落点。确认后按新的顺序重建页数组：

```js
sortDoneBtn.onclick = () => {
    pages = workingOrder.map(i => pages[i]);
    currentPageIndex = 0;
    /* 关闭界面并重新渲染 */
};
```

三种色彩滤镜是每页独立保存的，切换时按需重算，不改变原始图：

- **彩色**：原样。
- **灰度**：按亮度加权 `0.299R + 0.587G + 0.114B`。
- **二值**：灰度超过 140 取白，否则取黑。

二值化的固定阈值 140 是够用但保守的选择——光照不均的拍摄件上，它会比自适应阈值更容易丢掉浅色笔画。如果扫描件质量参差，换用自适应阈值会稳一些，可以参看[自适应阈值化的实现](/adaptive-thresholding-javascript/)。

从相册导入图片时保留了 EXIF 方向：`createImageBitmap(file, { imageOrientation: "from-image" })`，否则手机竖拍的照片会横过来。导入的图片同样会先尝试检测边框和矫正，失败时退回原图并提示。

## 三种导出

### PDF（jsPDF，A4 纵向）

每页都编码为 JPEG（质量 0.95），按画布与 A4 的比例取较小值缩放并居中：

```js
const { jsPDF } = window.jspdf;
const pdf = new jsPDF({ unit: "pt", format: "a4" });
const imageData = canvas.toDataURL("image/jpeg", 0.95);
if (i > 0) pdf.addPage("a4", "portrait");
pdf.addImage(imageData, "JPEG", x, y, drawWidth, drawHeight);
const blob = pdf.output("blob");
window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
```

生成的是 Blob 并在新标签页打开，方便先预览再决定保存；文件名形如 `document_<时间戳>_1.png` 的逐页图片导出则是直接下载。

### 逐页 PNG

每页独立编码为 PNG 并触发一次下载。页数多时浏览器会提示“允许下载多个文件”，这属于正常行为。

### 拼接长图

长图导出用于把有重叠的连续拍摄拼成一张完整画面。优先走 OpenCV.js：把上一页底部一条窄带作为模板，在下一张的顶部区域做 `TM_CCOEFF_NORMED` 模板匹配，取最佳位置计算重叠行数。

```js
cv.matchTemplate(searchRegion, templ, result, cv.TM_CCOEFF_NORMED);
const match = cv.minMaxLoc(result);
```

匹配前会跳过标准差小于 8 的模板（纯色区域没法定位），置信度低于 0.42 也放弃。任何一步失败都会回退到内置的启发式算法：以行边缘强度和文字密度构造信号、平滑后找最佳重叠位置。

代码里对浏览器画布上限做了明确防护，超出直接报错而不是画出一张空白图：

```js
if (targetWidth > STITCH_MAX_CANVAS_EDGE || totalHeight > STITCH_MAX_CANVAS_EDGE) {
    throw new Error("Combined image exceeds the browser canvas size limit.");
}
if (targetWidth * totalHeight > STITCH_MAX_CANVAS_AREA) {
    throw new Error("Combined image is too large to export safely in the browser.");
}
```

上限取长边 32767 像素、总面积 2²⁸ 像素，这是主流浏览器的实际边界。

## 相机与初始化

相机请求 1920×1080、优先后置：

```js
getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 },
                        facingMode: { ideal: "environment" } }, audio: false });
```

SDK 初始化只有三步——激活许可证、加载 DDN 模块、创建 router 并加载模板文件：

```js
await Dynamsoft.License.LicenseManager.initLicense(licenseKey, true);
await Dynamsoft.Core.CoreModule.loadWasm(["DDN"]);
cvr = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
await cvr.initSettings(TEMPLATE_PATH);
```

许可证同样按域名选择：dynamsoft.com 用绑定域名的 Codepool 许可证，其它主机自动回退到 24 小时试用 key 并上报 `license_fallback`。页面没有许可证输入框——访问者不需要知道这件事。

## 常见问题

### 自动拍摄会不会拍到模糊的一帧？

不会拍到你正在移动时的画面。判据是连续若干帧里文档四边形的重叠度和面积都几乎不变，默认要求连续 3 帧满足条件才触发；移动过程中 IoU 会跌破阈值，计数会清零重新累计。

### 按下拍摄键却没有检测到文档会怎样？

会等最多 500 毫秒。如果这期间有一帧检测到四边形，就用它做透视矫正；超时则直接用原始画面，并提示“未检测到文档，使用原始图像”。也就是说按下去一定会有结果，不会静默失败。

### 长图导出是怎么把多页拼起来的？

优先用 OpenCV.js 做模板匹配：把上一页底部的一条窄带当作模板，在下一张图的上部搜索最匹配的位置，据此裁掉重复部分再拼接；OpenCV 不可用或匹配置信度不足时，回退到内置的启发式算法（行边缘与文字密度的组合信号）。

### 能导出多页 TIFF 吗？

这个示例不支持。可选的导出是 PDF、逐页 PNG 和拼接长图。需要多页 TIFF 的场景可以改用 [PDF 与图像标注工作台](/pdf-annotation-redaction-browser/)，那边的文档引擎提供多页 TIFF 写入。

### 导出 PDF 为什么会打开新标签页而不是下载？

PDF 由 jsPDF 在浏览器内生成，通过 Blob URL 在新的标签页打开，方便先预览再决定是否保存。逐页图片导出则是直接触发下载。

## 相关阅读

- [前端应用中实现快速批量文档扫描](/efficient-bulk-document-scanning-web-app/)——面向大量文档时的吞吐优化。
- [基于 React 的用摄像头扫描文档并存为 PDF 的 Web 应用](/scan-to-pdf-camera-react/)——同一流程在 React 项目里的组织方式。
- [Vue 摄像头扫描文档到 PDF](/vue-scan-to-pdf-camera/)——Vue 版本的实现。
- [构建一个文档扫描 HTML5 移动应用](/mobile-document-scanning-in-html5/)——移动端适配要点。
- [如何实现自适应阈值化](/adaptive-thresholding-javascript/)——改善二值化效果的方法。
