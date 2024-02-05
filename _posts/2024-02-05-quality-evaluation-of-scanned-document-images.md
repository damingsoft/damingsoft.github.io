---
layout: post
title: "如何评估扫描文档的图像质量"
date: 2024-02-05 10:25:53 +0800
categories: 文档扫描
tags: 
description: 本文分享了可以从哪些方面评估扫描文档的图像质量。
---

通过文档扫描仪或者相机扫描文档时，我们可能会获得质量较差的文档图像。在本文中，我们将讨论如何评估扫描文档的图像质量，以便重新捕获文档以获得更好的图像。编写了一个Web应用用于自动化评估。

[在线demo](https://tony-xlh.github.io/quality-evaluation-of-scanned-document-images/)

## 评估文档图像质量的几个方面

以下是我们归纳的评估质量的几个方面。

### 模糊

模糊可能是由于拍摄过程中的抖动或失焦造成的。

模糊图像示例：

![模糊](/album/2024/02/quality-evaluation/blur.jpg)

清晰图像示例：

![清晰](/album/2024/02/quality-evaluation/clear.jpg)

### 倾斜

如果放置在文件扫描仪上的文档没有放正，那么扫描的图像可能会偏斜。

![倾斜的](/album/2024/02/quality-evaluation/skewed.jpg)

### 过度曝光

曝光过度会产生非常明亮且对比度较低的图像。

![明亮](/album/2024/02/quality-evaluation/bright.jpg)

### 长宽比

文件通常有固定的长宽比。例如，身份证的物理尺寸为86mm × 54mm ，其图像也应具有此长宽比。

因相机设置不正确而被拉伸的身份证图像示例：

![身份证示例](/album/2024/02/quality-evaluation/id-card-demo.jpg)

### OCR置信度

OCR软件在给出文本结果时通常还包含置信度分数。该分数可以反映文档图像的质量。

## 编写用于自动评估的Web应用

下面是编写自动评估文档质量的Web应用的分步过程。

### 新页面

创建包含以下内容的新页面：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quality Evaluation of Scanned Documents</title>
  <style>
    .main {
      display: flex;
    }
  </style>
</head>
<body>
  <div class="home">
    <h2>Quality Evaluation of Scanned Documents</h2>
    <div class="main">
    </div>
  </div>
</body>
</html>
```

### 添加依赖项

1. 添加[Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview)，用于扫描文档和加载图像或PDF文件。

   添加库和一个div，用于容纳其控件。

   HTML：

   ```html
   <style>
     #dwtcontrolContainer {
       width: 240px;
       height: 320px;
     }
   </style>
   <script src="https://unpkg.com/dwt@18.4.2/dist/dynamsoft.webtwain.min.js"></script>
   <div class="main">
     <div class="scanner">
       <div id="dwtcontrolContainer"></div>
     </div>
   </div>
   ```

   使用以下JavaScript初始化Web TWAIN的实例。可以在[这里](https://www.dynamsoft.com/customer/license/trialLicense?product=dwt)申请许可证。

   ```js
   let DWObject;
   Dynamsoft.DWT.AutoLoad = false;
   Dynamsoft.DWT.ProductKey = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   Dynamsoft.DWT.ResourcesPath = "https://unpkg.com/dwt@18.4.2/dist";

   window.onload = function(){
     initDWT();
   }

   function initDWT(){
     return new Promise((resolve, reject) => {
       Dynamsoft.DWT.CreateDWTObjectEx(
         {
           WebTwainId: 'dwtcontrol'
         },
         function(obj) {
           DWObject = obj;
           DWObject.Viewer.bind(document.getElementById('dwtcontrolContainer'));
           DWObject.Viewer.height = "100%";
           DWObject.Viewer.width = "100%";
           DWObject.Viewer.show();
           resolve();
         },
         function(err) {
           console.log(err);
           reject(err);
         }
       );
     })
   }
   ```

2. 添加OpenCV.js用于图像处理。

   添加库并获取其加载状态。

   ```html
   <script>
     var Module = {
       // https://emscripten.org/docs/api_reference/module.html#Module.onRuntimeInitialized
       onRuntimeInitialized() {
         document.getElementsByClassName("OpenCVStatus")[0].innerText = 'OpenCV.js is ready.';
       }
     };
   </script>
   <script async src="https://docs.opencv.org/4.8.0/opencv.js" type="text/javascript"></script>
   ```

3. 添加Tesseract.js用于OCR。

   ```html
   <script src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'></script>
   <script>
   let worker;
   window.onload = function(){
     initTesseract();
   }
   async function initTesseract(){
     worker = await Tesseract.createWorker("eng", 1, {
       logger: function(m){console.log(m);}
     });
   }
   </script>
   ```

### 检测模糊

由于模糊图像中的像素具有相似的相邻像素，我们可以在灰度图像上应用3 x 3拉普拉斯核，然后计算方差以检测模糊。

![拉普拉斯](/album/2024/02/quality-evaluation/detecting_blur_laplacian.png)

以下是使用OpenCV.js检测模糊的代码。如果方差小于200 ，则判断图像为模糊。

```js
function DetectBlur(src){
  let img = cv.imread(src);
  let gray = new cv.Mat();
  cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);

  let laplacianMat = new cv.Mat();
  cv.Laplacian(gray, laplacianMat, cv.CV_64F);
  let mean = new cv.Mat(1, 4, cv.CV_64F);
  let standardDeviationMat = new cv.Mat(1, 4, cv.CV_64F);
  cv.meanStdDev(laplacianMat, mean, standardDeviationMat);

  let standardDeviation = standardDeviationMat.doubleAt(0, 0);
  let variance = standardDeviation * standardDeviation;

  let threshold = 200;
  let isBlurry = variance < threshold;
  img.delete();
  gray.delete();
  laplacianMat.delete();
  mean.delete();
  standardDeviationMat.delete();
  return isBlurry;
}
```


### 检测过度曝光

我们可以使用直方图来检测过度曝光。直方图是理解图像的一种方法。它以像素值（范围通常从 0 到 255）为X轴，以图像中相应像素数量为Y轴。

正常文档图像可能具有以下直方图：

![正常的直方图](/album/2024/02/quality-evaluation/normal_histogram.png)

图像：

![好的图像](/album/2024/02/quality-evaluation/good_quality.jpg)

曝光过度的图像可能具有以下直方图：

![曝光过度的直方图](/album/2024/02/quality-evaluation/overexposed_histogram.png)

图像：

![明亮的图像](/album/2024/02/quality-evaluation/bright.jpg)

我们可以看到，过度曝光的图像具有更集中的强度分布，并且分布更靠近直方图的右侧。

以下是使用OpenCV.js和直方图检测过度曝光的代码：

```js
function DetectOverExposure(src){
  let img = cv.imread(src);
  cv.cvtColor(img, img, cv.COLOR_RGBA2GRAY, 0);
  let srcVec = new cv.MatVector();
  srcVec.push_back(img);
  let accumulate = false;
  let channels = [0];
  let histSize = [256];
  let ranges = [0, 255];
  let hist = new cv.Mat();
  let mask = new cv.Mat();
  let color = new cv.Scalar(255, 255, 255);
  let scale = 2;
  // You can try more different parameters
  cv.calcHist(srcVec, channels, mask, hist, histSize, ranges, accumulate);
  let result = cv.minMaxLoc(hist, mask);
  if (result.maxLoc.y > 240) {
    let data = hist.data32F
    let darkPixels = 0;
    for (let index = 0; index <= 200; index++) {
      const pixels = data[index];
      darkPixels = darkPixels + pixels;
    }
    let totalPixels = src.naturalHeight * src.naturalWidth;
    let percent = darkPixels/totalPixels;
    hist.delete();
    img.delete();
    if (percent < 0.2) {
      return true;
    } else {
      return false;
    }
  }else{
    hist.delete();
    img.delete();
    return false;
  }
}
```



### 检测倾斜

我们可以通过文字行的轮廓来检测倾斜角度。我们[在上一篇文章](https://devblogs.damingsoft.com/deskew-scanned-document/)中已经讨论过这点。

以下是使用Web TWAIN检测倾斜的代码。如果检测到的倾斜角度大于1，则判断文档图像为倾斜。

```js
function DetectSkewness(){
  return new Promise((resolve, reject) => {
    DWObject.GetSkewAngle(
      DWObject.SelectedImagesIndices[0],
      function(angle) {
        console.log("skew angle: " + angle);
        if (Math.abs(angle)>1) {
          resolve(true);
        }else{
          resolve(false);
        }
      },
      function(errorCode, errorString) {
        console.log(errorString);
        reject(errorString);
      }
    );
  })
}
```

### 检查长宽比

在检查长宽比是否正确之前，我们需要先知道文档的类型。

我们可以让用户先选择文件类型。

```html
 <label>
  Expected Document Type:
  <select id="documentType">
    <option value="">None</option>
    <option value="2480x3508">A4</option>
    <option value="1013x638">ID Card</option>
  </select>
</label>
```

然后使用以下代码检查长宽比：

```js
function DetectIfAspectRatioIncorrect(img){
  let documentSize = document.getElementById("documentType").selectedOptions[0].value;
  if (documentSize) {
    let width = documentSize.split("x")[0];
    let height = documentSize.split("x")[1];
    let ratio = width / height;
    let imgRatio = img.naturalWidth / img.naturalHeight;
    let percent = Math.max(ratio,imgRatio) / Math.min(ratio,imgRatio);
    if (percent > 1.1) {
      console.log(percent);
      return true;
    }else{
      return false;
    }
  }else{
    return false;
  }
}
```

### 获取OCR置信度

这里，我们使用Tesseract.js执行OCR并获取置信度。

```js
async function getOCRConfidence(img){
  const result = await worker.recognize(img);
  const data = result.data;
  let size = data.lines.length;
  let totalConfidence = 0;
  data.lines.forEach(line => {
    totalConfidence = line.confidence + totalConfidence;
  });
  let confidence = parseInt(totalConfidence/size);
  console.log(confidence);
  return confidence;
}
```

### 计算总分

我们可以计算一个总分来评估质量。

```js
let overallScore = 0;
overallScore = overallScore + (isBlurry ? 0 : 1) * 20;
overallScore = overallScore + (isOverexposed ? 0 : 1) * 20;
overallScore = overallScore + (isAspectRatioIncorrect ? 0 : 1) * 20;
overallScore = overallScore + (isSkewed ? 0 : 1) * 20;
overallScore = overallScore + OCRConfidence * 0.2;
```

结果显示在表格中。

![表](/album/2024/02/quality-evaluation/table.jpg)

## 源代码

可以在以下仓库中找到所有代码和在线演示：

<https://github.com/tony-xlh/quality-evaluation-of-scanned-document-images>






