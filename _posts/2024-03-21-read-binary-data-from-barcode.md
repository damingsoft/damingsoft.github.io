---
layout: post
title: "如何读取条码中的二进制数据"
date: 2024-03-20 15:06:53 +0800
categories: 条码扫描
tags: 
description: 本文介绍了如何构建一个JavaScript库来读取条码中的二进制数据。
---

条码是一种以机器可读的可视形式表示数据的方法。条码种类繁多，主要分为一维码和二维码。

我们可以从条码获取二进制数据，并通过不同方法去读码。例如，在[EAN-13](https://www.dynamsoft.com/codepool/locating-and-decoding-ean13-python-opencv.html)中，位于其右边的代码1110010代表数字0。而QR码，它是二维的，可以存储更多的数据，有几种表示数据的模式：

| 输入模式 | 模式标识 | 最大字符数 | 允许的字符，默认编码 |
|--------------|----------------|-----------------|------------------------------------------------------------|
| 仅数字 | 1 | 7,089 | 0、1、2、3、4、5、6、7、8、9 |
| 字母与数字 | 2 | 4,296 | 0-9、A-Z（仅限大写）、空格、$、%、*、+、-、..、/, : |
| 二进制/字节 | 4 | 2,953 | ISO/IEC 8859-1 |
| 日语汉字/假名 | 8 | 1,817 | Shift JIS X 0208 |
| 结构化追加 | 3 | 无限 | 没有限定 |

PS：结构化追加（Structured Append）是一种将数据分到多个条码的模式。

在本文中，我们将创建一个用于读取条码二进制数据的JavaScript库，并重点处理QR码，因为这种码型有多种模式。

[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)会被用于读取条码。


## 新建项目

使用Vite创建一个新的TypeScript项目：

```bash
npm create vite@latest BarcodeDataReader -- --template vanilla-ts
```

## 编写定义

为读取条码的二进制数据定义几个接口和一个枚举。

* 定义`BarcodeDetail`接口：

   ```ts
   export interface BarcodeDetail {
     mode?:number; //The data encoding mode
     model?:number; //Number of models
     errorCorrectionLevel?:number;
     columns?:number; //The column count
     rows?:number; //The row count
     page?:number; //Position of the particular code in structured append codes
     totalPage?:number; //Total number of structured append codes
     parityData?:number; //A value obtained by XORing byte by byte the ASCII/JIS values of all the original input data before division into symbol blocks.
     version?:number; //The version of the code.
   }
   ```

* 定义`Barcode`接口：

   ```ts
   export interface Barcode {
     bytes:Uint8Array;
     details:BarcodeDetail;
     barcodeType?:string;
   }
   ```

   二进制数据存储为`Uint8Array`。


* 定义`ReadingResult`接口：

   ```ts
   export interface ReadingResult {
     text?:string;
     img?:HTMLImageElement;
     blob?:Blob;
   }
   ```

   我们可以得到纯文本、HTML图像元素或blob这三种类型的结果。

   类型需要在`DataType`中指定。``

   ```ts
   export enum DataType {
     text = 0,
     image = 1,
     unknown = 2
   }
   ```

## 创建一个读取二进制数据的类

1. 使用以下模板创建一个新的`BarcodeDataReader.ts`文件：

   ```ts
   export class BarcodeDataReader{
     async read(barcodes:Barcode[],dataType:DataType):Promise<ReadingResult[]>{
       if (barcodes.length == 0) {
         throw new Error("No barcodes given");
       }
       let results:ReadingResult[] = [];
       return results;
     }
   }
   ```

2. 根据不同模式读取二进制数据。

   ```ts
   async read(barcodes:Barcode[],dataType:DataType):Promise<ReadingResult[]>{
     if (barcodes.length == 0) {
       throw new Error("No barcodes given");
     }
     let results:ReadingResult[] = [];
     const mode = barcodes[0].details.mode;
     if (mode == 1) {
       results = this.readNumericBarcodes(barcodes);
     }else if (mode == 2) {
       results = this.readAlphaNumericBarcodes(barcodes);
     }else if (mode == 4) {
       results = await this.readByteEncodingBarcodes(barcodes,dataType);
     }else if (mode == 8) {
       results = this.readKanjiBarcodes(barcodes);
     }else if (mode == 3) {
       results = await this.readStructuredAppendBarcodes(barcodes,dataType);
     }else {
       results = await this.readByteEncodingBarcodes(barcodes,DataType.text);
     }
     return results;
   }
   ```

3. 实现对数字、字母与数字和日文汉字模式的读取。这三种模式的数据都是纯文本，它们可以共享类似的逻辑。

   ```ts
   private readAlphaNumericBarcodes(barcodes:Barcode[]):ReadingResult[]{
     return this.decodeText(barcodes,"ASCII");
   }

   private readNumericBarcodes(barcodes:Barcode[]):ReadingResult[]{
     return this.decodeText(barcodes,"ASCII");
   }

   private readKanjiBarcodes(barcodes:Barcode[]):ReadingResult[]{
     return this.decodeText(barcodes,"SHIFT-JIS");
   }

   private decodeText(barcodes:Barcode[],encoding:string){
     let results:ReadingResult[] = [];
     for (let index = 0; index < barcodes.length; index++) {
       const barcode = barcodes[index];
       const decoder = new TextDecoder(encoding);
       const text = decoder.decode(barcode.bytes);
       let result = {
         text:text
       }
       results.push(result);
     }
     return results;
   }
   ```

4. 以字节模式读取数据。

   由于字节模式下的数据类型未知，我们需要根据用户指定的数据类型获取读取结果。

   如果数据类型是文本，我们需要检测编码。这里使用`chardet`库进行检测。

   ```ts
   private async readByteEncodingBarcodes(barcodes:Barcode[],dataType:DataType):Promise<ReadingResult[]>{
     let results:ReadingResult[] = [];
     for (let index = 0; index < barcodes.length; index++) {
       const barcode = barcodes[index];
       let result:ReadingResult = await this.getResultBasedOnDataType(barcode.bytes,dataType);
       results.push(result);
     }
     return results;
   }

   async getResultBasedOnDataType(data:Uint8Array,dataType:DataType) {
     let result:ReadingResult;
     if (dataType == DataType.text) {
       const charset = chardet.analyse(data);
       const decoder = new TextDecoder(charset[0].name);
       const text = decoder.decode(data);
       result = {
         text:text
       }
     }else if (dataType == DataType.image) {
       const img = await this.getImageFromUint8Array(data);
       result = {
         img:img
       }
     }else{
       result = {
         blob:this.getBlobFromUint8Array(data)
       }
     }
     return result;
   }

   getBlobFromUint8Array(data:Uint8Array) {
     return new Blob([data]);
   }
   getImageFromUint8Array(data:Uint8Array):Promise<HTMLImageElement>{
     return new Promise<HTMLImageElement>((resolve, reject) => {
       const img = document.createElement("img");  
       const blob = this.getBlobFromUint8Array(data);
       img.onload = function(){
         resolve(img);
       }
       img.onerror = function(error) {
         console.error(error);
         reject(error);
       }
       img.src = URL.createObjectURL(blob);
       console.log(img.src)
     })
   }
   ```

5. 以结构化追加模式读取数据。

   需要根据页码对条码进行排序，将多个码的数据合并成一个Unit8Array，然后得到结果。

   ```ts
   private async readStructuredAppendBarcodes(barcodes:Barcode[],dataType:DataType):Promise<ReadingResult[]>{
     let results:ReadingResult[] = [];
     barcodes.sort((a, b) => (a.details.page ?? 0) - (b.details.page ?? 0))
     let concatedData:Uint8Array = new Uint8Array();
     for (let index = 0; index < barcodes.length; index++) {
       const barcode = barcodes[index];
       let merged = new Uint8Array(barcode.bytes.length + concatedData.length);
       merged.set(concatedData);
       merged.set(barcode.bytes, concatedData.length);
       concatedData = merged;
     }
     let result = await this.getResultBasedOnDataType(concatedData,dataType);
     results.push(result);
     return results;
   }
   ```

## 读取测试

然后，我们可以更新`index.html`，使用[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)读取QR码，并使用我们编写的库读取二进制数据。

以下是基本代码：

```js
let router = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
//read barcodes from an image
let result = await router.capture(document.getElementById("image"),"ReadBarcodes_Balance");
let dataType = document.getElementById("dataTypeSelect").selectedIndex;
let barcodes = [];
for (let index = 0; index < result.items.length; index++) {
  const item = result.items[index];
  if (item.type === Dynamsoft.Core.EnumCapturedResultItemType.CRIT_BARCODE) {
    let data = new Uint8Array(item.bytes.length);
    data.set(item.bytes);
    let barcode = {
      bytes:data,
      details:item.details
    }
    barcodes.push(barcode);
  }
}

let results = await dataReader.read(barcodes,dataType)
console.log(results);
```

可以访问[在线演示](https://tony-xlh.github.io/barcode-data-reader/)进行试用。

如果手头没有二维码，可以使用[此文](https://devblogs.damingsoft.com/python-qr-code-generator/)中的二维码和二维码生成器。

下面是读取两个二维码的测试截图，一张图片被编码在这两个二维码中：

![示例](/album/2024/03/barcode-binary-data-reader/sample.jpg)

## 打包为库

为了便于使用，我们可以将其作为库发布到NPM上。

1. 安装`devDependencies` ：

   ```bash
   npm install -D @types/node vite-plugin-dts
   ```

2. 创建一个新的`vite.config.ts`文件：

   ```ts
   // vite.config.ts
   import { resolve } from 'path';
   import { defineConfig } from 'vite';
   import dts from 'vite-plugin-dts';
   // https://vitejs.dev/guide/build.html#library-mode
   export default defineConfig({
     build: {
       lib: {
         entry: resolve(__dirname, 'src/index.ts'),
         name: 'barcode-data-reader',
         fileName: 'barcode-data-reader',
       },
     },
     plugins: [dts()],
   });
   ```

3. 将我们的包的入口点添加到`package.json`。

   ```json
   {
     "main": "./dist/barcode-data-reader.umd.cjs",
     "module": "./dist/barcode-data-reader.js",
     "types": "./dist/index.d.ts",
     "exports": {
       "import": {
         "types": "./dist/index.d.ts",
         "default": "./dist/barcode-data-reader.js"
       },
       "require": {
         "types": "./dist/index.d.ts",
         "default": "./dist/barcode-data-reader.umd.cjs"
       }
     },
     "files": [
       "dist/*.css",
       "dist/*.js",
       "dist/*.cjs",
       "dist/*.d.ts"
     ]
   }
   ```

运行`npm run build`。然后，我们可以在`dist`文件夹中看到打包好的文件。


## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/barcode-data-reader>

