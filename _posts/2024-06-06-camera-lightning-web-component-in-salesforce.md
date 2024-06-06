---
layout: post
title: "如何编写一个Lightning Web Component在Salesforce中访问摄像头"
date: 2024-06-06 13:59:53 +0800
categories: 文档扫描
tags: 
description: 本文介绍了如何编写一个Lightning Web Component来在Salesforce中访问摄像头并扫描文档。文档图像可以上传到服务器上并被裁剪，然后作为一个字段添加到线索中。
---

Salesforce是一个著名的CRM平台。我们可以用它来管理我们的销售和客户。

Salesforce具有强大的自定义功能。我们可以编写应用来扩展其功能。它的最新技术是Lightning Web Component，便于我们用现代Web技术去构建应用。

在本文中，我们将编写一个Lightning Web Component来访问Salesforce中的摄像头。访问摄像头是捕获文档图像或从条形码和文本获取信息的第一步。

为了说明如何访问Salesforce的数据，这个组件还可以将图像上传到服务器（见[前一篇文章](/asp-net-core-document-cropping/)），获取裁剪的文档图像的URL ，将URL添加到线索账户并显示文档图像。如果我们需要附加身份证件图像，这一功能会很有用。


演示视频：

<video src="https://github.com/xulihang/salesforce-document-scanner/assets/5462205/8987b157-b321-4ac0-977a-3688614655aa" data-canonical-src="https://github.com/xulihang/salesforce-document-scanner/assets/5462205/8987b157-b321-4ac0-977a-3688614655aa" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-width: 100%;max-height:640px; min-height: 200px"></video>

## 环境配置

* 安装Salesforce CLI。
* 安装Visual Studio Code和Salesforce DX扩展。

可以在[这里](https://trailhead.salesforce.com/content/learn/projects/quick-start-lightning-web-components/set-up-salesforce-dx)找到详细的指南。

## 新建Salesforce DX项目

打开Visual Studio Code，按Ctrl + Shift + P（ Windows ）或Cmd + Shift + P（ macOS ）打开命令面板，然后输入SFDX，选择`Create Project`操作。

![新项目](/album/2024/06/salesforce/new_project.jpg)

在此，我们使用标准选项，并使用`documentScanner`作为名称。

## 在Salesforce中使用该组件

1. 运行`SFDX:Authorize an Org`登录到自己的Salesforce组织。
2. 编辑`documentScanner.js-meta.xml`以进行以下更改，使其在Lightning应用生成器中可用。

   ```diff
    <?xml version="1.0" encoding="UTF-8"?>
    <LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
        <apiVersion>59.0</apiVersion>
   -    <isExposed>false</isExposed>
   +    <isExposed>true</isExposed>
   +    <targets>
   +      <target>lightning__AppPage</target>
   +      <target>lightning__RecordPage</target>
   +      <target>lightning__HomePage</target>
   +    </targets>
    </LightningComponentBundle>
   ```

3. 将组件部署到组织。

   ![部署](/album/2024/06/salesforce/deploy.jpg)

4. 在Salesforce中，编辑Lead账户页面，可以将组件添加到页面进行测试。

   ![设置页面](/album/2024/06/salesforce/lightning_app_builder_settings.jpg)

   ![编辑页面](/album/2024/06/salesforce/lightning_app_builder_edit_page.jpg)

## 实现组件

接下来，让我们来实现该组件。

### 访问摄像头

1. 在`documentScanner.html`中添加一个lightning card元素和两个lightning select元素，用于选择摄像头和所需的分辨率。

   ```html
   <template>
     <lightning-card title="Document Scanner">
       <div class="slds-var-m-around_medium">
         <lightning-button label={buttonLabel} onclick={toggleCamera}></lightning-button>
         <br/>
         <lightning-select
             name="camera"
             label="Camera:"
             value={cameraID}
             options={cameraOptions}
             onchange={handleCameraChange}
              ></lightning-select>
         <lightning-select
             name="resolution"
             label="Resolution:"
             value={resolution}
             options={resolutionOptions}
             onchange={handleResolutionChange}
              ></lightning-select>
       </div>
     </lightning-card>
   </template>
   ```

   与设置分辨率相关的功能：

   ```js
   resolution = "1920x1080";
   get resolutionOptions() {
     return [
         { label: '640x480', value: '640x480' },
         { label: '1280x720', value: '1280x720' },
         { label: '1920x1080', value: '1920x1080' },
         { label: '3840x2160', value: '3840x2160' },
     ];
   }

   handleResolutionChange(event) {
     this.resolution = event.detail.value;
   }
   ```

2. 在`documentScanner.js`中，添加在组件挂载时会被调用的`connectedCallback`。

   ```js
   async connectedCallback() {}
   ```

3. 在`connectedCallback`中，请求摄像头权限并列出可用的摄像头。

   ```js
   @api cameraOptions = [];
   cameraID = "";

   async connectedCallback() {
     await this.requestCameraPermission();
     await this.listCameras();
   }

   async requestCameraPermission() {
     try {
       const constraints = {video: true, audio: false};
       const stream = await navigator.mediaDevices.getUserMedia(constraints);
       this.closeStream(stream);
     } catch (error) {
       console.log(error);
       throw error;
     }
   }

   async listCameras(){
     let options = [];
     let allDevices = await navigator.mediaDevices.enumerateDevices();
     for (let i = 0; i < allDevices.length; i++){
       let device = allDevices[i];
       if (device.kind == 'videoinput'){
         options.push({label: device.label, value: device.deviceId});
       }
     }
     this.cameraOptions = options;
     if (options.length>0){
       this.cameraID = options[0].value;
     }
   }

   handleCameraChange(event) {
     this.cameraID = event.detail.value;
   }

   closeStream(stream){
     if (stream) {
       const tracks = stream.getTracks();
       for (let i=0;i<tracks.length;i++) {
         const track = tracks[i];
         track.stop();  // stop the opened tracks
       }
     }
   }
   ```

4. 添加一个按钮以打开摄像头，并添加一个video元素作为摄像头画面的容器。

   ```html
   <lightning-button label={buttonLabel} onclick={toggleCamera}></lightning-button>
   <video id="video" muted autoplay="autoplay" playsinline="playsinline" webkit-playsinline></video>
   ```

5. 打开或关闭摄像头的相关函数。

   ```js
   @api cameraOpened = false;
   get buttonLabel() {
     const label = this.cameraOpened ? 'Close Camera' : 'Open Camera';
     return label;
   }
   async toggleCamera(){
     if (this.cameraOpened == false) {
       const width = parseInt(this.resolution.split("x")[0]);
       const height = parseInt(this.resolution.split("x")[1]);
       const videoConstraints = {
         video: {width:width, height:height, deviceId: this.cameraID},
         audio: false
       };
       const cameraStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
       this.template.querySelector("video").srcObject = cameraStream;
       this.cameraOpened = true;
     }else{
       this.closeStream(this.template.querySelector("video").srcObject);
       this.template.querySelector("video").srcObject = null;
       this.cameraOpened = false;
     }
   }
   ```

6. 添加`documentScanner.css`并添加以下样式，以避免摄像头容器过大。

   ```css
   video {
     max-width: 100%;
   }
   ```


### 裁剪文档图像

在我们的用例中，我们需要将图片上传到服务器，让服务器裁剪文档图像并在线索账户页面中显示文档图像。

1. 在Salesforce中，为线索添加自定义URL类型字段`ID Card`。

   1. 打开设置 。

      ![页面设置](/album/2024/06/salesforce/page_settings.jpg)

   2. 添加URL自定义字段。

      ![自定义字段](/album/2024/06/salesforce/customize_field.jpg)

2. 在组件中，如果设置了`ID Card`的URL ，则显示文档图像。URL字段通过`getRecord`方法获取。

   HTML：

   ```html
   <div lwc:if={IDCardURL}><div>ID Card:</div><img class="IDCard" alt="ID Card" src={imgDataURL}/></div>
   <div lwc:else>No ID Card</div>
   ```

   JavaScript：

   ```js
   import { LightningElement, api, wire } from "lwc";
   import { getRecord, getFieldValue } from "lightning/uiRecordApi";
   import IDCard_FIELD from '@salesforce/schema/Lead.ID_Card__c';
   const fields = [IDCard_FIELD];
   export default class DocumentScanner extends LightningElement {
     @api recordId;
     @wire(getRecord, { recordId: "$recordId", fields })
     lead;

     @api imgDataURL = "";
     fetchedURL = "";
     get IDCardURL() {
       const url = getFieldValue(this.lead.data, IDCard_FIELD);
       if (url) {
         this.getImg(url); //get the image's base64 and display it
       }
       return url;
     }

     async getImg(url){
       if (url != this.fetchedURL) {
         let response = await fetch(url);
         let base64 = await response.text();
         this.imgDataURL = "data:image/jpeg;base64,"+base64;
         this.fetchedURL = url;
       }
     }
   }
   ```

3. 使用canvas从视频流捕获帧，并将base64编码的帧上传到服务器以检测和裁剪文档图像。如果操作成功，则更新记录的URL字段。

   ```js
   import { ShowToastEvent } from "lightning/platformShowToastEvent";
   import { getRecord, getFieldValue, updateRecord } from "lightning/uiRecordApi";
   import ID_FIELD from "@salesforce/schema/Lead.Id";

   async captureAndUpload(){
     let url = "https://localhost:7158/api/document/detectAndCrop";
     let dataURL = this.capture();
     let base64 = dataURL.substring(dataURL.indexOf(",")+1,dataURL.length);
     let data = {Base64:base64};
     const response = await fetch(url, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify(data),
     });
     let json = await response.json();
     this.imageID = json.id;
     if (json.success == true) {
       let url = "https://localhost:7158/api/document/cropped/"+this.imageID
       let response = await fetch(url);
       let base64 = await response.text();
       this.imgDataURL = "data:image/jpeg;base64,"+base64;
       this.updateURL(url);
     } else {
       alert("Failed to get the cropped Image.");
     }
   }

   capture(){
     const video = this.template.querySelector("video");
     const canvas = document.createElement("canvas");
     canvas.width = video.videoWidth;
     canvas.height = video.videoHeight;
     const ctx = canvas.getContext("2d");
     ctx.drawImage(video,0,0);
     return canvas.toDataURL("image/jpeg",100);
   }

   updateURL(url){
     const fields = {};
     fields[ID_FIELD.fieldApiName] = this.recordId;
     fields[IDCard_FIELD.fieldApiName] = url;
     const recordInput = { fields:fields };
     updateRecord(recordInput)
       .then(() => {
         this.dispatchEvent(
           new ShowToastEvent({
             title: "Success",
             message: "Record updated",
             variant: "success",
           }),
         );
       })
       .catch((error) => {
         this.dispatchEvent(
           new ShowToastEvent({
             title: "Error updating record",
             message: error.body.message,
             variant: "error",
           }),
         );
       });
   }
   ```

   需要先启动服务器。此外，将其URL添加到受信任URL列表中，否则请求将被CSP阻止。

   ![受信任的URL](/album/2024/06/salesforce/trusted_urls.jpg)


好了，我们已经完成了组件。

## 源代码

<https://github.com/tony-xlh/salesforce-document-scanner>

## 参考

* <https://developer.salesforce.com/docs/component-library/overview/components>
* <https://developer.salesforce.com/docs/platform/lwc/guide/reference-lightning-ui-api-record.html>
* <https://trailhead.salesforce.com/content/learn/projects/quick-start-lightning-web-components/create-a-hello-world-lightning-web-component>
* Salesforce CRM Administration Handbook
* Ultimate Salesforce LWC Developers' Handbook


