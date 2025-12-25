---
layout: post
title: "微信小程序集成 Dynamsoft Barcode Reader：实现1D/2D多码扫描"
date: 2025-12-25 00:25:53 +0800
categories: barcode
tags: barcode
description: 本文介绍了在微信小程序中集成Dynamsoft Barcode Reader JS WebAssembly SDK实现高性能条码扫描的方法。针对小程序环境特点，文章详细讲解了WASM文件加载、分包策略和延迟初始化等关键技术点。特别分析了iOS、Android和HarmonyOS平台下视频帧数据传输处理的差异方案，包括worker线程优化和零拷贝技术。通过该方案，开发者可以在小程序中实现企业级的多码扫描功能，满足物流仓储等复杂场景需求，同时兼顾性能和包体积限制。最终效果展示表明该方案具有优异的识别精度和响应速
---


在移动应用开发中，条形码和二维码扫描是一个常见的需求。很多应用都自带了扫码功能，但是只能做单码扫描，一般用于个人登录，付款等简单场景。在物流，仓储等商业场景中，扫码需求则更加复杂，需要支持多码识别，高精度识别以及多种码制的支持。

本文将分享如何在微信小程序中集成 Dynamsoft Barcode Reader JS WebAssembly SDK，实现高性能的1D/2D多码扫描功能。

![小程序开发工具](/album/2025/12/wechat-miniapp-dev-tool.png)

## 一、技术选型：为什么选择 Dynamsoft Barcode Reader

### 1.1 需求背景

微信小程序虽然提供了原生的 `wx.scanCode` API，但在某些场景下存在明显的局限性：
- 无法自定义扫码界面和交互逻辑
- 识别精度和速度受限于系统实现
- 无法满足复杂的扫码需求（如批量扫码、特定格式识别等）

因此，我们需要一个能够在小程序环境中运行的高性能扫码引擎。

### 1.2 Dynamsoft Barcode Reader 的优势

Dynamsoft Barcode Reader 是一款企业级的条码识别 SDK，其 WebAssembly 版本特别适合在微信小程序中使用：
- **高精度识别**：支持多种条码格式，识别率高
- **高性能**：基于 WebAssembly，性能接近原生
- **丰富的配置**：提供多种识别模板和参数调优选项
- **跨平台**：同一套代码可在不同平台运行

SDK包含：

```bash
BarcodeReader.js 
dbr.worker.js
dynamsoft-barcode-reader-bundle-ml-simd.js
dynamsoft-barcode-reader-bundle-ml-simd.wasm.br
```


## 二、初步集成：从 WASM 加载开始

### 2.1 微信小程序的 WASM 支持

微信小程序提供了 `WXWebAssembly.instantiate` API 来加载 WASM 模块。与标准的 Web 环境不同，小程序有一些特殊的限制：
- 不支持直接使用 `WebAssembly` 对象，必须使用 `WXWebAssembly`
- WASM 文件必须放在小程序包内，不能动态下载
- 主包大小限制为 2MB，总包大小限制为 20MB

### 2.2 WASM 文件的加载

在 Dynamsoft Barcode Reader 中，我们需要正确配置 WASM 文件的路径：

```javascript
await DBR.BarcodeReader.loadWasm("workers/dbr.worker.js", "subpackages/dbr/wasm/dynamsoft-barcode-reader-bundle-ml-simd.wasm.br");
```

## 三、分包加载：解决主包大小限制

Dynamsoft Barcode Reader 的 WASM 文件压缩（`.wasm.br`）后小于2MB。将 WASM 文件放入分包目录 `subpackages/dbr/` 中，这样就不会占用主包的空间。

```json
{
  "subpackages": [
    {
      "root": "subpackages/dbr",
      "name": "dbr",
      "pages": [
        "pages/scan/index",
        "pages/camera-scan/index",
        "pages/file-scan/index"
      ]
    }
  ]
}
```

### 3.1 延迟初始化策略

由于 WASM 文件位于分包中，如果主包启动时（`app.js` 的 `onLaunch`）立即尝试加载 WASM，可能会因为分包尚未下载完成而失败。

最佳实践是采用**延迟初始化**：

1.  在 `app.js` 中定义 `initSDK` 方法，但不立即调用。
2.  在分包页面的 `onLoad` 生命周期中调用 `app.initSDK()`。

```javascript
// app.js
initSDK: async function () {
  if (this.globalData.wasmInitialized) return;
  // 加载 WASM
  await DBR.BarcodeReader.loadWasm("workers/dbr.worker.js", "subpackages/dbr/wasm/dynamsoft-barcode-reader-bundle-ml-simd.wasm.br");
  // 初始化 License
  await DBR.BarcodeReader.initLicense("YOUR_LICENSE");
  this.globalData.wasmInitialized = true;
}

// subpackages/dbr/pages/scan/index.js
onLoad: async function() {
  await getApp().initSDK();
}
```

## 四、视频帧数据传输和处理
通过`onCameraFrame`接口获取视频帧数据，然后发送到worker中进行处理。针对**iOS**, **Android**和**HarmonyOS**，需要使用不同的方法。`capture`接口封装了worker以及帧数据处理逻辑。

```javascript
const listener = context.onCameraFrame(async (frame) => {
      if (!this.data.isDetecting || this.isProcessing) return;

      this.isProcessing = true;
      try {
          const app = getApp();
          if (app.globalData.BarcodeReader) {
              this.currentFrameSize = { width: frame.width, height: frame.height };
              
              let captureOptions = {
                  width: frame.width,
                  height: frame.height,
                  stride: frame.width * 4,
                  format: 10
              };

              let transfer = false;
              if (this.data.isAndroid) {
                  captureOptions.bytes = frame.data;
                  transfer = true;
              } else if (this.data.isHarmony) {
                  captureOptions.bytes = frame.data;
                  transfer = false;
              } else if (this.data.isIOS) {
                  captureOptions.bytes = null;
              } else {
                  captureOptions.bytes = frame.data;
              }

              try {
                  const result = await app.globalData.BarcodeReader.capture(captureOptions, this.dynamsoftTemplate, transfer);
                  this.handleDynamsoftResult({ captureResult: result });
              } catch (e) {
                  console.error("Capture failed:", e);
                  this.isProcessing = false;
              }
          } else {
              this.isProcessing = false;
          }
      } catch (ex) {
          console.error(ex);
          if (this.data.isDetecting) {
              this.setData({ scanResult: "Error: " + (ex.message || ex) });
          }
          this.isProcessing = false;
      }
  });
  const app = getApp();

  listener.start({
      worker: app.globalData.BarcodeReader.worker
  });
```

- iOS上可以通过[getCameraFrameData](https://developers.weixin.qq.com/miniprogram/dev/api/worker/Worker.getCameraFrameData.html)在worker中获取帧数据。这样就不需要通过前端获取帧数据，提升性能。
- Android上可以通过`postMessage(buf, [buf])`传输ArrayBuffer，避免数据复制，实现零拷贝。
- HarmonyOS上支持比较差，只能通过`postMessage(buf)`拷贝数据的方式传输。

## 五、源码获取
需要源码，可以联系cnsupport@damingsoft.com，或者微信hzdamingsoft。

![联系人](/album/2025/12/contact.png)

## 六、小程序演示

![小程序](/album/2025/12/wechat-miniapp-barcode-scan.jpg)

![演示页面](/album/2025/12/wechat-miniapp-barcode-scanner.jpg)







