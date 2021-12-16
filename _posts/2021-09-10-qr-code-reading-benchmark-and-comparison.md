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

该工具使用Python编写，并提供一个网页界面。使用了Flask Web框架。

可以在[这里](https://github.com/xulihang/Barcode-Reading-Performance-Test)找到它的代码。

测试将在配备 Intel i5-10400 CPU 和 16GB 内存的 PC 设备上运行。


## 评估的类库

我们将评估 7 个类库和SDK：

1. [Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/) （DBR，版本：8.6，商业软件）
2. Commercial SDK A（版本：Java 13.5，商业软件）
3. Commercial SDK B（版本：Windows 5.19.3.10，商业软件）
4. [BoofCV](https://boofcv.org)（版本：pyboof 0.36.1，开源软件）
5. [Zxing](https://github.com/zxing/zxing)（版本：3.4.1，开源软件）
6. [Zbar](https://pypi.org/project/pyzbar/)（版本：pyzbar 0.1.8，开源软件）
7. [OpenCV中的微信二维码检测器](https://github.com/opencv/opencv_contrib/tree/master/modules/wechat_qrcode)（版本：OpenCV 4.5.3，开源软件）

## 评价指标

性能由读取率和运行时间来评估。

通过将检测到的二维码数除以图像中的总二维码数，可以得到读取率。

```
读取率 = 检测到的二维码数 / 总二维码数
```

如何判断正确检测到了二维码？如果检测到的二维码的多边形和标注中的多边形区域的IoU值大于0，则可以判断该结果为正确。

以下是简化的代码：

```py
detected_ground_truth = []
for ground_truth in ground_truth_list:
    detected = False
    for detected_result in detected_result_list:
        if iou<=0.0: #if not overlapped
            continue
        else:
            detected = True
            break
    if detected:
        detected_ground_truth.append(ground_truth)
```

IoU使用以下代码计算：

```py
from shapely.geometry import Polygon

def calculate_polygon_iou(points1,points2):
    poly1 = Polygon(points1)
    poly2 = Polygon(points2)
    # ratio of intersection area to union area
    iou = poly1.intersection(poly2).area/poly1.union(poly2).area
    return iou

# convert localization results of x1, y1...x4, y4 to a list of points
def points_of_one_detection_result(result):
    p = [(float(result["x1"]), float(result["y1"])),
        (float(result["x2"]), float(result["y2"])),
        (float(result["x3"]), float(result["y3"])),
        (float(result["x4"]), float(result["y4"]))]  
    return p
```

由于所有库都能正确读取二维码的文本，因此这里不考虑二维码文本结果。

注:

Zxing仅返回二维码中位置模式的三个点的坐标。测试时会将三个点转换为多边形。由于本测试的IoU阈值较低，因此对结果基本没有影响。

![Zxing检测结果](/album/2021/qr_code_benchmark/zxing_result.jpg)

运行时间使用以下代码计算的：

```py
start_time = time.time()
result_dict = self.reader.decode_file(os.path.join(self.img_folder,filename))
end_time = time.time()
elapsedTime = int((end_time - start_time) * 1000)
```


## 检测结果

读取率（百分比）：

| 类别 | Dynamsoft | Commercial SDK A | Commercial SDK B | Zxing | Zbar | BoofCV | OpenCV Wechat |
|:-------------:|:-----:|:---------------:|:---------------:|:-----:|:-----:|:------:|:-------------:|
| 模糊（blurred） | 69.23 | 38.46 | 26.15 | 23.08 | 38.46 | 40.00 | 55.38 |
| 亮点（bright_spots） | 38.14 | 30.93 | 6.19 | 21.65 | 19.59 | 23.71 | 30.93 |
| 亮度变化（brightness） | 81.18 | 52.94 | 32.94 | 54.12 | 51.76 | 78.82 | 68.24 |
| 近距离（close） | 92.50 | 25.00 | 35.00 | 5.00 | 12.50 | 77.50 | 65.00 |
| 弯曲（curved） | 73.33 | 38.33 | 33.33 | 30.00 | 35.00 | 50.00 | 43.33 |
| 损坏（damaged） | 53.49 | 27.91 | 23.26 | 20.93 | 25.58 | 16.28 | 48.84 |
| 反光（glare） | 86.79 | 20.75 | 22.64 | 20.75 | 35.85 | 32.08 | 64.15 |
| 高版本（high_version） | 97.30 | 35.14 | 59.46 | 5.41 | 27.03 | 40.54 | 18.92 |
| 多码（lots） | 60.48 | 97.86 | 1.90 | 82.86 | 18.10 | 99.76 | 0.00 |
| 屏幕上显示（monitor） | 100 | 5.88 | 5.88 | 0.00 | 0.00 | 64.71 | 94.12 |
| 日常生活中（nominal） | 91.03 | 62.82 | 51.28 | 51.28 | 66.67 | 89.74 | 80.77 |
| 不标准（noncompliant） | 88.46 | 3.85 | 15.38 | 19.23 | 50.00 | 3.85 | 92.31 |
| 缺损（pathological） | 100 | 78.26 | 78.26 | 34.78 | 65.22 | 43.48 | 91.30 |
| 倾斜（perspective） | 68.57 | 34.29 | 51.43 | 37.14 | 42.86 | 82.86 | 42.86 |
| 旋转（rotations） | 99.25 | 67.67 | 63.91 | 42.86 | 49.62 | 96.99 | 82.71 |
| 阴影（shadows） | 100 | 95.00 | 80.00 | 65.00 | 90.00 | 85.00 | 85.00 |
| 平均 | 81.23 | 44.69 | 36.69 | 32.13 | 39.27 | 57.83 | 60.24 |

![读取率图表](/album/2021/qr_code_benchmark/reading_rate_1.svg)

![读取率图表](/album/2021/qr_code_benchmark/reading_rate_2.svg)


我们可以看到，Dynamsoft Barcode Reader在大多数类别中排名第一。它在不标准和倾斜类别中排名第二，在多码类别中排名第四。

注:某些类别的读取率不是很高，因为里面的一些二维码本来就是不可读。

## 运行时间结果

平均运行时间（毫秒，按图片）：

| SDK | 结果 |
|:---------------:|:------:|
| DBR | 141.10 |
| Commercial SDK A | 314.04 |
| Commercial SDK B | 48.31 |
| Zxing | 181.68 |
| Zbar | 199.26 |
| BoofCV | 205.48 |
| OpenCV Wechat | 175.06 |

![运行时间图表（按图片）](/album/2021/qr_code_benchmark/runtime.svg)


各分类平均运行时间（毫秒，按图片）：

| 类别 | Dynamsoft | Commercial SDK A | Commercial SDK B | Zxing | Zbar | BoofCV | OpenCV Wechat |
|:-------------:|:------:|:---------------:|:---------------:|:-------:|:-------:|:-------:|:-------------:|
| 模糊（blurred） | 298.00 | 335.16 | 39.67 | 206.89 | 177.58 | 138.16 | 125.31 |
| 亮点（bright_spots） | 252.84 | 625.47 | 47.56 | 311.59 | 319.81 | 221.81 | 112.25 |
| 亮度变化（brightness） | 192.75 | 600.14 | 47.86 | 320.32 | 349.79 | 273.43 | 134.79 |
| 近距离（close） | 169.40 | 607.27 | 80.08 | 295.18 | 381.65 | 150.70 | 676.00 |
| 弯曲（curved） | 188.76 | 300.82 | 43.40 | 173.44 | 220.28 | 103.42 | 129.54 |
| 损坏（damaged） | 200.03 | 205.49 | 42.05 | 84.41 | 96.76 | 46.14 | 138.35 |
| 反光（glare） | 104.66 | 217.60 | 45.40 | 130.32 | 157.30 | 70.80 | 95.38 |
| 高版本（high_version） | 106.06 | 349.21 | 79.88 | 294.97 | 141.70 | 268.36 | 566.03 |
| 多码（lots） | 275.43 | 851.14 | 110.14 | 1073.00 | 1477.57 | 6149.00 | 139.57 |
| 屏幕上显示（monitor） | 176.59 | 812.53 | 105.88 | 233.29 | 515.47 | 142.47 | 422.76 |
| 日常生活中（nominal） | 74.05 | 203.65 | 32.12 | 141.49 | 111.68 | 109.49 | 54.54 |
| 不标准（noncompliant） | 58.88 | 81.63 | 34.44 | 47.81 | 57.06 | 31.94 | 43.31 |
| 缺损（pathological） | 8.52 | 4.09 | 65.87 | 3.00 | 1.83 | 14.61 | 19.39 |
| 倾斜（perspective） | 25.74 | 46.34 | 14.91 | 27.66 | 24.31 | 26.74 | 24.60 |
| 旋转（rotations） | 72.11 | 173.84 | 35.80 | 106.84 | 134.66 | 178.45 | 86.91 |
| 阴影（shadows） | 102.21 | 243.50 | 42.29 | 150.00 | 163.29 | 117.50 | 86.36 |
| 平均 | 144.13 | 353.62 | 54.21 | 225.01 | 270.67 | 502.69 | 178.44 |

因为Boofcv花了很多时间来解多码类别，这里把多码类别的图表独立了出来。

![时间图表1](/album/2021/qr_code_benchmark/time_1.svg)

![时间图表2](/album/2021/qr_code_benchmark/time_2.svg)

![时间图表3](/album/2021/qr_code_benchmark/time_3.svg)

虽然商业SDK B在这一数据集上的读取率较低，但它是最快的。Dynamsoft Barcode Reader 平均处理时间排名第二。

## 更新运行时设置以改进结果

我们是在不改变SDK默认设置的情况下完成的基准测试。我们可以更改SDK的运行时设置以提高读取的准确性或速度。

在测试的类库和SDK中，只有Dynamsoft Barcode Reader提供了丰富的参数设置选项，用户可以根据不同的使用场景进行自定义和优化，以获得最佳的扫描性能。

DBR使用JSON模板修改运行时设置。以下是DBR Python中使用的默认模板。

```json
{
   "ImageParameter" : {
      "BarcodeColourModes" : [
         {
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "LightReflection" : 1,
            "Mode" : "BICM_DARK_ON_LIGHT"
         }
      ],
      "BarcodeComplementModes" : [
         {
            "Mode" : "BCM_SKIP"
         }
      ],
      "BarcodeFormatIds" : [ "BF_ALL" ],
      "BarcodeFormatIds_2" : null,
      "BinarizationModes" : [
         {
            "BlockSizeX" : 0,
            "BlockSizeY" : 0,
            "EnableFillBinaryVacancy" : 1,
            "ImagePreprocessingModesIndex" : -1,
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "Mode" : "BM_LOCAL_BLOCK",
            "ThresholdCompensation" : 10
         }
      ],
      "ColourClusteringModes" : [
         {
            "Mode" : "CCM_SKIP"
         }
      ],
      "ColourConversionModes" : [
         {
            "BlueChannelWeight" : -1,
            "GreenChannelWeight" : -1,
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "Mode" : "CICM_GENERAL",
            "RedChannelWeight" : -1
         }
      ],
      "DPMCodeReadingModes" : [
         {
            "Mode" : "DPMCRM_SKIP"
         }
      ],
      "DeblurLevel" : 9,
      "DeblurModes" : null,
      "DeformationResistingModes" : [
         {
            "Mode" : "DRM_SKIP"
         }
      ],
      "Description" : "",
      "ExpectedBarcodesCount" : 0,
      "FormatSpecificationNameArray" : null,
      "GrayscaleTransformationModes" : [
         {
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "Mode" : "GTM_ORIGINAL"
         }
      ],
      "ImagePreprocessingModes" : [
         {
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "Mode" : "IPM_GENERAL"
         }
      ],
      "IntermediateResultSavingMode" : {
         "Mode" : "IRSM_MEMORY"
      },
      "IntermediateResultTypes" : [ "IRT_NO_RESULT" ],
      "LocalizationModes" : [
         {
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "Mode" : "LM_CONNECTED_BLOCKS"
         },
         {
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "Mode" : "LM_SCAN_DIRECTLY",
            "ScanDirection" : 0,
            "ScanStride" : 0
         },
         {
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "Mode" : "LM_STATISTICS"
         },
         {
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "Mode" : "LM_LINES"
         }
      ],
      "MaxAlgorithmThreadCount" : 4,
      "Name" : "CurrentRuntimeSettings",
      "PDFRasterDPI" : 300,
      "PDFReadingMode" : {
         "Mode" : "PDFRM_AUTO"
      },
      "Pages" : "",
      "RegionDefinitionNameArray" : null,
      "RegionPredetectionModes" : [
         {
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "Mode" : "RPM_GENERAL"
         }
      ],
      "ResultCoordinateType" : "RCT_PIXEL",
      "ReturnBarcodeZoneClarity" : 0,
      "ScaleDownThreshold" : 2300,
      "ScaleUpModes" : [
         {
            "Mode" : "SUM_AUTO"
         }
      ],
      "TerminatePhase" : "TP_BARCODE_RECOGNIZED",
      "TextAssistedCorrectionMode" : {
         "BottomTextPercentageSize" : 0,
         "LeftTextPercentageSize" : 0,
         "LibraryFileName" : "",
         "LibraryParameters" : "",
         "Mode" : "TACM_VERIFYING",
         "RightTextPercentageSize" : 0,
         "TopTextPercentageSize" : 0
      },
      "TextFilterModes" : [
         {
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "MinImageDimension" : 65536,
            "Mode" : "TFM_GENERAL_CONTOUR",
            "Sensitivity" : 0
         }
      ],
      "TextResultOrderModes" : [
         {
            "Mode" : "TROM_CONFIDENCE"
         },
         {
            "Mode" : "TROM_POSITION"
         },
         {
            "Mode" : "TROM_FORMAT"
         }
      ],
      "TextureDetectionModes" : [
         {
            "LibraryFileName" : "",
            "LibraryParameters" : "",
            "Mode" : "TDM_GENERAL_WIDTH_CONCENTRATION",
            "Sensitivity" : 5
         }
      ],
      "Timeout" : 10000
   },
   "Version" : "3.0"
}
```

您可以在[此处](https://www.dynamsoft.com/barcode-reader/parameters/)了解有关 DBR 参数的更多信息。

### 修改模板以处理多码类别

在上述基准测试中，DBR无法检测到多码类别中的几个文件的所有QR码。

原因是这些图片中的QR码相对较小，图像分辨率较高（3024x4032），而在DBR的模板中，有一个`ScaleDownThreshold`参数，该参数设置为`2300`，图像会被缩小以获得更好的解码速度。

如果我们将`ScaleDownThreshold`设置为99999，所有二维码就都能被解出了。

![多码类别](/album/2021/qr_code_benchmark/lots.jpg)

使用修改后的模板，多码类别的读取率可以从60.48提高到100。

### 修改模板以处理模糊类别

DBR附带了许多图像处理算法。

对于如下所示的模糊QR码，我们可以先使用`GRAY_SMOOTH`这一图像处理方法，再去模糊来完成解码。

```json
"ImagePreprocessingModes" : [
    {
        "LibraryFileName": "",
        "LibraryParameters": "",
        "Mode": "IPM_GRAY_SMOOTH",
        "SmoothBlockSizeX": 3,
        "SmoothBlockSizeY": 3
    }
]
```

![模糊类别](/album/2021/qr_code_benchmark/blurred.jpg)

但是如果二维码太模糊，还是没有办法识别。在模糊类别中使用修改后的模板后，DBR只能额外解出一张图像。我们应该在图像获取时就尽量捕捉清晰的二维码图像。[Dynamsoft Camera Enhancer](https://www.dynamsoft.com/camera-enhancer/overview/)可以在这方面提供帮助。

## 结论

Dynamsoft Barcode Reader在本文的测试集上具有最佳的 QR 码读取准确性。它的速度表现亦可，并且有丰富的运行时设置以适应不同的场景。如果条件允许，最好选择DBR作为二维码识别的SDK。


