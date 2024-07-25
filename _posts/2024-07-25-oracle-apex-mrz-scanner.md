---
layout: post
title: "如何编写一个Oracle APEX插件来识别MRZ文本"
date: 2024-07-25 11:05:53 +0800
categories: 文字识别
tags: 
description: 本文介绍了如何编写一个插件来使用Dynamsoft Label Recognizer在Oracle APEX应用程序中扫描MRZ，从护照、身份证等文档中提取信息。
---

MRZ（机器可读区域），通常位于护照或身份证的底部。[^wiki]它可以通过带有摄像头的计算设备进行读取，以获取文件类型、姓名、编号、国籍、出生日期、性别和到期日期等信息。

Oracle APEX是一个用于构建Web应用程序的低代码平台。在本文中，我们将编写一个MRZ扫描插件，以便我们在Oracle APEX应用程序中通过摄像头扫描MRZ。使用了[Dynamsoft Label Recognizer](https://www.dynamsoft.com/label-recognition/overview/)作为OCR引擎。


Demo截图：

![demo](/album/2024/07/oracle-apex/mrzscanner.jpg)

[点此](https://apex.oracle.com/pls/apex/r/dynamsoft/dynamsoft-demos/mrz-scanner?session=7986978607494)访问在线demo。

## 在Oracle APEX应用程序中扫描MRZ

下面是分步实现过程。

### 为Dynamsoft Label Recognizer编写一个APEX插件

为了使用Dynamsoft Label Recognizer扫描MRZ，我们需要先创建一个APEX插件。

#### 新建插件

1. 在应用页面里，点击共享组件。然后点击其他组件部分的插件。
2. 点创建一个新的插件。选择区域类型，因为我们需要在页面上显示内容和运行操作。
3. 在PL/SQL代码中定义`f_render`函数。

   ```plsql
   function f_render (
       p_region              in apex_plugin.t_region,
       p_plugin              in apex_plugin.t_plugin,
       p_is_printer_friendly in boolean
   ) return apex_plugin.t_region_render_result is
   ```

   然后在回调部分将`Render Procedure/Function Name`设置为`F_RENDER`。

接下来，我们把插件放在一边，先创建MRZ一个扫描网页，然后将其用于插件。

#### 编写一个MRZ扫描Web页面

该页面会通过CDN加载Dynamsoft Label Recognizer、Dynamsoft Camera Enhancer和其他依赖项的库。它可以使用camera enhancer打开相机，并使用label recognizer从视频帧读取MRZ。

1. 创建一个新的HTML文件，内容如下。

   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Dynamsoft MRZ Scanner Sample</title>
       <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0" />
       <script src="script.js"></script>
   </head>
   <body>
     <script>
       window.onload = function(){
       }
     </script>
   </body>
   </html>
   ```

2. 创建一个新的`script.js`文件。在其中定义`DLRExtension`对象。

   ```js
   let DLRExtension = {}
   ```

3. 添加一个用于加载外部JavaScript文件的函数。

   ```js
   let DLRExtension = {
     loadLibrary: function (src,type,id,data){
       return new Promise(function (resolve, reject) {
         let scriptEle = document.createElement("script");
         scriptEle.setAttribute("type", type);
         scriptEle.setAttribute("src", src);
         if (id) {
           scriptEle.id = id;
         }
         if (data) {
           for (let key in data) {
             scriptEle.setAttribute(key, data[key]);
           }
         }
         document.body.appendChild(scriptEle);
         scriptEle.addEventListener("load", () => {
           console.log(src+" loaded")
           resolve(true);
         });
         scriptEle.addEventListener("error", (ev) => {
           console.log("Error on loading "+src, ev);
           reject(ev);
         });
       });
     }
   }
   ```

4. 添加一个加载函数，加载所需的JavaScript文件。这一步还会设置Dynamsoft Label Recognizer的许可证。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dlr&source=codepool)申请许可证。

   ```js
   let DLRExtension = {
     try {
       window.Dynamsoft.CVR.CaptureVisionRouter;
     }catch{
       await this.loadLibrary("https://cdn.jsdelivr.net/npm/dynamsoft-core@3.0.33/dist/core.js","text/javascript");
       await this.loadLibrary("https://cdn.jsdelivr.net/npm/dynamsoft-license@3.0.40/dist/license.js","text/javascript");
       await this.loadLibrary("https://cdn.jsdelivr.net/npm/dynamsoft-label-recognizer@3.0.30/dist/dlr.js","text/javascript");
       await this.loadLibrary("https://cdn.jsdelivr.net/npm/dynamsoft-code-parser@2.0.20/dist/dcp.js","text/javascript");
       await this.loadLibrary("https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.0.32/dist/cvr.js","text/javascript");
     }
     try {
       window.Dynamsoft.DCE.CameraEnhancer;
     }catch{
       await this.loadLibrary("https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@4.0.2/dist/dce.js","text/javascript");
     }
     if (pConfig.license) {
       Dynamsoft.License.LicenseManager.initLicense(pConfig.license);
     }else{
       Dynamsoft.License.LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="); //one-day trial
     }
   }
   ```

5. 添加一个初始化所用库的函数。在body上附加一个容器以显示相机。我们还可以通过参数设置容器的样式等内容。

   ```js
   let DLRExtension = {
     router:undefined,
     enhancer:undefined,
     parser:undefined,
     regionID:undefined,
     init: async function(pConfig){
       Dynamsoft.Core.CoreModule.loadWasm(["DLR"]);
       this.router = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
       let cameraView = await Dynamsoft.DCE.CameraView.createInstance();
       this.enhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);
       let container = document.createElement("div");
       container.id = "enhancerUIContainer";
       document.body.appendChild(container);
       if (pConfig.styles) {
         let styles = JSON.parse(pConfig.styles); //{width:"100%"} e.g.
         for (const key in styles) {
           container.style[key] = styles[key];
         }
       }
       container.append(cameraView.getUIElement());
       container.style.display = "none";
     }
   }
   ```

6. 更新设置以支持扫描MRZ。

   1. 使用用于扫描MRZ的JSON模板更新运行时设置。它将通过CDN下载MRZ模型。

      ```js
      await this.router.initSettings("{\"CaptureVisionTemplates\": [{\"Name\": \"mrz\",\"ImageROIProcessingNameArray\": [\"roi-mrz-passport\"]}],\"TargetROIDefOptions\": [{\"Name\": \"roi-mrz-passport\",\"TaskSettingNameArray\": [\"task-mrz-passport\"]}],\"TextLineSpecificationOptions\": [{\"Name\": \"tls-mrz-text\",\"CharacterModelName\": \"MRZ\",\"StringRegExPattern\": \"([ACI][A-Z<][A-Z<]{3}[A-Z0-9<]{9}[0-9][A-Z0-9<]{15}){(30)}|([0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z<]{3}[A-Z0-9<]{11}[0-9]){(30)}|([A-Z<]{30}){(30)}|([ACIV][A-Z<][A-Z<]{3}[A-Z<]{31}){(36)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}|([PV][A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[A-Z0-9<]{2}){(44)}\",\"StringLengthRange\": [30,44],\"CharHeightRange\": [5,1000,1],\"BinarizationModes\": [{\"BlockSizeX\": 30,\"BlockSizeY\": 30,\"Mode\": \"BM_LOCAL_BLOCK\",\"MorphOperation\": \"Close\"}]},{\"Name\": \"tls-mrz-passport\",\"StringRegExPattern\": \"(P[A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[0-9<][0-9]){(44)}\",\"StringLengthRange\": [44,44],\"BaseTextLineSpecificationName\": \"tls-mrz-text\"}],\"LabelRecognizerTaskSettingOptions\": [{\"Name\": \"mrz-text-task\",\"TextLineSpecificationNameArray\": [\"tls-mrz-text\"],\"SectionImageParameterArray\": [{\"Section\": \"ST_REGION_PREDETECTION\",\"ImageParameterName\": \"ip-mrz-text\"},{\"Section\": \"ST_TEXT_LINE_LOCALIZATION\",\"ImageParameterName\": \"ip-mrz-text\"},{\"Section\": \"ST_TEXT_LINE_RECOGNITION\",\"ImageParameterName\": \"ip-mrz-text\"}]},{\"Name\": \"task-mrz-passport\",\"TextLineSpecificationNameArray\": [\"tls-mrz-text\"],\"BaseLabelRecognizerTaskSettingName\": \"mrz-text-task\"}],\"CharacterModelOptions\": [{\"Name\": \"MRZ\"}],\"ImageParameterOptions\": [{\"Name\": \"ip-mrz-text\",\"TextureDetectionModes\": [{\"Mode\": \"TDM_GENERAL_WIDTH_CONCENTRATION\",\"Sensitivity\": 8}],\"TextDetectionMode\": {\"Mode\": \"TTDM_LINE\",\"CharHeightRange\": [20,1000,1],\"Sensitivity\": 7}}]}");
      ```

   2. 设置扫描区域，只处理帧的一部分以提高扫描效率。

      ```js
      this.enhancer.setScanRegion({x:0,y:30,width:100,height:30,isMeasuredInPercentage:true})
      ```

7. 添加一个函数以打开摄像头。

   ```js
   let DLRExtension = {
     open: async function(){
       document.getElementById("enhancerUIContainer").style.display = "";
       await this.enhancer.open(true);
     }
   }
   ```

8. 添加一个函数以关闭摄像头。

   ```js
   let DLRExtension = {
     close: function(){
       this.enhancer.close(true);
       document.getElementById("enhancerUIContainer").style.display = "none";
     }
   }
   ```

9. 添加开始与关闭从相机视频帧扫描的函数。

   ```js
   let DLRExtension = {
     interval:undefined,
     processing:undefined,
     textResults:undefined,
     callback:undefined,
     startScanning: function(){
       this.stopScanning();
       let pThis = this;
       const captureAndProcess = async function() {
         if (!pThis.enhancer || !pThis.router) {
           return;
         }
         if (pThis.enhancer.isOpen() === false) {
           return;
         }
         if (pThis.processing === true) {
           return;
         }
         pThis.processing = true; // set processing to true so that the next frame will be skipped if the processing has not completed.
         let frame = pThis.enhancer.fetchImage();
         if (frame) {
           let result = await pThis.router.capture(frame,"mrz");
           if (result.items && result.items.length > 0) {
             pThis.textResults = result.items;
             if (pThis.callback) {
               pThis.callback(result.items);
             }
           }
           pThis.processing = false;
         }
       }
       this.interval = setInterval(captureAndProcess,100); // set an interval to read MRZ
     },
     stopScanning: function(){
       if (this.interval) {
         clearInterval(this.interval);
         this.interval = undefined;
       }
       this.processing = false;
     }
   }
   ```

10. 注册camera enhancer的`played`事件，以便在更改分辨率或相机后重新开始扫描。

    ```js
    this.enhancer.on("played", (playCallbackInfo) => {
      if (this.interval) {
        this.startScanning();
      }
    });
    ```

11. 添加使用Dynamsoft Code Parser从MRZ字符串中提取信息的函数。

    ```js
    init():function(){
      await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD1_ID");
      await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_FRENCH_ID");
      await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_ID");
      await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD2_VISA");
      await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD3_PASSPORT");
      await Dynamsoft.DCP.CodeParserModule.loadSpec("MRTD_TD3_VISA");
      this.parser = await Dynamsoft.DCP.CodeParser.createInstance();
    },
    getParsedString: async function(mrzString){
      let str = "";
      let parsedResultItem = await this.parser.parse(mrzString);
      console.log(parsedResultItem);
      let MRZFields = ["documentNumber","passportNumber","issuingState","name","sex","nationality","dateOfExpiry","dateOfBirth"];
      for (let index = 0; index < MRZFields.length; index++) {
        const field = MRZFields[index];
        const value = parsedResultItem.getFieldValue(field);
        if (value){
          str = str + field + ": " + value + "\n";
        }
      }
      return str;
    },
    getMRZString: function(items){
      let str = "";
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        str = str + item.text;
        if (index != items.length - 1) {
          str = str + "\n";
        }
      }
      return str;
    },
    ```

12. 在HTML文件中添加以下内容，以启动MRZ扫描。

    ```js
    window.onload = async function(){
      let styles = {width:"100%",height:"100%",left:0,top:0,position:"absolute"}
      await DLRExtension.load({});
      await DLRExtension.init({styles:JSON.stringify(styles)});
      await DLRExtension.open();
      await DLRExtension.setCallback(async function(items){
        DLRExtension.close();
        let mrzString = await DLRExtension.getMRZString(items);
        let parsedString = await DLRExtension.getParsedString(mrzString);
        alert(parsedString);
      });
      DLRExtension.startScanning();
    }
    ```

好的，我们已经完成了网页的编写。接下来，我们将针对APEX插件进行调整。

#### 调整网页以用于APEX

1. 如果它在APEX应用程序中运行，在`init`函数中，将容器添加到APEX插件的region中。

   ```js
   if ('apex' in window) {
     this.regionID = pConfig.regionID;
     const region = document.getElementById(this.regionID);
     region.appendChild(container);
   }else{
     document.body.appendChild(container);
   }
   ```


2. 从`pConfig`参数获取页面项目，并将其内容设置为已从MRZ字符串解析出的文本。

   ```js
   let DLRExtension = {
     item: undefined,
     init: function(pConfig){
       //...
       if ('apex' in window) {
         this.regionID = pConfig.regionID;
         this.item = pConfig.item;
         const region = document.getElementById(this.regionID);
         region.appendChild(container);
       }
       //...
     },
     startScanning: function(){
       //...
       if (result.items && result.items.length > 0) {
         if ('apex' in window) {
           if (pThis.item) {
             let parsedString = await pThis.getParsedString(pThis.getMRZString(result.items));
             apex.item(pThis.item).setValue(parsedString);
           }
         }
       }
       //...
     },
   }
   ```

3. 在插件的设置页面里，添加几个自定义属性。

   ![属性](/album/2024/07/oracle-apex/attributes.jpg)

   * styles: 用于设置样式的JSON字符串。
   * MRZ result container: 用于显示结果的页面项目
   * license: Dynamsoft Label Recognizer的许可证。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dlr&source=codepool)申请许可证。

4. 上传`script.js`文件并将其添加到要加载的文件URL列表中。

   ![脚本文件](/album/2024/07/apex/script-files.jpg)


5. 在PL/SQL代码中，运行下面的代码进行初始化。

   ```plsql
   begin
     apex_javascript.add_onload_code (
         p_code => '(async () => { await DLRExtension.load({' ||
             apex_javascript.add_attribute(p_name => 'license', p_value => p_region.attribute_02, p_add_comma => false ) ||
           '});
           DLRExtension.init({' ||
             apex_javascript.add_attribute(p_name => 'styles', p_value => p_region.attribute_01, p_add_comma => true ) ||
             apex_javascript.add_attribute(p_name => 'item', p_value => p_region.attribute_03, p_add_comma => true ) ||
             apex_javascript.add_attribute(p_name => 'regionID', p_value => p_region.static_id, p_add_comma => false ) ||
           '}); })();',
         p_key  => null );
     return null;
   end;
   ```


#### 使用插件扫描MRZ

1. 创建一个新的MRZ扫描页面，在其页面设计器中，将MRZ扫描区域拖动到应用中，添加一个按钮以开始扫描并添加一个文本字段以显示MRZ结果。然后，设置区域的属性。

   ![页面设计器](/album/2024/07/oracle-apex/designer.jpg)

2. 为`StartScanButton`按钮添加动态操作。它被点击后，执行以下JavaScript代码：

   ```js
   (async () => {
     if (DLRExtension.router) {
       await DLRExtension.open();
       DLRExtension.startScanning();
     }else{
       alert("The MRZ scanner is still initializing.");
     }
   })();
   ```

好了，我们现在已经在Oracle APEX应用程序中添加了MRZ扫描功能。

## 源代码

欢迎下载源代码并尝试使用：

<https://github.com/tony-xlh/APEX-MRZ-Scanner>


## 参考文献

[^wiki]: https://en.wikipedia.org/wiki/Machine-readable_passport

