---
layout: post
title: "命令行调用扫描仪扫描文档"
date: 2025-07-31 13:10:53 +0800
categories: 文档扫描
tags: 
description: 本文分享了如何在Windows、macOS和Linux上使用TWAIN、WIA、ICA、SANE和eSCL等API从命令行调用扫描仪扫描文档。
---

在本文中，我们将讨论如何从命令行（CLI）扫描文档，以便自动化文档扫描工作或者集成扫描功能到其它应用中。

有不同的API可以访问文档扫描仪，下面是一张对比表格。

| 特点 | TWAIN | WIA (Windows Image Acquisition) | SANE (Scanner Access Now Easy) | ICA (Image Capture Architecture) | eSCL |
|--------------------|-------------------------------------------------|---------------------------------|--------------------------------|----------------------------------|-----------------------------------------|
| 开发者 | TWAIN Working Group | Microsoft | SANE Open-Source Community | Apple | Mopria |
| 操作系统 | Windows、macOS、Linux（部分） | Windows | Linux、macOS、类Unix | macOS、iOS | 跨平台（Windows/macOS/Linux/mobile） |
| 支持的扫描仪 | 广泛 | 较广泛 | 较广泛（社区支持） | 较广泛 | 仅网络扫描仪/MFP |
| 功能 | 高级控制（ADF、条形码检测等） | 颜色模式等基本控制 | 中级控制 | 颜色模式等基本控制 | 颜色模式等基本控制 |

我们将使用这些API从命令行扫描文档。由于只有SANE提供了命令行工具，而其他没有，因此我们需要编写命令行工具来使用其他API。

## SANE

SANE有一个命令行工具`scanimage`。以下是它的基本用法：

1. 列出连接的扫描仪。

   ```bash
   scanimage -L
   ```

2. 使用指定的扫描仪获取图像。

   ```bash
   scanimage -d "scanner name" -o out.png
   ```

我们将要编写的其他API的命令行工具将具有相同的用法。

## TWAIN

TWAIN接口是用C++实现的，并有一个Python库。我们将使用Python编写命令行工具。

以下是关键部分的代码：

1. 导入库。

   ```py
   import twain
   ```

2. 列出扫描仪。

   ```py
   with twain.SourceManager() as sm:
       for source in sm.source_list:
           print(source)
   ```

3. 用扫描仪扫描。

   ```py
   from PIL import Image
   from io import BytesIO
   with twain.SourceManager() as sm:
      src = sm.open_source("scanner_name")
      src.request_acquire(show_ui=False, modal_ui=False)
      (handle, remaining_count) = src.xfer_image_natively()
      bmp_bytes = twain.dib_to_bm_file(handle)
      img = Image.open(BytesIO(bmp_bytes), formats=["bmp"])
      img.save("output_path")
   ```

## WIA

WIA提供API和COM的调用方式。我们将使用Python和COM来使用WIA。

以下是关键部分的代码：

1. 导入库。

   ```py
   from PIL import Image
   import pythoncom
   from win32com.client import Dispatch
   ```

2. 列出扫描仪。

   ```py
   manager = Dispatch("WIA.DeviceManager")
   devices = manager.DeviceInfos
   print("Available scanners:")
   for i in range(1, devices.Count + 1):
       device = devices.Item(i)
       # Check if the device is a scanner (Type = 1)
       if device.Type == 1:
           print(f"  Name: {device.Properties['Name'].Value}")
           print(f"  ID: {device.DeviceID}")
           print(f"  Description: {device.Properties['Description'].Value}")
           print("  ----------------")
   ```

3. 用扫描仪扫描。

   ```py
   wia = Dispatch("WIA.CommonDialog")
   manager = Dispatch("WIA.DeviceManager")

   devices = manager.DeviceInfos
   selected_device = None
   scanner_name = "target scanner name"
   for i in range(1, devices.Count + 1):
       device = devices.Item(i)
       if device.Type == 1 and device.Properties['Name'].Value == scanner_name:
           selected_device = device.Connect() # Select the scanner by name
           break

   img = None
   if selected_device is None:
       img = wia.ShowAcquireImage()  # Show scanning dialog with scanner selection
   else:
       img = wia.ShowTransfer(selected_device.Items[1])  # Transfer the scanned image using the selected scanner

   #save the image
   pil_img = Image.fromarray(img)
   pil_img.save(output_path)
   ```

## eSCL

eSCL是一个RESTful接口。网络扫描仪通过Bonjour进行广播，客户端可以找到它们并发送HTTP请求来扫描文档。我们也将使用Python编写扫描工具。

1. 导入库。

   ```py
   from zeroconf import ServiceBrowser, Zeroconf
   from requests import get as requests_get, post as requests_post
   ```

2. 通过检测类型为`_uscan_tcp.local.`的Bonjour服务来列出扫描仪。

   ```py
   class ESCLScannerListener:
       def __init__(self):
           self.scanners = []

       def add_service(self, zeroconf, type, name):
           info = zeroconf.get_service_info(type, name)
           if info:
               addresses = ["%s:%d" % (addr, info.port) for addr in info.addresses]
               scanner_info = {
                   'name': name,
                   'type': type,
                   'addresses': info.addresses,
                   'port': info.port,
                   'properties': info.properties
               }
               self.scanners.append(scanner_info)

       def remove_service(self, zeroconf, type, name):
           print(f"Scanner removed: {name}")

   def discover_escl_scanners(timeout=2):
       zeroconf = Zeroconf()
       listener = ESCLScannerListener()
       browser = ServiceBrowser(zeroconf, "_uscan._tcp.local.", listener)
       print(f"Discovering ESCL scanners for {timeout} seconds...")
       time.sleep(timeout)
       zeroconf.close()
       return listener.scanners
   ```

3. 用扫描仪扫描。扫描配置以XML表示。

   ```py
   def scan(scanner_address, output_path="scanned.jpg"):
       xml = '''<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03" xmlns:dd="http://www.hp.com/schemas/imaging/con/dictionaries/1.0/" xmlns:dd3="http://www.hp.com/schemas/imaging/con/dictionaries/2009/04/06" xmlns:fw="http://www.hp.com/schemas/imaging/con/firewall/2011/01/05" xmlns:scc="http://schemas.hp.com/imaging/escl/2011/05/03" xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm"><pwg:Version>2.1</pwg:Version><scan:Intent>Photo</scan:Intent><pwg:ScanRegions><pwg:ScanRegion><pwg:Height>3300</pwg:Height><pwg:Width>2550</pwg:Width><pwg:XOffset>0</pwg:XOffset><pwg:YOffset>0</pwg:YOffset></pwg:ScanRegion></pwg:ScanRegions><pwg:InputSource>Platen</pwg:InputSource><scan:DocumentFormatExt>image/jpeg</scan:DocumentFormatExt><scan:XResolution>300</scan:XResolution><scan:YResolution>300</scan:YResolution><scan:ColorMode>Grayscale8</scan:ColorMode><scan:CompressionFactor>25</scan:CompressionFactor><scan:Brightness>1000</scan:Brightness><scan:Contrast>1000</scan:Contrast></scan:ScanSettings>'''

       resp = requests_post('http://{0}/eSCL/ScanJobs'.format(scanner_address), data=xml, headers={'Content-Type': 'text/xml'})
       if resp.status_code == 201:
           url = '{0}/NextDocument'.format(resp.headers['Location'])
           r = requests_get(url)
           with open(output_path,'wb') as f:
               f.write(r.content)
   ```


## ICA

使用Image Capture API稍微复杂点，我们将创建一个Swift命令行项目来实现该工具。

以下是关键部分的代码：

1. 创建叫ScannerManager的类以列出扫描仪。

   ```swift
   class ScannerManager: NSObject, ICDeviceBrowserDelegate {
       private var deviceBrowser: ICDeviceBrowser!
       private var scanners: [ICScannerDevice] = []
       private var currentScanner: ICScannerDevice?
       private var scanCompletionHandler: ((Result<URL, Error>) -> Void)?
       private var targetURL: URL?

       override init() {
           super.init()
           setupDeviceBrowser()
       }

       private func setupDeviceBrowser() {
           deviceBrowser = ICDeviceBrowser()
           deviceBrowser.delegate = self
           let mask = ICDeviceTypeMask(rawValue:
                       ICDeviceTypeMask.scanner.rawValue |
                       ICDeviceLocationTypeMask.local.rawValue |
                       ICDeviceLocationTypeMask.bonjour.rawValue |
                       ICDeviceLocationTypeMask.shared.rawValue)
           deviceBrowser.browsedDeviceTypeMask = mask!
           deviceBrowser.start()
       }

       func listScanners(completion: @escaping ([ICScannerDevice]) -> Void) {
           DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
               completion(self.scanners)
           }
       }

       // MARK: - ICDeviceBrowserDelegate

       func deviceBrowser(_ browser: ICDeviceBrowser, didAdd device: ICDevice, moreComing: Bool) {
           guard let scanner = device as? ICScannerDevice else { return }
           scanners.append(scanner)
       }

       func deviceBrowser(_ browser: ICDeviceBrowser, didRemove device: ICDevice, moreGoing: Bool) {
           if let index = scanners.firstIndex(where: { $0 == device }) {
               scanners.remove(at: index)
           }
       }
   }
   ```

2. 让这个类继承`ICScannerDeviceDelegate`并添加与扫描相关的函数。

   ```swift
   func device(_ device: ICDevice, didCloseSessionWithError error: (any Error)?) {
       print("did close")
   }

   func didRemove(_ device: ICDevice) {
       print("did remove")
   }

   func device(_ device: ICDevice, didOpenSessionWithError error: (any Error)?) {
       print("did open")
       DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
           guard let self = self else { return }
           guard let scanner = currentScanner else { return }
           scanner.transferMode = .fileBased
           scanner.downloadsDirectory = URL(fileURLWithPath: NSTemporaryDirectory())
           scanner.documentName = "scan"
           scanner.documentUTI = kUTTypeJPEG as String
           if let functionalUnit = scanner.selectedFunctionalUnit as? ICScannerFunctionalUnit {
               let resolutionIndex = functionalUnit.supportedResolutions.integerGreaterThanOrEqualTo(300) ?? functionalUnit.supportedResolutions.last
               if let resolutionIndex = resolutionIndex ?? functionalUnit.supportedResolutions.last {
                   functionalUnit.resolution = resolutionIndex
               }

               let a4Width: CGFloat = 210.0 // mm
               let a4Height: CGFloat = 297.0 // mm
               let widthInPoints = a4Width * 72.0 / 25.4 // convert to point
               let heightInPoints = a4Height * 72.0 / 25.4

               functionalUnit.scanArea = NSMakeRect(0, 0, widthInPoints, heightInPoints)
               functionalUnit.pixelDataType = .RGB
               functionalUnit.bitDepth = .depth8Bits

               scanner.requestScan()
           }
       }
   }

   // MARK: - ICScannerDeviceDelegate

   func scannerDevice(_ scanner: ICScannerDevice, didScanTo url: URL) {
       print("did scan to")
       print(url.absoluteString)
       guard let targetURL = targetURL else {
           scanCompletionHandler?(.failure(NSError(domain: "ScannerError", code: -2, userInfo: [NSLocalizedDescriptionKey: "No target URL set"])))
           return
       }
       do {
           try FileManager.default.moveItem(at: url, to: targetURL)
           scanCompletionHandler?(.success(targetURL))
       } catch {
           scanCompletionHandler?(.failure(error))
       }
   }

   // MARK: - Scan Operations

   func startScan(scanner: ICScannerDevice, outputPath: String, completion: @escaping (Result<URL, Error>) -> Void) {
       currentScanner = scanner
       scanCompletionHandler = completion
       targetURL = URL(fileURLWithPath: outputPath)

       scanner.delegate = self
       scanner.requestOpenSession()
   }
   ```

## Dynamic Web TWAIN RESTful API

[Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/overview)提供RESTful API功能，支持使用TWAIN、WIA、SANE、ICA和eSCL等API扫描文档。您可以在[这个页面](https://www.dynamsoft.com/web-twain/restfulapi/)上找到它的详细信息。

以下是使用Dynamic Web TWAIN的RESTful API的好处：

1. 提供了调用主流的扫描API的统一接口，支持控制扫描仪的各种功能，支持不同平台。
2. 通过网络共享扫描仪，这样移动设备也可以访问文档扫描仪。
3. 支持各种编程语言去使用文档扫描功能。

以下是使用[Python版封装](https://pypi.org/project/twain-wia-sane-scanner/)的关键部分的代码：

1. 导入库并声明有关变量。可以在此处申请[许可证](https://www.dynamsoft.com/customer/license/trialLicense/?product=dwt)。

   ```py
   from dynamsoftservice import ScannerController, ScannerType
   license_key = "LICENSE-KEY"
   host = "http://127.0.0.1:18622"
   scannerController = ScannerController()
   ```

2. 列出扫描仪。

   ```py
   def list_scanners():
       """List all available scanners"""
       scanners = scannerController.getDevices(host)
       return scanners
   ```

3. 用扫描仪扫描。

   ```py
   def scan_document(output_path="scan.png", scanner_name=None):
       """
       Scan a document using Web TWAIN service and save as image file

       Parameters:
           output_path: Path to save scanned image
           scanner_name: Name of specific scanner to use (None shows dialog)
       """
       scanners = list_scanners()
       selectedScanner = None
       if scanner_name is not None:
           for scanner in scanners:
               if scanner['name'] == scanner_name:
                   selectedScanner = scanner
                   break

       parameters = {
           "license": license_key
       }

       if selectedScanner is not None:
           parameters["device"] = selectedScanner["device"]

       parameters["config"] = {
           "IfShowUI": False,
           "PixelType": 2,
           "Resolution": 200,
           "IfFeederEnabled": False,
           "IfDuplexEnabled": False,
       }

       job = scannerController.createJob(host, parameters)
       print(job)
       if "jobuid" in job:
           job_id = job["jobuid"]
           stream = scannerController.getImageStreams(host,job_id)[0]
           with open(output_path,"wb") as f:
               f.write(stream)
               f.close()
       return output_path
   ```

除了RESTful API，Dynamic Web TWAIN还提供了一个JavaScript库，该库具有专用的文档查看器、完整的文档扫描API包装、本地缓存和各种补充API，以提供基于浏览器的文档扫描解决方案。[访问其在线demo](https://demo.dynamsoft.com/web-twain/)进行试用。

## 源代码

可以在GitHub上获取源代码，了解命令行工具的具体使用说明：

<https://github.com/tony-xlh/document-scanner-cli/>


## 外部链接

* [TWAIN](https://twain.org/)
* [Windows Image Acquisition (WIA)](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/wia/-wia-startpage)
* [SANE](http://sane-project.org/)
* [Image Capture](https://developer.apple.com/documentation/imagecapturecore)
* [Mopria eSCL](https://mopria.org/spec-download)


