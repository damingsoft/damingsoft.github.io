---
layout: post
title: "如何在Windows上使用SANE扫描文档"
date: 2025-11-14 11:25:53 +0800
categories: 文档扫描
tags: 
description: 本文分享了如何连接USB设备到Windows的WSL并用SANE扫描文档。
---


SANE是用于连接文档扫描仪的一套API，主要用于UNIX系统。与TWAIN（另一种主要用于Windows的文档扫描API）相比，它有几个优点：

1. TWAIN不会将用户界面与设备的驱动程序分开。这样很难通过网络访问图像捕获设备。而SANE则可以轻松地在纯命令行环境中使用。
2. SANE内置了对各种扫描仪的支持，而使用TWAIN必须下载并安装单独的驱动程序。

有一些在Windows上运行SANE的尝试。但大多数做法仍然需要Linux环境。借助Windows的Linux子系统（WSL），这一过程变得更加容易。

继续阅读以了解如何做到这一点。

## 将USB设备连接到WSL

1. 安装Linux WSL发行版后，将其版本设置为2以使用WSL 2。

   ```
   PS C:\Users\admin> wsl -l  -v
     NAME            STATE           VERSION
     Debian          Running         1
   PS C:\Users\admin> wsl --set-version Debian 2
   ```

2. 在Windows上安装USBIPD。可以在[GitHub](https://github.com/dorssel/usbipd-win/releases)上找到它的安装程序。
3. 使用USBIPD将USB设备连接到WSL。

   ```
   PS C:\Users\admin> usbipd list # list USB devices connected to the host
   PS C:\Users\admin> usbipd bind --busid <busid> # share the device. You can find the bus id in the previous step
   PS C:\Users\admin> usbipd attach --wsl --busid <busid> # attach the device to WSL
   ```

4. 在Linux中运行`lsusb`，可以在列表中找到USB设备。

   ```bash
   $ lsusb
   Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
   Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
   Bus 002 Device 003: ID 04c5:132e Fujitsu, Ltd fi-7160
   ```

## 使用SANE扫描文档

1. 安装SANE。这里，我们的系统是Debian。

   ```bash
   $ sudo apt install sane-utils
   ```

2. 使用`scanimage`命令行工具列出扫描仪和扫描文档。

   ```bash
   $ scanimage -L
   device 'fujitsu:fi-7160:151477' is a FUJITSU fi-7160 scanner
   $ scanimage -o scanned.png # save the document to an image
   ```

## 在浏览器中扫描文档

接下来，我们将使用Dynamic Web TWAIN SDK创建一个网页，在Windows上的浏览器中扫描文档，并使用WSL中运行的SANE后端。

1. 在WSL上，安装Dynamic Web TWAIN服务。可以在它的[npm包](https://app.unpkg.com/dwt@19.2.0/files/dist/dist)上找到安装程序。

   ```bash
   sudo dpkg -i DynamicWebTWAINServiceSetup.deb
   ```

   该服务将作为HTTP服务器在网页和扫描仪之间进行通信。您可以通过访问<http://127.0.0.1:18625>来检查它是否已安装。

   每次系统启动时，还需要启动两个进程。以下是启动它们的命令：

   ```
   nohup "/opt/dynamsoft/Dynamic Web TWAIN Service 19/DynamsoftScanning" gtkproxy &
   nohup "/opt/dynamsoft/Dynamic Web TWAIN Service 19/DynamsoftScanningMgr" &
   ```

   可以自己创建一个服务来启动它们。

2. 使用以下代码编写一个网页来扫描文档并另存为PDF：

   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Scan via SANE on Windows</title>
     <script src="https://cdn.jsdelivr.net/npm/dwt@latest/dist/dynamsoft.webtwain.min.js"></script>
   </head>
   <body>
     <button onclick="AcquireImage();">Scan</button>
     <button onclick="SaveAsPDF();">Save as PDF</button>
     <div id="dwtcontrolContainer"></div>
     <script type="text/javascript">
       Dynamsoft.DWT.Host = "local.dynamsoft.com";
       Dynamsoft.DWT.ResourcesPath = "https://cdn.jsdelivr.net/npm/dwt@latest/dist";
       //You need to set the service installer location here since the installer's size exceeds jsdelivr's limit.
       //You'd better host the installers in your own environment.
       Dynamsoft.DWT.ServiceInstallerLocation = 'https://unpkg.com/dwt/dist/dist/';
       Dynamsoft.DWT.ProductKey = 'LICENSE-KEY';
       Dynamsoft.DWT.Containers = [{ ContainerId: 'dwtcontrolContainer', Width: 270, Height: 350 }];
       window.onload = function () {
         Dynamsoft.DWT.Load();
       };
       var DWTObject;
       Dynamsoft.DWT.RegisterEvent("OnWebTwainReady", function() {
         // dwtcontrolContainer is the id of the DIV to create the WebTwain instance in.
         DWTObject = Dynamsoft.DWT.GetWebTwain('dwtcontrolContainer');
       });
       function AcquireImage() {
         if (DWTObject) {
           DWTObject.SelectSourceAsync().then(function(){
             return DWTObject.AcquireImageAsync({
               PixelType: Dynamsoft.DWT.EnumDWT_PixelType.TWPT_RGB,
               Resolution: 200,
               IfCloseSourceAfterAcquire: true
             });
           }).catch(function (exp) {
             alert(exp.message);
           });
         }
       }

       function SaveAsPDF(){
         if (DWTObject) {
           DWTObject.ConvertToBlob(
             DWTObject.SelectAllImages(),
             Dynamsoft.DWT.EnumDWT_ImageType.IT_PDF,
             function (result, indices, type) {
               console.log(result.size);
               DownloadBlobAsFile(result, "scanned_document.pdf");
             },
             function (errorCode, errorString) {
               console.log(errorString);
             },
           );
         }
       }

       function DownloadBlobAsFile(blob, fileName) {
         var link = document.createElement('a');
         link.href = window.URL.createObjectURL(blob);
         link.download = fileName;
         link.click();
       }
     </script>
   </body>
   </html>
   ```

现在，我们可以使用SANE在Windows上扫描文档了。

![演示页面](/album/2025/11/sane-demo-page.jpg)


## 源代码

<https://github.com/tony-xlh/Dynamic-Web-TWAIN-samples/tree/main/Windows-SANE>






