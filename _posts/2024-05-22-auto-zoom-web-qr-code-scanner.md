---
layout: post
title: "给前端扫码应用添加自动变焦功能"
date: 2024-05-22 11:12:53 +0800
categories: 文档扫描
tags: 
description: 本文介绍了如何在Web应用中控制摄像头自动变焦以扫描二维码。
---

在[上一篇文章](./camera-zoom-control-on-web/)中，我们谈到了如何在Web前端应用中控制摄像头变焦。在本文中，我们将编写一个Web扫码应用，并添加自动控制摄像头变焦以扫描远处微小二维码的功能。

使用[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)读取二维码，检测视频流中是否有二维码。

演示视频：

<video src="https://github.com/tony-xlh/Vanilla-JS-Barcode-Reader-Demos/assets/5462205/aa17838d-47ea-4aa9-9773-c3e8a861486a" data-canonical-src="https://github.com/tony-xlh/Vanilla-JS-Barcode-Reader-Demos/assets/5462205/aa17838d-47ea-4aa9-9773-c3e8a861486a" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-width: 100%; max-height:640px; min-height: 200px"></video>


## 编写一个Web扫码应用

首先，让我们创建一个Web扫码应用。

1. 创建一个包含以下模板的新HTML文件。

   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>QR Code Scanner with Auto-Zoom</title>
     <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
     <style>
       #enhancerUIContainer {
         height: 480px;
         max-width: 100%;
       }

       .results {
         border: 1px black solid;
         margin: 10px 0;
         padding: 5px;
         height: 75px;
         overflow: auto;
       }
     </style>
   </head>
   <body>
     <h2>QR Code Scanner with Auto-Zoom</h2>
     <label>
       Camera:
       <select id="select-camera"></select>
     </label>
     <label>
       Resolution:
       <select id="select-resolution">
         <option value="640x480">640x480</option>
         <option value="1280x720">1280x720</option>
         <option value="1920x1080" selected>1920x1080</option>
         <option value="3840x2160">3840x2160</option>
       </select>
     </label>
     <button onclick="startCamera();">Start Camera</button>
     <br/>
     <div class="results">
       <div>Results:</div>
       <ol></ol>
     </div>
     <div id="enhancerUIContainer"></div>
     <script type="text/javascript">
     </script>
   </body>
   </html>
   ```

2. 在head引入所需的库。

   ```html
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-core@3.2.10/dist/core.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-license@3.2.10/dist/license.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-utility@1.2.10/dist/utility.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader@10.2.10/dist/dbr.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.2.10/dist/cvr.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@4.0.2/dist/dce.js"></script>
   ```

3. 初始化许可证以使用Dynamsoft的SDK。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense/)申请许可证。

   ```js
   let license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial license
   Dynamsoft.License.LicenseManager.initLicense(license);
   ```

4. 初始化用于控制摄像头的Dynamsoft Camera Enhancer。

   ```js
   let cameraView = await Dynamsoft.DCE.CameraView.createInstance();
   cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);
   document.querySelector("#enhancerUIContainer").append(cameraView.getUIElement());
   ```

5. 创建一个capture vision router实例，以调用Dynamsoft Barcode Reader。

   ```js
   Dynamsoft.Core.CoreModule.loadWasm(["dbr"]);
   router = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
   ```

6. 将camera enhancer设置为capture vision router的输入源。capture vision router将尝试获取视频帧并读码。此外，还设置了一个过滤器，以便根据多个帧的扫码结果进行验证以及避免过快返回重复的码值。

   ```js
   router.setInput(cameraEnhancer);

   router.addResultReceiver({ onDecodedBarcodesReceived: (result) => {
     displayResults(result);
   }});

   let filter = new Dynamsoft.Utility.MultiFrameResultCrossFilter();
   filter.enableResultCrossVerification("barcode", true);
   filter.enableResultDeduplication("barcode", true);
   await router.addResultFilter(filter);
   ```

7. 启动所选摄像头，并在摄像头打开后开始读码。

   ```js
   async function startCamera(){
     let selectedCamera = cameras[document.getElementById("select-camera").selectedIndex];
     let selectedResolution = document.getElementById("select-resolution").selectedOptions[0].value;
     let width = parseInt(selectedResolution.split("x")[0]);
     let height = parseInt(selectedResolution.split("x")[1]);

     await cameraEnhancer.selectCamera(selectedCamera);
     await cameraEnhancer.setResolution({width:width, height:height});
     await cameraEnhancer.open();
     await router.startCapturing("ReadSingleBarcode");
   }
   ```

   结果将显示在一个容器中。

   ```js
   function displayResults(result){
     if (result.barcodeResultItems.length > 0) {   
       let ol = document.querySelector(".results ol");
       ol.innerHTML = "";
       for (let index = 0; index < result.barcodeResultItems.length; index++) {
         const item = result.barcodeResultItems[index];
         const li = document.createElement("li");
         li.innerText = item.formatString+": "+item.text;
         ol.appendChild(li);
       }
     }
   }
   ```

## 启用自动变焦

Web扫码应用编写完成后，我们可以添加自动变焦功能，以改善微小或远距离二维码的扫描。如果视频流中有无法读取的二维码，则触发自动变焦。变焦后，如果无法在几秒钟内读取二维码，将返回默认缩放状态。

该功能包含在Dynamsoft Camera Enhancer中。我们可以使用以下代码启用它：

```js
await cameraEnhancer.enableEnhancedFeatures(Dynamsoft.DCE.EnumEnhancedFeatures.EF_AUTO_ZOOM);
```

## 自动变焦的工作原理

那么，自动变焦究竟是如何工作的呢？

如果检测到二维码，但因为太小，无法读取，我们可以触发变焦，以获得更好的二维码图像进行读取。Dynamsoft Barcode Reader的中间结果功能可以用于获取不能被解码，但能被定位到的二维码的位置。

以下是获取位置的代码：

```js
const intermediateResultManager = router.getIntermediateResultManager();
const intermediateResultReceiver = new Dynamsoft.CVR.IntermediateResultReceiver();
intermediateResultReceiver.onLocalizedBarcodesReceived = (result, info) => {
  console.log(result);
};
intermediateResultManager.addResultReceiver(intermediateResultReceiver);
```

然后，我们可以计算变焦系数，以最大化视频流中的二维码图像。

```js
function calculatedFactor(localizedBarcode){
  let left = localizedBarcode.location.points[0].x;
  let top = localizedBarcode.location.points[0].y;
  let video = document.getElementById("video");
  let width = video.videoWidth;
  if (left < width/2) {
    let croppedWidth = Math.max(0,left - 50);
    if (croppedWidth == 0) {
      return 1.0;
    }
    let maxCroppedWidth = top;
    croppedWidth = Math.min(maxCroppedWidth,croppedWidth);
    return width / (width - (croppedWidth * 2));
  }else{
    return 1.0;
  }
}
```


## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/Vanilla-JS-Barcode-Reader-Demos/tree/main/autozoom>

