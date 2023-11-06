---
layout: post
title: 使用LitElement编写一个文档扫描的Web Component
date: 2023-11-03 17:14:53 +0800
categories: 文档扫描
tags:
---

Lit是一个用于构建快速轻量的Web Component的库。Lit的核心是一个用于编写组件的基类，它提供了响应性的状态、作用域内的样式和一个小巧的声明式模板系统。

在本文中，我们将使用LitElement编写一个Web Component，基于[Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview/)实现在浏览器中扫描文档。


## 新建项目

虽然Lit可以在没有构建系统的情况下使用，但在本文中，我们使用webpack （克隆下面的模板项目） ：

```bash
git clone https://github.com/wbkd/webpack-starter
```

## 安装依赖项

1. 安装Lit。

   ```bash
   npm install lit
   ```


2. 安装Dynamic Web TWAIN。

   ```bash
   npm install dwt
   ```

   此外，我们需要将Dynamic Web TWAIN的资源文件复制到public文件夹中。

   1. 安装`ncp`。

      ```bash
      npm install --save-dev ncp
      ```

   2. 修改`package.json`的build和start命令以复制资源。

      ```diff
       "scripts": {
         "lint": "npm run lint:styles; npm run lint:scripts",
         "lint:styles": "stylelint src",
         "lint:scripts": "eslint src",
         "build": "cross-env NODE_ENV=production webpack --config webpack/webpack.config.prod.js",
         "start": "webpack serve --config webpack/webpack.config.dev.js"
      +  "build": "ncp node_modules/dwt/dist public/dwt-resources && cross-env NODE_ENV=production webpack --config webpack/webpack.config.prod.js",
      +  "start": "ncp node_modules/dwt/dist public/dwt-resources && webpack serve --config webpack/webpack.config.dev.js"
       },
      ```

   3. 修改`webpack.common.js`以将`public`文件夹中的文件直接复制到输出文件夹，而不是输出文件夹中的`public`文件夹。

      ```diff
       new CopyWebpackPlugin({
      -  patterns: [{ from: Path.resolve(__dirname, '../public'), to: 'public' }],
      +  patterns: [{ from: Path.resolve(__dirname, '../public'), to: '' }],
       }),
      ```

## 编写文档扫描组件

1. 使用以下模板在`src\scripts`下创建新的`documentscanner.js`文件。

   ```js
   import {LitElement, html, css} from 'lit';

   export class DocumentScanner extends LitElement {
     static properties = {
     };
     DWObject;
     static styles = css`
       :host {
         display: block;
       }
       `;
     constructor() {
       super();
     }

     render() {
       return html``;
     }
   }
   customElements.define('document-scanner', DocumentScanner);
   ```

2. 添加一个`div`元素作为Dynamic Web TWAIN控件的容器（主要用于显示文档）。

   ```js
   render() {
     return html`<div id="dwtcontrolContainer"></div>`;
   }
   ```

3. 在`constructor`中配置Dynamic Web TWAIN。需要一个许可证来使用Dynamic Web TWAIN。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dwt)申请许可证。

   ```js
   constructor() {
     super();
     Dynamsoft.DWT.AutoLoad = false;
     Dynamsoft.DWT.ResourcesPath = "/dwt/dist";
     Dynamsoft.DWT.ProductKey = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial
   }
   ```

4. 在DOM首次更新后的`firstUpdated`生命周期中初始化Dynamic Web TWAIN ，并将其绑定到上一步创建的容器。此外，发送一个自定义事件以发送Dynamic Web TWAIN的实例，这样我们可以在父元素中访问它。

   ```js
   DWObject;
   firstUpdated() {
     let pThis = this;
     let dwtContainer = this.renderRoot.getElementById("dwtcontrolContainer");
     Dynamsoft.DWT.CreateDWTObjectEx(
       {
         WebTwainId: 'dwtcontrol'
       },
       function(obj) {
         pThis.DWObject = obj;
         pThis.DWObject.Viewer.bind(dwtContainer);
         pThis.DWObject.Viewer.show();
         pThis.DWObject.Viewer.width = "100%";
         pThis.DWObject.Viewer.height = "100%";
         const event = new CustomEvent('initialized', {
           detail: {
             DWObject: pThis.DWObject
           }
         });
         pThis.dispatchEvent(event);
       },
       function(err) {
         console.log(err);
       }
     );
   }
   ```

5. 添加一个扫描文档的按钮和一个将文档图像保存为PDF文件的按钮。

   ```js
   render() {
     return html`
     <div class="buttons">
       <button @click=${this.scan}>Scan</button>
       <button @click=${this.save}>Save</button>
     </div>
     <div id="dwtcontrolContainer"></div>`;
   }
   scan(){
     let pThis = this;
     if (pThis.DWObject) {
       pThis.DWObject.SelectSource(function () {
         pThis.DWObject.OpenSource();
         pThis.DWObject.AcquireImage();
       },
         function () {
           console.log("SelectSource failed!");
         }
       );
     }
   }

   save(){
     if (this.DWObject) {
       this.DWObject.SaveAllAsPDF("Scanned.pdf");
     }
   }
   ```

6. 添加名为`total`的响应性属性，以反映扫描的文档页面数量。我们可以在Web TWAIN的`OnBufferChanged`事件中更新它的值。

   ```js
   export class DocumentScanner extends LitElement {
     static properties = {
       total: {},
     };
     constructor() {
       super();
       this.total = 0;
       //...
     }
     render() {
       return html`
       <div class="buttons">
         <button @click=${this.scan}>Scan</button>
         <button @click=${this.save}>Save</button>
       </div>
       <div id="dwtcontrolContainer"></div>
       <div class="status">Total: ${this.total}</div>`;
     }

     firstUpdated() {
       //...
       Dynamsoft.DWT.CreateDWTObjectEx(
         {
           WebTwainId: 'dwtcontrol'
         },
         function(obj) {
           //...
           pThis.DWObject.RegisterEvent('OnBufferChanged',function () {
             pThis.total = pThis.DWObject.HowManyImagesInBuffer;
           });
           //...
         },
         function(err) {
           console.log(err);
         }
       );
     }
   }
   ```

7. 设置组件的样式。

   ```js
   static styles = css`
     :host {
       display: block;
     }
     .buttons {
       height: 25px;
     }
     #dwtcontrolContainer {
       width: 100%;
       height: calc(100% - 50px);
     }
     .status {
       height: 25px;
     }
     `;
   ```

## 使用文档扫描组件

1. 在`index.js`文件中导入组件。

   ```js
   import { DocumentScanner } from './documentscanner'; // eslint-disable-line
   ```

2. 在`index.html`中添加组件。

   ```html
   <document-scanner
     style="width:320px;height:480px;"
   ></document-scanner>
   ```

好了，我们现在可以从浏览器扫描文档了。

![Lit文档扫描应用](/album/2023/11/lit-document-scanner.jpg)

[在线demo](https://bejewelled-alfajores-51b60d.netlify.app/)

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/document-scanner-lit-element>

