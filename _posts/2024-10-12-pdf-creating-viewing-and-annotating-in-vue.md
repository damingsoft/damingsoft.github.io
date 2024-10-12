---
layout: post
title: "在Vue应用中集成PDF创建、查看和标注功能"
date: 2024-10-12 14:04:53 +0800
categories: 文档
tags: 
description: 本文介绍了如何使用Dynamsoft Document Viewer将PDF创建、查看和标注集成到Vue应用中。
---

[Dynamsoft Document Viewer](https://www.dynamsoft.com/document-viewer/docs/introduction/index.html)是为文档图像提供查看、管理功能的SDK。我们可以使用它集成PDF创建、查看和标注功能到我们的Web应用中。在本文中，我们将使用Vue编写一个demo。

## 新建项目

使用Vite创建一个新的Vue + TypeScript项目：

```bash
npm create vite@latest pdf-app -- --template vue-ts
```

## 安装Dynamsoft Document Viewer

首先，通过npm安装Dynamsoft Document Viewer。


```
npm install dynamsoft-document-viewer
```

然后，我们需要将Dynamsoft Document Viewer的资源复制到public文件夹。

1. 在以下路径创建一个文件夹：`public/assets/ddv-resources`。
2. 安装`ncp`：`npm install ncp --save-dev`。
3. 修改`package.json` ，将资源从`node_modules`复制到public文件夹。

   ```diff
   - "dev": "vite",
   - "build": "tsc -b && vite build",
   + "dev": "ncp node_modules/dynamsoft-document-viewer/dist public/assets/ddv-resources && vite",
   + "build": "ncp node_modules/dynamsoft-document-viewer/dist public/assets/ddv-resources && tsc -b && vite build",
   ```

## 初始化Dynamsoft Document Viewer

重写`App.vue`。挂载后，使用许可证初始化Dynamsoft Document Viewer。可以在此处申请[许可证](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)。

```html
<script setup lang="ts">
import { DDV, UiConfig } from 'dynamsoft-document-viewer';
import { onMounted, ref } from 'vue';

const initialized = ref(false);
onMounted(()=>{
  if (initialized.value === false) {
    initDDV();
  }
})

const initDDV = async () => {
  DDV.Core.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; // Public trial license which is valid for 24 hours
  DDV.Core.engineResourcePath = "assets/ddv-resources/engine";// Lead to a folder containing the distributed WASM files
  await DDV.Core.loadWasm();
  await DDV.Core.init();
  // Configure image filter feature which is in edit viewer
  DDV.setProcessingHandler("imageFilter", new DDV.ImageFilter());
  initialized.value = true;
}
</script>
```

## 创建Edit Viewer

1. 在template中使用以下内容：

   ```html
   <template>
     <div id="app">
       <h2>Document Viewer Demo</h2>
       <div v-if="!initialized">Initializing...</div>
       <div id="container"></div>
     </div>
   </template>
   ```

   CSS：

   ```css
   #app {
     display: flex;
     align-items: center;
     flex-direction: column;
     width: 100%;
   }

   #container {
     max-width: 80%;
     width: 1280px;
     height: 480px;
   }
   ```

2. 初始化Edit Viewer的实例，并通过ID将其绑定到一个容器。

   ```tsx
   const config = DDV.getDefaultUiConfig("editViewer", {includeAnnotationSet: true}) as UiConfig;
   // Create an edit viewer
   editViewer.current = new DDV.EditViewer({
     container: "container",
     uiConfig: config,
   });
   ```

3. 导入Dynamsoft Document Viewer的CSS。

   ```tsx
   import "dynamsoft-document-viewer/dist/ddv.css";
   ```

好的，我们已将Dynamsoft Document Viewer集成到了我们的Vue应用中。

![演示截图](/album/2024/10/document-viewer/react-demo.jpg)

UI包含工具栏、缩略图查看器和一个主的页面内容查看器。我们可以点击工具栏上的按钮来加载新图像、编辑图像、添加PDF标注并将文档保存为PDF文件。

除了UI，我们还可以通过代码来操作文档。阅读[文档](https://www.dynamsoft.com/document-viewer/docs/features/index.html)了解更多信息。

## 源代码

查看demo的源代码并尝试使用：

<https://github.com/tony-xlh/document-viewer-samples/tree/main/frameworks/vue/pdf-app>

