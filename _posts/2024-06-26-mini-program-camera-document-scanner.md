---
layout: post
title: "在小程序中通过摄像头扫描文档"
date: 2024-06-26 14:21:53 +0800
categories: 文档扫描
tags: 
description: 本文介绍了如何使用uni-app编写一个小程序，使用Mobile Web Capture通过摄像头扫描文档。
---

在工作和生活中，我们常需要通过手机扫描文档，例如将打印的做过注释的稿件重新录入电脑，上传身份证件用于身份验证等等。现在许多业务都使用小程序完成，将文档扫描功能集成进小程序也成了一个需求点。

在本文中，我们将用uni-app编写一个小程序来通过摄像头扫描文档。使用Dynamsoft公司的[Mobile Web Capture](https://www.dynamsoft.com/use-cases/mobile-web-capture-sdk/) SDK用于拍照、检测文档边界、裁剪文档并将结果保存为PDF。

演示视频：

<video src="https://github.com/xulihang/uniapp-document-scanner/assets/5462205/c7a439d5-6b67-4901-ad5b-1e56bb7b7f21" data-canonical-src="https://github.com/xulihang/uniapp-document-scanner/assets/5462205/c7a439d5-6b67-4901-ad5b-1e56bb7b7f21" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-height:640px;max-width:100%;"></video>

## 技术方案概览

Mobile Web Capture是基于WASM的一个文档扫描SDK，它不能原生在小程序中运行。我们需要先编写一个文档扫描的网页，然后使用WebView组件去调用它。

网页和小程序可以使用`postMessage`方法进行通讯，但该事件的触发条件比较严格，只有在用户点击分享、复制或者页面后退时才会触发。我们完成文档扫描，想保存为PDF时，需要先回退到小程序中，才能获取PDF的base64数据。

可以使用WebView的IndexedDB存储扫描的文档，便于浏览扫描的历史记录。

## 编写文档扫描Web应用

我们先编写一个文档扫描的Web应用。

### 页面设计

该应用主要包含四个页面。

* 首页

   首页列出扫描过的文档，下方有一个按钮用于新建文档并打开摄像头进行扫描。

   ![首页](/album/2024/06/mini-program/mwc/home.jpg)

* 扫描页面

   扫描页面支持打开和切换摄像头、设置分辨率、启用闪光灯、自动检测文档并拍照等功能。该页面由Mobile Web Capture的CaptureViewer提供。

   ![扫描页面](/album/2024/06/mini-program/mwc/captureViewer.jpg)


* 文档边界编辑页面

   文档边界编辑页面支持编辑检测到的文档的边界。该页面由Mobile Web Capture的PerspectiveViewer提供。

   ![文档边界编辑页面](/album/2024/06/mini-program/mwc/perspectiveViewer.jpg)

* 文档查看和编辑页面

   文档查看和编辑页面支持浏览扫描的文档并进行编辑，可以执行旋转、滤镜等操作，让图像更整洁和清晰。该页面由Mobile Web Capture的EditViewer提供。

   ![文档查看和编辑页面](/album/2024/06/mini-program/mwc/editViewer.jpg)

上述页面，只有首页需要我们自己编写，其它页面都由Mobile Web Capture提供，绑定到一个容器进行显示。

下面是相关代码。

HTML：

```html
<body>
  <nav class="navbar">
    <a class="title" href="#">Document Scanner</a>
  </nav>
  <div class="docs">
  </div>
  <div class="footer">
    <button class="shutter-button round">Scan</button>
  </div>
  <div class="container"></div>
</body>
```

CSS：

```css
.navbar {
  display: flex;
  align-items: center;
  height: 50px;
  background: black;
  width: 100%;
}

.title {
  margin-left: 8px;
  text-decoration: none;
  color: white;
  font-family: sans-serif;
  font-size: larger;
  text-transform: uppercase;
}

.footer {
  display: flex;
  justify-content: center;
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 50px;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12);
}

.shutter-button {
  background-color: black;
  border: none;
  color: white;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  width: 50px;
  height: 50px;
  transform: translateY(-10px);
  cursor: pointer;
}

.shutter-button:hover {
  background-color: rgba(0,0,0,0.8);
}

.round{
  border-radius: 50%;
}

.container {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: none;
}
```

### 添加依赖文件

添加Mobile Web Capture依赖的文件：

```html
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-core@3.0.30/dist/core.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-license@3.0.20/dist/license.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-normalizer@2.0.20/dist/ddn.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.0.30/dist/cvr.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/ddv.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/ddv.css">
```

添加localForage用于操作IndexedDB：

```html
<script src="https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js"></script>
```

### 初始化Mobile Web Capture

1. 设置许可证。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense/?product=mwc)申请。

   ```js
   //one-day trial
   let license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
   await Dynamsoft.License.LicenseManager.initLicense(
     license,
     true
   );
   ```

2. 初始化Dynamsoft Document Viewer，配置其CaptureViewer、PerspectiveViewer和EditViewer。（Dynamsoft Document Viewer是Mobile Web Capture的组件之一）

   ```js
   await Dynamsoft.DDV.Core.init();
   // Configure image filter feature which is in edit viewer
   Dynamsoft.DDV.setProcessingHandler("imageFilter", new Dynamsoft.DDV.ImageFilter());
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
                   {
                       type: "Close",
                       className: "ddv-button-close",
                       events:{ 
                           click: "close"
                       }
                   }
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
                       className: "ddv-button-close",
                       events:{
                           click: "close"
                       }
                   },
                   {
                       type: Dynamsoft.DDV.Elements.Button,
                       className: "ddv-button-done",
                       events:{
                           click: "saveDocument"
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
               ],
           },
       ],
   };
   // Create a capture viewer
   captureViewer = new Dynamsoft.DDV.CaptureViewer({
       container: document.getElementsByClassName("container")[0],
       uiConfig: captureViewerUiConfig,
       viewerConfig: {
           acceptedPolygonConfidence: 60,
           enableAutoDetect: false,
       }
   });

   // Register an event in `captureViewer` to show the perspective viewer
   captureViewer.on("showPerspectiveViewer",() => {
       switchViewer(0,1,0);
   });

   // Create a perspective viewer
   perspectiveViewer = new Dynamsoft.DDV.PerspectiveViewer({
       container: document.getElementsByClassName("container")[0],
       groupUid: captureViewer.groupUid,
       uiConfig: perspectiveUiConfig,
       viewerConfig: {
           scrollToLatest: true,
       }
   });

   perspectiveViewer.hide();

   // Register an event in `perspectiveViewer` to go back the capture viewer
   perspectiveViewer.on("backToCaptureViewer",() => {
       switchViewer(1,0,0);
       captureViewer.play().catch(err => {alert(err.message)});
   });

   // Register an event in `perspectiveViewer` to show the edit viewer
   perspectiveViewer.on("showEditViewer",() => {
       switchViewer(0,0,1)
   });

   // Create an edit viewer
   editViewer = new Dynamsoft.DDV.EditViewer({
       container: document.getElementsByClassName("container")[0],
       groupUid: captureViewer.groupUid,
       uiConfig: editViewerUiConfig
   });

   editViewer.hide();

   // Register an event in `editViewer` to go back the perspective viewer
   editViewer.on("backToPerspectiveViewer",() => {
     switchViewer(0,1,0);
   });
   ```
   
   下面是用于切换viewer的方法：
   
   ```js
   // Define a function to control the viewers' visibility
   function switchViewer(c,p,e) {
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

3. 初始化Dynamsoft Document Normalizer。使用它作为检测文档边界的引擎。

   ```js
   Dynamsoft.Core.CoreModule.loadWasm(["DDN"]);
   Dynamsoft.DDV.Core.loadWasm();
   async function initDocDetectModule(DDV, CVR) {
   const router = await CVR.CaptureVisionRouter.createInstance();
   await router.initSettings("{\"CaptureVisionTemplates\": [{\"Name\": \"Default\"},{\"Name\": \"DetectDocumentBoundaries_Default\",\"ImageROIProcessingNameArray\": [\"roi-detect-document-boundaries\"]},{\"Name\": \"DetectAndNormalizeDocument_Default\",\"ImageROIProcessingNameArray\": [\"roi-detect-and-normalize-document\"]},{\"Name\": \"NormalizeDocument_Binary\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-binary\"]},  {\"Name\": \"NormalizeDocument_Gray\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-gray\"]},  {\"Name\": \"NormalizeDocument_Color\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-color\"]}],\"TargetROIDefOptions\": [{\"Name\": \"roi-detect-document-boundaries\",\"TaskSettingNameArray\": [\"task-detect-document-boundaries\"]},{\"Name\": \"roi-detect-and-normalize-document\",\"TaskSettingNameArray\": [\"task-detect-and-normalize-document\"]},{\"Name\": \"roi-normalize-document-binary\",\"TaskSettingNameArray\": [\"task-normalize-document-binary\"]},  {\"Name\": \"roi-normalize-document-gray\",\"TaskSettingNameArray\": [\"task-normalize-document-gray\"]},  {\"Name\": \"roi-normalize-document-color\",\"TaskSettingNameArray\": [\"task-normalize-document-color\"]}],\"DocumentNormalizerTaskSettingOptions\": [{\"Name\": \"task-detect-and-normalize-document\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-detect-and-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-detect-and-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-detect-and-normalize\"}]},{\"Name\": \"task-detect-document-boundaries\",\"TerminateSetting\": {\"Section\": \"ST_DOCUMENT_DETECTION\"},\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-detect\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-detect\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-detect\"}]},{\"Name\": \"task-normalize-document-binary\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",   \"ColourMode\": \"ICM_BINARY\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]},  {\"Name\": \"task-normalize-document-gray\",   \"ColourMode\": \"ICM_GRAYSCALE\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]},  {\"Name\": \"task-normalize-document-color\",   \"ColourMode\": \"ICM_COLOUR\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]}],\"ImageParameterOptions\": [{\"Name\": \"ip-detect-and-normalize\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7}},{\"Name\": \"ip-detect\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0,\"ThresholdCompensation\" : 7}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7},\"ScaleDownThreshold\" : 512},{\"Name\": \"ip-normalize\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7}}]}");
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
   // Configure document boundaries function
   await initDocDetectModule(Dynamsoft.DDV, Dynamsoft.CVR);
   ```

4. 扫描按钮被点击时，显示并打开CaptureViewer，开始扫描文档。

   ```js
   document.getElementsByClassName("shutter-button")[0].addEventListener("click",function(){
     toggleViewer(true);
     switchViewer(1,0,0);
     const document = Dynamsoft.DDV.documentManager.createDocument();
     captureViewer.openDocument(document.uid);
     captureViewer.play({}).catch(err => {
       alert(err.message)
     });
   })

   function toggleViewer(on){
     let container = document.getElementsByClassName("container")[0];
     if (on == true) {
       container.style.display = "block";
     }else{
       container.style.display = "none";
     }
   }
   ```

5. 在上方的工具栏，我们还定义了退出和保存文档的按钮。下面我们注册事件并执行相关操作。
   ```js
   captureViewer.on("close",() => {
     closeDocumentViewer();
   });
   editViewer.on("close",() => {
     closeDocumentViewer();
   });
   editViewer.on("saveDocument",() => {
     saveDocument();
   });
   ```
   
   用到的方法：
   
   ```js
   async function saveDocument(){
     try {
       let firstPage = await editViewer.currentDocument.saveToJpeg(0);
       let pdf = await editViewer.currentDocument.saveToPdf();
       firstPage = await blobToArrayBuffer(firstPage);
       pdf = await blobToArrayBuffer(pdf);
       let doc = {
         pdf:pdf,
         firstPage:firstPage
       }
       let timestamp = currentDocumentTimestamp ?? new Date().getTime().toString();
       await documentStore.setItem(timestamp,doc);
       toggleViewer(false);
       listScannedDocuments();
     } catch (error) {
       alert(error);
     }
   }
   
   function closeDocumentViewer(){
     captureViewer.stop()
     toggleViewer(false);
   }
   
   function blobToArrayBuffer(blob){
     return new Promise((resolve,reject)=>{
       const reader = new FileReader;
       reader.addEventListener("loadend",function(){
         resolve(reader.result);
       });
       reader.addEventListener("error",reject);
       reader.readAsArrayBuffer(blob);
     });
   }
   ```
   
   扫描的文档会使用时间戳作为key，使用以下结构保存。我们这里使用ArrayBuffer而不是blob，是为了兼容iOS。
   
   ```js
   {
     pdf: arrayBuffer of the PDF,
     firstPage: arrayBuffer of the first page used as cover
   }
   ```

6. 在首页列出扫描的文档。点击可以用Mobile Web Capture打开，也可以执行保存和删除操作。

   ```js
   async function listScannedDocuments(){
     const keys = await documentStore.keys();
     const docs = document.getElementsByClassName("docs")[0];
     docs.innerHTML = "";
     for (let index = 0; index < keys.length; index++) {
       const card = document.createElement("div");
       card.className = "card";
       const timestamp = keys[index];
       const doc = await documentStore.getItem(timestamp);
       const firstPage = doc.firstPage;
       const blob = await arrayBufferToBlob(firstPage);
       const url = URL.createObjectURL(blob);
       const cover = document.createElement("img");
       cover.src = url;
       card.appendChild(cover);
       card.addEventListener("click",function(){
         currentDocumentTimestamp = timestamp;
         openDocument(doc);
       })
       const info = document.createElement("div");
       info.className = "doc-info";
       const title = document.createElement("div");
       title.innerText = formattedDate(timestamp);
       title.className = "doc-title";
       const actions = document.createElement("div");
       actions.className = "actions";
       const saveAsPDFButton = secondaryButton("Save as PDF");
       const deleteButton = secondaryButton("Delete");
       saveAsPDFButton.addEventListener("click",function(e){
         e.stopPropagation();
         saveAsPDF(doc);
       });
       deleteButton.addEventListener("click",function(e){
         e.stopPropagation();
         deleteDocument(timestamp,card)
       });
       actions.appendChild(saveAsPDFButton);
       actions.appendChild(deleteButton);
       const span = document.createElement("div");
       span.style.flex = 1;
       info.appendChild(title);
       card.appendChild(info);
       card.appendChild(span);
       card.appendChild(actions);
       docs.appendChild(card);
     }
   }
   ```

   相关方法：
   
   ```js
   function secondaryButton(text){
     let btn = document.createElement("a");
     btn.className = "d-secondary-btn";
     btn.innerText = text;
     return btn;
   }

   async function openDocument(doc){
     const document = Dynamsoft.DDV.documentManager.createDocument();
     const pdfBlob = await arrayBufferToBlob(doc.pdf)
     const source = {
         fileData: pdfBlob
     };
     await document.loadSource(source);
     editViewer.openDocument(document.uid);
     toggleViewer(true);
     switchViewer(0,0,1);
   }

   function formattedDate(timestamp){
     let date = new Date(parseInt(timestamp));
     return date.toLocaleString();
   }

   function arrayBufferToBlob(buffer,type){
     return new Blob([buffer],{type:type});
   }
   
   async function saveAsPDF(doc){
     const docManager = Dynamsoft.DDV.documentManager;
     const document = docManager.createDocument();
     const pdfBlob = await arrayBufferToBlob(doc.pdf)
     const source = {
       fileData: pdfBlob
     };
     await document.loadSource(source);
     const blob = await document.saveToPdf();
     downloadBlob(blob);
   }

   function downloadBlob(blob){
     const link = document.createElement('a')
     link.href = URL.createObjectURL(blob);
     link.download = "scanned.pdf";
     document.body.appendChild(link)
     link.click()
     document.body.removeChild(link)
     URL.revokeObjectURL(link.href);
   }

   async function deleteDocument(timestamp,card){
     await documentStore.removeItem(timestamp);
     document.getElementsByClassName("docs")[0].removeChild(card);
   }
   ```
   
   CSS：
   
   ```css
   .d-secondary-btn {
     display: inline-block;
     background-color: transparent;
     color: #fe8e14;
     text-align: center;
     cursor: pointer;
     font-family: "sans-serif"
   }
   .d-secondary-btn:active {
     color: #fea543;
   }
   .card {
     display: flex;
     height: 150px;
     margin: 20px;
     border: 1px solid gray;
     border-radius: 5px;
   }
   .card:hover {
     box-shadow: 0 0 5px  orange;
     cursor: pointer;
   }
   .card img {
     height: 120px;
     padding: 10px;
     width: 100px;
     object-fit: cover;
     align-self: center;
   }
   .doc-title {
     padding: 20px 0;
   }
   .docs {
     position: absolute;
     top: 50px;
     width: 100%;
     left: 0;
     height: calc(100% - 95px);
     overflow: auto;
   }
   .docs .actions {
     padding: 20px 0;
   }
   .actions .d-secondary-btn {
     padding: 0 10px;
     text-transform: uppercase;
   }
   ```
   
### 和小程序通讯

下面我们修改页面，让它可以和小程序通讯。

1. 检测是否为小程序的环境，是的话，在页面引入相关JS SDK。

   ```html
   <script>
     loadScripts();
     function loadScripts(){
       var userAgent = navigator.userAgent;
       if (/miniProgram/i.test(userAgent) && /micromessenger/i.test(userAgent)) {
         document.write('<script type="text/javascript" src="https://res.wx.qq.com/open/js/jweixin-1.4.0.js"><\/script>');
         document.write('<script type="text/javascript" src="./uni.webview.1.5.5.js"><\/script>');
       } 
     }
   </script>
   ```
   
2. 在保存为PDF的方法中，如果存在`uni`的namespace，将PDF的blob转为dataURL后用`postMessage`发送，并进行回退操作以便触发小程序端的message事件。

   ```js
   if (window.uni) {
     const dataURL = await blobToDataURL(blob);
     uni.postMessage({
       data: {
         action: 'message',
         pdf: dataURL
       }
     });
     uni.navigateBack({
       delta: 1
     });
   }else{
     downloadBlob(blob);
   }
   
   function blobToDataURL(blob) {
     return new Promise((resolve,reject)=>{
       var reader = new FileReader();
       reader.readAsDataURL(blob);
       reader.addEventListener("error",reject);
       reader.onload = function (e) {
         resolve(e.target.result);
       }
     })
   }
   ```


### 在小程序中使用文档扫描Web应用

添加一个WebView组件，指定页面src为我们编写的文档扫描Web应用。

```html
<template>
  <view>
    <web-view @message="onMessage" src="https://tony-xlh.github.io/mobile-document-scanning/mobile-web-capture-for-mini-program.html"></web-view>
  </view>
</template>
```

接收信息，将dataURL格式的PDF保存到本地并打开。

```html
<script setup lang="ts">
  const onMessage = (e:any) => {
    savePDF(e.target.data[0].pdf);
  }
  const removeDataURLHead = (dataURL:string) => {
    return dataURL.substring(dataURL.indexOf(",")+1,dataURL.length);
  }
  
  const savePDF = (dataURL:string) => {
    console.log("share");
    const path = `${wx.env.USER_DATA_PATH}/scanned.pdf`;
    const fsm = wx.getFileSystemManager();
    fsm.writeFile({
      filePath: path,
      data: removeDataURLHead(dataURL),
      encoding: 'base64',
      success: () => {
         wx.openDocument({
          filePath: path,
          showMenu: true,
          success: () => {
            console.log('打开文档成功')
          },
          fail: () => {
            uni.showToast({
              title: '打开文档失败。',
              duration: 2000
            });
          }
        })
      },
      fail: () => {
        uni.showToast({
          title: '保存文档失败。',
          duration: 2000
        });
      }
    })
  }
</script>
```

![保存为PDF](/album/2024/06/mini-program/mwc/save-as-pdf.jpg)

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/uniapp-document-scanner>



