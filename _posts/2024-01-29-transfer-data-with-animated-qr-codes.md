---
layout: post
title: "使用多个二维码传输数据"
date: 2024-01-29 14:40:53 +0800
categories: 条码扫描
tags: 
---

二维码可用于跨设备传输数据。比如Android设备可以通过二维码与iOS设备交换数据。它不需要设置无线网络，也不需要使用蓝牙进行配对。由于它是一种屏幕-摄像头解决方案，因此使用起来也很安全。

在字节模式下，版本40的QR二维码，纠错级别设为低时，最多可存储2953个字节，这对于传输网页链接、驾驶执照信息等数据来说已经足够了。

如果我们想使用二维码传输更多数据，该怎么办？

我们可以将数据分成几个二维码，并通过解码这些二维码来获取整个数据。我们可以将这些二维码打印在一张纸上，也可以在屏幕上循环显示多个二维码（动态二维码）。[Dynamsoft Barcode Reader (DBR)](https://www.dynamsoft.com/barcode-reader/overview/)能够在一张图像中读取多个二维码，也可以从视频流扫描二维码。

在本文中，我们将重点介绍使用动态二维码传输数据。

已经有不少相关的项目，其中一项比较有名的是[TXQR](https://github.com/divan/txqr/)。它使用喷泉码（fountain codes）为数据添加冗余，因此漏读几帧不会影响最终数据的获取。在使用喷泉码之前，它使用的是循环显示二维码的模式。该程序用Go语言实现。

不过，使用喷泉码会给流程带来额外的复杂性。实际上，如果有一个好的条码读取 SDK，循环显示二维码的模式也能达到令人满意的速度。在下面的部分中，我们将用JavaScript创建一个动态二维码生成器和一个动态二维码读取器。用户可以选择一个文件，用动态二维码编码，再用另一台设备去获取数据。

## 动态二维码生成器

要传输的文件首先被读取为字节，并按固定的大小划分为区块。每个区块的开头还会附加一个元数据信息。元数据的内容很简单。内容是区块的索引和区块总数。如果区块是第一个区块，则还会附加文件名和MIME类型。

区块示例：

1. "1/11\|example.webp\|image/webp\|字节"
2. "2/11\|字节"
2. "3/11\|字节"

在创建区块后，我们使用一个[JavaScript库](https://github.com/kazuhikoarase/qrcode-generator/tree/master/js)生成所有区块的二维码，并在页面中播放这些码。

用户可以调整区块大小和动画间隔以优化读取效果。

以下是代码的关键部分。

```html
<input type="file" id="file" onchange="loadfile()"/>
<label for="name">Chunk size (bytes):</label>
<input type="text" id="chunkSize" name="chunkSize" value="2000">
<label for="name">Extra interval (ms):</label>
<input type="text" id="interval" name="interval" value="200">
<div id="placeHolder"></div>
<script>
qrcode.stringToBytes = function(data) { return data; }; //store bytes directly
function loadfile() {
    let files = document.getElementById('file').files;
    if (files.length == 0) {
        return;
    }
    var file = files[0];
    fileReader = new FileReader();
    fileReader.onload = function(e){
        loadArrayBufferToChunks(e.target.result,file.name,file.type);
        showAnimatedQRCode();
    };
    fileReader.onerror = function () {
        console.warn('oops, something went wrong.');
    };
    fileReader.readAsArrayBuffer(file);
}

function loadArrayBufferToChunks(bytes,filename,type){
    var bytes = new Uint8Array(bytes);
    var data = concatTypedArrays(stringToBytes(encodeURIComponent(filename)+"|"+type+"|"),bytes); //The filename is encoded for non-ascii characters like Chinese.
    var chunkSize = parseInt(document.getElementById("chunkSize").value);
    var num = Math.ceil(data.length / chunkSize)
    chunks=[];
    for (var i=0;i<num;i++){
        var start = i*chunkSize;
        var chunk = data.slice(start,start+chunkSize);
        var meta = (i+1)+"/"+num+"|";
        chunk = concatTypedArrays(stringToBytes(meta),chunk);
        chunks.push(chunk);
    }
}

function showAnimatedQRCode(){
    createQRCode(chunks[currentIndex]);
    currentIndex = currentIndex + 1
    var interval = parseInt(document.getElementById("interval").value)
    setTimeout("showAnimatedQRCode()",interval);
}

function createQRCode(data){
    var typeNumber = 0;
    var errorCorrectionLevel = 'L';
    var qr = qrcode(typeNumber, errorCorrectionLevel);
    qr.addData(data);
    qr.make();
    var placeHolder = document.getElementById('placeHolder');
    placeHolder.innerHTML = qr.createSvgTag(); // or createImgTag
}

function stringToBytes(s) {
    var bytes = [];
    for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
    }
    return bytes;
}

//https://stackoverflow.com/questions/33702838/how-to-append-bytes-multi-bytes-and-buffer-to-arraybuffer-in-javascript
function concatTypedArrays(a, b) { //array + unint8 array
    var newLength = a.length + b.byteLength;
    console.log(newLength);
    var c = new Uint8Array(newLength);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}
</script>
```

## 动态二维码读取器

生成器编写好后，我们还需要一个读取器。我们可以使用Dynamsoft Barcode Reader的[移动SDK](https://www.dynamsoft.com/barcode-reader/sdk-mobile/)创建高性能的原生移动应用。不过为了方便演示和使用，这里我们将使用[JavaScript版](https://www.dynamsoft.com/barcode-reader/sdk-javascript/)的Dynamsoft Barcode Reader来创建一个网页版的读取器。

### 从视频流中读取二维码

JavaScript版本的Dynamsoft Barcode Reader使用方法简单。我们可以使用以下代码从视频流中读取二维码。

```html
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
    <script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.0.0/dist/dbr.js"></script>
</head>
<body>
<input type="button" value="Start Scanning" onclick="startScanning();" />
<script>
Dynamsoft.DBR.BarcodeReader.license = 'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==';
let scanner = null;
init();
async function init(){
    scanner = await Dynamsoft.DBR.BarcodeScanner.createInstance();
    scanner.onFrameRead = results => {
        //handle barcode results
    };
    scanner.onUniqueRead = (txt, result) => {
    };
}

async function startScanning(){
    if (scanner==null){
        alert("Please wait for the initialization of the scanner.")
        return;
    }
    await scanner.show();
}
</script>
</body>
</html>
```

### 读取区块并还原原始数据

现在，我们需要解析二维码的数据，并在收到所有块后尝试恢复数据。

```js
var total = 0;
var code_results = {};
function processRead(result){
    var text = result["barcodeText"];
    try {
        var meta = text.split("|")[0];
        var totalOfThisOne = parseInt(meta.split("/")[1]);
        if (total!=0){
            if (total != totalOfThisOne){ //QR codes for another file
                total = totalOfThisOne;
                code_results={};
                return;
            }
        }

        total = totalOfThisOne;
        var index = parseInt(meta.split("/")[0]);
        code_results[index]=result;
        if (getObjectLength(code_results)==total){
            onCompleted();
        }

    } catch(error) {
        console.log(error);
    }
}
function onCompleted(){
    showResult(timeElapsed);
}

async function showResult(timeElapsed){
    //combine chunks of bytes
    var jointData = [];
    for (var i=0;i<getObjectLength(code_results);i++){
        var index = i+1;
        var result = code_results[index];
        var bytes = result.barcodeBytes;
        var text = result.barcodeText;
        if (index == 1){
            var filename = text.split("|")[1]; //the first one contains progress|filename|image/webp|data
            var mimeType = text.split("|")[2];
            var firstSeparatorIndex = text.indexOf("|");
            var secondSeparatorIndex = text.indexOf("|",firstSeparatorIndex+1);
            var dataStart = text.indexOf("|",secondSeparatorIndex+1)+1;
            data = bytes.slice(dataStart,bytes.length);
        }else{
            var dataStart = text.indexOf("|")+1;
            data = bytes.slice(dataStart,bytes.length);
        }
        jointData = jointData.concat(data);
    }
    //display results on the page
    //...
    resetResults();
}

function resetResults(){
    code_results={};
    total = 0;
}
```

解码的结果会以列表形式显示在网页上。

每个列表项包含文件的下载链接、扫描花费的时间和传输速度。如果文件是图像，会把它显示在img元素里。

HTML：

```html
<div id="decodedResults">
    Results:
    <ol id="decodedList">
    </ol>
</div>
```

JavaScript：

```js
async function showResult(timeElapsed){
    //......
    var decodedList = document.getElementById("decodedList");
    var item = document.createElement("li");
    decodedList.appendChild(item);
    var dataURL = await ArraybufferAsDataURL(jointData,mimeType);
    appendDownloadLink(item, dataURL,filename);
    var info = document.createElement("span");
    info.innerText = " elapsed time: " + timeElapsed + "ms" +" speed: "+ (jointData.length/1024/(timeElapsed/1000)).toFixed(2) +"KB/s";
    item.appendChild(info);
    if (dataURL.indexOf("image")!=-1) {
        var img = document.createElement("img");
        img.src = dataURL;
        img.style.display = "block";
        img.style.maxHeight = "350px";
        img.style.maxWidth = "100%";
        item.appendChild(img);
    }
}

//https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
const ArraybufferAsDataURL = async (data,mimeType) => {
    // Use a FileReader to generate a base64 data URI
    const dataUrl = await new Promise((r) => {
        const reader = new FileReader()
        reader.onload = () => r(reader.result)
        var array = ConvertToUInt8Array(data);
        var blob = new Blob([array],{type: mimeType});
        reader.readAsDataURL(blob)
    })
    return dataUrl;
}

function ConvertToUInt8Array(data){
    var array = new Uint8Array(data.length);
    for (var i=0;i<data.length;i++){
        array[i] = data[i];
    }
    return array;
}

function appendDownloadLink(item, dataURL,filename){
    var link = document.createElement('a');
    link.setAttribute('target', '_blank');
    link.setAttribute('href', dataURL);
    if (!filename){
        filename = "file";
    }
    link.setAttribute('download', filename);
    link.innerText=filename;
    item.appendChild(link);
}

function getObjectLength(obj){
    return getObjectKeys(obj).length;
}

function getObjectKeys(obj){
    return Object.keys(obj);
}
```

在解码过程中，它还将显示经过的时间、处理的帧、成功读取的帧和进度等统计信息。

```js
function updateStatistics(timeElapsed){
    var statisticsPre = document.getElementById("statisticsPre");
    statistics = "elapsed time: " + (timeElapsed)/1000 +"s";
    statistics = statistics +"\ntotal frame number: " + framesRead;
    statistics = statistics +"\nsuccessful number: " + successNum;
    statistics = statistics +"\nsuccess fps: " + (successNum/(timeElapsed/1000)).toFixed(2);
    statistics = statistics +"\nprogress: " + getObjectLength(code_results) + "/" + total;
    statisticsPre.innerHTML=statistics;
}
```


### 定义UI

扫描界面是可自定义的。

创建一个scanner元素，然后用以下代码绑定该元素：

```js
await scanner.setUIElement(document.getElementById('scanner'));
```


有几个预定义的类：`dce-video-container`、`dce-scanarea`、`dce-sel-camera`、`dce-sel-resolution`…… Dynamsoft Barcode Reader将找到并使用它们（如果存在）。

扫描界面的元素：

```html
<div id="scanner" style="display:none;">
    <svg class="dce-bg-loading"
        style="display:none;position:absolute;left:0;top:0;right:0;bottom:0;margin:auto;width:40%;height:40%;fill:#aaa;animation:1s linear infinite dce-rotate;"
        viewBox="0 0 1792 1792">
        <path d="M1760 896q0 176-68.5 336t-184 275.5-275.5 184-336 68.5-336-68.5-275.5-184-184-275.5-68.5-336q0-213 97-398.5t265-305.5 374-151v228q-221 45-366.5 221t-145.5 406q0 130 51 248.5t136.5 204 204 136.5 248.5 51 248.5-51 204-136.5 136.5-204 51-248.5q0-230-145.5-406t-366.5-221v-228q206 31 374 151t265 305.5 97 398.5z" />
    </svg>
    <svg class="dce-bg-camera"
        style="display:none;position:absolute;left:0;top:0;right:0;bottom:0;margin:auto;width:40%;height:40%;fill:#aaa;"
        viewBox="0 0 2048 1792">
        <path d="M1024 672q119 0 203.5 84.5t84.5 203.5-84.5 203.5-203.5 84.5-203.5-84.5-84.5-203.5 84.5-203.5 203.5-84.5zm704-416q106 0 181 75t75 181v896q0 106-75 181t-181 75h-1408q-106 0-181-75t-75-181v-896q0-106 75-181t181-75h224l51-136q19-49 69.5-84.5t103.5-35.5h512q53 0 103.5 35.5t69.5 84.5l51 136h224zm-704 1152q185 0 316.5-131.5t131.5-316.5-131.5-316.5-316.5-131.5-316.5 131.5-131.5 316.5 131.5 316.5 316.5 131.5z" />
    </svg>
    <div class="dce-video-container" style="position:absolute;left:0;top:0;width:100%;height:100%;"></div>
    <div class="dce-scanarea" style="position:absolute;left:0;top:0;width:100%;height:100%;">
        <div class="dce-scanlight" style="display:none;position:absolute;width:100%;height:3%;border-radius:50%;box-shadow:0px 0px 2vw 1px #00e5ff;background:#fff;animation:3s infinite dce-scanlight;user-select:none;"></div>
    </div>
    <div style="position: absolute;left: 0;top: 0;">
        <select class="dce-sel-camera" style="display: block;"></select>
        <select class="dce-sel-resolution" style="display: block;margin-top: 5px;"></select>
    </div>
    <input type="button" value="Stop" onclick="stop();"  style="position:absolute;right:0;top:0;"/>
</div>
```

如果不想显示某些元素，如高亮显示扫到的码的canvas，只需将其删除即可。

## 提高阅读速度

这种屏幕-摄像头解决方案的传输速度主要取决于读取器在固定时间内能捕捉和解码多少个二维码图像。

移动设备每秒可以捕获30帧，但解码一帧可能需要数百毫秒。解码性能对传输速度的影响较大。

有几种方法可以改善解码性能。Dynamsoft Barcode Reader提供了丰富的参数来优化特定使用场景的性能。

### 只扫描QR二维码

Dynamsoft Barcode Reader支持多种条码格式。我们可以更新它的设置，让它只扫描QR二维码，这样就不会花费额外的精力寻找其他条码格式。

```js
let settings = await scanner.getRuntimeSettings();
settings.barcodeFormatIds = Dynamsoft.DBR.EnumBarcodeFormat.BF_QR_CODE;
await scanner.updateRuntimeSettings(settings);
```

### 设置扫描区域

二维码只是整个视频帧的一部分。我们可以设置一个扫描区域，以便让二维码占据帧的大部分内容以减少背景的干扰。

```js
let settings = await scanner.getRuntimeSettings();
settings.region.regionMeasuredByPercentage = 1; //use percentage
var video = document.getElementsByTagName("video")[0];
if (video.videoHeight>video.videoWidth){
    settings.region.regionLeft = 0;
    settings.region.regionTop = 25;
    settings.region.regionRight = 100;
    settings.region.regionBottom = 75;
}else{
    settings.region.regionLeft = 25;
    settings.region.regionTop = 0;
    settings.region.regionRight = 75;
    settings.region.regionBottom = 100;
}
await scanner.updateRuntimeSettings(settings);
```

![扫描区域](/album/2021/01/animated-qr/scan_region.jpg)

### 使用更快的定位方法

Dynamsoft Barcode Reader提供多种条码定位方法。`Scan Directly`模式适用于使用手机读取二维码的场景。

```js
let settings = await scanner.getRuntimeSettings();
settings.localizationModes = [Dynamsoft.DBR.EnumLocalizationMode.LM_SCAN_DIRECTLY, 0, 0, 0, 0, 0, 0, 0, 0];
await scanner.updateRuntimeSettings(settings);
```

### Demo

以下是在iOS上运行的最终结果的演示视频：

![视频](/album/2021/01/animated-qr/video.gif)


## 测试和结论

做了一个测试，测试在iOS和安卓设备上不同区块大小（字节）和显示间隔（毫秒）下的性能。记录三次成功读取的速度（对于大文件，只有一个记录）。

以下是iPhone SE 2016的测试结果：

* 文件大小：15.93 KB，区块大小：1800，间隔时间：100，速度：6.90 KB/s、10.68 KB/s、5.35 KB/s
* 文件大小：15.93 KB，区块大小：1800，间隔时间：200，速度：7.22 KB/s、7.17 KB/s、7.47 KB/s
* 文件大小：15.93 KB，区块大小：1800，间隔时间：400，速度：3.94 KB/s、3.99 KB/s、3.90 KB/s
* 文件大小：15.93 KB，区块大小：1800，间隔时间：800，速度：2.09 KB/s、2.08 KB/s、2.05 KB/s
* 文件大小：15.93 KB，区块大小：2900，间隔时间：100，速度：16.38 KB/s、4.26 KB/s、8.56 KB/s
* 文件大小：15.93 KB，区块大小：2900，间隔时间：200，速度：11.25 KB/s、11.33 KB/s、11.32 KB/s
* 文件大小：15.93 KB，区块大小：2900，间隔时间：400，速度：6.78 KB/s、6.74 KB/s、6.74 KB/s
* 文件大小：15.93 KB，区块大小：2900，间隔时间：800，速度：3.56 KB/s、3.61 KB/s、3.70 KB/s
* 文件大小：231 KB，区块大小：1800，间隔时间：400，速度：3.01 KB/s
* 文件大小：231 KB，区块大小：2900，间隔时间：400，速度：2.12 KB/s


以下是Sharp AQUOS S2的测试结果（CPU性能较弱） ：

* 文件大小：15.93 KB，区块大小：1800，间隔时间：100，速度：1.15 KB/s、1.24 KB/s、0.74 KB/s
* 文件大小：15.93 KB，区块大小：1800，间隔时间：200，速度：2.18 KB/s、1.38 KB/s、1.91 KB/s
* 文件大小：15.93 KB，区块大小：1800，间隔时间：400，速度：3.44 KB/s、2.60 KB/s、4.06 KB/s
* 文件大小：15.93 KB，区块大小：1800，间隔时间：800，速度：2.03/KB/s、2.08 KB/s、2.07 KB/s
* 文件大小：15.93 KB，区块大小：2900，间隔时间：100，速度：1.05 KB/s、1.80 KB/s、0.93 KB/s
* 文件大小：15.93 KB，区块大小：2900，间隔时间：200，速度：5.42 KB/s、5.37 KB/s、9.19 KB/s
* 文件大小：15.93 KB，区块大小：2900，间隔时间：400，速度：5.93 KB/s、7.10 KB/s、3.12 KB/s
* 文件大小：15.93 KB，区块大小：2900，间隔时间：800，速度：3.90 KB/s、3.53 KB/s、3.68 KB/s
* 文件大小：231 KB，区块大小：1800，间隔时间：400，速度：2.06 KB/s
* 文件大小：231 KB，区块大小：2900，间隔时间：400，速度：1.05 KB/s

我们可以根据这个测试大致得出结论。

1. 该解决方案非常适合传输200KB以下的小型文件。由于速度有限，并且需要更多的二维码来对大文件进行编码，因此大文件扫描时漏帧的可能性很高。
2. 应相应地调整区块大小和显示间隔。如果区块大小和显示间隔较小，则生成器可以快速生成二维码，但读取器可能无法及时捕获它们。如果区块大小较大，则可以在同一时间跨度内传输更多数据，但读取器必须花费更多时间进行解码，并且可能会漏掉帧，尤其是对于低端设备。

此解决方案可以通过以下方式进行改进：

1. 通过使用新的条码格式（如彩色二维码）来提高速度，该格式可以提供更大的数据容量。
2. 通过使用喷泉码来改善漏帧的问题。
3. 通过将当前的单向通信转换为双向通信，使生成器仅显示未扫描的二维码，从而改善漏帧问题。这可以通过使用生成器扫描读取器屏幕上显示的二维码来完成。
4. 使用数据压缩。例如如果要传输图片，可以用WebP进行压缩。([转换工具](https://www.dynamsoft.com/codepool/python-webp-conversion-gui-tool.html))

## 源代码

<https://github.com/xulihang/AnimatedQRCodeReader>

