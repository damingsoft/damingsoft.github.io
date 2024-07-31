---
layout: post
title: "用Next.js编写OCR护照上MRZ的网页应用"
date: 2024-07-31 10:40:53 +0800
categories: 文字识别
tags: 
description: 本文介绍了如何使用Dynamsoft Label Recognizer在Next.js应用程序中扫描MRZ ，从护照、身份证等中提取信息。
---

<style>
img {
  max-height: 480px;
}
</style>

MRZ（机器可读区域），通常位于护照或身份证的底部。[^wiki]它可以通过带有摄像头的计算设备进行读取，以获取文件类型、姓名、编号、国籍、出生日期、性别和到期日期等信息。

在本文中，我们将用Next.js编写一个Web应用，通过摄像头扫描MRZ。使用[Dynamsoft Label Recognizer](https://www.dynamsoft.com/label-recognition/overview/)作为OCR引擎。

Demo截图：

![演示](/album/2024/07/nextjs-mrz-scanner.jpg)

[点此](https://next-js-mrz-scanner.vercel.app/)访问在线demo。

## 新建项目

创建一个新的Next.js项目：

```bash
npx create-next-app@latest
```

## 安装依赖项

安装Dynamsoft Label Recognizer和相关库。

```bash
npm i dynamsoft-core@3.2.30 dynamsoft-camera-enhancer@4.0.2 dynamsoft-capture-vision-router@2.2.30 dynamsoft-code-parser@2.2.10 dynamsoft-label-recognizer@3.2.30 dynamsoft-license@3.2.21 dynamsoft-utility@1.2.20
```

## 配置SDK

创建一个名为`configure.ts`的新文件，内容如下。这里需要一个许可证。可以在[这里](https://www.dynamsoft.com/customer/license/trialLicense?product=dlr)申请。

```ts
import "dynamsoft-license";
import "dynamsoft-capture-vision-router";
import "dynamsoft-label-recognizer";
import { LicenseManager } from "dynamsoft-license";
import { CoreModule } from "dynamsoft-core";

if (CoreModule.isModuleLoaded("dlr") === false) {
  /** LICENSE ALERT - README
   * To use the library, you need to first specify a license key using the API "initLicense()" as shown below.
   */
  LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==");

  CoreModule.engineResourcePaths = {
    std: 'https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-std@1.2.10/dist/',
    dip: 'https://cdn.jsdelivr.net/npm/dynamsoft-image-processing@2.2.30/dist/',
    core: "https://cdn.jsdelivr.net/npm/dynamsoft-core@3.2.30/dist/",
    license: "https://cdn.jsdelivr.net/npm/dynamsoft-license@3.2.21/dist/",
    cvr: "https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.2.30/dist/",
    dlr: "https://cdn.jsdelivr.net/npm/dynamsoft-label-recognizer@3.2.30/dist/",
    dce: "https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@4.0.2/dist/",
    dnn: 'https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-dnn@1.0.20/dist/',
    dlrData: 'https://cdn.jsdelivr.net/npm/dynamsoft-label-recognizer-data@1.0.10/dist/',
    utility: 'https://cdn.jsdelivr.net/npm/dynamsoft-utility@1.2.20/dist/'
  };
}
```

在`page.tsx`中，导入配置文件以执行配置：

```tsx
import "../configure"
```


## 创建MRZ扫描组件

1. 新建一个位于`src/components/MRZScanner.tsx`的组件，包含以下模版内容。

   ```tsx
   import { RecognizedTextLinesResult } from "dynamsoft-label-recognizer";
   import { MutableRefObject, useEffect, useRef } from "react";
   import React from "react";

   export interface MRZScannerProps{
     isScanning?:boolean;
     onInitialized?:()=>void;
     onScanned?:(results:RecognizedTextLinesResult)=>void;
   }

   const MRZScanner: React.FC<MRZScannerProps> = (props:MRZScannerProps) => {
     const container:MutableRefObject<HTMLDivElement|null>  = useRef(null);
     return (
       <div ref={container} style={{width:"100%",height:"100%"}}></div>
     )
   }

   export default MRZScanner;
   ```

2. 添加以下effect，以便在挂载组件时初始化相关库。

   ```tsx
   const initialized = useRef(false);
   useEffect(()=>{
     init();
   },[])

   const init = async () => {
     if (initialized.current == false) {
       initialized.current = true;
       await initCameraEnhancer();
       await initLabelRecognizer();
       if (props.onInitialized) {
         props.onInitialized();
       }
       if (props.isScanning === true) {
         startScanning();
       }
     }
   }
   ```

   用于初始化camera enhancer的函数。

   ```ts
   const initCameraEnhancer = async () => {
     const cameraView = await CameraView.createInstance();
     cameraEnhancer.current = await CameraEnhancer.createInstance(cameraView);
     container.current!.append(cameraView.getUIElement());
   }
   ```

   用于初始化label recognizer的函数。

   ```ts
   const initLabelRecognizer = async () => {
     // Preload "LabelRecogznier" module for recognizing text. It will save time on the initial recognizing by skipping the module loading.
     await CoreModule.loadWasm(["DLR"]);
     await LabelRecognizerModule.loadRecognitionData("MRZ");
     router.current = await CaptureVisionRouter.createInstance();
     router.current.initSettings("/template.json");
     // Define a callback for results.
     const resultReceiver = new CapturedResultReceiver();
     resultReceiver.onRecognizedTextLinesReceived = (result: RecognizedTextLinesResult) => {
       console.log(result);
       if (props.onScanned) {
         props.onScanned(result);
       }
     };
     router.current.addResultReceiver(resultReceiver);
     if (cameraEnhancer.current) {
       router.current.setInput(cameraEnhancer.current);
     }
   }
   ```

   使用以下代码更改capture vision router的运行时设置以读取MRZ。

   ```ts
   router.current.initSettings("/template.json");
   ```

   将包含以下内容的`template.json`放在`public`里。

   ```json
   {
     "CaptureVisionTemplates": [
       {
         "Name": "ReadMRZ",
         "OutputOriginalImage": 0,
         "ImageROIProcessingNameArray": [
           "roi-mrz"
         ],
         "Timeout": 2000
       }
     ],
     "TargetROIDefOptions": [
       {
         "Name": "roi-mrz",
         "TaskSettingNameArray": [
           "task-mrz"
         ]
       }
     ],
     "TextLineSpecificationOptions": [
       {
         "Name": "tls-mrz-passport",
         "BaseTextLineSpecificationName": "tls-base",
         "StringLengthRange": [ 44, 44 ],
         "OutputResults": 1,
         "ExpectedGroupsCount": 1,
         "ConcatResults": 1,
         "ConcatSeparator": "\n",
         "SubGroups": [
           {
             "StringRegExPattern": "(P[A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}",
             "StringLengthRange": [ 44, 44 ],
             "BaseTextLineSpecificationName": "tls-base"
           },
           {
             "StringRegExPattern": "([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[0-9<][0-9]){(44)}",
             "StringLengthRange": [ 44, 44 ],
             "BaseTextLineSpecificationName": "tls-base"
           }
         ]
       },
       {
         "Name": "tls-mrz-visa-td3",
         "BaseTextLineSpecificationName": "tls-base",
         "StringLengthRange": [ 44, 44 ],
         "OutputResults": 1,
         "ExpectedGroupsCount": 1,
         "ConcatResults": 1,
         "ConcatSeparator": "\n",
         "SubGroups": [
           {
             "StringRegExPattern": "(V[A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}",
             "StringLengthRange": [ 44, 44 ],
             "BaseTextLineSpecificationName": "tls-base"
           },
           {
             "StringRegExPattern": "([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[A-Z0-9<]{2}){(44)}",
             "StringLengthRange": [ 44, 44 ],
             "BaseTextLineSpecificationName": "tls-base"
           }
         ]
       },
       {
         "Name": "tls-mrz-visa-td2",
         "BaseTextLineSpecificationName": "tls-base",
         "StringLengthRange": [ 36, 36 ],
         "OutputResults": 1,
         "ExpectedGroupsCount": 1,
         "ConcatResults": 1,
         "ConcatSeparator": "\n",
         "SubGroups": [
           {
             "StringRegExPattern": "(V[A-Z<][A-Z<]{3}[A-Z<]{31}){(36)}",
             "StringLengthRange": [ 36, 36 ],
             "BaseTextLineSpecificationName": "tls-base"
           },
           {
             "StringRegExPattern": "([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}",
             "StringLengthRange": [ 36, 36 ],
             "BaseTextLineSpecificationName": "tls-base"
           }
         ]
       },
       {
         "Name": "tls-mrz-id-td2",
         "BaseTextLineSpecificationName": "tls-base",
         "StringLengthRange": [ 36, 36 ],
         "OutputResults": 1,
         "ExpectedGroupsCount": 1,
         "ConcatResults": 1,
         "ConcatSeparator": "\n",
         "SubGroups": [
           {
             "StringRegExPattern": "([ACI][A-Z<][A-Z<]{3}[A-Z<]{31}){(36)}",
             "StringLengthRange": [ 36, 36 ],
             "BaseTextLineSpecificationName": "tls-base"
           },
           {
             "StringRegExPattern": "([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}",
             "StringLengthRange": [ 36, 36 ],
             "BaseTextLineSpecificationName": "tls-base"
           }
         ]
       },
       {
         "Name": "tls-mrz-id-td1",
         "BaseTextLineSpecificationName": "tls-base",
         "StringLengthRange": [ 30, 30 ],
         "OutputResults": 1,
         "ExpectedGroupsCount": 1,
         "ConcatResults": 1,
         "ConcatSeparator": "\n",
         "SubGroups": [
           {
             "StringRegExPattern": "([ACI][A-Z<][A-Z<]{3}[A-Z0-9<]{9}[0-9][A-Z0-9<]{15}){(30)}",
             "StringLengthRange": [ 30, 30 ],
             "BaseTextLineSpecificationName": "tls-base"
           },
           {
             "StringRegExPattern": "([0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z<]{3}[A-Z0-9<]{11}[0-9]){(30)}",
             "StringLengthRange": [ 30, 30 ],
             "BaseTextLineSpecificationName": "tls-base"
           },
           {
             "StringRegExPattern": "([A-Z<]{30}){(30)}",
             "StringLengthRange": [ 30, 30 ],
             "BaseTextLineSpecificationName": "tls-base"
           }
         ]
       },
       {
         "Name": "tls-base",
         "CharacterModelName": "MRZ",
         "CharHeightRange": [ 5, 1000, 1 ],
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
             [ "0", "O" ],
             [ "1", "I" ],
             [ "5", "S" ]
           ],
           "FontNameArray": [ "OCR_B" ]
         }
       }
     ],
     "LabelRecognizerTaskSettingOptions": [
       {
         "Name": "task-mrz",
         "ConfusableCharactersPath": "ConfusableChars.data",
         "TextLineSpecificationNameArray": [ "tls-mrz-passport", "tls-mrz-visa-td3", "tls-mrz-id-td1", "tls-mrz-id-td2", "tls-mrz-visa-td2" ],
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
           "CharHeightRange": [ 5, 1000, 1 ],
           "Direction": "HORIZONTAL",
           "Sensitivity": 7
         }
       }
     ]
   }
   ```

3. 侦测`isScanning` prop的变化以执行相关操作。

   ```tsx
   useEffect(()=>{
     if (props.isScanning === true) {
       startScanning();
     }else{
       stopScanning();
     }
   },[props.isScanning])
   ```

   `startScanning`和`stopScanning`函数：

   ```tsx
   const startScanning = async () => {
     stopScanning();
     if (cameraEnhancer.current && router.current) {
       cameraEnhancer.current.open();
       router.current.startCapturing("ReadMRZ")
     }
   }

   const stopScanning = () => {
     if (cameraEnhancer.current && router.current) {
       router.current.stopCapturing();
       cameraEnhancer.current.close();
     }
   }
   ```


## 使用MRZ扫描组件

1. 在`page.tsx`中，使用`next/dynamic`导入MRZ扫描组件以禁用服务器端渲染。如果不这样做，可能会遇到`HTMLElement undefined`错误。

   ```ts
   import dynamic from "next/dynamic";
   const MRZScanner = dynamic(
     () => import("../components/MRZScanner"),
     {
       ssr: false,
     }
   );
   ```

2. 添加一个按钮来切换MRZ扫描组件的扫描状态，并在`onScanned`回调函数中接收MRZ结果。

   ```tsx
   export default function Home() {
     const [isScanning,setIsScanning] = useState(false);
     const [initialized,setInitialized] = useState(false);
     const [MRZ,setMRZ] = useState("");

     const onScanned = (result:RecognizedTextLinesResult) => {
       setIsScanning(false);
       if (result.textLineResultItems.length>0) {
         let str = result.textLineResultItems[0].text
         setMRZ(str);
       }
     }

     const toggleScanning = () => {
       setMRZ("");
       setIsScanning(!isScanning)
     }

     return (
       <main className={styles.main}>
         <h2>MRZ Scanner</h2>
         {!initialized &&(
           <button disabled>Initializing...</button>  
         )}
         {initialized &&(
           <button onClick={()=>toggleScanning()} >{isScanning?"Stop Scanning":"Start Scanning"}</button>
         )}
         <div className={styles.scanner + ((initialized && isScanning) ? "" : " "+styles.hidden)}>
           <div className={styles.cameracontainer}>
             <MRZScanner
               isScanning={isScanning}
               onScanned={(result:RecognizedTextLinesResult)=>{onScanned(result)}}
               onInitialized={()=>{setInitialized(true)}}
             ></MRZScanner>
           </div>
         </div>
       </main>
     );
   }
   ```


## 解析MRZ

1. 新建一个位于`src/components`的名为`MRZResultTable.tsx`的组件，包含以下模版内容。它以表格形式显示解析结果的字段和值。

   ```tsx
   import { useEffect, useRef, useState } from "react";
   import "./MRZResultTable.css"

   export interface MRZResultTableProps {
     MRZ:string;
   }

   interface Field{
     name:string;
     value:string;
   }

   const MRZResultTable: React.FC<MRZResultTableProps> = (props:MRZResultTableProps) => {
     const [fields,setFields] = useState<Field[]|null>(null)
     return (
       <>
         {fields &&(
           <table className="resultTable">
             <thead>
               <tr>
                 <th>Field</th>
                 <th>Value</th>
               </tr>
             </thead>
             <tbody>
               {fields.map(field =>
                 <tr key={field.name}>
                   <td>{field.name}</td>
                   <td>{field.value}</td>
                 </tr>
               )}
             </tbody>
           </table>
         )}
       </>
     )
   }

   export default MRZResultTable;
   ```

   CSS：

   ```css
   .resultTable {
     border-collapse: collapse;
     max-width: 100%;
     overflow: auto;
   }

   .resultTable, .resultTable td, .resultTable th {
     border: 1px solid;
   }
   ```

2. 组件挂载时，初始化code parser，以用于解析。

   ```tsx
   const initialized = useRef(false);
   const parser = useRef<CodeParser|null>(null);

   useEffect(()=>{
     const init = async () => {
       initialized.current = true;
       await initCodeParser();
       parse();
     }
     init();
   },[])

   const initCodeParser = async () => {
     CoreModule.engineResourcePaths.dcp = "https://cdn.jsdelivr.net/npm/dynamsoft-code-parser@2.2.10/dist/";
     await CodeParserModule.loadSpec("MRTD_TD1_ID");
     await CodeParserModule.loadSpec("MRTD_TD2_FRENCH_ID")
     await CodeParserModule.loadSpec("MRTD_TD2_ID")
     await CodeParserModule.loadSpec("MRTD_TD2_VISA")
     await CodeParserModule.loadSpec("MRTD_TD3_PASSPORT")  
     await CodeParserModule.loadSpec("MRTD_TD3_VISA")
     parser.current = await CodeParser.createInstance();
   }
   ```

3. 如果MRZ prop发生变化，则尝试解析 MRZ。

   ```tsx
   useEffect(()=>{
     parse();
   },[props.MRZ])

   const parse = async () => {
     if (parser.current && props.MRZ) {
       let result = await parser.current.parse(props.MRZ);
       let MRZFields = ["documentNumber","passportNumber","issuingState","name","sex","nationality","dateOfExpiry","dateOfBirth"];
       let parsedFields = [];
       for (let index = 0; index < MRZFields.length; index++) {
         const field = MRZFields[index];
         const value = result.getFieldValue(field);
         if (value){
           parsedFields.push({
             name:field,
             value:value
           })
         }
       }
       setFields(parsedFields);
     }else{
       setFields(null);
     }
   }
   ```

4. 在`page.tsx`中，使用`MRZResultTable`组件显示解析结果。

   ```tsx
   <MRZResultTable MRZ={MRZ}></MRZResultTable>
   ```

好了，我们现在已经完成了MRZ扫描Next.js应用的demo。

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/NextJS-MRZ-Scanner>

## 参考文献

[^wiki]: https://en.wikipedia.org/wiki/Machine-readable_passport

