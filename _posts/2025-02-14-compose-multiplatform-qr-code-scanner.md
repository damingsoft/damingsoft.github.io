---
layout: post
title: "Compose Multiplatform二维码扫描"
date: 2025-02-14 10:10:53 +0800
categories: 条码扫描
tags: 
description: 文章讲述了如何基于Dynamsoft Barcode Reader编写一个Compose Multiplatform应用以扫描二维码。
---

Compose Multiplatform是一个声明式UI框架，编写的UI可以运行在Android、iOS、桌面和Web平台。支持跨平台重用代码，同时保留原生编程的优势（基于Kotlin Multiplatform，KMP）。

在本文中，我们将使用Compose Multiplatform和[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)编写一个二维码扫描移动应用。

演示视频：

<video src="https://github.com/user-attachments/assets/ada83322-7a1a-46fc-bd60-a2a838815806" controls="controls" muted="muted" style="max-height:480px;max-width: 100%;"></video>

截图：

![screenshot](/album/2025/02/compose-multiplatform/app.jpg)

## 创建一个新的Compose Multiplatform项目

前往[Kotlin多平台向导](https://kmp.jetbrains.com/)，创建一个新的Compose Multiplatform项目，启用Android和iOS。

![向导](/album/2025/02/compose-multiplatform/wizard.png)

## 声明相机权限

1. 对于Android，将以下内容添加到`AndroidManifest.xml`。

   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   ```

2. 对于iOS，将以下内容添加到`Info.plist`。

   ```xml
   <key>NSCameraUsageDescription</key>
   <string>For barcode scanning</string>
   ```

## 添加依赖项

接下来，让我们添加与二维码扫描相关的依赖项。

### Android

我们需要添加CameraX、Accompanist和Dynamsoft Barcode Reader。

1. 将以下内容添加到`libs.versions.toml`：

   ```
   [versions]
   accompanist = "0.34.0"
   androidxCamera = "1.3.4"
   dynamsoft-barcode-reader = "10.4.3000"

   [libraries]
   accompanist-permissions = { module = "com.google.accompanist:accompanist-permissions", version.ref = "accompanist" }
   androidx-camera-camera2 = { module = "androidx.camera:camera-camera2", version.ref = "androidxCamera" }
   androidx-camera-lifecycle = { module = "androidx.camera:camera-lifecycle", version.ref = "androidxCamera" }
   androidx-camera-view = { module = "androidx.camera:camera-view", version.ref = "androidxCamera" }
   androidx-material3-android = { group = "androidx.compose.material3", name = "material3-android", version.ref = "material3Android" }
   dynamsoft-barcode-reader = { module = "com.dynamsoft:dynamsoftbarcodereaderbundle", version.ref = "dynamsoft-barcode-reader" }
   ```

2. 将以下内容添加到`composeApp/build.gradle.kts`：

   ```kotlin
   kotlin {
       sourceSets {
           androidMain.dependencies {
               implementation(libs.accompanist.permissions)
               implementation(libs.androidx.camera.camera2)
               implementation(libs.androidx.camera.lifecycle)
               implementation(libs.androidx.camera.view)
               implementation(libs.dynamsoft.barcode.reader)
           }
       }
   }
   ```

### iOS

我们将通过Cocoapods集成Dynamsoft Barcode Reader。

1. 添加Kotlin CocoaPods Gradle插件。

   1. 将以下内容添加到`libs.versions.toml`：

      ```
      [versions]
      kotlinCocoapods = { id = "org.jetbrains.kotlin.native.cocoapods", version.ref = "kotlin" }
      ```

   2. 将以下别名添加到根文件夹的`build.gradle.kts`文件：

      ```kotlin
      plugins {
          alias(libs.plugins.kotlinCocoapods) apply false
      }
      ```

   3. 将以下内容添加到应用的`build.gradle.kts`文件中：

      ```kotlin
      plugins {
          alias(libs.plugins.kotlinCocoapods)
      }
      ```

2. 将以下内容添加到应用的`build.gradle.kts`：

   ```kotlin
   cocoapods {
       // Required fields
       version = "1.0"
       summary = "CocoaPods test library"
       homepage = "https://github.com/JetBrains/kotlin"
       ios.deploymentTarget = "15.0"
       // Specify path to Podfile
       podfile = project.file("../iosApp/Podfile")

       framework {
           baseName = "ComposeApp"
           isStatic = true
       }

       pod("DynamsoftBarcodeReader") {
           version = "9.6.40"
       }

       xcodeConfigurationToNativeBuildType["CUSTOM_DEBUG"] = NativeBuildType.DEBUG
       xcodeConfigurationToNativeBuildType["CUSTOM_RELEASE"] = NativeBuildType.RELEASE
   }
   ```


同步项目以创建所需的`composeApp.podspec`文件。


此外，使用`pod init`命令在 `iosApp`目录下生成一个pod项目。Podfile中使用以下内容。

```
platform :ios, '15.0'

target 'iosApp' do
    use_frameworks!

    # Local podspec from path
    pod 'composeApp', :path => '../composeApp/composeApp.podspec'
end
```

编译时也可能遇到以下错误：

```
'embedAndSign' task can't be used in a project with dependencies to pods.
```

碰到这种问题时，将以下内容添加到`gradle.properties`：

```
kotlin.apple.deprecated.allowUsingEmbedAndSignWithCocoaPodsDependencies=true
```

## 创建扫描组件

让我们首先在通用代码中定义组件，然后在原生代码中实现它。

### 定义组件

1. 添加用于管理摄像头权限状态的 `CameraPermissionState.kt`。

   ```kotlin
   interface CameraPermissionState {
       val status: CameraPermissionStatus
       fun requestCameraPermission()
       fun goToSettings()
   }

   @Composable
   expect fun rememberCameraPermissionState(): CameraPermissionState

   enum class CameraPermissionStatus {
       Denied, Granted
   }
   ```

2. 定义扫描组件，该组件有一个回调，用于返回扫描的二维码。

   ```kotlin
   @Composable
   expect fun Scanner(
       modifier: Modifier = Modifier,
       onScanned: (String) -> Unit,
   )
   ```

3. 定义`ScannerWithPermissions`组件来处理权限。

   ```kotlin
   @Composable
   fun ScannerWithPermissions(
       modifier: Modifier = Modifier,
       onScanned: (String) -> Unit,
       permissionText: String = "Camera is required for QR Code scanning",
       openSettingsLabel: String = "Open Settings",
   ) {
       ScannerWithPermissions(
           modifier = modifier.clipToBounds(),
           onScanned = onScanned,
           permissionDeniedContent = { permissionState ->
               Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
                   Text(
                       modifier = Modifier.padding(6.dp),
                       text = permissionText
                   )
                   Button(onClick = { permissionState.goToSettings() }) {
                       Text(openSettingsLabel)
                   }
               }
           }
       )
   }

   @Composable
   fun ScannerWithPermissions(
       modifier: Modifier = Modifier,
       onScanned: (String) -> Unit,
       permissionDeniedContent: @Composable (CameraPermissionState) -> Unit,
   ) {
       val permissionState = rememberCameraPermissionState()

       LaunchedEffect(Unit) {
           if (permissionState.status == CameraPermissionStatus.Denied) {
               permissionState.requestCameraPermission()
           }
       }

       if (permissionState.status == CameraPermissionStatus.Granted) {
           Scanner(modifier, onScanned = onScanned)
       } else {
           permissionDeniedContent(permissionState)
       }
   }
   ```

### Android实现

1. 在`MainActivity.kt`中初始化许可证：

   ```kotlin
   class MainActivity : ComponentActivity() {
       override fun onCreate(savedInstanceState: Bundle?) {
           super.onCreate(savedInstanceState)
           if (savedInstanceState == null) {
               LicenseManager.initLicense("LICENSE-KEY", this) { isSuccess: Boolean, error: Exception? ->
                   Log.d("DBR",isSuccess.toString())
                   if (!isSuccess) {
                       error?.printStackTrace()
                   }
               }
           }
           setContent {
               App()
           }
       }
   }
   ```

2. 添加实现CameraX图像分析器的`BarcodeAnalyzer.kt`文件。它能获取相机帧，并使用Dynamsoft Barcode Reader读取其中的条码。

   ```kotlin
   class BarcodeAnalyzer(
       private val onScanned: (String) -> Unit,
       private val context: Context,
   ) : ImageAnalysis.Analyzer {

       private val router = CaptureVisionRouter(context) //used to call Dynamsoft Barcode Reader

       @SuppressLint("UnsafeOptInUsageError")
       override fun analyze(imageProxy: ImageProxy) {
           imageProxy.image?.let { image ->
               val buffer = image.planes[0].buffer
               val nRowStride = image.planes[0].rowStride
               val nPixelStride = image.planes[0].pixelStride
               val length = buffer.remaining()
               val bytes = ByteArray(length)
               buffer[bytes]
               val imageData = ImageData()
               imageData.bytes = bytes
               imageData.width = image.width
               imageData.height = image.height
               imageData.stride = nRowStride * nPixelStride
               imageData.format = EnumImagePixelFormat.IPF_NV21
               val capturedResult = router.capture(imageData,EnumPresetTemplate.PT_READ_SINGLE_BARCODE)
               if (capturedResult.decodedBarcodesResult != null) {
                   if (capturedResult.decodedBarcodesResult!!.items.isNotEmpty()) {
                       val result = capturedResult.decodedBarcodesResult!!.items[0]
                       onScanned(result.text)
                   }
               }
           }
           imageProxy.close()
       }
   }
   ```

3. 添加`ScannerView.kt`文件以显示相机预览。

   ```kotlin
   @Composable
   fun CameraView(
       modifier: Modifier = Modifier,
       analyzer: BarcodeAnalyzer
   ) {
       val localContext = LocalContext.current
       val lifecycleOwner = LocalLifecycleOwner.current
       val cameraProviderFuture = remember {
           ProcessCameraProvider.getInstance(localContext)
       }
       AndroidView(
           modifier = modifier.fillMaxSize(),
           factory = { context ->
               val previewView = PreviewView(context)
               val preview = Preview.Builder().build()
               val selector = CameraSelector.Builder()
                   .requireLensFacing(CameraSelector.LENS_FACING_BACK)
                   .build()

               preview.setSurfaceProvider(previewView.surfaceProvider)

               val imageAnalysis = ImageAnalysis.Builder().build()
               imageAnalysis.setAnalyzer(
                   ContextCompat.getMainExecutor(context),
                   analyzer
               )

               runCatching {
                   cameraProviderFuture.get().unbindAll()
                   cameraProviderFuture.get().bindToLifecycle(
                       lifecycleOwner,
                       selector,
                       preview,
                       imageAnalysis
                   )
               }.onFailure {
                   Log.e("CAMERA", "Camera bind error ${it.localizedMessage}", it)
               }
               previewView
           }
       )
   }
   ```

4. 添加`Scanner.android.kt`文件以包含扫描组件的具体实现。

   ```kotlin
   @Composable
   actual fun Scanner(
       modifier: Modifier,
       onScanned: (String) -> Unit,
   ) {
       val context = LocalContext.current
       val analyzer = remember() {
           BarcodeAnalyzer(onScanned, context)
       }
       CameraView(modifier,analyzer)
   }

   @OptIn(ExperimentalPermissionsApi::class)
   @Composable
   actual fun rememberCameraPermissionState(): CameraPermissionState {
       val accPermissionState = rememberPermissionState(android.Manifest.permission.CAMERA)

       val context = LocalContext.current
       val wrapper = remember(accPermissionState) { AccompanistPermissionWrapper(accPermissionState, context) }

       return wrapper
   }

   @OptIn(ExperimentalPermissionsApi::class)
   class AccompanistPermissionWrapper (val accPermissionState: PermissionState, private val context: Context): CameraPermissionState {
       override val status: CameraPermissionStatus
           get() = accPermissionState.status.toCameraPermissionStatus()

       override fun requestCameraPermission() {
           accPermissionState.launchPermissionRequest()
       }

       override fun goToSettings() {
           val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
           intent.data = Uri.parse("package:" + context.packageName)
           ContextCompat.startActivity(context, intent, null)
       }
   }

   @OptIn(ExperimentalPermissionsApi::class)
   private fun PermissionStatus.toCameraPermissionStatus(): CameraPermissionStatus {
       return when (this) {
           is PermissionStatus.Denied -> CameraPermissionStatus.Denied
           PermissionStatus.Granted -> CameraPermissionStatus.Granted
       }
   }
   ```

### iOS实现

1. 创建`OrientationListener.kt`文件以侦听方向更改。

   ```kotlin
   @OptIn(ExperimentalForeignApi::class)
   class OrientationListener(
       val orientationChanged: (UIDeviceOrientation) -> Unit
   ) : NSObject() {

       val notificationName = platform.UIKit.UIDeviceOrientationDidChangeNotification

       @Suppress("UNUSED_PARAMETER")
       @ObjCAction
       fun orientationDidChange(arg: NSNotification) {
           orientationChanged(UIDevice.currentDevice.orientation)
       }

       fun register() {
           NSNotificationCenter.defaultCenter.addObserver(
               observer = this,
               selector = NSSelectorFromString(
                   OrientationListener::orientationDidChange.name + ":"
               ),
               name = notificationName,
               `object` = null
           )
       }

       fun unregister() {
           NSNotificationCenter.defaultCenter.removeObserver(
               observer = this,
               name = notificationName,
               `object` = null
           )
       }
   }
   ```

2. 创建一个新的`Scanner.kt`文件，包含扫描相关的多个类。

   1. `ScannerPreviewView`类作为相机预览的容器。

      ```kotlin
      @OptIn(ExperimentalForeignApi::class)
      class ScannerPreviewView(private val coordinator: ScannerCameraCoordinator): UIView(frame = cValue { CGRectZero }) {
          @OptIn(ExperimentalForeignApi::class)
          override fun layoutSubviews() {
              super.layoutSubviews()
              CATransaction.begin()
              CATransaction.setValue(true, kCATransactionDisableActions)

              layer.setFrame(frame)
              coordinator.setFrame(frame)
              CATransaction.commit()
          }
      }
      ```

   2. `ScannerCameraCoordinator`类，用于使用AVFoudation打开摄像头，并使用Dynamsoft Barcode Reader读取条码：

      ```kotlin
      @OptIn(ExperimentalForeignApi::class)
      class ScannerCameraCoordinator(
          val onScanned: (String) -> Unit
      ): AVCaptureVideoDataOutputSampleBufferDelegateProtocol, DBRLicenseVerificationListenerProtocol, NSObject() {

          private var previewLayer: AVCaptureVideoPreviewLayer? = null
          lateinit var captureSession: AVCaptureSession
          lateinit var barcodeReader: DynamsoftBarcodeReader
          var lastTime: Long = 0

          @OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
          fun prepare(layer: CALayer) {
              DynamsoftBarcodeReader.initLicense("LICENSE-KEY", this)
              barcodeReader = DynamsoftBarcodeReader()
              captureSession = AVCaptureSession()
              val device = AVCaptureDevice.defaultDeviceWithMediaType(AVMediaTypeVideo)
              if (device == null) {
                  println("Device has no camera")
                  return
              }

              println("Initializing video input")
              val videoInput = memScoped {
                  val error: ObjCObjectVar<NSError?> = alloc<ObjCObjectVar<NSError?>>()
                  val videoInput = AVCaptureDeviceInput(device = device, error = error.ptr)
                  if (error.value != null) {
                      println(error.value)
                      null
                  } else {
                      videoInput
                  }
              }

              println("Adding video input")
              if (videoInput != null && captureSession.canAddInput(videoInput)) {
                  captureSession.addInput(videoInput)
              } else {
                  println("Could not add input")
                  return
              }

              val videoDataOutput = AVCaptureVideoDataOutput()

              println("Adding video output")
              if (captureSession.canAddOutput(videoDataOutput)) {
                  captureSession.addOutput(videoDataOutput)
                  val map = HashMap<Any?, Any>()
                  map.put(
                      platform.CoreVideo.kCVPixelBufferPixelFormatTypeKey,
                      platform.CoreVideo.kCVPixelFormatType_32BGRA
                  )
                  videoDataOutput.videoSettings = map
                  videoDataOutput.setSampleBufferDelegate(this, queue = dispatch_get_main_queue())
              } else {
                  println("Could not add output")
                  return
              }

              println("Adding preview layer")
              previewLayer = AVCaptureVideoPreviewLayer(session = captureSession).also {
                  it.frame = layer.bounds
                  it.videoGravity = AVLayerVideoGravityResizeAspectFill
                  println("Set orientation")
                  setCurrentOrientation(newOrientation = UIDevice.currentDevice.orientation)
                  println("Adding sublayer")
                  layer.bounds.useContents {
                      println("Bounds: ${this.size.width}x${this.size.height}")

                  }
                  layer.frame.useContents {
                      println("Frame: ${this.size.width}x${this.size.height}")
                  }
                  layer.addSublayer(it)
              }

              println("Launching capture session")
              GlobalScope.launch(Dispatchers.Default) {
                  captureSession.startRunning()
              }
          }


          fun setCurrentOrientation(newOrientation: UIDeviceOrientation) {
              when (newOrientation) {
                  UIDeviceOrientation.UIDeviceOrientationLandscapeLeft ->
                      previewLayer?.connection?.videoOrientation = AVCaptureVideoOrientationLandscapeRight

                  UIDeviceOrientation.UIDeviceOrientationLandscapeRight ->
                      previewLayer?.connection?.videoOrientation = AVCaptureVideoOrientationLandscapeLeft

                  UIDeviceOrientation.UIDeviceOrientationPortrait ->
                      previewLayer?.connection?.videoOrientation = AVCaptureVideoOrientationPortrait

                  UIDeviceOrientation.UIDeviceOrientationPortraitUpsideDown ->
                      previewLayer?.connection?.videoOrientation =
                          AVCaptureVideoOrientationPortraitUpsideDown

                  else ->
                      previewLayer?.connection?.videoOrientation = AVCaptureVideoOrientationPortrait
              }
          }

          override fun captureOutput(
              output: AVCaptureOutput,
              didOutputSampleBuffer: CMSampleBufferRef?,
              fromConnection: AVCaptureConnection
          ) {
              val interval = NSDate().timeIntervalSince1970*1000 - lastTime
              if (interval > 1000) {
                  val imageBuffer: CVImageBufferRef? = CMSampleBufferGetImageBuffer(didOutputSampleBuffer)
                  val ciImage = platform.CoreImage.CIImage(cVPixelBuffer = imageBuffer)
                  val cgImage = CIContext().createCGImage(ciImage, ciImage.extent)
                  var image = UIImage(cgImage)

                  val result = barcodeReader.decodeImage(image, null)
                  if (result != null) {
                      if (result.isNotEmpty()) {
                          val textResult: iTextResult = result[0] as iTextResult
                          textResult.barcodeText?.let { onFound(it) }
                      }
                  } else {
                      println("result is null")
                  }
                  lastTime = (NSDate().timeIntervalSince1970*1000).toLong()
              }
          }

          fun onFound(code: String) {
              onScanned(code)
          }

          fun setFrame(rect: CValue<CGRect>) {
              previewLayer?.setFrame(rect)
          }

          override fun DBRLicenseVerificationCallback(isSuccess: Boolean, error: NSError?) {
              println("LicenseVerificationCallback")
              println(isSuccess)
          }
      }
      ```

   3. 使用上述类的`UiScannerView`类。

      ```kotlin
      @Composable
      fun UiScannerView(
          modifier: Modifier = Modifier,
          onScanned: (String) -> Unit
      ) {
          val coordinator = remember {
              ScannerCameraCoordinator(
                  onScanned = onScanned
              )
          }

          DisposableEffect(Unit) {
              val listener = OrientationListener { orientation ->
                  coordinator.setCurrentOrientation(orientation)
              }

              listener.register()

              onDispose {
                  listener.unregister()
              }
          }

          UIKitView<UIView>(
              modifier = modifier.fillMaxSize(),
              factory = {
                  val previewContainer = ScannerPreviewView(coordinator)
                  println("Calling prepare")
                  coordinator.prepare(previewContainer.layer)
                  previewContainer
              },
              properties = UIKitInteropProperties(
                  isInteractive = true,
                  isNativeAccessibilityEnabled = true,
              )
          )
      }
      ```

3. 创建`Scanner.ios.kt`文件以包含扫描组件的实现。

   ```kotlin
   @Composable
   actual fun Scanner(
       modifier: Modifier,
       onScanned: (String) -> Unit,
   ) {
       UiScannerView(
           modifier = modifier,
           onScanned = {
               onScanned(it)
           },
       )
   }

   @Composable
   actual fun rememberCameraPermissionState(): CameraPermissionState {
       return remember {
           IosMutableCameraPermissionState()
       }
   }

   abstract class MutableCameraPermissionState: CameraPermissionState {
       override var status: CameraPermissionStatus by mutableStateOf(getCameraPermissionStatus())

   }

   class IosMutableCameraPermissionState: MutableCameraPermissionState() {
       override fun requestCameraPermission() {
           AVCaptureDevice.requestAccessForMediaType(AVMediaTypeVideo) {
               this.status = getCameraPermissionStatus()
           }
       }

       override fun goToSettings() {
           val appSettingsUrl = NSURL(string = UIApplicationOpenSettingsURLString)
           if (UIApplication.sharedApplication.canOpenURL(appSettingsUrl)) {
               UIApplication.sharedApplication.openURL(appSettingsUrl)
           }
       }
   }

   fun getCameraPermissionStatus(): CameraPermissionStatus {
       val authorizationStatus = AVCaptureDevice.authorizationStatusForMediaType(AVMediaTypeVideo)
       return if (authorizationStatus == AVAuthorizationStatusAuthorized) CameraPermissionStatus.Granted else CameraPermissionStatus.Denied
   }
   ```

## 使用扫描组件

在`App.kt`中，使用组件并显示条码文本。

```kotlin
@Composable
@Preview
fun App() {
    MaterialTheme {
        var showContent by remember { mutableStateOf(false) }
        var barcodeResult by remember {mutableStateOf("")}
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Button(onClick = {
                showContent = !showContent
                if (showContent) {
                    barcodeResult = ""
                }
            }) {
                Text("Toggle Scanner")
            }
            Text(barcodeResult)
            if (showContent) {
                val scope = rememberCoroutineScope()
                ScannerWithPermissions(
                    modifier = Modifier.padding(16.dp),
                    onScanned = {
                        scope.launch {
                            println(it)
                            barcodeResult = it
                        }
                    },
                )
            }
        }
    }
}
```

好了，我们已经完成了demo的编写。

## 源代码

获取源代码来自己试用一下吧：

<https://github.com/tony-xlh/Compose-Multiplatform-QR-Code-Scanner>

