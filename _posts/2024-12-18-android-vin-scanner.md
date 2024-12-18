---
layout: post
title: "安卓车辆VIN码扫描"
date: 2024-12-18 09:43:53 +0800
categories: 数据捕获
tags: 
description: 本文介绍了如何使用Dynamsoft Capture Vision创建一个安卓车辆VIN码扫描应用。
---

VIN是车辆识别号码的英文的缩写。这是一个独特的17个字符的代码，用于识别车辆。车辆识别码包含汽车品牌、型号、年份、制造国家/地区等信息。

![VIN code39](/album/2024/12/vin/VINcode39.jpg)

可以在驾驶员侧挡风玻璃附近或汽车底盘上找到VIN标签。

大多数VIN标签仅包含文本。有些标签还具有以下格式的条形码：Code 39、QR码、Data Matrix码。

在本文中，我们将构建一个安卓应用，使用[Dynamsoft Capture Vision](https://www.dynamsoft.com/capture-vision/docs/core/) SDK扫描条形码或文本以读取VIN码。


演示视频：

<video src="https://github.com/user-attachments/assets/82e32de8-1834-4051-9b3e-f4000c7b5426" controls="controls" muted="muted" style="max-height:640px; min-height: 200px; max-width: 100%;"></video>

## 新建项目

使用Android Studio创建一个基于Java的空的activity的应用项目。

## 添加依赖项

1. 添加Dynamsoft的maven仓库。

   ```groovy
   repositories {
       maven {
           url "https://download2.dynamsoft.com/maven/aar"
       }
   }
   ```

2. 添加Dynamsoft Capture Vision SDK。

   ```groovy
   implementation 'com.dynamsoft:dynamsoftcapturevisionbundle:2.6.1001'
   ```

3. 添加VIN的OCR模型。

   ```groovy
   implementation 'com.dynamsoft:dynamsoftvin:3.4.20'
   ```

## 初始化许可证。

初始化许可证以使用Dynamsoft的SDK。可以在此处申请[许可证](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)。

```java
//use one-day trial
LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==", this, (isSuccess, error) -> {
    error.printStackTrace();
});
```

## 访问摄像头

1. 在`activity_main.xml`中添加以下内容，添加CameraView以显示摄像机预览：

   ```xml
   <com.dynamsoft.dce.CameraView
       android:id="@+id/camera_view"
       android:layout_width="match_parent"
       android:layout_height="match_parent">
   </com.dynamsoft.dce.CameraView>
   ```

2. 根据ID获取CameraView。

   ```java
   CameraView cameraView = findViewById(R.id.camera_view);
   ```


3. 创建一个Camera Enhancer实例来控制摄像头，并将CameraView与之绑定。

   ```java
   private CameraEnhancer mCamera;
   mCamera = new CameraEnhancer(cameraView, this);
   ```

4. 请求摄像头权限。

   ```java
   PermissionUtil.requestCameraPermission(this);
   ```

5. 打开或关闭摄像头。

   ```java
   mCamera.open();
   //mCamera.close();
   ```

6. 设置扫描区域，只处理帧的一部分以提高扫描效率。

   ```java
   DSRect region = new DSRect(0,0.4f,1,0.6f,true);
   mCamera.setScanRegion(region);
   ```

## 读取条形码

接下来，读取VIN标签上的条形码。

1. 创建Capture Vision Router以调用各种图像处理任务。

   ```java
   private CaptureVisionRouter mRouter;
   mRouter = new CaptureVisionRouter(this);
   ```

2. 创建一个新的JSON模板文件，用来配置router以读取Code 39、QR code和Data Matrix格式的条形码。将其命名为`vin_barcode_template.json`，存放在 `res/raw`。

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
             "LocalizationModes": [
           {
             "Mode": "LM_CONNECTED_BLOCKS"
           },
           {
             "Mode": "LM_SCAN_DIRECTLY",
             "ScanStride": 0,
             "ScanDirection": 0,
             "IsOneDStacked": 0
           },
           {
             "Mode": "LM_STATISTICS"
           },
           {
             "Mode": "LM_LINES"
           }
         ],
         "ExpectedBarcodesCount": 1
       }
     ]
   }
   ```

3. 使用模板更新Capture Vision Router的运行时设置。

   ```java
   @Override
   protected void onCreate(Bundle savedInstanceState) {
       String template = readTemplate(R.raw.vin_barcode_template);
       mRouter.initSettings(template);
   }

   private String readTemplate(int ID) throws IOException {
       InputStream inp = this.getResources().openRawResource(ID);
       BufferedReader reader = new BufferedReader(new InputStreamReader(inp));
       StringBuilder out = new StringBuilder();
       String line;
       while ((line = reader.readLine()) != null) {
           out.append(line);
       }
       String content = out.toString();
       reader.close();
       return content;
   }
   ```

4. 将Camera Enhancer设置为Capture Vision Router的图像源。

   ```java
   mRouter.setInput(mCamera);
   ```

5. 添加结果接收器以接收扫描到的条码结果。

   ```java
   mRouter.addResultReceiver(new CapturedResultReceiver() {
       @Override
       public void onCapturedResultReceived(@NonNull CapturedResult result) {
           String barcode = "";
           for (CapturedResultItem item:result.getItems()) {
               if (item.getType() == EnumCapturedResultItemType.CRIT_BARCODE) {
                   barcode = ((BarcodeResultItem) item).getText();
               }
           }
       }
   });
   ```

6. 从摄像头获取图像并检测条形码。

   ```java
   mRouter.startCapturing("ReadVINBarcode");
   ```

## 识别文本

接下来，识别VIN标签上的文本。

1. 创建一个新的JSON模板文件，用来配置router以读取17个字符的文本。将其命名为`vin_text_template.json`，存放在 `res/raw`。我们需要指定VIN模型和图像处理参数。例如，VIN的文本通常是反色的（黑底白字），我们需要配置`GrayscaleTransformationModes`来反转颜色。

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

2. 在结果接收器中获取文本结果。

   ```java
   mRouter.addResultReceiver(new CapturedResultReceiver() {
       @Override
       public void onCapturedResultReceived(@NonNull CapturedResult result) {
           String barcode = "";
           String textLine = "";
           for (CapturedResultItem item:result.getItems()) {
               if (item.getType() == EnumCapturedResultItemType.CRIT_BARCODE) {
                   barcode = ((BarcodeResultItem) item).getText();
               }
               if (item.getType() == EnumCapturedResultItemType.CRIT_TEXT_LINE) {
                   textLine = ((TextLineResultItem) item).getText();
               }
           }
       }
   });
   ```

3. 加载模板并开始识别文本。

   ```java
   String template = readTemplate(R.raw.vin_text_template);
   mRouter.initSettings(template);
   mRouter.startCapturing("ReadVINText");
   ```

## 同时识别条形码和文本

我们可以合并这两个JSON模板，并创建一个新的`CaptureVisionTemplate`对象，以同时运行条形码和文本检测。

```json
{
  "CaptureVisionTemplates": [
    {
      "Name": "ReadVINBarcodeAndText",
      "ImageROIProcessingNameArray": [
        "roi-read-vin-barcodes","roi-read-vin-text"
      ]
    }
  ]
}
```

然后根据它的名字，通过router来使用它。

```java
mRouter.startCapturing("ReadVINBarcodeAndText");
```

## 过滤误读

在实时扫描场景中，可能会发生误读。我们可以启用结果过滤器来过滤误读。它的工作原理是检查多次读取结果。

```java
MultiFrameResultCrossFilter filter = new MultiFrameResultCrossFilter();
filter.enableResultCrossVerification(EnumCapturedResultItemType.CRIT_TEXT_LINE, true);
filter.enableResultCrossVerification(EnumCapturedResultItemType.CRIT_BARCODE, true);
mRouter.addResultFilter(filter);
```

## 处理生命周期

当应用程序置于后台时停止扫描，当应用程序置于前台时恢复扫描。

```java
@Override
public void onResume() {
    super.onResume();
    startScanning();
}

@Override
public void onPause() {
    super.onPause();
    stopScanning();
}
```

## 源代码


查看demo的源代码并尝试使用：<https://github.com/tony-xlh/Android-VIN-Scanner>




