---
layout: post
title: "基于Nuxt.js构建一个二维码扫描网页应用"
date: 2024-12-23 11:10:53 +0800
categories: 条码识别
tags: 
description: 文章讲述了如何使用Dynamsoft Barcode Reader和Nuxt.js构建一个扫描条码/二维码的网页应用。
---

Nuxt是一个免费的开源框架，可以直观和可扩展的方式使用Vue.js创建类型安全、高性能和生产级的全栈Web应用程序和网站。

在本文中，我们将使用Nuxt.js构建一个条码/二维码扫描网页应用。使用[Dynamsoft Camera Enhancer](https://www.dynamsoft.com/capture-vision/docs/core/introduction/?lang=javascript#dynamsoft-camera-enhancer)在浏览器中访问相机，[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)从相机视频帧中读取条形码。


## 新建项目

创建一个名为`barcode-scanner`的新的Nuxt项目：

```bash
npx nuxi@latest init barcode-scanner
```


## 安装依赖项

安装Dynamsoft Barcode Reader bundle。

```bash
npm install dynamsoft-barcode-reader-bundle
```

## 配置SDK

创建名为`dynamsoft.config.ts`的文件，文件内容如下，用于初始化许可证和资源。可以在[此处]((https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform))申请许可证。


```ts
import { CoreModule } from "dynamsoft-core";
import { LicenseManager } from "dynamsoft-license";
import "dynamsoft-barcode-reader";

let initialized = false;
export async function init(){
  if (initialized) {
    return;
  }
  // Configures the paths where the .wasm files and other necessary resources for modules are located.
  CoreModule.engineResourcePaths.rootDirectory = "https://cdn.jsdelivr.net/npm/";

  /** LICENSE ALERT - README
   * To use the library, you need to first specify a license key using the API "initLicense()" as shown below.
   */

  await LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==", {
    executeNow: true,
  });

  /**
   * You can visit https://www.dynamsoft.com/customer/license/trialLicense?utm_source=samples&product=dbr&package=js to get your own trial license good for 30 days.
   * Note that if you downloaded this sample from Dynamsoft while logged in, the above license key may already be your own 30-day trial license.
   * For more information, see https://www.dynamsoft.com/barcode-reader/docs/web/programming/javascript/user-guide/index.html?ver=10.4.2002&cVer=true#specify-the-license&utm_source=samples or contact support@dynamsoft.com.
   * LICENSE ALERT - THE END
   */

  // Optional. Preload "BarcodeReader" module for reading barcodes. It will save time on the initial decoding by skipping the module loading.
  await CoreModule.loadWasm(["DBR"]);
  initialized = true;
  return;
}
```

## 新建一个条码扫描Vue组件

接下来，在`src/components/BarcodeScanner.vue`路径下创建一个条形扫描组件，该组件可以打开相机并扫描相机视频帧中的条形码。

1. 组件的基本内容：

   ```html
   <script setup lang="ts">
   const cameraViewContainer: Ref<HTMLElement | null> = ref(null);
   </script>

   <template>
     <div ref="cameraViewContainer" id="cameraViewContainer"></div>
   </template>

   <style scoped>
   #cameraViewContainer {
     width: 100%;
     height: 100%;
     top: 0;
     left: 0;
     position: absolute;
   }
   </style>
   ```

   它有一个用作相机的容器的元素。

2. 在挂载组件后运行`dynamsoft.config.ts`中定义的init方法。

   ```ts
   onMounted(async () => {
     await init();
   });
   ```

3. 初始化Camera Enhancer并将其组件绑定到一个容器。

   ```ts
   const cameraViewContainer: Ref<HTMLElement | null> = ref(null);
   let cameraEnhancer: CameraEnhancer;
   let cameraView:CameraView;
   onMounted(async () => {
     try {
       await init();
       // Create a `CameraEnhancer` instance for camera control and a `CameraView` instance for UI control.
       cameraView = await CameraView.createInstance();
       cameraEnhancer = await CameraEnhancer.createInstance(cameraView);

       // Get default UI and append it to DOM.
       cameraViewContainer.value!.append(cameraView.getUIElement());
     } catch (ex: any) {
       let errMsg = ex.message || ex;
       console.error(errMsg);
     }
   });
   ```

4. 创建Capture Vision Router实例以处理相机帧来读取条形码。

   ```ts
   let cvRouter: CaptureVisionRouter;
   onMounted(async () => {
     try {
       //...
       cvRouter = await CaptureVisionRouter.createInstance();
       cvRouter.setInput(cameraEnhancer);
     } catch (ex: any) {
       let errMsg = ex.message || ex;
       console.error(errMsg);
     }
   });
   ```

5. 定义两个emit事件。一个是在获取到条码结果后触发，另一个是在初始化完成后触发。

   ```ts
   // define a 'scanned' event that the Scanner component emits when frames are scanned
   const emit = defineEmits<{
     (e: 'scanned', results: BarcodeResultItem[]): void
     (e: 'initialized'): void
   }>();
   ```

   1. 添加结果接收器以接收扫描到的条码结果并触发事件。

      ```ts
      // Define a callback for results.
      cvRouter.addResultReceiver({
        onDecodedBarcodesReceived: (result) => {
          emit("scanned",result.barcodeResultItems);
        }
      });
      ```

   2. 创建实例后，触发`initialized`事件。

      ```ts
      onMounted(async () => {
        try {
          //...
          emit("initialized");
        } catch (ex: any) {
          let errMsg = ex.message || ex;
          console.error(errMsg);
        }
      });
      ```

6. 暴露两个方法来控制组件的扫描状态。

   ```ts
   // expose start/stop to control pause/resume scanning
   const start = async () => await startScanning();
   const stop = () => stopScanning();

   defineExpose({ start, stop });

   const stopScanning = () => {
     cameraView?.setScanLaserVisible(false);
     cvRouter?.stopCapturing();
     cameraEnhancer.close();
   }

   const startScanning = async () => {
     await cameraEnhancer.open();
     cvRouter?.startCapturing("ReadSingleBarcode");
     cameraView?.setScanLaserVisible(true);
   }
   ```

7. 在卸载组件之前释放资源。

   ```jsx
   // dispose cvRouter when it's no longer needed
   onBeforeUnmount(async () => {
     try {
       cvRouter?.dispose();
       cameraEnhancer?.dispose();
     } catch (_) { }
   });
   ```

## 在应用中使用扫码组件

切换到`app.vue`。在应用中使用这个扫码组件。

1. 导入扫码组件并添加一个按钮来控制其扫描状态。由于SDK需要修改DOM ，我们需要用`ClientOnly`包裹扫码组件。

   ```html
   <template>
     <div id="app">
       <h2>Barcode Scanner in Nuxt.js</h2>
       <button v-if="initialized" @click="toggleScanning">{{ scanning ? "Stop Scanning":"Start Scanning" }}</button>
       <span v-if="!initialized">Initializing...</span>
       <div class="container" v-if="mounted">
         <ClientOnly fallback-tag="span" fallback="Loading barcode scanner...">
           <BarcodeScanner ref="scanner" @initialized="onInitialized" @scanned="onScanned"></BarcodeScanner>
         </ClientOnly>
       </div>
   </template>
   <script setup lang="ts">
   import type { BarcodeResultItem } from 'dynamsoft-barcode-reader-bundle';
   import BarcodeScanner from './components/BarcodeScanner.vue';
   const scanner = ref();
   const initialized = ref(false);
   const scanning = ref(false);
   const onInitialized = () => {
     initialized.value = true;
   }
   const toggleScanning = () => {
     if (scanner.value) {
       scanning.value = !scanning.value;
       if (scanning.value) {
         scanner.value.start();
       }else{
         scanner.value.stop();
       }
     }else{
       alert("Not mounted");
     }
   }
   </script>
   <style lang="css" scoped>
   .container {
     position: relative;
     width: 360px;
     height: 360px;
   }
   </style>
   ```

2. 显示扫描结果。

   ```html
   <template>
     <div>
       <div>
         Results:
       </div>
       <ol>
         <li v-for="(barcode,index) in scannedBarcodes" :key="'barcode-'+index">{{ barcode.formatString + ": " + barcode.text }}</li>
       </ol>
     </div>
   </template>
   <script setup lang="ts">
   const scannedBarcodes = ref<BarcodeResultItem[]>([]);
   const onScanned = (barcodes:BarcodeResultItem[]) => {
     if (barcodes.length>0) {
       scannedBarcodes.value = barcodes;
     }
   }
   </script>
   ```

好了，我们现在已经用Nuxt.js完成了这一条码/二维码扫描应用。可以访问[在线演示](https://nuxtjs-barcode-scanner.netlify.app/)进行试用。

## 源代码

<https://github.com/tony-xlh/NuxtJS-Barcode-Scanner>

