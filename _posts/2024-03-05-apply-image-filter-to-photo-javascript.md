---
layout: post
title: "如何使用JavaScript对图片进行滤镜操作"
date: 2024-03-05 11:26:53 +0800
categories: 文档扫描
tags: 
description: 文章讲述了如何构建一个JavaScript库，用于对各种图片进行滤镜操作。它可用于增强扫描的文档图像或照片。
---

滤镜通常用于调整图像的呈现效果。我们可以使用它来使图像更清晰、删除不需要的对象或调整色调。

在本文中，我们将构建一个JavaScript库来实现各种图像滤镜。它可以与[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)一起使用，以便集成到文档扫描流程中。


在线demo

1. [基本版](https://tony-xlh.github.io/image-filter/)
2. [Dynamsoft Document Viewer版](https://tony-xlh.github.io/image-filter/document-viewer.html)

## 新建项目

使用Vite创建一个新的TypeScript项目：

```bash
npm create vite@latest ImageFilter -- --template vanilla-ts
```


## 实现图像滤镜

接下来是具体的实现步骤。

### 定义接口

在`src/ImageFilter.ts`中定义`ImageFilter`接口。

```ts
export interface ImageFilter {
  cvs:HTMLCanvasElement;
  process(img:HTMLImageElement|HTMLCanvasElement|HTMLVideoElement): void;
  convert(r:number,g:number,b:number,a:number): {r:number,g:number,b:number,a:number};
}
```

ImageFilter有两个方法。一个是`process`，用于应用滤镜到图像并保存到Canvas上。另一个是`convert`，它定义了像素转换的具体方式。

### 定义一个滤镜的基类

在`src/GenericImageFilter.ts`中创建一个实现`ImageFilter`的`GenericImageFilter`类。在这里，我们将图像绘制到Canvas上以操纵其像素。

```ts
export class GenericImageFilter implements ImageFilter {
  cvs:HTMLCanvasElement;
  constructor(cvs:HTMLCanvasElement) {
    this.cvs = cvs;
  }

  process(img:HTMLImageElement|HTMLCanvasElement|HTMLVideoElement){
    let width;
    let height;
    if (img instanceof HTMLImageElement) {
      width = img.naturalWidth;
      height = img.naturalHeight;
    }else if (img instanceof HTMLCanvasElement){
      width = img.width;
      height = img.height;
    }else{
      width = img.videoWidth;
      height = img.videoHeight;
    }
    const context = this.cvs.getContext('2d');
    this.cvs.width = width;
    this.cvs.height = height;
    if (context) {
      context.drawImage(img, 0, 0);
      const imageData = context.getImageData(0, 0, this.cvs.width, this.cvs.height);
      const pixels = imageData.data; //[r,g,b,a,...]
      for (var i = 0; i < pixels.length; i += 4) {
        const red = pixels[i];
        const green = pixels[i + 1];
        const blue = pixels[i + 2];
        const alpha = pixels[i + 3];
        const converted = this.convert(red, green, blue, alpha)
        pixels[i] = converted.r;
        pixels[i + 1] = converted.g;
        pixels[i + 2] = converted.b;
        pixels[i + 3] = converted.a;
      }
      context.putImageData(imageData, 0, 0);
    }
  }

  convert(r:number,g:number,b:number,a:number){
    return {r:r,g:g,b:b,a:a};
  }
}
```

### 定义从基类派生的各种滤镜

接下来，我们通过扩展基类来定义各种新的滤镜类。

1. 灰度滤镜。

   ```ts
   export class GrayscaleFilter extends GenericImageFilter {
     convert(r: number, g: number, b: number, a: number): { r: number; g: number; b: number; a: number; } {
       const gray = (r * 6966 + g * 23436 + b * 2366) >> 15;
       return {r:gray,g:gray,b:gray,a:a};
     }
   }
   ```

   它将图像转换为仅由256种不同灰度组成的灰度图像。

   ![灰度](/album/2024/01/grayscale.jpg)

2. 棕褐色滤镜。

   ```ts
   export class SepiaFilter extends GenericImageFilter {
     convert(r: number, g: number, b: number, a: number): { r: number; g: number; b: number; a: number; } {
       const red = (r * 0.393)+(g * 0.769)+(b * 0.189);
       const green = (r * 0.349)+(g * 0.686)+(b * 0.168);
       const blue = (r * 0.272)+(g * 0.534)+(b * 0.131);
       return {r:red,g:green,b:blue,a:a};
     }
   }
   ```

   它为图像添加了棕褐色调。

   ![棕褐色](/album/2024/03/image-filter/sepia.jpg)

3. 反色滤镜。

   ```ts
   export class InvertFilter extends GenericImageFilter {
     convert(r: number, g: number, b: number, a: number): { r: number; g: number; b: number; a: number; } {
       r = 255 - r;
       g = 255 - g;
       b = 255 - b;
       return {r:r,g:g,b:b,a:a};
     }
   }
   ```

   它可以反转图像的像素，可用于处理扫描的相机底片。

   ![反色](/album/2024/03/image-filter/invert.jpg)

   [图片来源](https://www.belindajiao.com/blog/good-film-negative)

4. 黑白滤镜。这个滤镜稍微有点复杂。我们需要重写`process`和`convert`方法。此外，其构造函数也作了修改，以接受两个额外的参数：`threshold`和`otsuEnabled`。如果`otsuEnabled`设置为true ，阈值将使用OTSU的方法自动计算。

   ```ts
   import otsu from 'otsu';

   export class BlackwhiteFilter extends GenericImageFilter {
     threshold:number = 127;
     otsuEnabled:boolean = false;
     constructor(cvs:HTMLCanvasElement,threshold:number,otsuEnabled:boolean){
       super(cvs);
       this.threshold = threshold;
       this.otsuEnabled = otsuEnabled;
     }

     process(img:HTMLImageElement|HTMLCanvasElement|HTMLVideoElement):number{
       let width;
       let height;
       if (img instanceof HTMLImageElement) {
         width = img.naturalWidth;
         height = img.naturalHeight;
       }else if(img instanceof HTMLCanvasElement){
         width = img.width;
         height = img.height;
       }else{
         width = img.videoWidth;
         height = img.videoHeight;
       }
       const context = this.cvs.getContext('2d');
       this.cvs.width = width;
       this.cvs.height = height;
       let threshold;
       if (context) {
         context.drawImage(img, 0, 0);
         const imageData = context.getImageData(0, 0, this.cvs.width, this.cvs.height);
         const pixels = imageData.data; //[r,g,b,a,...]
         const grayscaleValues = [];
         for (var i = 0; i < pixels.length; i += 4) {
           const red = pixels[i];
           const green = pixels[i + 1];
           const blue = pixels[i + 2];
           const grayscale = this.grayscale(red, green, blue);
           grayscaleValues.push(grayscale);
         }
         if (this.otsuEnabled) {
           threshold = otsu(grayscaleValues);
         }else{
           threshold = this.threshold;
         }
         let grayscaleIndex = 0;
         for (var i = 0; i < pixels.length; i += 4) {
           const gray = grayscaleValues[grayscaleIndex];
           grayscaleIndex = grayscaleIndex + 1;
           let value = 255;
           if (gray < threshold) {
             value = 0;
           }
           pixels[i] = value;
           pixels[i + 1] = value;
           pixels[i + 2] = value;
         }
         context.putImageData(imageData, 0, 0);
       }
       return threshold;
     }

     grayscale(r: number, g: number, b: number): number {
       return (r * 6966 + g * 23436 + b * 2366) >> 15;
     }

     setThreshold(threshold:number){
       this.threshold = threshold;
     }

     setOTSUEnabled(enabled:boolean){
       this.otsuEnabled = enabled;
     }
   }
   ```

   ![黑白](/album/2024/01/black-and-white.jpg)

## 集成到Dynamsoft Document Viewer

[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)为文档扫描过程提供了多个组件。我们可以使用其[Edit Viewer](https://www.dynamsoft.com/document-viewer/docs/features/viewers/editviewer.html)来查看和编辑扫描的文档图像。

它提供了一个[接口](https://www.dynamsoft.com/document-viewer/docs/features/advanced/imagefilter.html)，允许自定义一个handler以使用第三方图像滤镜。

让我们定义这样一个handler，以便在文档扫描过程中使用我们写的这个滤镜库。

1. 使用以下内容创建一个名为`FilterHandler.ts`的新文件。

   ```ts
   let DDV;
   //allows setting the DDV namespace. It is needed if Dynamsoft Document Viewer (DDV) is installed with NPM.
   export function setDDV(DocumentViewer:any) {
     DDV = DocumentViewer;
   }
   if ((window as any)["Dynamsoft"]) {
     const Dynamsoft = (window as any)["Dynamsoft"];
     DDV = Dynamsoft.DDV;
   }

   export class ImageFilterHandler extends DDV.ImageFilter  {}
   ```

2. 重写类中的`querySupported`方法，该方法会返回滤镜列表。

   ```ts
   querySupported() {
     return [
       {
         type: "original",
         label: "Original"
       },
       {
         type: "grayscale",
         label: "Gray",
       },
       {
         type: "BW",
         label: "B&W"
       },
       {
         type: "invert",
         label: "Invert"
       },
       {
         type: "sepia",
         label: "Retro",
       }
     ]
   };
   ```

3. 重写`applyFilter`方法，应用选定的图像滤镜。

   ```ts
   async applyFilter(image:any, type:string) {
     if (type === "original") {
       return new Promise((r, _j) => {
         r(image.data)
       });
     }else{
       let img = await imageFromBlob(image.data);
       if (type === "BW") {
         let blackwhiteFilter = new BlackwhiteFilter(canvas,127,true);
         blackwhiteFilter.process(img);
       }else if (type === "sepia") {
         let sepiaFilter = new SepiaFilter(canvas);
         sepiaFilter.process(img);
       }else if (type === "grayscale") {
         let grayscaleFilter = new GrayscaleFilter(canvas);
         grayscaleFilter.process(img);
       }else if (type === "invert") {
         let invertFilter = new InvertFilter(canvas);
         invertFilter.process(img);
       }
       let blob = await canvasToBlob();
       return new Promise((r, _j) => {
         r(blob)
       });
     }
   };
   ```

   需要使用以下方法将`image`中提供的blob转换为img元素供滤镜使用，并将Canvas转换为blob供handler调用。

   ```ts
   const canvasToBlob = async () => {
     return new Promise<Blob>((resolve, reject) => {
       canvas.toBlob((blob) => {
         if (blob) {
           resolve(blob);
         }else{
           reject();
         }
       },"image/jpeg",100);
     })
   }

   const imageFromBlob = async (blob:Blob):Promise<HTMLImageElement> => {
     return new Promise<HTMLImageElement>((resolve, _reject) => {
       let img = document.createElement("img");
       img.onload = function () {
         resolve(img);
       }
       let url = URL.createObjectURL(blob);
       img.src = url;
     })
   }
   ```

4. 使用`original`作为默认滤镜。

   ```ts
   get defaultFilterType() {
     return "original"
   };
   ```

5. 使用定义的handler创建Edit Viewer的实例。

   ```ts
   let filterHandler = new ImageFilterHandler();
   // Configure image filter feature
   Dynamsoft.DDV.setProcessingHandler("imageFilter", filterHandler);
   // Create an edit viewer
   editViewer = new Dynamsoft.DDV.EditViewer({
     container: "container",
   });
   ```


打开Edit Viewer ，我们可以看到可以在其UI中使用各种滤镜。

![编辑查看器](/album/2024/03/image-filter/editviewer.jpg)

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
         name: 'image-filter',
         fileName: 'image-filter',
       },
     },
     plugins: [dts()],
   });
   ```

3. 将我们的包的入口点添加到`package.json`。

   ```json
   {
     "main": "./dist/image-filter.umd.cjs",
     "module": "./dist/image-filter.js",
     "types": "./dist/index.d.ts",
     "exports": {
       "import": {
         "types": "./dist/index.d.ts",
         "default": "./dist/image-filter.js"
       },
       "require": {
         "types": "./dist/index.d.ts",
         "default": "./dist/image-filter.umd.cjs"
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

<https://github.com/tony-xlh/image-filter>

