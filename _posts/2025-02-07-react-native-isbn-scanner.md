---
layout: post
title: "React Native扫描图书ISBN码"
date: 2025-02-07 11:21:53 +0800
categories: 条码扫描
tags: 
description: 文章讲述了如何构建一个React Native应用程序，使用Dynamsoft Barcode Reader扫描图书的ISBN条码并记录书籍信息。
---

国际标准书号(ISBN)是一种商业图书的数字标识符。我们可以在书的背面找到它。一个EAN-13格式的条码通常会被打印着，以供机器进行扫描。

在本文中，我们将构建一个React Native应用，使用[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)扫描ISBN并使用Google Book API获取图书信息。

演示视频：

<video src="https://github.com/user-attachments/assets/47e66955-db76-46cf-b93b-d7ec9f1f5f10" controls="controls" muted="muted" style="max-width: 100%;"></video>

## 创建新的React Native项目

使用特定版本创建新的React Native项目：

```bash
npx @react-native-community/cli init ISBNScanner --version 0.75.2
```

## 添加Dynamsoft Barcode Reader

安装Dynamsoft Capture Vision（内含Dynamsoft Barcode Reader）：

```bash
npm install dynamsoft-capture-vision-react-native
```


## 设置许可证

在`App.tsx`添加以下代码以在应用启动时设置许可证。可以在此处申请[许可证](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)。

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

## 编写ISBN扫描组件

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

4. 获取Capture Vision Router的实例，以调用Barcode Reader从视频流读取条形码。

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

       router.startCapturing(EnumPresetTemplate.PT_READ_SINGLE_BARCODE);

       return () => {
         //...
         router.removeResultReceiver(resultReceiver!);
       };
     }, [camera, router, cameraView, props]);
   }
   ```

5. 将条形码格式指定为EAN-13，避免错误地读取其它格式的条码。

   ```js
   let settings: SimplifiedCaptureVisionSettings = {
     barcodeSettings: {
       barcodeFormatIds:  EnumBarcodeFormat.BF_EAN_13,
     }
   };
   await router.updateSettings(settings,EnumPresetTemplate.PT_READ_SINGLE_BARCODE);
   ```

## 使用ISBN扫描组件

更新`App.tsx`以使用ISBN扫描组件扫描并显示结果。

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

## 通过Google Book API获取图书信息

我们可以更进一步，检索图书信息，如作者、标题、出版商和封面图片。

```jsx
const response = await fetch(
  'https://www.googleapis.com/books/v1/volumes?q=isbn:'+ISBN,
);
const json = await response.json();
const bookItem = json.items[0];
const title = bookItem.volumeInfo.title;
const publisher = bookItem.volumeInfo.publisher;
const authors = bookItem.volumeInfo.authors.join(",");
const imageLink = bookItem.volumeInfo.imageLinks.thumbnail;
```

## 源代码

获取源代码来自己试用一下吧：

<https://github.com/tony-xlh/react-native-isbn-scanner>

