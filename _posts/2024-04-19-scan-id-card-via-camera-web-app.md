---
layout: post
title: "编写一个从摄像头扫描身份证件的网页应用"
date: 2024-04-19 14:36:53 +0800
categories: 数据捕获
tags: 
description: 本文介绍了如何构建一个网页应用，通过摄像头扫描身份证件。它可以读取身份证、护照和驾照上的MRZ和条形码，提取持有人的信息。
---

身份证件是可用于证明个人身份的证件。身份证件有多种形式：驾驶证、护照和身份证。

条形码和MRZ（机器可读区）通常印在身份证件上，以便用机器提取信息。

加拿大驾照示例：

![驾驶执照](/album/2024/04/id-card-scanner/driver-license.jpg)

荷兰身份证示例：

![身份证](/album/2024/04/id-card-scanner/formal-id-card.jpg)

身份证通常通过摄像头或平板扫描仪进行扫描。在本文中，我们将创建一个网络应用，用于从摄像头扫描身份证。

使用了Dynamsoft的以下SDK：

* [Dynamsoft Camera Enhancer](https://www.dynamsoft.com/camera-enhancer/docs/core/introduction/)：访问摄像头并捕捉帧。
* [Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/docs/core/introduction/)：裁剪扫描文档图像中的证件。
* [Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)：读取驾照上的PDF417。
* [Dynamsoft Label Recognizer](https://www.dynamsoft.com/label-recognition/overview/)：识别身份证件上的MRZ。
* [Dynamsoft Code Parser](https://www.dynamsoft.com/code-parser/docs/core/introduction/)：解析MRZ和条形码以获取有意义的数据。

<video src="https://github.com/xulihang/Web-ID-Card-Scanner-via-Camera/assets/5462205/0cd1d1ca-da7f-426d-a21e-12cc63e2bd15" data-canonical-src="https://github.com/xulihang/Web-ID-Card-Scanner-via-Camera/assets/5462205/0cd1d1ca-da7f-426d-a21e-12cc63e2bd15" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-height:640px; min-height: 200px; max-width: 100%;"></video>

[在线demo](https://tony-xlh.github.io/Web-ID-Card-Scanner-via-Camera/)

## 新建HTML文件

创建一个包含以下模板的新HTML文件。

```html
<!DOCTYPE html>
<html>
<head>
  <title>ID Card Scanner</title>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
  <style></style>
</head>
<body>
  <script type="text/javascript"></script>
</body>
</html>
```

## 添加类库

在head添加以下内容，通过CDN包含这些库：

```html
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-core@3.0.33/dist/core.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-license@3.0.40/dist/license.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader@10.0.21/dist/dbr.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-label-recognizer@3.0.30/dist/dlr.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-normalizer@2.0.20/dist/ddn.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-code-parser@2.0.20/dist/dcp.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.0.32/dist/cvr.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@4.0.2/dist/dce.js"></script>
```

## 布局设计

我们将采用以下设计：

![桌面版界面设计](/album/2024/04/id-card-scanner-camera/screenshot-desktop.jpg)

左侧有一个侧边栏用于选择摄像头及其分辨率，还有一个按钮用于启动相机或捕捉画面。右侧是扫描的文件和摄像头画面的查看器，以及几个用于执行操作的按钮。

如果使用手机，使用以下布局：

![移动版界面设计](/album/2024/04/id-card-scanner-camera/screenshot.jpg)

页面打开后，会提示用户填写使用产品的许可证。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense)申请许可证。

![许可证模态框](/album/2024/04/id-card-scanner-camera/license-modal.jpg)

提取证件信息后，使用模态框显示结果。

![结果模态框](/album/2024/04/id-card-scanner/result-modal.jpg)

代码：

```html
<!DOCTYPE html>
<html>
<head>
  <title>ID Card Scanner</title>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
  <style>
    .scanner {
      display: flex;
    }

    .options {
      flex-basis: 30%;
      background: #F0EDE9;
      overflow: auto;
    }

    .viewer {
      flex-basis: 70%;
      overflow: hidden;
    }

    #documentViewer {
      display: flex;
      flex-wrap: wrap;
      overflow: auto;
      border: 1px solid gray;
      border-radius: 0.5%;
      width: 100%;
      height: 100%;
    }

    #documentViewer canvas{
      width: 30%;
      height: 50%;
      object-fit: contain;
      border: 1px solid gray;
      margin: 5px;
    }

    #documentViewer canvas:hover{
      background-color: azure;
    }

    #documentViewer canvas.selected{
      border: 1px solid orange;
      background-color: azure;
    }

    .dce-video-container, .dce-image-container {
      position: relative;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
    }

    .dce-image-container {
      display: none;
    }

    #confirmBtn {
      position: absolute;
      left: 0;
      z-index: 999;
    }

    #cancelBtn {
      position: absolute;
      right: 0;
      z-index: 999;
    }

    .navbar {
      display: flex;
      align-items: center;
      height: 50px;
      background: black;
      width: 100%;
    }

    body {
      margin: 0;
    }

    .fullwidth {
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

    .scanner {
      min-height: 320px;
      height: calc(100vh - 50px);
    }

    .section {
      padding: 8px;
    }

    .viewer .section {
      height: calc(100% - 16px);
    }

    .options select {
      width: 100%;
      height: 30px;
    }

    .options div {
      margin-bottom: 10px;
    }

    .d-primary-btn {
      display: inline-block;
      background-color: #fe8e14;
      color: #fff;
      text-align: center;
      cursor: pointer;
      transition: ease-in .2s all;
      font-family: "sans-serif"
    }

    .d-secondary-btn {
      display: inline-block;
      background-color: transparent;
      color: #fe8e14;
      text-align: center;
      cursor: pointer;
      font-family: "sans-serif"
    }

    @media(any-hover:hover){
      .d-primary-btn:hover {
        box-shadow: -4px 4px 0 0 #000;
        transform: translate(4px,-4px);
      }
      .d-secondary-btn:hover {
        color: #fea543;
      }
    }

    .d-primary-btn:active {
      color: #fea543;
    }

    .d-secondary-btn:active {
      color: #fea543;
    }

    .actions {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      overflow: auto;
      height: 40px;
      white-space: nowrap;
    }

    .actions .d-primary-btn {
      padding: 5px 10px;
      margin-right: 5px;
    }

    #enhancerUIContainer {
      display: none;
    }

    .main-view {
      height: calc(100% - 40px);
    }

    .ml-10 {
      margin-left: 10px;
    }

    .modal {
      display: flex;
      align-items: flex-start;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width: 250px;
      min-height: 150px;
      border: 1px solid gray;
      border-radius: 5px;
      background: white;
      z-index: 9999;
      padding: 10px;
      visibility: hidden;
    }

    .input-modal.active {
      visibility: inherit;
    }

    .result-modal {
      overflow: auto;
      max-height: 50%;
      max-width: 80%;
    }

    .result-modal.active {
      visibility: inherit;
    }

    .result-modal li {
      margin-bottom: 10px;
    }

    .result-modal img {
      max-width:100px;
    }

    .input-modal input {
      width: calc(100% - 10px);
    }

    .progress-modal {
      align-items: center;
      text-align: center;
      justify-content: center;
      min-height: 50px;
      max-height: 100px;
    }

    .progress-modal.active {
      visibility: inherit;
    }

    table, th, td {
      border: 1px solid black;
      border-collapse: collapse;
    }

    @media screen and (max-device-width: 600px){
      .scanner {
        flex-wrap: wrap;
      }
      .options {
        flex-basis: 100%;
      }
      .viewer {
        flex-basis: 100%;
      }

      .scanner {
        height: auto;
      }

      .main-view {
        height: 300px;
      }

      #documentViewer canvas{
        width: calc(100% - 10px);
        height: 100%;
      }
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <a class="title" href="#">ID Card Scanner</a>
  </nav>
  <div class="container">
    <div class="scanner">
      <div class="options">
        <div class="section">
          <div>
            <label>
              Camera:
              <select id="select-camera"></select>
            </label>
          </div>
          <div>
            <label>
              Resolution:
              <select id="select-resolution">
                <option value="640x480">640x480</option>
                <option value="1280x720">1280x720</option>
                <option value="1920x1080" selected>1920x1080</option>
                <option value="3840x2160">3840x2160</option>
              </select>
            </label>
          </div>
          <div>
            <input type="checkbox" id="autoCropAndCapture"/>
            <label for="autoCropAndCapture">
              Auto Crop and Capture
            </label>
          </div>
          <div>
            <a id="cameraBtn" onclick="performCameraAction();" class="d-primary-btn fullwidth" style="padding-top:5px;padding-bottom:5px;">Start Camera</a>
          </div>
        </div>
      </div>
      <div class="viewer">
        <div class="section" >
          <div id="viewerContainer" class="main-view">
            <div id="documentViewer"></div>
          </div>
          <div id="enhancerUIContainer" class="main-view">
            <div class="dce-video-container"></div>
            <div class="dce-image-container">
              <button id="confirmBtn">Confirm</button>
              <button id="cancelBtn">Cancel</button>
            </div>
          </div>
          <div class="actions">
            <span style="margin-right:10px;">For Selected:</span>
            <a class="d-primary-btn" onclick="deleteSelected();">Delete</a>
            <a class="d-primary-btn" onclick="editSelected();">Edit</a>
            <a class="d-primary-btn" onclick="readSelected();">Read</a>
            <a onclick="triggerFileInput();" class="d-secondary-btn" style="margin-top:5px;">Import Local Image</a>
            <input style="display:none;" type="file" id="file" onchange="loadImageFromFile();" accept=".jpg,.jpeg,.png,.bmp" />
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="modal input-modal">
    <div>
      <div>
        Please input your Dynamsoft Capture Vision's license (<a href="https://www.dynamsoft.com/customer/license/trialLicense" target="_blank">apply</a> or use the one-day trial):
      </div>
      <br/>
      <label>
        Dynamsoft Capture Vision:
      </label>
      <br/>
      <input type="text" id="dcvLicense"/>
      <br/>
      <button id="saveLicenseBtn">Save</button>
    </div>
  </div>
  <div class="modal result-modal">
    <div>
      <p>Results:</p>
      <ol id="results"></ol>
      <button id="closeBtn">Close</button>
    </div>
  </div>
  <div class="modal progress-modal"></div>
</body>
</html>
```

## 摄像头访问

接下来，让我们使用Dynamsoft Camera Enhancer打开摄像头。

1. 创建一个`CameraView`的实例，并将其绑定到一个容器来显示视频流。

   ```js
   let cameraView = await Dynamsoft.DCE.CameraView.createInstance(document.getElementById("enhancerUIContainer"));
   ```

2. 创建一个`CameraEnhancer`的实例，以控制摄像头。

   ```js
   let cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView); //bind the view to the enhancer
   ```

3. 列出连接的摄像头。

   ```js
   async function listCameras(){
     let cameraSelect = document.getElementById("select-camera");
     cameras = await cameraEnhancer.getAllCameras();
     for (let index = 0; index < cameras.length; index++) {
       const camera = cameras[index];
       cameraSelect.appendChild(new Option(camera.label,camera.deviceId));
     }
   }
   ```

4. 以期望的分辨率打开所选摄像头。

   ```js
   async function startCamera(){
     toggleCamera(true);
     let selectedCamera = cameras[document.getElementById("select-camera").selectedIndex];
     let selectedResolution = document.getElementById("select-resolution").selectedOptions[0].value;
     let width = parseInt(selectedResolution.split("x")[0]);
     let height = parseInt(selectedResolution.split("x")[1]);
     await cameraEnhancer.selectCamera(selectedCamera);
     await cameraEnhancer.setResolution({width:width, height:height});
     await cameraEnhancer.open();
   }
   ```

   摄像头打开时，隐藏文件查看器、显示摄像头容器，并切换按钮文本：

   ```js
   function toggleCamera(show){
     let cameraButton = document.getElementById("cameraBtn");
     if (show) {
       document.getElementById("viewerContainer").style.display = "none";
       document.getElementById("enhancerUIContainer").style.display = "block";
       cameraButton.innerText = "Capture";
     }else{
       document.getElementById("viewerContainer").style.display = "block";
       document.getElementById("enhancerUIContainer").style.display = "none";
       cameraButton.innerText = "Start Camera";
     }
   }
   ```

5. 点击捕获按钮后，捕获视频帧，将其作为canvas添加到文件查看器中，并关闭相机。

   ```js
   function captureFrame(){
     let image = cameraEnhancer.fetchImage();
     let viewer = document.getElementById("documentViewer");
     let canvas = image.toCanvas();
     viewer.appendChild(canvas);
     toggleCamera(false);
     cameraEnhancer.close();
     viewer.scroll(0,viewer.scrollHeight);
   }
   ```

## 文件检测和裁剪

我们可以实时检测身份证件，自动捕捉一帧并裁剪证件图像。这可以使用Dynamsoft Document Normalizer来完成。

1. 创建一个capture vision router实例，以调用Dynamsoft的图像处理 SDK。

   ```js
   let router;
   init();
   async function init(){
     Dynamsoft.Core.CoreModule.loadWasm(["DDN","DBR","DLR"]);
     router = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
   }
   ```

2. 建立一个interval，不停检测视频流中的文件。

   ```js
   let processing;
   let interval;
   async function startLiveDetection(){
     //update the runtime settings for detecting documents
     await router.initSettings("{\"CaptureVisionTemplates\": [{\"Name\": \"Default\"},{\"Name\": \"DetectDocumentBoundaries_Default\",\"ImageROIProcessingNameArray\": [\"roi-detect-document-boundaries\"]},{\"Name\": \"DetectAndNormalizeDocument_Default\",\"ImageROIProcessingNameArray\": [\"roi-detect-and-normalize-document\"]},{\"Name\": \"NormalizeDocument_Binary\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-binary\"]},  {\"Name\": \"NormalizeDocument_Gray\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-gray\"]},  {\"Name\": \"NormalizeDocument_Color\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-color\"]}],\"TargetROIDefOptions\": [{\"Name\": \"roi-detect-document-boundaries\",\"TaskSettingNameArray\": [\"task-detect-document-boundaries\"]},{\"Name\": \"roi-detect-and-normalize-document\",\"TaskSettingNameArray\": [\"task-detect-and-normalize-document\"]},{\"Name\": \"roi-normalize-document-binary\",\"TaskSettingNameArray\": [\"task-normalize-document-binary\"]},  {\"Name\": \"roi-normalize-document-gray\",\"TaskSettingNameArray\": [\"task-normalize-document-gray\"]},  {\"Name\": \"roi-normalize-document-color\",\"TaskSettingNameArray\": [\"task-normalize-document-color\"]}],\"DocumentNormalizerTaskSettingOptions\": [{\"Name\": \"task-detect-and-normalize-document\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-detect-and-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-detect-and-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-detect-and-normalize\"}]},{\"Name\": \"task-detect-document-boundaries\",\"TerminateSetting\": {\"Section\": \"ST_DOCUMENT_DETECTION\"},\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-detect\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-detect\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-detect\"}]},{\"Name\": \"task-normalize-document-binary\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",   \"ColourMode\": \"ICM_BINARY\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]},  {\"Name\": \"task-normalize-document-gray\",   \"ColourMode\": \"ICM_GRAYSCALE\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]},  {\"Name\": \"task-normalize-document-color\",   \"ColourMode\": \"ICM_COLOUR\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]}],\"ImageParameterOptions\": [{\"Name\": \"ip-detect-and-normalize\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7}},{\"Name\": \"ip-detect\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0,\"ThresholdCompensation\" : 7}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7},\"ScaleDownThreshold\" : 512},{\"Name\": \"ip-normalize\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7}}]}");
     stopLiveDetection();
     interval = setInterval(processFrame,50);
   }

   function stopLiveDetection(){
     clearInterval(interval);
     processing = false;
     previousDetectionResults = [];
     drawingLayer.clearDrawingItems();
   }

   async function processFrame(){
     if (processing == true) {
       return;
     }
     processing = true;
     let image = cameraEnhancer.fetchImage();
     let result = await router.capture(image,"DetectDocumentBoundaries_Default");
     for (let index = 0; index < result.items.length; index++) {
       const detectionResult = result.items[index];
       if (detectionResult.type ==  Dynamsoft.Core.EnumCapturedResultItemType.CRIT_DETECTED_QUAD) {
         drawOverlay(detectionResult);
         if (steady(detectionResult)) {
           stopLiveDetection();
           appendCroppedFrame(image,detectionResult);
           cameraEnhancer.close();
         }
       }
       break;
     }
     processing = false;
   }
   ```

3. 使用Camera Enhancer高亮显示检测到的文件。创建一个绘图图层用来显示高亮，并更新其样式，使用蓝色作为描边和填充颜色。

   ```js
   let drawingLayer;
   function init(){
     drawingLayer = cameraView.createDrawingLayer();
     let newStyleId = Dynamsoft.DCE.DrawingStyleManager.createDrawingStyle({
         fillStyle: "rgba(100, 75, 245, 0.3)",
         lineWidth: 5,
         paintMode: "strokeAndFill",
         strokeStyle: "rgba(73, 173, 245, 1)"
     });
     drawingLayer.setDefaultStyle(newStyleId);
   }

   function drawOverlay(detectionResult,layer){
     let layerToDraw = layer ?? drawingLayer;
     layerToDraw.clearDrawingItems();
     let quadItem = new Dynamsoft.DCE.QuadDrawingItem(
       {points:detectionResult.location.points}
     );
     layerToDraw.addDrawingItem(quadItem);
   }
   ```

4. 如果文件被检测到五次，并且检测到的四边形的IoU都超过 90%，我们就可以确认文件图像是稳定的。然后，我们可以捕捉一帧画面并关闭摄像头。

   ```js
   function steady(detectionResult){
     if (previousDetectionResults.length < 5) {
       previousDetectionResults.push(detectionResult);
       return false;
     }else{
       let smallIoU = false;
       for (let i = 0; i < previousDetectionResults.length; i++) {
         if (smallIoU) {
           break;
         }
         const result1 = previousDetectionResults[i];
         for (let j = 0; j < previousDetectionResults.length; j++) {
           if (i == j) {
             continue;
           }
           const result2 = previousDetectionResults[j];
           let iou = intersectionOverUnion(result1.location.points,result2.location.points);
           if (iou < 0.9) {
             smallIoU = true;
             break;
           }
         }
       }
       if (smallIoU) {
         previousDetectionResults.splice(0,1);
         previousDetectionResults.push(detectionResult);
         return false;
       }else{
         return true;
       }
     }
   }
   ```

   计算IoU的辅助函数：

   ```js
   function intersectionOverUnion(pts1 ,pts2) {
     let rect1 = getRectFromPoints(pts1);
     let rect2 = getRectFromPoints(pts2);
     return rectIntersectionOverUnion(rect1, rect2);
   }

   function rectIntersectionOverUnion(rect1, rect2) {
     let leftColumnMax = Math.max(rect1.left, rect2.left);
     let rightColumnMin = Math.min(rect1.right,rect2.right);
     let upRowMax = Math.max(rect1.top, rect2.top);
     let downRowMin = Math.min(rect1.bottom,rect2.bottom);

     if (leftColumnMax>=rightColumnMin || downRowMin<=upRowMax){
       return 0;
     }

     let s1 = rect1.width*rect1.height;
     let s2 = rect2.width*rect2.height;
     let sCross = (downRowMin-upRowMax)*(rightColumnMin-leftColumnMax);
     return sCross/(s1+s2-sCross);
   }

   function getRectFromPoints(points) {
     if (points[0]) {
       let left;
       let top;
       let right;
       let bottom;

       left = points[0].x;
       top = points[0].y;
       right = 0;
       bottom = 0;

       points.forEach(point => {
         left = Math.min(point.x,left);
         top = Math.min(point.y,top);
         right = Math.max(point.x,right);
         bottom = Math.max(point.y,bottom);
       });

       let r = {
         left: left,
         top: top,
         right: right,
         bottom: bottom,
         width: right - left,
         height: bottom - top
       };

       return r;
     }else{
       throw new Error("Invalid number of points");
     }
   }
   ```

5. 运行透视变换，根据检测结果获得裁剪过的文件图像，并将其添加到文件查看器中。

   ```js
   async function appendCroppedFrame(image,detectionResult){
     let normalized = await normalizedImage(image,detectionResult.location.points);
     let viewer = document.getElementById("documentViewer");
     if (normalized) {
       viewer.appendChild(normalized.toCanvas());
     }
     toggleCamera(false);
     viewer.scroll(0,viewer.scrollHeight);
   }

   async function normalizedImage(image,points){
     //update the runtime settings for normalizing the image
     await router.initSettings("{\"CaptureVisionTemplates\": [{\"Name\": \"Default\"},{\"Name\": \"DetectDocumentBoundaries_Default\",\"ImageROIProcessingNameArray\": [\"roi-detect-document-boundaries\"]},{\"Name\": \"DetectAndNormalizeDocument_Default\",\"ImageROIProcessingNameArray\": [\"roi-detect-and-normalize-document\"]},{\"Name\": \"NormalizeDocument_Binary\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-binary\"]},  {\"Name\": \"NormalizeDocument_Gray\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-gray\"]},  {\"Name\": \"NormalizeDocument_Color\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-color\"]}],\"TargetROIDefOptions\": [{\"Name\": \"roi-detect-document-boundaries\",\"TaskSettingNameArray\": [\"task-detect-document-boundaries\"]},{\"Name\": \"roi-detect-and-normalize-document\",\"TaskSettingNameArray\": [\"task-detect-and-normalize-document\"]},{\"Name\": \"roi-normalize-document-binary\",\"TaskSettingNameArray\": [\"task-normalize-document-binary\"]},  {\"Name\": \"roi-normalize-document-gray\",\"TaskSettingNameArray\": [\"task-normalize-document-gray\"]},  {\"Name\": \"roi-normalize-document-color\",\"TaskSettingNameArray\": [\"task-normalize-document-color\"]}],\"DocumentNormalizerTaskSettingOptions\": [{\"Name\": \"task-detect-and-normalize-document\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-detect-and-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-detect-and-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-detect-and-normalize\"}]},{\"Name\": \"task-detect-document-boundaries\",\"TerminateSetting\": {\"Section\": \"ST_DOCUMENT_DETECTION\"},\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-detect\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-detect\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-detect\"}]},{\"Name\": \"task-normalize-document-binary\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",   \"ColourMode\": \"ICM_BINARY\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]},  {\"Name\": \"task-normalize-document-gray\",   \"ColourMode\": \"ICM_GRAYSCALE\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]},  {\"Name\": \"task-normalize-document-color\",   \"ColourMode\": \"ICM_COLOUR\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]}],\"ImageParameterOptions\": [{\"Name\": \"ip-detect-and-normalize\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7}},{\"Name\": \"ip-detect\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0,\"ThresholdCompensation\" : 7}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7},\"ScaleDownThreshold\" : 512},{\"Name\": \"ip-normalize\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7}}]}");
     let newSettings = await router.getSimplifiedSettings("NormalizeDocument_Color");
     newSettings.roiMeasuredInPercentage = 0;
     newSettings.roi.points = points;
     await router.updateSettings("NormalizeDocument_Color", newSettings);
     let normalizeResult = await router.capture(image, "NormalizeDocument_Color");
     if (normalizeResult.items[0]) {
       return normalizeResult.items[0];
     }else{
       return null;
     }
   }
   ```

## 条码读取

接下来，在捕获文件图像后，我们可以对其进行处理，提取其中的信息。

使用 Dynamsoft Barcode Reader来读取驾驶执照上的PDF417。只需使用以下代码即可：

```js
let barcodeReadingResult = await router.capture(canvas, "ReadBarcodes_Balance");
```

## MRZ识别

让我们继续使用Dynamsoft Label Recognizer来识别身份证件上的MRZ。

1. 更新运行时设置以识别 MRZ。

   ```js
   await router.initSettings("{\"CaptureVisionTemplates\": [{\"Name\": \"mrz\",\"ImageROIProcessingNameArray\": [\"roi-mrz-passport\"]}],\"TargetROIDefOptions\": [{\"Name\": \"roi-mrz-passport\",\"TaskSettingNameArray\": [\"task-mrz-passport\"]}],\"TextLineSpecificationOptions\": [{\"Name\": \"tls-mrz-text\",\"CharacterModelName\": \"MRZ\",\"StringRegExPattern\": \"([ACI][A-Z<][A-Z<]{3}[A-Z0-9<]{9}[0-9][A-Z0-9<]{15}){(30)}|([0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z<]{3}[A-Z0-9<]{11}[0-9]){(30)}|([A-Z<]{30}){(30)}|([ACIV][A-Z<][A-Z<]{3}[A-Z<]{31}){(36)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}|([PV][A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[A-Z0-9<]{2}){(44)}\",\"StringLengthRange\": [30,44],\"CharHeightRange\": [5,1000,1],\"BinarizationModes\": [{\"BlockSizeX\": 30,\"BlockSizeY\": 30,\"Mode\": \"BM_LOCAL_BLOCK\",\"MorphOperation\": \"Close\"}]},{\"Name\": \"tls-mrz-passport\",\"StringRegExPattern\": \"(P[A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[0-9<][0-9]){(44)}\",\"StringLengthRange\": [44,44],\"BaseTextLineSpecificationName\": \"tls-mrz-text\"}],\"LabelRecognizerTaskSettingOptions\": [{\"Name\": \"mrz-text-task\",\"TextLineSpecificationNameArray\": [\"tls-mrz-text\"],\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-mrz-text\"},{\"Section\": \"ST_TEXT_LINE_LOCALIZATION\",\"ImageParameterName\": \"ip-mrz-text\"},{\"Section\": \"ST_TEXT_LINE_RECOGNITION\",\"ImageParameterName\": \"ip-mrz-text\"}]},{\"Name\": \"task-mrz-passport\",\"TextLineSpecificationNameArray\": [\"tls-mrz-text\"],\"BaseLabelRecognizerTaskSettingName\": \"mrz-text-task\"}],\"CharacterModelOptions\": [{\"Name\": \"MRZ\"}],\"ImageParameterOptions\": [{\"Name\": \"ip-mrz-text\",\"TextureDetectionModes\": [{\"Mode\": \"TDM_GENERAL_WIDTH_CONCENTRATION\",\"Sensitivity\": 8}],\"TextDetectionMode\": {\"Mode\": \"TTDM_LINE\",\"CharHeightRange\": [20,1000,1],\"Sensitivity\": 7}}]}");
   ```

2. 调用Dynamsoft Label Recognizer识别MRZ。

   ```js
   let OCRResult = await router.capture(canvas, "mrz");
   ```

## 解析

获得条码和MRZ结果后，我们可以使用Dynamsoft Code Parser来解析结果。

1. 加载规格文件。

   ```js
   await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD1_ID");
   await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_FRENCH_ID")
   await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_ID")
   await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_VISA")
   await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD3_PASSPORT")  
   await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD3_VISA")
   await Dynamsoft.DCP.CodeParserModule.loadSpec("AAMVA_DL_ID");
   ```

2. 创建一个Code Parser实例

   ```js
   let parser = await Dynamsoft.DCP.CodeParser.createInstance();
   ```

3. 解析条形码结果。

   ```js
   let readingResults = [];
   let imageIndices = [];
   async function parseBarcodeResult(result){
     for (let index = 0; index < result.items.length; index++) {
       const item = result.items[index];
       if (item.type == Dynamsoft.Core.EnumCapturedResultItemType.CRIT_BARCODE) {
         if (item.formatString.indexOf("PDF417") == -1) {
           continue;
         }
         try {
           let parsedResultItem = await parser.parse(item.bytes);
           readingResults.push(parsedResultItem);
         } catch (error) {
           console.log(error);
         }
       }
     }
   }
   ```

4. 解析OCR结果。

   ```js
   async function parseOCRResult(result){
     let str = "";
     if (result.items.length < 2) {
       return;
     }
     for (let index = 0; index < result.items.length; index++) {
       const item = result.items[index];
       if (item.type == Dynamsoft.Core.EnumCapturedResultItemType.CRIT_TEXT_LINE) {
         if (item.text.length == 30 || item.text.length == 44) {
           str = str + item.text;
         }
       }
     }
     if (str) {
       let parsedResultItem = await parser.parse(str);
       readingResults.push(parsedResultItem);
     }
   }
   ```


5. 在模态框中以表格形式显示结果。

   ```js
   let MRZFields = ["documentNumber","passportNumber","issuingState","name","sex","nationality","dateOfExpiry","dateOfBirth"];
   let DLFields = ["licenseNumber","lastName","firstName","city","expirationDate","birthDate","sex","issuedDate"];
   function showResultModal(){
     document.getElementsByClassName("result-modal")[0].classList.add("active");
     let ol = document.createElement("ol");
     ol.id = "results";
     for (let index = 0; index < readingResults.length; index++) {
       const result = readingResults[index];
       let fieldKeyAndValues = [];
       let table = templateTable();
       let body = table.getElementsByTagName("tbody")[0];
       if (result.codeType == "AAMVA_DL_ID") {
         fieldKeyAndValues.push({"field":"type","value":"Driver's License"});
         for (let j = 0; j < DLFields.length; j++) {
           const field = DLFields[j];
           const value = result.getFieldValue(field);
           fieldKeyAndValues.push({"field":field,"value":value});
         }
       }else if (result.codeType.indexOf("MRTD") != -1) {
         fieldKeyAndValues.push({"field":"type","value":"ID Card"});
         for (let j = 0; j < MRZFields.length; j++) {
           const field = MRZFields[j];
           const value = result.getFieldValue(field);
           if (value) {
             fieldKeyAndValues.push({"field":field,"value":value});
           }
         }
       }
       for (let j = 0; j < fieldKeyAndValues.length; j++) {
         let row = document.createElement("tr");
         const item = fieldKeyAndValues[j];
         let fieldCell = document.createElement("td");
         let valueCell = document.createElement("td");
         fieldCell.innerText = item.field;
         valueCell.innerText = item.value;
         row.appendChild(fieldCell);
         row.appendChild(valueCell);
         body.appendChild(row);
       }
       //append image
       let row = document.createElement("tr");
       let fieldCell = document.createElement("td");
       let valueCell = document.createElement("td");
       let canvas = getSelectedCanvas();
       let img = document.createElement("img");
       if (canvas) {
         img.src = canvas.toDataURL();
       }
       fieldCell.innerText = "image";
       valueCell.appendChild(img);
       row.appendChild(fieldCell);
       row.appendChild(valueCell);
       body.appendChild(row);

       let li = document.createElement("li");
       li.append(table);
       ol.appendChild(li);
     }
     document.getElementById("results").outerHTML = ol.outerHTML;
   }

   function templateTable(){
     let table = document.createElement("table");
     let head = document.createElement("thead");
     let headRow = document.createElement("tr");
     let th1 = document.createElement("th");
     th1.innerText = "Field";
     let th2 = document.createElement("th");
     th2.innerText = "Value";
     headRow.appendChild(th1);
     headRow.appendChild(th2);
     head.appendChild(headRow);
     let body = document.createElement("tbody");
     table.appendChild(head);
     table.appendChild(body);
     return table;
   }
   ```


## 源代码

可以在以下软件仓库中找到该demo的源代码：<https://github.com/tony-xlh/Web-ID-Card-Scanner-via-Camera>

