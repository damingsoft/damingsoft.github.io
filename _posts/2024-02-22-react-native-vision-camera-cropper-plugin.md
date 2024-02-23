---
layout: post
title: "如何编写一个React Native Vision Camera的插件用于裁剪视频帧"
date: 2024-02-22 14:14:53 +0800
categories: 相机
tags: 
description: 本文讨论了如何创建一个React Native Vision Camera的帧处理器插件来裁剪帧。帧可保存为base64或文件。
---

React Native Vision Camera 是一个React Native的相机库，可以用于构建具有各种图像处理功能的相机应用，比如[条码识别](https://www.dynamsoft.com/codepool/react-native-vision-camera-barcode-plugin-android.html)、[文档扫描](https://www.dynamsoft.com/codepool/react-native-vision-camera-document-normalizer-plugin.html)和[OCR](https://www.dynamsoft.com/codepool/react-native-vision-camera-label-recognition-plugin-android.html)等功能。

它有一个叫做帧处理器的功能。我们可以编写帧处理器插件，集成具有原生性能的图像处理功能。

在本文中，我们将演示如何创建一个Vision Camera的视频帧裁剪插件。该插件可以裁剪相机画面，并将结果转换为base64。

最终结果的演示视频：

<video src="https://github.com/tony-xlh/vision-camera-cropper/assets/5462205/81031752-4179-4439-a8c6-97f73587fd56" data-canonical-src="https://github.com/tony-xlh/vision-camera-cropper/assets/5462205/81031752-4179-4439-a8c6-97f73587fd56" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-height:640px; min-height: 200px; max-width: 100%;"></video>

## 新建项目

首先，创建一个native module项目。

```bash
npx create-react-native-library@latest VisionCameraCropper
```

这里，我们选择Java + Swift的语言组合。

## 添加依赖项

将`react-native-vision-camera`和`react-native-worklets-core`添加为`devDependencies`和`peerDependencies`：

```bash
yarn add react-native-vision-camera react-native-worklets-core --dev
yarn add react-native-vision-camera react-native-worklets-core --peer
```

将`react-native-vision-camera`和react-native-worklets-core`添加`为示例项目的`dependencies`：

```bash
yarn example add react-native-vision-camera react-native-worklets-core
```

对于Android ，在`android/build.gradle`中添加`react-native-vision-camera`作为依赖项：

```groovy
implementation project(path: ':react-native-vision-camera')
```

## 使用JavaScript定义插件

打开`src/index.ts`进行以下更改：

1. 初始化名为`crop`的帧处理器插件。

   ```ts
   const plugin = VisionCameraProxy.initFrameProcessorPlugin('crop');
   ```

2. 定义帧处理器的`crop`函数。

   ```ts
   /**
    * Crop
    */
   export function crop(frame: Frame,config?:CropConfig): CropResult {
     'worklet'
     if (plugin == null) throw new Error('Failed to load Frame Processor Plugin "crop"!')
     if (config) {
       let record:Record<string,any> = {};
       if (config.includeImageBase64 != undefined && config.includeImageBase64 != null) {
         record["includeImageBase64"] = config.includeImageBase64;
       }
       if (config.saveAsFile != undefined && config.saveAsFile != null) {
         record["saveAsFile"] = config.saveAsFile;
       }
       if (config.cropRegion) {
         let cropRegionRecord:Record<string,any> = {};
         cropRegionRecord["left"] = config.cropRegion.left;
         cropRegionRecord["top"] = config.cropRegion.top;
         cropRegionRecord["width"] = config.cropRegion.width;
         cropRegionRecord["height"] = config.cropRegion.height;
         record["cropRegion"] = cropRegionRecord;
       }
       return plugin.call(frame,record) as any;
     }else{
       return plugin.call(frame) as any;
     }
   }
   ```

   相关接口：

   ```ts
   //the value is in percentage
   export interface CropRegion{
     left: number;
     top: number;
     width: number;
     height: number;
   }

   export interface CropConfig{
     cropRegion?: CropRegion;
     includeImageBase64?: boolean;
     saveAsFile?: boolean;
   }

   export interface CropResult{
     base64?:string;
     path?:string;
   }
   ```

## Android端实现

1. 使用以下模板创建新的`CropperFrameProcessorPlugin.java`文件：

   ```java
   package com.visioncameracropper;
   import android.graphics.Bitmap;
   import android.util.Log;

   import androidx.annotation.NonNull;
   import androidx.annotation.Nullable;

   import com.mrousavy.camera.core.FrameInvalidError;
   import com.mrousavy.camera.frameprocessor.Frame;
   import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin;
   import com.mrousavy.camera.frameprocessor.VisionCameraProxy;

   import java.io.File;
   import java.util.ArrayList;
   import java.util.HashMap;
   import java.util.List;
   import java.util.Map;

   public class CropperFrameProcessorPlugin extends FrameProcessorPlugin {
     CropperFrameProcessorPlugin(@NonNull VisionCameraProxy proxy, @Nullable Map<String, Object> options) {super();}

     @Nullable
     @Override
     public Object callback(@NonNull Frame frame, @Nullable Map<String, Object> arguments) {
       Map<String, Object> result = new HashMap<String, Object>();
       return result;
     }
   }
   ```

2. 在`VisionCameraCropperPackage`中注册插件。

   ```java
   public class VisionCameraCropperPackage implements ReactPackage {
     static {
       FrameProcessorPluginRegistry.addFrameProcessorPlugin("crop", CropperFrameProcessorPlugin::new);
     }
   }
   ```

3. 创建一个`BitmapUtils`文件和一个`FrameMetadata`文件，用于将YUV格式的相机帧转换为RGB格式的位图和执行其它图像操作。

   `BitmapUtils.java`：

   ```java
   package com.visioncameracropper;

   import android.annotation.TargetApi;
   import android.graphics.Bitmap;
   import android.graphics.BitmapFactory;
   import android.graphics.ImageFormat;
   import android.graphics.Matrix;
   import android.graphics.Rect;
   import android.graphics.YuvImage;
   import android.media.Image;
   import android.media.Image.Plane;
   import android.os.Build.VERSION_CODES;
   import androidx.annotation.Nullable;

   import android.util.Base64;
   import android.util.Log;
   import androidx.annotation.RequiresApi;

   import com.mrousavy.camera.core.FrameInvalidError;
   import com.mrousavy.camera.frameprocessor.Frame;
   import com.mrousavy.camera.types.Orientation;

   import java.io.ByteArrayOutputStream;
   import java.io.File;
   import java.io.FileNotFoundException;
   import java.io.FileOutputStream;
   import java.io.IOException;
   import java.nio.ByteBuffer;

   /** Utils functions for bitmap conversions. */
   public class BitmapUtils {
       private static final String TAG = "BitmapUtils";

       /** Converts NV21 format byte buffer to bitmap. */
       @Nullable
       public static Bitmap getBitmap(ByteBuffer data, FrameMetadata metadata) {
           data.rewind();
           byte[] imageInBuffer = new byte[data.limit()];
           data.get(imageInBuffer, 0, imageInBuffer.length);
           try {
               YuvImage image =
                       new YuvImage(
                               imageInBuffer, ImageFormat.NV21, metadata.getWidth(), metadata.getHeight(), null);
               ByteArrayOutputStream stream = new ByteArrayOutputStream();
               image.compressToJpeg(new Rect(0, 0, metadata.getWidth(), metadata.getHeight()), 80, stream);

               Bitmap bmp = BitmapFactory.decodeByteArray(stream.toByteArray(), 0, stream.size());

               stream.close();
               return rotateBitmap(bmp, metadata.getRotation(), false, false);
           } catch (Exception e) {
               Log.e("VisionProcessorBase", "Error: " + e.getMessage());
           }
           return null;
       }

       /** Converts a YUV_420_888 image from Vision Camera API to a bitmap. */
       public static Bitmap getBitmap(Frame image) throws FrameInvalidError {
           FrameMetadata frameMetadata =
                   new FrameMetadata.Builder()
                           .setWidth(image.getWidth())
                           .setHeight(image.getHeight())
                           .setRotation(getRotationDegreeFromOrientation(image.getOrientation()))
                           .build();

           ByteBuffer nv21Buffer =
                   yuv420ThreePlanesToNV21(image.getImage().getPlanes(), image.getWidth(), image.getHeight());
           return getBitmap(nv21Buffer, frameMetadata);
       }

       public static int getRotationDegreeFromOrientation(Orientation orientation) {
           if (orientation.getUnionValue().equals(Orientation.PORTRAIT.getUnionValue())) {
               return 90;
           }else if (orientation.getUnionValue().equals(Orientation.LANDSCAPE_LEFT.getUnionValue())) {
               return 0;
           } else if (orientation.getUnionValue().equals(Orientation.LANDSCAPE_RIGHT.getUnionValue())) {
               return 270;
           }else if (orientation.getUnionValue().equals(Orientation.PORTRAIT_UPSIDE_DOWN.getUnionValue())) {
               return 180;
           }
           return 0;
       }

       /** Rotates a bitmap if it is converted from a bytebuffer. */
       private static Bitmap rotateBitmap(
               Bitmap bitmap, int rotationDegrees, boolean flipX, boolean flipY) {
           Matrix matrix = new Matrix();

           // Rotate the image back to straight.
           matrix.postRotate(rotationDegrees);

           // Mirror the image along the X or Y axis.
           matrix.postScale(flipX ? -1.0f : 1.0f, flipY ? -1.0f : 1.0f);
           Bitmap rotatedBitmap =
                   Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);

           // Recycle the old bitmap if it has changed.
           if (rotatedBitmap != bitmap) {
               bitmap.recycle();
           }
           return rotatedBitmap;
       }

       /**
        * Converts YUV_420_888 to NV21 bytebuffer.
        *
        * <p>The NV21 format consists of a single byte array containing the Y, U and V values. For an
        * image of size S, the first S positions of the array contain all the Y values. The remaining
        * positions contain interleaved V and U values. U and V are subsampled by a factor of 2 in both
        * dimensions, so there are S/4 U values and S/4 V values. In summary, the NV21 array will contain
        * S Y values followed by S/4 VU values: YYYYYYYYYYYYYY(...)YVUVUVUVU(...)VU
        *
        * <p>YUV_420_888 is a generic format that can describe any YUV image where U and V are subsampled
        * by a factor of 2 in both dimensions. {@link Image#getPlanes} returns an array with the Y, U and
        * V planes. The Y plane is guaranteed not to be interleaved, so we can just copy its values into
        * the first part of the NV21 array. The U and V planes may already have the representation in the
        * NV21 format. This happens if the planes share the same buffer, the V buffer is one position
        * before the U buffer and the planes have a pixelStride of 2. If this is case, we can just copy
        * them to the NV21 array.
        */
       @RequiresApi(VERSION_CODES.KITKAT)
       private static ByteBuffer yuv420ThreePlanesToNV21(
               Plane[] yuv420888planes, int width, int height) {
           int imageSize = width * height;
           byte[] out = new byte[imageSize + 2 * (imageSize / 4)];

           if (areUVPlanesNV21(yuv420888planes, width, height)) {
               // Copy the Y values.
               yuv420888planes[0].getBuffer().get(out, 0, imageSize);

               ByteBuffer uBuffer = yuv420888planes[1].getBuffer();
               ByteBuffer vBuffer = yuv420888planes[2].getBuffer();
               // Get the first V value from the V buffer, since the U buffer does not contain it.
               vBuffer.get(out, imageSize, 1);
               // Copy the first U value and the remaining VU values from the U buffer.
               uBuffer.get(out, imageSize + 1, 2 * imageSize / 4 - 1);
           } else {
               // Fallback to copying the UV values one by one, which is slower but also works.
               // Unpack Y.
               unpackPlane(yuv420888planes[0], width, height, out, 0, 1);
               // Unpack U.
               unpackPlane(yuv420888planes[1], width, height, out, imageSize + 1, 2);
               // Unpack V.
               unpackPlane(yuv420888planes[2], width, height, out, imageSize, 2);
           }

           return ByteBuffer.wrap(out);
       }

       /** Checks if the UV plane buffers of a YUV_420_888 image are in the NV21 format. */
       @RequiresApi(VERSION_CODES.KITKAT)
       private static boolean areUVPlanesNV21(Plane[] planes, int width, int height) {
           int imageSize = width * height;

           ByteBuffer uBuffer = planes[1].getBuffer();
           ByteBuffer vBuffer = planes[2].getBuffer();

           // Backup buffer properties.
           int vBufferPosition = vBuffer.position();
           int uBufferLimit = uBuffer.limit();

           // Advance the V buffer by 1 byte, since the U buffer will not contain the first V value.
           vBuffer.position(vBufferPosition + 1);
           // Chop off the last byte of the U buffer, since the V buffer will not contain the last U value.
           uBuffer.limit(uBufferLimit - 1);

           // Check that the buffers are equal and have the expected number of elements.
           boolean areNV21 =
                   (vBuffer.remaining() == (2 * imageSize / 4 - 2)) && (vBuffer.compareTo(uBuffer) == 0);

           // Restore buffers to their initial state.
           vBuffer.position(vBufferPosition);
           uBuffer.limit(uBufferLimit);

           return areNV21;
       }

       /**
        * Unpack an image plane into a byte array.
        *
        * <p>The input plane data will be copied in 'out', starting at 'offset' and every pixel will be
        * spaced by 'pixelStride'. Note that there is no row padding on the output.
        */
       @TargetApi(VERSION_CODES.KITKAT)
       private static void unpackPlane(
               Plane plane, int width, int height, byte[] out, int offset, int pixelStride) {
           ByteBuffer buffer = plane.getBuffer();
           buffer.rewind();

           // Compute the size of the current plane.
           // We assume that it has the aspect ratio as the original image.
           int numRow = (buffer.limit() + plane.getRowStride() - 1) / plane.getRowStride();
           if (numRow == 0) {
               return;
           }
           int scaleFactor = height / numRow;
           int numCol = width / scaleFactor;

           // Extract the data in the output buffer.
           int outputPos = offset;
           int rowStart = 0;
           for (int row = 0; row < numRow; row++) {
               int inputPos = rowStart;
               for (int col = 0; col < numCol; col++) {
                   out[outputPos] = buffer.get(inputPos);
                   outputPos += pixelStride;
                   inputPos += plane.getPixelStride();
               }
               rowStart += plane.getRowStride();
           }
       }

       public static Bitmap base642Bitmap(String base64) {
           byte[] decode = Base64.decode(base64,Base64.DEFAULT);
           return BitmapFactory.decodeByteArray(decode,0,decode.length);
       }

       public static String bitmap2Base64(Bitmap bitmap) {
           ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
           bitmap.compress(Bitmap.CompressFormat.JPEG, 100, outputStream);
           return Base64.encodeToString(outputStream.toByteArray(), Base64.DEFAULT);
       }

       public static String saveImage(Bitmap bmp, File dir, String fileName) {
           File file = new File(dir, fileName);
           try {
               FileOutputStream fos = new FileOutputStream(file);
               bmp.compress(Bitmap.CompressFormat.JPEG, 100, fos);
               fos.flush();
               fos.close();
               return file.getAbsolutePath();
           } catch (FileNotFoundException e) {
               e.printStackTrace();
           } catch (IOException e) {
               e.printStackTrace();
           }
           return "";
       }
   }
   ```

   `FrameMetadata.java`：

   ```java
   package com.visioncameracropper;

   public class FrameMetadata {

       private final int width;
       private final int height;
       private final int rotation;

       public int getWidth() {
           return width;
       }

       public int getHeight() {
           return height;
       }

       public int getRotation() {
           return rotation;
       }

       private FrameMetadata(int width, int height, int rotation) {
           this.width = width;
           this.height = height;
           this.rotation = rotation;
       }

       /** Builder of {@link FrameMetadata}. */
       public static class Builder {

           private int width;
           private int height;
           private int rotation;

           public Builder setWidth(int width) {
               this.width = width;
               return this;
           }

           public Builder setHeight(int height) {
               this.height = height;
               return this;
           }

           public Builder setRotation(int rotation) {
               this.rotation = rotation;
               return this;
           }

           public FrameMetadata build() {
               return new FrameMetadata(width, height, rotation);
           }
       }
   }
   ```

4. 在插件文件中，将帧转换为位图，然后根据参数进行裁剪和保存。

   ```java
   try {
     //Log.d("DYM",frame.getWidth()+"x"+frame.getHeight());
     Bitmap bm = BitmapUtils.getBitmap(frame);
     if (arguments != null && arguments.containsKey("cropRegion")) {
       Map<String,Object> cropRegion = (Map<String, Object>) arguments.get("cropRegion");
       double left = ((double) cropRegion.get("left")) / 100.0 * bm.getWidth();
       double top = ((double) cropRegion.get("top")) / 100.0 * bm.getHeight();
       double width = ((double) cropRegion.get("width")) / 100.0 * bm.getWidth();
       double height = ((double) cropRegion.get("height")) / 100.0 * bm.getHeight();
       bm = Bitmap.createBitmap(bm, (int) left, (int) top, (int) width, (int) height, null, false);
     }

     if (arguments != null && arguments.containsKey("includeImageBase64")) {
       boolean includeImageBase64 = (boolean) arguments.get("includeImageBase64");
       if (includeImageBase64 == true) {
         result.put("base64",BitmapUtils.bitmap2Base64(bm));
       }
     }

     if (arguments != null && arguments.containsKey("saveAsFile")) {
       boolean saveAsFile = (boolean) arguments.get("saveAsFile");
       if (saveAsFile == true) {
         File cacheDir = VisionCameraCropperModule.getContext().getCacheDir();
         String fileName = System.currentTimeMillis() + ".jpg";
         String path = BitmapUtils.saveImage(bm,cacheDir,fileName);
         result.put("path",path);
       }
     }
   } catch (FrameInvalidError e) {
     throw new RuntimeException(e);
   }
   ```

## iOS端实现

1. 将`vision-camera-cropper.podspec`重命名为`VisionCameraCropper.podspec`，并在其内容中将名称更新为`VisionCameraCropper`。

2. 将`VisionCameraCropper.mm`重命名为`VisionCameraCropper.m`，并使用Xcode创建新的`VisionCameraCropper.h`文件。

3. 在`VisionCameraCropper-Bridging-Header.h`中包含 Vision Camera的头文件。

   ```objc
   #import <VisionCamera/FrameProcessorPlugin.h>
   #import <VisionCamera/FrameProcessorPluginRegistry.h>
   #import <VisionCamera/Frame.h>
   ```

4. 使用以下模板创建一个新的`CropperFrameProcessorPlugin.swift`文件：

   ```swift
   import Foundation

   @objc(CropperFrameProcessorPlugin)
   public class CropperFrameProcessorPlugin: FrameProcessorPlugin {
     public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable : Any]! = [:]) {
       super.init(proxy: proxy, options: options)
     }

     public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable : Any]?) -> Any {
       var cropResult: [String:Any] = [:]
       return cropResult
     }
   }
   ```

5. 创建`CropperFrameProcessorPlugin.m`以注册插件。

   ```objc
   #import <Foundation/Foundation.h>
   #import <VisionCamera/FrameProcessorPlugin.h>
   #import <VisionCamera/FrameProcessorPluginRegistry.h>
   #import <VisionCamera/Frame.h>
   #import "VisionCameraCropper-Swift.h"
   #import "VisionCameraCropper-Bridging-Header.h"

   @interface CropperFrameProcessorPlugin (FrameProcessorPluginLoader)
   @end

   @implementation CropperFrameProcessorPlugin (FrameProcessorPluginLoader)

   + (void)load
   {
       [FrameProcessorPluginRegistry addFrameProcessorPlugin:@"crop"
                                           withInitializer:^FrameProcessorPlugin* (VisionCameraProxyHolder* proxy, NSDictionary* options) {
           return [[CropperFrameProcessorPlugin alloc] initWithProxy:proxy withOptions:options];
       }];
   }

   @end
   ```

6. 在插件文件中，将帧转换为UIImage，然后根据参数进行裁剪和保存。

   ```swift
   public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable : Any]?) -> Any {
     let buffer = frame.buffer
     var cropResult: [String:Any] = [:]
     guard let imageBuffer = CMSampleBufferGetImageBuffer(frame.buffer) else {
       print("Failed to get CVPixelBuffer!")
       return cropResult
     }
     let ciImage = CIImage(cvPixelBuffer: imageBuffer)

     guard let cgImage = CIContext().createCGImage(ciImage, from: ciImage.extent) else {
         print("Failed to create CGImage!")
         return cropResult
     }

     let image:UIImage;
     let cropRegion = arguments?["cropRegion"] as? [String: Int]
     if cropRegion != nil {
       let imgWidth = Double(cgImage.width)
       let imgHeight = Double(cgImage.height)
       let left:Double = Double(cropRegion?["left"] ?? 0) / 100.0 * imgWidth
       let top:Double = Double(cropRegion?["top"] ?? 0) / 100.0 * imgHeight
       let width:Double = Double(cropRegion?["width"] ?? 100) / 100.0 * imgWidth
       let height:Double = Double(cropRegion?["height"] ?? 100) / 100.0 * imgHeight

       // The cropRect is the rect of the image to keep,
       // in this case centered
       let cropRect = CGRect(
           x: left,
           y: top,
           width: width,
           height: height
       ).integral

       let cropped = cgImage.cropping(
           to: cropRect
       )!
       image = UIImage(cgImage: cropped)
       print("use cropped image")
     }else{
       image = UIImage(cgImage: cgImage)
     }
     let includeImageBase64 = arguments!["includeImageBase64"] as? Bool ?? false
     if includeImageBase64 == true {
         cropResult["base64"] = getBase64FromImage(image)
     }
     let saveAsFile = arguments!["saveAsFile"] as? Bool ?? false
     if saveAsFile == true {
       cropResult["path"] = saveImage(image)
     }
     return cropResult
   }

   func saveImage(_ image:UIImage) -> String {
     let url = FileManager.default.temporaryDirectory
                             .appendingPathComponent(UUID().uuidString)
                             .appendingPathExtension("jpeg")
     try? image.jpegData(compressionQuality: 1.0)?.write(to: url)
     return url.path
   }

   func getBase64FromImage(_ image:UIImage) -> String {
     let dataTmp = image.jpegData(compressionQuality: 100)
     if let data = dataTmp {
         return data.base64EncodedString()
     }
     return ""
   }
   ```

好了，插件已经编写好了。

## 更新示例项目以使用插件

我们可以使用示例项目来测试插件。

1. 声明相机权限。

   将以下内容添加到`example\android\app\src\main\AndroidManifest.xml` ：

   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   ```

   将以下内容添加到`example\ios\VisionCameraCropperExample\Info.plist` ：

   ```xml
   <key>NSCameraUsageDescription</key>
   <string>For image cropping</string>
   ```

2. 更新`App.tsx`以使用Vision Camera和帧处理器。

   ```tsx
   import * as React from 'react';
   import { useEffect, useState } from 'react';
   import { StyleSheet, SafeAreaView, Platform, Dimensions, Pressable, View, Modal, Text } from 'react-native';
   import { Camera, useCameraDevice, useCameraFormat, useFrameProcessor } from 'react-native-vision-camera';
   import { type CropRegion, crop } from 'vision-camera-cropper';


   export default function App() {
     const [hasPermission, setHasPermission] = useState(false);
     const [isActive,setIsActive] = useState(true);
     const device = useCameraDevice("back");
     const format = useCameraFormat(device, [
       { videoResolution: { width: 1920, height: 1080 } },
       { fps: 30 }
     ])

     const frameProcessor = useFrameProcessor((frame) => {
       'worklet'
       const cropRegion = {
         left:10,
         top:10,
         width:80,
         height:30
       }
       const result = crop(frame,{cropRegion:cropRegion,includeImageBase64:true});
       console.log(result);
     }, [])

     useEffect(() => {
       (async () => {
         const status = await Camera.requestCameraPermission();
         setHasPermission(status === 'granted');
         setIsActive(true);
       })();
     }, []);

     return (
       <SafeAreaView style={styles.container}>
         {device != null &&
         hasPermission && (
         <>
           <Camera
             style={StyleSheet.absoluteFill}
             isActive={isActive}
             device={device}
             format={format}
             frameProcessor={frameProcessor}
             pixelFormat='yuv'
           />
         </>)}
       </SafeAreaView>
     );
   }


   const styles = StyleSheet.create({
     container: {
       flex: 1,
       alignItems: 'center',
       justifyContent: 'center',
     },
   });
   ```

然后，我们可以通过以下命令运行示例项目以测试插件：

```bash
yarn example run-android
yarn example run-ios
```

## 源代码

下载源代码并尝试使用：<https://github.com/tony-xlh/vision-camera-cropper>


