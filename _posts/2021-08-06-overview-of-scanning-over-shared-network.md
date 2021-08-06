---
layout: post
title: 网络文档扫描概述
date: 2021-08-06 10:53:53 +0800
date_gmt: 2021-08-06 15:53:53 +0800
categories: 文档扫描
tags: 远程扫描
---

[Dynamic Web TWAIN (DWT)](https://www.dynamsoft.com/web-twain/overview/)的[远程扫描](https://www.dynamsoft.com/blog/announcement/remote-scan-works-web-twain/)功能可以让用户通过网络在手机、电脑等设备上从扫描仪或者多功能一体机获取扫描文档。

那有没有其它的网络文档扫描方案呢？本文将对网络文档扫描做一个简单的概述，并分析DWT的远程扫描方案的优点。

## 现有方案

### 操作系统的共享功能

在Windows系统中，我们可以共享打印机。但共享扫描仪是不被支持的。多功能一体机设备能够被共享，但也只能当做打印机被共享。

![](/album/2021/network-scanning/sharing_printer_on_windows.jpg)

### Saned

在Linux上，我们可以使用Saned在内网共享USB连接的扫描仪。

具体的配置参见Debian的[wiki](https://wiki.debian.org/SaneOverNetwork#Sharing_a_USB_Connected_Scanner:_the_Basics)。

设置完成后，我们可以在任何安装了Sane的设备上进行扫描，例如使用 SANEDroid在Android手机上连接扫描仪进行扫描。

![](/album/2021/network-scanning/sanedroid.jpg)

缺点：

1. 需要在客户端上运行Sane。
2. 只支持USB连接的扫描仪。
3. 不支持自动发现。用户需要手动输入服务器的IP。

### eSCL

许多扫描仪现在都支持一种叫做eSCL的协议。它是一种通用的网络协议，允许通过以太网、WIFI和USB连接设备进行扫描，且不需要安装驱动。它使用Bonjour进行自动发现。

苹果公司推广的AirScan使用的便是eSCL协议。

eSCL是一个简单的基于XML和HTTP的协议。可以在[Mopria.org](https://mopria.org/spec-download)上找到它的完整标准。

下面是一个简单的Python脚本，能利用eSCL协议创建扫描作业并保存扫描的文档（在HP Officejet Pro 6970上测试可用）：

```py
from requests import get as requests_get, post as requests_post

def scan():

    scanner_ip = "192.168.8.66"

    xml = '''<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03" xmlns:dd="http://www.hp.com/schemas/imaging/con/dictionaries/1.0/" xmlns:dd3="http://www.hp.com/schemas/imaging/con/dictionaries/2009/04/06" xmlns:fw="http://www.hp.com/schemas/imaging/con/firewall/2011/01/05" xmlns:scc="http://schemas.hp.com/imaging/escl/2011/05/03" xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm"><pwg:Version>2.1</pwg:Version><scan:Intent>Photo</scan:Intent><pwg:ScanRegions><pwg:ScanRegion><pwg:Height>3300</pwg:Height><pwg:Width>2550</pwg:Width><pwg:XOffset>0</pwg:XOffset><pwg:YOffset>0</pwg:YOffset></pwg:ScanRegion></pwg:ScanRegions><pwg:InputSource>Platen</pwg:InputSource><scan:DocumentFormatExt>image/jpeg</scan:DocumentFormatExt><scan:XResolution>300</scan:XResolution><scan:YResolution>300</scan:YResolution><scan:ColorMode>Grayscale8</scan:ColorMode><scan:CompressionFactor>25</scan:CompressionFactor><scan:Brightness>1000</scan:Brightness><scan:Contrast>1000</scan:Contrast></scan:ScanSettings>'''

    resp = requests_post('http://{0}/eSCL/ScanJobs'.format(scanner_ip), data=xml, headers={'Content-Type': 'text/xml'})
    if resp.status_code == 201:
        url = '{0}/NextDocument'.format(resp.headers['Location'])
        r = requests_get(url)
        with open("scanned.jpg",'wb') as f:
            f.write(r.content)

scan()
```

由于CORS跨域限制，没办法直接用JavaScript来使用eSCL协议。

macOS和安装了[sane-airscan](https://github.com/alexpevzner/sane-airscan)的Linux能支持eSCL协议。

### WSD

另一个类似于eSCL的网络协议基于微软的设备Web服务框架。该协议叫做WSD。

Windows和安装了[sane-airscan](https://github.com/alexpevzner/sane-airscan)的Linux能支持WSD协议。

并非所有扫描仪都支持WSD和eSCL。有些可能只支持WSD，有些可能只支持eSCL。

## DWT的远程扫描解决方案

Dynamic Web TWAIN运行一个名为Dynamsoft Service的本地服务，以与扫描仪和Web客户端交互。该服务可以在Windows、Linux和macOS上运行，支持TWAIN、ICA和SANE等文档扫描API。

启用远程扫描功能后，内网的其他设备可以与该服务通讯以扫描文档。Dynamic Web TWAIN提供了一个易于使用的Web SDK，可以用它来制作一个网页远程文档扫描应用。

以下是DWT的远程扫描功能的优点：

1. 它是一种无驱动扫描解决方案。
2. 它在终端用户的Web浏览器上运行，支持大多数终端设备，不需要安装额外软件。
3. 它支持USB连接的扫描仪以及网络扫描仪。
4. 配置简单。只需要指定使用哪个内网IP。

![远程扫描](/album/2021/network-scanning/RemoteScan.jpg)

下载[Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/downloads)，尝试在你的手机上完成扫描吧。

## 相关文章

* [如何在树莓派上设置远程文档扫描](https://www.dynamsoft.com/codepool/setup-remote-document-scanning-on-raspberry-pi.html)
* [Dynamic Web TWAIN 16.2的“远程扫描”功能是如何运作的](https://www.dynamsoft.com/blog/announcement/remote-scan-works-web-twain/)
* [如何用HTML5构建一个通用文档扫描应用程序](https://www.dynamsoft.com/codepool/mobile-scanner-camera-document-capture.html)

