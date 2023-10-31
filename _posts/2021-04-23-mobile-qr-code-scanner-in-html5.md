---
layout: post
title: 网页版二维码扫描器
date: 2021-04-23 10:58:53 +0800
categories: 条码扫描
---

QR码是最常见的一种二维码，最初应用于汽车行业[^wiki]，到现在已经被应用于各种使用场景。QR码可以编码比1D条形码更丰富的内容，比如网站URL、一张小图片。它们可以显示在屏幕上，也可以印刷在海报、包装盒等上。人们可以使用手机轻松地对其进行扫描。

<img src="/album/2021/dynamsoft-qr-code.png" width="300px" alt="Dynamsoft二维码扫描器"/>

Dynamsoft Barcode Reader（DBR）对二维码有很好的支持，并且在[2017年5月25日](https://www.dynamsoft.com/barcode-reader/programming/javascript/release-notes/js-7.html?ver=latest#51-05252017)，它添加了对JavaScript的支持。使用DBR可以轻松、快速、准确地创建一个移动版二维码扫描网页应用。由于它是基于HTML5的，用户不必下载和安装应用程序，而且可以很容易地将其集成到用户的应用中，在不同的平台上运行。

有一个[在线版移动扫描demo](https://demo.dynamsoft.com/barcode-reader-js/)可供试用。这是个纯前端应用，完全依赖于终端设备进行计算。它可以使用内置相机进行扫描或从图库中读取条形码。

我们可以很容易地创建自己的移动扫描应用。[GitHub](https://github.com/Dynamsoft/javascript-barcode/)​​上有很多示例。有些示例演示了如何将DBR与Vue、React和Angular结合使用。有些被设计成PWA或混合应用程序。我们可以从基础示例开始创建应用：[helloworld.html](https://github.com/Dynamsoft/javascript-barcode/blob/master/example/web/helloworld.html)。

让我们更详细地分析一下这个示例。

## Helloworld示例

首先引入DBR的JS文件。

```html
<!-- Please visit https://www.dynamsoft.com/customer/license/trialLicense to get a trial license. -->
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@8.1.3/dist/dbr.js" data-productKeys="PRODUCT-KEYS"></script>
```

该页面包含一个显示扫描界面的按钮和一个解码本地图像的按钮。

HTML：

```html
Choose image(s) to decode:
<input id="ipt-file" type="file" multiple accept="image/png,image/jpeg,image/bmp,image/gif">
<br><br>
<button id="btn-show-scanner">show scanner</button>
```

JavaScript：

```js
// reader for decoding picture
let reader = null;
// scanner for decoding video
let scanner = null;

// decode input picture
document.getElementById('ipt-file').addEventListener('change', async function(){
    try{
        reader = reader || await Dynamsoft.DBR.BarcodeReader.createInstance();
        let resultsToAlert = [];
        for(let i = 0; i < this.files.length; ++i){
            let file = this.files[i];
            resultsToAlert.push(i + '. ' + file.name + ":");
            let results = await reader.decode(file);
            console.log(results);
            for(let result of results){
                resultsToAlert.push(result.barcodeText);
            }
        }
        alert(resultsToAlert.join('\n'));
    }catch(ex){
        alert(ex.message);
        throw ex;
    }
    this.value = '';
});

// decode video from camera
document.getElementById('btn-show-scanner').addEventListener('click', async () => {
    try{
        scanner = scanner || await Dynamsoft.DBR.BarcodeScanner.createInstance();
        scanner.onFrameRead = results => {
            if(results.length){
                console.log(results);
            }
        };
        scanner.onUnduplicatedRead = (txt, result) => {
            alert(result.barcodeFormatString + ': ' + txt);
        };
        await scanner.show();
    }catch(ex){
        alert(ex.message);
        throw ex;
    }
});
```

扫描界面的代码存在于`dist/dbr.scanner.html`[^ui]：

您可以将其内容复制到你的HTML文件中，对其进行自定义并使用以下代码加载：

```js
scanner.setUIElement(scannerElement);
```

[在线Helloworld demo](https://dynamsoft-dbr.github.io/mobile-qr-code-html5/helloworld.html)。

## 解码QR码的运行时设置

可以为不同的场景修改运行时设置[^doc]。例如，如果我们只想扫描一个二维码，我们可以使用`updateRuntimeSettings`方法修改设置：

```js
let settings = await scanner.getRuntimeSettings();
settings.expectedBarcodesCount=1;
settings.barcodeFormatIds=Dynamsoft.DBR.EnumBarcodeFormat.BF_QR_CODE;
await scanner.updateRuntimeSettings(settings);
```

这样只有二维码会被识别。这也将提高解码速度。解码速度对实时视频流扫码至关重要。

在某些情况下，二维码可能不完整或变形。比如打印在塑料袋、撕坏收据上的二维码。DBR内置了[条码补全](https://www.dynamsoft.com/blog/announcement/auto-complement-qr-data-matrix-codes/)​​和[抗形变](https://www.dynamsoft.com/blog/announcement/auto-restore-crumpled-qr-codes/)算法来恢复这些​​二维码。

### 不完整的​​二维码

DBR能够智能地补全二维码缺失的部分。

<img src="/album/2021/qr-code-before.png" alt="不完整的​​二维码" width="300" />

对于上面这一不完整的二维码，我们可以在模板中添加`BarcodeComplementModes`参数来解码。

```json
{
    "Version":"3.0",
    "ImageParameter":
    {
        "Name": "default",
        "ExpectedBarcodesCount": 1,
        "MaxAlgorithmThreadCount": 4,
        "BarcodeFormatIds": [ "BF_QR_CODE" ],
        "BarcodeComplementModes": [
          {
            "Mode": "BCM_SKIP"
          },
          {
            "LibraryFileName": "",
            "LibraryParameters": "",
            "Mode": "BCM_GENERAL"
          }
        ]
    }
}
```

### 变形的​​二维码

DBR的图像处理算法可以提高褶皱和变形的​​二维码的解码成功率。

![变形的​​二维码](/album/2021/deformed-QR-code-blurred-symbol-outline.png)

对于上面这一变形的二维码，我们可以在模板中包含`DeformationResistingModes`参数来解码。

```json
{
    "Version":"3.0",
    "ImageParameter":
    {
        "Name": "default",
        "ExpectedBarcodesCount": 1,
        "MaxAlgorithmThreadCount": 4,
        "BarcodeFormatIds": [ "BF_QR_CODE" ],
        "DeformationResistingModes": [
          {
            "Mode": "DRM_SKIP"
          },
          {
            "Level": 5,
            "LibraryFileName": "",
            "LibraryParameters": "",
            "Mode": "DRM_GENERAL"
          }
        ]
    }
}
```

### 读取特定区域的二维码

另一个有用的设置是指定要读取的区域：

```js
let settings = await scanner.getRuntimeSettings();
/*
 * 1 means true
 * Using a percentage is easier
 * The following code shrinks the decoding region by 25% on all sides
 */
settings.region.regionMeasuredByPercentage = 1;
settings.region.regionLeft = 25;
settings.region.regionTop = 25;
settings.region.regionRight = 75;
settings.region.regionBottom = 75;
await scanner.updateRuntimeSettings(settings);
```
一个取景框将出现在视频流上方，用户可以将其对准二维码以进行读码。

![特定区域](/album/2021/specific-region.jpg)

## 一次扫描多个二维码

DBR能够一次读取多个二维码。

<img src="/album/2021/multiple-qr-codes.jpg" alt="多个二维码" width="600px" />

## 二维码的变体

DBR还支持QR二维码的其他变体（Micro QR码和型号1）。

![Micro QR码（作者创建的示例应用）](/album/2021/micro-qr-code.jpg)

## 补充内容

### 内置模板

DBR JS有四个内置模板：`速度（speed）`、`平衡（balance）`、`最大覆盖（coverage）`和`单码（single）`。

- 如果要进行实时扫描，`速度`模板非常适合。但是如果要解码的二维码太多或者图像很复杂，它可能会漏掉其中的一些。
- 那么`最大覆盖`模板是一个更好的选择，尽管它需要更多的计算时间。
- `平衡`模板同时考虑了速度和覆盖率。
- `单码`模板针对扫描一个条形码进行了优化。

要使用其中一个内置模板，请使用以下代码：

```js
await scanner.updateRuntimeSettings("<template>"); // template: single, speed, balance, coverage
```

### 创建自己的模板

你可以为你的特定用例创建自己的模板。可以用我们的[在线演示](https://demo.dynamsoft.com/barcode-reader/)尝试不同的参数。

一个JSON模板如下所示：

```js
{
    "Version":"3.0",
    "ImageParameter":
    {
        "Name": "default",
        "ExpectedBarcodesCount": 1,
        "BarcodeFormatIds": [ "BF_QR_CODE" ]
    }
}
```

我们可以用以下代码加载它：

```js
await scanner.initRuntimeSettingsWithString(templateString);
```

请注意，`initRuntimeSettingsWithString`仅在完整版中可用（[紧凑版和完整版之间的差异](https://www.dynamsoft.com/barcode-reader/programming/javascript/user-guide/features-requirements.html?ver=latest#compact-and-full-editions)）。

要启用完整功能，请将`_bUseFullFeature`属性设置为true：

```js
Dynamsoft.DBR.BarcodeReader._bUseFullFeature = true; // Control of loading min wasm or full wasm.
```

## 开始构建你的应用

下载[Dynamsoft Barcode Reader SDK](https://www.dynamsoft.com/barcode-reader/downloads/)并开始试用。

## 源代码

1. [JavaScript条形码扫描器的官方GitHub仓库](https://github.com/Dynamsoft/javascript-barcode)
2. [本文作者创建的示例应用](https://github.com/dynamsoft-dbr/mobile-qr-code-html5)


## 参考文献

[^wiki]: https://en.wikipedia.org/wiki/QR_code
[^ui]: https://github.com/Dynamsoft/javascript-barcode#customizing-the-ui
[^doc]: https://www.dynamsoft.com/barcode-reader/programming/javascript/user-guide/basic-customizations.html?ver=latest#configuring-scanner-settings
