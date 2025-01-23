---
layout: post
title: "编写React Native DotCode扫描应用"
date: 2025-01-23 10:29:53 +0800
categories: 条码扫描
tags: 
description: 文章讲述了如何使用Dynamsoft Barcode Reader构建一个React Native DotCode扫描应用。
---

DotCode（点阵码）是一种二维（2D）矩阵条形码，主要用于烟草行业，其优点是可以通过高速工业打印机和激光雕刻等方式打印。

下面是一包香烟，上面的DotCode代表着其唯一标识符。

![烟盒](/album/2025/01/dotcode/cigarette-pack.jpg)

在本文中，我们将使用[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)创建一个React Native DotCode扫描应用。

演示视频：

<video src="https://github.com/user-attachments/assets/373adaeb-f7c5-46b3-9925-c28e98990aa6" controls="controls" muted="muted" style="max-width: 100%;"></video>


## 创建新的React Native项目

使用特定版本创建新的React Native项目：

```bash
npx @react-native-community/cli init DotCodeScanner --version 0.75.2
```

## 添加Dynamsoft Barcode Reader

安装Dynamsoft Capture Vision（内含Dynamsoft Barcode Reader）：

```bash
npm install dynamsoft-capture-vision-react-native
```


## 设置许可证

在`App.tsx`添加以下代码以在应用启动时设置许可证。

```tsx
useEffect(()=>{
  LicenseManager.initLicense('LICENSE-KEY')
  .then(()=>{/*Init license successfully.*/})
  .catch(error => console.error('Init License failed.', error));
},[]);
```

## 请求相机权限

1. 将以下行添加到`Info.plist`来声明iOS端相机的用途。

   ```xml
   <key>NSCameraUsageDescription</key>
   <string>For barcode scanning</string>
   ```

2. 应用启动后，请求相机权限。

   ```tsx
   useEffect(()=>{
     CameraEnhancer.requestCameraPermission();
   },[]);
   ```

## 编写DotCode扫描组件

1. 使用以下模板在`components/BarcodeScanner.tsx`下创建新文件：

   ```tsx
   import React, {useEffect, useRef} from 'react';
   import {DecodedBarcodesResult} from 'dynamsoft-capture-vision-react-native';
   import { StyleSheet } from 'react-native';

   export interface ScannerProps{
     onScanned?: (result:DecodedBarcodesResult) => void;
   }

   export function BarcodeScanner(props:ScannerProps) {
     return (
       <></>
     );
   }
   const styles = StyleSheet.create({
     container: {
       flex:1,
     },
   });
   ```

2. 添加一个`CameraView`组件。

   ```js
   export function BarcodeScanner(props:ScannerProps) {
      const cameraView = useRef<CameraView>(null);
      return (
        <CameraView style={styles.container} ref={cameraView} />
      );
   }
   ```

3. 获取Camera实例以打开相机，并在`CameraView`组件中显示视频流。

   ```js
   export function BarcodeScanner(props:ScannerProps) {
     const cameraView = useRef<CameraView>(null);
     const camera = CameraEnhancer.getInstance();
     useEffect(() => {
       camera.setCameraView(cameraView.current!!);
       camera.open();
       return () => {
         //close the camera when the component is going to be unmounted
         camera.close();
       };
     }, [camera, cameraView, props]);

     return (
       <CameraView style={styles.container} ref={cameraView} />
     );
   }
   ```

4. 设置扫描区域，以便只处理相机画面的一部分，从而提高DotCode的定位效果和识别率。

   ```tsx
   setTimeout(()=>{
     camera.setScanRegion({
       left: 0,
       top: 0.4,
       right: 1,
       bottom: 0.6,
       measuredInPercentage: true,
     });
   },500)
   ```

5. 获取Capture Vision Router的实例，以调用Barcode Reader从视频流读取条形码。

   ```tsx
   export function BarcodeScanner(props:ScannerProps) {
     const router = CaptureVisionRouter.getInstance();
     useEffect(() => {
       //...
       router.initSettings(dotcodeTemplate);
       router.setInput(camera);
       let resultReceiver = router.addResultReceiver({
         onDecodedBarcodesReceived: (result: DecodedBarcodesResult) =>  {
           console.log('scanned');
           if (props.onScanned) {
             props.onScanned(result);
           }
         },
       });

       router.startCapturing('Dotcode');

       return () => {
         //...
         router.removeResultReceiver(resultReceiver!);
       };
     }, [camera, router, cameraView, props]);
   }
   ```

6. 我们需要使用JSON模板来更新设置，以支持读取DotCode。

   模板：

   ```json
   {
     "CaptureVisionTemplates": [
       {
         "Name": "Dotcode",
         "ImageROIProcessingNameArray": [
           "roi_read_dotcode"
         ],
         "Timeout": 700,
         "MaxParallelTasks":0
       }
     ],
     "TargetROIDefOptions": [
       {
         "Name": "roi_read_dotcode",
         "TaskSettingNameArray": [
           "task_read_dotcode"
         ]
       }
     ],
     "BarcodeFormatSpecificationOptions": [
       {
         "Name": "format_specification_read_dotcode",
         "BarcodeFormatIds": [
           "BF_DOTCODE"
         ],
         "MirrorMode": "MM_BOTH"
       }
     ],
     "BarcodeReaderTaskSettingOptions": [
       {
         "Name": "task_read_dotcode",
         "ExpectedBarcodesCount" : 1,
         "BarcodeFormatIds" : [ "BF_DOTCODE" ],
         "LocalizationModes": [
           {
             "Mode" : "LM_STATISTICS_MARKS"
           }
         ],
         "DeblurModes":
         [
           {
             "Mode": "DM_BASED_ON_LOC_BIN"
           },
           {
             "Mode": "DM_THRESHOLD_BINARIZATION"
           },
           {
             "Mode": "DM_DEEP_ANALYSIS"
           }
         ],
         "BarcodeFormatSpecificationNameArray": [
           "format_specification_read_dotcode"
         ],
         "SectionImageParameterArray": [
           {
             "Section": "ST_REGION_PREDETECTION",
             "ImageParameterName": "ip_read_dotcode"
           },
           {
             "Section": "ST_BARCODE_LOCALIZATION",
             "ImageParameterName": "ip_read_dotcode"
           },
           {
             "Section": "ST_BARCODE_DECODING",
             "ImageParameterName": "ip_read_dotcode"
           }
         ]
       }
     ],
     "ImageParameterOptions": [
       {
         "Name": "ip_read_dotcode",
         "BinarizationModes": [
           {
             "Mode": "BM_LOCAL_BLOCK",
             "BlockSizeX": 15,
             "BlockSizeY": 15,
             "EnableFillBinaryVacancy": 0,
             "ThresholdCompensation": 10
           },
           {
             "Mode": "BM_LOCAL_BLOCK",
             "BlockSizeX": 21,
             "BlockSizeY": 21,
             "EnableFillBinaryVacancy": 0,
             "ThresholdCompensation": 10,
             "MorphOperation":"Erode",
             "MorphOperationKernelSizeX":3,
             "MorphOperationKernelSizeY":3,
             "MorphShape":"Ellipse"
           },
           {
             "Mode": "BM_LOCAL_BLOCK",
             "BlockSizeX": 35,
             "BlockSizeY": 35,
             "EnableFillBinaryVacancy": 0,
             "ThresholdCompensation": 10,
             "MorphOperation":"Erode",
             "MorphOperationKernelSizeX":3,
             "MorphOperationKernelSizeY":3,
             "MorphShape":"Ellipse"
           },
           {
             "Mode": "BM_LOCAL_BLOCK",
             "BlockSizeX": 45,
             "BlockSizeY": 45,
             "EnableFillBinaryVacancy": 0,
             "ThresholdCompensation": 25,
             "MorphOperation":"Erode",
             "MorphOperationKernelSizeX":3,
             "MorphOperationKernelSizeY":3,
             "MorphShape":"Ellipse"
           }
         ],
         "GrayscaleEnhancementModes": [
           {
             "Mode": "GEM_GENERAL"
           }
         ],
         "GrayscaleTransformationModes": [
           {
             "Mode": "GTM_INVERTED"
           },
           {
             "Mode": "GTM_ORIGINAL"
           }
         ]
       }
     ]
   }
   ```

   我们可以看到它与图像处理有关。例如，香烟上的DotCode通常是黑底白码的，因此我们可以通过设置`GrayscaleTransformationModes`，首先处理反转颜色的图像。可以在[此页面](https://www.dynamsoft.com/barcode-reader/barcode-types/dotCode/)上了解有关Dynamsoft Barcode Reader如何处理DotCode的更多信息。

   代码：

   ```tsx
   const dotcodeTemplate = `JSON content`;
   router.initSettings(dotcodeTemplate);
   ```

## 使用DotCode扫描组件

更新`App.tsx`以使用DotCode扫描组件扫描DotCode并显示结果。

```tsx
import React, { useEffect } from 'react';
import {
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarcodeScanner } from './components/BarcodeScanner';
import { CameraEnhancer, DecodedBarcodesResult, LicenseManager } from 'dynamsoft-capture-vision-react-native';

function App(): React.JSX.Element {
  const [isScanning, setIsScanning] = React.useState(false);
  const [barcodeText, setBarcodeText] = React.useState('');
  useEffect(()=>{
    LicenseManager.initLicense('LICENSE-KEY')
    .then(()=>{/*Init license successfully.*/})
    .catch(error => console.error('Init License failed.', error));
    CameraEnhancer.requestCameraPermission();
  },[]);

  const toggleScanning = () => {
    setIsScanning(!isScanning);
  };

  const onScanned = (result:DecodedBarcodesResult) => {
    if (result.items && result.items.length > 0) {
      console.log(result.items[0].text);
      toggleScanning();
      setBarcodeText(result.items[0].text);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isScanning &&
      <>
        <BarcodeScanner
          onScanned={onScanned}
        />
        <View style={styles.controls}>
          <Button title="Stop Scanning" onPress={toggleScanning}/>
        </View>
      </>}
      {!isScanning &&
        <View style={styles.home}>
          <Text>DotCode Scanner</Text>
          <Button title="Start Scanning" onPress={toggleScanning}/>
          {barcodeText &&
            <Text>{'Result: ' + barcodeText}</Text>
          }
        </View>
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
  },
  home:{
    alignItems:'center',
  },
  controls:{
    position:'absolute',
    width:'100%',
    alignItems:'center',
    bottom:10,
  },
  button:{
    width: '50%',
  },
});

export default App;
```


## 源代码

获取源代码来自己试用一下吧：

<https://github.com/tony-xlh/react-native-dotcode-scanner>

