---
layout: post
title: B4X跨平台扫码应用
date: 2021-05-25 17:11:53 +0800
categories: 条码扫描
tags: B4X 跨平台
---

[B4X](https://www.b4x.com)是一套快速应用开发（RAD）工具，可用于为主流的移动和桌面平台开发应用。

它包含四个产品：B4A、B4i、B4J和B4R，分别用于Android、iOS、Java（JavaFX桌面、服务器和树莓派）和Arduino开发。

除了多平台支持外，B4X还具有以下特点：

* 易于使用的编程语言
* 功能齐全的专用IDE
* 活跃而友好的社区

B4X可以创建Android和iOS原生应用。B4X编程语言是一种Visual Basic的现代版本。它会被编译成Android的Java和iOS的Objective-C代码。因为这个特点，将Java/Objective-C的类库集成到B4X项目中是很容易的事情。B4X代码可以跨平台共享。不过我们仍然需要编写平台专属的部分代码，比如控制摄像头和选择文件。

[Dynamsoft Barcode Reader (DBR)](https://www.dynamsoft.com/barcode-reader/overview/)是一种用C++编写的条码SDK，提供JavaScript、Java和Objective-C的封装。我们可以很容易地将其封装为一个B4X库，便于用B4X开发Android、iOS和桌面端的条码读取软件。

在本文中，我们将完成B4X库的封装，并创建Android、iOS和桌面平台上的演示应用。


## 创建一个新项目

我们首先建立一个新的B4J项目来创建和测试这个扫码库。

1. 在B4J中创建一个新的B4XPages项目。

   ![新项目](/album/2021/B4X/new_project.png)

2. 打开UI设计器。添加一个选择图像按钮，一个解码按钮，一个面板用于显示图像，一个标签用于显示结果。

   ![设计器](/album/2021/B4X/designer.jpg)

   之后，我们单击生成成员以在代码中声明这些控件并添加事件子程序。

   ![生成成员](/album/2021/B4X/generate_members.jpg)

3. 实现图像选择器。用B4XCanvas在面板上绘制所选图像。

   ```vb
   Private Sub btnLoadImage_Click
       Dim bm As B4XBitmap
       Dim fc As FileChooser
       fc.Initialize
       Dim path As String=fc.ShowOpen(B4XPages.GetNativeParent(Me))    
       If File.Exists(path,"") Then
           bm=xui.LoadBitmap(path,"")
           cvs.ClearRect(cvs.TargetRect)
           drawBitmap(bm)
           Panel1.Tag=bm
       End If
   End Sub
   ```

现在，我们要实现解码部分。

## 封装Dynamsoft Barcode SDK

让我们先完成封装。

### 添加依赖项

1. 从[官网](https://www.dynamsoft.com/barcode-reader/downloads/)下载Dynamsoft Barcode Reader的jar文件。
2. 配置额外类库文件夹的路径。

   ![库的路径](/album/2021/B4X/config_lib_path.jpg)

3. 将jar放在额外类库文件夹中。
4. 在`Main`中添加以下代码行导入jar：

   ```vb
   #AdditionalJar: dynamsoft-barcodereader-8.2
   ```

### 封装第三方库的方法

封装库主要有两种方法。

一种是直接用Java编写（[详细说明](https://www.b4x.com/android/forum/threads/java-creating-libraries-for-b4a.6810/)）。使用Objective-C创建iOS库会稍微困难一点。

另一种是使用[JavaObject](https://www.b4x.com/android/forum/threads/javaobject-library.34486/)，基于Java反射特性直接调用Java API。B4i中和JavaObject对应的是[NativeObject](https://www.b4x.com/b4i/help/core.html#nativeobject)。

它可以与[内联Java代码](https://www.b4x.com/android/forum/threads/inline-java-code.50141/)一起使用。Java代码可以直接包含在B4X的源代码中，如下所示。

```vb
#If JAVA
public String FirstMethod() {
   return "Hello World!";
}
#End If
```

然后可以使用JavaObject调用它。

```vb
Dim JO as JavaObject=Me
Dim s As String = JO.RunMethod("FirstMethod", Null)
Log(s) 'will print Hello World!
```

这里，我们选择使用JavaObject来进行封装。

### 实现封装

创建一个类并将其命名为DBR。具体代码如下。

```vb
Sub Class_Globals
    Private reader As JavaObject
End Sub

'Initializes the object. You can add parameters to this method if needed.
Public Sub Initialize
    reader.InitializeNewInstance("com.dynamsoft.dbr.BarcodeReader",Null)            
End Sub

public Sub initLicenseFromKey(license As String)
    'request your license here: https://www.dynamsoft.com/customer/license/trialLicense?ver=latest
    reader.RunMethod("initLicense",Array(license))
End Sub

private Sub ConvertToTextResults(results() As Object) As List
    Dim list1 As List
    list1.Initialize
    For Each result As Object In results
        Dim tr As TextResult
        tr.Initialize(result) 'convert the TextResult Java object to a B4X object
        list1.Add(tr)
    Next
    Return list1
End Sub

Sub decodeImage(bitmap As B4XBitmap) As List    
    Dim results() As Object
    Dim SwingFXUtils As JavaObject
    SwingFXUtils.InitializeStatic("javafx.embed.swing.SwingFXUtils")
    Dim bufferedImage As Object=SwingFXUtils.RunMethod("fromFXImage",Array(bitmap,Null)) ' convert JavaFX image to bufferedImage
    results=reader.RunMethod("decodeBufferedImage",Array(bufferedImage,""))
    Return ConvertToTextResults(results)
End Sub
```

创建一个TextResult类来表示解码结果。这里我们只解析文本和定位结果。

```vb
Sub Class_Globals
    Private mTextResult As JavaObject
    Private mText As String
    Private mResultPoints(4) As Point2D
    Type Point2D(x As Int,y As Int)
End Sub

'Initializes the object. You can add parameters to this method if needed.
Public Sub Initialize(result As Object)
    mTextResult=result    
    Parse
End Sub

Private Sub Parse
    mText=mTextResult.GetField("barcodeText")
    Dim points() As Object=mTextResult.GetFieldJO("localizationResult").GetField("resultPoints")
    For i=0 To 3
        Dim point As JavaObject=points(i)    
        Dim p As Point2D
        p.Initialize
        p.x=point.GetField("x")
        p.y=point.GetField("y")
        mResultPoints(i)=p
    Next
End Sub

Public Sub getObject As Object
    Return mTextResult
End Sub

Public Sub getText As String
    Return mText
End Sub

Public Sub getResultPoints As Point2D()
    Return mResultPoints
End Sub
```

### 封装后的使用

现在，我们可以用做好的封装来实现解码部分。

1. 初始化一个DBR的实例，命名为reader。

   ```vb
   Sub Class_Globals
       Private reader As DBR
   End Sub

   Public Sub Initialize
       reader.Initialize
       reader.initLicenseFromKey("<license key>")
   End Sub
   ```

2. 解码图像并显示结果。

   ```vb
   	Private Sub btnDecode_Click        
   		If (Panel1.Tag Is B4XBitmap)=False  Then
   			xui.MsgboxAsync("Please load an image first","")
   			Return
   		End If
   		Dim bm As B4XBitmap=Panel1.Tag
   		Dim results As List=reader.decodeImage(bm)
   		Dim sb As StringBuilder
   		sb.Initialize
   		Dim color As Int=xui.Color_Red
   		Dim stroke As Int=2
   		For Each result As TextResult In results
   			sb.Append("Text: ").Append(result.Text).Append(CRLF)
   			For i=0 To 2
   				Dim x1 As Int=result.ResultPoints(i).x*xPercent
   				Dim y1 As Int=result.ResultPoints(i).y*yPercent
   				Dim x2 As Int=result.ResultPoints(i+1).x*xPercent
   				Dim y2 As Int=result.ResultPoints(i+1).y*yPercent
   				cvs.DrawLine(x1,y1,x2,y2,color,stroke)
   			Next
   			cvs.DrawLine(result.ResultPoints(3).x*xPercent, _
   						 result.ResultPoints(3).y*yPercent, _
   						 result.ResultPoints(0).x*xPercent, _
   						 result.ResultPoints(0).y*yPercent,color,stroke)
   		Next    
   		cvs.Invalidate
   		lblResult.Text=sb.ToString
   	End Sub
   ```

下图是最后实现的应用：

![条码读取器B4J](/album/2021/B4X/b4j_reader.jpg)

## 跨平台的实现

我们已经完成了应用的B4J版本。接下来我们稍作修改，使其能够在Android和iOS上工作。

### 共享类和布局

在建立B4XPages项目时，会创建包含平台特定的文件的三个文件夹和一个共享资产文件的`Shared Files`文件夹。共享的类文件存储在根目录中。

打开之前建立的项目的文件夹。我们可以看到这样的文件夹结构：

```
│  B4XMainPage.bas
│
├─B4A
│  │  BarcodeReader.b4a
│  │  BarcodeReader.b4a.meta
│  │  Starter.bas
│  │
│  └─Files
│          mainpage.bal
│
├─B4i
│  │  BarcodeReader.b4i
│  │  BarcodeReader.b4i.meta
│  │
│  └─Files
│      │  mainpage.bil
│      │
│      └─Special
├─B4J
│  │  BarcodeReader.b4j
│  │  BarcodeReader.b4j.meta
│  │  DBR.bas
│  │  TextResult.bas
│  │
│  └─Files
│          MainPage.bjl
│
└─Shared Files
```

现在我们想让我们刚建立的文件在三个平台的项目中共享。

1. 将`DBR.bas`和`TextResult.bas`移到根目录。打开B4A、B4J和B4i项目，使用相对路径导入这两个文件。

   ![链接模块](/album/2021/B4X/link_modules.jpg)

2. 在B4J中，打开设计器。选择并复制所有控件。用设计器打开B4i和B4A的布局文件并粘贴。

   ![粘贴布局](/album/2021/B4X/paste_layout.gif)

### 添加特定于平台的代码

特定于平台的代码可以使用#if语句存在于一个源文件中。让我们具体来看一下。

#### B4A代码

1. 使用aar。

   从Dynamsoft下载aar文件，将其放入额外类库文件夹，并在Main中添加以下代码行：

   ```
   #AdditionalJar: DynamsoftBarcodeReaderAndroid.aar
   ```

2. 图像选择器是特定于平台的。我们在`if b4a`语句中添加代码，使用`ContentChooser`来拾取图像。

   ```vb
   Private Sub btnLoadImage_Click
       Dim bm As B4XBitmap

       #if b4a
       Dim cc As ContentChooser
       cc.Initialize("CC")
       cc.Show("image/*", "Choose image")
       Wait For CC_Result (Success As Boolean, Dir As String, FileName As String)
       If Success Then
           bm=LoadBitmap(Dir,FileName)
       Else
           ToastMessageShow("No image selected", True)
       End If    
       #End If

       #if b4j
       Dim fc As FileChooser
       fc.Initialize
       Dim path As String=fc.ShowOpen(B4XPages.GetNativeParent(Me))    
       If File.Exists(path,"") Then
           bm=xui.LoadBitmap(path,"")
       End If        
       #End If    

       If bm.IsInitialized And bm<>Null Then         
           cvs.ClearRect(cvs.TargetRect)
           drawBitmap(bm)
           Panel1.Tag=bm
       End If
   End Sub
   ```

3. Dynamsoft Barcode Reader移动版可以通过连接到许可证跟踪服务器（LTS）进行为期7天的公共试用。

   将以下Java代码添加到`DBR.bas`中：

   ```vb
   #If b4a

   #if java
   import com.dynamsoft.dbr.BarcodeReader;
   import com.dynamsoft.dbr.BarcodeReaderException;
   import com.dynamsoft.dbr.DMLTSConnectionParameters;
   import com.dynamsoft.dbr.DBRLTSLicenseVerificationListener;
   public static void initLicenseFromLTS(BarcodeReader dbr,String organizationID){
       DMLTSConnectionParameters parameters = new DMLTSConnectionParameters();
       parameters.organizationID = organizationID;
       dbr.initLicenseFromLTS(parameters, new DBRLTSLicenseVerificationListener() {
           @Override
           public void LTSLicenseVerificationCallback(boolean isSuccess, Exception error) {
               if (!isSuccess) {
                   error.printStackTrace();
               }
           }
       });
   }
   #End If

   #End If
   ```

   添加下列Sub以从LTS初始化许可证。

   ```vb
   public Sub initLicenseFromLTS(organizationID As String)
       Dim JO as JavaObject=Me
       JO.RunMethod("initLicenseFromLTS",Array(reader,organizationID))    
   End Sub    
   ```

   在`B4XMainPage.bas`中，如果是移动平台，则使用`initLicenseFromLTS`。

   ```vb
   Public Sub Initialize
       reader.Initialize        
       #if b4j
       reader.initLicenseFromKey("<license key>")
       #else
       reader.initLicenseFromLTS("200001")    
       #End If    
   End Sub
   ```

4. 在B4J中，图像需要转换为BufferedImage，而Android上的位图可以直接使用。

   ```vb
   Sub decodeImage(bitmap As B4XBitmap) As List            
       Dim results() As Object        

       #If b4j

       Dim SwingFXUtils As JavaObject
       SwingFXUtils.InitializeStatic("javafx.embed.swing.SwingFXUtils")
       Dim bufferedImage As Object=SwingFXUtils.RunMethod("fromFXImage",Array(bitmap,Null))
       results=reader.RunMethod("decodeBufferedImage",Array(bufferedImage,""))

       #else if b4a

       results=reader.RunMethod("decodeBufferedImage",Array(bitmap,""))    

       #End If    

       Return ConvertToTextResults(results)    
   End Sub
   ```

完成了。我们现在可以在Android上运行这个应用了。

![Android](/album/2021/B4X/android.jpg)

#### B4i代码

1. 使用Framework。

   从Dynamsoft网站下载Dynamsoft Barcode Reader的iOS框架，将其放入本地Mac构建器的库文件夹中，并在Main中添加以下代码行：

   ```vb
   #AdditionalLib: DynamsoftBarcodeReader.framework.3
   #AdditionalLib: libc++.tbd
   ```

2. 使用Camera类选择图像。

   ```vb
   #if b4i
   Dim cam As Camera
   cam.Initialize("camera",B4XPages.GetNativeParent(Me))
   cam.SelectFromSavedPhotos(Sender, cam.TYPE_IMAGE)    
   Wait For camera_Complete (Success As Boolean, Image As Bitmap, VideoPath As String)
   If Success Then        
       Dim NO as NativeObject=Me
       bm=NO.RunMethod("normalizedImage:",Array(Image))            
   End If
   #End If
   ```

   iOS中拍摄的图像需要进行处理，否则图像可能会被旋转。

   以下Objective-C代码用于执行此操作：

   ```vb
   #if b4i
   #if objc
   //https://stackoverflow.com/questions/8915630/ios-uiimageview-how-to-handle-uiimage-image-orientation
   - (UIImage *)normalizedImage: (UIImage*) image {
       if (image.imageOrientation == UIImageOrientationUp) return image;
       UIGraphicsBeginImageContextWithOptions(image.size, NO, image.scale);
       [image drawInRect:(CGRect){0, 0, image.size}];
       UIImage *normalizedImage = UIGraphicsGetImageFromCurrentImageContext();
       UIGraphicsEndImageContext();
       return normalizedImage;
   }
   #End If
   #End If

   ```

3. 使用NativeObject和JavaObject存在不同。我们使用内嵌Objective-C代码直接调用DBR的api，相关的B4X Sub需要稍加修改。

   ```vb
   #if b4i
   #If ObjC
   #import <DynamsoftBarcodeReader/DynamsoftBarcodeReader.h>
   - (DynamsoftBarcodeReader*) initializeDBR: (NSString*) license {
       DynamsoftBarcodeReader *dbr;
       dbr = [[DynamsoftBarcodeReader alloc] initWithLicense:license];
       NSLog(dbr.getVersion);
       return dbr;
   }

   - (DynamsoftBarcodeReader*) initializeDBRFromLTS: (NSString*) organizationID {

       DynamsoftBarcodeReader *dbr;
       iDMLTSConnectionParameters* lts = [[iDMLTSConnectionParameters alloc] init];
       lts.organizationID = organizationID;    
       dbr = [[DynamsoftBarcodeReader alloc] initLicenseFromLTS:lts verificationDelegate:self];
       return dbr;
    }

   - (NSArray<iTextResult*>*) decodeImage: (UIImage*) image {
       NSError __autoreleasing * _Nullable error;
       DynamsoftBarcodeReader* dbr=self->__reader.object;
       NSArray<iTextResult*>* result = [dbr decodeImage:image withTemplate:@"" error:&error];    
       NSLog(@"%lu",(unsigned long)result.count);
       return result;
   }

   #end if
   #End If
   ```

   整个decodeImage方法：

   ```vb
   Sub decodeImage(bitmap As B4XBitmap) As List            
       #if b4i    

       Dim results As List=asNO(Me).RunMethod("decodeImage:",Array(bitmap))
       Return ConvertToTextResults2(results)        

       #Else    

       Dim results() As Object        

       #If b4j

       Dim SwingFXUtils As JavaObject
       SwingFXUtils.InitializeStatic("javafx.embed.swing.SwingFXUtils")
       Dim bufferedImage As Object=SwingFXUtils.RunMethod("fromFXImage",Array(bitmap,Null))
       results=reader.RunMethod("decodeBufferedImage",Array(bufferedImage,""))

       #Else If b4a

       results=reader.RunMethod("decodeBufferedImage",Array(bitmap,""))    

       #End If    

       Return ConvertToTextResults(results)

       #End if        
   End Sub
   ```

现在，我们可以在iOS上运行条码阅读器了。

![iOS](/album/2021/B4X/ios.jpg)


## 结论

使用B4X可以很容易地创建跨平台条码阅读器。代码和UI可以跨平台共享。不过我们还是需要了解一些原生开发。

## 源代码

<https://github.com/xulihang/BarcodeReader-B4X>

该库已经在[B4X论坛](https://www.b4x.com/android/forum/threads/b4x-b4xpages-dynamsoft-barcode-reader-cross-platform-barcode-qr-code-scanning-library.130728/)上发布。

## 更多

* 另外还实现了视频流扫码应用：

   ![条形码扫描器](/album/2021/B4X/barcode_scanner.gif)

   [源代码](https://github.com/xulihang/BarcodeReader-B4X)

* 使用B4J+BANano创建了一个Web应用程序：

   ![Web](/album/2021/B4X/web.jpg)

   [在线演示](https://pwa.xulihang.me/barcodereader/)

   [源代码](https://github.com/xulihang/BANano_BarcodeReader)

以后文章里会介绍开发的细节。

