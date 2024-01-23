---
layout: post
title: "如何使用JavaScript调整图像大小"
date: 2024-01-19 10:48:53 +0800
categories: 文档扫描
tags: 
---

在文档扫描Web应用中，调整图像大小是一个常用的操作，它可以纠正扫描的文档的比例，或者提高文档图像的DPI以满足打印要求。

在本文中，我们将讨论如何使用JavaScript调整图像大小。一种方法是使用Canvas ，另一种方法是使用文档扫描SDK [Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview)。

## 编写一个HTML5页面以调整图像大小

使用以下模板创建一个新的HTML5页面，然后让我们为其添加图像大小调整功能。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resize an Image with JavaScript</title>
  <style>
  </style>
</head>
<body>
  <div class="home">
    <h2>Rotate an Image</h2>
    <button id="resizeButton">Resize</button>
  </div>
  <script>
  </script>
</body>
</html>
```


### 设置所需分辨率

1. 添加两个`input`元素以指定分辨率，并添加一个复选框以启用维持比例。

   HTML：

   ```html
   <style>
   input[type=number] {
     max-width: 50px;
   }
   </style>
   <label>
     Width:
     <input type="number" onfocus="this.oldvalue = this.value;" id="widthInput">
   </label>
   <label>
     Height:
     <input type="number" onfocus="this.oldvalue = this.value;" id="heightInput">
   </label>
   <label>
     Keep aspect:
     <input type="checkbox" id="keepAspectCheckbox">
   </label>
   ```

   JavaScript：

   ```js
   let widthInput = document.getElementById("widthInput");
   let heightInput = document.getElementById("heightInput");

   widthInput.addEventListener("change",function(e){
     if (document.getElementById("keepAspectCheckbox").checked) {
       syncSize(widthInput.oldvalue,heightInput.oldvalue,widthInput.value,undefined);
     }
     this.oldvalue = this.value;
   })

   heightInput.addEventListener("change",function(e){
     if (document.getElementById("keepAspectCheckbox").checked) {
       syncSize(widthInput.oldvalue,heightInput.oldvalue,undefined,heightInput.value);
     }
     this.oldvalue = this.value;
   })

   function syncSize(oldWidth, oldHeight, newWidth, newHeight){
     if (oldWidth && oldHeight) {
       const ratio = parseInt(oldWidth)/parseInt(oldHeight);
       if (newWidth) {
         newHeight = newWidth/ratio;
         heightInput.value = parseInt(newHeight);
         heightInput.oldvalue = heightInput.value;
       }else if (newHeight) {
         newWidth = newHeight * ratio;
         widthInput.value = parseInt(newWidth);
         widthInput.oldvalue = widthInput.value;
       }
     }
   }
   ```


2. 添加用于选择预设分辨率的`select`元素。

   文件通常有固定尺寸，如A4纸（8.268 x 11.693英寸）和身份证（3.375 x 2.125英寸）。我们可以根据不同的DPI计算对应的分辨率，并将其添加为预设值。例如，300 DPI的A4文档的分辨率应为`8.268*300 x 11.693*300=2480 x 3508`。

   HTML：

   ```html
   <label>
     Preset resolutions:
     <select id="presetSelect">
       <option value="2480x3508">A4 300 DPI</option>
       <option value="1654x2339">A4 200 DPI</option>
       <option value="827x1169">A4 100 DPI</option>
       <option value="1013x638">ID Card 300 DPI</option>
       <option value="676x425">ID Card 200 DPI</option>
       <option value="338x213">ID Card 100 DPI</option>
     </select>
   </label>
   ```

   JavaScript：

   ```js
   document.getElementById("presetSelect").selectedIndex = -1;
   document.getElementById("presetSelect").addEventListener("change",async function(e){
     usePreset();
   })
   function usePreset(){
     let presetSelect = document.getElementById("presetSelect");
     if (presetSelect.selectedIndex != -1) {
       let selectedOption = presetSelect.selectedOptions[0];
       widthInput.value = selectedOption.value.split("x")[0];
       heightInput.value = selectedOption.value.split("x")[1];
       presetSelect.selectedIndex = -1;
     }
   }
   ```


### 加载图片

添加用于选择文件的`input`元素，并使用按钮触发它。图片将被加载到两个img元素中，一个用于显示大小调整后的结果，另一个用于存储原始图像。

使用图像的默认大小填充宽度和高度的输入框。

HTML：

```html
<button id="loadFileButton">Load a File</button>
<input style="display:none;" type="file" id="file" onchange="loadImageFromFile();" accept=".jpg,.jpeg,.png,.bmp" />
<div class="imageContainer">
  <img id="image"/>
  <img id="imageHidden"/>
</div>
<style>
  .imageContainer {
    overflow: auto;
  }

  #imageHidden {
    display: none;
  }
</style>
```

JavaScript：

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
    document.getElementById("image").src = e.target.result;
    document.getElementById("imageHidden").onload = function(){
      widthInput.value = document.getElementById("imageHidden").naturalWidth;
      heightInput.value = document.getElementById("imageHidden").naturalHeight;
      widthInput.oldvalue = widthInput.value;
      heightInput.oldvalue = heightInput.value;
    }
    document.getElementById("imageHidden").src = e.target.result;
  };
  fileReader.onerror = function () {
    console.warn('oops, something went wrong.');
  };
  fileReader.readAsDataURL(file);
}
```

### 使用Canvas调整图像大小

1. 向文档添加`canvas`元素。

   ```html
   <style>
   #canvasHidden {
     display: none;
   }
   </style>
   <canvas id="canvasHidden"></canvas>
   ```

2. 根据指定的分辨率设置canvas的大小。


   ```js
   const canvas = document.getElementById("canvasHidden");
   canvas.width = widthInput.value;
   canvas.height = heightInput.value;
   ```

3. 获取canvas的context以执行操作。

   ```js
   const ctx = canvas.getContext("2d");
   ```

4. 将图像绘制到canvas上。

   ```js
   const imageHidden = document.getElementById("imageHidden");
   ctx.drawImage(imageHidden, 0, 0, imageHidden.naturalWidth, imageHidden.naturalHeight,0,0,canvas.width,canvas.height);
   ```

5. 显示调整后的图像。

   ```js
   image.src = canvas.toDataURL();
   ```

### 使用Dynamic Web TWAIN调整图像大小

Dynamic Web TWAIN是一个文档扫描SDK，可以在浏览器中扫描文档。它提供了各种图像处理方法。我们可以使用其[ChangeImageSize](https://www.dynamsoft.com/web-twain/docs/info/api/WebTwain_Edit.html#changeimagesize)方法调整图像大小。

使用它的优点是，它可以用于批量处理大量图像，因为处理是使用本地进程完成的。

以下是使用它的步骤：

1. 在页面中引入Dynamic Web TWAIN。

   ```html
   <script src="https://unpkg.com/dwt@18.4.2/dist/dynamsoft.webtwain.min.js"></script>
   ```

2. 初始化一个Web TWAIN的实例并使用它来调整图像大小。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dwt)申请其许可证。

   ```js
   let DWObject;
   Dynamsoft.DWT.AutoLoad = false;
   Dynamsoft.DWT.ProductKey = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   Dynamsoft.DWT.ResourcesPath = "https://unpkg.com/dwt@18.4.2/dist";

   async function resizeImageWithWebTWAIN(){
     if (!DWObject) {
       await initDWT();
     }
     DWObject.RemoveAllImages();
     let file = document.getElementById("file").files[0];
     let buffer = await file.arrayBuffer();
     DWObject.LoadImageFromBinary(buffer,
     function(){
       const method = document.getElementById("interpolationMethodSelect").selectedOptions[0].value;
       DWObject.ChangeImageSize(0,widthInput.value,heightInput.value,method,
       function(){
         document.getElementById("image").src = DWObject.GetImageURL(0);
       },
       function(errorCode, errorString){
         console.log(errorString);
       });
     },
     function(errorCode, errorString){
       console.log(errorString);
     })
   }

   function initDWT(){
     return new Promise((resolve, reject) => {
       const title = document.querySelector("h2").innerText;
       document.querySelector("h2").innerText = "Loading Dynamic Web TWAIN...";
       Dynamsoft.DWT.CreateDWTObjectEx(
       {
         WebTwainId: 'dwtcontrol'
       },
       function(obj) {
         DWObject = obj;
         document.querySelector("h2").innerText = title;
         resolve();
       },
       function(err) {
         console.log(err);
         document.querySelector("h2").innerText = "Failed to load Dynamic Web TWAIN";
         reject(err);
       }
     );
     })
   }
   ```

3. 在大小调整过程中可能需要添加新的像素，称为插值。Dynamic Web TWAIN为此提供了几种算法。

   可以添加一个`select`元素用于选择使用哪种算法。

   ```html
   <div class="dwtcontrols">
     <label>
       Interpolation Method:
       <select id="interpolationMethodSelect">
         <option value="1">Nearest Neighbour</option>
         <option value="2">Bilinear</option>
         <option value="3">Bicubic</option>
         <option value="5" selected>Best Quality</option>
       </select>
     </label>
   </div>
   ```


## 源代码

可以在以下仓库中找到所有代码和在线演示：

<https://github.com/tony-xlh/Resize-Image-JavaScript>






