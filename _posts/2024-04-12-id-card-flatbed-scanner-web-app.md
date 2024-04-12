---
layout: post
title: "编写一个从平板扫描仪扫描身份证件的网页应用"
date: 2024-04-12 10:10:53 +0800
categories: 数据捕获
tags: 
description: 这篇文章讲述了如何构建一个网页应用来从平板扫描仪扫描身份证件。
---

身份证件是可用于证明个人身份的证件。身份证件有多种形式：驾驶证、护照和身份证。

条形码和MRZ（机器可读区）通常印在身份证件上，以便用机器提取信息。

加拿大驾照示例：

![驾驶执照](/ablum/2024/04/id-card-scanner/driver-license.jpg)

荷兰身份证示例：

![身份证](/ablum/2024/04/id-card-scanner/formal-id-card.jpg)

身份证通常通过摄像头或平板扫描仪进行扫描。在本文中，我们将创建一个网络应用，用于从平板扫描仪扫描身份证。

使用了Dynamsoft的以下SDK：

* [Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview)：从文档扫描仪获取图像。
* [Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/docs/core/introduction/)：裁剪扫描文档图像中的证件。
* [Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)：读取驾照上的PDF417。
* [Dynamsoft Label Recognizer](https://www.dynamsoft.com/label-recognition/overview/)：识别身份证件上的MRZ。
* [Dynamsoft Code Parser](https://www.dynamsoft.com/code-parser/docs/core/introduction/)：解析 MRZ 和条形码以获取有意义的数据。

<video src="https://github.com/xulihang/Web-ID-Card-Flatbed-Scanner/assets/5462205/2967326d-1a45-4a33-b4c5-429f4c0451cc" data-canonical-src="https://github.com/xulihang/Web-ID-Card-Flatbed-Scanner/assets/5462205/2967326d-1a45-4a33-b4c5-429f4c0451cc" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-height:640px; min-height: 200px; max-width: 100%;"></video>

[在线demo](https://tony-xlh.github.io/Web-ID-Card-Flatbed-Scanner/)

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
<script src="https://unpkg.com/dwt@18.4.2/dist/dynamsoft.webtwain.min.js"></script>
```

## 布局设计

我们将采用以下设计：

![设计](/ablum/2024/04/id-card-scanner/screenshot.jpg)

左侧有一个侧边栏，用于配置和执行文档扫描。右侧有一个扫描文档查看器和几个执行操作的按钮。

页面打开后，会提示用户填写使用产品的许可证。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense)申请许可证。

![许可证模态框](/ablum/2024/04/id-card-scanner/license-modal.jpg)

提取证件信息后，使用模态框显示结果。

![结果模态框](/ablum/2024/04/id-card-scanner/result-modal.jpg)

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

    .d-primary-btn:hover {
      box-shadow:-4px 4px #000;
      transform: translate(4px,-4px)
    }

    .d-secondary-btn {
      display: inline-block;
      background-color: transparent;
      color: #fe8e14;
      text-align: center;
      cursor: pointer;
      font-family: "sans-serif"
    }

    .d-secondary-btn:hover {
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

    #dwtcontrolContainer {
      height: calc(100% - 40px);
    }

    #cropper {
      display: none;
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

      #dwtcontrolContainer {
        height: 400px;
      }

      #cropper {
        height: 400px;
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
              Scanner:
              <select id="select-scanner"></select>
            </label>
          </div>
          <div>
            <label>
              Resolution:
              <select id="select-resolution">
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300" selected>300</option>
              </select>
            </label>
          </div>
          <div>
            <label>
              Pixel Type:
              <select id="select-pixeltype">
                <option>Black & White</option>
                <option>Gray</option>
                <option selected>Color</option>
              </select>
            </label>
          </div>
          <div>
            <input type="checkbox" id="showUI"/>
            <label for="showUI">
              Show Scanner UI
            </label>
          </div>
          <div>
            <input type="checkbox" id="useADF"/>
            <label for="useADF">
              Auto Document Feeder
            </label>
          </div>
          <div>
            <input type="checkbox" id="useDuplex"/>
            <label for="useDuplex">
              2-side Scan
            </label>
          </div>
          <div>
            <a onclick="scan();" class="d-primary-btn fullwidth" style="padding-top:5px;padding-bottom:5px;">Scan</a>
            <a onclick="loadImages();" class="d-secondary-btn fullwidth" style="margin-top:5px;">Import Local Image</a>
          </div>
          <div style="margin-top:2em;">
            Based on <a target="_blank" href="https://www.dynamsoft.com/web-twain/overview">Dynamic Web TWAIN</a>.
          </div>
        </div>
      </div>
      <div class="viewer">
        <div class="section" >
          <div id="dwtcontrolContainer"></div>
          <div class="actions">
            <a class="d-primary-btn" onclick="showEditor();">Edit</a>
            <a class="d-primary-btn" onclick="cropAll();">Crop All</a>
            <a class="d-primary-btn" onclick="readAll();">Read All</a>
            <a class="d-primary-btn" onclick="save();">Save</a>
            <label>
              Output Format:
              <select id="select-format">
                <option>PDF</option>
                <option>JPG</option>
                <option>PNG</option>
              </select>
            </label>
            <span id="status" class="ml-10"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="modal input-modal">
    <div>
      <div>
        Please input your Dynamic Web TWAIN and Dynamsoft Capture Vision's licenses (<a href="https://www.dynamsoft.com/customer/license/trialLicense" target="_blank">apply</a> or use the one-day trial):
      </div>
      <br/>
      <label>
        Dynamic Web TWAIN:
      </label>
      <br/>
      <input type="text" id="dwtLicense"/>
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
  <script type="text/javascript"></script>
</body>
</html>
```

## 文件扫描

接下来，让我们使用Dynamic Web TWAIN扫描文档。

1. 配置相关设置并创建Dynamic Web TWAIN 的新实例。将实例绑定到容器，以显示文档查看器。

   ```js
   let DWObject;
   Dynamsoft.DWT.AutoLoad = false;
   Dynamsoft.DWT.Containers = [];
   Dynamsoft.DWT.ResourcesPath = "https://unpkg.com/dwt@18.4.2/dist";
   let oneDayTrialLicense = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
   Dynamsoft.DWT.ProductKey = oneDayTrialLicense;
   Dynamsoft.DWT.CreateDWTObjectEx(
     {
       WebTwainId: 'dwtcontrol'
     },
     function(obj) {
       DWObject = obj;
       DWObject.Viewer.bind(document.getElementById('dwtcontrolContainer'));
       DWObject.Viewer.height = "100%";
       DWObject.Viewer.width = "100%";
       DWObject.Viewer.show();
       DWObject.Viewer.setViewMode(2,2);
       loadScanners();
     },
     function(err) {
       console.log(err);
     }
   );
   ```

2. 列出扫描仪。

   ```js
   async function loadScanners(){
     scanners = await DWObject.GetDevicesAsync();
     console.log(scanners);
     let selScanners = document.getElementById("select-scanner");
     selScanners.innerHTML = "";
     for (let index = 0; index < scanners.length; index++) {
       const scanner = scanners[index];
       let option = new Option(scanner.displayName,index);
       selScanners.appendChild(option);
     }
   }
   ```

3. 使用选定的扫描仪和设置执行文档扫描。

   ```js
   async function scan(){
     const selectedIndex = document.getElementById("select-scanner").selectedIndex;
     const options = {
       IfShowUI:document.getElementById("showUI").checked,
       PixelType:document.getElementById("select-pixeltype").selectedIndex,
       Resolution:document.getElementById("select-resolution").selectedOptions[0].value,
       IfFeederEnabled:document.getElementById("useADF").checked,
       IfDuplexEnabled:document.getElementById("useDuplex").checked
     };
     await DWObject.SelectDeviceAsync(scanners[selectedIndex]);
     await DWObject.OpenSourceAsync();
     await DWObject.AcquireImageAsync(options);
     await DWObject.CloseSourceAsync();
   }
   ```

4. 将扫描文件保存为 PDF、JPG 或 PNG 格式。

   ```js
   function save(){
     let selectedIndex = document.getElementById("select-format").selectedIndex;
     const onSuccess = () => {
       alert("Saved");
     };
     const onError = (errorCode,errorString) => {
       alert(errorString);
     };
     if (selectedIndex === 0) {
       DWObject.SaveAllAsPDF("Scanned.pdf",onSuccess,onError);
     }else if (selectedIndex === 1) {
       DWObject.SaveAsJPEG("Scanned.jpg", DWObject.CurrentImageIndexInBuffer,onSuccess,onError);
     }else if (selectedIndex === 2) {
       DWObject.SaveAsPNG("Scanned.png", DWObject.CurrentImageIndexInBuffer,onSuccess,onError);
     }
   }
   ```

## 文件裁剪

扫描的文档图像可能是 A4 大小的图像。我们需要裁剪文件。

例子：

![扫描文件](/ablum/2024/04/id-card-scanner/scanned_document.jpg)

我们可以使用Dynamsoft Document Normalizer来实现这一功能。

1. 创建一个capture vision router实例，以调用 Dynamsoft的图像处理 SDK。

   ```js
   let router;
   init();
   async function init(){
     Dynamsoft.Core.CoreModule.loadWasm(["DDN","DBR","DLR"]);
     router = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
   }
   ```

2. 将通过Web TWAIN 描的文档图像获取为blob。

   ```js
   async function convertToBlob(index){
     return new Promise((resolve, reject) => {
       DWObject.ConvertToBlob(
         [index],
         Dynamsoft.DWT.EnumDWT_ImageType.IT_PNG,
         function (result, indices, type) {
           resolve(result);
         },
         function (errorCode, errorString) {
           reject(errorString);
         }
       );
     })
   }
   ```

3. 更新运行时设置，使用以下二值化模式：

   ```json
   {
     "ImageParameterOptions": [
       {
         "Name": "ip-detect-and-normalize",
         "BinarizationModes": [
           {
             "Mode": "BM_THRESHOLD",
             "BinarizationThreshold": 252
           }
         ]
       }
     ]
   }
   ```

   使用固定阈值将图像转换为二值图，以检测文档边界。由于文件位于白色背景上，因此使用固定阈值是合适的。

   实际的JavaScript代码：

   ```js
   await router.initSettings("{\"CaptureVisionTemplates\": [{\"Name\": \"Default\"},{\"Name\": \"DetectDocumentBoundaries_Default\",\"ImageROIProcessingNameArray\": [\"roi-detect-document-boundaries\"]},{\"Name\": \"DetectAndNormalizeDocument_Default\",\"ImageROIProcessingNameArray\": [\"roi-detect-and-normalize-document\"]},{\"Name\": \"NormalizeDocument_Binary\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-binary\"]},{\"Name\": \"NormalizeDocument_Gray\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-gray\"]},{\"Name\": \"NormalizeDocument_Color\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-color\"]}],\"TargetROIDefOptions\": [{\"Name\": \"roi-detect-document-boundaries\",\"TaskSettingNameArray\": [\"task-detect-document-boundaries\"]},{\"Name\": \"roi-detect-and-normalize-document\",\"TaskSettingNameArray\": [\"task-detect-and-normalize-document\"]},{\"Name\": \"roi-normalize-document-binary\",\"TaskSettingNameArray\": [\"task-normalize-document-binary\"]},{\"Name\": \"roi-normalize-document-gray\",\"TaskSettingNameArray\": [\"task-normalize-document-gray\"]},{\"Name\": \"roi-normalize-document-color\",\"TaskSettingNameArray\": [\"task-normalize-document-color\"]}],\"DocumentNormalizerTaskSettingOptions\": [{\"Name\": \"task-detect-and-normalize-document\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-detect-and-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-detect-and-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-detect-and-normalize\"}]},{\"Name\": \"task-detect-document-boundaries\",\"TerminateSetting\": {\"Section\": \"ST_DOCUMENT_DETECTION\"},\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-detect\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-detect\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-detect\"}]},{\"Name\": \"task-normalize-document-binary\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"ColourMode\": \"ICM_BINARY\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]},{\"Name\": \"task-normalize-document-gray\",\"ColourMode\": \"ICM_GRAYSCALE\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]},{\"Name\": \"task-normalize-document-color\",\"ColourMode\": \"ICM_COLOUR\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]}],\"ImageParameterOptions\": [{\"Name\": \"ip-detect-and-normalize\",\"BinarizationModes\": [{\"Mode\": \"BM_THRESHOLD\", \"BinarizationThreshold\": 250}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7}},{\"Name\": \"ip-detect\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0,\"ThresholdCompensation\": 7}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7},\"ScaleDownThreshold\": 512},{\"Name\": \"ip-normalize\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7}}]}");
   ```

4. 调用Dynamsoft Document Normalizer将原始图像替换为裁剪后的文档图像。

   ```js
   async function cropAll(){
     let length = DWObject.HowManyImagesInBuffer;
     for (let index = 0; index < length; index++) {
       const blob = await convertToBlob(index);
       let result = await router.capture(blob, "DetectAndNormalizeDocument_Default");
       if (result.items[0]) {
         const dataURL = result.items[0].toCanvas().toDataURL();
         await loadImageFromDataURL(dataURL);
         DWObject.RemoveImage(index);
         DWObject.MoveImage(length-1,index);
       }
     }
   }

   function loadImageFromDataURL(dataURL){
     return new Promise((resolve, reject) => {
       DWObject.LoadImageFromBase64Binary(
         removeDataURLHead(dataURL),
         Dynamsoft.DWT.EnumDWT_ImageType.IT_PNG,
         function(){
           resolve();
         },
         function(errorCode,errorString){
           reject(errorString);
         }
       )
     })
   }

   function removeDataURLHead(dataURL){
     return dataURL.substring(dataURL.indexOf(",")+1,dataURL.length);
   }
   ```

## 条码读取

接下来，让我们使用 Dynamsoft Barcode Reader来读取驾驶执照上的 PDF417。只需使用以下代码即可：

```js
let barcodeReadingResult = await router.capture(blob, "ReadBarcodes_Balance");
```

## MRZ识别

让我们继续使用Dynamsoft Label Recognizer来识别身份证件上的MRZ。

1. 更新运行时设置以识别 MRZ。

   ```js
   await router.initSettings("{\"CaptureVisionTemplates\": [{\"Name\": \"mrz\",\"ImageROIProcessingNameArray\": [\"roi-mrz-passport\"]}],\"TargetROIDefOptions\": [{\"Name\": \"roi-mrz-passport\",\"TaskSettingNameArray\": [\"task-mrz-passport\"]}],\"TextLineSpecificationOptions\": [{\"Name\": \"tls-mrz-text\",\"CharacterModelName\": \"MRZ\",\"StringRegExPattern\": \"([ACI][A-Z<][A-Z<]{3}[A-Z0-9<]{9}[0-9][A-Z0-9<]{15}){(30)}|([0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z<]{3}[A-Z0-9<]{11}[0-9]){(30)}|([A-Z<]{30}){(30)}|([ACIV][A-Z<][A-Z<]{3}[A-Z<]{31}){(36)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}|([PV][A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[A-Z0-9<]{2}){(44)}\",\"StringLengthRange\": [30,44],\"CharHeightRange\": [5,1000,1],\"BinarizationModes\": [{\"BlockSizeX\": 30,\"BlockSizeY\": 30,\"Mode\": \"BM_LOCAL_BLOCK\",\"MorphOperation\": \"Close\"}]},{\"Name\": \"tls-mrz-passport\",\"StringRegExPattern\": \"(P[A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[0-9<][0-9]){(44)}\",\"StringLengthRange\": [44,44],\"BaseTextLineSpecificationName\": \"tls-mrz-text\"}],\"LabelRecognizerTaskSettingOptions\": [{\"Name\": \"mrz-text-task\",\"TextLineSpecificationNameArray\": [\"tls-mrz-text\"],\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-mrz-text\"},{\"Section\": \"ST_TEXT_LINE_LOCALIZATION\",\"ImageParameterName\": \"ip-mrz-text\"},{\"Section\": \"ST_TEXT_LINE_RECOGNITION\",\"ImageParameterName\": \"ip-mrz-text\"}]},{\"Name\": \"task-mrz-passport\",\"TextLineSpecificationNameArray\": [\"tls-mrz-text\"],\"BaseLabelRecognizerTaskSettingName\": \"mrz-text-task\"}],\"CharacterModelOptions\": [{\"Name\": \"MRZ\"}],\"ImageParameterOptions\": [{\"Name\": \"ip-mrz-text\",\"TextureDetectionModes\": [{\"Mode\": \"TDM_GENERAL_WIDTH_CONCENTRATION\",\"Sensitivity\": 8}],\"TextDetectionMode\": {\"Mode\": \"TTDM_LINE\",\"CharHeightRange\": [20,1000,1],\"Sensitivity\": 7}}]}");
   ```

2. 调用Dynamsoft Label Recognizer识别MRZ。

   ```js
   let OCRResult = await router.capture(blob, "mrz");
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
   async function parseBarcodeResult(result,imageIndex){
     for (let index = 0; index < result.items.length; index++) {
       const item = result.items[index];
       if (item.type == Dynamsoft.Core.EnumCapturedResultItemType.CRIT_BARCODE) {
         if (item.formatString.indexOf("PDF417") == -1) {
           continue;
         }
         try {
           let parsedResultItem = await parser.parse(item.bytes);
           readingResults.push(parsedResultItem);
           imageIndices.push(imageIndex);
         } catch (error) {
           console.log(error);
         }
       }
     }
   }
   ```

4. 解析OCR结果。

   ```js
   async function parseOCRResult(result,imageIndex){
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
       imageIndices.push(imageIndex);
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
       let img = document.createElement("img");
       img.src = DWObject.GetImageURL(imageIndices[index]);
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

可以在以下软件仓库中找到该demo的源代码：<https://github.com/tony-xlh/Web-ID-Card-Flatbed-Scanner>

