---
layout: post
title: "前端应用中实现快速批量文档扫描"
date: 2024-05-15 09:34:53 +0800
categories: 文档扫描
tags: 
description: 文章分享了如何在前端应用中使用文档扫描仪或摄像头实现快速批量文档扫描。
---

批量文档扫描是将大量纸质文档转换为数字文件的一个过程。

批量文档扫描有许多应用场景，以下是其中的一些：

* 学校。老师经常需要批量扫描试卷来自动录入成绩。
* 出版社。图书编辑需要扫描稿件，与美术编辑、设计师等同事沟通。
* 医院。医院需要扫描医疗记录，记录患者信息。

批量文档扫描可以使用文档扫描仪或摄像头设备完成。

文档扫描仪具有自动进纸和双面扫描功能，可以一次性高效地扫描大量文档页面。而摄像头设备则更加灵活，可以扫描的文档类型更多，如装订好的书籍。

Epson Workforce ES-400 II可在85秒内一次性扫描50页文档。

![Epson文档扫描仪](/album/2024/05/bulk-document-scanning/epson-document-scanner.jpg)

方便用手机进行扫描的支架：

![手机扫描支架](/album/2024/05/bulk-document-scanning/phone-scanner-bin.jpg)

在本文中，我们将编写两个前端应用。一个使用[Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview)控制文档扫描仪，一个使用摄像头进行扫描，使用[Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/docs/core/introduction/)检测文档边界，并使用[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)控制工作流。

在线demo：

* [通过扫描仪扫描文档](https://tony-xlh.github.io/bulk-document-scanner-web/document-scanner-via-twain.html)
* [通过摄像头扫描文档](https://tony-xlh.github.io/bulk-document-scanner-web/document-scanner-via-camera.html)

## 通过扫描仪扫描文档

下面是分步实现过程。

1. 创建一个包含以下模板的新HTML文件。

   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Document Scanning via TWAIN</title>
     <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
   </head>
   <body>
     <h2>Document Scanning via TWAIN</h2>
     <script type="text/javascript">
     </script>
   </body>
   </html>
   ```

2. 在head引入Dynamic Web TWAIN的库。

   ```html
   <script src="https://unpkg.com/dwt@18.5.0/dist/dynamsoft.webtwain.min.js"></script>
   ```

3. 初始化一个Web TWAIN的实例并将其控件绑定到一个容器。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense/?product=dwt)申请其许可证。

   HTML：

   ```html
   <div id="dwtcontrolContainer"></div>
   ```

   JavaScript：

   ```js
   let DWObject;
   let scanners;
   initDWT();

   function initDWT(){
     Dynamsoft.DWT.AutoLoad = false;
     Dynamsoft.DWT.Containers = [];
     Dynamsoft.DWT.ResourcesPath = "https://unpkg.com/dwt@18.5.0/dist";
     let oneDayTrialLicense = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
     Dynamsoft.DWT.ProductKey = oneDayTrialLicense;  
     Dynamsoft.DWT.CreateDWTObjectEx(
       {
         WebTwainId: 'dwtcontrol'
       },
       function(obj) {
         DWObject = obj;
         DWObject.Viewer.bind(document.getElementById('dwtcontrolContainer'));
         DWObject.Viewer.height = "480px";
         DWObject.Viewer.width = "360px";
         DWObject.Viewer.show();
         DWObject.Viewer.setViewMode(2,2);
       },
       function(err) {
         console.log(err);
       }
     );
   }
   ```

4. 列出连接的扫描仪。

   ```js
   let scanners;
   async function loadScanners(){
     scanners = await DWObject.GetDevicesAsync();
     let selScanners = document.getElementById("select-scanner");
     selScanners.innerHTML = "";
     for (let index = 0; index < scanners.length; index++) {
       const scanner = scanners[index];
       let option = new Option(scanner.displayName,index);
       selScanners.appendChild(option);
     }
   }
   ```

5. 使用所选扫描仪扫描文档。它将显示扫描仪的配置界面以执行扫描。

   HTML：

   ```
   <input type="button" value="Scan" onclick="AcquireImage();" />
   ```

   JavaScript：

   ```js
   async function AcquireImage() {
     if (DWObject) {
       const selectedIndex = document.getElementById("select-scanner").selectedIndex;
       const options = {
         IfShowUI:true,
       };
       await DWObject.SelectDeviceAsync(scanners[selectedIndex]);
       await DWObject.OpenSourceAsync();
       await DWObject.AcquireImageAsync(options);
       await DWObject.CloseSourceAsync();
     }
   }
   ```

   屏幕截图：

   ![扫描仪UI](/album/2024/05/bulk-document-scanning/scanner-ui.jpg)

   对扫描做些配置以优化批量文档扫描的性能。我们可以做以下配置：

   1. 启用自动进纸（ADF）。
   2. 如果文档是双面的，启用双面扫描。
   3. 选择合适的分辨率，平衡扫描质量和速度。
   4. 选择合适的色彩模式，优化扫描图像的文件大小。

除了使用扫描仪自身的界面进行配置外，我们还可以使用TWAIN接口，通过代码直接配置扫描行为。

* 通过代码启用自动进纸、双面扫描，并设置分辨率和像素类型：

   HTML：

   ```html
   <label>
     Auto Document Feeder:
     <input type="checkbox" id="ADF"/>
   </label>
   <br/>
   <label>
     Duplex:
     <input type="checkbox" id="duplex"/>
   </label>
   <br/>
   <label>
     Resolution:
     <select id="select-resolution">
       <option value="100">100</option>
       <option value="200">200</option>
       <option value="300" selected>300</option>
     </select>
   </label>
   <br/>
   <label>
     Pixel Type:
     <select id="select-pixeltype">
       <option>Black & White</option>
       <option>Gray</option>
       <option selected>Color</option>
     </select>
   </label>
   ```

   JavaScript：

   ```js
   const selectedIndex = document.getElementById("select-scanner").selectedIndex;
   const options = {
     IfShowUI:document.getElementById("showUI").checked,
     PixelType:document.getElementById("select-pixeltype").selectedIndex,
     Resolution:document.getElementById("select-resolution").selectedOptions[0].value,
     IfFeederEnabled:document.getElementById("ADF").checked,
     IfDuplexEnabled:document.getElementById("duplex").checked
   };
   await DWObject.SelectDeviceAsync(scanners[selectedIndex]);
   await DWObject.OpenSourceAsync();
   await DWObject.AcquireImageAsync(options);
   await DWObject.CloseSourceAsync();
   ```

* 使用条码或PatchCode分隔文档。可以查看此博客以了解更多信息：[使用PatchCode辅助批量文档扫描](https://www.dynamsoft.com/codepool/batch-document-scanning-patch-code-separation.html)

## 通过摄像头扫描文档

接下来，让我们编写一个通过摄像头扫描文档的网页应用。

1. 创建一个包含以下模板的新HTML文件。

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
     <div id="container"></div>
     <script type="text/javascript">
     </script>
   </body>
   </html>
   ```

2. 在head引入Dynamsoft的库。

   ```html
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-core@3.0.30/dist/core.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-license@3.0.20/dist/license.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-normalizer@2.0.20/dist/ddn.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.0.30/dist/cvr.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/ddv.js"></script>
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dynamsoft-document-viewer@1.1.0/dist/ddv.css">
   ```


3. 请求摄像头权限：

   ```js
   async function requestCameraPermission() {
     try {
       const constraints = {video: true, audio: false};
       const stream = await navigator.mediaDevices.getUserMedia(constraints);
       closeStream(stream);
     } catch (error) {
       console.log(error);
       throw error;
     }
   }

   function closeStream(stream){
     if (stream) {
       const tracks = stream.getTracks();
       for (let i=0;i<tracks.length;i++) {
         const track = tracks[i];
         track.stop();  // stop the opened tracks
       }
     }
   }
   ```

4. 列出摄像头：

   ```js
   async function listCameras(){
     let cameraSelect = document.getElementById("select-camera");
     let allDevices = await navigator.mediaDevices.enumerateDevices();
     for (let i = 0; i < allDevices.length; i++){
       let device = allDevices[i];
       if (device.kind == 'videoinput'){
         cameras.push(device);
         cameraSelect.appendChild(new Option(device.label,device.deviceId));
       }
     }
   }
   ```

5. 初始化Dynamsoft Document Viewer和Dynamsoft Document Normalizer（两者一起用也叫Mobile Web Capture）。可以在[这里](https://www.dynamsoft.com/customer/license/trialLicense?product=mwc)申请许可证。

   ```js
   async function initMobileWebCapture(){
     Dynamsoft.Core.CoreModule.loadWasm(["DDN"]);
     Dynamsoft.DDV.Core.loadWasm();

     // Initialize DDN
     await Dynamsoft.License.LicenseManager.initLicense(
       "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==",
       true
     );
     // Initialize DDV
     await Dynamsoft.DDV.Core.init();
   }
   ```

6. 使用Dynamsoft Document Normalizer作为Dynamsoft Document Viewer的文档检测处理程序。

   ```js
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

7. 使用图像编辑组件默认的图像滤镜。

   ```js
   // Configure image filter feature which is in edit viewer
   Dynamsoft.DDV.setProcessingHandler("imageFilter", new Dynamsoft.DDV.ImageFilter());
   ```

8. 创建三个组件的实例：**Capture Viewer** ，用于打开相机并扫描文档；**Perspective Viewer**，用于检测和修改文档边界；**Edit Viewer** ，用于编辑和查看扫描的文档。我们需要配置他们的UI ，然后创建实例。


   1. 初始化Capture Viewer。

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

      // Create a capture viewer
      captureViewer = new Dynamsoft.DDV.CaptureViewer({
          container: "container",
          uiConfig: captureViewerUiConfig,
          viewerConfig: {
              acceptedPolygonConfidence: 60,
              enableAutoDetect: false,
          }
      });
      ```

   2. 初始化Perspective Viewer。

      ```js
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

      // Create a perspective viewer
      perspectiveViewer = new Dynamsoft.DDV.PerspectiveViewer({
          container: "container",
          groupUid: captureViewer.groupUid,
          uiConfig: perspectiveUiConfig,
          viewerConfig: {
              scrollToLatest: true,
          }
      });

      perspectiveViewer.hide();
      ```

   3. 初始化Edit Viewer。

      ```js
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
                      Dynamsoft.DDV.Elements.Download,
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
      // Create an edit viewer
      editViewer = new Dynamsoft.DDV.EditViewer({
          container: "container",
          groupUid: captureViewer.groupUid,
          uiConfig: editViewerUiConfig
      });

      editViewer.hide();
      ```

   4. 定义函数，使三个组件协同工作。

      ```js
      // Register an event in `captureViewer` to show the perspective viewer
      captureViewer.on("showPerspectiveViewer",() => {
          switchViewer(0,1,0);
      });

      // Register an event in `perspectiveViewer` to go back the capture viewer
      perspectiveViewer.on("backToCaptureViewer",() => {
          switchViewer(1,0,0);
          captureViewer.play().catch(err => {alert(err.message)});
      });

      // Register an event in `perspectiveViewer` to show the edit viewer
      perspectiveViewer.on("showEditViewer",() => {
          switchViewer(0,0,1)
      });

      // Register an event in `editViewer` to go back the perspective viewer
      editViewer.on("backToPerspectiveViewer",() => {
          switchViewer(0,1,0);
      });

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

9. 启动Mobile Web Capture的Capture Viewer开始扫描。

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

拍摄一张照片，系统会自动检测并裁剪文档。演示视频：

<video src="https://github.com/xulihang/bulk-document-scanner-web/assets/5462205/7e839b2a-bb93-4cf9-8f2c-36494e4e5cc4" data-canonical-src="https://github.com/xulihang/bulk-document-scanner-web/assets/5462205/7e839b2a-bb93-4cf9-8f2c-36494e4e5cc4" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-width:100%;max-height:640px; min-height: 200px"></video>

我们可以从以下几个方面改进工作流程。可以查看以前的博客以了解更多信息。

* [声控拍照](https://www.dynamsoft.com/codepool/take-a-photo-with-voice-javascript.html)
* [重复文档图像检测](https://www.dynamsoft.com/codepool/duplicate-document-image-detection.html)
* [评估扫描文档的图像质量](https://www.dynamsoft.com/codepool/quality-evaluation-of-scanned-document-images.html)


## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/bulk-document-scanner-web>



