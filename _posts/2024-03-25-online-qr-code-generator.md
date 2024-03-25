---
layout: post
title: "如何编写一个在线二维码生成器"
date: 2024-03-25 13:37:53 +0800
categories: 条码扫描
tags: 
description: 本文介绍了如何编写一个在线二维码生成器。与其他在线二维码生成器不同的是，它可以直接将文件以字节模式编码、可以指定文本编码、并支持结构化追加模式。
---

在[上一篇文章](https://devblogs.damingsoft.com/python-qr-code-generator/)，我们讨论了什么是QR二维码、QR二维码的数据编码模式以及如何用Python生成二维码。

在本文中，我们将编写一个在线二维码生成器，以便在浏览器中生成QR二维码。

我们将继续使用Python库segno来生成二维码。为了在浏览器中运行它，使用[pyodide](https://github.com/pyodide/pyodide)为浏览器提供Python环境。

[在线demo](https://tony-xlh.github.io/online-qr-code-generator/)

## 新建HTML文件

创建一个包含以下模板的新HTML文件。

```html
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online QR Code Generator</title>
    <style></style>
  </head>
  <body>
    <h2>QR Code Generator</h2>
    <script type="text/javascript"></script>
  </body>
</html>
```

## 配置Python环境

1. 在页面中加入pyodide。

   ```html
   <script type="text/javascript" src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"></script>
   ```

2. 加载pyodide。

   ```js
   let pyodide = await loadPyodide();
   ```

3. 加载`micropip`并用它来安装segno库。

   ```js
   await pyodide.loadPackage("micropip");
   const micropip = pyodide.pyimport("micropip");
   await micropip.install("segno");
   ```

4. 我们可以用以下测试代码生成 二维码并保存为SVG。

   ```js
   let code = `
   import io
   import segno
   qrcode = segno.make_qr("Text")
   buff = io.BytesIO()
   qrcode.save(buff, kind='svg')
   buff.getvalue().decode("utf-8")
   `;
   let result = await pyodide.runPython(code);
   ```

## 从TextArea或文件读取数据

接下来，让我们从TextArea或文件读取要编码的数据。

HTML元素：

```html
<label>
  Content:
  <select id="contentSelect">
    <option>Text</option>
    <option>Bytes</option>
  </select>
</label>
<br/>
<textarea>Hello!</textarea>
<input style="display:none" type="file" id="fileInput"/>
```

如果内容模式选择为`字节`，则以base64格式加载文件，并将其传递给segno以进行字节模式编码。否则，传递TextArea中的文本。

JavaScript：

```js
async function generateQRCodes(){
  let contentIsBytes = document.getElementById("contentSelect").selectedIndex;
  let base64_string = "";
  if (contentIsBytes == 1) {
    base64_string = await readFileAsBase64();
  }
  let content = document.querySelector("textarea").value;
  try {
    let code = `
import base64
import segno

content = '''`+content+`'''
base64_string = '''`+base64_string+`'''
if base64_string != '':
    content = base64.b64decode(base64_string)
qrcode = segno.make_qr(content)
import io
buff = io.BytesIO()
qrcode.save(buff, kind='svg')
buff.getvalue().decode("utf-8")
`;
    let result = await pyodide.runPython(code);
  }catch(error){
    alert(error);
  }
}

function readFileAsBase64() {
  return new Promise((resolve, reject) => {
    let fileInput = document.getElementById("fileInput");
    if (fileInput.files.length>0) {
      let file = fileInput.files[0];
      let fileReader = new FileReader();
      fileReader.onload = function(e){
        let dataURL = e.target.result;
        let base64 = dataURL.substring(dataURL.indexOf(",")+1,dataURL.length);
        resolve(base64);
      };
      fileReader.onerror = function () {
        console.warn('oops, something went wrong.');
        reject();
      };
      fileReader.readAsDataURL(file);
    }else{
      reject();
    }
  })
}
```

## 指定二维码的模式

二维码有以下几种数据编码模式：数字、字母数字、日文汉字、字节和结构化追加。

我们可以使用结构化追加模式在多个二维码中存储数据。它将添加一些元数据，描述二维码的总页码和页面序号。如果我们需要存储的内容大于一个二维码的容量，或者如果只用一个二维码的话，二维码的版本会过高，导致难以打印和读取，那么我们可以使用这个模式。

这个库可根据输入自动决定使用哪种模式。但有时，我们可能需要手动指定模式。

1. 添加一些HTML元素，以指定二维码模式和结构化追加模式下的码的数量。

   ```html
   <label>
     Mode:
     <select id="modeSelect">
       <option value="auto">Auto</option>
       <option value="numeric">Numeric</option>
       <option value="alphanumeric">Alphanumeric</option>
       <option value="kanji">Kanji</option>
       <option value="byte">Byte</option>
       <option value="structuredappend">Structrued Append</option>
     </select>
   </label>
   <label>
     Expected QR Code count for Structured Append mode:
     <input style="width:50px" type="number" value="2" id="countInput"/>
   </label>
   ```

2. 在Python代码中使用模式的值。使用`segno.make_sequence`以结构化追加模式制作二维码，并以列表形式返回二维码。

   ```js
   let count = document.getElementById("countInput").value;
   let mode = document.getElementById("modeSelect").selectedOptions[0].value;
   try {
     let code = `
   import base64
   import segno

   mode = '`+mode+`'

   if mode == "auto":
       mode = None
   content = '''`+content+`'''

   base64_string = '''`+base64_string+`'''
   if base64_string != '':
       content = base64.b64decode(base64_string)

   qrcodes = []
   qrcode_svgs = []
   if mode == "structuredappend":
       qrcode_seq = segno.make_sequence(content,symbol_count=`+count+`)
       for qrcode in qrcode_seq:
           qrcodes.append(qrcode)
   else:
       qrcode = segno.make_qr(content,mode=mode)
       qrcodes.append(qrcode)
   import io
   for qrcode in qrcodes:
       buff = io.BytesIO()
       qrcode.save(buff, kind='svg')
       svg = buff.getvalue().decode("utf-8")
       qrcode_svgs.append(svg)
   qrcode_svgs
   `;
   let result = await pyodide.runPython(code);
   let svgs = result.toJs(); //convert the Python list to a JavaScript array
   ```

3. 然后，我们可以将二维码作为`img`元素添加到文档中。

   ```js
   let resultContainer = document.getElementById("result");
   resultContainer.innerHTML = "";
   for (let index = 0; index < svgs.length; index++) {
     const svg = svgs[index];
     let decoded = unescape(encodeURIComponent(svg));
     // Now we can use btoa to convert the svg to base64
     let base64 = btoa(decoded);
     let imgSource = `data:image/svg+xml;base64,${base64}`;
     let img = document.createElement("img");
     img.src = imgSource;
     img.className = "qrcode"
     img.style.width = document.getElementById("widthInput").value + "px";
     resultContainer.appendChild(img);
   }
   ```

## 指定纠错级别

QR二维码使用Reed-Solomon纠错技术，使得即使图像受损，我们仍然可以读取数据。

纠错分为四个级别。级别越高，二维码中添加的冗余数据就越多，从而使二维码更耐损坏。最高级别为 H，可恢复的数据字节百分比为 30%。


* L： 7%
* M： 15%
* Q： 25%
* H： 30%

1. 添加一些HTML元素，用于指定纠错级别。

   ```html
   <label>
     Error Correction Level:
     <select id="errorCorrectionLevelSelect">
       <option value="L">L(7%)</option>
       <option value="M">M(15%)</option>
       <option value="Q">Q(25%)</option>
       <option value="H">H(30%)</option>
     </select>
   </label>
   ```

2. 在Python代码中，设置纠错级别。

   ```py
   if mode == "structuredappend":
     qrcode_seq = segno.make_sequence(content,error=errorCorrectionLevel, symbol_count=`+count+`)
   else:
     qrcode = segno.make_qr(content,error=errorCorrectionLevel,mode=mode)
   ```

## 指定版本

QR二维码的版本从1到40不等。每个版本都有不同的模块配置或模块数量。版本越高，二维码的模块数量就越多，从而可以存储更多的数据。

1. 添加一些HTML元素，用于指定版本。

   ```html
   <label>
     Version:
     <select id="versionSelect">
       <option value="0">Auto</option>
     </select>
   </label>
   <script>
   loadVersions();
   function loadVersions(){
     const versionSelect = document.getElementById("versionSelect");
     for (let index = 1; index <= 40; index++) {
       const option = new Option(index,index);
       versionSelect.appendChild(option);
     }
   }
   </script>
   ```

2. 在Python代码中，设置版本。

   ```py
   if mode == "structuredappend":
     qrcode_seq = segno.make_sequence(content,error=errorCorrectionLevel, version=version, symbol_count=`+count+`)
   else:
     qrcode = segno.make_qr(content,error=errorCorrectionLevel, version=version, mode=mode)
   ```

## 指定字节模式下的文本编码

我们可以在字节模式下指定文本编码，以存储更多字符。例如，UTF-8编码一个汉字需要三个字节，而GBK编码一个汉字只需要两个字节。

1. 添加一些HTML元素来选择文本编码。编码列表来自[Python文档](https://docs.python.org/3.8/library/codecs.html#standard-encodings)，因为我们将使用Python对文本进行编码。

   ```html
   <label>
     Text Encoding in Byte Mode:
     <select id="encodingSelect">
     </select>
   </label>
   <script>
   loadEncodings();
   function loadEncodings(){
     const encodingSelect = document.getElementById("encodingSelect");
     const encodings = ["ascii","big5","big5hkscs","cp037","cp273","cp424","cp437","cp500","cp720","cp737","cp775","cp850","cp852","cp855","cp856","cp857","cp858","cp860","cp861","cp862","cp863","cp864","cp865","cp866","cp869","cp874","cp875","cp932","cp949","cp950","cp1006","cp1026","cp1125","cp1140","cp1250","cp1251","cp1252","cp1253","cp1254","cp1255","cp1256","cp1257","cp1258","euc_jp","euc_jis_2004","euc_jisx0213","euc_kr","gb2312","gbk","gb18030","hz","iso2022_jp","iso2022_jp_1","iso2022_jp_2","iso2022_jp_2004","iso2022_jp_3","iso2022_jp_ext","iso2022_kr","latin_1","iso8859_2","iso8859_3","iso8859_4","iso8859_5","iso8859_6","iso8859_7","iso8859_8","iso8859_9","iso8859_10","iso8859_11","iso8859_13","iso8859_14","iso8859_15","iso8859_16","johab","koi8_r","koi8_t","koi8_u","kz1048","mac_cyrillic","mac_greek","mac_iceland","mac_latin2","mac_roman","mac_turkish","ptcp154","shift_jis","shift_jis_2004","shift_jisx0213","utf_32","utf_32_be","utf_32_le","utf_16","utf_16_be","utf_16_le","utf_7","utf_8","utf_8_sig"];
     let utf8Index = encodings.indexOf("utf_8");
     for (let index = 0; index < encodings.length; index++) {
       const encoding = encodings[index];
       let option = new Option(encoding,encoding);
       encodingSelect.appendChild(option);
     }
     encodingSelect.selectedIndex = utf8Index;
   }
   </script>
   ```

2. 在Python中使用所选编码对文本进行编码。

   ```py
   if mode == "byte":
       content = content.encode(encoding)
   ```

## 下载QR二维码

我们生成的二维码会作为`img`元素添加到文档中。然后，我们可以将二维码以SVG或JPEG格式下载下来。

```js
function downloadAsJPEG(){
  downloadQRCodeImages(false);
}

function downloadAsSVG(){
  downloadQRCodeImages(true);
}

function convertSVGAsJPEG(svg){
  const canvas = document.createElement("canvas");
  canvas.width = svg.width;
  canvas.height = svg.height;
  const context = canvas.getContext("2d");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(svg, 0, 0, svg.naturalWidth, svg.naturalHeight, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg")
}

function downloadQRCodeImages(isSVG){
  let resultContainer = document.getElementById("result");
  let images = resultContainer.getElementsByTagName("img");
  for (let index = 0; index < images.length; index++) {
    const image = images[index];
    let a = document.createElement("a");
    if (isSVG) {
      a.href = image.src;
      a.download = (index+1)+".svg";
    }else{
      a.href = convertSVGAsJPEG(image);
      a.download = (index+1)+".jpg";
    }
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
```

## 读取QR二维码

可以使用基于[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)的[网页版QR码扫描应用](https://tony-xlh.github.io/barcode-data-reader/)来读取我们在本文中生成的QR码。

## 源代码

下载源代码并尝试使用：

<https://github.com/tony-xlh/online-qr-code-generator>

