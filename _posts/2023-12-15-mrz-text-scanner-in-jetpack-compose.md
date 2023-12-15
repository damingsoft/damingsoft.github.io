---
layout: post
title: 基于Jetpack Compose和CameraX的护照MRZ扫描
date: 2023-12-12 16:15:53 +0800
categories: 文字识别
tags: MRZ OCR
---

Jetpack Compose是Android推荐的用于构建原生UI的现代工具包。它简化并加速了Android上的UI开发。

在本文中，我们将编写一个Jetpack Compose MRZ文本扫描应用。使用CameraX用于访问相机，[Dynamsoft Label Recognizer](https://www.dynamsoft.com/label-recognition/overview/)用于OCR。

注：MRZ是machine-readable zone（机器可读区域）的缩写。我们可以在身份证、Visa卡和护照上找到它。这是一个专门为机器设计的区域，用于获取其所有者的信息。

以下是最终结果的视频：

<video src="https://github.com/tony-xlh/MRZ-Text-Scanner-Jetpack-Compose/assets/112376616/1ea069d8-c27f-43d3-b9f6-8204d09037ff" data-canonical-src="https://github.com/tony-xlh/MRZ-Text-Scanner-Jetpack-Compose/assets/112376616/1ea069d8-c27f-43d3-b9f6-8204d09037ff" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-width:100%;max-height:640px; min-height: 200px"></video>

## 新建项目

打开Android Studio，创建一个empty compose activity的新项目。


## 添加依赖项

1. 打开`settings.gradle`添加Dynamsoft的maven仓库。

   ```diff
    dependencyResolutionManagement {
        repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
        repositories {
            google()
            mavenCentral()
   +        maven {
   +            url "https://download2.dynamsoft.com/maven/aar"
   +        }
        }
    }
   ```

2. 将CameraX和Dynamsoft Label Recognizer添加到模块的`build.gradle`。

   ```groovy
   // CameraX core library using the camera2 implementation
   def camerax_version = "1.4.0-alpha02"
   implementation "androidx.camera:camera-core:${camerax_version}"
   implementation "androidx.camera:camera-camera2:${camerax_version}"
   implementation "androidx.camera:camera-lifecycle:${camerax_version}"
   implementation "androidx.camera:camera-view:${camerax_version}"

   implementation 'com.dynamsoft:dynamsoftlabelrecognizer:2.2.20'
   ```

## 请求相机权限

需要申请相机权限才能使用相机。

1. 在`AndroidManifest.xml`中声明相机权限。

   ```xml
   <uses-feature
       android:name="android.hardware.camera"
       android:required="false" />
   <uses-permission android:name="android.permission.CAMERA" />
   ```

2. 在`MainActivity.kt`中，添加`hasCameraPermission`状态。

   ```kotlin
   var hasCamPermission by remember {
       mutableStateOf(
           ContextCompat.checkSelfPermission(
               context,
               Manifest.permission.CAMERA
           ) == PackageManager.PERMISSION_GRANTED
       )
   }
   ```

3. 定义一个启动器来请求权限。

   ```kotlin
   setContent {
       MRZScannerTheme {
           val context = LocalContext.current
           val launcher = rememberLauncherForActivityResult(
               contract = ActivityResultContracts.RequestPermission(),
               onResult = { granted ->
                   hasCamPermission = granted
               }
           )
       }
   }
   ```

4. 在`LaunchedEffect`中调用它，这样程序启动时会请求权限。

   ```kotlin
   setContent {
       MRZScannerTheme {
           //...
           LaunchedEffect(key1 = true){
               launcher.launch(Manifest.permission.CAMERA)
           }
       }
   }
   ```

## 打开相机预览

接下来，让我们打开相机并显示预览。

需要添加`PreviewView`来显示预览。只有在授予相机权限后才显示它。

```kotlin
Column(
    modifier = Modifier.fillMaxSize()
) {
    if (hasCamPermission) {
        AndroidView(
            factory = { context ->
                val previewView = PreviewView(context)
                val preview = Preview.Builder().build()
                val selector = CameraSelector.Builder()
                    .requireLensFacing(CameraSelector.LENS_FACING_BACK)
                    .build()
                preview.setSurfaceProvider(previewView.surfaceProvider)

                try {
                    cameraProviderFuture.get().bindToLifecycle(
                        lifecycleOwner,
                        selector,
                        preview
                    )
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                previewView
            },
            modifier = Modifier.weight(1f).padding(bottom = 25.dp)
        )
    }
}
```


## 使用Dynamsoft Label Recognizer从Bitmap识别MRZ文本

需要调整下Dynamsoft Label Recoginzer，让它可以从转为Bitmap的相机视频帧识别MRZ。

1. 创建一个名为`MRZRecognizer`的新的Java类。

   ```java
   public class MRZRecognizer {
       private Context context;
       private LabelRecognizer labelRecognizer;
       public MRZRecognizer(Context context){
           this.context = context;
       }
   }
   ```

2. 复制MRZ模型文件到`assets`文件夹。可以在[此处](https://github.com/tony-xlh/MRZ-Text-Scanner-Jetpack-Compose/tree/a53802f1c02687729b83d09b43da703575540dd0/app/src/main/assets/MRZ)找到模型文件。

3. 使用许可证激活。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dlr)申请许可证。

   ```java
   private void init() {
       LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==", context, new LicenseVerificationListener() {
           @Override
           public void licenseVerificationCallback(boolean isSuccess, CoreException error) {
               if(!isSuccess){
                   error.printStackTrace();
               }
           }
       });
   }
   ```

4. 创建一个新的Label Recognizer实例，并使用JSON模板修改它的默认设置，让它可以识别MRZ。

   ```java
   private void init() {
       try {
           labelRecognizer = new LabelRecognizer();
           updateRuntimeSettingsForMRZ();
       } catch (LabelRecognizerException e) {
           throw new RuntimeException(e);
       }
   }

   private void updateRuntimeSettingsForMRZ() throws LabelRecognizerException {
       labelRecognizer.initRuntimeSettings("{\"CharacterModelArray\":[{\"DirectoryPath\":\"\",\"Name\":\"MRZ\"}],\"LabelRecognizerParameterArray\":[{\"Name\":\"default\",\"ReferenceRegionNameArray\":[\"defaultReferenceRegion\"],\"CharacterModelName\":\"MRZ\",\"LetterHeightRange\":[5,1000,1],\"LineStringLengthRange\":[30,44],\"LineStringRegExPattern\":\"([ACI][A-Z<][A-Z<]{3}[A-Z0-9<]{9}[0-9][A-Z0-9<]{15}){(30)}|([0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z<]{3}[A-Z0-9<]{11}[0-9]){(30)}|([A-Z<]{0,26}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,26}<{0,26}){(30)}|([ACIV][A-Z<][A-Z<]{3}([A-Z<]{0,27}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,27}){(31)}){(36)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}|([PV][A-Z<][A-Z<]{3}([A-Z<]{0,35}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,35}<{0,35}){(39)}){(44)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[A-Z0-9<]{2}){(44)}\",\"MaxLineCharacterSpacing\":130,\"TextureDetectionModes\":[{\"Mode\":\"TDM_GENERAL_WIDTH_CONCENTRATION\",\"Sensitivity\":8}],\"Timeout\":9999}],\"LineSpecificationArray\":[{\"BinarizationModes\":[{\"BlockSizeX\":30,\"BlockSizeY\":30,\"Mode\":\"BM_LOCAL_BLOCK\",\"MorphOperation\":\"Close\"}],\"LineNumber\":\"\",\"Name\":\"defaultTextArea->L0\"}],\"ReferenceRegionArray\":[{\"Localization\":{\"FirstPoint\":[0,0],\"SecondPoint\":[100,0],\"ThirdPoint\":[100,100],\"FourthPoint\":[0,100],\"MeasuredByPercentage\":1,\"SourceType\":\"LST_MANUAL_SPECIFICATION\"},\"Name\":\"defaultReferenceRegion\",\"TextAreaNameArray\":[\"defaultTextArea\"]}],\"TextAreaArray\":[{\"Name\":\"defaultTextArea\",\"LineSpecificationNameArray\":[\"defaultTextArea->L0\"]}]}");
       loadModel();
   }
   ```

5. 我们还需要加载MRZ的模型文件。

   ```java
   String modelFolder = "MRZ";
   String modelFileName = "MRZ";
   try {
       AssetManager manager = context.getAssets();
       InputStream isPrototxt = manager.open(modelFolder+"/"+modelFileName+".prototxt");
       byte[] prototxt = new byte[isPrototxt.available()];
       isPrototxt.read(prototxt);
       isPrototxt.close();
       InputStream isCharacterModel = manager.open(modelFolder+"/"+modelFileName+".caffemodel");
       byte[] characterModel = new byte[isCharacterModel.available()];
       isCharacterModel.read(characterModel);
       isCharacterModel.close();
       InputStream isTxt = manager.open(modelFolder+"/"+modelFileName+".txt");
       byte[] txt = new byte[isTxt.available()];
       isTxt.read(txt);
       isTxt.close();
       labelRecognizer.appendCharacterModelBuffer(modelFileName, prototxt, txt, characterModel);
   } catch (Exception e) {
       Log.d("DLR","Failed to load model");
       e.printStackTrace();
   }
   ```

6. 添加一个公共方法来识别Bitmap。

   ```java
   public DLRResult[] recognizeBitmap(Bitmap bitmap) throws LabelRecognizerException {
       return labelRecognizer.recognizeImage(bitmap);
   }
   ```

## 为CameraX创建图像分析器以从相机帧读取MRZ

CameraX需要一个图像分析器实例来处理相机帧。在这里，我们可以创建一个新的MRZAnalyzer类，扩展CameraX的`ImageAnalysis.Analyzer`。

```kotlin
import android.content.Context
import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.dynamsoft.dlr.DLRResult

class MRZAnalyzer(
    private val onMRZScanned: (Array<DLRResult>) -> Unit,
    private val context: Context
): ImageAnalysis.Analyzer {
    private var mrzRecognizer:MRZRecognizer = MRZRecognizer(context)

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(image: ImageProxy) {
        try {
            val bitmap = BitmapUtils.getBitmap(image)
            if (bitmap != null) {
                val results = mrzRecognizer.recognizeBitmap(bitmap)
                if (results.isNotEmpty()) {
                    onMRZScanned(results);
                }
            }
        } catch(e: Exception) {
            e.printStackTrace()
        } finally {
            image.close()
        }
    }
}
```

需要将`ImageProxy`格式的相机帧转换为Bitmap。

用到的`BitmapUtils`类：

```java
package com.tonyxlh.mrzscanner;

import android.annotation.TargetApi;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageFormat;
import android.graphics.Matrix;
import android.graphics.Rect;
import android.graphics.YuvImage;
import android.media.Image;
import android.media.Image.Plane;
import android.os.Build.VERSION_CODES;
import androidx.annotation.Nullable;
import android.util.Log;
import androidx.annotation.RequiresApi;
import androidx.camera.core.ExperimentalGetImage;
import androidx.camera.core.ImageProxy;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

/** Utils functions for bitmap conversions. */
public class BitmapUtils {
    private static final String TAG = "BitmapUtils";

    /** Converts NV21 format byte buffer to bitmap. */
    @Nullable
    public static Bitmap getBitmap(ByteBuffer data, FrameMetadata metadata) {
        data.rewind();
        byte[] imageInBuffer = new byte[data.limit()];
        data.get(imageInBuffer, 0, imageInBuffer.length);
        try {
            YuvImage image =
                    new YuvImage(
                            imageInBuffer, ImageFormat.NV21, metadata.getWidth(), metadata.getHeight(), null);
            ByteArrayOutputStream stream = new ByteArrayOutputStream();
            image.compressToJpeg(new Rect(0, 0, metadata.getWidth(), metadata.getHeight()), 80, stream);

            Bitmap bmp = BitmapFactory.decodeByteArray(stream.toByteArray(), 0, stream.size());

            stream.close();
            return rotateBitmap(bmp, metadata.getRotation(), false, false);
        } catch (Exception e) {
            Log.e("VisionProcessorBase", "Error: " + e.getMessage());
        }
        return null;
    }

    /** Converts a YUV_420_888 image from CameraX API to a bitmap. */
    @RequiresApi(VERSION_CODES.LOLLIPOP)
    @Nullable
    @ExperimentalGetImage
    public static Bitmap getBitmap(ImageProxy image) {
        FrameMetadata frameMetadata =
                new FrameMetadata.Builder()
                        .setWidth(image.getWidth())
                        .setHeight(image.getHeight())
                        .setRotation(image.getImageInfo().getRotationDegrees())
                        .build();

        ByteBuffer nv21Buffer =
                yuv420ThreePlanesToNV21(image.getImage().getPlanes(), image.getWidth(), image.getHeight());
        return getBitmap(nv21Buffer, frameMetadata);
    }

    /** Rotates a bitmap if it is converted from a bytebuffer. */
    private static Bitmap rotateBitmap(
            Bitmap bitmap, int rotationDegrees, boolean flipX, boolean flipY) {
        Matrix matrix = new Matrix();

        // Rotate the image back to straight.
        matrix.postRotate(rotationDegrees);

        // Mirror the image along the X or Y axis.
        matrix.postScale(flipX ? -1.0f : 1.0f, flipY ? -1.0f : 1.0f);
        Bitmap rotatedBitmap =
                Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);

        // Recycle the old bitmap if it has changed.
        if (rotatedBitmap != bitmap) {
            bitmap.recycle();
        }
        return rotatedBitmap;
    }

    /**
     * Converts YUV_420_888 to NV21 bytebuffer.
     *
     * <p>The NV21 format consists of a single byte array containing the Y, U and V values. For an
     * image of size S, the first S positions of the array contain all the Y values. The remaining
     * positions contain interleaved V and U values. U and V are subsampled by a factor of 2 in both
     * dimensions, so there are S/4 U values and S/4 V values. In summary, the NV21 array will contain
     * S Y values followed by S/4 VU values: YYYYYYYYYYYYYY(...)YVUVUVUVU(...)VU
     *
     * <p>YUV_420_888 is a generic format that can describe any YUV image where U and V are subsampled
     * by a factor of 2 in both dimensions. {@link Image#getPlanes} returns an array with the Y, U and
     * V planes. The Y plane is guaranteed not to be interleaved, so we can just copy its values into
     * the first part of the NV21 array. The U and V planes may already have the representation in the
     * NV21 format. This happens if the planes share the same buffer, the V buffer is one position
     * before the U buffer and the planes have a pixelStride of 2. If this is case, we can just copy
     * them to the NV21 array.
     */
    @RequiresApi(VERSION_CODES.KITKAT)
    private static ByteBuffer yuv420ThreePlanesToNV21(
            Plane[] yuv420888planes, int width, int height) {
        int imageSize = width * height;
        byte[] out = new byte[imageSize + 2 * (imageSize / 4)];

        if (areUVPlanesNV21(yuv420888planes, width, height)) {
            // Copy the Y values.
            yuv420888planes[0].getBuffer().get(out, 0, imageSize);

            ByteBuffer uBuffer = yuv420888planes[1].getBuffer();
            ByteBuffer vBuffer = yuv420888planes[2].getBuffer();
            // Get the first V value from the V buffer, since the U buffer does not contain it.
            vBuffer.get(out, imageSize, 1);
            // Copy the first U value and the remaining VU values from the U buffer.
            uBuffer.get(out, imageSize + 1, 2 * imageSize / 4 - 1);
        } else {
            // Fallback to copying the UV values one by one, which is slower but also works.
            // Unpack Y.
            unpackPlane(yuv420888planes[0], width, height, out, 0, 1);
            // Unpack U.
            unpackPlane(yuv420888planes[1], width, height, out, imageSize + 1, 2);
            // Unpack V.
            unpackPlane(yuv420888planes[2], width, height, out, imageSize, 2);
        }

        return ByteBuffer.wrap(out);
    }

    /** Checks if the UV plane buffers of a YUV_420_888 image are in the NV21 format. */
    @RequiresApi(VERSION_CODES.KITKAT)
    private static boolean areUVPlanesNV21(Plane[] planes, int width, int height) {
        int imageSize = width * height;

        ByteBuffer uBuffer = planes[1].getBuffer();
        ByteBuffer vBuffer = planes[2].getBuffer();

        // Backup buffer properties.
        int vBufferPosition = vBuffer.position();
        int uBufferLimit = uBuffer.limit();

        // Advance the V buffer by 1 byte, since the U buffer will not contain the first V value.
        vBuffer.position(vBufferPosition + 1);
        // Chop off the last byte of the U buffer, since the V buffer will not contain the last U value.
        uBuffer.limit(uBufferLimit - 1);

        // Check that the buffers are equal and have the expected number of elements.
        boolean areNV21 =
                (vBuffer.remaining() == (2 * imageSize / 4 - 2)) && (vBuffer.compareTo(uBuffer) == 0);

        // Restore buffers to their initial state.
        vBuffer.position(vBufferPosition);
        uBuffer.limit(uBufferLimit);

        return areNV21;
    }

    /**
     * Unpack an image plane into a byte array.
     *
     * <p>The input plane data will be copied in 'out', starting at 'offset' and every pixel will be
     * spaced by 'pixelStride'. Note that there is no row padding on the output.
     */
    @TargetApi(VERSION_CODES.KITKAT)
    private static void unpackPlane(
            Plane plane, int width, int height, byte[] out, int offset, int pixelStride) {
        ByteBuffer buffer = plane.getBuffer();
        buffer.rewind();

        // Compute the size of the current plane.
        // We assume that it has the aspect ratio as the original image.
        int numRow = (buffer.limit() + plane.getRowStride() - 1) / plane.getRowStride();
        if (numRow == 0) {
            return;
        }
        int scaleFactor = height / numRow;
        int numCol = width / scaleFactor;

        // Extract the data in the output buffer.
        int outputPos = offset;
        int rowStart = 0;
        for (int row = 0; row < numRow; row++) {
            int inputPos = rowStart;
            for (int col = 0; col < numCol; col++) {
                out[outputPos] = buffer.get(inputPos);
                outputPos += pixelStride;
                inputPos += plane.getPixelStride();
            }
            rowStart += plane.getRowStride();
        }
    }
}
```

依赖的`FrameMetadata.java`文件：

```java
package com.tonyxlh.mrzscanner;

/** Describing a frame info. */
public class FrameMetadata {

    private final int width;
    private final int height;
    private final int rotation;

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public int getRotation() {
        return rotation;
    }

    private FrameMetadata(int width, int height, int rotation) {
        this.width = width;
        this.height = height;
        this.rotation = rotation;
    }

    /** Builder of {@link FrameMetadata}. */
    public static class Builder {

        private int width;
        private int height;
        private int rotation;

        public Builder setWidth(int width) {
            this.width = width;
            return this;
        }

        public Builder setHeight(int height) {
            this.height = height;
            return this;
        }

        public Builder setRotation(int rotation) {
            this.rotation = rotation;
            return this;
        }

        public FrameMetadata build() {
            return new FrameMetadata(width, height, rotation);
        }
    }
}
```

然后在`MainActivity`中，将图像分析实例添加到CameraX的生命周期中。

```kotlin
val imageAnalysis = ImageAnalysis.Builder()
    .setBackpressureStrategy(STRATEGY_KEEP_ONLY_LATEST)
    .build()
imageAnalysis.setAnalyzer(
    ContextCompat.getMainExecutor(context),
    MRZAnalyzer({results ->
        run {
            val sb = StringBuilder()
            if (results.size == 1) {
                val result = results.get(0)
                if (result.lineResults.size>=2) {
                    for (lineResult in result.lineResults) {
                        sb.append(lineResult.text)
                        sb.append("\n")
                    }
                }
            }
            code = sb.toString()
        }
    },context)
)
try {
    cameraProviderFuture.get().bindToLifecycle(
        lifecycleOwner,
        selector,
        preview,
        imageAnalysis
    )
} catch (e: Exception) {
    e.printStackTrace()
}
```

扫描结果将显示在`Text`控件中。

```kotlin
var code by remember {
    mutableStateOf("")
}
//......
Text(
    text = code,
    fontSize = 20.sp,
    fontWeight = FontWeight.Bold,
    modifier = Modifier
        .fillMaxWidth()
        .padding(32.dp)
)
```

## 源代码

查看demo的源代码并尝试使用：<https://github.com/tony-xlh/MRZ-Text-Scanner-Jetpack-Compose>




