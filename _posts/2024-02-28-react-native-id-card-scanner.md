---
layout: post
title: "构建一个React Native身份证扫描应用"
date: 2024-02-28 10:16:53 +0800
categories: 相机
tags: 
description: 本文讨论了如何使用React Native、Vision Camera和Dynamsoft Label Recognizer构建一个身份证扫描应用。
---
许多国家都采用身份证来证明一个人的身份。它们通常采用 8.6 厘米 x 5.4 厘米大小的卡片设计，许多还带有三行MRZ机读文本，比如德国和荷兰的身份证。

荷兰身份证样本：

![荷兰身份证](/album/2023/09/ionic/dutch-id-card.jpg)

在本文中，我们将讨论如何使用React Native编写一个身份证扫描应用。它可以捕获身份证的正面和背面，并通过使用OCR识别MRZ来提取持卡人的信息。使用[Dynamsoft Label Recognizer](https://www.dynamsoft.com/label-recognition/overview/)提供OCR功能。

演示视频：

<video src="https://github.com/xulihang/react-native-id-card-scanner/assets/5462205/110e4f94-cfd5-4980-822a-4c5186e4ffdc" data-canonical-src="https://github.com/xulihang/react-native-id-card-scanner/assets/5462205/110e4f94-cfd5-4980-822a-4c5186e4ffdc" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-width:100%;max-height:640px; min-height: 200px"></video>

## 新建项目

创建一个新的React Native项目：

```bash
npx react-native@latest init IDCardScanner
```

## 添加依赖项

1. 安装`react-native-vision-camera`用于访问摄像头。

   ```bash
   npm install react-native-vision-camera
   ```

2. 安装`vision-camera-dynamsoft-label-recognizer`以识别 MRZ。

   ```bash
   npm install vision-camera-dynamsoft-label-recognizer
   ```

3. 安装`vision-camera-cropper`以裁剪摄像头画面。

   ```bash
   npm install vision-camera-cropper react-native-worklets-core
   ```

4. 安装`react-native-svg`用于绘制表示裁剪区域的矩形框。

   ```bash
   npm install react-native-svg
   ```

5. 安装`react-navigation`用于导航和路由。

   ```bash
   npm install @react-navigation/native @react-navigation/native-stack react-native-safe-area-context react-native-screens
   ```

6. 安装`@react-native-async-storage/async-storage`以存储扫描的身份证。

   ```bash
   npm install @react-native-async-storage/async-storage
   ```

7. 安装`mrz`以解析MRZ。

   ```bash
   npm install mrz
   ```

## 添加相机权限

对于iOS，将以下内容添加到`Info.plist`。

```xml
<key>NSCameraUsageDescription</key>
<string>For document scanning</string>
```

对于 Android，在`AndroidManifest.xml`中添加以下内容。

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

## 导航

该应用程序有三屏。

1. 主屏幕页面。我们可以在此页面上管理扫描的身份证件。

   ![主页](/album/2024/02/id-card-scanner/home-page.jpg)

2. 身份证屏幕页面。我们可以扫描新的身份证件，也可以在此页面上查看和修改已有身份证件。

   ![身份证页面](/album/2024/02/id-card-scanner/card-page.jpg)

3. 相机屏幕页面。我们可以在此页面打开摄像头，裁剪身份证件图片。

   ![相机页面](/album/2024/02/id-card-scanner/camera-page.jpg)

使用React Navigation来管理屏幕和导航。

1. 在`src/screens`下创建屏幕页面文件：`HomeScreen.tsx`、`CardScreen.tsx`、`CameraScreen.tsx`。

2. 更新`App.tsx`以使用React Navigation。

   ```tsx
   import React from 'react';
   import { NavigationContainer } from '@react-navigation/native';
   import { createNativeStackNavigator } from '@react-navigation/native-stack';
   import HomeScreen from './screens/HomeScreen';
   import CameraScreen from './screens/CameraScreen';
   import CardScreen from './screens/CardScreen';
   import { TextButton } from './components/TextButton';

   const Stack = createNativeStackNavigator();

   function App(): React.JSX.Element {
     return (
       <NavigationContainer>
         <Stack.Navigator>
           <Stack.Screen name="Home" component={HomeScreen} />
           <Stack.Screen name="Camera" component={CameraScreen} />
           <Stack.Screen name="Card" component={CardScreen} />
         </Stack.Navigator>
       </NavigationContainer>
     );
   }

   export default App;
   ```

## 数据存储方式

定义了一个`ScannedCard`接口来表示身份证。它包含其背面和正面图像的base64以及提取的信息。

```ts
export interface ParsedResult {
  Surname:string,
  GivenName:string,
  IDNumber:string,
  DateOfBirth:string,
  DateOfExpiry:string
}

export interface ScannedIDCard {
  backImage:string,
  frontImage:string,
  info:ParsedResult,
  timestamp:number
}
```

编写了一个`IDCardManager` 用于使用`async-storage`存储身份证。使用时间戳作键值。

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
export class IDCardManager {

  static async saveIDCard(card:ScannedIDCard) {
    await AsyncStorage.setItem(card.timestamp.toString(),JSON.stringify(card));
  }

  static async deleteIDCard(key:string) {
    await AsyncStorage.removeItem(key);
  }

  static async getKeys(){
    return await AsyncStorage.getAllKeys();
  }

  static async getIDCard(key:string){
    let jsonStr:string|null = await AsyncStorage.getItem(key);
    if (jsonStr) {
      let card:ScannedIDCard = JSON.parse(jsonStr);
      return card;
    }else{
      return null;
    }
  }

  static async listIDCards(){
    let cards:ScannedIDCard[] = [];
    let keys = await this.getKeys();
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      let card = await this.getIDCard(key);
      if (card) {
        cards.push(card);
      }
    }
    return cards;
  }
}
```


## 主屏幕页面

1. 在`src/components/Card.tsx`里定义一个`Card`组件。我们会在主屏幕用它列出扫描的身份证。

   ```tsx
   {% raw %}export interface CardProps{
     cardKey:string;
     onPress?:()=>void;
   }
   export function Card(props:CardProps){
     const [card,setCard] = useState<ScannedIDCard|null>();
     const [pressed,setPressed] = useState(false);
     useEffect(() => {
       (async () => {
         console.log("mounted")
         const result = await IDCardManager.getIDCard(props.cardKey);
         setCard(result);
       })();
     }, []);

     const getDate = () => {
       if (card) {
         let timestamp = card.timestamp;
         let date = new Date(timestamp);
         return date.toUTCString();
       }
       return "";
     }

     const getCardDetailsText = () => {
       let text = "Name: "+card?.info.GivenName+" "+card?.info.Surname + "\n";
       text = text + "Scanned Date: " + getDate();
       return text;
     }

     return (
       <Pressable
         onPress={props.onPress}
         onPressIn={()=>setPressed(true)}
         onPressOut={()=>setPressed(false)}
       >
         <View style={[styles.card,pressed?styles.pressed:null]}>
           <Image
             style={styles.cardImage}
             source={{
               uri: 'data:image/jpeg;base64,'+card?.frontImage,
             }}
           />
           <View style={styles.cardDetails}>
             <Text>{getCardDetailsText()}</Text>
           </View>
         </View>
       </Pressable>
     )
   }

   const styles = StyleSheet.create({
     card:{
       flex:1,
       display:"flex",
       flexDirection:"row",
       margin: 10,
       padding:10,
       borderColor:"gray",
       borderWidth:0.2,
       borderRadius:3
     },
     pressed:{
       backgroundColor:"lightgray",
     },
     cardImage:{
       width: 100,
       height: 70,
       resizeMode:"cover"
     },
     cardDetails:{
       flex:1,
       padding:10,
       justifyContent:"center",
       flexDirection:"row"
     },
   });{% endraw %}
   ```

2. 在主屏幕上列出现有的身份证。

   ```tsx
   interface HomeScreenProps {
     route:any;
     navigation:any;
   }

   export default function HomeScreen(props:HomeScreenProps){
     const selectedCardKey = useRef("");
     const [cardKeys,setCardKeys] = useState<readonly string[]>([]);
     useEffect(() => {
       const unsubscribe = props.navigation.addListener('focus', async () => {
         console.log("screen focused");
         setCardKeys([]);//force rendering
         setCardKeys(await IDCardManager.getKeys());
       });
       return unsubscribe;
     }, [props.navigation]);

     const cardPressed = (key:string) => {
       selectedCardKey.current = key;
     }

     const renderCards = () => {
       let cards:React.ReactElement[] = [];
       if (cardKeys.length == 0) {
         return;
       }
       cardKeys.forEach(async cardKey =>  {
         let card = <Card key={cardKey} cardKey={cardKey} onPress={()=>cardPressed(cardKey)}></Card>;
         cards.push(card);
       });
       if (cards.length>0) {
         return cards;
       }
     }

     return (
       <View style={StyleSheet.absoluteFill}>
         <ScrollView style={styles.cardList}>
           {renderCards()}
         </ScrollView>
       </View>
     )
   }
   ```

3. 身份证组件被点击时，显示一个模态框供用户选择打开或删除该身份证。

   JSX：

   ```tsx
   {% raw %}<Modal
     animationType="slide"
     transparent={true}
     visible={modalVisible}
     onRequestClose={() => {
       setModalVisible(!modalVisible);
     }}>
     <View style={styles.centeredView}>
       <View style={styles.modalView}>
         <Text style={styles.modalText}>Please select an action:</Text>
         <View style={{flexDirection:"row"}}>
           <Pressable
             style={styles.button}
             onPress={() => performAction("open")}>
             <Text style={styles.textStyle}>Open</Text>
           </Pressable>
           <Pressable
             style={styles.button}
             onPress={() => performAction("delete")}>
             <Text style={styles.textStyle}>Delete</Text>
           </Pressable>
         </View>
       </View>
     </View>
   </Modal>{% endraw %}
   ```

   函数：

   ```tsx
   const [modalVisible,setModalVisible] = useState(false);
   const goToCardScreen = () => {
     console.log("goToCardScreen");
     props.navigation.navigate('Card',{
       cardKey: selectedCardKey.current,
     });
   }

   const cardPressed = (key:string) => {
     selectedCardKey.current = key;
     setModalVisible(true);
   }

   const performAction = async (mode:"delete"|"open") => {
     if (mode === "delete") {
       await IDCardManager.deleteIDCard(selectedCardKey.current);
       setCardKeys(await IDCardManager.getKeys());
     }else{
       goToCardScreen();
     }
     setModalVisible(!modalVisible);
   }
   ```

4. 添加一个底部的工具栏，在上面添加一个"Scan"按钮，用于导航到身份证屏幕。

   JSX：

   ```tsx
   <View style={[styles.bottomBar, styles.elevation,styles.shadowProp]}>
     <Pressable onPress={()=>{selectedCardKey.current ="";goToCardScreen()}}>
       <View style={styles.circle}>
         <Text style={styles.buttonText}>SCAN</Text>
       </View>
     </Pressable>
   </View>
   ```

   样式：

   ```tsx
   const styles = StyleSheet.create({
     bottomBar:{
       width: "100%",
       height: 45,
       marginTop: 5,
       flexDirection:"row",
       justifyContent:"center",
       backgroundColor:"white",
     },
     shadowProp: {
       shadowColor: '#171717',
       shadowOffset: {width: 2, height: 4},
       shadowOpacity: 0.2,
       shadowRadius: 3,
     },
     elevation: {
       elevation: 20,
       shadowColor: '#52006A',
     },
     circle: {
       width: 60,
       height: 60,
       borderRadius: 60 / 2,
       backgroundColor: "rgb(120,190,250)",
       top:-25,
       justifyContent:"center",
     },
     buttonText:{
       alignSelf:"center",
       color:"white",
     },
   });
   ```

## 相机屏幕页面

1. 在相机屏幕上，使用Vision Camera打开相机，添加捕获按钮和一个标明裁剪的区域矩形。

   ```tsx
   const [hasPermission, setHasPermission] = useState(false);
   const [isActive,setIsActive] = useState(true);
   const device = useCameraDevice("back");
   const format = useCameraFormat(device, [
     { videoResolution: { width: 1920, height: 1080 } },
     { fps: 30 }
   ])
   useEffect(() => {
     (async () => {
       const status = await Camera.requestCameraPermission();
       setHasPermission(status === 'granted');
       setIsActive(true);
     })();
   }, []);

   return (
     <View style={StyleSheet.absoluteFill}>
       {device != null &&
       hasPermission && (
       <>
         <Camera
           style={StyleSheet.absoluteFill}
           isActive={isActive}
           device={device}
           format={format}
           frameProcessor={frameProcessor}
           pixelFormat='yuv'
         />
          <Svg preserveAspectRatio={(Platform.OS == 'ios') ? '':'xMidYMid slice'} style={StyleSheet.absoluteFill} viewBox={getViewBox()}>
           <Rect
             x={cropRegion.left/100*getFrameSize().width}
             y={cropRegion.top/100*getFrameSize().height}
             width={cropRegion.width/100*getFrameSize().width}
             height={cropRegion.height/100*getFrameSize().height}
             strokeWidth="2"
             stroke="red"
             fillOpacity={0.0}
           />
         </Svg>
       </>
       )}
       <View style={[styles.bottomBar]}>
         <Pressable
           onPressIn={()=>{setPressed(true)}}
           onPressOut={()=>{setPressed(false)}}
           onPress={()=>{capture()}}>
           <View style={styles.outerCircle}>
           <View style={[styles.innerCircle, pressed ? styles.circlePressed:null]}></View>
           </View>
         </Pressable>
       </View>
     </View>
   )
   ```

2. 根据身份证的比例设置裁剪区域。

   ```tsx
   const [cropRegion,setCropRegion] = useState({
     left: 10,
     top: 20,
     width: 80,
     height: 30
   });
   const cropRegionShared = useSharedValue<undefined|CropRegion>(undefined);

   const adaptCropRegionForIDCard = () => {
     let size = getFrameSize();
     let regionWidth = 0.8*size.width;
     let desiredRegionHeight = regionWidth/(85.6/54);
     let height = Math.ceil(desiredRegionHeight/size.height*100);
     let region = {
       left:10,
       width:80,
       top:20,
       height:height
     };
     setCropRegion(region);
     cropRegionShared.value = region;
   }

   const getFrameSize = ():{width:number,height:number} => {
     let size = {width:1080,height:1920};
     return size;
   }

   useEffect(() => {
     (async () => {
       adaptCropRegionForIDCard();
     })();
   }, []);
   ```

3. 定义帧处理器，以便在按下捕捉按钮时捕捉帧。捕获后将返回到上一个屏幕，并返回裁剪后的帧的base64。

   ```tsx
   const shouldTake = useSharedValue(false);
   const [pressed,setPressed] = useState(false);
   const capture = () => {
     shouldTake.value=true;
   }

   const onCaptured = (base64:string) => {
     setIsActive(false);
     if (props) {
       if (props.navigation) {
         props.navigation.navigate({
           name: 'Card',
           params: { base64: base64 },
           merge: true,
         });
       }
     }
   }

   const onCapturedJS = Worklets.createRunInJsFn(onCaptured);
   const frameProcessor = useFrameProcessor((frame) => {
     'worklet';
     if (shouldTake.value == true && cropRegionShared.value != undefined) {
       shouldTake.value = false;
       const result = crop(frame,{cropRegion:cropRegion,includeImageBase64:true,saveAsFile:false});
       if (result.base64) {
         onCapturedJS(result.base64);
       }
     }
   }, []);
   ```

## 身份证屏幕页面

在身份证屏幕上，显示身份证的图像和信息，并允许编辑。

1. 定义JSX：

   ```tsx
   {% raw %}const isFrontRef = useRef(false);
   const goToCameraScreen = (isFront:boolean) => {
     isFrontRef.current = isFront;
     props.navigation.navigate('Camera');
   }
   const Card = (props:{isFront:boolean}) => {
     let base64;
     if (props.isFront) {
       base64 = frontImageBase64;
     }else{
       base64 = backImageBase64;
     }
     let innerControl;
     if (!base64) {
       innerControl =
         <View style={styles.buttonContainer}>
           <Button title="Add Image"
             onPress={()=>{goToCameraScreen(props.isFront)}}
           ></Button>
         </View>
     }else{
       innerControl =
         <View style={styles.imageContainer}>
           <Pressable
             onPress={()=>{goToCameraScreen(props.isFront)}}
           >
             <Image
               style={styles.cardImage}
               source={{
               uri: 'data:image/jpeg;base64,'+base64,
             }}></Image>
           </Pressable>
         </View>
     }
     return (
       <>
         <Text style={styles.header}>
           {props.isFront?"Front":"Back"} Image:
         </Text>
         {innerControl}
       </>
     )
   }

   const Fields = () => {
     const onChangeText = (key:string,text:string) => {
       console.log("onChangeText");
       let result:any = JSON.parse(JSON.stringify(parsedResult));
       result[key] = text;
       setParsedResult(result);
     }
     let fieldArray = [];
     let keys = Object.keys(parsedResult);
     for (let index = 0; index < keys.length; index++) {
       let key = keys[index];
       const value = (parsedResult as any)[key];
       let view =
       <View style={styles.infoField} key={"field-"+key}>
         <Text style={styles.fieldLabel}>{key+":"}</Text>
         <TextInput
           style={styles.fieldInput}
           onChangeText={(text)=>{onChangeText(key,text)}}
           value={value}/>
       </View>
       fieldArray.push(view);
     }
     return (
       fieldArray
     )
   }

   return (
     <View style={StyleSheet.absoluteFill}>
       <ScrollView>
         {Card({isFront:true})}
         {Card({isFront:false})}
         <Text style={styles.header}>
           Info
         </Text>
         {Fields()}
       </ScrollView>
     </View>
   ){% endraw %}
   ```

2. 组件挂载后，如果指定了存储的键值，则加载该身份证信息。

   ```tsx
   const cardKey = useRef("");
   const [frontImageBase64,setFrontImageBase64] = useState("");
   const [backImageBase64,setBackImageBase64] = useState("");
   const [parsedResult,setParsedResult] = useState<ParsedResult>(
     {
       Surname:"",
       GivenName:"",
       IDNumber:"",
       DateOfBirth:"",
       DateOfExpiry:""
     }
   );
   useEffect(() => {
     const init = async () => {
       console.log(props);
       let key = props.route.params.cardKey;
       if (key) {
         cardKey.current = key;
         let IDCard = await IDCardManager.getIDCard(key);
         if (IDCard) {
           setFrontImageBase64(IDCard.frontImage);
           setBackImageBase64(IDCard.backImage);
           setParsedResult(IDCard.info);
         }
       }
     }
     init()
   }, []);
   ```

3. 拍摄背面图像后，尝试识别身份证的MRZ行并提取信息。

   ```tsx
   useEffect(() => {
     if (props.route.params?.base64) {
       let base64 = props.route.params?.base64;
       if (isFrontRef.current === true) {
         setFrontImageBase64(base64);
       }else{
         setBackImageBase64(base64);
         recognizeIDCard(base64);
       }
     }
   }, [props.route.params?.base64]);

   const recognizeIDCard = async (base64:string) => {
     const result = await decodeBase64(base64)
     if (result.results.length>0) {
       let lineResults = result.results[0].lineResults;
       if (lineResults.length >= 3) {
         let MRZLines = [];
         MRZLines.push(lineResults[lineResults.length - 3].text);
         MRZLines.push(lineResults[lineResults.length - 2].text);
         MRZLines.push(lineResults[lineResults.length - 1].text);
         console.log(MRZLines);
         let parsed = parse(MRZLines);
         let result = {
           Surname:parsed.fields.lastName ?? "",
           GivenName:parsed.fields.firstName ?? "",
           IDNumber:parsed.fields.documentNumber ?? "",
           DateOfBirth:parsed.fields.birthDate ?? "",
           DateOfExpiry:parsed.fields.expirationDate ?? ""
         }
         setParsedResult(result);
         return;
       }
     }
     Alert.alert("","Failed to recognize the card.");
   }
   ```

4. 按下标题栏上的"Save"按钮时，保存扫描的身份证。

   ```tsx
   useEffect(() => {
     // Use `setOptions` to update the button that we previously specified
     // Now the button includes an `onPress` handler to update the count
     props.navigation.setOptions({
       headerRight: () => (
         <TextButton title="Save" onPress={()=>saveCard()}></TextButton>
       ),
     });
   }, [props.navigation,parsedResult,frontImageBase64,backImageBase64]);

   const saveCard = async () => {
     let complete = isInfoComplete();
     if (complete) {
       let key;
       if (cardKey.current) {
         key = parseInt(cardKey.current);
       }else{
         key = new Date().getTime();
         cardKey.current = key.toString();
       }
       let card:ScannedIDCard = {
         frontImage:frontImageBase64,
         backImage:backImageBase64,
         info:parsedResult,
         timestamp:key
       }
       await IDCardManager.saveIDCard(card);
       Alert.alert("","Saved");
     }else{
       Alert.alert("","Card info not complete");
     }
   }
   ```

以下是配置Dynamsoft Label Recognize以识别MRZ的步骤。

1. 将MRZ模型文件放入项目中。可以在[此处](https://github.com/tony-xlh/react-native-id-card-scanner/tree/main/android/app/src/main/assets/MRZ)找到文件。

   对于Android ，需要将MRZ模型文件放在`assets`下。

   对于iOS ，将MRZ模型文件夹以reference的形式添加。

   ![给iOS添加模型1](/album/2023/09/ionic/add-model-ios-1.jpg)

   ![给iOS添加模型2](/album/2023/09/ionic/add-model-ios-2.jpg)

2. 使用许可证初始化Dynamsoft Label Recognizer并更新其模板。可以在[这里](https://www.dynamsoft.com/customer/license/trialLicense?product=dlr)申请许可证。

   ```tsx
   useEffect(() => {
     (async () => {
       let success = await initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==");
       if (!success) {
         Alert.alert("","License for the MRZ Reader is invalid.");
       }
       try {
         await useCustomModel({customModelFolder:"MRZ",customModelFileNames:["MRZ"]});
         await updateTemplate("{\"CharacterModelArray\":[{\"DirectoryPath\":\"\",\"Name\":\"MRZ\"}],\"LabelRecognizerParameterArray\":[{\"Name\":\"default\",\"ReferenceRegionNameArray\":[\"defaultReferenceRegion\"],\"CharacterModelName\":\"MRZ\",\"LetterHeightRange\":[5,1000,1],\"LineStringLengthRange\":[30,44],\"LineStringRegExPattern\":\"([ACI][A-Z<][A-Z<]{3}[A-Z0-9<]{9}[0-9][A-Z0-9<]{15}){(30)}|([0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z<]{3}[A-Z0-9<]{11}[0-9]){(30)}|([A-Z<]{0,26}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,26}<{0,26}){(30)}|([ACIV][A-Z<][A-Z<]{3}([A-Z<]{0,27}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,27}){(31)}){(36)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}|([PV][A-Z<][A-Z<]{3}([A-Z<]{0,35}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,35}<{0,35}){(39)}){(44)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[A-Z0-9<]{2}){(44)}\",\"MaxLineCharacterSpacing\":130,\"TextureDetectionModes\":[{\"Mode\":\"TDM_GENERAL_WIDTH_CONCENTRATION\",\"Sensitivity\":8}],\"Timeout\":9999}],\"LineSpecificationArray\":[{\"BinarizationModes\":[{\"BlockSizeX\":30,\"BlockSizeY\":30,\"Mode\":\"BM_LOCAL_BLOCK\",\"MorphOperation\":\"Close\"}],\"LineNumber\":\"\",\"Name\":\"defaultTextArea->L0\"}],\"ReferenceRegionArray\":[{\"Localization\":{\"FirstPoint\":[0,0],\"SecondPoint\":[100,0],\"ThirdPoint\":[100,100],\"FourthPoint\":[0,100],\"MeasuredByPercentage\":1,\"SourceType\":\"LST_MANUAL_SPECIFICATION\"},\"Name\":\"defaultReferenceRegion\",\"TextAreaNameArray\":[\"defaultTextArea\"]}],\"TextAreaArray\":[{\"Name\":\"defaultTextArea\",\"LineSpecificationNameArray\":[\"defaultTextArea->L0\"]}]}");
       } catch (error:any) {
         console.log(error);
         Alert.alert("Error","Failed to load model.");
       }
     })();
   }, []);
   ```

## 源代码

好了，我们已经介绍了React Native身份证扫描应用的关键部分。获取源代码来自己试用一下吧：

<https://github.com/tony-xlh/react-native-id-card-scanner>

