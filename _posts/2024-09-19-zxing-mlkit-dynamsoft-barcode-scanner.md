---
layout: post
title: "条码扫描，使用ZXing、ML Kit和Dynamsoft"
date: 2024-09-19 09:42:53 +0800
categories: 条码扫描
tags: 
description: 本文讨论了如何使用ZXing、ML Kit和Dynamsoft barcode Reader编写一个React Native条码扫描应用，并对它们进行比较。
---

<style>
table img{
  height:150px;
}
</style>

条码被发明已经半个多世纪了，有各种类型的条码和读码库。一些库专注于一种条码格式，如libdmtx，而大多数库可以读取各种格式。在本文中，我们将实现一个使用以下三个库的移动条码扫描应用，以便对这些库进行比较：


* [ZXing](http://github.com/zxing/zxing/)：一个开源的库
* [ML Kit](https://developers.google.com/ml-kit/vision/barcode-scanning/android)：谷歌提供的免费的库
* [Dynamsoft Barcode Reader](http://www.dynamsoft.com/barcode-reader/overview/)：企业级的SDK

## 构建React Native条码扫描应用

构建应用程序的方法有很多。我们可以使用Java或Kotlin开发Android应用，使用Objective-C/Swift开发iOS应用。这里，我们使用React Native创建一个跨平台的应用。这些库的扫描效果用不同语言都是一样的。

### 新建项目

创建新项目：

```bash
npx @react-native-community/cli@latest init BarcodeScanner
```

### 添加摄像机权限

对于Android，在`android\app\src\main\AndroidManifest.xml`中添加以下内容。

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

对于iOS，将以下内容添加到`Info.plist`。

```xml
<key>NSCameraUsageDescription</key>
<string>For barcode scanning</string>
```

### 添加依赖项

1. 安装`react-native-vision-camera`用于访问摄像头。

   ```bash
   npm install react-native-vision-camera react-native-worklets-core
   ```

2. 安装`react-native-image-picker`以从相册选取图像。

   ```bash
   npm install react-native-image-picker
   ```

3. 安装zxing。

   ```bash
   npm install vision-camera-zxing
   ```

4. 安装ML Kit。

   ```bash
   npm install react-native-vision-camera-barcodes-scanner
   ```

5. 安装Dynamsoft Barcode Reader。

   ```bash
   npm install vision-camera-dynamsoft-barcode-reader
   ```

此外，在`babel.conf.js`中添加以下内容：

```diff
 module.exports = {
   presets: ['module:@react-native/babel-preset'],
+  plugins: [
+    'react-native-worklets-core/plugin',
+  ],
 };
```

### 用摄像头扫码

1. 在组件中，使用Vision Camera打开相机。

   ```tsx
   const BarcodeScanner: React.FC<props> = (props: props) => {
     const [hasPermission, setHasPermission] = React.useState(false);
     const [isActive, setIsActive] = React.useState(false);
     const device = useCameraDevice("back");
     const cameraFormat = useCameraFormat(device, [
       { videoResolution: { width: 1280, height: 720 } },
       { fps: 60 }
     ])
     React.useEffect(() => {
       (async () => {
         const status = await Camera.requestCameraPermission();
         setHasPermission(status === 'granted');
         setIsActive(true);
       })();
       }
     }, []);

     return (
       <>
         {device &&
         hasPermission && (
         <>
           <Camera
           style={StyleSheet.absoluteFill}
           device={device}
           isActive={isActive}
           format={cameraFormat}
           frameProcessor={frameProcessor}
           resizeMode='contain'
           />
         </>
       </>
     );
   }
   ```

2. 注册一个帧处理器，使用所选的条码读取引擎从视频帧中读取条码。

   ```tsx
   import { zxing, type Result } from 'vision-camera-zxing';
   import { useBarcodeScanner } from "react-native-vision-camera-barcodes-scanner";
   import { decode, TextResult } from 'vision-camera-dynamsoft-barcode-reader';

   const {scanBarcodes} = useBarcodeScanner();

   const frameProcessor = useFrameProcessor(frame => {
     'worklet'
     runAsync(frame, () => {
       'worklet'
       let results;
       if (engine.value === "ZXing") {
         results = zxing(frame,{multiple:true});
       }else if (engine.value === "Dynamsoft") {
         results = decode(frame,{rotateImage:false});
       }else{
         results = scanBarcodes(frame);
       }
       console.log(results);
     })
   }, [])
   ```

### 读取相册图像中的条码

1. 从相册选择一张图片。

   ```tsx
   let options: ImageLibraryOptions = {
     mediaType: 'photo',
     includeBase64: true,
   }
   let response = await launchImageLibrary(options);
   ```

2. 使用图像的base64或URI访问图像并读码。这里对结果做了统一转换，用相同的格式保存条码数据。

   ```tsx
   if (response && response.assets) {
     if (selectedEngine != "MLKit") {
       if (response.assets[0]!.base64) {
         if (selectedEngine === "Dynamsoft") {
           let textResults = await DBR.decodeBase64(response.assets[0]!.base64);
           let results = [];
           for (let index = 0; index < textResults.length; index++) {
             const tr = textResults[index];
             const points:Point[] = [];
             points.push({x:tr.x1,y:tr.y1});
             points.push({x:tr.x2,y:tr.y2});
             points.push({x:tr.x3,y:tr.y3});
             points.push({x:tr.x4,y:tr.y4});
             const result:Result = {
               barcodeText:tr.barcodeText,
               barcodeFormat:tr.barcodeFormat,
               barcodeBytesBase64:tr.barcodeBytesBase64,
               points:points
             }
             results.push(result);
           }
           setBarcodeResults(results);
         }else{
           let results = await decodeBase64(response.assets[0]!.base64,{multiple:true});
           setBarcodeResults(results);
         }
       }
     }else{
       if (response && response.assets[0] && response.assets[0].uri) {
         const uri = response.assets[0].uri as string;
         let results = [];
         const barcodes = await ImageScanner(uri);
         for (let index = 0; index < barcodes.length; index++) {
           const barcode = barcodes[index];
           const points:Point[] = [];
           points.push({x:barcode.left,y:barcode.top});
           points.push({x:barcode.right,y:barcode.top});
           points.push({x:barcode.right,y:barcode.bottom});
           points.push({x:barcode.left,y:barcode.bottom});
           const result:Result = {
             barcodeText:barcode.rawValue,
             barcodeFormat:"",
             barcodeBytesBase64:"",
             points:points
           }
           results.push(result);
         }
         setBarcodeResults(results);
       }
     }
   }
   ```

## 比较不同的库

demo完成后，我们可以进行比较。

### 条码格式

Dynamsoft支持最多的条码格式。

| ZXing | ML Kit | Dynamsoft |
|-------------|-------------|--------------------|
| UPC-A | UPC-A | UPC-A |
| UPC-E | UPC-E | UPC-E |
| EAN-8 | EAN-8 | EAN-8 |
| EAN-13 | EAN-13 | EAN-13 |
| Code 39 | Code 39 | Code 39 |
| Code 93 | Code 93 | Code 93 |
| ITF | ITF | ITF |
| Codabar | Codabar | Codabar |
| QR Code | QR Code | QR Code |
| Aztec | Aztec | Aztec |
| Data Matrix | Data Matrix | Data Matrix |
| PDF417 | PDF417 | PDF417 |
| Maxicode |             | Maxicode |
| RSS-14 |             | RSS-14 |
|             |             | Code 11 |
|             |             | Interleaved 2 of 5 |
|             |             | Industrial 2 of 5 |
|             |             | GS1 DataBar |
|             |             | GS1 Composite Code |
|             |             | DotCode |
|             |             | Pharmacode |
|             |             | Patch Code |

GS1组合码，只有Dynamsoft可以读取：

![gs1-composite-inverted](/album/2023/08/gs1/gs1-composite-inverted.png)

### 扫描角度

ZXing必须将条码与摄像头对齐才能扫描。

![zxing](/album/2024/09/zxing-mlkit-dynamsoft/zxing.jpg)

Dynamsoft和ML Kit可以从任何角度读取条码。Dynamsoft可以精确地返回条码的坐标。

Dynamsoft：

![dynamsoft](/album/2024/09/zxing-mlkit-dynamsoft/dynamsoft.jpg)

ML Kit：

![mlkit](/album/2024/09/zxing-mlkit-dynamsoft/mlkit.jpg)

### 条码详细信息

Dynamsoft可以返回有关条码的更多详细信息，如原始字节、码字、方向等。

### 恶劣条件下的图像

图像条件恶劣的码，Dynamsoft一般也可以处理。

| 类型 | 图像 | ZXing | ML Kit | Dynamsoft |
|------|-------------|-------------|-------------|--------------------|
| 反色的 | ![反转的](/album/2024/09/zxing-mlkit-dynamsoft/dataset/inverted.png) | × | √ | √ |
| 静区为零 | ![零安静区](/album/2024/09/zxing-mlkit-dynamsoft/dataset/zero-quietzone.jpg) | × | × | √ |
| 弯曲的 | ![弯曲的](/album/2024/09/zxing-mlkit-dynamsoft/dataset/curled.jpg) | × | × | √ |
| 损坏的 | ![损坏的](/album/2024/09/zxing-mlkit-dynamsoft/dataset/damaged.jpg) | × | √ | √ |


查看这篇[二维码读取性能比较](https://devblogs.damingsoft.com/qr-code-reading-benchmark-and-comparison/)的文章以浏览更多示例。

### 设置

ZXing、ML Kit和Dynamsoft都有能力设置要使用的条码格式，而Dynamssoft有更多的设置，如下所示：

1. 扫描区域。
2. 预期条码数。
3. 定位方法。
4. 二值化方法。
5. 超时。

查看[文档](https://www.dynamsoft.com/capture-vision/docs/core/parameters/file/task-settings/barcode-reader-task-settings.html?product=dbr)以了解更多信息。

### 企业支持

Dynamsoft是一个商业SDK。它有更好的支持，并提供定制服务，以确保您的业务取得成功。

## 源代码

查看demo的源代码并尝试使用：

<https://github.com/tony-xlh/react-native-zxing-mlkit-dynamsoft>


