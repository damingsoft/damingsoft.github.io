---
layout: post
title: "基于React的用摄像头扫描文档并存为PDF的Web应用"
date: 2024-12-04 10:10:53 +0800
categories: 文档扫描
tags: 
description: 本文讨论了如何编写一个React.js应用，以使用摄像头扫描文档并将其保存为PDF文件。使用了Dynamsoft Mobile Web Capture SDK。
---

现代浏览器现在可以访问摄像头并运行图像处理来执行各种计算机视觉任务。在本文中，我们将基于React.js编写一个网页应用，用于从摄像头扫描文档图像并将其保存为PDF文件。

使用了Dynamsoft [Mobile Web Capture](https://www.dynamsoft.com/mobile-web-capture/docs/introduction/index.html)用于提供UI界面和图像处理能力。

[在线demo](https://magnificent-horse-97bae3.netlify.app/)

## 应用概览

该应用主要含一个页面，页面中央有一个文档扫描组件。

文档扫描组件有三个用于文档捕获的界面：

1. 具有边框检测和自动拍照功能的相机界面：

   ![capture viewer](/album/2024/12/react-document-scanner/capture.jpg)

2. 文档边界编辑界面：

   ![perspective viewer](/album/2024/12/react-document-scanner/perspective.jpg)

3. 图像编辑界面（用于旋转、图像滤镜、另存为PDF等任务）：

   ![edit viewer](/album/2024/12/react-document-scanner/edit.jpg)



## 新建项目

使用Vite创建一个新的React + TypeScript项目：

```bash
npm create vite@latest document-scanner -- --template react-ts
```

## 添加依赖项

安装Dynamsoft SDK：

```bash
npm install dynamsoft-document-viewer dynamsoft-capture-vision-bundle
```

此外，将Dynamsoft Document Viewer的资源复制到`public/assets/ddv-resources`目录里。

1. 将`ncp`安装为开发依赖项。

   ```bash
   npm install ncp --save-dev
   ```

2. 更新`package.json`以使用ncp复制资源。


   ```diff
    "scripts": {
   -  "dev": "vite",
   -  "build": "tsc && vite build",
   +  "dev": "ncp node_modules/dynamsoft-document-viewer/dist public/assets/ddv-resources && vite",
   +  "build": "ncp node_modules/dynamsoft-document-viewer/dist public/assets/ddv-resources && tsc && vite build",
    }
   ```


## 配置Dynamsoft SDK

创建名为`dynamsoft.config.ts`的文件，文件内容如下，用于初始化许可证和资源。可以在此处申请<g id="1">许可证</g>。[](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import "dynamsoft-license";

import "dynamsoft-document-normalizer";
import "dynamsoft-capture-vision-router";

import { CoreModule, DSImageData } from "dynamsoft-core";
import { LicenseManager } from "dynamsoft-license";
import { DDV, DetectResult, DocumentDetectConfig, VImageData } from "dynamsoft-document-viewer";
import { CaptureVisionRouter } from "dynamsoft-capture-vision-bundle";

let initiazlied = false;

export async function init(){
  if (initiazlied === false) {
    CoreModule.engineResourcePaths.rootDirectory = "https://cdn.jsdelivr.net/npm/";
    //set the license for Dynamsoft Document Viewer and Dynamsoft Document Normalizer. Use one-day trial by default.
    await LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==",{executeNow:true});
    await CoreModule.loadWasm(["DDN"]).catch((ex: Error) => {
      const errMsg = ex.message || ex;
      console.error(errMsg);
      alert(errMsg);
    });
    DDV.Core.engineResourcePath = "assets/ddv-resources/engine";// Lead to a folder containing the distributed WASM files
    await DDV.Core.loadWasm();
    await DDV.Core.init();
    DDV.setProcessingHandler("imageFilter", new DDV.ImageFilter());
  }
  initiazlied = true;
  return true;
}
```


然后在`App.tsx`中使用它：

```tsx
import {init as initDynamsoft} from './dynamsoft.config'
function App() {
  const initializing = useRef(false);
  const [initialized,setInitialized] = useState(false);
  useEffect(()=>{
    if (initializing.current == false) {
      initializing.current = true;
      initialize();
    }
  },[])

  const initialize = async () => {
    await initDynamsoft();
    setInitialized(true);
  }
}
```

## 创建文档扫描组件

接下来，在`src/components/Scanner.tsx`路径创建一个文档扫描组件。

1. 将以下模板内容添加到其中：

   ```tsx
   import { useEffect, useRef } from 'react'
   import "./Scanner.css";

   const Scanner: React.FC = () => {
     return (
       <div id="container"></div>
     )
   };

   export default Scanner;
   ```

2. 导入Dynamsoft Document Viewer的CSS。

   ```tsx
   import "dynamsoft-document-viewer/dist/ddv.css";
   ```

3. 创建Capture Viewer的实例。

   ```tsx
   const initializing = useRef(false);
   const initialized = useRef(false);
   useEffect(()=>{
     if (initializing.current === false) {
       initializing.current = true;
       init();
     }
   },[])

   const init = async () => {
     initCaptureViewer();
   }
   const initCaptureViewer = () => {
     const captureViewerUiConfig:UiConfig = {
         type: DDV.Elements.Layout,
         flexDirection: "column",
         children: [
             {
                 type: DDV.Elements.Layout,
                 className: "ddv-capture-viewer-header-mobile",
                 children: [
                     {
                         type: "CameraResolution",
                         className: "ddv-capture-viewer-resolution",
                     },
                     DDV.Elements.Flashlight,
                 ],
             },
             DDV.Elements.MainView,
             {
                 type: DDV.Elements.Layout,
                 className: "ddv-capture-viewer-footer-mobile",
                 children: [
                     DDV.Elements.AutoDetect,
                     DDV.Elements.AutoCapture,
                     {
                         type: "Capture",
                         className: "ddv-capture-viewer-captureButton",
                     },
                     {
                         // Bind click event to "ImagePreview" element
                         // The event will be registered later.
                         type: DDV.Elements.ImagePreview,
                         events:{
                             click: "showPerspectiveViewer"
                         }
                     },
                     DDV.Elements.CameraConvert,
                 ],
             },
         ],
     };

     // Create a capture viewer
     captureViewer.current = new DDV.CaptureViewer({
         container: "container",
         uiConfig: captureViewerUiConfig,
         viewerConfig: {
             acceptedPolygonConfidence: 60,
             enableAutoDetect: false,
         }
     });
   }
   ```

4. 创建Perspective Viewer的实例，以编辑检测到的文档边界。

   ```tsx
   const initPerspectiveViewer = () => {
     const perspectiveUiConfig:UiConfig = {
         type: DDV.Elements.Layout,
         flexDirection: "column",
         children: [
             {
                 type: DDV.Elements.Layout,
                 className: "ddv-perspective-viewer-header-mobile",
                 children: [
                     {
                         // Add a "Back" button in perspective viewer's header and bind the event to go back to capture viewer.
                         // The event will be registered later.
                         type: DDV.Elements.Button,
                         className: "ddv-button-back",
                         events:{
                             click: "backToCaptureViewer"
                         }
                     },
                     DDV.Elements.Pagination,
                     {   
                         // Bind event for "PerspectiveAll" button to show the edit viewer
                         // The event will be registered later.
                         type: DDV.Elements.PerspectiveAll,
                         events:{
                             click: "showEditViewer"
                         }
                     },
                 ],
             },
             DDV.Elements.MainView,
             {
                 type: DDV.Elements.Layout,
                 className: "ddv-perspective-viewer-footer-mobile",
                 children: [
                     DDV.Elements.FullQuad,
                     DDV.Elements.RotateLeft,
                     DDV.Elements.RotateRight,
                     DDV.Elements.DeleteCurrent,
                     DDV.Elements.DeleteAll,
                 ],
             },
         ],
     };

     // Create a perspective viewer
     perspectiveViewer.current = new DDV.PerspectiveViewer({
         container: "container",
         groupUid: captureViewer.current!.groupUid,
         uiConfig: perspectiveUiConfig,
         viewerConfig: {
             scrollToLatest: true,
         }
     });

     perspectiveViewer.current.hide();
   }
   ```

5. 创建Edit Viewer的实例。

   ```tsx
   const initEditViewer = () => {
     const editViewerUiConfig:UiConfig = {
         type: DDV.Elements.Layout,
         flexDirection: "column",
         className: "ddv-edit-viewer-mobile",
         children: [
             {
                 type: DDV.Elements.Layout,
                 className: "ddv-edit-viewer-header-mobile",
                 children: [
                     {
                         // Add a "Back" buttom to header and bind click event to go back to the perspective viewer
                         // The event will be registered later.
                         type: DDV.Elements.Button,
                         className: "ddv-button-back",
                         events:{
                             click: "backToPerspectiveViewer"
                         }
                     },
                     DDV.Elements.Pagination,
                     DDV.Elements.Download,
                 ],
             },
             DDV.Elements.MainView,
             {
                 type: DDV.Elements.Layout,
                 className: "ddv-edit-viewer-footer-mobile",
                 children: [
                     DDV.Elements.DisplayMode,
                     DDV.Elements.RotateLeft,
                     DDV.Elements.Crop,
                     DDV.Elements.Filter,
                     DDV.Elements.Undo,
                     DDV.Elements.Delete,
                     DDV.Elements.Load,
                 ],
             },
         ],
     };
     // Create an edit viewer
     editViewer.current = new DDV.EditViewer({
         container: "container",
         groupUid: captureViewer.current!.groupUid,
         uiConfig: editViewerUiConfig
     });

     editViewer.current.hide();
   }
   ```

6. 注册事件，让以上viewer可以协同工作。

   ```tsx
   const registerEvenets = () => {
     // Register an event in `captureViewer` to show the perspective viewer
     captureViewer.current!.on("showPerspectiveViewer" as any,() => {
       switchViewer(0,1,0);
     });

     // Register an event in `perspectiveViewer` to go back the capture viewer
     perspectiveViewer.current!.on("backToCaptureViewer" as any,() => {
       switchViewer(1,0,0);
       captureViewer.current!.play().catch(err => {alert(err.message)});
     });

     // Register an event in `perspectiveViewer` to show the edit viewer
     perspectiveViewer.current!.on("showEditViewer" as any,() => {
       switchViewer(0,0,1)
     });

     // Register an event in `editViewer` to go back the perspective viewer
     editViewer.current!.on("backToPerspectiveViewer" as any,() => {
       switchViewer(0,1,0);
     });

     // Define a function to control the viewers' visibility
     const switchViewer = (c:number,p:number,e:number) => {
       captureViewer.current!.hide();
       perspectiveViewer.current!.hide();
       editViewer.current!.hide();

       if(c) {
         captureViewer.current!.show();
       } else {
         captureViewer.current!.stop();
       }

       if(p) perspectiveViewer.current!.show();
       if(e) editViewer.current!.show();
     };
   }
   ```

## 配置文档检测

接下来，我们需要定义一个文档检测的Handler，让Dynamsoft Document Viewer能使用Dynamsoft Document Normalizer的文档边界检测功能。

```ts
export async function initDocDetectModule() {
  const router = await CaptureVisionRouter.createInstance();
  await router.initSettings("{\"CaptureVisionTemplates\": [{\"Name\": \"Default\"},{\"Name\": \"DetectDocumentBoundaries_Default\",\"ImageROIProcessingNameArray\": [\"roi-detect-document-boundaries\"]},{\"Name\": \"DetectAndNormalizeDocument_Default\",\"ImageROIProcessingNameArray\": [\"roi-detect-and-normalize-document\"]},{\"Name\": \"NormalizeDocument_Binary\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-binary\"]},  {\"Name\": \"NormalizeDocument_Gray\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-gray\"]},  {\"Name\": \"NormalizeDocument_Color\",\"ImageROIProcessingNameArray\": [\"roi-normalize-document-color\"]}],\"TargetROIDefOptions\": [{\"Name\": \"roi-detect-document-boundaries\",\"TaskSettingNameArray\": [\"task-detect-document-boundaries\"]},{\"Name\": \"roi-detect-and-normalize-document\",\"TaskSettingNameArray\": [\"task-detect-and-normalize-document\"]},{\"Name\": \"roi-normalize-document-binary\",\"TaskSettingNameArray\": [\"task-normalize-document-binary\"]},  {\"Name\": \"roi-normalize-document-gray\",\"TaskSettingNameArray\": [\"task-normalize-document-gray\"]},  {\"Name\": \"roi-normalize-document-color\",\"TaskSettingNameArray\": [\"task-normalize-document-color\"]}],\"DocumentNormalizerTaskSettingOptions\": [{\"Name\": \"task-detect-and-normalize-document\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-detect-and-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-detect-and-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-detect-and-normalize\"}]},{\"Name\": \"task-detect-document-boundaries\",\"TerminateSetting\": {\"Section\": \"ST_DOCUMENT_DETECTION\"},\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-detect\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-detect\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-detect\"}]},{\"Name\": \"task-normalize-document-binary\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",   \"ColourMode\": \"ICM_BINARY\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]},  {\"Name\": \"task-normalize-document-gray\",   \"ColourMode\": \"ICM_GRAYSCALE\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]},  {\"Name\": \"task-normalize-document-color\",   \"ColourMode\": \"ICM_COLOUR\",\"StartSection\": \"ST_DOCUMENT_NORMALIZATION\",\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_DETECTION\",\"ImageParameterName\": \"ip-normalize\"},{\"Section\": \"ST_DOCUMENT_NORMALIZATION\",\"ImageParameterName\": \"ip-normalize\"}]}],\"ImageParameterOptions\": [{\"Name\": \"ip-detect-and-normalize\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7}},{\"Name\": \"ip-detect\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0,\"ThresholdCompensation\" : 7}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7},\"ScaleDownThreshold\" : 512},{\"Name\": \"ip-normalize\",\"BinarizationModes\": [{\"Mode\": \"BM_LOCAL_BLOCK\",\"BlockSizeX\": 0,\"BlockSizeY\": 0,\"EnableFillBinaryVacancy\": 0}],\"TextDetectionMode\": {\"Mode\": \"TTDM_WORD\",\"Direction\": \"HORIZONTAL\",\"Sensitivity\": 7}}]}");
  class DDNNormalizeHandler extends DDV.DocumentDetect {
    async detect(image:VImageData, config:DocumentDetectConfig) {
      if (!router) {
        return Promise.resolve({
          success: false
        });
      };

      if (!image.width || !image.height) {
        return Promise.resolve({
          success: false
        });
      };

      let width = image.width;
      let height = image.height;
      let ratio = 1;
      let data:ArrayBuffer;

      if (height > 720) {
        ratio = height / 720;
        height = 720;
        width = Math.floor(width / ratio);
        data = compress(image.data as ArrayBuffer, image.width, image.height, width, height);
      } else {
        data = image.data.slice(0) as ArrayBuffer;
      }


      // Define DSImage according to the usage of DDN
      const DSImage:DSImageData = {
        bytes: new Uint8Array(data),
        width,
        height,
        stride: width * 4, //RGBA
        format: 10 // IPF_ABGR_8888
      } as DSImageData;

      // Use DDN normalized module
      const results = await router.capture(DSImage, 'DetectDocumentBoundaries_Default');
      const detectedQuadResultItems = results.detectedQuadResultItems;
      // Filter the results and generate corresponding return values
      if (!detectedQuadResultItems || detectedQuadResultItems.length <= 0) {
        return Promise.resolve({
          success: false
        });
      };

      const quad:any[] = [];

      detectedQuadResultItems[0].location.points.forEach((p) => {
        quad.push([p.x * ratio, p.y * ratio]);
      });

      const detectResult = this.processDetectResult({
        location: quad,
        width: image.width,
        height: image.height,
        config
      } as DetectResult);

      return Promise.resolve(detectResult);
    }
  }
  DDV.setProcessingHandler('documentBoundariesDetect', new DDNNormalizeHandler())
}
```

用以下方法对视频帧进行压缩以提高效率：

```ts

function compress(
    imageData:ArrayBuffer,
    imageWidth:number,
    imageHeight:number,
    newWidth:number,
    newHeight:number,
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

  const filter = (distCol:number, distRow:number) => {
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

## 使用文档扫描组件

接下来，在`App.tsx`中使用文档扫描组件，代码如下：

```tsx
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, ChangeEvent } from 'react'
import './App.css'
import {init as initDynamsoft, initDocDetectModule} from './dynamsoft.config'
import Scanner from './components/Scanner';

function App() {
  const initializing = useRef(false);
  const [isScanning,setIsScanning] = useState(false);
  const [initialized,setInitialized] = useState(false);
  useEffect(()=>{
    if (initializing.current == false) {
      initializing.current = true;
      initialize();
    }
  },[])

  const initialize = async () => {
    await loadCameras();
    await initDocDetectModule();
    setInitialized(true);
  }

  const toggleScanning = () => {
    setIsScanning(!isScanning);
  }

  return (
    <>
      <h1>Scan to PDF</h1>
      <div>
      {initialized && (
        <button onClick={toggleScanning}>
          {isScanning ? "Stop Scanning" : "Start Scanning"}
        </button>
      )}
      {!initialized && (
        <div>Initializing...</div>
      )}
      {isScanning&& (
        <div id="scanner">
          <Scanner cameraID={selectedCamera}></Scanner>
        </div>
      )}
      <div style={{marginTop:"2em"}}>
        Powered by <a href='https://www.dynamsoft.com' target='_blank'>Dynamsoft</a>
      </div>
    </>
  )
}

export default App
```

好了，我们已经完成了demo的编写。


## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/Scan-to-PDF-React>

