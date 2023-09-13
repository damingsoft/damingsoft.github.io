---
layout: post
title: 如何在uni-app中集成Dynamsoft Barcode Reader进行扫码
date: 2023-09-13 10:07:53 +0800
categories: 条码扫描
tags:
---

uni-app是一个使用Vue.js开发前端应用的框架，编写的应用可以在Android、iOS、Web以及各种小程序上运行。

Dynamsoft Barcode Reader是使用C++编写的[高性能](https://devblogs.damingsoft.com/qr-code-reading-benchmark-and-comparison/)二维码/条码扫描SDK，可以在Android、iOS和Web等各种平台运行。

下面我们会讨论如何在uni-app中集成Dynamsoft Barcode Reader来进行扫码。

针对不同平台，在uni-app里集成Dynamsoft Barcode Reader有多种方式。

* Web：可以直接使用Dynamsoft Barcode Reader的JavaScript版
* 原生应用：编写原生语言插件或者UTS插件使用Dynamsoft Barcode Reader的Android版和iOS版，或者在WebView中使用JavaScript版
* 小程序：在支持getUserMedia和WebAssembly的WebView中运行Dynamsoft Barcode Reader的JavaScript版或者在服务器运行Dynamsoft Barcode Reader，提供API进行解码

对于原生应用和小程序，本文使用WebView来集成Dynamsoft Barcode Reader。

[在线demo](https://delightful-lolly-ba2415.netlify.app/)

## 集成到Web

### 安装依赖

新建一个uni-app后，我们需要初始化npm项目以导入第三方库：

```bash
npm init -y
```

之后安装Dynamsoft Barcode Reader。

```bash
npm install dynamsoft-javascript-barcode
```

### 建立一个二维码扫码组件

1. 新建一个components目录，在里面建立一个新的组件，命名为`QRCodeScannerWeb.vue`。

2. 在template中添加扫描界面，包含相机视频容器、相机选择器、分辨率选择器等元素。

   ```html
   <div ref="elRefs" class="component-barcode-scanner">
     <svg class="dce-bg-loading" viewBox="0 0 1792 1792">
       <path
         d="M1760 896q0 176-68.5 336t-184 275.5-275.5 184-336 68.5-336-68.5-275.5-184-184-275.5-68.5-336q0-213 97-398.5t265-305.5 374-151v228q-221 45-366.5 221t-145.5 406q0 130 51 248.5t136.5 204 204 136.5 248.5 51 248.5-51 204-136.5 136.5-204 51-248.5q0-230-145.5-406t-366.5-221v-228q206 31 374 151t265 305.5 97 398.5z"></path>
     </svg>
     <svg class="dce-bg-camera" viewBox="0 0 2048 1792">
       <path
         d="M1024 672q119 0 203.5 84.5t84.5 203.5-84.5 203.5-203.5 84.5-203.5-84.5-84.5-203.5 84.5-203.5 203.5-84.5zm704-416q106 0 181 75t75 181v896q0 106-75 181t-181 75h-1408q-106 0-181-75t-75-181v-896q0-106 75-181t181-75h224l51-136q19-49 69.5-84.5t103.5-35.5h512q53 0 103.5 35.5t69.5 84.5l51 136h224zm-704 1152q185 0 316.5-131.5t131.5-316.5-131.5-316.5-316.5-131.5-316.5 131.5-131.5 316.5 131.5 316.5 316.5 131.5z">
       </path>
     </svg>
     <div class="dce-video-container"></div>
     <div class="dce-scanarea">
       <div class="dce-scanlight"></div>
     </div>
     <div class="div-select-container">
       <select class="dce-sel-camera"></select>
       <select class="dce-sel-resolution"></select>
     </div>
   </div>
   ```

3. 在`onMounted`生命周期中，初始化Dynamsoft Barcode Reader并开启相机进行扫码。如果完成一帧的处理，就触发`scanned`的事件，把扫码结果传递给父组件。这里定义了一个`license`属性用于激活Dynamsoft Barcode Reader。可以访问[这里](https://www.dynamsoft.com/customer/license/trialLicense?product=dbr)申请一个license。

   ```js
   props: ['license'],
   setup(props,context){
     const pScanner = ref(null);
     const elRefs = ref(null);
     onMounted(async () => {
       try {
         if (BarcodeScanner.isWasmLoaded() === false) {
           BarcodeScanner.license = props.license ?? "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
           BarcodeScanner.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.21/dist/";
         }
         const scanner = await (pScanner.value = BarcodeScanner.createInstance());
         await scanner.setUIElement(elRefs.value);
         scanner.onFrameRead = (results) => {
           for (let result of results) {
             console.log(result.barcodeText);
           }
           context.emit("scanned", results);
         };
         await scanner.open();
       } catch (ex) {
         let errMsg = ex.message||ex;
         if (errMsg.includes("network connection error")) {
           errMsg = "Failed to connect to Dynamsoft License Server: network connection error. Check your Internet connection or contact Dynamsoft Support (support@dynamsoft.com) to acquire an offline license.";
         }
         alert(errMsg);
       }
     });
     onBeforeUnmount(async () => {
       if (pScanner.value) {
         (await pScanner.value).destroyContext();
         console.log('BarcodeScanner Component Unmount');
       }
     });
     return {
       elRefs
     }
   }
   ```
   
4. 组件卸载时，销毁Dynamsoft Barcode Reader。

   ```js
   onBeforeUnmount(async () => {
     if (pScanner.value) {
       (await pScanner.value).destroyContext();
       console.log('BarcodeScanner Component Unmount');
     }
   });
   ```
   
5. 在`index.vue`中，使用这个扫码组件，扫到码后关闭扫描界面并显示结果。

   ```html
   <template>
     <view class="content">
       <button @click="startScan">Start Scanning</button>
       <view class="fullscreen" v-if="scanning">
         <QRCodeScannerWeb @scanned="scanned" license="DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="></QRCodeScannerWeb>
       </view>
       <view v-for="(result,index) in barcodeResults">
         <view>{{ (index+1) + ". " + result.barcodeFormatString + ": " + result.barcodeText }}</view>
       </view>
     </view>
   </template>

   <script>
     import QRCodeScannerWeb from "../../components/QRCodeScannerWeb.vue";
     import { ref } from "vue";
     export default {
       components: {
         QRCodeScannerWeb
       },
       setup(){
         const scanning = ref(false);
         const barcodeResults = ref([]);
         const startScan = () => {
           scanning.value = true;
         }
         const scanned = (results) => {
           if (results.length>0) {
             barcodeResults.value = results;
             scanning.value = false;
           }
         }
         return {
           startScan,
           scanned,
           barcodeResults,
           scanning
         }
       },
       data() {
         return {
         }
       },
       onLoad() {

       },
       methods: {

       }
     }
   </script>

   <style>
     .content {
       display: flex;
       flex-direction: column;
       align-items: center;
       justify-content: center;
     }

     .fullscreen {
       position: absolute;
       top: 0;
       left: 0;
       width: 100%;
       height: 100%;
     }
   </style>
   ```

## 集成到原生应用

我们需要编写一个网页应用，在WebView中运行，通过`postMessage`接口和WebView通讯，传递扫描结果。

### 编写一个网页扫码应用

1. 新建一个html文件。

   ```html
   <!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="UTF-8">
       <meta
         name="viewport"
         content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
       />
       <title>QR Code Scanner in uniapp</title>
       <style>
       </style>
     </head>
     <body>
       </script>
     </body>
   </html>
   ```

2. 在head中包含Dynamsoft Barcode Reader和Dynamsoft Camera Enhancer的库。

   ```js
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@3.3.4/dist/dce.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.20/dist/dbr.js"></script>
   ```
   
3. 添加一个触发扫描的按钮、扫描界面的容器和一个状态条。

   ```html
   <div class="app">
     <div class="controls">
       <button class="scanButton" onclick="startScan();">Scan From Camera</button>
     </div>
     <div class="status"></div>
   </div>
   <div class="scanner">
   </div>
   ```

4. 在页面加载后，如果按下了扫描的按钮或者`startScan`的URL参数为`true`，用Dynamsoft Camera Enhancer打开相机，之后用Dynamsoft Barcode Reader处理视频帧解码。

   ```js
   let enhancer;
   let reader;
   let interval;
   let processing = false;
   let hasCamera = true;
   init();
   async function init(){
     hideControls();
     updateStatus("Initializing...");
     try {
       await requestCameraPermission();
     }catch (e) {
       console.log(e);
       hasCamera = false;
       document.getElementsByClassName("scanButton")[0].style.display = "none";
       alert("No camera detected.");
     }
     
     if (getUrlParam("startScan") !== "true") {
       revealControls();
     }
     
     if (getUrlParam("license")) {
       Dynamsoft.DBR.BarcodeScanner.license = getUrlParam("license");
     }else{
       Dynamsoft.DBR.BarcodeScanner.license = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=='; // one-day trial
     }
     
     reader = await Dynamsoft.DBR.BarcodeScanner.createInstance();
     
     if (hasCamera) {
       enhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance();
       enhancer.on("played", (playCallbackInfo) => {
         console.log("camera started");
         startProcessingLoop();
       });
       enhancer.on("cameraClose", playCallBackInfo => {
         stopScan();
       });
       await enhancer.setUIElement(Dynamsoft.DCE.CameraEnhancer.defaultUIElementURL);
       let container = document.getElementsByClassName("scanner")[0];
       container.appendChild(enhancer.getUIElement());
       if (getUrlParam("startScan") === "true") {
         startScan();
       }
       updateStyleForiOS();
     }
     updateStatus("");
   }

   function updateStyleForiOS(){
     document.getElementsByClassName("dce-sel-camera")[0].parentElement.style = "position: absolute;left: 0;top: 0;top: env(safe-area-inset-top);";
     document.getElementsByClassName("dce-btn-close")[0].style = "position: absolute;right: 0;top: 0;top: env(safe-area-inset-top);";
   }

   function hideControls(){
     document.getElementsByClassName("controls")[0].style.display = "none";
   }

   function revealControls(){
     document.getElementsByClassName("controls")[0].style.display = "";
   }

   function startProcessingLoop(isBarcode){
     stopProcessingLoop();
     interval = setInterval(captureAndDecode,100); // read barcodes
   }

   function stopProcessingLoop(){
     if (interval) {
       clearInterval(interval);
       interval = undefined;
     }
     processing = false;
   }

   async function captureAndDecode() {
     if (!enhancer || !reader) {
       return
     }
     if (enhancer.isOpen() === false) {
       return;
     }
     if (processing == true) {
       return;
     }
     processing = true; // set processing to true so that the next frame will be skipped if the processing has not completed.
     let frame = enhancer.getFrame();
     if (frame) {  
       let results = await reader.decode(frame);
       if (results.length > 0) {
         updateStatus("Found "+results.length+((results.length>1)?" results":" result"));
         stopScan();
       }
       processing = false;
     }
   };

   function startScan(){
     if (!enhancer || !reader) {
       alert("Please wait for the initialization of Dynamsoft Barcode Reader");
       return;
     }
     document.getElementsByClassName("scanner")[0].classList.add("active");
     enhancer.open(true); //start the camera
   }
     
   function stopScan(){
     stopProcessingLoop();
     enhancer.close(true);
     document.getElementsByClassName("scanner")[0].classList.remove("active");
     revealControls();
   }

   function updateStatus(info){
     document.getElementsByClassName("status")[0].innerText = info;
   }

   async function requestCameraPermission() {
     const constraints = {video: true, audio: false};
     const stream = await navigator.mediaDevices.getUserMedia(constraints);
     const tracks = stream.getTracks();
     for (let i=0;i<tracks.length;i++) {
       const track = tracks[i];
       track.stop();  // stop the opened camera
     }
   }

   function getUrlParam(name) {
     var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
     var r = window.location.search.substr(1).match(reg);
     if (r != null) return unescape(r[2]); return null;
   }
   ```
   
下面我们还需要把扫码结果返回给WebView。

1. 引入uni-app的webview js库。

   ```html
   <script type="text/javascript" src="https://js.cdn.aliyun.dcloud.net.cn/dev/uni-app/uni.webview.1.5.2.js"></script>

   <script>
     document.addEventListener('UniAppJSBridgeReady', function() {
       uni.webView.getEnv(function(res) {
         console.log('当前环境：' + JSON.stringify(res));
       });
       // uni.webView.navigateTo(...)
     });
   </script>
   ```
   
2. 扫到码后，就发送结果给应用。

   ```js
   async function captureAndDecode() {
     //...
       if (frame) {  
         let results = await reader.decode(frame);
         if (results.length > 0) {
           updateStatus("Found "+results.length+((results.length>1)?" results":" result"));
           stopScan();
           sendBarcodeResults(results);
         }
         processing = false;
       }
     //...
   }
   
   function sendBarcodeResults(results){
     const message = {
       data: {
         action: 'scanned',
         results: JSON.stringify(results)
       }
     }
     if (window.uni) {
       window.uni.postMessage(message);
     }
   }
   ```

### 新建一个基于WebView的扫码组件

1. 建立一个新的组件，命名为`QRCodeScannerWebView.vue`。

2. 组件挂载时，安卓端需要申请相机权限。

   ```js
   setup(props,context) {
     const hasPermission = ref(false);
     const requestCameraPermission = () => {
       let platform=uni.getSystemInfoSync().platform
       if(platform === 'ios'){
         hasPermission.value = true;
       }else if(platform=='android'){
         plus.android.requestPermissions(['android.permission.CAMERA'], function(e){
           if(e.deniedAlways.length>0){
             console.log(e.deniedAlways.toString());  
           }  
           if(e.deniedPresent.length>0){
             console.log(e.deniedPresent.toString());  
           }  
           if(e.granted.length>0){
             hasPermission.value = true;
           }  
         }, function(e){  
            console.log('Request Permissions error:'+JSON.stringify(e));  
         });  
       }
     }
     onMounted(()=>{
       //#ifdef APP
       requestCameraPermission();
       //#endif
     })
   }
   ```
   
3. 在template中添加WebView，URL指向上一步的网页应用。

   ```html
   <template>
     <view>
       <web-view v-if="hasPermission" @message="handlePostMessage" cache="true" src="https://tony-xlh.github.io/Vanilla-JS-Barcode-Reader-Demos/uniapp?startScan=true"></web-view>
     </view>
   </template>
   ```

4. 处理网页发来的消息，如果有扫码结果就触发`scanned`事件。

   ```
   const handlePostMessage = (e) => {
     if (e.detail.data && e.detail.data.length>0) {
       if (e.detail.data[0].results) {
         context.emit("scanned", JSON.parse(e.detail.data[0].results));
       }
     }
   }
   ```

### 在页面中使用扫码组件

使用条件编译，如果是Web端就用Web版的扫码组件，如果是应用端就用基于WebView的扫码组件。

```html
<view class="fullscreen" v-if="scanning">
  <!--  #ifdef H5 -->
  <QRCodeScannerWeb @scanned="scanned" license="DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="></QRCodeScannerWeb>
  <!--  #endif -->
  <!--  #ifdef APP -->
  <QRCodeScanner @scanned="scanned" license="DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="></QRCodeScanner>
  <!--  #endif -->
</view>
```

## 集成到小程序

小程序也支持WebView，可以用集成到原生移动应用一样的方法。

我们需要做以下改动：

1. 在网页应用中集成小程序的SDK。

   ```html
   <script type="text/javascript">
     var userAgent = navigator.userAgent;
     if (userAgent.indexOf('AlipayClient') > -1) {
       // 支付宝小程序的 JS-SDK 防止 404 需要动态加载，如果不需要兼容支付宝小程序，则无需引用此 JS 文件。
       document.writeln('<script src="https://appx/web-view.min.js"' + '>' + '<' + '/' + 'script>');
     } else if (/QQ/i.test(userAgent) && /miniProgram/i.test(userAgent)) {
       // QQ 小程序
       document.write(
         '<script type="text/javascript" src="https://qqq.gtimg.cn/miniprogram/webview_jssdk/qqjssdk-1.0.0.js"><\/script>'
       );
     } else if (/miniProgram/i.test(userAgent) && /micromessenger/i.test(userAgent)) {
       // 微信小程序 JS-SDK 如果不需要兼容微信小程序，则无需引用此 JS 文件。
       document.write('<script type="text/javascript" src="https://res.wx.qq.com/open/js/jweixin-1.4.0.js"><\/script>');
     } else if (/toutiaomicroapp/i.test(userAgent)) {
       // 头条小程序 JS-SDK 如果不需要兼容头条小程序，则无需引用此 JS 文件。
       document.write(
         '<script type="text/javascript" src="https://s3.pstatp.com/toutiao/tmajssdk/jssdk-1.0.1.js"><\/script>');
     } else if (/swan/i.test(userAgent)) {
       // 百度小程序 JS-SDK 如果不需要兼容百度小程序，则无需引用此 JS 文件。
       document.write(
         '<script type="text/javascript" src="https://b.bdstatic.com/searchbox/icms/searchbox/js/swan-2.0.18.js"><\/script>'
       );
     } else if (/quickapp/i.test(userAgent)) {
       // quickapp
       document.write('<script type="text/javascript" src="https://quickapp/jssdk.webview.min.js"><\/script>');
     }
     if (!/toutiaomicroapp/i.test(userAgent)) {
       document.querySelector('.post-message-section').style.visibility = 'visible';
     }
   </script>
   ```
   
2. 在基于WebView的组件中，如果是小程序，将hasPermission值默认设成true，因为不需要申请相机权限。

   ```
   //#ifdef MP
   hasPermission.value = true;
   //#endif
   ```
   
3. 在条件编译中，添加小程序的判定。

   ```
   <!--  #ifdef APP || MP -->
   <QRCodeScanner @scanned="scanned" license="DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="></QRCodeScanner>
   <!--  #endif -->
   ```

局限：在微信小程序中，postMessage需要使用复制链接、分享等操作触发，扫描到结果后需要在执行上述操作之一才能返回主界面。

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/uniapp-qr-code-scanner>

