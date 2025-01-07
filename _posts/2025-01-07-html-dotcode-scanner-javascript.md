---
layout: post
title: "在浏览器中扫描DotCode码"
date: 2025-01-07 10:39:53 +0800
categories: 条码扫描
tags: 
description: 本文讨论了如何使用Dynamsoft Barcode Reader构建一个HTML页面以在浏览器中扫描DotCode。
---

<style>
.post-container img{
  max-height:400px;
}
</style>


DotCode 是一种二维（2D）矩阵条形码，主要用于烟草行业，其优点是可以通过高速工业打印机和激光雕刻等方式打印。

下面是一包香烟，上面的DotCode代表着其唯一标识符。

![烟盒](/album/2025/01/dotcode/cigarette-pack.jpg)

在本文中，我们将使用[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)的JavaScript版本创建一个HTML页面，以在浏览器中扫描DotCode。


## 新建HTML文件


创建一个包含以下模板的新HTML文件。

```html
<!DOCTYPE html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DotCode Scanner</title>
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
    <h2>DotCode Scanner</h2>
    <button id="startScanBtn">Start Scanning</button>
    <button id="readFromImageBtn">Read from an Image</button>
    <input id="fileInput" type="file" style="display:none;"/>
    <div id="status">Loading...</div>
    <div id="cameraView"></div>
    <div id="result"></div>
  </div>
</body>
</html>
```

## 添加Dynamsoft Barcode Reader

添加下面的代码以引入Dynamsoft Barcode Reader：

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


## 更新设置以扫描DotCode

1. 创建一个名为`dotcode-template.json`的新的JSON文件，内容如下。它包含用于扫描DotCode的配置。

   ```json
   {
     "CaptureVisionTemplates": [
       {
         "Name": "Dotcode",
         "ImageROIProcessingNameArray": [
           "roi_read_dotcode"
         ],
         "Timeout": 700,
         "MaxParallelTasks":0
       }
     ],
     "TargetROIDefOptions": [
       {
         "Name": "roi_read_dotcode",
         "TaskSettingNameArray": [
           "task_read_dotcode"
         ]
       }
     ],
     "BarcodeFormatSpecificationOptions": [
       {
         "Name": "format_specification_read_dotcode",
         "BarcodeFormatIds": [
           "BF_DOTCODE"
         ],
         "MirrorMode": "MM_BOTH"
       }
     ],
     "BarcodeReaderTaskSettingOptions": [
       {
         "Name": "task_read_dotcode",
         "ExpectedBarcodesCount" : 1,
         "BarcodeFormatIds" : [ "BF_DOTCODE" ],
         "LocalizationModes": [
           {
             "Mode" : "LM_STATISTICS_MARKS"
           }
         ],
         "DeblurModes":
         [
           {
             "Mode": "DM_BASED_ON_LOC_BIN"
           },
           {
             "Mode": "DM_THRESHOLD_BINARIZATION"
           },
           {
             "Mode": "DM_DEEP_ANALYSIS"
           }
         ],
         "BarcodeFormatSpecificationNameArray": [
           "format_specification_read_dotcode"
         ],
         "SectionImageParameterArray": [
           {
             "Section": "ST_REGION_PREDETECTION",
             "ImageParameterName": "ip_read_dotcode"
           },
           {
             "Section": "ST_BARCODE_LOCALIZATION",
             "ImageParameterName": "ip_read_dotcode"
           },
           {
             "Section": "ST_BARCODE_DECODING",
             "ImageParameterName": "ip_read_dotcode"
           }
         ]
       }
     ],
     "ImageParameterOptions": [
       {
         "Name": "ip_read_dotcode",
         "BinarizationModes": [
           {
             "Mode": "BM_LOCAL_BLOCK",
             "BlockSizeX": 15,
             "BlockSizeY": 15,
             "EnableFillBinaryVacancy": 0,
             "ThresholdCompensation": 10
           },
           {
             "Mode": "BM_LOCAL_BLOCK",
             "BlockSizeX": 21,
             "BlockSizeY": 21,
             "EnableFillBinaryVacancy": 0,
             "ThresholdCompensation": 10,
             "MorphOperation":"Erode",
             "MorphOperationKernelSizeX":3,
             "MorphOperationKernelSizeY":3,
             "MorphShape":"Ellipse"
           },
           {
             "Mode": "BM_LOCAL_BLOCK",
             "BlockSizeX": 35,
             "BlockSizeY": 35,
             "EnableFillBinaryVacancy": 0,
             "ThresholdCompensation": 10,
             "MorphOperation":"Erode",
             "MorphOperationKernelSizeX":3,
             "MorphOperationKernelSizeY":3,
             "MorphShape":"Ellipse"
           },
           {
             "Mode": "BM_LOCAL_BLOCK",
             "BlockSizeX": 45,
             "BlockSizeY": 45,
             "EnableFillBinaryVacancy": 0,
             "ThresholdCompensation": 25,
             "MorphOperation":"Erode",
             "MorphOperationKernelSizeX":3,
             "MorphOperationKernelSizeY":3,
             "MorphShape":"Ellipse"
           }
         ],
         "GrayscaleEnhancementModes": [
           {
             "Mode": "GEM_GENERAL"
           }
         ],
         "GrayscaleTransformationModes": [
           {
             "Mode": "GTM_INVERTED"
           },
           {
             "Mode": "GTM_ORIGINAL"
           }
         ]
       }
     ]
   }
   ```

   我们可以看到它与图像处理有关。例如，香烟上的DotCode通常是黑底白码的，因此我们可以通过设置`GrayscaleTransformationModes`，首先处理反转颜色的图像。可以在[此页面](https://www.dynamsoft.com/barcode-reader/barcode-types/dotCode/)上了解有关Dynamsoft Barcode Reader如何处理DotCode的更多信息。

2. 使用模板文件。

   ```js
   await cvRouter.initSettings("./dotcode-template.json");
   ```

3. 设置扫描区域，以便条码库仅处理视频帧的一部分。它可以提高条码定位的成功率。用于初始化Camera Enhancer的代码将在下一部分中给出。

   ```js
   await cameraEnhancer.setScanRegion({
     x: 1,
     y: 40,
     width: 98,
     height: 20,
     isMeasuredInPercentage: true,
   });
   ```


## 打开摄像头扫描

1. 初始化Camera Enhancer并将其组件绑定到一个容器。

   ```js
   let cameraView = await Dynamsoft.DCE.CameraView.createInstance();
   let cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);
   document.querySelector("#cameraView").append(cameraView.getUIElement());
   ```

2. 使用Camera Enhancer作为capture vision router的输入，这样它就可以从摄像头获取帧来读取条形码。

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
   let templateName = "Dotcode"
   await cameraEnhancer.open();
   await cvRouter.startCapturing(templateName);
   ```

## 读取图像中的DotCode

除了实时扫描，我们还可以读取图像中的DotCode。

添加用于选择图像文件的事件。选择图像后，使用`capture`方法识别其中的条码。

```js
document.getElementById("readFromImageBtn").addEventListener("click",function(){
  if (initialized) {
    document.getElementById("fileInput").click();
  }else{
    alert("Please wait for the initialization.");
  }
});
document.getElementById("fileInput").addEventListener("change",async function(){
  let files = document.getElementById("fileInput").files;
  if (files.length>0) {
    let file  = files[0];
    let result = await cvRouter.capture(file,templateName);
    displayResults(result);
  }
})
```

好了，demo已经编写好了。


## 源代码

获取源代码来自己试用一下吧：

<https://github.com/tony-xlh/DotCode-Scanner-JS>

