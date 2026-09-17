---
layout: post
title: "护照 MRZ 扫描器：OCR 识别、文档边界检测与证件照提取"
date: 2026-09-17 15:00:00 +0800
categories: 数据捕获
tags: MRZ 证件识别 JavaScript
description: 护照机读区（MRZ）用等宽字体印刷，存在大量易混字符——0 与 O、1 与 I、5 与 S 在低分辨率下几乎一样，靠通用 OCR 很难稳定识别。本文说明在线护照 MRZ 扫描器如何用专用模型加易混字符纠正表识别机读区、怎么把识别结果拼成完整字符串再解析出结构化字段，以及证件照区域是怎么被定位和裁剪出来的。
image: /assets/demos/mrz-scanner.jpg
faq:
  - q: MRZ 识别和普通条码识别有什么区别？
    a: MRZ 是印刷文字而不是条码，属于文字行识别（OCR）范畴。它用等宽字体、字符集限定为 A–Z、0–9 和填充符 <，且每行有固定的字符数和校验位——这些约束让专用模型能做通用 OCR 做不到的纠错。识别之后还需要按 TD1/TD2/TD3 规范解析出字段。
  - q: 为什么识别 MRZ 要额外加载深度学习模型？
    a: 因为要同时完成两件事：定位机读区文本行的位置（文本行定位）和识别字符（字符识别）。示例显式加载 MRZCharRecognition 与 MRZTextLineRecognition 两个模型，并配套加载字符易混纠正表。
  - q: 证件照是怎么提取出来的？
    a: 用 Dynamsoft 的身份处理能力（IdentityProcessor.findPortraitZone）从识别的中间结果里定位证件照区域，再把该四边形裁剪并旋转成正立的图像。代码里还保留了一套基于文档边框按比例估算的备用方案。
  - q: 相机预览时为什么只画边框，按下拍摄才读 MRZ？
    a: 实时预览用 640 px 宽的降采样帧循环做一次便宜的边框检测，只画文档轮廓，目的是帮用户把证件摆正；按下拍摄后才冻结那一帧的全分辨率原图，做机读区识别与照片提取——这样既能实时给反馈，又不牺牲最终识别精度。
  - q: 从剪贴板粘贴截图为什么容易失败？
    a: 常见原因是代码取了剪贴板的第一项（types[0]），而复制截图时很多应用会把 text/html 放在最前面，于是拿到的是一段 HTML 被当成图片送进解码器。正确做法是在所有类型里查找以 image/ 开头的那个。
---

![在线护照 MRZ 扫描器界面](/assets/demos/mrz-scanner.jpg)

护照和身份证件底部的机读区（MRZ）是一段设计得“机器友好”的文本：等宽字体、固定行宽、限定字符集、每个关键字段还带校验位。但它对通用 OCR 并不友好——`0` 和 `O`、`1` 和 `I`、`5` 和 `S` 在这类字体下几乎一模一样，扫描件稍有模糊，逐字符识别就会出错，而 MRZ 的校验位又要求每一个字符都不能错。[在线 MRZ 与护照扫描器](https://www.dynamsoft.com/codepool/demos/mrz-scanner/)演示的就是这套专用识别流程。

## 在线演示

[在线 MRZ 与护照扫描器](https://www.dynamsoft.com/codepool/demos/mrz-scanner/)（英文名 Online MRZ & Passport Scanner）：打开就能用，不需要注册，也不需要安装；机读区识别、字段解析和证件照提取都在浏览器本地完成。摄像头访问需要 HTTPS 或 localhost。

配合本文验证时可以这样走一遍：用配套的 MRZ 生成器做一张机读区预览图，先按「加载」走上传路径看字段解析结果，再切到「摄像头」模式对着屏幕，观察实时轮廓是一帧一帧被缓动逼近、并在没有新检测结果时淡出的。

## 关键要点

- SDK 为 `dynamsoft-capture-vision-bundle@3.4.2001`，加载 `["DLR", "DDN"]`：文字行识别与文档规范化。
- 使用自定义模板 `ReadPassportAndId`（来自 `findPrecisePortraitZone.json`），模板内包含 MRZ 文本行识别与文档边框检测两条任务。
- 识别模型显式预加载：`MRZCharRecognition` 与 `MRZTextLineRecognition`。
- 解析加载六套规范：`MRTD_TD1_ID`、`MRTD_TD2_ID`、`MRTD_TD2_FRENCH_ID`、`MRTD_TD2_VISA`、`MRTD_TD3_PASSPORT`、`MRTD_TD3_VISA`。
- 相机预览用 640 px 宽的降采样帧、400 毫秒一轮做边框检测，并用指数缓动绘制轮廓，避免轮廓闪烁。

## 三个任务，一套管线

这个示例同时做三件事，但它们来自同一次 `capture()` 调用：

| 任务 | 输出 | 来源 |
| --- | --- | --- |
| MRZ 文字行识别 | `CRIT_TEXT_LINE` 及每条文本行的位置 | 标签识别任务 |
| 文档边框检测 | `CRIT_DETECTED_QUAD` | 文档规范化任务 |
| 证件照定位 | 四边形区域 | 身份处理能力（基于中间结果） |

初始化的顺序有讲究——解析规范、深度学习模型都要在创建 router 之前或之后按固定次序准备好：

```js
await Dynamsoft.License.LicenseManager.initLicense(resolveLicenseKey(), true);
await Dynamsoft.Core.CoreModule.loadWasm(["DLR", "DDN"]);
parser = await Dynamsoft.DCP.CodeParser.createInstance();
await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD3_PASSPORT");
/* …其余五套规范… */
await Dynamsoft.CVR.CaptureVisionRouter.appendDLModelBuffer([
    "MRZCharRecognition",
    "MRZTextLineRecognition"
]);
cvr = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
await cvr.initSettings("./findPrecisePortraitZone.json" + ASSET_V);
```

加载完模板文件后还应该显式检查模板是否存在，否则失败信息会非常隐晦：

```js
const hasReadPassportAndId = await cvr.checkTemplateNameValidity("ReadPassportAndId");
if (!hasReadPassportAndId) {
    const templateNames = await cvr.getTemplateNames();
    throw new Error("模板 ReadPassportAndId 不可用。当前可用模板：" + templateNames.join(", "));
}
```

这样出错时能直接看到“实际加载了哪些模板”，而不是一句“识别失败”。

## MRZ 识别为什么需要专用模型

模板文件里有几处配置直接对应 MRZ 的物理特性：

```json
{
  "Name": "tls_base",
  "CharacterModelName": "MRZCharRecognition",
  "TextLineRecModelName": "MRZTextLineRecognition",
  "ConfusableCharactersCorrection": {
    "ConfusableCharacters": [["0","O"],["1","I"],["5","S"]],
    "FontNameArray": ["OCR_B"]
  }
}
```

- **易混字符纠正表**：识别时在 `0`/`O`、`1`/`I`、`5`/`S` 之间做纠正。这三对是 MRZ 字体下最典型的混淆组，而且 MRZ 的知识库能帮上忙——`O`、`I` 在数字字段里不合法，`0`、`1` 在姓名里不合法，纠正方向就可以确定。
- **字体名限定为 OCR_B**：告诉引擎按 OCR-B 字体的字形特征做纠正，而不是泛化到所有字体。
- **每行有正则约束**：文本行规范里带着长度与结构模式，例如 TD3 第一行：

```json
"StringRegExPattern": "(P[A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}"
```

意思是“以 P 开头、第 2 位是字母或填充符、随后 3 位国家代码字符、其余 39 位姓名区，整行 44 字符”。这条正则同时承担了格式校验的作用：不符合这个形状的文本行不会被当成 TD3 的第一行。TD1 第二行也有一条类似的、把日期、性别、国籍、校验位位置都写进去的正则。

### 从文本行到结构化字段

识别返回的是若干条文本行，需要先去掉首尾空白、**不加分隔符地拼接**再交给解析器：

```js
const mrzForParsing = mrzTexts.map(t => t.trim()).join('');
const parseResults = await parser.parse(mrzForParsing);
displayParsedMrz(parseResults);
```

拼接时不能插入任何分隔符，因为 MRZ 的字段边界是由规范里的固定位置决定的（例如 TD3 每行 44 字符），多一个字符整行就错位了。

字段读取方式与证件类型相关：护照用 `passportNumber`，身份证件用 `documentNumber`，判断依据是 `documentCode` 是否为 `P`。出生年与有效期年的两位数字要还原成四位，两个规则并不相同：

```js
// 出生年：大于当前年份后两位 → 19xx，否则 20xx
if (parseInt(birthYear) > (new Date().getFullYear() % 100)) {
    birthYear = "19" + birthYear;
} else {
    birthYear = "20" + birthYear;
}
```

有效期则用 `>= 60` 作为分界（`19xx`），因为它预测未来日期，`60` 之前都落在 2000 年代。姓名与号码字段读出来之后要再去掉换行符并修剪空白——识别器返回的文本有时带换行，直接展示会让表格错行。

## 实时轮廓：检测与绘制解耦

相机预览的体验取决于一件反直觉的事：**不要让绘制跟随检测**。

检测循环每 400 毫秒跑一次，用的是 640 px 宽的降采样帧：

```js
const LIVE_DETECT = {
    /* 两次循环"开始时间"的最小间隔——下一个定时器从本次开始计，所以实际节奏
       是 max(intervalMs, 处理耗时)，而不是"处理耗时 + intervalMs"。 */
    intervalMs: 400,
    /* 640 px 的帧足够定位文档轮廓，也让取帧和读回都很便宜。 */
    detectWidth: 640,
    staleMs: 900
};
```

绘制则在 `requestAnimationFrame` 里独立进行，把当前画出的四边形缓动逼近最新检测结果：

```js
function liveEase(dt, tauMs) {
    return 1 - Math.exp(-dt / tauMs);
}
```

缓动系数用指数形式，好处是运动观感与显示器刷新率无关——60 Hz 和 120 Hz 屏幕上看起来一样快；`dt` 会被夹到 100 毫秒以内，防止标签页切回来时轮廓“跳”一下。`tau` 取 90 毫秒用于位置、180 毫秒用于透明度。

900 毫秒内没有新检测结果时轮廓**淡出**而不是立刻消失，这样一个偶发的漏检不会让边框闪烁。轮廓样式是橙色（`#fe8e14`）、线宽 3、虚线 `[10, 7]`。注释里说明了这样做的收益：“每个周期只做一次便宜的轮廓检测，刷新率大约翻倍。”

## 证件照提取

证件照区域不是靠人脸检测找出来的，而是用身份处理能力定位：

```js
async findPortraitZoneForCapturedResult(capturedResult) {
    const identityProcessor = this._getIdentityProcessor();
    if (typeof identityProcessor?.findPortraitZone !== 'function') return null;
    try {
        return await identityProcessor.findPortraitZone();
    } catch (e) {
        console.warn('IdentityProcessor.findPortraitZone() failed:', e);
        return null;
    }
}
```

它需要喂入中间结果，所以处理器注册了一个 `IntermediateResultReceiver`，收集检测到的四边形、去斜后的图像、定位与识别出的文本行、缩放后的彩色图：

```js
this.irr.onDetectedQuadsReceived = (result, info) => {
    if (info.isSectionLevelResult) { this._storeUnit('detectedQuadsUnit', result); }
};
this.irr.onDeskewedImageReceived = (result, info) => { /* … */ };
this.irr.onLocalizedTextLinesReceived = (result, info) => { /* … */ };
await this.irm.addResultReceiver(this.irr);
```

拿到照片区域四边形后的裁剪分三步：按 `-atan2(dy, dx)` 旋转到正立、取外接矩形并留 4 px 边距、最后等比放进 150×150 的画布并居中。

代码里还留了一套备用方案：按文档边框的比例估算照片区域（左边距 3%、上边距 12%、宽 35%、高 45%）。当前调用路径没有用到它，但作为定位失败时的兜底是合理的。

一个需要知道的限制：`IdentityProcessor` **没有**重置或清理接口，只有 `findPortraitZone()`。也就是说它的中间结果由内部自行选择，连续多次识别时调用方不能假设各次之间完全隔离。代码注释对此写得很明确，调用方必须自己注意。

## 剪贴板：一个典型的“看起来能用”的 bug

从剪贴板读图这件事有一段值得引用的注释：

> 真正的 bug 比权限问题更微妙：代码检查了剪贴板里有没有图片，然后取的是 `types[0]`，而大多数应用在你复制截图时会把 `text/html` 放在最前面——于是 `getType` 返回的是一段 HTML blob，却被当作图片送进解码器，按钮就静默失效了，尽管图片明明就在剪贴板里。

修法是在所有类型里找图片：

```js
for (const item of items) {
    const imageType = (item.types || []).find(t => t.startsWith('image/'));
    if (!imageType) continue;
    const blob = await item.getType(imageType);
    processFile(blob);
}
```

另外两条路径的取舍也值得照抄：`paste` 事件不需要任何权限、所有浏览器都支持，而 `navigator.clipboard.read()` 需要 Chromium 内核、需要剪贴板读权限、还要求文档处于聚焦状态。所以按钮走 clipboard API，同时始终监听 `paste` 事件。

## 相机使用要点

相机单独用 `getUserMedia` 打开，而不是 SDK 的相机组件，因为这里只需要一帧全分辨率画面：

```js
navigator.mediaDevices.getUserMedia({
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 }
});
```

按下拍摄后把当前帧冻结成 JPEG 数据 URL、停掉视频流，再在这张冻结帧上做识别——这样识别期间画面不会继续变化，结果和用户看到的画面严格对应。

代码里还有一处细节：相机可以在 MRZ 引擎仍在初始化时就被打开，所以会持续轮询引擎状态，就绪后实时检测自动开始，而不是要求用户重新点一次按钮。

## 常见问题

### MRZ 识别和普通条码识别有什么区别？

MRZ 是印刷文字而不是条码，属于文字行识别（OCR）范畴。它用等宽字体、字符集限定为 A–Z、0–9 和填充符 `<`，且每行有固定的字符数和校验位——这些约束让专用模型能做通用 OCR 做不到的纠错。识别之后还需要按 TD1/TD2/TD3 规范解析出字段。

### 为什么识别 MRZ 要额外加载深度学习模型？

因为要同时完成两件事：定位机读区文本行的位置（文本行定位）和识别字符（字符识别）。示例显式加载 `MRZCharRecognition` 与 `MRZTextLineRecognition` 两个模型，并配套加载字符易混纠正表。

### 证件照是怎么提取出来的？

用 Dynamsoft 的身份处理能力（`IdentityProcessor.findPortraitZone`）从识别的中间结果里定位证件照区域，再把该四边形裁剪并旋转成正立的图像。代码里还保留了一套基于文档边框按比例估算的备用方案。

### 相机预览时为什么只画边框，按下拍摄才读 MRZ？

实时预览用 640 px 宽的降采样帧循环做一次便宜的边框检测，只画文档轮廓，目的是帮用户把证件摆正；按下拍摄后才冻结那一帧的全分辨率原图，做机读区识别与照片提取——这样既能实时给反馈，又不牺牲最终识别精度。

### 从剪贴板粘贴截图为什么容易失败？

常见原因是代码取了剪贴板的第一项（`types[0]`），而复制截图时很多应用会把 `text/html` 放在最前面，于是拿到的是一段 HTML 被当成图片送进解码器。正确做法是在所有类型里查找以 `image/` 开头的那个。

## 测试闭环：合成一份 MRZ 再读回来

真实护照同样是个人数据，不能进测试集。[MRZ 机读区生成器](https://www.dynamsoft.com/codepool/demos/mrz-generator/)可以按 ICAO 9303 生成护照（TD3）、身份证（TD1/TD2）和签证（MRVA/MRVB）的机读区字符串，校验位自动计算，并在画布上渲染出模拟证件预览——正好可以作为这个扫描器的输入样本。

## 相关阅读

- [用 Next.js 编写 OCR 护照上 MRZ 的网页应用](/nextjs-mrz-scanner/)——在框架项目里组织同一套识别流程。
- [Electron 护照扫描桌面应用](/electron-passport-scanner-desktop-app/)——桌面端封装方式。
- [安卓使用 USB 摄像头识别护照 MRZ](/usb-camera-android-mrz-scanner/)——外接摄像头场景。
- [基于 Jetpack Compose 和 CameraX 的护照 MRZ 扫描](/mrz-text-scanner-in-jetpack-compose/)——原生 Android 方案。
- [如何编写一个 Oracle APEX 插件来识别 MRZ 文本](/oracle-apex-mrz-scanner/)——把识别能力接进低代码应用。
