---
layout: post
title: "Electron护照扫描桌面应用"
date: 2025-02-21 16:14:53 +0800
categories: 文字识别
tags: 
description: 文章介绍了如何创建一个Electron桌面应用程序来扫描护照。
---

Electron是一个使用JavaScript、HTML和CSS构建桌面应用程序的框架。随着Web技术成为构建用户界面的最佳选择，越来越多的开发人员正在采用Electron来构建他们的应用程序。

在本文中，我们将使用Electron和[Dynamsoft Label Recognizer](https://www.dynamsoft.com/label-recognition/overview/)创建一个护照扫描桌面应用程序来展示相关技术。

屏幕截图：

![护照扫描应用截图](/album/2025/02/electron/passport-scanner.jpg)

我们可以看到MRZ（机器可读区域）被识别了出来，并提取了所有者的信息，如姓名和国籍。

## 新建项目

1. 创建一个新项目。

   ```bash
   npm init
   ```

2. 安装Electron。

   ```bash
   npm install electron --save-dev
   ```

3. 创建`index.html`文件：

   ```html
   <!DOCTYPE html>
   <html>
     <head>
       <meta charset="UTF-8" />
       <!-- https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP -->
       <meta
         http-equiv="Content-Security-Policy"
         content="default-src 'self'; script-src 'self'"
       />
       <meta
         http-equiv="X-Content-Security-Policy"
         content="default-src 'self'; script-src 'self'"
       />
       <title>Passport Scanner</title>
     </head>
     <body>
       <h1>Passport Scanner</h1>
     </body>
   </html>
   ```

4. 创建`main.js`文件作为项目的入口以用Electron启动。

   ```js
   const { app, BrowserWindow } = require('electron/main')

   const createWindow = () => {
     const win = new BrowserWindow({
       width: 800,
       height: 600
     })

     win.loadFile('index.html')
   }

   app.whenReady().then(() => {
     createWindow()

     app.on('activate', () => {
       if (BrowserWindow.getAllWindows().length === 0) {
         createWindow()
       }
     })
   })

   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') {
       app.quit()
     }
   })
   ```

5. 运行`npx electron.`启动程序。

## 添加依赖项

安装Dynamsoft的node包，以添加从护照图像中识别MRZ文本的功能。

```bash
npm install dynamsoft-capture-vision-for-node dynamsoft-capture-vision-for-node-charactermodel
```

## 打开摄像头

接下来，使用`getUserMedia`打开连接的摄像头。

1. 在HTML文件中添加元素。

   ```html
   <div>
     <label>
       Camera:
       <select id="select-camera"></select>
     </label>
     <button id="button-start">Start Camera</button>
   </div>
   <div class="camera-container">
     <video id="camera" autoplay playsinline></video>
   </div>
   ```

2. 请求摄像头权限。

   ```js
   async function askForPermissions(){
     var stream;
     try {
       var constraints = {video: true, audio: false}; //ask for camera permission
       stream = await navigator.mediaDevices.getUserMedia(constraints);  
     } catch (error) {
       console.log(error);
     }
     closeStream(stream);
   }

   function closeStream(stream){
     try{
       if (stream){
         stream.getTracks().forEach(track => track.stop());
       }
     } catch (e){
       alert(e.message);
     }
   }
   ```

3. 列出摄像头设备。

   ```js
   async function listDevices(){
     devices = await getCameraDevices()
     for (let index = 0; index < devices.length; index++) {
       const device = devices[index];
       camSelect.appendChild(new Option(device.label ?? "Camera "+index,device.deviceId));
     }
   }

   async function getCameraDevices(){
     await askForPermissions();
     var allDevices = await navigator.mediaDevices.enumerateDevices();
     var cameraDevices = [];
     for (var i=0;i<allDevices.length;i++){
       var device = allDevices[i];
       if (device.kind == 'videoinput'){
         cameraDevices.push(device);
       }
     }
     return cameraDevices;
   }
   ```

4. 打开所选摄像头。

   ```js
   function startCamera(){
     var video = document.getElementById("camera");
     var selectedCamera = camSelect.selectedOptions[0].value;
     var constraints = {
       audio:false,
       video:true
     }
     if (selectedCamera) {
       constraints = {
         video: {deviceId: selectedCamera},
         audio: false
       }
     }
     navigator.mediaDevices.getUserMedia(constraints).then(function(camera) {
       video.srcObject = camera;
     }).catch(function(error) {
       alert('Unable to capture your camera. Please check console logs.');
       console.error(error);
     });
   }
   ```

## 捕获帧为DataURL

使用Canvas将帧捕获为DataURL，以便之后用于识别MRZ。

HTML：

```html
<div class="result-container">
  <canvas id="captured"></canvas>
</div>
```

JavaScript：

```js
function capture(){
  var video = document.getElementById("camera");
  var canvas = document.getElementById("captured");
  var context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  var dataurl = canvas.toDataURL("image/jpeg");
}
```

## 识别MRZ

进程间通信（IPC）是在Electron中构建功能丰富的桌面应用程序的关键部分。在Electron中，进程通过开发者定义的“通道”与ipcMain和ipcRenderer模块传递信息进行通信。

Dynamsoft SDK的node版在main进程中运行。我们需要将DataURL从renderer传递到main，然后将识别的结果从main传递到renderer。

先在`main.js`中添加相关函数。

1. 初始化Dynamsoft SDK的许可证。

   ```js
   function initLicense(){
       LicenseManager.initLicense('LICENSE-KEY');
   }
   ```

2. 更新运行时设置以支持识别MRZ。

   ```js
   function initSettings(){
     let mrzTemplate = `{
     "CaptureVisionTemplates": [
       {
         "Name": "ReadPassportAndId",
         "OutputOriginalImage": 1,
         "ImageROIProcessingNameArray": ["roi-passport-and-id"],
         "SemanticProcessingNameArray": ["sp-passport-and-id"],
         "Timeout": 2000
       },
       {
         "Name": "ReadPassport",
         "OutputOriginalImage": 1,
         "ImageROIProcessingNameArray": ["roi-passport"],
         "SemanticProcessingNameArray": ["sp-passport"],
         "Timeout": 2000
       },
       {
         "Name": "ReadId",
         "OutputOriginalImage": 1,
         "ImageROIProcessingNameArray": ["roi-id"],
         "SemanticProcessingNameArray": ["sp-id"],
         "Timeout": 2000
       }
     ],
     "TargetROIDefOptions": [
       {
         "Name": "roi-passport-and-id",
         "TaskSettingNameArray": ["task-passport-and-id"]
       },
       {
         "Name": "roi-passport",
         "TaskSettingNameArray": ["task-passport"]
       },
       {
         "Name": "roi-id",
         "TaskSettingNameArray": ["task-id"]
       }
     ],
     "TextLineSpecificationOptions": [
       {
         "Name": "tls_mrz_passport",
         "BaseTextLineSpecificationName": "tls_base",
         "StringLengthRange": [44, 44],
         "OutputResults": 1,
         "ExpectedGroupsCount": 1,
         "ConcatResults": 1,
         "ConcatSeparator": "\\n",
         "SubGroups": [
           {
             "StringRegExPattern": "(P[A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}",
             "StringLengthRange": [44, 44],
             "BaseTextLineSpecificationName": "tls_base"
           },
           {
             "StringRegExPattern": "([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[0-9<]{4}[0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[0-9<][0-9]){(44)}",
             "StringLengthRange": [44, 44],
             "BaseTextLineSpecificationName": "tls_base"
           }
         ]
       },
       {
         "Name": "tls_mrz_id_td2",
         "BaseTextLineSpecificationName": "tls_base",
         "StringLengthRange": [36, 36],
         "OutputResults": 1,
         "ExpectedGroupsCount": 1,
         "ConcatResults": 1,
         "ConcatSeparator": "\\n",
         "SubGroups": [
           {
             "StringRegExPattern": "([ACI][A-Z<][A-Z<]{3}[A-Z<]{31}){(36)}",
             "StringLengthRange": [36, 36],
             "BaseTextLineSpecificationName": "tls_base"
           },
           {
             "StringRegExPattern": "([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[0-9<]{4}[0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}",
             "StringLengthRange": [36, 36],
             "BaseTextLineSpecificationName": "tls_base"
           }
         ]
       },
       {
         "Name": "tls_mrz_id_td1",
         "BaseTextLineSpecificationName": "tls_base",
         "StringLengthRange": [30, 30],
         "OutputResults": 1,
         "ExpectedGroupsCount": 1,
         "ConcatResults": 1,
         "ConcatSeparator": "\\n",
         "SubGroups": [
           {
             "StringRegExPattern": "([ACI][A-Z<][A-Z<]{3}[A-Z0-9<]{9}[0-9<][A-Z0-9<]{15}){(30)}",
             "StringLengthRange": [30, 30],
             "BaseTextLineSpecificationName": "tls_base"
           },
           {
             "StringRegExPattern": "([0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[0-9<]{4}[0-9][A-Z<]{3}[A-Z0-9<]{11}[0-9]){(30)}",
             "StringLengthRange": [30, 30],
             "BaseTextLineSpecificationName": "tls_base"
           },
           {
             "StringRegExPattern": "([A-Z<]{30}){(30)}",
             "StringLengthRange": [30, 30],
             "BaseTextLineSpecificationName": "tls_base"
           }
         ]
       },
       {
         "Name": "tls_base",
         "CharacterModelName": "MRZ",
         "CharHeightRange": [5, 1000, 1],
         "BinarizationModes": [
           {
             "BlockSizeX": 30,
             "BlockSizeY": 30,
             "Mode": "BM_LOCAL_BLOCK",
             "EnableFillBinaryVacancy": 0,
             "ThresholdCompensation": 15
           }
         ],
         "ConfusableCharactersCorrection": {
           "ConfusableCharacters": [
             ["0", "O"],
             ["1", "I"],
             ["5", "S"]
           ],
           "FontNameArray": ["OCR_B"]
         }
       }
     ],
     "LabelRecognizerTaskSettingOptions": [
       {
         "Name": "task-passport",
         "ConfusableCharactersPath": "ConfusableChars.data",
         "TextLineSpecificationNameArray": ["tls_mrz_passport"],
         "SectionImageParameterArray": [
           {
             "Section": "ST_REGION_PREDETECTION",
             "ImageParameterName": "ip-mrz"
           },
           {
             "Section": "ST_TEXT_LINE_LOCALIZATION",
             "ImageParameterName": "ip-mrz"
           },
           {
             "Section": "ST_TEXT_LINE_RECOGNITION",
             "ImageParameterName": "ip-mrz"
           }
         ]
       },
       {
         "Name": "task-id",
         "ConfusableCharactersPath": "ConfusableChars.data",
         "TextLineSpecificationNameArray": ["tls_mrz_id_td1", "tls_mrz_id_td2"],
         "SectionImageParameterArray": [
           {
             "Section": "ST_REGION_PREDETECTION",
             "ImageParameterName": "ip-mrz"
           },
           {
             "Section": "ST_TEXT_LINE_LOCALIZATION",
             "ImageParameterName": "ip-mrz"
           },
           {
             "Section": "ST_TEXT_LINE_RECOGNITION",
             "ImageParameterName": "ip-mrz"
           }
         ]
       },
       {
         "Name": "task-passport-and-id",
         "ConfusableCharactersPath": "ConfusableChars.data",
         "TextLineSpecificationNameArray": ["tls_mrz_passport", "tls_mrz_id_td1", "tls_mrz_id_td2"],
         "SectionImageParameterArray": [
           {
             "Section": "ST_REGION_PREDETECTION",
             "ImageParameterName": "ip-mrz"
           },
           {
             "Section": "ST_TEXT_LINE_LOCALIZATION",
             "ImageParameterName": "ip-mrz"
           },
           {
             "Section": "ST_TEXT_LINE_RECOGNITION",
             "ImageParameterName": "ip-mrz"
           }
         ]
       }
     ],
     "CharacterModelOptions": [
       {
         "Name": "MRZ"
       }
     ],
     "ImageParameterOptions": [
       {
         "Name": "ip-mrz",
         "TextureDetectionModes": [
           {
             "Mode": "TDM_GENERAL_WIDTH_CONCENTRATION",
             "Sensitivity": 8
           }
         ],
         "BinarizationModes": [
           {
             "EnableFillBinaryVacancy": 0,
             "ThresholdCompensation": 21,
             "Mode": "BM_LOCAL_BLOCK"
           }
         ],
         "TextDetectionMode": {
           "Mode": "TTDM_LINE",
           "CharHeightRange": [5, 1000, 1],
           "Direction": "HORIZONTAL",
           "Sensitivity": 7
         }
       }
     ],
     "SemanticProcessingOptions": [
       {
         "Name": "sp-passport-and-id",
         "ReferenceObjectFilter": {
           "ReferenceTargetROIDefNameArray": ["roi-passport-and-id"]
         },
         "TaskSettingNameArray": ["dcp-passport-and-id"]
       },
       {
         "Name": "sp-passport",
         "ReferenceObjectFilter": {
           "ReferenceTargetROIDefNameArray": ["roi-passport"]
         },
         "TaskSettingNameArray": ["dcp-passport"]
       },
       {
         "Name": "sp-id",
         "ReferenceObjectFilter": {
           "ReferenceTargetROIDefNameArray": ["roi-id"]
         },
         "TaskSettingNameArray": ["dcp-id"]
       }
     ],
     "CodeParserTaskSettingOptions": [
       {
         "Name": "dcp-passport",
         "CodeSpecifications": ["MRTD_TD3_PASSPORT"]
       },
       {
         "Name": "dcp-id",
         "CodeSpecifications": ["MRTD_TD1_ID", "MRTD_TD2_ID"]
       },
       {
         "Name": "dcp-passport-and-id",
         "CodeSpecifications": ["MRTD_TD3_PASSPORT", "MRTD_TD1_ID", "MRTD_TD2_ID"]
       }
     ]
   }`;
     CaptureVisionRouter.initSettings(mrzTemplate);
   }
   ```

3. 添加一个函数，用于从编码为DataURL的图像中识别MRZ。

   ```js
   async function capture(dataurl){
     let response = await fetch(dataurl);
     let bytes = await response.bytes();
     let result = await CaptureVisionRouter.captureAsync(bytes, "ReadPassport");
     let jsonStr = "";
     if (result.parsedResultItems.length > 0) {
       let parsedResultItem = result.parsedResultItems[0];
       jsonStr = JSON.stringify(parsedResultItem.parsed);
     }
     return jsonStr;
   }
   ```

4. 从renderer接收DataURL消息，并将解析结果发送回给它。

   ```js
   const createWindow = () => {
     const win = new BrowserWindow({
       width: 800,
       height: 600,
       webPreferences: {
         devTools: true,
         preload: path.join(__dirname, 'preload.js')
       }
     })
     ipcMain.on('capture', async (event, dataurl) => {
       const webContents = event.sender
       const result = await capture(dataurl);
       webContents.send('update-result', result);
     })
     win.loadFile('index.html')
   }
   ```

在`preload.js`中，定义相关函数。

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('Dynamsoft', {
  onCaptured: (callback) => ipcRenderer.on('update-result', (_event, value) => callback(value)),
  capture: (dataurl) => ipcRenderer.send('capture', dataurl)
})
```

在`index.js`（renderer）中，使用以下函数发送DataURL消息：

```js
window.Dynamsoft.capture(dataurl);
```

然后，使用以下函数接收解析结果：

```js
window.Dynamsoft.onCaptured((value) => {
  let fields = {};
  let parsed = JSON.parse(value);
})
```

好的，我们已经介绍了demo的关键部分。

## 源代码

该项目的源代码可在此处获得：<https://github.com/tony-xlh/electron-passport-scanner>
