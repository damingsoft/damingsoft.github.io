---
layout: post
title: "JavaScript 驾照扫描器：读取 PDF417 并解析 AAMVA 字段"
date: 2026-09-17 14:00:00 +0800
categories: 数据捕获
tags: 证件识别 条码扫描 JavaScript PDF417
description: 北美驾照背面的 PDF417 条码里是一段按 AAMVA 规范组织的明文数据，解码只完成了一半工作，把 27 个字段正确切出来才是重点。本文说明在线驾照扫描器如何把识别范围收窄到 PDF417、为什么必须把图片转成原始 RGBA 缓冲再调用 capture()、Code Parser 返回的 AAMVA 与南非驾照三种 CodeType 怎么分别处理，以及相机路径要处理哪些现实故障。
image: /assets/demos/driver-license-scanner.jpg
faq:
  - q: 这个扫描器支持哪些证件？
    a: 支持 AAMVA DL/ID 规范覆盖的北美驾照与身份证件（含磁条版驾照，CodeType 为 AAMVA_DL_ID_WITH_MAG_STRIPE），以及南非驾照规范。欧盟、英国、澳大利亚、印度、日本、巴西等地的驾照不是 AAMVA 文档，需要各自的国家规范。
  - q: 为什么不直接显示条码里的原始文本？
    a: 原始文本是一串以回车和不可见控制字符分隔的定长字段，直接显示出来对使用者没有意义。扫描器把它解析成具名字段——姓名、出生日期、住址、驾照号、有效期等——再展示，这正是与通用扫码工具的区别。字段名保持 SDK 的驼峰命名（licenseNumber 等），只是在显示时拆成带空格的标题，方便和 AAMVA 元素代码对照。
  - q: 上传图片总是提示没找到条码怎么办？
    a: 先确认拍的是驾照背面的 PDF417 区域，并尽量在光照均匀、无反光的角度拍摄。这个示例只识别 PDF417，不识别正面的一维码；另外上传图片宽度超过 4000 px 时会先等比缩小，极端模糊的图仍可能失败。
  - q: 摄像头打不开怎么办？
    a: 页面会自动回退到上传模式。摄像头访问要求安全上下文，所以必须用 HTTPS 或 localhost，并在浏览器弹窗里允许使用摄像头。
  - q: 条码能解析成功是否说明这张驾照是真的？
    a: 不是。AAMVA 条码是明文，解析成功只能说明数据格式合法，不包含任何防伪校验。真实性与否要看证件的物理特征和签发机关的数据库。
---

![在线驾照条码扫描器界面](/assets/demos/driver-license-scanner.jpg)

驾照背面的那个 PDF417 条码里，是一段按 AAMVA 规范组织的明文数据：姓名、出生日期、住址、驾照号、有效期、身高、眼睛颜色……全都塞在一条几十到几百字节的记录里。解码只是第一步，真正有价值的是把这段没有分隔符的连续文本切成一列具名字段。[在线驾照条码扫描器](https://www.dynamsoft.com/codepool/demos/driver-license-scanner/)做的就是这件事。

## 在线演示

[在线驾照条码扫描器](https://www.dynamsoft.com/codepool/demos/driver-license-scanner/)（英文名 Online Driver License Scanner）：打开就能用，不需要注册，也不需要安装；条码解码与 AAMVA 解析都在浏览器本地完成，上传的图片不会离开设备。

配合本文验证时可以这样走一遍：用配套的 AAMVA 生成器下载一张合成驾照 PNG，在上传模式里扫一次，对照右侧结果面板里的字段名与 AAMVA 元素代码逐项核对；再打开摄像头试一次实时模式，看读到之后的蜂鸣反馈与自动停止采集。

## 关键要点

- SDK 为 `dynamsoft-barcode-reader-bundle@11.6.3200`，加载 `["DBR", "DCP"]` 两个模块：一个解码、一个解析。
- 识别范围被收窄到只认 PDF417，避免正面的一维码或其它码制产生无关结果。
- 解析规范加载两套：`AAMVA_DL_ID`（同时覆盖磁条版驾照）与 `SOUTH_AFRICA_DL`。
- 上传图片必须转成原始 RGBA 字节缓冲（`stride = 4 × 宽度`、`format = 10`）再调用 `capture()`；传 Blob、`HTMLImageElement` 或 canvas 会走另一条内部路径，那条路径会静默返回空结果。
- 相机路径带帧间去重与打开失败重试，相机不可用时自动回退到上传模式。

## 把识别范围收窄到 PDF417

通用扫码工具会开启几十种码制，但驾照扫描只需要 PDF417。收窄范围既提升速度，也避免正面的一维码被误读成结果：

```js
const filter = new Dynamsoft.Utility.MultiFrameResultCrossFilter();
filter.enableResultDeduplication('barcode', true);
await cvRouter.addResultFilter(filter);

const settings = await cvRouter.getSimplifiedSettings('ReadDenseBarcodes');
settings.barcodeSettings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_PDF417;
await cvRouter.updateSettings('ReadDenseBarcodes', settings);
```

模板名 `ReadDenseBarcodes` 是预设之一，适合高密度条码。帧间去重是必须的：相机每秒产出几十帧，同一张驾照会被反复读到，没有去重的话结果面板会每秒刷新几十次。

## 初始化顺序与许可证

许可证必须在创建任何组件之前激活，否则 `CaptureVisionRouter.createInstance()` 直接抛错：

```js
await Dynamsoft.License.LicenseManager.initLicense(resolveLicenseKey(), true);
await Dynamsoft.Core.CoreModule.loadWasm(['DBR', 'DCP']);
await Dynamsoft.DCP.CodeParserModule.loadSpec('AAMVA_DL_ID');
await Dynamsoft.DCP.CodeParserModule.loadSpec('SOUTH_AFRICA_DL');
parser = await Dynamsoft.DCP.CodeParser.createInstance();
```

`initLicense` 的第二个参数让许可证校验在 worker 里执行，不阻塞主线程。从 11.6 版本起，解析器资源按规范拆成独立的 `.data` 文件，`AAMVA_DL_ID` 这一份已经包含了磁条版驾照，不需要单独加载。

许可证按域名选择：托管在 dynamsoft.com 上时用绑定该域名的 Codepool 许可证，其它主机（本地调试、fork）自动回退到 SDK 的公共 24 小时试用 key，并在控制台打印说明、上报一条 `license_fallback` 事件。

## 上传图片：为什么必须构造 RGBA 缓冲

这是整个示例里最容易踩、报错信息又最不友好的一个坑：

```js
function imageToDsImageData(img) {
    var canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, width, height);
    var data = ctx.getImageData(0, 0, width, height);
    return {
        bytes: new Uint8Array(data.data.buffer, data.data.byteOffset, data.data.length),
        width: width, height: height,
        stride: 4 * width,   // 每行字节数
        format: 10           // IPF_ABGR_8888
    };
}
```

这正是 SDK 内部处理“用户选中一个文件”时构造的结构。如果直接把 Blob、`HTMLImageElement` 或 canvas 传给 `capture()`，SDK 会走另一条内部路径，那条路径**不会报错，只是返回空结果**——现象是“上传了图片但什么也没识别到”，很难从错误日志里定位。宽度超过 4000 px 的图会先等比缩小再处理。

### 为什么不用 SDK 自带的图片模式

SDK 有一个 `singleFrameMode = 'image'` 的单帧模式，但它会在激活时立刻弹出操作系统的文件选择框，页面没法先显示一个拖放区域。所以示例自己做了拖放区、粘贴区和文件选择，只在真正拿到图片后调用 `capture()`。另外 `singleFrameMode` 只能在相机关闭状态下修改。

## 解析：三种 CodeType 分别处理

解析器返回的是 JSON 字符串，里面有一个 `CodeType` 字段标识它是哪种证件：

```js
const parsedResult = await parser.parse(bytesToParse);
if (parsedResult.exception) {
    showResults('条码读到了，但不是受支持的驾照格式。');
    return false;
}
const dlInfo = JSON.parse(parsedResult.jsonString);
```

| CodeType | 处理方式 |
| --- | --- |
| `AAMVA_DL_ID` | 在 `ResultInfo` 里找 `commonSubfile` 节点，递归展开其 `ChildFields` |
| `AAMVA_DL_ID_WITH_MAG_STRIPE` | 遍历名称包含 `track` 的节点，再展开子字段 |
| `SOUTH_AFRICA_DL` | 读取顶层 `FieldName`/`Value` 以及子字段 |
| 其它 | 打印警告，不展示结果 |

展开子字段时会排除四个结构性的伪字段，它们不是身份数据：

```js
const excluded = ['dataElementSeparator', 'segmentTerminator', 'subfile', 'subfileType'];
```

最后一个坑在结果形态上：相机路径用流式接收器，条码在 `result.barcodeResultItems` 里；上传路径用 `capture()`，条码在 `result.items` 里。两处都要兼容，否则会出现“相机能扫、上传不能扫”这种看起来毫无道理的现象。

### 南非驾照为什么单独说

南非驾照的 PDF417 是 720 字节，前 4 字节是版本头（v2 为 `01 9b 09 45`，v1 为 `01 e1 02 45`），两字节零，剩下 714 字节分成 6 个 RSA 加密块（5 × 128 加 1 × 74）。密钥由签发机关持有，所以**这个规范只能读真实驾照**——没有可用的合成样本。这也是为什么配套的生成器不提供南非选项：不是工具不支持，是这类数据天然无法合成。

## 相机路径的现实问题

相机相关的代码里有一半在处理失败情况，这些都是在真实使用里撞出来的：

**打开失败要重试一次**。上一个会话释放设备需要时间，紧接着再打开会收到 `Error opening camera: Camera closed.`，等 400 毫秒重试通常就成功：

```js
async function openCamera() {
    try {
        await cameraEnhancer.open();
    } catch (error) {
        console.warn('Camera open failed, retrying once:', error);
        await new Promise(function (resolve) { setTimeout(resolve, 400); });
        await cameraEnhancer.open();
    }
}
```

**相机不可用要回退**。没有摄像头、用户拒绝授权、设备被占用——这些情况下不能把访问者留在一个黑框上，直接切到上传模式即可，上传模式本来就不需要相机。

**读到了要有反馈**。解析成功后蜂鸣一声并停止采集，用户立刻知道“成了”，不用盯着屏幕猜：

```js
async function handleBarcodeResult(result) {
    if (!result.barcodeResultItems || !result.barcodeResultItems.length) return;
    Dynamsoft.DCE.Feedback.beep();
    const ok = await parseDriverLicense(result.barcodeResultItems[0].bytes);
    if (ok) { await cvRouter.stopCapturing(); }
}
```

**错误提示要区分层次**，因为这三件事的处理方式完全不同：

- 图片里没有 PDF417：`这张图片里没有找到 PDF417 条码。请重新拍一张驾照背面的清晰照片。`
- 条码读到了但解析失败：`条码读到了，但不是受支持的驾照格式。`
- 解析过程抛异常：`无法解析这个条码。`

粘贴监听挂在 `document` 上而不是拖放区上，这样用户点过页面任何位置之后直接 `Ctrl+V` 都能用。

## 常见问题

### 这个扫描器支持哪些证件？

支持 AAMVA DL/ID 规范覆盖的北美驾照与身份证件（含磁条版驾照，CodeType 为 `AAMVA_DL_ID_WITH_MAG_STRIPE`），以及南非驾照规范。欧盟、英国、澳大利亚、印度、日本、巴西等地的驾照不是 AAMVA 文档，需要各自的国家规范。

### 为什么不直接显示条码里的原始文本？

原始文本是一串以回车和不可见控制字符分隔的定长字段，直接显示出来对使用者没有意义。扫描器把它解析成具名字段——姓名、出生日期、住址、驾照号、有效期等——再展示，这正是与通用扫码工具的区别。字段名保持 SDK 的驼峰命名（`licenseNumber` 等），只是在显示时拆成带空格的标题，方便和 AAMVA 元素代码对照。

### 上传图片总是提示没找到条码怎么办？

先确认拍的是驾照背面的 PDF417 区域，并尽量在光照均匀、无反光的角度拍摄。这个示例只识别 PDF417，不识别正面的一维码；另外上传图片宽度超过 4000 px 时会先等比缩小，极端模糊的图仍可能失败。

### 摄像头打不开怎么办？

页面会自动回退到上传模式。摄像头访问要求安全上下文，所以必须用 HTTPS 或 `localhost`，并在浏览器弹窗里允许使用摄像头。

### 条码能解析成功是否说明这张驾照是真的？

不是。AAMVA 条码是明文，解析成功只能说明数据格式合法，不包含任何防伪校验。真实性与否要看证件的物理特征和签发机关的数据库。

## 测试闭环：先合成一张，再扫回来

真实驾照是个人数据，不能进测试仓库、不能进 CI、也不能当样例发给客户——所以驾照扫描器往往只对着办公室随手拍的几张照片测过。配套的 [AAMVA 驾照条码生成器](https://www.dynamsoft.com/codepool/demos/driver-license-generator/)可以为美国、加拿大、墨西哥共 71 个辖区生成带正确校验位的合成 PDF417，并渲染成带 SPECIMEN 水印的正反面卡片 PNG，正好把这条链路补上：生成 → 下载 → 扫描 → 比对字段。

需要说明的是生成器的边界：它产出的是**格式合法**的测试数据，不是真实证件，也不代表任何辖区官方规范；合成的证件不能冒充真实证件使用。

## 相关阅读

- [编写一个从摄像头扫描身份证件的网页应用](/scan-id-card-via-camera-web-app/)——证件扫描的通用相机模式实现。
- [构建一个 React Native 身份证扫描应用](/react-native-id-card-scanner/)——移动端的对应方案。
- [编写一个从摄像头扫描身份证件的 Next.js 应用](/nextjs-id-card-scanner-camera/)——在 Next.js 项目中组织相同流程。
- [如何编写一个 Oracle APEX 插件来识别 MRZ 文本](/oracle-apex-mrz-scanner/)——把证件识别集成进低代码平台。
