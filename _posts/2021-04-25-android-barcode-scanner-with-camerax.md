---
layout: post
title: 基于CameraX的Android条码扫描应用
date: 2021-04-25 13:44:53 +0800
categories: 条码识别
tags: Android
---

相机控制和条码识别是条形扫描应用的两个重要组成部分。

[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)是一个高级的条码识别SDK，包含一个易于使用的Android类库。我们不需花太多工夫就能集成条码识别功能。

而制作一个好的相机应用程序则并不容易。在Android中，有三套相机API可供使用：`Camera`、`Camera2`和`CameraX`。

`Camera`可以拍照和录制视频。但它的摄像头控制功能有限。`Camera2`为复杂的用例提供了深入的控制功能，但要求针对特定设备管理配置。[^Camera2]它的用法也很复杂（[之前的文章](https://www.dynamsoft.com/codepool/android-camera-preview-app-camera2.html)有对两者进行比较）。

CameraX则是最新的一套API。以下是来自Google[^camerax]的描述：

> CameraX 是一个 Jetpack 支持库，旨在帮助您简化相机应用的开发工作。它提供一致且易用的 API 接口，适用于大多数 Android 设备，并可向后兼容至 Android 5.0（API 级别 21）。
>
> 虽然 CameraX 利用了 camera2 的功能，但采取了一种具有生命周期感知能力且基于用例的更简单方式。它还解决了设备兼容性问题，因此您无需在代码库中添加设备专属代码。这些功能减少了将相机功能添加到应用时需要编写的代码量。

CameraX有三个基本用例：预览、图像分析和图像拍摄。

图像分析能方便地使用像ML Kit这样的技术来分析缓存的图像，这对于条形码读取也很有用。我们也不必担心并发，因为CameraX会为我们解决这个问题。

在本文中，我们将讨论如何用CameraX构建一个条码扫描应用，如下所示。

![屏幕截图](https://www.dynamsoft.com/codepool/img/2021/camerax/screenshot.jpg)

## 创建一个新项目

1. 打开Android Studio，创建一个新项目。选择`Empty Activity`。使用Java作为编程语言，并将最小sdk设置为21，因为CameraX至少需要Android 5.0。
2. 按照[这一指南](https://www.dynamsoft.com/barcode-reader/programming/android/user-guide.html?ver=latest#getting-started-helloworld)添加Dynamsoft Barcode Reader。
3. 按照[这一指南](https://codelabs.developers.google.com/codelabs/camerax-getting-started#1)添加CameraX。

## 布局设计

以下是activity_main.xml的内容，它定义了MainActivity的布局。有一个按钮用于打开相机的Activity。

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".MainActivity">
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical">
        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:id="@+id/container"
            android:textSize="20sp"
            android:text="This is a CameraX test app!"
            android:gravity="center">
        </TextView>
        <Button
            android:id="@+id/enableCamera"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:gravity="center"
            android:text="Open Camera" />
    </LinearLayout>
</androidx.constraintlayout.widget.ConstraintLayout>
```

创建一个新的Camera Activity，以显示相机预览和条码读取结果。下面是它的布局。

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".CameraActivity">

    <androidx.constraintlayout.widget.ConstraintLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent">

        <androidx.camera.view.PreviewView
            android:id="@+id/previewView"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintTop_toTopOf="parent">

        </androidx.camera.view.PreviewView>
    </androidx.constraintlayout.widget.ConstraintLayout>


    <androidx.constraintlayout.widget.ConstraintLayout
        android:id="@+id/resultContainer"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent">

        <TextView
            android:id="@+id/resultView"
            android:layout_width="match_parent"
            android:layout_height="150dp"
            android:layout_gravity="bottom"
            android:background="#80000000"
            android:gravity="center_horizontal|top"
            android:textColor="#9999ff"
            android:textSize="12sp"
            app:layout_constraintBottom_toBottomOf="parent"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintStart_toStartOf="parent" />
    </androidx.constraintlayout.widget.ConstraintLayout>

</androidx.constraintlayout.widget.ConstraintLayout>
```

## 使用CameraX预览和分析图像

1. 为“打开相机”按钮设置事件侦听器。

   ```java
   Button enableCamera = findViewById(R.id.enableCamera);
       Context ctx=this;
       enableCamera.setOnClickListener(new View.OnClickListener() {
           @Override
           public void onClick(View v) {
               if (hasCameraPermission()) {
                   Intent intent = new Intent(ctx, CameraActivity.class);
                   startActivity(intent);
               } else {
                   requestPermission();
                   Toast.makeText(ctx, "Please grant camera permission" , Toast.LENGTH_SHORT).show();
               }
           }
       });
   ```

   需要请求摄像头权限。

   当需要使用摄像头时，它会请求用户授予权限。以下是相关代码：

   ```java
   //properties
   private static final String[] CAMERA_PERMISSION = new String[]{Manifest.permission.CAMERA};
   private static final int CAMERA_REQUEST_CODE = 10;

   //methods
   private boolean hasCameraPermission() {
       return ContextCompat.checkSelfPermission(
               this,
               Manifest.permission.CAMERA
       ) == PackageManager.PERMISSION_GRANTED;
   }

   private void requestPermission() {
       ActivityCompat.requestPermissions(
               this,
               CAMERA_PERMISSION,
               CAMERA_REQUEST_CODE
       );
   }
   ```

   添加以下内容到`AndroidManifest.xml`：

   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   ```

2. 初始化并启用预览和图像分析用例

   Dynamsoft Barcode Reader被用于从图像缓冲区识别条形码。

   ```java
   @Override
   protected void onCreate(Bundle savedInstanceState) {
       super.onCreate(savedInstanceState);
       setContentView(R.layout.activity_camera);
       previewView = findViewById(R.id.previewView);
       resultView = findViewById(R.id.resultView);
       exec = Executors.newSingleThreadExecutor();
       try {
           dbr = new BarcodeReader();
       } catch (BarcodeReaderException e) {
           e.printStackTrace();
       }
       DMLTSConnectionParameters parameters = new DMLTSConnectionParameters();
       parameters.organizationID = "200001";
       dbr.initLicenseFromLTS(parameters, new DBRLTSLicenseVerificationListener() {
           @Override
           public void LTSLicenseVerificationCallback(boolean isSuccess, Exception error) {
               if (!isSuccess) {
                   error.printStackTrace();
               }
           }
       });
       cameraProviderFuture = ProcessCameraProvider.getInstance(this);
       cameraProviderFuture.addListener(new Runnable() {
           @Override
           public void run() {
               try {
                   ProcessCameraProvider cameraProvider = cameraProviderFuture.get();
                   bindPreviewAndImageAnalysis(cameraProvider);
               } catch (ExecutionException | InterruptedException e) {
                   e.printStackTrace();
               }
           }
       }, ContextCompat.getMainExecutor(this));
   }

   @SuppressLint("UnsafeExperimentalUsageError")
   private void bindPreviewAndImageAnalysis(@NonNull ProcessCameraProvider cameraProvider) {
       Size resolution = new Size(720, 1280);
       Display d = getDisplay();
       if (d.getRotation() != Surface.ROTATION_0) {
           resolution = new Size(1280, 720);
       }

       Preview.Builder previewBuilder = new Preview.Builder();
       previewBuilder.setTargetResolution(resolution);
       Preview preview = previewBuilder.build();

       ImageAnalysis.Builder imageAnalysisBuilder = new ImageAnalysis.Builder();

       imageAnalysisBuilder.setTargetResolution(resolution)
               .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST);

       ImageAnalysis imageAnalysis = imageAnalysisBuilder.build();

       imageAnalysis.setAnalyzer(exec, new ImageAnalysis.Analyzer() {
           @RequiresApi(api = Build.VERSION_CODES.O)
           @Override
           public void analyze(@NonNull ImageProxy image) {
               int rotationDegrees = image.getImageInfo().getRotationDegrees();
               TextResult[] results = null;
               ByteBuffer buffer = image.getPlanes()[0].getBuffer();
               int nRowStride = image.getPlanes()[0].getRowStride();
               int nPixelStride = image.getPlanes()[0].getPixelStride();
               int length = buffer.remaining();
               byte[] bytes = new byte[length];
               buffer.get(bytes);
               ImageData imageData = new ImageData(bytes, image.getWidth(), image.getHeight(), nRowStride * nPixelStride);
               try {
                   results = dbr.decodeBuffer(imageData.mBytes, imageData.mWidth, imageData.mHeight, imageData.mStride, EnumImagePixelFormat.IPF_NV21, "");
               } catch (BarcodeReaderException e) {
                   e.printStackTrace();
               }
               StringBuilder sb = new StringBuilder();
               sb.append("Found ").append(results.length).append(" barcode(s):\n");
               for (int i = 0; i < results.length; i++) {
                   sb.append(results[i].barcodeText);
                   sb.append("\n");
               }
               Log.d("DBR", sb.toString());
               resultView.setText(sb.toString());
               image.close();
           }
       });

       CameraSelector cameraSelector = new CameraSelector.Builder()
               .requireLensFacing(CameraSelector.LENS_FACING_BACK).build();
       preview.setSurfaceProvider(previewView.createSurfaceProvider());

       UseCaseGroup useCaseGroup = new UseCaseGroup.Builder()
               .addUseCase(preview)
               .addUseCase(imageAnalysis)
               .build();
       camera = cameraProvider.bindToLifecycle((LifecycleOwner) this, cameraSelector, useCaseGroup);
   }

   private class ImageData {
       private int mWidth, mHeight, mStride;
       byte[] mBytes;

       ImageData(byte[] bytes, int nWidth, int nHeight, int nStride) {
           mBytes = bytes;
           mWidth = nWidth;
           mHeight = nHeight;
           mStride = nStride;
       }
   }
   ```

   这里有一些注意事项：

   1. 预览和图像分析应该共享相同的目标分辨率。
   2. 默认的图像格式是YUV，使用这一格式运算速度会比较快。如果需要执行其他操作，可能需要将其转换为RGB位图。你可以在Google的[相机示例仓库](https://github.com/android/camera-samples/blob/master/Camera2Basic/utils/src/main/java/com/example/android/camera/utils/YuvToRgbConverter.kt)中找到有关的转换代码。

## 更多相机控制

`CameraControl`API提供了一些基本的摄像头控制功能。

闪光灯控制：

```java
camera.getCameraControl().enableTorch(true);
```

数码变焦：

```java
camera.getCameraControl().setLinearZoom((float) 80/100);
```

对焦在一个点上：

```java
CameraControl cameraControl=camera.getCameraControl();
MeteringPointFactory factory = new SurfaceOrientedMeteringPointFactory(width, height);
MeteringPoint point = factory.createPoint(x, y);
FocusMeteringAction.Builder builder = new FocusMeteringAction.Builder(point, FocusMeteringAction.FLAG_AF);
// auto calling cancelFocusAndMetering in 5 seconds
builder.setAutoCancelDuration(5, TimeUnit.SECONDS);
FocusMeteringAction action =builder.build();
cameraControl.startFocusAndMetering(action);
```

我们也可以使用`Camera2Interop.Extender`使用Camera2的CaptureRequest做更多的操控。例如，下面的代码将使图像变为负片。

```java
Camera2Interop.Extender ext = new Camera2Interop.Extender<>(imageAnalysisBuilder);
ext.setCaptureRequestOption(CaptureRequest.CONTROL_EFFECT_MODE,CaptureRequest.CONTROL_EFFECT_MODE_NEGATIVE);
```

## 使应用更可用

可以添加更多功能，如偏好设置、取景器、扫描历史记录以及在找到条形码时发出哔哔声。你可以在[这里](https://github.com/xulihang/dynamsoft-samples/tree/main/dbr/Android/CameraX)找到一个例子。这篇文章就不具体讨论这些了。

## 源代码

<https://github.com/xulihang/dynamsoft-samples/tree/main/dbr/Android/CameraXMinimum>

# 参考文献

* [^camera2]: https://developer.android.com/training/camera2
* [^camerax]: https://developer.android.com/training/camerax

