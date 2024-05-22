---
layout: post
title: "如何使用JavaScript控制摄像头变焦"
date: 2024-05-22 11:10:53 +0800
categories: 文档扫描
tags: 
description: 本文讨论了如何在Web应用程序中基于getUserMedia API使用JavaScript控制摄像头变焦。
---

使用`getUserMedia` API ，我们可以使用JavaScript在Web应用中调用摄像头。从Chrome 87开始，我们还可以控制摄像头的`平移`、`倾斜`和`变焦`（PTZ），从而为摄像头Web应用提供更多可能性。

在本文中，我们将讨论如何在Web应用中控制摄像头变焦。会编写两个demo，一个直接调用`getUserMedia`，一个使用[Dynamsoft Camera Enhancer](https://www.dynamsoft.com/camera-enhancer/docs/introduction/index.html)。

变焦控制功能目前只能在Android上的Chrome浏览器或使用Chrome内核的浏览器上使用。Dynamsoft Camera Enhancer在没有此功能的浏览器上，也能通过模拟的方式实现变焦效果。

演示视频：

<video src="https://github.com/xulihang/web-camera-zoom/assets/5462205/15fc7046-a82c-40c9-a711-3e6c1ad0e687" data-canonical-src="https://github.com/xulihang/web-camera-zoom/assets/5462205/15fc7046-a82c-40c9-a711-3e6c1ad0e687" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-width: 100%; max-height:640px; min-height: 200px"></video>


## 在Web应用中控制摄像头变焦

下面是分步实现过程。

### 使用getUserMedia打开摄像头

1. 创建一个包含以下模板的新HTML文件。

   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Camera Zoom Demo</title>
     <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
     <style>
       video {
         max-width: 100%;
       }
     </style>
   </head>
   <body>
     <h2>Camera Zoom Demo</h2>
     <label>
       Camera:
       <select id="select-camera"></select>
     </label>
     <label>
       Resolution:
       <select id="select-resolution">
         <option value="640x480">640x480</option>
         <option value="1280x720">1280x720</option>
         <option value="1920x1080" selected>1920x1080</option>
         <option value="3840x2160">3840x2160</option>
       </select>
     </label>
     <button onclick="startCamera();">Start Camera</button>
     <br/>
     <video id="video" muted autoplay="autoplay" playsinline="playsinline" webkit-playsinline></video>
     <script type="text/javascript">
     </script>
   </body>
   </html>
   ```

2. 请求摄像头权限。

   ```js
   async function requestCameraPermission() {
     try {
       const constraints = {video: true, audio: false};
       const stream = await navigator.mediaDevices.getUserMedia(constraints);
       closeStream(stream);
     } catch (error) {
       console.log(error);
       throw error;
     }
   }

   function closeStream(stream){
     if (stream) {
       const tracks = stream.getTracks();
       for (let i=0;i<tracks.length;i++) {
         const track = tracks[i];
         track.stop();  // stop the opened tracks
       }
     }
   }
   ```

3. 列出摄像头。

   ```js
   let cameras = []
   async function listCameras(){
     let cameraSelect = document.getElementById("select-camera");
     let allDevices = await navigator.mediaDevices.enumerateDevices();
     for (let i = 0; i < allDevices.length; i++){
       let device = allDevices[i];
       if (device.kind == 'videoinput'){
         cameras.push(device);
         cameraSelect.appendChild(new Option(device.label,device.deviceId));
       }
     }
   }
   ```

4. 以所需的分辨率打开所选摄像头。

   ```js
   async function startCamera(){
     let selectedCamera = cameras[document.getElementById("select-camera").selectedIndex];
     closeStream(document.getElementById("video").srcObject);
     let selectedResolution = document.getElementById("select-resolution").selectedOptions[0].value;
     let width = parseInt(selectedResolution.split("x")[0]);
     let height = parseInt(selectedResolution.split("x")[1]);

     const videoConstraints = {
       video: {width:width, height:height, deviceId: selectedCamera.deviceId},
       audio: false
     };
      const cameraStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      document.getElementById("video").srcObject = cameraStream;
   }
   ```

### 启用变焦

1. 首先，检查浏览器是否支持变焦功能。

   ```js
   function checkBrowserCapabilities(){
     if (navigator.mediaDevices.getSupportedConstraints().zoom) {
       console.log("Browser supports zoom");
     }else{
       alert("The browser does not support zoom.");
     }
   }
   ```

2. 检查所选摄像头是否支持变焦。如果支持，加载变焦的范围。

   ```js
   function checkCameraCapabilities(){
     const video = document.querySelector('video');
     const videoTracks = video.srcObject.getVideoTracks();
     track = videoTracks[0];
     let capabilities = track.getCapabilities();
     console.log(capabilities);
     if ('zoom' in capabilities) {
       let min = capabilities["zoom"]["min"];
       let max = capabilities["zoom"]["max"];
       document.getElementById("zoomInput").setAttribute("min",min);
       document.getElementById("zoomInput").setAttribute("max",max);
       document.getElementById("zoomInput").value  = 1;
     }else{
       alert("This camera does not support zoom");
     }
   }
   ```

   添加了一个input元素来设置摄像头的变焦。

   ```html
   <label>
     Zoom Factor:
     <input type="number" min="0" max="2" id="zoomInput" value="0" onchange="setZoom();">
   </label>
   ```

3. 如果值改变，则应用变焦。

   ```js
   async function setZoom(){
     let expectedZoom = document.getElementById("zoomInput").value;
     const constraints = {advanced: [{zoom: expectedZoom}]};
     await track.applyConstraints(constraints);
   }
   ```

### 使用Dynamsoft Camera Enhancer

Dynamsoft Camera Enhancer是一个使调用摄像头更方便并加强摄像头功能的库。内部基于getUserMedia API实现。

以下是使用Dynamsoft Camera Enhancer v4的进行摄像头控制的相关函数：

1. 列出摄像头。

   ```js
   let cameras = await cameraEnhancer.getAllCameras();
   ```

2. 以期望的分辨率打开所选摄像头。

   ```js
   let selectedCamera = cameras[document.getElementById("select-camera").selectedIndex];
   let selectedResolution = document.getElementById("select-resolution").selectedOptions[0].value;
   let width = parseInt(selectedResolution.split("x")[0]);
   let height = parseInt(selectedResolution.split("x")[1]);
   await cameraEnhancer.selectCamera(selectedCamera);
   await cameraEnhancer.setResolution({width:width, height:height});
   await cameraEnhancer.open();
   ```

3. 获取变焦范围。

   ```js
   let zoomRange = cameraEnhancer.getAutoZoomRange();
   ```

4. 设置变焦。

   ```js
   let expectedZoom = document.getElementById("zoomInput").value;
   cameraEnhancer.setZoom({factor: parseFloat(expectedZoom)});
   ```

使用Dynamsoft Camera Enhancer的一个优点是其变焦功能支持所有浏览器。如果浏览器不支持原生变焦，它将使用CSS和WebGL模拟变焦行为。

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/web-camera-zoom>

