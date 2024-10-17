---
layout: post
title: "前端扫描EAN/UPC格式的条形码及其附加码"
date: 2024-10-17 09:42:53 +0800
categories: 条码扫描
tags: 
description: 本文讨论了如何使用Dynamsoft Barcode Reader构建一个Web应用，扫描EAN/UPC格式的条形码及其附加码。
---

UPC是一种广泛用于识别零售产品的条形码。EAN在开头增加一位数，是UPC的超集。EAN-13和UPC-A是常见的版本，而EAN-8和UPC-E是较少见的用于小物件的版本。

EAN或UPC码右侧可能附加一个表示2位数（EAN-2或UPC-2）或5位数（EAN-5或UPC-5）的条码。可以用于杂志和书籍，表示当年的期号；也用于食品等称重产品，表示制造商的建议零售价。[^wiki]

在本文中，我们将使用[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)构建一个Web应用，扫描UPC和EAN条形码及其附加码。

[在线demo](https://tony-xlh.github.io/Vanilla-JS-Barcode-Reader-Demos/ean/)

演示视频：

<video src="https://github.com/user-attachments/assets/d4509dc3-451c-455d-8eb7-113b0fc00d7c" controls="controls" muted="muted" style="max-height:640px;max-width:100%;">
</video>

## 特殊的EAN

该演示程序还可以读取以下特殊的EAN：

* ISSN ：用于报纸和杂志的EAN
* ISBN：用于书籍的EAN

## 示例条码图像

1. 一本书上的EAN-13 + EAN-5：

   ![ean-13](/album/2024/10/add-on/ean_13.jpg)

2. 一本杂志上的UPC-E + UPC-2：

   ![upc-e](/album/2024/10/add-on/upc_e.jpg)


## 新建HTML文件

创建一个包含以下模板的新HTML文件。

```html
<!DOCTYPE html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EAN Scanner</title>
  <style>
  h2 {
    text-align: center;
  }

  #app {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  #cameraView {
    width: 100%;
    height: 60vh;
  }
  </style>
</head>
<html>
<body>
  <div id="app">
    <h2>EAN Scanner</h2>
    <button id="startScanBtn">Start Scanning</button>
    <div id="status">Loading...</div>
    <div id="cameraView"></div>
    <div id="result"></div>
  </div>
</body>
</html>
```

## 添加Dynamsoft Barcode Reader

在body中添加下面的代码以引入Dynamsoft Barcode Reader：

```html
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader-bundle@10.4.2000/dist/dbr.bundle.js"></script>
```

## 初始化Dynamsoft Barcode Reader

1. 初始化许可证。可以在此处申请[许可证](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)。

   ```js
   Dynamsoft.License.LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==");
   ```

2. 加载WASM文件。

   ```js
   Dynamsoft.Core.CoreModule.loadWasm(["dbr"]);
   ```

3. 创建capture vision router实例以调用Dynamsoft Barcode Reader。

   ```js
   let cvRouter = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
   ```

## 更新设置以扫描UPC和EAN条形码及其附加代码

1. 获取运行时设置。

   ```js
   let settings = await cvRouter.outputSettings();
   ```

2. 启用`EnableAddOnCode`选项。

   ```js
   let formatOptionsArray = settings.BarcodeFormatSpecificationOptions;
   for (let index = 0; index < formatOptionsArray.length; index++) {
     const options = formatOptionsArray[index];
     options["EnableAddOnCode"] = 1;
   }
   ```

3. 将条形码格式指定为UPC和EAN。

   ```js
   let barcodeOptionsArray = settings.BarcodeReaderTaskSettingOptions;
   for (let index = 0; index < barcodeOptionsArray.length; index++) {
     const options = barcodeOptionsArray[index];
     options["BarcodeFormatIds"] = ["BF_EAN_8","BF_EAN_13","BF_UPC_A","BF_UPC_E"];
   }
   ```

4. 使用修改后的设置。

   ```js
   await cvRouter.initSettings(settings);
   ```

## 打开摄像头扫描

1. 初始化Camera Enhancer并将其组件绑定到一个容器。

   ```js
   let cameraView = await Dynamsoft.DCE.CameraView.createInstance();
   let cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);
   document.querySelector("#cameraView").append(cameraView.getUIElement());
   ```

2. 使用Camera Enhancer作为capture vision router的输入，这样后者就可以从摄像头获取帧来读取条形码。

   ```js
   cvRouter.setInput(cameraEnhancer);
   ```

3. 添加一个过滤器，启用多帧验证，以确保条形码结果正确，并避免过快读取相同的条形码。（可选）

   ```js
   let filter = new Dynamsoft.Utility.MultiFrameResultCrossFilter();
   filter.enableResultCrossVerification("barcode", true);
   filter.enableResultDeduplication("barcode", true);
   await cvRouter.addResultFilter(filter);
   ```

4. 添加结果接收器以接收扫描结果。

   ```js
   cvRouter.addResultReceiver({ onDecodedBarcodesReceived: (result) => {
     displayResults(result);
   }});

   function displayResults(result){
     if (result.barcodeResultItems.length > 0) {
       let container = document.getElementById("result");
       let item = result.barcodeResultItems[0];
       container.innerText = `${item.formatString}: ${item.text}`;
     }
   }
   ```

5. 单击扫描按钮后开始扫描。

   ```js
   await cameraEnhancer.open();
   await cvRouter.startCapturing("ReadBarcodes_Balance");
   ```

好了，我们已经完成了这个demo。

## 源代码

可以在以下软件仓库中找到该demo的源代码：<https://github.com/tony-xlh/Vanilla-JS-Barcode-Reader-Demos/tree/main/ean>

## 参考文献

[^wiki]: <https://en.wikipedia.org/wiki/International_Article_Number>


