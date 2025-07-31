---
layout: post
title: "在手机浏览器上扫描文档并打印"
date: 2025-03-18 14:29:53 +0800
categories: 文档扫描
tags: 
description: 本文介绍了如何构建一个网页应用，在手机上扫描和打印文档。
---

<style>
img{
  max-height:400px;
}
</style>


```java
package com.dynamsoft.scansinglebarcode;
import android.os.Bundle;
import android.widget.TextView;
import com.dynamsoft.dbrbundle.ui.BarcodeScanResult;
import com.dynamsoft.dbrbundle.ui.BarcodeScannerActivity;
import com.dynamsoft.dbrbundle.ui.BarcodeScannerConfig;
import com.dynamsoft.core.basic_structures.DSRect;
import androidx.activity.result.ActivityResultLauncher;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
public class MainActivity extends AppCompatActivity {
   private ActivityResultLauncher<BarcodeScannerConfig> launcher;
   @Override
   protected void onCreate(@Nullable Bundle savedInstanceState) {
      super.onCreate(savedInstanceState);
      setContentView(R.layout.activity_main);
      TextView textView = findViewById(R.id.tv_result);
      BarcodeScannerConfig config = new BarcodeScannerConfig();
      config.setLicense("DLS2eyJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSJ9");
   }
}
```

使用手机扫描文档并打印方便快捷。在本文中，我们将编写一个支持在手机浏览器中扫描和打印文档的网页应用。

使用Dynamsoft的以下SDK：

* [Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)：它提供了一套用于文档捕获、编辑和保存为PDF的查看器。
* [Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/overview/)：提供文档边缘检测功能。

这个Web应用可以捕获文档图像，调整图像大小，并进行漂白以供打印。

图像捕获：

![捕获查看器](https://devblogs.damingsoft.com/album/2025/03/scan-and-print/capture-viewer.jpg)

扫描的图像（裁剪的）：

![已扫描](https://devblogs.damingsoft.com/album/2025/03/scan-and-print/scanned.jpg)

用于打印的黑白图像：

![黑白图](https://devblogs.damingsoft.com/album/2025/03/scan-and-print/black-white.jpg)

[在线demo](https://tony-xlh.github.io/scan-and-print-document-javascript/)

## 新建HTML文件

创建一个新的HTML文件，内容如下。

```html
<!DOCTYPE html>
<html>
<head>
  <title>Document Scanning via Camera</title>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
  <style>
    #container {
      max-width: 100%;
      height: 480px;
    }
  </style>
</head>
<body>
  <h2>Document Scanning via Camera</h2>
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
  <button onclick="startScanning();">Start</button>
  <div id="container"></div>
  <script type="text/javascript">
  </script>
</body>
</html>
```

## 添加依赖项

1. 添加Dynamsoft Document Viewer。

   ```html
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@latest/dist/ddv.js"></script>
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@latest/dist/ddv.css">
   ```

2. 添加Dynamsoft Document Normalizer（通过引入Capture Vision bundle）。

   ```html
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-bundle@2.6.1000/dist/dcv.bundle.js"></script>
   ```

## 初始化SDK

使用许可证初始化SDK。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)申请许可证。

```js
async function init(){
  // Initialize license
  await Dynamsoft.License.LicenseManager.initLicense(
    "LICENSE-KEY",
    true
  );
  // Initialize DDN
  Dynamsoft.Core.CoreModule.loadWasm(["DDN"]);
  Dynamsoft.DDV.Core.loadWasm();
  // Initialize DDV
  await Dynamsoft.DDV.Core.init();
}
```

## 扫描文档

Dynamsoft Document Viewer为文档扫描提供了多个组件。

我们将使用其`Capture Viewer`通过摄像头捕获文档，使用其`Perspective Viewer`调整检测到的边界，并使用其`Edit Viewer`查看、编辑和保存扫描的文档。

Capture Viewer：

![捕获查看器](https://devblogs.damingsoft.com/album/2025/03/scan-and-print/capture-viewer.jpg)

Perspective Viewer：

![透视查看器](https://devblogs.damingsoft.com/album/2025/03/scan-and-print/perspective-viewer.jpg)

Edit Viewer：

![编辑查看器](https://devblogs.damingsoft.com/album/2025/03/scan-and-print/edit-viewer.jpg)


以下是用于设置这些组件的代码。

1. 初始化Capture Viewer并将其绑定到一个容器。

   ```js
   let captureViewer = new Dynamsoft.DDV.CaptureViewer({
       container: "container",
       uiConfig: captureViewerUiConfig,
       viewerConfig: {
           acceptedPolygonConfidence: 60,
           enableAutoDetect: false,
       }
   });
   ```

2. 初始化Perspective Viewer并将其绑定到一个容器。

   ```js
   let perspectiveViewer = new Dynamsoft.DDV.PerspectiveViewer({
       container: "container",
       groupUid: captureViewer.groupUid,
       uiConfig: perspectiveUiConfig,
       viewerConfig: {
           scrollToLatest: true,
       }
   });
   perspectiveViewer.hide();
   ```

3. 初始化Edit Viewer并将其绑定到一个容器。

   ```js
   editViewer = new Dynamsoft.DDV.EditViewer({
       container: "container",
       groupUid: captureViewer.groupUid,
       uiConfig: editViewerUiConfig
   });
   editViewer.hide();
   ```

4. 使用config对象配置UI。

   ```js
   const captureViewerUiConfig = {
       type: Dynamsoft.DDV.Elements.Layout,
       flexDirection: "column",
       children: [
           {
               type: Dynamsoft.DDV.Elements.Layout,
               className: "ddv-capture-viewer-header-mobile",
               children: [
                   {
                       type: "CameraResolution",
                       className: "ddv-capture-viewer-resolution",
                   },
                   Dynamsoft.DDV.Elements.Flashlight,
               ],
           },
           Dynamsoft.DDV.Elements.MainView,
           {
               type: Dynamsoft.DDV.Elements.Layout,
               className: "ddv-capture-viewer-footer-mobile",
               children: [
                   Dynamsoft.DDV.Elements.AutoDetect,
                   Dynamsoft.DDV.Elements.AutoCapture,
                   {
                       type: "Capture",
                       className: "ddv-capture-viewer-captureButton",
                   },
                   {
                       // Bind click event to "ImagePreview" element
                       // The event will be registered later.
                       type: Dynamsoft.DDV.Elements.ImagePreview,
                       events:{
                           click: "showPerspectiveViewer"
                       }
                   },
                   Dynamsoft.DDV.Elements.CameraConvert,
               ],
           },
       ],
   };


   const perspectiveUiConfig = {
       type: Dynamsoft.DDV.Elements.Layout,
       flexDirection: "column",
       children: [
           {
               type: Dynamsoft.DDV.Elements.Layout,
               className: "ddv-perspective-viewer-header-mobile",
               children: [
                   {
                       // Add a "Back" button in perspective viewer's header and bind the event to go back to capture viewer.
                       // The event will be registered later.
                       type: Dynamsoft.DDV.Elements.Button,
                       className: "ddv-button-back",
                       events:{
                           click: "backToCaptureViewer"
                       }
                   },
                   Dynamsoft.DDV.Elements.Pagination,
                   {   
                       // Bind event for "PerspectiveAll" button to show the edit viewer
                       // The event will be registered later.
                       type: Dynamsoft.DDV.Elements.PerspectiveAll,
                       events:{
                           click: "showEditViewer"
                       }
                   },
               ],
           },
           Dynamsoft.DDV.Elements.MainView,
           {
               type: Dynamsoft.DDV.Elements.Layout,
               className: "ddv-perspective-viewer-footer-mobile",
               children: [
                   Dynamsoft.DDV.Elements.FullQuad,
                   Dynamsoft.DDV.Elements.RotateLeft,
                   Dynamsoft.DDV.Elements.RotateRight,
                   Dynamsoft.DDV.Elements.DeleteCurrent,
                   Dynamsoft.DDV.Elements.DeleteAll,
               ],
           },
       ],
   };

   const editViewerUiConfig = {
       type: Dynamsoft.DDV.Elements.Layout,
       flexDirection: "column",
       className: "ddv-edit-viewer-mobile",
       children: [
           {
               type: Dynamsoft.DDV.Elements.Layout,
               className: "ddv-edit-viewer-header-mobile",
               children: [
                   {
                       // Add a "Back" buttom to header and bind click event to go back to the perspective viewer
                       // The event will be registered later.
                       type: Dynamsoft.DDV.Elements.Button,
                       className: "ddv-button-back",
                       events:{
                           click: "backToPerspectiveViewer"
                       }
                   },
                   Dynamsoft.DDV.Elements.Pagination,
                   {
                       type: Dynamsoft.DDV.Elements.Button,
                       className: "ddv-button-menu",
                       events:{
                           click: "menu"
                       }
                   }
               ],
           },
           Dynamsoft.DDV.Elements.MainView,
           {
               type: Dynamsoft.DDV.Elements.Layout,
               className: "ddv-edit-viewer-footer-mobile",
               children: [
                   Dynamsoft.DDV.Elements.DisplayMode,
                   Dynamsoft.DDV.Elements.RotateLeft,
                   Dynamsoft.DDV.Elements.Crop,
                   Dynamsoft.DDV.Elements.Filter,
                   Dynamsoft.DDV.Elements.Undo,
                   Dynamsoft.DDV.Elements.Delete,
                   Dynamsoft.DDV.Elements.Load,
                   Dynamsoft.DDV.Elements.AnnotationSet,
               ],
           },
       ],
   };
   ```

5. 添加一个辅助函数来切换这些Viewer。

   ```js
   // Define a function to control the viewers' visibility
   const switchViewer = (c,p,e) => {
     captureViewer.hide();
     perspectiveViewer.hide();
     editViewer.hide();

     if(c) {
       captureViewer.show();
     } else {
       captureViewer.stop();
     }

     if(p) perspectiveViewer.show();
     if(e) editViewer.show();
   };
   ```

6. 为用来控制工作流的按钮注册事件。

   ```js
   // Register an event in `perspectiveViewer` to go back the capture viewer
   perspectiveViewer.on("backToCaptureViewer",() => {
       switchViewer(1,0,0);
       captureViewer.play().catch(err => {alert(err.message)});
   });

   // Register an event in `perspectiveViewer` to show the edit viewer
   perspectiveViewer.on("showEditViewer",() => {
       switchViewer(0,0,1)
   });
   // Register an event in `editViewer` to go back to the perspective viewer
   editViewer.on("backToPerspectiveViewer",() => {
       switchViewer(0,1,0);
   });
   ```

7. 定义文档检测处理程序，使用Dynamsoft Document Normalizer进行边缘检测。

   ```js
   // Configure document boundaries function
   await initDocDetectModule(Dynamsoft.DDV, Dynamsoft.CVR);

   async function initDocDetectModule(DDV, CVR) {
     const router = await CVR.CaptureVisionRouter.createInstance();
     class DDNNormalizeHandler extends DDV.DocumentDetect {
       async detect(image, config) {
         if (!router) {
           return Promise.resolve({
             success: false
           });
         };

         let width = image.width;
         let height = image.height;
         let ratio = 1;
         let data;

         if (height > 720) {
           ratio = height / 720;
           height = 720;
           width = Math.floor(width / ratio);
           data = compress(image.data, image.width, image.height, width, height);
         } else {
           data = image.data.slice(0);
         }


         // Define DSImage according to the usage of DDN
         const DSImage = {
           bytes: new Uint8Array(data),
           width,
           height,
           stride: width * 4, //RGBA
           format: 10 // IPF_ABGR_8888
         };

         // Use DDN normalized module
         const results = await router.capture(DSImage, 'DetectDocumentBoundaries_Default');

         // Filter the results and generate corresponding return values
         if (results.items.length <= 0) {
           return Promise.resolve({
             success: false
           });
         };

         const quad = [];
         results.items[0].location.points.forEach((p) => {
           quad.push([p.x * ratio, p.y * ratio]);
         });

         const detectResult = this.processDetectResult({
           location: quad,
           width: image.width,
           height: image.height,
           config
         });
         return Promise.resolve(detectResult);
       }
     }
     DDV.setProcessingHandler('documentBoundariesDetect', new DDNNormalizeHandler())
   }

   //compress the video frames
   function compress(
       imageData,
       imageWidth,
       imageHeight,
       newWidth,
       newHeight,
   ) {
     let source = null;
     try {
         source = new Uint8ClampedArray(imageData);
     } catch (error) {
         source = new Uint8Array(imageData);
     }

     const scaleW = newWidth / imageWidth;
     const scaleH = newHeight / imageHeight;
     const targetSize = newWidth * newHeight * 4;
     const targetMemory = new ArrayBuffer(targetSize);
     let distData = null;

     try {
         distData = new Uint8ClampedArray(targetMemory, 0, targetSize);
     } catch (error) {
         distData = new Uint8Array(targetMemory, 0, targetSize);
     }

     const filter = (distCol, distRow) => {
         const srcCol = Math.min(imageWidth - 1, distCol / scaleW);
         const srcRow = Math.min(imageHeight - 1, distRow / scaleH);
         const intCol = Math.floor(srcCol);
         const intRow = Math.floor(srcRow);

         let distI = (distRow * newWidth) + distCol;
         let srcI = (intRow * imageWidth) + intCol;

         distI *= 4;
         srcI *= 4;

         for (let j = 0; j <= 3; j += 1) {
             distData[distI + j] = source[srcI + j];
         }
     };

     for (let col = 0; col < newWidth; col += 1) {
         for (let row = 0; row < newHeight; row += 1) {
             filter(col, row);
         }
     }

     return distData;
   }
   ```

8. 使用所选摄像头和指定的分辨率启动文档扫描工作流。

   ```js
   async function startScanning(){
     let selectedCamera = cameras[document.getElementById("select-camera").selectedIndex];
     await captureViewer.selectCamera(selectedCamera.deviceId);
     let selectedResolution = document.getElementById("select-resolution").selectedOptions[0].value;
     let width = parseInt(selectedResolution.split("x")[0]);
     let height = parseInt(selectedResolution.split("x")[1]);
     captureViewer.play({
       resolution: [width,height],
     }).catch(err => {
       alert(err.message)
     });
   }
   ```

## 调整图像大小

扫描的文档图像的尺寸可能不符合标准比例，例如A4的210毫米x297毫米。

可以使用Canvas调整图像的大小。

```js
let pageWidth = 210; //mm
let pageHeight = 297; //mm
let DPI = 300;
let pageWidthPx = pageWidth * DPI / 25.4; //convert to pixel
let pageHeightPx = pageHeight * DPI / 25.4;
let docImageBlob = (await editViewer.currentDocument.getPageData(pageUid)).display.data;
let img = document.createElement("img");
img.onload = async function(){
  let resizedDocBlob = await resizeImage(img,docWidthPx,docHeightPx);
  await editViewer.currentDocument.updatePage(pageUid, resizedDocBlob);
};
img.src = URL.createObjectURL(docImageBlob);

function resizeImage(image, width, height) {
  return new Promise((resolve, reject) => {
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    canvas.toBlob(blob => {
      resolve(blob);
    });
  });
}
```

在某些情况下，扫描的文件较小，比如名片，然后我们希望将其打印在一张A4纸上。这时，我们可以先创建一个空白页面，然后在其上添加调整好大小的文档图像。

```js
let docWidth = 89; //mm
let docHeight = 51; //mm
let pageWidth = 210; //mm
let pageHeight = 297; //mm
let DPI = 300;
let pageWidthPx = pageWidth * DPI / 25.4; //convert to pixel
let pageHeightPx = pageHeight * DPI / 25.4;
let docWidthPx = docWidth * DPI / 25.4;
let docHeightPx = docHeight * DPI / 25.4;
let pageBlob = await createEmptyPage(pageWidthPx,pageHeightPx);
let docImageBlob = (await editViewer.currentDocument.getPageData(pageUid)).display.data;
let img = document.createElement("img");
img.onload = async function(){
  let resizedDocBlob = await resizeImage(img,docWidthPx,docHeightPx);
  await editViewer.currentDocument.updatePage(pageUid, pageBlob);
  let newPageData = await editViewer.currentDocument.getPageData(pageUid);
  let ratio = newPageData.cropBox.width / newPageData.display.width;
  const rect = {
    x: 50,
    y: 50,
    width: docWidthPx * ratio,
    height: docHeightPx * ratio
  };
  const options = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    stamp: resizedDocBlob
  };
  const stamp = await Dynamsoft.DDV.annotationManager.createAnnotation(pageUid, "stamp", options); //insert the document image as an annotation so that we can move it around
}
img.src = URL.createObjectURL(docImageBlob);

function createEmptyPage(width,height){
  return new Promise((resolve, reject) => {
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0,0,width,height);
    canvas.toBlob(blob => {
      resolve(blob);
    });  
  })
}
```

![调整后的图像](https://devblogs.damingsoft.com/album/2025/03/scan-and-print/resized-image.jpg)

## 应用图像滤镜

还需要漂白图像以便打印。我们可以使用Dynamsoft Document Viewer的Edit Viewer应用图像滤镜。

![图像滤镜](https://devblogs.damingsoft.com/album/2025/03/scan-and-print/image-filters.jpg)

下面是设置图像滤镜的代码：

```js
// Configure image filter feature which is in edit viewer
Dynamsoft.DDV.setProcessingHandler("imageFilter", new Dynamsoft.DDV.ImageFilter());
```

还可以定义自己的图像滤镜。可以查看[此博客](https://www.dynamsoft.com/codepool/apply-image-filter-to-photo-javascript.html)以了解更多信息。

## 保存为PDF

使用指定的页面类型将文档另存为PDF：

HTML：

```html
<label>
  Page Size:
  <select id="page-size-select">
    <option value="page/default">Default</option>
    <option value="page/a4">A4</option>
    <option value="page/a3">A3</option>
    <option value="page/letter">Letter</option>
  </select>
</label>
```

JavaScript：

```js
async function downloadAsPDF(){
  let pageSize = document.getElementById("page-size-select").selectedOptions[0].value;
  const pdfSettings = {
    compression: "pdf/jpeg",
    pageType: pageSize
  };
  const blob = await editViewer.currentDocument.saveToPdf(pdfSettings);
  downloadBlob(blob,"document.pdf");
};

function downloadBlob(blob,filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
```

## 打印文档

使用连接的打印机打印PDF文档。

在手机上，我们主要使用无线打印。

在iOS设备上，我们可以使用AirPrint。

![airprint](https://devblogs.damingsoft.com/album/2025/03/scan-and-print/airprint.jpg)

在安卓设备上，我们可以使用Mopria。

![mopria](https://devblogs.damingsoft.com/album/2025/03/scan-and-print/mopria.jpg)

## 源代码

欢迎下载源代码并尝试使用。

<https://github.com/tony-xlh/scan-and-print-document-javascript/>

