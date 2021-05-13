---
layout: post
title: Flutter Web插件实现：打通JavaScript和Dart
date:   2021-05-12 09:57:36 +0530
categories: 条形码
---
之前分享了如何在Flutter插件中支持Android和Windows，这篇文章将增加Web插件的实现方法，以及创建一个简单的web一维码，二维码识别应用。

![Flutter barcode scanner](https://www.dynamsoft.com/codepool/img/2021/flutter/flutter-web-barcode-scanner.png)
## 参考资源
- https://dart.dev/web/js-interop
- https://github.com/grandnexus/firebase-dart
- https://pub.dev/packages/js

## 开发Flutter Web插件
Web插件开发，主要问题是如何实现Dart和JavaScript的相互调用。官网提供的`firebase_web`示例值得学习和参考。

### 初始化web插件
在当前的插件工程中增加Web模板：

```
flutter create --template=plugin --platforms=web .
```

和Windows, Android不同，web模板没有生成一个叫`web`的目录，也没有生成任何的`JavaScritp`代码文件。我们只看到一个新的`flutter_barcode_sdk_web.dart`文件。

接下来把插件声明添加到`pubspec.yaml`中：

```yaml
flutter:
  plugin:
    platforms:
      android:
        package: com.dynamsoft.flutter_barcode_sdk
        pluginClass: FlutterBarcodeSdkPlugin
      windows:
        pluginClass: FlutterBarcodeSdkPlugin
      web:
        pluginClass: FlutterBarcodeSdkWeb
        fileName: flutter_barcode_sdk_web.dart
```

### 如何实现JavaScript和Dart交互
和其它平台一样，`handleMethodCall()`是入口：

```java
Future<dynamic> handleMethodCall(MethodCall call) async {
    switch (call.method) {
      case 'getPlatformVersion':
        return getPlatformVersion();
      default:
        throw PlatformException(
          code: 'Unimplemented',
          details:
              'flutter_barcode_sdk for web doesn\'t implement \'${call.method}\'',
        );
    }
  }
```

但不同的是，web并不需要在插件中引入依赖库编译，我们要做的只是定义接口。

我定义了两个接口：`decodeFile()`和`decodeVideo()`，分别用于通过图像和通过视频来识别一维码和二维码。

```java
BarcodeManager _barcodeManager = BarcodeManager();

/// Decode barcodes from an image file.
Future<List<Map<dynamic, dynamic>>> decodeFile(String file) async {
  return _barcodeManager.decodeFile(file);
}

/// Decode barcodes from real-time video stream.
Future<void> decodeVideo() async {
  _barcodeManager.decodeVideo();
}
```

在视频模式下，结果是通过回调返回的。然而，在上层的`flutter_barcode_sdk.dart`中，回调函数引用没有办法通过`invokeMethod`传递下来。我的解决方法是使用全局变量保存回调函数：

```java
Future<void> decodeVideo(Function callback) async {
  globalCallback = callback;
  await _channel.invokeMethod('decodeVideo');
}
```


为了避免和其它平台冲突，这个变量单独定义在一个`global.dart `文件中：

```java
Function globalCallback = () => {};
```

现在打开`barcode_manager.dart`，根据[dynamsoft-javascript-barcode](https://www.npmjs.com/package/dynamsoft-javascript-barcode)定义JavaScript的调用接口：

```java
@JS('Dynamsoft')
library dynamsoft;

import 'dart:convert';
import 'dart:js';
import 'package:flutter_barcode_sdk/barcode_result.dart';
import 'package:flutter_barcode_sdk/global.dart';
import 'package:js/js.dart';
import 'utils.dart';

/// BarcodeScanner class
@JS('DBR.BarcodeScanner')
class BarcodeScanner {
  external static PromiseJsImpl<BarcodeScanner> createInstance();
  external void show();
  external set onFrameRead(Function func);
}

/// BarcodeReader class
@JS('DBR.BarcodeReader')
class BarcodeReader {
  external static PromiseJsImpl<BarcodeReader> createInstance();
  external PromiseJsImpl<List<dynamic>> decode(dynamic file);
}
```

为了实现JavaScript的`Promise`，我们需要在另外一个`utils.dart`文件中定义：

```java
import 'dart:async';
import 'dart:js_util';
import 'package:js/js.dart';

typedef Func1<A, R> = R Function(A a);

@JS('JSON.stringify')
external String stringify(Object obj);

@JS('console.log')
external void log(Object obj);

@JS('Promise')
class PromiseJsImpl<T> extends ThenableJsImpl<T> {
  external PromiseJsImpl(Function resolver);
  external static PromiseJsImpl<List> all(List<PromiseJsImpl> values);
  external static PromiseJsImpl reject(error);
  external static PromiseJsImpl resolve(value);
}

@anonymous
@JS()
abstract class ThenableJsImpl<T> {
  external ThenableJsImpl then([Func1 onResolve, Func1 onReject]);
}

Future<T> handleThenable<T>(ThenableJsImpl<T> thenable) =>
    promiseToFuture(thenable);
```

接下来实现对象初始化：

```java
/// Initialize Barcode Scanner.
void initBarcodeScanner(BarcodeScanner scanner) {
  _barcodeScanner = scanner;
  _barcodeScanner.onFrameRead = allowInterop((results) =>
      {globalCallback(callbackResults(_resultWrapper(results)))});
}

/// Initialize Barcode Reader.
void initBarcodeReader(BarcodeReader reader) {
  _barcodeReader = reader;
}

BarcodeManager() {
  handleThenable(BarcodeScanner.createInstance())
      .then((scanner) => {initBarcodeScanner(scanner)});
```

Dart的函数需要通过`allowInterop()`封装才能够被JavaScript调用。

实现`decodeFile()`：

```java
Future<List<Map<dynamic, dynamic>>> decodeFile(String filename) async {
    List<dynamic> barcodeResults =
        await handleThenable(_barcodeReader.decode(filename));

    return _resultWrapper(barcodeResults);
  }
```

实现`decodeVideo()`回调：

```java
_barcodeScanner.onFrameRead = allowInterop((results) =>
        {globalCallback(callbackResults(_resultWrapper(results)))});
```

## 创建Web一维码，二维码识别程序
创建一个新的Flutter工程，并在`web/index.html`中添加`<script src="https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@8.2.3/dist/dbr.js" data-productKeys="PRODUCT-KEYS"></script>`。

在`pubspec.yaml`中添加`image_picker`和`flutter_barcode_sdk`:

```yaml
dependencies:
  flutter_barcode_sdk:
  image_picker:
```

在UI中添加两个按钮，一个用于加载图片，一个用于开启摄像头视频流：

```java
final picker = ImagePicker();

@override
Widget build(BuildContext context) {
  return MaterialApp(
    home: Scaffold(
        appBar: AppBar(
          title: const Text('Dynamsoft Barcode Reader'),
        ),
        body: Column(children: [
          Container(
            height: 100,
            child: Row(children: <Widget>[
              Text(
                _platformVersion,
                style: TextStyle(fontSize: 14, color: Colors.black),
              )
            ]),
          ),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  _file == null
                      ? Image.asset('images/default.png')
                      : Image.network(_file),
                  Text(
                    _barcodeResults,
                    style: TextStyle(fontSize: 14, color: Colors.black),
                  ),
                ],
              ),
            ),
          ),
          Container(
            height: 100,
            child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: <Widget>[
                  MaterialButton(
                      child: Text('Barcode Reader'),
                      textColor: Colors.white,
                      color: Colors.blue,
                      onPressed: () async {
                        final pickedFile =
                            await picker.getImage(source: ImageSource.camera);

                        setState(() {
                          if (pickedFile != null) {
                            _file = pickedFile.path;
                          } else {
                            print('No image selected.');
                          }

                          _barcodeResults = '';
                        });

                        if (_file != null) {
                          List<BarcodeResult> results =
                              await _barcodeReader.decodeFile(_file);
                          updateResults(results);
                        }
                      }),
                  MaterialButton(
                      child: Text('Barcode Scanner'),
                      textColor: Colors.white,
                      color: Colors.blue,
                      onPressed: () async {
                        _barcodeReader.decodeVideo(
                            (results) => {updateResults(results)});
                      }),
                ]),
          ),
        ])),
  );
```

最后运行程序：

```
flutter run -d chrome
```

![Flutter barcode reader](https://www.dynamsoft.com/codepool/img/2021/flutter/flutter-web-barcode-sdk.png)


## Flutter插件下载
[https://pub.dev/packages/flutter_barcode_sdk](https://pub.dev/packages/flutter_barcode_sdk)

## 源码
[https://github.com/yushulx/flutter_barcode_sdk](https://github.com/yushulx/flutter_barcode_sdk)
