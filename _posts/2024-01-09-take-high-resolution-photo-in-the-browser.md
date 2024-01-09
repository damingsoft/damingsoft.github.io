---
layout: post
title: "如何在浏览器中拍摄高分辨率照片"
date: 2024-01-08 14:35:53 +0800
categories: 摄像头
tags: 
---

随着Web平台的发展，我们可以在其上构建丰富的应用程序。比如我们可以编写条码扫描或文档扫描的Web应用，使用`getUserMedia`获取视频帧以用于实时分析。

条码扫描可能不需要高分辨率，但文档扫描通常需要拍摄高分辨率的照片。

在本文中，我们将构建一个demo web应用，以说明在浏览器中拍摄高分辨率照片的方法。它主要使用以下方式：

1. 使用WebRTC的[getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)在`video`元素中开启相机预览，并使用`canvas`元素捕获帧。此外有一个[Image Capture API](https://w3c.github.io/mediacapture-image/)，可以拍摄分辨率高于相机预览的照片。但该API的浏览器的支持有限。
2. 使用`input`元素调用[HTML Media Capture API](https://w3c.github.io/html-media-capture/)，即`<input type="file" name="image" accept="image/*" capture>`。它能调用系统的相机应用来拍照。

## 新建HTML文件

创建一个包含以下内容的新HTML文件：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Take a High Resolution Photo</title>
  <style>
  .home {
    display: flex;
    align-items: center;
    flex-direction: column;
  }
  </style>
</head>
<body>
  <div class="home">
    <h2>Take a Photo</h2>
  </div>
  <script>
  </script>
</body>
</html>
```

## 使用getUserMedia拍照

1. 页面加载完成后，请求相机权限。

   ```js
   window.onload = async function() {
     await requestCameraPermission();
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
   ```

2. 在`select`元素中列出相机设备。

   HTML：

   ```html
   <label>
     Camera:
     <select id="cameraSelect"></select>
   </label>
   ```

   JavaScript：

   ```js
   const cameraSelect = document.getElementById("cameraSelect");
   window.onload = async function() {
     await loadCameraDevices();
     loadCameraDevicesToSelect();
   }
   async function loadCameraDevices(){
     const constraints = {video: true, audio: false};
     const stream = await navigator.mediaDevices.getUserMedia(constraints);
     const devices = await navigator.mediaDevices.enumerateDevices();
     for (let i=0;i<devices.length;i++){
       let device = devices[i];
       if (device.kind == 'videoinput'){ // filter out audio devices
         cameraDevices.push(device);
       }
     }
     const tracks = stream.getTracks(); // stop the camera to avoid the NotReadableError
     for (let i=0;i<tracks.length;i++) {
       const track = tracks[i];
       track.stop();
     }
   }

   function loadCameraDevicesToSelect(){
     for (let i=0;i<cameraDevices.length;i++){
       let device = cameraDevices[i];
       cameraSelect.appendChild(new Option(device.label,device.deviceId))
     }
   }
   ```

3. 启动选定的相机，并在`video`元素中显示相机预览。

   ```js
   document.getElementById("startCameraBtn").addEventListener('click', (event) => {
     console.log("start camera");
     let options = {};
     if (cameraSelect.selectedIndex != -1) {
       options.deviceId = cameraSelect.selectedOptions[0].value;
     }
     play(options);
   });


   function play(options) {
     stop(); // close before play
     video.style.display = "block";
     let constraints = {};
     if (options.deviceId){
       constraints = {
         video: {deviceId: options.deviceId},
         audio: false
       }
     }else{
       constraints = {
         video: {width:1280, height:720,facingMode: { exact: "environment" }},
         audio: false
       }
     }
     navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
       localStream = stream;
       // Attach local stream to video element      
       video.srcObject = stream;
     }).catch(function(err) {
       console.error('getUserMediaError', err, err.stack);
     });
   }

   function stop() {
     try{
       if (localStream){
         const tracks = localStream.getTracks();
         for (let i=0;i<tracks.length;i++) {
           const track = tracks[i];
           track.stop();
         }
       }
     } catch (e){
       alert(e.message);
     }
   };
   ```

4. 使用`canvas`元素捕获帧。

   在HTML中附加一个`canvas`元素，然后使用它来捕获相机帧并在`img`元素中显示。

   HTML：

   ```html
   <button id="takePhotoBtn">Take Photo</button>
   <video class="camera" muted autoplay="autoplay" playsinline="playsinline" webkit-playsinline></video>
   <br/>
   <canvas id="hiddenCanvas"></canvas>
   <img id="photoTaken" />
   ```

   JavaScript：

   ```js
   document.getElementById("takePhotoBtn").addEventListener('click', async (event) => {
     let src;
     src = captureFrame();
     document.getElementById("photoTaken").src = src;
   });

   function captureFrame(){
     let w = video.videoWidth;
     let h = video.videoHeight;
     canvas.width  = w;
     canvas.height = h;
     let ctx = canvas.getContext('2d');
     ctx.drawImage(video, 0, 0, w, h);
     return canvas.toDataURL("image/jpeg")
   }
   ```

5. 指定高分辨率，以捕获高质量的视频帧。

   我们可以在`select`中定义几个常见的分辨率，并尝试使用所选的分辨率。

   HTML：

   ```html
   <label>
     Desired Resolution:
     <select id="resolutionSelect">
       <option value="640x480">640x480</option>
       <option value="1280x720">1280x720</option>
       <option value="1920x1080">1920x1080</option>
       <option value="3840x2160">3840x2160</option>
     </select>
   </label>
   ```

   我们需要在`getUserMadia`的约束中指定分辨率。

   ```js
   function play(options){
     if (options.deviceId){
       constraints = {
         video: {deviceId: options.deviceId},
         audio: false
       }
     }else{
       constraints = {
         video: {width:1280, height:720,facingMode: { exact: "environment" }},
         audio: false
       }
     }
     if (resolutionSelect.selectedIndex != -1) {
       let width = parseInt(resolutionSelect.selectedOptions[0].value.split("x")[0]);
       let height = parseInt(resolutionSelect.selectedOptions[0].value.split("x")[1]);
       constraints["video"]["width"] = width;
       constraints["video"]["height"] = height;
     }
     //...
   }
   ```


6. 使用Image Capture API拍照

   如果浏览器支持Image Capture API，我们可以使用它来拍照，而不是用canvas来捕捉帧。

   ```js
   document.getElementById("takePhotoBtn").addEventListener('click', async (event) => {
     let src;
     if ("ImageCapture" in window) {
       try {
         const track = localStream.getVideoTracks()[0];
         let imageCapture = new ImageCapture(track);
         let blob = await imageCapture.takePhoto();
         src = URL.createObjectURL(blob);
       }catch(e) {
         src = captureFrame();
       }
     }else{
       src = captureFrame();
     }
     document.getElementById("photoTaken").src = src;
   });
   ```

7. 显示所拍摄图像的大小。

   ```js
   document.getElementById("photoTaken").onload = function(){
     let img = document.getElementById("photoTaken");
     document.getElementById("info").innerText = "Image Width: " + img.naturalWidth +"\nImage Height: " + img.naturalHeight;
   }
   ```

## 使用input元素拍照

1. 添加用于选择图像文件的`input`元素。

   ```html
   <button id="loadFileBtn">
     Load File
   </button>
   <input type="file" id="file" onchange="loadImageFromFile();" accept=".jpg,.jpeg,.png,.bmp" />
   ```

   这里这个`input`元素被隐藏，并通过按钮触发。

   ```js
   document.getElementById("loadFileBtn").addEventListener('click', async (event) => {
     document.getElementById("file").click();
   });
   ```

2. 选择图像文件后，将其加载到`img`元素中。

   ```js
   function loadImageFromFile(){
     let fileInput = document.getElementById("file");
     let files = fileInput.files;
     if (files.length == 0) {
       return;
     }
     let file = files[0];
     fileReader = new FileReader();
     fileReader.onload = function(e){
       document.getElementById("photoTaken").src = e.target.result;
     };
     fileReader.onerror = function () {
       console.warn('oops, something went wrong.');
     };
     fileReader.readAsDataURL(file);
   }
   ```


## 使用哪种方式

如果需要在拍照前进行实时图像处理，则需要使用`getUserMedia`方法。

如果只需要拍摄高分辨率的照片，可以使用`input`元素。

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/WebRTC-High-Resolution-Photo>

还有一个文档扫描的demo应用，可以捕捉高分辨率照片：<https://github.com/tony-xlh/ImageCapture-Document-Scanner>。它使用[Dynamsoft Document Normalizer](https://www.dynamsoft.com/document-normalizer/docs/core/)检测文档边界并更正文档图像。

