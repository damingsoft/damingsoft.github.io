---
layout: post
title: 二维码识别SDK性能测试与比较
date: 2021-09-10 14:00:53 +0800
categories: 条码扫描
tags: 基准测试
---

二维码广泛应用于我们的日常生活中。常见的二维码类型有QR Code、PDF417和DataMatrix。二维码可以存储比一维条码更多的数据。它通常需要使用相机捕获，然后用图像处理方法解码。

在现实世界中阅读二维码是很有挑战性的。例如下图中的二维码，它存在损坏、起皱，读取的难度会大大提高。

<img src="/album/2021/qr_code_benchmark/damaged_image027.jpg" alt="损坏的二维码" style="max-height: 300px;">

有许多可以读取二维码的开源和商业的类库或 SDK。我们需要进行基准测试来对它们进行评估以找到适合的SDK。

读取二维码基准测试不多。开源计算机视觉库Boofcv的作者做了一个较为全面的[测试](https://boofcv.org/index.php?title=Performance:QrCode)。他收集了一个QR图片集，并对它们做了分类。在这个图片集上进行性能测试，评估了五个开源类库。

该数据集有536幅图像，包含1232个二维码，共有16个类别：模糊、亮点、亮度变化、近距离、弯曲、损坏、反光、高版本、多码、屏幕上显示、日常生活中、不标准、缺损、倾斜、旋转和阴影。在本文中，我们将使用此数据集进行QR码的读取基准测试。

## 性能测试工具

为了运行基准测试，编写了一个性能测试工具。

可以在[这里](https://github.com/tony-xlh/barcode-reading-benchmark)找到它的代码。

测试将在配备 Intel i5-10400 CPU 和 16GB 内存的 PC 设备上运行。


## 评估的类库

我们将评估 7 个类库和SDK：

1. [Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/) （版本：9.6.20，商业软件）
2. Commercial SDK A（版本：6.16，商业软件）
3. Commercial SDK B（版本：13.9，商业软件）
4. [BoofCV](https://boofcv.org)（版本：0.43.1，开源软件）
5. [ZXing](https://github.com/zxing/zxing)（版本：3.5.1，开源软件）
6. [ZBar](https://pypi.org/project/pyzbar/)（版本：pyzbar 0.1.9，开源软件）
7. [OpenCV中的微信二维码检测器](https://github.com/opencv/opencv_contrib/tree/master/modules/wechat_qrcode)（版本：OpenCV 4.7.0.72，开源软件）

如果SDK支持多种条码格式，则修改其解码设置为仅解码QR码。

## 评价指标

## 评价指标

性能由读取率和运行时间来评估。

通过将检测到的二维码数除以图像中的总二维码数，可以得到读取率。

```
读取率 = 检测到的二维码数 / 总二维码数
```

如何判断正确检测到了二维码？如果检测到的二维码的多边形和标注中的多边形区域的存在重叠，则可以判断该结果为正确。

以下是该操作的简要版代码：

```ts
function isDetected(barcodeResult){
  for (let j = 0; j < groundTruthList.length; j++) {
    const groundTruth = groundTruthList[j];
    let percent;
    const points1 = getPointsFromBarcodeResultResult(barcodeResult);
    const points2 = getPointsFromGroundTruth(groundTruth);
    percent = overlappingPercent(points1,points2);
    if (percent > 0.20) {
      return true;
    }
  }
  return false;
}
```

重叠百分比使用以下代码计算：

```ts
export function overlappingPercent(pts1:Point[] ,pts2:Point[]) : number {
  const rect1 = getRectFromPoints(pts1);
  const rect2 = getRectFromPoints(pts2);

  let leftRect;
  let rightRect;
  if (rect1.left<rect2.left) {
    leftRect = rect1;
    rightRect = rect2;
  }else{
    leftRect = rect2;
    rightRect = rect1;
  }
  let upperRect;
  let lowerRect;
  if (rect1.top<rect2.top) {
    upperRect = rect1;
    lowerRect = rect2;
  }else{
    upperRect = rect2;
    lowerRect = rect1;
  }
  if (leftRect.right > rightRect.left && upperRect.bottom>lowerRect.top) {
    const overlappedX = Math.min(leftRect.right,rightRect.right) - rightRect.left;
    const overlappedY = Math.min(upperRect.bottom,lowerRect.bottom) - lowerRect.top;
    const overlappedArea = overlappedX * overlappedY;
    const area1 = rect1.width * rect1.height;
    const area2 = rect2.width * rect2.height;
    const smallerArea = Math.min(area1,area2);
    return overlappedArea/smallerArea;
  }else{
    return 0;
  }
}
```

由于所有库都能正确读取二维码的文本，因此这里不考虑二维码文本结果。

注:

ZXing仅返回二维码中位置模式的三个点的坐标。测试时会将三个点转换为多边形。

![ZXing检测结果](/album/2021/qr_code_benchmark/zxing_result.jpg)

运行时间使用以下代码计算的：

```py
start_time = time.time()
results = self.reader.decode_bytes(file_bytes)
end_time = time.time()
elapsedTime = int((end_time - start_time) * 1000)
```

## 检测结果

不同分类的读取率（百分比）：

| 类别 | Dynamsoft | BoofCV | ZXing | ZBar | OpenCV WeChat | Commercial SDK A | Commercial SDK B |
|:-------------:|:---------:|:------:|:-----:|:-----:|:-------------:|:----------------:|:----------------:|
| 模糊（blurred） | **66.15** | 38.46 | 21.54 | 35.38 | 46.15 | 33.85 | 36.92 |
| 亮度变化（brightness） | **81.18** | 78.82 | 52.94 | 50.59 | 23.53 | 52.94 | 51.76 |
| 亮点（bright_spots） | **43.3** | 27.84 | 20.62 | 19.59 | 24.74 | 8.25 | 29.9 |
| 近距离（close） | 95 | **100** | 5 | 12.5 | 67.5 | 22.5 | 25 |
| 弯曲（curved） | **70** | 56.67 | 31.67 | 35 | 43.33 | 31.67 | 36.67 |
| 损坏（damaged）[](#damaged) | **51.16** | 16.28 | 20.93 | 25.58 | 30.23 | 27.91 | 27.91 |
| 反光（glare） | **84.91** | 32.08 | 20.75 | 35.85 | 58.49 | 43.4 | 20.75 |
| 高版本（high_version）[](#highversion) | **97.3** | 40.54 | 5.41 | 27.03 | 18.92 | 78.38 | 35.14 |
| 多码（lots）[](#lots) | **100** | 99.76 | 82.86 | 18.1 | 0 | 14.52 | 97.14 |
| 屏幕上显示（monitor） | **100** | 82.35 | 0 | 0 | 94.12 | 11.76 | 5.88 |
| 日常生活中（nominal） | **93.59** | 89.74 | 53.85 | 66.67 | 71.79 | 64.1 | 65.38 |
| 不标准（noncompliant）[](#noncompliant) | **92.31** | 3.85 | 15.38 | 50 | 76.92 | 61.54 | 11.54 |
| 缺损（pathological）[](#pathological) | **95.65** | 43.48 | 34.78 | 65.22 | 91.3 | 0 | 78.26 |
| 倾斜（perspective） | 62.86 | **80** | 37.14 | 42.86 | 42.86 | 65.71 | 34.29 |
| 旋转（rotations） | **99.25** | 96.24 | 42.11 | 48.87 | 32.33 | 99.25 | 69.17 |
| 阴影（shadows） | **100** | 85 | 65 | 90 | 60 | 90 | 95 |
| 平均 | **83.29** | 60.69 | 31.87 | 38.95 | 48.89 | 44.11 | 45.04 |


<style>
  .swiper {
    width: 650px;
    height: calc(100% * 0.61);
    max-width: 100%;
    max-height: calc(100% * 0.61);
  }

  .swiper-slide {
    text-align: center;
    font-size: 18px;
    background: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .swiper-slide img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding-left: 1em;
  }

  @media screen and (max-device-width: 600px){
    .swiper-slide img {
      padding-left: 0;
    }
  }
</style>
<div class="swiper mySwiper">
  <div class="swiper-wrapper">
    <div class="swiper-slide">
      <img alt="模糊（blurred）" src="/album/2021/qr_code_benchmark/reading-rate-charts/blurred.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="亮点（bright_spots）" src="/album/2021/qr_code_benchmark/reading-rate-charts/bright_spots.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="亮度变化（brightness）" src="/album/2021/qr_code_benchmark/reading-rate-charts/brightness.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="近距离（close）" src="/album/2021/qr_code_benchmark/reading-rate-charts/close.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="弯曲（curved）" src="/album/2021/qr_code_benchmark/reading-rate-charts/curved.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="损坏（damaged）" src="/album/2021/qr_code_benchmark/reading-rate-charts/damaged.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="反光（glare）" src="/album/2021/qr_code_benchmark/reading-rate-charts/glare.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="高版本（high_version）" src="/album/2021/qr_code_benchmark/reading-rate-charts/high_version.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="多码（lots）" src="/album/2021/qr_code_benchmark/reading-rate-charts/lots.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="屏幕上显示（monitor）" src="/album/2021/qr_code_benchmark/reading-rate-charts/monitor.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="日常生活中（nominal）" src="/album/2021/qr_code_benchmark/reading-rate-charts/nominal.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="不标准（noncompliant）" src="/album/2021/qr_code_benchmark/reading-rate-charts/noncompliant.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="缺损（pathological）" src="/album/2021/qr_code_benchmark/reading-rate-charts/pathological.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="倾斜（perspective）" src="/album/2021/qr_code_benchmark/reading-rate-charts/perspective.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="旋转（rotations）" src="/album/2021/qr_code_benchmark/reading-rate-charts/rotations.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="阴影（shadows）" src="/album/2021/qr_code_benchmark/reading-rate-charts/shadows.svg"/>
    </div>
    <div class="swiper-slide">
      <img alt="平均" src="/album/2021/qr_code_benchmark/reading-rate-charts/total_average.svg"/>
    </div>
  </div>
  <div class="swiper-button-next"></div>
  <div class="swiper-button-prev"></div>
</div>
<link rel="stylesheet" href="https://unpkg.com/swiper@9/swiper-bundle.min.css" />
<!-- Swiper JS -->
<script src="https://unpkg.com/swiper@9/swiper-bundle.min.js"></script>
<!-- Initialize Swiper -->
<script>
  var swiper = new Swiper(".mySwiper", {
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
  });
</script>

我们可以看到，Dynamsoft Barcode Reader在大多数类别中排名第一。它在近距离类中排名第二，在透视类中排名第三。

注:某些类别的读取率不是很高，因为里面的一些二维码本来就是不可读。

## 运行时间结果

平均运行时间（毫秒，按图片）：

| SDK | 结果 |
|:----------------:|:-------:|
| Dynamsoft | 195.01 |
| Commercial SDK A | 1400.43 |
| Commercial SDK B | 346.27 |
| ZXing | 179.57 |
| ZBar | 157.31 |
| BoofCV | 104.95 |
| OpenCV Wechat | 757.71 |

![运行时间图表（按图片）](/album/2021/qr_code_benchmark/runtime.svg)

## 结论

我们可以看到，Dynamsoft Barcode Reader的二维码读取率是测试集中最好的，速度也相当不错。如果条件允许，最好选择它作为二维码识别的SDK。

可以在[这里](https://tony-xlh.github.io/barcode-dataset/benchmark/#/project/QRCode)浏览具体的测试结果。

