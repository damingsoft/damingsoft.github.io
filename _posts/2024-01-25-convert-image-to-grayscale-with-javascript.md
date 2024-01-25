---
layout: post
title: "如何使用JavaScript生成灰度图"
date: 2024-01-25 10:00:53 +0800
categories: 文档扫描
tags: 
---

灰度图像完全由灰色像素组成。它们通常以每个采样像素8位的方式存储，可以记录256级灰度。

将图像转换为灰度有多种用途：

* 减少文件大小：与24位彩色图像相比，8位灰度图像所需的存储数据通常更少。
* 图像处理：许多图像处理算法需要先将图像转换为灰度。
* 美学：单色灰度图像能唤起一种特殊的感觉，这是彩色图像所不能给予的。

转换为灰度的示例图像：

![灰度转换](/album/2024/01/grayscale.jpg)

在本文中，我们将讨论使用JavaScript转换图像为灰度的三种方法。

* CSS
* Canvas
* [Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview) ，一个文档扫描SDK

[在线demo](https://tony-xlh.github.io/Color-Conversion-JavaScript/grayscale.html)

## 编写一个HTML5页面以转换图像为灰度

使用以下模板创建一个新的HTML5页面，然后让我们为其添加图像颜色转换功能。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convert an Image to Grayscale</title>
  <style>
  </style>
</head>
<body>
  <div class="home">
    <h2>Convert an Image to Grayscale</h2>
    <button id="convertButton">Convert</button>
  </div>
  <script>
  </script>
</body>
</html>
```

### 加载图片

添加用于选择文件的`input`元素，并使用按钮触发它。图片将被加载到两个img元素中，一个用于显示转换的结果，另一个用于存储原始图像。

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
    max-width: 50%;
  }

  #image {
    max-width: 100%;
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
    document.getElementById("imageHidden").src = e.target.result;
  };
  fileReader.onerror = function () {
    console.warn('oops, something went wrong.');
  };
  fileReader.readAsDataURL(file);
}
```

### 使用CSS以灰度显示图像

我们可以使用CSS属性`filter`以灰度显示HTML元素：

```js
document.getElementById("image").style.filter = "grayscale(1)";
```

它可以使任何HTML元素变为灰色，但如果我们需要将图像保存为灰度图，则不能使用此方法。

### 使用Canvas将图像转换为灰度

HTML5提供了一个`canvas`标签，我们可以用它操作图像数据。与只改变视觉效果的CSS不同，我们可以使用它来实际获得转换成灰度的图像。

1. 向页面添加一个隐藏的`canvas`元素。

   ```html
   <canvas id="canvasHidden"></canvas>
   <style>
     #canvasHidden {
       display: none;
     }
   </style>
   ```

2. 添加一个`select`元素以选择要使用的转换方法。

   ```html
   <label>
     Method:
     <select id="methodSelect">
       <option>CSS</option>
       <option>Canvas</option>
     </select>
   </label>
   ```

3. 当所选方法为 "Canvas"时，使用`canvas`将图像转换为灰度图像。

   ```js
   let method = document.getElementById("methodSelect").selectedIndex;
   if (method == 0) {
     convertWithCSS();
   }else if (method == 1){
     document.getElementById("image").style.filter = "";
     convertWithCanvas();
   }
   ```

具体的转换步骤：

1. 将canvas的大小设置为图像的大小。

   ```js
   const image = document.getElementById("image");
   const canvas = document.getElementById("canvasHidden");
   canvas.width = image.naturalWidth;
   canvas.height = image.naturalHeight;
   ```

2. 获取canvas的context以执行操作。

   ```js
   const context = canvas.getContext("2d");
   ```

3. 将图像绘制到canvas上。

   ```js
   context.drawImage(image, 0, 0);
   ```


4. 获取图像的`ImageData`：

   ```js
   const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
   ```

   `ImageData`以RGBA顺序将像素值存储在`Uint8ClampedArray`中，取值范围是0到255。像素从左上角到右下角逐行排列。

5. 创建一个函数以根据RGB值计算灰度值。

   ```js
   //https://github.com/image-js/image-js/blob/9ab86a86f6c13a9a7d14c62566c1396c3c6f54f4/src/image/transform/greyAlgorithms.js
   function RGBToGrayScale(red,green,blue){
     //return red * 0.2126 + green * 0.7152 + blue * 0.0722;
     return (red * 6966 + green * 23436 + blue * 2366) >> 15;
   }
   ```

   计算灰度值的方法有很多。这里，我们使用`Rec. 709亮度系数`进行转换。使用基于整数的乘法计算和移位优化了计算速度。


6. 遍历所有像素，将RGB值设置为我们计算出的灰度值。

   ```js
   const pixels = imageData.data; //[r,g,b,a,...]
   for (var i = 0; i < pixels.length; i += 4) {
     const red = pixels[i];
     const green = pixels[i + 1];
     const blue = pixels[i + 2];
     const grayscale = RGBToGrayScale(red, green, blue)
     pixels[i] = grayscale;
     pixels[i + 1] = grayscale;
     pixels[i + 2] = grayscale;
   }
   ```

7. 放回`ImageData`。

   ```js
   context.putImageData(imageData, 0, 0);
   ```

8. 显示转换后的图像。

   ```js
   image.src = canvas.toDataURL();
   ```

### 使用Dynamic Web TWAIN将图像转换为灰度

Dynamic Web TWAIN是一个文档扫描SDK，可以在浏览器中扫描文档。它提供了各种图像处理方法。我们可以使用其[ConvertToGrayScale](https://www.dynamsoft.com/web-twain/docs/info/api/WebTwain_Edit.html#converttograyscale)方法转换图像。

使用它的优点是，它可以用于批量处理大量图像，因为处理是使用本地进程完成的。由于使用了libpng等本地图像库根据颜色信息输出文件，输出文件的尺寸也会更优。

以下是使用它的步骤：

1. 在页面中引入Dynamic Web TWAIN。

   ```html
   <script src="https://unpkg.com/dwt@18.4.2/dist/dynamsoft.webtwain.min.js"></script>
   ```

2. 初始化一个Web TWAIN的实例并使用它来转换图像。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dwt)申请其许可证。

   ```js
   let DWObject;
   Dynamsoft.DWT.AutoLoad = false;
   Dynamsoft.DWT.ProductKey = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   Dynamsoft.DWT.ResourcesPath = "https://unpkg.com/dwt@18.4.2/dist";

   async function convertWithDWT(){
     if (!DWObject) {
       await initDWT();
     }
     DWObject.RemoveAllImages();
     let response = await fetch(document.getElementById("imageHidden").src);
     let buffer = await response.arrayBuffer();
     DWObject.LoadImageFromBinary(buffer,
     function(){
       DWObject.ConvertToGrayScale(0,
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

## 源代码

可以在以下仓库中找到所有代码和在线演示：

<https://github.com/tony-xlh/Color-Conversion-JavaScript>






