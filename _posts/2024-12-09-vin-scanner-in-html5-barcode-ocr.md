---
layout: post
title: "扫描车辆VIN码的网页应用"
date: 2024-12-09 10:40:53 +0800
categories: 数据捕获
tags: 
description: 本文讨论了如何编写一个网页应用，通过识别条码或者文字来读取车辆上的VIN码。
---

VIN是车辆识别号码的英文的缩写。这是一个独特的17个字符的代码，用于识别车辆。车辆识别码包含汽车品牌、型号、年份、制造国家/地区等信息。

![VIN code39](/album/2024/12/vin/VINcode39.jpg)

可以在驾驶员侧挡风玻璃附近或汽车底盘上找到VIN标签。

大多数VIN标签仅包含文本。有些标签还具有以下格式的条形码：Code 39、QR码、Data Matrix码。

在本文中，我们将构建一个HTML5应用，使用[Dynamsoft Capture Vision](https://www.dynamsoft.com/capture-vision/docs/core/) SDK扫描条形码或文本以读取VIN码。

[在线demo](https://tony-xlh.github.io/VIN-Scanner-JavaScript/)

演示视频：

<video src="https://github.com/user-attachments/assets/9c713a5d-eb88-4c93-9a59-1c0d47b37314" controls="controls" muted="muted" style="max-height:640px; min-height: 200px; max-width: 100%;"></video>

## 新建HTML页面

创建包含以下内容的新的HTML页面：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VIN Scanner</title>
  <style>
  </style>
</head>
<body>
  <h1>VIN Scanner</h1>
  <script>
  </script>
</body>
</html>
```

## 添加依赖项

用以下代码引入Dynamsoft Capture Vision SDK：

```html
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-bundle@2.4.2200/dist/dcv.bundle.js"></script>
```

## 初始化SDK

1. 设置许可证。可以在此处申请[许可证](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)。

   ```js
   async function init(){
     Dynamsoft.License.LicenseManager.initLicense(
       "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==" //one-day trial license
     );
   }
   ```

2. 加载资源。

   ```js
   await Dynamsoft.Core.CoreModule.loadWasm(["DBR","DLR","DCP"]);
   await Dynamsoft.DLR.LabelRecognizerModule.loadRecognitionData("VIN");
   await Dynamsoft.DCP.CodeParserModule.loadSpec("VIN");
   ```

3. 创建Capture Vision Router实例以调用条形码读取和OCR等各种图像处理任务。

   ```js
   router = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
   ```

## 打开摄像头

接下来，让我们使用Dynamsoft Camera Enhancer打开摄像头。

1. 为相机添加一个容器。

   ```html
   <div id="cameraViewContainer"></div>
   <style>
     #cameraViewContainer {
       width: 100%;
       height: 320px;
       margin-top: 10px;
       margin-bottom: 10px;
     }
   </style>
   ```

2. 创建一个Camera Enhancer的实例，并将其和容器绑定。

   ```js
   const cameraViewContainer = document.getElementById("cameraViewContainer");
   let cameraEnhancer;
   let view = await Dynamsoft.DCE.CameraView.createInstance();
   cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(
     view
   );
   cameraViewContainer.append(view.getUIElement());
   ```

3. 添加一个按钮，用于打开或关闭摄像头。

   ```html
   <button id="toggleButton">Start Detection</button>
   <script>
   async function toggleDetection() {
     if (cameraEnhancer.isOpen()) {
       await cameraEnhancer.close();
       toggleButton.innerText = "Start Detection";
     }else{
       await cameraEnhancer.open();
       toggleButton.innerText = "Stop Detection";
     }
   };
   </script>
   ```

## 读取条形码

接下来，读取VIN标签上的条形码。

1. 创建一个新的JSON模板文件，用来配置router以读取Code 39、QR code和Data Matrix格式的条形码。将其存为`VINBarcodeTemplate.json`。

   ```json
   {
     "CaptureVisionTemplates": [
       {
         "Name": "ReadVINBarcode",
         "ImageROIProcessingNameArray": [
           "roi-read-vin-barcodes"
         ]
       }
     ],
     "TargetROIDefOptions": [
       {
         "Name": "roi-read-vin-barcodes",
         "TaskSettingNameArray": ["task-read-vin-barcodes"]
       }
     ],
     "BarcodeReaderTaskSettingOptions": [
       {
         "Name": "task-read-vin-barcodes",
         "BarcodeFormatIds": ["BF_CODE_39", "BF_QR_CODE", "BF_DATAMATRIX"],
         "ExpectedBarcodesCount": 1
       }
     ]
   }
   ```

2. 使用`initSettings`函数加载模板：

   ```js
   await router.initSettings("./VINBarcodeTemplate.json");
   ```

3. 创建一个结果接收器来获取结果。

   ```js
   const resultReceiver = new Dynamsoft.CVR.CapturedResultReceiver();
   resultReceiver.onCapturedResultReceived = (result) => {
     console.log(result);
   }
   await router.addResultReceiver(resultReceiver);
   ```

4. 将camera enhancer设置为router的输入源。

   ```js
   router.setInput(cameraEnhancer);
   ```

5. 打开摄像头后，开始处理视频帧以读取条形码。

   ```diff
    async function toggleDetection() {
      if (cameraEnhancer.isOpen()) {
   +    await router.stopCapturing();
        await cameraEnhancer.close();
        toggleButton.innerText = "Start Detection";
      }else{
        await cameraEnhancer.open();
   +    await router.startCapturing("ReadVINBarcode);
        toggleButton.innerText = "Stop Detection";
      }
    };
   ```

## 识别文本

接下来，识别VIN标签上的文本。

1. 创建一个新的JSON模板文件，用来配置router以读取17个字符的文本。将其存为`VINTextTemplate.json`。我们需要指定VIN模型和图像处理参数。例如，VIN的文本通常是反色的（黑底白字），我们需要配置`GrayscaleTransformationModes`来反转颜色。

   ```json
   {
     "CaptureVisionTemplates": [
       {
         "Name": "ReadVINText",
         "ImageROIProcessingNameArray": [
           "roi-read-vin-text"
         ],
         "ImageSource": "",
         "MaxParallelTasks": 4,
         "MinImageCaptureInterval": 0,
         "OutputOriginalImage": 0,
         "Timeout": 10000
       }
     ],
     "TargetROIDefOptions": [
       {
         "Name": "roi-read-vin-text",
         "TaskSettingNameArray": ["task-read-vin-text"]
       }
     ],
     "CharacterModelOptions": [
       {
         "CharSet": {
           "ExcludeChars": ["O", "Q", "I"]
         },
         "DirectoryPath": "",
         "Name": "VIN"
       }
     ],
     "ImageParameterOptions": [
       {
         "BaseImageParameterName": "",
         "BinarizationModes": [
           {
             "BinarizationThreshold": -1,
             "BlockSizeX": 0,
             "BlockSizeY": 0,
             "EnableFillBinaryVacancy": 1,
             "GrayscaleEnhancementModesIndex": -1,
             "Mode": "BM_LOCAL_BLOCK",
             "MorphOperation": "Close",
             "MorphOperationKernelSizeX": -1,
             "MorphOperationKernelSizeY": -1,
             "MorphShape": "Rectangle",
             "ThresholdCompensation": 10
           }
         ],
         "ColourConversionModes": [
           {
             "BlueChannelWeight": -1,
             "GreenChannelWeight": -1,
             "Mode": "CICM_GENERAL",
             "RedChannelWeight": -1,
             "ReferChannel": "H_CHANNEL"
           }
         ],
         "GrayscaleEnhancementModes": [
           {
             "Mode": "GEM_GENERAL",
             "Sensitivity": -1,
             "SharpenBlockSizeX": -1,
             "SharpenBlockSizeY": -1,
             "SmoothBlockSizeX": -1,
             "SmoothBlockSizeY": -1
           }
         ],
         "GrayscaleTransformationModes": [
           {
             "Mode": "GTM_ORIGINAL"
           },
           {
             "Mode": "GTM_INVERTED"
           }
         ],
         "IfEraseTextZone": 0,
         "Name": "ip_recognize_text",
         "RegionPredetectionModes": [
           {
             "AspectRatioRange": "[]",
             "FindAccurateBoundary": 0,
             "ForeAndBackgroundColours": "[]",
             "HeightRange": "[]",
             "ImageParameterName": "",
             "MeasuredByPercentage": 1,
             "MinImageDimension": 262144,
             "Mode": "RPM_GENERAL",
             "RelativeRegions": "[]",
             "Sensitivity": 1,
             "SpatialIndexBlockSize": 5,
             "WidthRange": "[]"
           }
         ],
         "ScaleDownThreshold": 2300,
         "ScaleUpModes": [
           {
             "AcuteAngleWithXThreshold": -1,
             "LetterHeightThreshold": 0,
             "Mode": "SUM_AUTO",
             "ModuleSizeThreshold": 0,
             "TargetLetterHeight": 0,
             "TargetModuleSize": 0
           }
         ],
         "TextDetectionMode": {
           "CharHeightRange": [5, 1000, 1],
           "Direction": "HORIZONTAL",
           "MaxSpacingInALine": -1,
           "Mode": "TTDM_LINE",
           "Sensitivity": 7,
           "StringLengthRange": null
         },
         "TextureDetectionModes": [
           {
             "Mode": "TDM_GENERAL_WIDTH_CONCENTRATION",
             "Sensitivity": 5
           }
         ]
       }
     ],
     "LabelRecognizerTaskSettingOptions": [
       {
         "Name": "task-read-vin-text",
         "TextLineSpecificationNameArray": ["tls_vin_text"],
         "SectionImageParameterArray": [
           {
             "ContinueWhenPartialResultsGenerated": 1,
             "ImageParameterName": "ip_recognize_text",
             "Section": "ST_REGION_PREDETECTION"
           },
           {
             "ContinueWhenPartialResultsGenerated": 1,
             "ImageParameterName": "ip_recognize_text",
             "Section": "ST_TEXT_LINE_LOCALIZATION"
           },
           {
             "ContinueWhenPartialResultsGenerated": 1,
             "ImageParameterName": "ip_recognize_text",
             "Section": "ST_TEXT_LINE_RECOGNITION"
           }
         ]
       }
     ],
     "TextLineSpecificationOptions": [
       {
         "BinarizationModes": [
           {
             "BinarizationThreshold": -1,
             "BlockSizeX": 11,
             "BlockSizeY": 11,
             "EnableFillBinaryVacancy": 1,
             "GrayscaleEnhancementModesIndex": -1,
             "Mode": "BM_LOCAL_BLOCK",
             "MorphOperation": "Erode",
             "MorphOperationKernelSizeX": -1,
             "MorphOperationKernelSizeY": -1,
             "MorphShape": "Rectangle",
             "ThresholdCompensation": 10
           }
         ],
         "CharHeightRange": [5, 1000, 1],
         "CharacterModelName": "VIN",
         "CharacterNormalizationModes": [
           {
             "Mode": "CNM_AUTO",
             "MorphArgument": "3",
             "MorphOperation": "Close"
           }
         ],
         "ConcatResults": 0,
         "ConcatSeparator": "\n",
         "ConcatStringLengthRange": [3, 200],
         "ExpectedGroupsCount": 1,
         "GrayscaleEnhancementModes": [
           {
             "Mode": "GEM_GENERAL",
             "Sensitivity": -1,
             "SharpenBlockSizeX": -1,
             "SharpenBlockSizeY": -1,
             "SmoothBlockSizeX": -1,
             "SmoothBlockSizeY": -1
           }
         ],
         "Name": "tls_vin_text",
         "OutputResults": 1,
         "StringLengthRange": [17, 17],
         "StringRegExPattern": "[0-9A-HJ-NPR-Z]{9}[1-9A-HJ-NPR-TV-Y][0-9A-HJ-NPR-Z]{2}[0-9]{5}",
         "SubGroups": null,
         "TextLinesCount": 1
       }
     ]
   }
   ```

2. 使用`ReadVINText`模板名调用router识别文本。

   ```js
   let templateName = "ReadVINText";
   await router.initSettings("./VINTextTemplate.json");
   await router.startCapturing(templateName);
   ```

## 解析结果

接下来，在获取VIN代码后，我们可以使用Dynamsoft Code Parser从中提取信息。

1. 创建一个Code Parser实例

   ```js
   let parser = await Dynamsoft.DCP.CodeParser.createInstance();
   ```

2. 识别到VIN码后，解析VIN码。

   ```js
   const resultReceiver = new Dynamsoft.CVR.CapturedResultReceiver();
   resultReceiver.onCapturedResultReceived = (result) => {
     let VIN;
     if (result.items.length > 0) {
       let item = result.items[0];
       if (item.type === Dynamsoft.Core.EnumCapturedResultItemType.CRIT_BARCODE) {
         VIN = item.text;
       }else if (item.type === Dynamsoft.Core.EnumCapturedResultItemType.CRIT_TEXT_LINE) {
         VIN = item.text;
       }
       if (VIN) {
         let parsedResultItem = await parser.parse(VIN);
         let modelYear = parsedResultItem.getFieldValue("modelYear");
         let worldManufacturerIndentifier = parsedResultItem.getFieldValue("WMI");
       }
     }
   }
   ```


## 源代码

可以在以下软件仓库中找到该demo的源代码：<https://github.com/tony-xlh/VIN-Scanner-JavaScript/>

