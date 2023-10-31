---
layout: post
title: 浏览器中打开多个摄像头
date: 2023-10-19 11:19:53 +0800
categories: 条码扫描
tags: 摄像头
---

WebRTC是一种使Web应用程序和网站能够捕获和流式传输音频和/或视频媒体，以及在浏览器之间交换任意数据的技术。我们可以使用它在浏览器中打开本地相机和流式传输远程相机的内容。

在本文中，我们将尝试使用WebRTC的`getUserMedia`接口在网页中打开多个相机。

在线demo：

* [简单版](https://tony-xlh.github.io/getUserMedia-multiple-camera/)。打开两个摄像头的一个简单demo。
* [扫码版](https://tony-xlh.github.io/getUserMedia-multiple-camera/barcode-reading.html)。打开两个摄像头，使用[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)从一个摄像头扫码。相机画面和码值会将保存到IndexedDB中。主要模仿的快递超市取件机器的功能。

条码扫描应用的演示视频：

<video src="https://user-images.githubusercontent.com/5462205/277254229-2300485d-fceb-48ac-9379-e98a7844a56f.mp4" data-canonical-src="https://user-images.githubusercontent.com/5462205/277254229-2300485d-fceb-48ac-9379-e98a7844a56f.mp4" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-width: 100%; max-height:640px; min-height: 200px"></video>

## 支持的平台

在Android和iOS设备上没有办法在浏览器同时打开多个摄像头。PC设备可以正常打开多个摄像头。

## 编写打开两个摄像头的页面

先写一个打开两个摄像头的页面。

### 新建HTML文件

创建一个包含以下内容的新HTML文件。

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Multiple Camera Simple Example</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <style>
    </style>
  </head>
  <body>
    <div>
      <label>
        Camera 1:
        <select id="select-camera-1"></select>
      </label>
      <label>
        Camera 2:
        <select id="select-camera-2"></select>
      </label>
    </div>
    <div>
      <video id="camera1" controls autoplay playsinline></video>
    </div>
    <div>
      <video id="camera2" controls autoplay playsinline></video>
    </div>
    <button id="btn-open-camera">Open Cameras</button>
    <script>
    </script>
  </body>
</html>
```

### 请求相机权限

页面加载后请求相机权限。

```js
window.onload = async function(){
  await askForPermissions()
}

async function askForPermissions(){
  var stream;
  try {
    var constraints = {video: true, audio: false}; //ask for camera permission
    stream = await navigator.mediaDevices.getUserMedia(constraints);  
  } catch (error) {
    console.log(error);
  }
  closeStream(stream);
}

function closeStream(stream){
  try{
    if (stream){
      stream.getTracks().forEach(track => track.stop());
    }
  } catch (e){
    alert(e.message);
  }
}
```

### 列出相机设备

在`select`元素中列出相机设备。

```js
var devices;
var camSelect1 = document.getElementById("select-camera-1");
var camSelect2 = document.getElementById("select-camera-2");
async function listDevices(){
  devices = await getCameraDevices()
  for (let index = 0; index < devices.length; index++) {
    const device = devices[index];
    camSelect1.appendChild(new Option(device.label ?? "Camera "+index,device.deviceId));
    camSelect2.appendChild(new Option(device.label ?? "Camera "+index,device.deviceId));
  }
  camSelect2.selectedIndex = 1;
}

async function getCameraDevices(){
  await askForPermissions();
  var allDevices = await navigator.mediaDevices.enumerateDevices();
  var cameraDevices = [];
  for (var i=0;i<allDevices.length;i++){
    var device = allDevices[i];
    if (device.kind == 'videoinput'){
      cameraDevices.push(device);
    }
  }
  return cameraDevices;
}
```

### 打开摄像头

点击按钮后打开相机。

```js
document.getElementById("btn-open-camera").addEventListener("click",function(){
  captureCamera(document.getElementById("camera1"),camSelect1.selectedOptions[0].value);
  captureCamera(document.getElementById("camera2"),camSelect2.selectedOptions[0].value);
});

function captureCamera(video, selectedCamera) {
  var constraints = {
    audio:false,
    video:true
  }
  if (selectedCamera) {
    constraints = {
      video: {deviceId: selectedCamera},
      audio: false
    }
  }
  navigator.mediaDevices.getUserMedia(constraints).then(function(camera) {
    video.srcObject = camera;
  }).catch(function(error) {
    alert('Unable to capture your camera. Please check console logs.');
    console.error(error);
  });
}
```

打开两个摄像头的页面就写好了。

## 添加条码扫描功能

接下来，将条码扫描功能添加到页面中。

### 添加类库

添加Dynamsoft Barcode Reader。

```html
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.31/dist/dbr.js"></script>
```

添加`localForage`便于操作IndexedDB。

```html
<script src="https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js"></script>
```

### 从视频帧扫描条码

1. 使用许可证初始化Dynamsoft Barcode Reader。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dbr)申请许可证。

   ```js
   async function initDBR(){
     Dynamsoft.DBR.BarcodeScanner.license = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=='; //one-day public trial
     scanner = await Dynamsoft.DBR.BarcodeScanner.createInstance();
   }
   ```

2. 创建一个interval，不断捕获视频帧并解码。

   ```js
   var interval;
   var decoding = false;
   function startScanning(){
     stopScanning();
     interval = setInterval(captureAndDecode,200);
   }

   function stopScanning(){
     if (interval) {
       clearInterval(interval);
       interval = undefined;
     }
     decoding = false;
   }

   async function captureAndDecode(){
     if (decoding === false) {
       decoding = true;
       try {
         let video = document.getElementById("camera1");

         var results = await scanner.decode(video);
         console.log(results);
       } catch (error) {
         console.log(error);
       }
       decoding = false;
     }
   }
   ```

### 在表中显示扫描结果并保存到IndexedDB

找到条码后，使用`Canvas`从相机捕获帧，保存为dataURL，并将它们与条码和日期一起显示在表中。同时也保存到IndexedDB中做持久性数据存储。

```js
var recordStore = localforage.createInstance({
  name: "record"
});

function appendRecord(results){
  var cam1 = document.getElementById("camera1");
  var cam2 = document.getElementById("camera2");
  var cvs = document.createElement("canvas");
  var imgDataURL1 = captureFrame(cvs,cam1);
  var imgDataURL2 = captureFrame(cvs,cam2);
  var row = document.createElement("tr");
  var cell1 = document.createElement("td");
  var cell2 = document.createElement("td");
  var cell3 = document.createElement("td");
  var cell4 = document.createElement("td");
  var img1 = document.createElement("img");
  img1.src = imgDataURL1;
  cell1.appendChild(img1);
  var img2 = document.createElement("img");
  img2.src = imgDataURL2;
  cell2.appendChild(img2);
  cell3.innerText = barcodeResultsString(results);
  var date = new Date();
  cell4.innerText = date.toLocaleString();
  row.appendChild(cell1);
  row.appendChild(cell2);
  row.appendChild(cell3);
  row.appendChild(cell4);
  document.querySelector("tbody").appendChild(row);
  if (document.getElementById("save-to-indexedDB").checked) {
    saveRecord(imgDataURL1,imgDataURL2,results[0].barcodeText,date.getTime())
  }
}

function captureFrame(canvas,video){
  var w = video.videoWidth;
  var h = video.videoHeight;
  canvas.width  = w;
  canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL();
}

function barcodeResultsString(results){
  var s = "";
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    s = result.barcodeFormatString + ": " + result.barcodeText;
    if (index != results.length - 1) {
      s = s + "\n";
    }
  }
  return s;
}

async function saveRecord(img1,img2,barcodeText,timestamp){
  let existingRecords = await recordStore.getItem(barcodeText);
  if (!existingRecords) {
    existingRecords = [];
  }
  existingRecords.push({img1:img1,img2:img2,text:barcodeText,date:timestamp});
  await recordStore.setItem(barcodeText,existingRecords);
}
```

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/getUserMedia-multiple-camera>

demo包含本文没有介绍的功能，比如在扫描界面上绘制条码和根据时间过滤扫描到的条码以避免重复读码。


