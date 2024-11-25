---
layout: post
title: "编写一个从摄像头扫描身份证件的Next.js应用"
date: 2024-11-25 15:20:53 +0800
categories: 摄像头
tags: 
description: 文章讨论了如何构建一个Next.js应用程序，通过摄像头扫描身份证件。它可以读取身份证、护照和驾照上的MRZ和条形码，提取持有人的信息。
---

身份证件是可用于证明个人身份的证件。身份证件有多种形式：驾驶证、护照和身份证。

条形码和MRZ（机器可读区）通常印在身份证件上，以便用机器提取信息。

加拿大驾照示例：

![驾驶执照](/album/2024/04/id-card-scanner/driver-license.jpg)

荷兰身份证示例：

![身份证](/album/2024/04/id-card-scanner/formal-id-card.jpg)

身份证通常通过摄像头或平板扫描仪进行扫描。在本文中，我们将创建一个Next.js应用，用于从摄像头扫描身份证。Next.js是一个全栈React框架，允许我们创建任何大小的Web应用程序。

使用Dynamsoft的以下SDK：

* [Dynamsoft Camera Enhancer](https://www.dynamsoft.com/camera-enhancer/docs/web/programming/javascript/user-guide/index.html?lang=javascript)：访问摄像头并捕捉帧。
* [Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/docs/web/programming/javascript/user-guide/index.html?lang=javascript)：裁剪扫描文档图像中的证件。
* [Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)：读取驾照上的PDF417。
* [Dynamsoft Label Recognizer](https://www.dynamsoft.com/label-recognition/overview/)：识别身份证件上的MRZ。
* [Dynamsoft Code Parser](https://www.dynamsoft.com/code-parser/docs/web/programming/javascript/user-guide/index.html?lang=javascript)：解析MRZ和条形码以获取有意义的数据。

演示视频：

<video src="https://github.com/user-attachments/assets/66f49f75-3bc7-414f-af41-7edff838056f" controls="controls" muted="muted" style="max-height:640px; min-height: 200px; max-width: 100%;"></video>

[在线demo](https://next-js-id-card-scanner.vercel.app/)

## 概览

这个应用比较简单。通过主页的扫描按钮触发扫描，完成后显示扫描的图像和卡的持有者的信息。通过检查连续几次检测到的边框之间的IoU，判断图像是否稳定。稳定后则自动进行捕获。

![主页](/album/2024/11/nextjs/home.jpg)

![扫描](/album/2024/11/nextjs/scanner.jpg)

## 新的Next.js项目

使用以下命令创建新的Next.js项目：

```bash
npx create-next-app@latest
```

## 安装依赖项

通过安装Dynamsoft Capture Vision bundle来安装Dynamsoft所有的视觉SDK：

```bash
npm install dynamsoft-capture-vision-bundle
```

## 配置Dynamsoft SDK

创建名为`dcv.ts`的文件，文件内容如下，用于配置Dynamsoft SDK。它将设置许可证，加载Web Assembly文件，OCR模型和解析规范。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)申请许可证。

```ts
import "dynamsoft-license";

import "dynamsoft-barcode-reader";
import "dynamsoft-document-normalizer";
import "dynamsoft-label-recognizer";
import "dynamsoft-capture-vision-router";

import { CoreModule } from "dynamsoft-core";
import { LicenseManager } from "dynamsoft-license";
import { CodeParserModule, LabelRecognizerModule } from "dynamsoft-capture-vision-bundle";

let initialized = false;

export async function init(){
  if (initialized === false) {
    console.log("Initializing...");
    await LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="); //one-day trial license
    CoreModule.engineResourcePaths.rootDirectory = "https://cdn.jsdelivr.net/npm/";
    await CoreModule.loadWasm(["DDN","DLR","DBR","DCP"]).catch((ex: any) => {
      let errMsg = ex.message || ex;
      console.error(errMsg);
      alert(errMsg);
    });
    await CodeParserModule.loadSpec("MRTD_TD1_ID");
    await CodeParserModule.loadSpec("MRTD_TD2_ID");
    await CodeParserModule.loadSpec("MRTD_TD3_PASSPORT");  
    await CodeParserModule.loadSpec("AAMVA_DL_ID");
    await LabelRecognizerModule.loadRecognitionData("MRZ");
  }
  initiazlied = true;
  return true;
}
```

然后在`page.tsx`中导入并执行初始化。由于导入的模块是单例，因此初始化不会执行两次。

```js
import { init } from "./dcv";

export default function Home() {
  const [initialized,setInitialized] = useState(false);
  useEffect(()=>{
    const initDynamsoft = async () => {
      try {
        const result = await init();
        if (result) {
          setInitialized(true);
        }
      } catch (error) {
        alert(error);
      }
    }
    initDynamsoft();
  },[])

  return (
    <>
    </>
  );
}
```

## 创建身份证件扫描组件

接下来，创建一个身份证件扫描组件，该组件会捕获身份证件的图像并提取其持有人的信息。

在`app/components`下创建 `Scanner.css`和`Scanner.tsx`文件。

Scanner.tsx：

```tsx
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import './Scanner.css';
import { DetectedQuadResultItem } from 'dynamsoft-document-normalizer'

export interface HolderInfo {
  lastName:string;
  firstName:string;
  birthDate:string;
  sex:string;
  docNumber:string;
}

export interface ScannerProps {
  onScanned?: (blob:Blob,info?:HolderInfo) => void;
  onStopped?: () => void;
}

const Scanner: React.FC<ScannerProps> = (props:ScannerProps) => {
  let container: MutableRefObject<HTMLDivElement | null> = useRef(null);
  return (
    <div className="scanner-container" ref={container}>
    </div>
  );
};

export default Scanner;
```

Scanner.css：

```css
.scanner-container {
  width: 100%;
  height: 100%;
  background: white;  
}
```

我们将在以下部分讨论如何实现它。

### 访问摄像头

1. 为相机画面添加一个容器。

   ```tsx
   <div className="scanner-container" ref={container}>
     <div className="dce-video-container"></div>
   </div>
   ```

   CSS：

   ```css
   .dce-video-container {
     position: absolute;
     top: 0;
     left: 0;
     width: 100%;
     height: 100%;
   }
   ```

2. 初始化Dynamsoft Camera Enhancer。绑定容器并启动摄像头。

   ```tsx
   useEffect((): any => {
     const init = async () => {
       if (initializing.current) {
         return;
       }
       try {
         view.current = await CameraView.createInstance(container.current!);
         dce.current = await CameraEnhancer.createInstance(view.current);
         dce.current.setResolution({width:1920,height:1080});
         await dce.current.open();
       } catch (ex: any) {
         let errMsg = ex.message || ex;
         console.error(errMsg);
         alert(errMsg);
       }
     }

     init();
     initializing.current = true;

     return async () => {
       dce.current?.dispose();
       console.log('Scanner Component Unmount');
     }
   }, []);
   ```

3. 添加位于头部的工具栏，用于切换摄像头和停止扫描。

   JSX：

   ```tsx
   <div className="header">
     <div className="switchButton" onClick={switchCamera}>
       <img className="icon" src="/switch.svg" alt="switch"/>
     </div>
     <div className="closeButton" onClick={close}>
       <img className="icon" src="/cross.svg" alt="close"/>
     </div>
   </div>
   ```

   JavaScript：

   ```tsx
   const switchCamera = async () => {
     if (dce.current) {
       let currentCamera = dce.current.getSelectedCamera();
       let cameras = await dce.current.getAllCameras();
       let currentCameraIndex = cameras.indexOf(currentCamera);
       let desiredIndex = 0
       if (currentCameraIndex < cameras.length - 1) {
         desiredIndex = currentCameraIndex + 1;
       }
       await dce.current.selectCamera(cameras[desiredIndex]);
     }
   }

   const close = async () => {
     if (props.onStopped) {
       props.onStopped();
     }
   }
   ```



   CSS：

   ```css
   .header {
     position: absolute;
     top: 0;
     left: 0;
     width: 100%;
     height: 30px;
     background: rgba(0, 0, 0, 0.8);
     display: flex;
     justify-content: space-between;
   }

   .switchButton {
     display: flex;
     align-items: center;
     text-align: center;
     width: 30px;
     height: 30px;
     padding: 5px;
   }

   .icon {
     width: 100%;
     height: 100%;
     pointer-events: all;
     cursor: pointer;
   }
   ```



### 检测文件

1. 创建capture vision router的实例，以使用SDK执行图像处理。

   ```tsx
   let router: MutableRefObject<CaptureVisionRouter | null> = useRef(null);
   router.current = await CaptureVisionRouter.createInstance();
   ```

2. 相机打开后，设置一个interval以捕获帧，并检测其中的文档。

   ```tsx
   const [quadResultIte,setQuadResultItem] = useState<DetectedQuadResultItem|undefined>()
   const detecting = useRef(false);
   const interval = useRef<any>();

   dce.current.on("played",async function(){
     startScanning();  
   })

   const startScanning = async () => {
     stopScanning();
     if (!interval.current) {
       interval.current = setInterval(captureAndDetect,150);
     }
   }

   const stopScanning = () => {
     clearInterval(interval.current);
     interval.current = null;
   }

   const captureAndDetect = async () => {
     if (detecting.current === true) {
       return;
     }
     if (!router.current || !dce.current) {
       return;
     }
     if (isSteady.current) {
       return;
     }
     console.log("capture and detect");
     let results:DetectedQuadResultItem[] = [];
     detecting.current = true;
     try {
       let image = dce.current.fetchImage();
       let capturedResult = await router.current?.capture(image,"DetectDocumentBoundaries_Default");
       if (capturedResult.detectedQuadResultItems) {
         results = results.concat(capturedResult.detectedQuadResultItems);
       }
       console.log(results);
       if (results.length>0) {
         setQuadResultItem(results[0]);
         checkIfSteady(results,image);
       }else{
         setQuadResultItem(undefined);
       }
     } catch (error) {
       console.log(error);
     }
     detecting.current = false;
   }
   ```

3. 如果检测到的文档稳定，对其进行捕获和裁剪，停止扫描并提取信息。

   ```tsx
   const checkIfSteady = async (results:DetectedQuadResultItem[],image:DCEFrame) => {
     if (results.length>0 && router.current) {
       let result = results[0];
       if (previousResults.current.length >= 3) {
         if (steady() == true) {
           console.log("steady");
           isSteady.current = true;
           let newSettings = await router.current.getSimplifiedSettings("NormalizeDocument_Default");
           newSettings.roiMeasuredInPercentage = false;
           newSettings.roi.points = results[0].location.points;
           await router.current.updateSettings("NormalizeDocument_Default", newSettings);
           let result = await router.current.capture(image,"NormalizeDocument_Default"); //perspective transformation to crop the image
           if (result.normalizedImageResultItems) {
             if (props.onScanned) {
               stopScanning();
               let blob = await result.normalizedImageResultItems[0].toBlob("image/png");
               let info = await extractInfo(blob);
               props.onScanned(blob,info);
             }
           }
         }else{
           console.log("shift and add result");
           previousResults.current.shift();
           previousResults.current.push(result);
         }
       }else{
         console.log("add result");
         previousResults.current.push(result);
       }
     }
   }
   ```

   通过检查三个连续结果的IoU来确定检测到的文档是否稳定。

   ```tsx
   const steady = () => {
     if (previousResults.current[0] && previousResults.current[1] && previousResults.current[2]) {
       let iou1 = intersectionOverUnion(previousResults.current[0].location.points,previousResults.current[1].location.points);
       let iou2 = intersectionOverUnion(previousResults.current[1].location.points,previousResults.current[2].location.points);
       let iou3 = intersectionOverUnion(previousResults.current[2].location.points,previousResults.current[0].location.points);
       if (iou1>0.9 && iou2>0.9 && iou3>0.9) {
         return true;
       }else{
         return false;
       }
     }
     return false;
   }
   ```

   辅助函数：

   ```ts
   import { Point } from "dynamsoft-core";

   export function intersectionOverUnion(pts1:Point[] ,pts2:Point[]) : number {
     let rect1 = getRectFromPoints(pts1);
     let rect2 = getRectFromPoints(pts2);
     return rectIntersectionOverUnion(rect1, rect2);
   }

   function rectIntersectionOverUnion(rect1:Rect, rect2:Rect) : number {
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

   function getRectFromPoints(points:Point[]) : Rect {
     if (points[0]) {
       let left:number;
       let top:number;
       let right:number;
       let bottom:number;

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

       let r:Rect = {
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

   export interface Rect {
     left:number;
     right:number;
     top:number;
     bottom:number;
     width:number;
     height:number;
   }
   ```



### 读取条形码

使用条形码模板读取图像上的条形码。

```ts
let result = await router.current.capture(blob,"ReadBarcodes_Balance");
```

### MRZ的OCR

使用MRZ模板执行OCR以读取图像上的MRZ（机器可读区域）。由于MRZ模板不是内置的，我们需要使用JSON模板进行初始化。

```ts
const mrzTemplate = `
{
  "CaptureVisionTemplates": [
    {
      "Name": "ReadPassportAndId",
      "ImageROIProcessingNameArray": ["roi-passport-and-id"],
      "Timeout": 2000
    },
    {
      "Name": "ReadPassport",
      "ImageROIProcessingNameArray": ["roi-passport"],
      "Timeout": 2000
    },
    {
      "Name": "ReadId",
      "ImageROIProcessingNameArray": ["roi-id"],
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
      "DirectoryPath": "",
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
  ]
}
`

await router.current.initSettings(JSON.parse(mrzTemplate));
let result = await router.current.capture(blob,"ReadPassportAndId");
```

### 解析结果

读取条形码和MRZ后，使用Dynamsoft Code Parser对其进行解析。

1. 创建一个Code Parser实例

   ```ts
   let parser = await CodeParser.createInstance();
   ```

2. 解析检测到的条形码结果。


   ```ts
   for (let index = 0; index < result.barcodeResultItems.length; index++) {
     const item = result.barcodeResultItems[index];
     if (item.format != EnumBarcodeFormat.BF_PDF417) {
       continue;
     }
     let parsedItem = await parser.parse(item.text);
     if (parsedItem.codeType === "AAMVA_DL_ID") {
       let number = parsedItem.getFieldValue("licenseNumber");
       let firstName = parsedItem.getFieldValue("firstName");
       let lastName = parsedItem.getFieldValue("lastName");
       let birthDate = parsedItem.getFieldValue("birthDate");
       let sex = parsedItem.getFieldValue("sex");
       let info:HolderInfo = {
         firstName:firstName,
         lastName:lastName,
         docNumber:number,
         birthDate:birthDate,
         sex:sex
       };
       return info;
     }
   }
   ```

3. 解析MRZ。

   ```ts
   let parsedItem = await parser.parse(result.textLineResultItems[0].text);
   console.log(parsedItem);
   if (parsedItem.codeType.indexOf("MRTD") != -1) {
     let number = parsedItem.getFieldValue("documentNumber");
     if (!number) {
       number = parsedItem.getFieldValue("passportNumber");
     }
     let firstName = parsedItem.getFieldValue("primaryIdentifier");
     let lastName = parsedItem.getFieldValue("secondaryIdentifier");
     let birthDate = parsedItem.getFieldValue("dateOfBirth");
     let sex = parsedItem.getFieldValue("sex");
     let info:HolderInfo = {
       firstName:firstName,
       lastName:lastName,
       docNumber:number,
       birthDate:birthDate,
       sex:sex
     };
     return info;
   }
   ```

## 使用身份证件扫描组件

组件完成后，让我们在主页中使用它。

1. 使用`next/dynamic`导入组件。

   ```tsx
   const Scanner = dynamic(() => import("./components/Scanner"), {
     ssr: false,
     loading: () => <p>Initializing ID Card Scanner</p>,
   });
   ```

2. 在文件头部添加`'use client';`。

3. 使用该组件扫描身份证件。

   JSX：

   ```tsx
   <div className="footer">
     <button className="shutter-button round" onClick={()=>{startScanning();}}>Scan</button>
   </div>
   {scanning && (
     <div className="fullscreen">
       <Scanner onScanned={onScanned} onStopped={onStopped}/>
     </div>
   )}
   ```

   JavaScript：

   ```tsx
   const [scanning,setScanning] = useState(false);
   const [initialized,setInitialized] = useState(false);
   const [imageURL,setImageURL] = useState("");
   const [info,setInfo] = useState<HolderInfo|undefined>();

   const startScanning = () => {
     setScanning(true);
   }

   const onScanned = (blob:Blob,_info?:HolderInfo) => {
     let url = URL.createObjectURL(blob);
     setImageURL(url);
     setInfo(_info);
     setScanning(false);
   }

   const onStopped = () => {
     setScanning(false);
   }
   ```

   使用以下JSX显示结果：

   ```tsx
   {(imageURL && info) && (
     <div className="card">
       <div>
         Image:
         <br/>
         <img src={imageURL} alt="idcard"/>
       </div>
       <div>
         Document number:&nbsp;
         <span>{info.docNumber}</span>
       </div>
       <div>
         First name:&nbsp;
         <span>{info.firstName}</span>
       </div>
       <div>
         Last name:&nbsp;
         <span>{info.lastName}</span>
       </div>
       <div>
         Date of Birth:&nbsp;
         <span>{info.birthDate}</span>
       </div>
       <div>
         Sex:&nbsp;
         <span>{info.sex}</span>
       </div>
     </div>
   )}
   ```

好了，我们已经完成了demo的编写。

## 源代码

可以在以下软件仓库中找到该demo的源代码：<https://github.com/tony-xlh/NextJS-ID-Card-Scanner>

