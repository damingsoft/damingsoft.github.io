---
layout: post
title: 如何纠正扫描后倾斜的文档
date: 2023-10-25 17:04:53 +0800
categories: 文档扫描
tags:
---

<style>
img {
  max-height:640px;
}
</style>

扫描的文档可能包含倾斜的页面。不易于阅读，也不便于OCR。

在本文中，我们将使用OpenCV和Python来纠正倾斜的文档页面。

## 使用OpenCV纠正文档图像

我们会编写一个Python脚本来纠正如下图这样的倾斜的文档。

![文档](/album/2023/10/deskew/document.jpg)

### 标准化图像

1. 扫描的图像比较锐利。我们可以将图像转换为灰度，然后对图像进行模糊处理。

   ```py
   img = cv2.imread(path)
   gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
   gray = cv2.GaussianBlur(gray, (9, 9), 0)
   ```

   ![模糊](/album/2023/10/deskew/blur.jpg)

2. 调整图像大小到固定高度。

   ```py
   resized_height = 480
   percent = resized_height / len(img)
   resized_width = int(percent * len(img[0]))
   gray = cv2.resize(gray,(resized_width,resized_height))
   ```

   ![调整大小](/album/2023/10/deskew/resized.jpg)

3. 在图像边缘绘制一个矩形以去除边框线。

   ```py
   start_point = (0, 0)
   end_point = (gray.shape[0], gray.shape[1])
   color = (255, 255, 255)
   thickness = 10
   gray = cv2.rectangle(gray, start_point, end_point, color, thickness)
   ```

   ![裁剪的](/album/2023/10/deskew/cropped.jpg)

4. 反转图像颜色，以便于处理黑色的文本。

   ```py
   gray = cv2.bitwise_not(gray)
   ```

   ![反转的](/album/2023/10/deskew/inverted.jpg)

5. 运行阈值处理以获得黑白图像。

   ```py
   thresh = cv2.threshold(gray, 0, 255,
           cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
   ```

   ![阈值](/album/2023/10/deskew/thresh.jpg)

6. 膨胀文本以使文本行更加明显。

   ```py
   kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 5))
   dilate = cv2.dilate(thresh, kernel)
   ```

   ![膨胀的](/album/2023/10/deskew/dilate.jpg)


### 获取倾斜角度

1. 在膨胀后的图像上查找所有轮廓。

   ```py
   contours, hierarchy = cv2.findContours(dilate, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
   ```

2. 使用`minAreaRec`获取轮廓的旋转角度。

   ```py
   angles = []
   for contour in contours:
       minAreaRect = cv2.minAreaRect(contour)
       angle = minAreaRect[-1]
       if angle != 90.0 and angle != -0.0: #filter out 0 and 90
           angles.append(angle)
   ```

3. 使用中位数作为倾斜角度。

   ```py
   angles.sort()
   mid_angle = angles[int(len(angles)/2)]
   ```

### 旋转图像以获得纠正好的图像

在得到偏斜的角度后，我们可以进行仿射变换来获得纠正好的图像。

```py
if angle > 45: #anti-clockwise
        angle = -(90 - angle)
height = original.shape[0]
width = original.shape[1]
m = cv2.getRotationMatrix2D((width / 2, height / 2), angle, 1)
deskewed = cv2.warpAffine(original, m, (width, height), borderValue=(255,255,255))
```

![去倾斜后的](/album/2023/10/deskew/deskewed.jpg)

## 使用Dynamic Web TWAIN纠正扫描的文档

很多现有的工具可以纠正倾斜的文档。[Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview)是一个JavaScript库，用于在浏览器中扫描文档。它可以通过TWAIN、WIA、SANE和ICA等协议从文档扫描仪获取文档图像。它包含了一个文档纠正功能。

可以使用下面的代码来纠正图像。

```js
function Deskew(index) {
  return new Promise((resolve, reject) => {
    DWObject.GetSkewAngle(
      index,
      function(angle) {
        console.log("skew angle: " + angle);
        DWObject.Rotate(index, angle, true,
          function() {
            console.log("Successfully deskewed an image!");
            resolve();
          },
          function(errorCode, errorString) {
            console.log(errorString);
            reject(errorString);
          }
        );
      },
      function(errorCode, errorString) {
        console.log(errorString);
        reject(errorString);
      }
    );
  })
}
```

[在线demo](https://tony-xlh.github.io/deskew)。它可以加载图像或PDF文件，并将文档保存在PDF文件中。


## 源代码

可以在以下仓库中找到所有代码：

<https://github.com/tony-xlh/deskew>






