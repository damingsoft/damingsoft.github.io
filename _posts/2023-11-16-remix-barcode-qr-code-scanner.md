---
layout: post
title: 基于Remix构建一个条码扫描Web应用
date: 2023-11-16 11:04:53 +0800
categories: 条码扫描
tags:
  - React
  - HTML5
---

Remix是一个全栈Web框架，可以让开着专注于用户界面，并通过Web标准来提供快速、流畅和弹性的用户体验。它已被Shopify收购，也是React文档中推荐的框架。

在本文中，我们将使用Remix构建一个条码扫描应用。使用[Dynamsoft Camera Enhancer](https://www.dynamsoft.com/camera-enhancer/docs/introduction/)在浏览器中访问相机，[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)从相机视频帧中读取条形码。

[在线demo](https://remix-barcode-scanner.vercel.app/)

demo能扫描ISBN条形码，获取图书信息，并使用Prisma做为ORM将它们保存到PostgreSQL数据库中。

新增图书演示视频：

<video src="https://user-images.githubusercontent.com/5462205/283306182-ca85c047-af6e-4771-bc59-21a9dc2d8e38.mp4" data-canonical-src="https://user-images.githubusercontent.com/5462205/283306182-ca85c047-af6e-4771-bc59-21a9dc2d8e38.mp4" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-height:640px; min-height: 200px; max-width: 100%;"></video>

编辑图书演示视频：

<video src="https://user-images.githubusercontent.com/5462205/283306253-5665d91f-a163-4724-b826-52bf0c597b77.mp4" data-canonical-src="https://user-images.githubusercontent.com/5462205/283306253-5665d91f-a163-4724-b826-52bf0c597b77.mp4" controls="controls" muted="muted" class="d-block rounded-bottom-2 border-top width-fit" style="max-height:640px; min-height: 200px; max-width: 100%;"></video>


## 用Remix构建条码扫描应用

下面是分步实现过程。

### 新建项目

创建一个名为`barcode-scanner`的新的Remix项目：

```bash
npx create-remix@latest barcode-scanner
```

然后，我们可以运行以下命令进行测试：

```bash
cd barcode-scanner
npm install
npm run dev
```

### 安装依赖项

安装Dynamsoft Barcode Reader和Dynamsoft Camera Enhancer。

```bash
npm install dynamsoft-javascript-barcode@9.6.31 dynamsoft-camera-enhancer@3.3.8
```

PS：如果编译器无法识别ES模块，可以将`“type”：“module”`添加到`package.json`中。

### 新建一个条码扫描React组件

接下来，在`app/components/BarcodeScanner.tsx`下创建一个条码扫描组件，该组件可以打开相机并扫描相机视频帧中的条形码。

1. 组件的基本内容：

   ```jsx
   import {CameraEnhancer,PlayCallbackInfo} from "dynamsoft-camera-enhancer";
   import {BarcodeReader,TextResult}from "dynamsoft-javascript-barcode";
   import React from "react";
   import { ReactNode } from "react";

   export interface ScanRegion {
     left:number;
     top:number;
     right:number;
     bottom:number;
   }

   export interface ScannerProps{
     isActive?: boolean;
     children?: ReactNode;
     interval?: number;
     license?: string;
     scanRegion?: ScanRegion;
     onInitialized?: (enhancer:CameraEnhancer,reader:BarcodeReader) => void;
     onScanned?: (results:TextResult[]) => void;
     onPlayed?: (playCallbackInfo: PlayCallbackInfo) => void;
     onClosed?: () => void;
   }

   const BarcodeScanner = (props:ScannerProps): React.ReactElement => {
     return (
     )
   }

   export default BarcodeScanner;
   ```

   该组件有几个props来控制扫描和返回条码结果。

2. 定义扫描元素的容器。它有一个视频的容器和Dynamsoft Camera Enhancer使用的其他辅助控件。在这里，我们使用relative定位，这样我们可以在父组件中控制其位置。

   ```jsx
   {% raw %}const container = React.useRef(null);
   return (
     <div ref={container} style={{ position:"relative", width:"100%", height:"100%" }}>
       <svg className="dce-bg-loading"
        viewBox="0 0 1792 1792">
        <path d="M1760 896q0 176-68.5 336t-184 275.5-275.5 184-336 68.5-336-68.5-275.5-184-184-275.5-68.5-336q0-213 97-398.5t265-305.5 374-151v228q-221 45-366.5 221t-145.5 406q0 130 51 248.5t136.5 204 204 136.5 248.5 51 248.5-51 204-136.5 136.5-204 51-248.5q0-230-145.5-406t-366.5-221v-228q206 31 374 151t265 305.5 97 398.5z" />
      </svg>
      <svg className="dce-bg-camera"
        viewBox="0 0 2048 1792">
        <path d="M1024 672q119 0 203.5 84.5t84.5 203.5-84.5 203.5-203.5 84.5-203.5-84.5-84.5-203.5 84.5-203.5 203.5-84.5zm704-416q106 0 181 75t75 181v896q0 106-75 181t-181 75h-1408q-106 0-181-75t-75-181v-896q0-106 75-181t181-75h224l51-136q19-49 69.5-84.5t103.5-35.5h512q53 0 103.5 35.5t69.5 84.5l51 136h224zm-704 1152q185 0 316.5-131.5t131.5-316.5-131.5-316.5-316.5-131.5-316.5 131.5-131.5 316.5 131.5 316.5 316.5 131.5z" />
      </svg>
      <div className="dce-video-container"></div>
      <select className="dce-sel-camera"></select>
      <select className="dce-sel-resolution"></select>
      {props.children}
     </div>
   ){% endraw %}
   ```

3. 组件挂载时，初始化Barcode Reader和Camera Enhancer。同时注册相关事件。

   ```jsx
   React.useEffect(()=>{
     const init = async () => {
       if (BarcodeReader.isWasmLoaded() === false) {
         if (props.license) {
           BarcodeReader.license = props.license;
         }else{
           BarcodeReader.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="; //one-day trial license
         }
         BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.31/dist/";
       }
       reader.current = await BarcodeReader.createInstance();
       enhancer.current = await CameraEnhancer.createInstance();
       await enhancer.current.setUIElement(container.current!);
       enhancer.current.on("played", (playCallbackInfo: PlayCallbackInfo) => {
         if (props.onPlayed) {
           props.onPlayed(playCallbackInfo);
         }
       });
       enhancer.current.on("cameraClose", () => {
         if (props.onClosed) {
           props.onClosed();
         }
       });
       enhancer.current.setVideoFit("cover");
       if (props.onInitialized) {
         props.onInitialized(enhancer.current,reader.current);
       }

       if (props.scanRegion) {
         enhancer.current.setScanRegion({
           regionLeft:props.scanRegion.left,
           regionTop:props.scanRegion.top,
           regionRight:props.scanRegion.right,
           regionBottom:props.scanRegion.bottom,
           regionMeasuredByPercentage:true
         });
       }

       if (props.onInitialized) {
         props.onInitialized(enhancer.current,reader.current);
       }

       toggleCamera();
     }
     if (mounted.current === false) {
       init();
     }
     mounted.current = true;
   },[])
   ```

4. 监视`isActive`这个props。如果设置为true，则启动相机。反之，停止相机。

   ```jsx
   const toggleCamera = () => {
     if (mounted.current === true) {
       if (props.isActive === true) {
         enhancer.current?.open(true);
       }else{
         stopScanning();
         enhancer.current?.close();
       }
     }
   }

   React.useEffect(()=>{
     toggleCamera();
   },[props.isActive])
   ```

5. 定义与扫码相关的功能。设置一个interval，用于定时从相机中获取帧并读取条码。

   ```js
   const interval = React.useRef<any>(null);
   const decoding = React.useRef(false);
   const startScanning = () => {
     stopScanning();
     const decode = async () => {
       if (decoding.current === false && reader.current && enhancer.current) {
         decoding.current = true;
         const results = await reader.current.decode(enhancer.current.getFrame());
         if (props.onScanned) {
           props.onScanned(results);
         }
         decoding.current = false;
       }
     }
     if (props.interval) {
       interval.current = setInterval(decode,props.interval);
     }else{
       interval.current = setInterval(decode,40);
     }
   }

   const stopScanning = () => {
     clearInterval(interval.current);
   }
   ```

6. 如果相机被打开，则触发扫描。

   ```jsx
   enhancer.current.on("played", (playCallbackInfo: PlayCallbackInfo) => {
     if (props.onPlayed) {
       props.onPlayed(playCallbackInfo);
     }
     startScanning();
   });
   ```

7. 在`styles`下创建`camera.css`文件，并将其导入`root.tsx`。

   CSS：

   ```css
   @keyframes dce-rotate{from{transform:rotate(0turn);}to{transform:rotate(1turn);}}
   .dce-container {position:relative;background-color:white;width:100%;height:100%;}
   .dce-sel-camera {position:absolute;height:20px}
   .dce-sel-resolution {position:absolute;top:20px}
   .dce-bg-loading{animation:1s linear infinite dce-rotate;width:40%;height:40%;position:absolute;margin:auto;left:0;top:0;right:0;bottom:0;fill:#aaa;}
   .dce-bg-camera{display:none;width:40%;height:40%;position:absolute;margin:auto;left:0;top:0;right:0;bottom:0;fill:#aaa;}
   ```

   `root.tsx`：

   ```ts
   import styles from "~/styles/main.css";

   export const links: LinksFunction = () => [
     { rel: "stylesheet", href: styles },
   ];
   ```

### 在应用中使用扫码组件

切换到`app/routes/_index.tsx`。在应用中使用这个扫码组件。

1. 导入扫码组件并将`isActive`状态绑定到它，之后我们可以用按钮来控制其扫描状态。

   ```jsx
   {% raw %}export default function Index() {
     const [isActive,setIsActive] = useState(false);
     const startBarcodeScanner = () => {
       if (initialized) {
         setIsActive(true);
       }else{
         alert("Please wait for the initialization and then try again.");
       }
     }
     const stopBarcodeScanner = () => {
       setIsActive(false);
     }
     return (
       <div>
         <h1>Remix Barcode Scanner</h1>
         <button onClick={()=>startBarcodeScanner()} >Start Scanning</button>
         <div className="scanner" style={{display:isActive?"":"none"}}>
           <BarcodeScanner
             onInitialized={async (_enhancer:CameraEnhancer,reader:BarcodeReader)=>{
               setInitialized(true);
             }}
             isActive={isActive}
           >
             <button style={{position:"absolute",right:0}} onClick={()=>stopBarcodeScanner()} >Close</button>
           </BarcodeScanner>
         </div>
       </div>
     );
   }{% endraw %}
   ```

2. 绑定`onScanned`事件。如果扫到码，停止扫描并显示条码结果。

   JSX：

   ```jsx
   const [barcodes, setBarcodes] = useState<TextResult[]>([]);
   //...
   <ol>
     {barcodes.map((barcode,idx)=>(
       <li key={idx}>{barcode.barcodeFormatString+": "+barcode.barcodeText}</li>
     ))}
   </ol>
   <BarcodeScanner
     isActive={isActive}
     onScanned={(results)=> {
       if (results.length>0) {
         setIsActive(false);
         setBarcodes(results);
       }
     }}
   ></BarcodeScanner>
   ```


结果截图：

![简单条形扫描应用](/album/2023/11/remix/simple-barcode-scanner.jpg)

### 从环境变量读取许可证

我们需要设置Dynamsoft Barcode Reader的许可证才能使用它。可以在[此处](https://www.dynamsoft.com/customer/license/trialLicense?product=dbr&source=codepool)申请许可证。

我们可以直接将许可证存储在代码中来使用它：

```js
BarcodeReader.license = "<license>";
```

不过既然Remix是一个全栈框架，我们可以将其存储为系统的环境变量。

1. 在`_index.tsx`中添加loader函数：

   ```js
   export async function loader() {
     return json({
       ENV: {
         DBR_LICENSE: process.env.DBR_LICENSE,
       },
     });
   }
   ```

   该函数会从环境变量中读取许可证并将其传递到前端页面。

2. 在页面中，我们可以将许可证传递给扫码组件以使用它。如果没有提供许可证，使用一天有效期的试用证书。

   ```jsx
   export default function Index() {
     const data = useLoaderData<typeof loader>();
     return (
       <BarcodeScanner
         license={data.ENV.DBR_LICENSE ?? "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="}
         isActive={isActive}
       ></BarcodeScanner>
     )
   }
   ```

## 扫描图书并将其存储在PostgreSQL中

接下来，我们可以通过将书籍扫描到数据库中，来让这个扫码应用更加有用。

### Prisma和PostgreSQL的设置

我们使用Prisma作为ORM。

```bash
npm install @prisma/client
npm install prisma --save-dev
```

安装完成后，使用postgresql作为数据库初始化prisma。

```bash
npx prisma init --datasource-provider postgresql
```

可以在`.env`中设置PostgreSQL服务器的URL。

然后，在schema中添加一个图书的模型。

```prisma
model Book {
  ISBN      String   @unique
  title     String
  author    String
  createdAt DateTime @default(now())
}
```

将模型部署到数据库：

```bash
npx prisma db push
```

### CRUD

创建`data.ts`以创建、读取、更新或删除记录。

```ts
import { PrismaClient } from "@prisma/client";

export type BookRecord = {
  ISBN:string;
  title:string;
  author:string;
  createdAt: string;
};

const books = {
  convertRecord(book:{
    ISBN: string;
    title: string;
    author: string;
    createdAt: Date;
  }|null):BookRecord|null{
    if (book) {
      return {
        ISBN:book.ISBN,
        title:book.title,
        author:book.author,
        createdAt:book.createdAt.getTime().toString()
      }
    }else{
      return null;
    }
  },

  async getAll(): Promise<BookRecord[]> {
    const prisma = new PrismaClient();
    const allBooks = await prisma.book.findMany();
    const bookRecords = [];
    for (let index = 0; index < allBooks.length; index++) {
      const converted = this.convertRecord(allBooks[index]);
      if (converted) {
        bookRecords.push(converted);
      }
    }
    await prisma.$disconnect();
    return bookRecords;
  },

  async get(id: string): Promise<BookRecord | null> {
    const prisma = new PrismaClient();
    const book = await prisma.book.findUnique({
      where: {
        ISBN: id,
      },
    })
    await prisma.$disconnect();
    return this.convertRecord(book);
  },

  async create(record: BookRecord): Promise<void> {
    const prisma = new PrismaClient();
    await prisma.book.create({
      data: {
        title: record.title,
        author: record.author,
        ISBN: record.ISBN
      },
    })
    await prisma.$disconnect();  
  },

  async set(id: string, record: BookRecord): Promise<void> {
    const prisma = new PrismaClient();
    await prisma.book.update({
      where: {
        ISBN: id,
      },
      data: {
        author: record.author,
        title: record.title,
      },
    })
    await prisma.$disconnect();
  },

  async destroy(id: string): Promise<void> {
    const prisma = new PrismaClient();
    await prisma.book.delete({
      where: {
        ISBN: id,
      },
    })
    await prisma.$disconnect();
  },
};

export async function addBook(record:BookRecord){
  await books.create(record);
}

export async function getBooks(): Promise<BookRecord[]>{
  return await books.getAll();
}

export async function getBook(id:string): Promise<BookRecord|null>{
  return await books.get(id);
}

export async function editBook(id:string,record:BookRecord): Promise<void>{
  await books.set(id,record);
}

export async function deleteBook(id:string): Promise<void>{
  await books.destroy(id);
}
```

### 将书籍扫描到数据库

在`app/routes`下创建一个名为`scanner.tsx`的新文件。它可以打开扫码器，通过ISBN条码获取书籍信息，并将书籍保存到数据库中。

`action`函数用于接收从网页发送的表单数据。

屏幕截图：

![图书扫描应用](/album/2023/11/remix/book-scanner.jpg)

代码：

```jsx
{% raw %}import { type MetaFunction, type LinksFunction, redirect, ActionFunctionArgs, json } from "@remix-run/node";
import { useEffect, useState } from "react";
import BarcodeScanner from "~/components/BarcodeScanner";
import {CameraEnhancer} from "dynamsoft-camera-enhancer";
import styles from "~/styles/camera.css";
import { BarcodeReader, TextResult } from "dynamsoft-javascript-barcode";
import { Form, useLoaderData, useNavigate, useNavigation, useRouteError } from "@remix-run/react";
import { addBook } from "~/data";
import { queryBook } from "~/bookAPI";

export const meta: MetaFunction = () => {
  return [
    { title: "Remix Barcode Scanner" },
    { name: "description", content: "Remix Barcode Scanner." },
  ];
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];

export async function loader() {
  return json({
    ENV: {
      DBR_LICENSE: process.env.DBR_LICENSE,
    },
  });
}

export const action = async ({
  params,
  request,
}: ActionFunctionArgs) => {

  const formData = await request.formData();
  const updates = Object.fromEntries(formData);
  const title = updates.title.toString();
  const author = updates.author.toString();
  const ISBN = updates.ISBN.toString();
  const timeStamp = new Date().getTime().toString();
  await addBook({
    title:title,
    author:author,
    ISBN:ISBN,
    createdAt:timeStamp
  })  
  return redirect(`/`);
};

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  useEffect(()=>{
    const goBack = () => {
      navigate("/");
    }
    setTimeout(goBack,3000);
  },[])
  return (
    <div>Failed to create a new record. Maybe the book has been scanned.</div>
  );
}


export default function Scanner() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { state } = useNavigation();
  const [isActive,setIsActive] = useState(false);
  const [initialized,setInitialized] = useState(false);
  const [ISBN,setISBN] = useState("");
  const [author,setAuthor] = useState("");
  const [title,setTitle] = useState("");
  const busy = state === "submitting";
  const startBarcodeScanner = () => {
    if (initialized) {
      reset();
      setIsActive(true);
    }else{
      alert("Please wait for the initialization and then try again.");
    }
  }
  const stopBarcodeScanner = () => {
    setIsActive(false);
  }

  const reset = () => {
    setISBN("");
    setAuthor("");
    setTitle("");
  }

  return (
    <div>
      <h1>New Book</h1>
      <Form id="book-form" method="post"
        onSubmit={(event) => {
          if (!ISBN) {
            alert("ISBN must not be empty");
            event.preventDefault();
          }
        }}>
        <div>
          <label>
            ISBN:
            <input name="ISBN" onChange={e=>setISBN(e.target.value)} type="text" value={ISBN}/>
          </label>
          <button type="button" onClick={()=>startBarcodeScanner()} >Scan</button>
        </div>
        <div>
          <label>
            Title:
            <input name="title" onChange={e=>setTitle(e.target.value)} type="text" value={title}/>
          </label>
        </div>
        <div>
          <label>
            Author:
            <input name="author" onChange={e=>setAuthor(e.target.value)} type="text" value={author}/>
          </label>
        </div>
        <button type="submit" disabled={busy}>{busy ? "Submiting..." : "Submit"}</button>
        <button type="button" onClick={()=>navigate(-1)}>Back</button>
      </Form>
      <div className="scanner" style={{display:isActive?"":"none"}}>
        <BarcodeScanner
          license={data.ENV.DBR_LICENSE ?? "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=="}
          onInitialized={async (_enhancer:CameraEnhancer,reader:BarcodeReader)=>{
            const settings = await reader.getRuntimeSettings();
            settings.expectedBarcodesCount = 0;
            await reader.updateRuntimeSettings(settings);
            setInitialized(true);
          }}
          onScanned={async (results)=> {
            console.log(results);
            if (results.length>0) {
              setIsActive(false);
              console.log("set ISBN");
              setISBN(results[0].barcodeText);
              try {
                let bookInfo = await queryBook(results[0].barcodeText);
                setTitle(bookInfo.title);
                setAuthor(bookInfo.author);
              } catch (error) {
                alert("Faild to fill in title and author automatically.");
              }
            }
          }}
          scanRegion={{
            top:20,
            left:0,
            right:100,
            bottom: 60
          }}
          isActive={isActive}
        >
          <button style={{position:"absolute",right:0}} onClick={()=>stopBarcodeScanner()} >Close</button>
        </BarcodeScanner>
      </div>
    </div>
  );
}{% endraw %}
```

使用Google的API检索书籍信息：

```ts
export interface BookInfo{
  title:string;
  author:string;
}

export async function queryBook(ISBN:string):Promise<BookInfo> {
  try {
    let response = await fetch("https://www.googleapis.com/books/v1/volumes?q=isbn:"+ISBN);
    let json = await response.json();
    let bookItem = json["items"][0];
    let title = bookItem["volumeInfo"]["title"];
    let author = bookItem["volumeInfo"]["authors"].join(", ");
    return {
      title:title,
      author:author
    }
  } catch (error) {
    throw error;
  }
}
```

### 在首页中显示图书

1. 创建一个新的`BookCard`组件以显示书籍信息。

   ```jsx
   import { BookRecord } from "~/data";
   import { ReactElement, ReactNode, useState } from "react";

   export interface BookCardProps {
     record:BookRecord,
     children?:ReactNode
   }

   const BookCard = (props:BookCardProps): ReactElement => {
     const renderValue = (key:string) => {
       const value = (props.record as any)[key];
       if (key === "createdAt") {
         return new Date(parseInt(value)).toUTCString();
       }else{
         return value;
       }
     }
     return (
       <div className="book-card">
         {Object.keys(props.record).map((key)=>(
           <div className="book-info-item" key={key}>
             <label>
               {key.toUpperCase()}:&nbsp;
             </label>
             <input type="text" defaultValue={renderValue(key)}/>
           </div>
         ))}
         {props.children}
       </div>
     )
   }

   export default BookCard;
   ```

   CSS：

   ```css
   .book-card {
     padding: 1rem;
     border: 1px solid black;
     border-radius: 10px;
     margin-top: 1rem;
     margin-bottom: 1rem;
   }

   .book-card p {
     margin-block-start: 1em;
     margin-block-end: 1em;
   }

   .book-info-item {
     display: flex;
   }

   .book-card .book-info-item label {
     flex-basis:35%;
   }

   .book-card .book-info-item input {
     flex-basis:65%;
   }
   ```

2. 在首页中，获取书籍并显示它们。

   ```jsx
   export const loader = async () => {
     const books = await getBooks();
     return json({ books });
   };


   export default function Index() {
     const { books } = useLoaderData<typeof loader>();
     return (
       <div>
         {books.map((bookRecord,idx)=>(
           <BookCard record={bookRecord} key={"book-card-"+idx}>
             <Link to={`/books/`+bookRecord.ISBN}>View</Link>
           </BookCard>
         ))}
       </div>
     );
   }
   ```

### 添加图书路由

1. 新建一个图书路由模块在`app/routes/books$bookId.tsx`。它可以显示图书信息，并有两个按钮执行编辑和删除操作。

   ```jsx
   import { Form, useLoaderData,useNavigate } from "@remix-run/react";
   import { getBook } from "../data";
   import BookCard from "~/components/BookCard";
   import { LoaderFunctionArgs, json } from "@remix-run/node";
   import invariant from "tiny-invariant";

   export const loader = async ({
     params,
   }: LoaderFunctionArgs) => {
     invariant(params.bookId, "Missing bookId param");
     const bookRecord = await getBook(params.bookId);
     if (!bookRecord) {
       throw new Response("Not Found", { status: 404 });
     }
     return json({ bookRecord });
   };

   export default function Book() {
     const navigate = useNavigate();
     const { bookRecord } = useLoaderData<typeof loader>();
     return (
       <div>
         <BookCard record={bookRecord}>
           <div style={{display:"flex"}}>
             <Form action="edit">
               <button type="submit">Edit</button>
             </Form>
             <Form
               action="destroy"
               method="post"
               onSubmit={(event) => {
                 const response = confirm(
                   "Please confirm you want to delete this record."
                 );
                 if (!response) {
                   event.preventDefault();
                 }
               }}
             >
               <button type="submit">Delete</button>
             </Form>
           </div>
         </BookCard>
         <button onClick={()=>navigate("/")}>Back</button>
       </div>
     );
   }
   ```

2. 新建一个图书编辑路由模块在`app/routes/books$bookId_.edit.tsx`。用户可以在此模块中编辑图书记录。

   ```jsx
   import { Form, useLoaderData,useNavigate } from "@remix-run/react";
   import { BookRecord, editBook, getBook } from "../data";
   import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from "@remix-run/node";
   import invariant from "tiny-invariant";

   export const loader = async ({
     params,
   }: LoaderFunctionArgs) => {
     if (params.bookId) {
       const bookRecord = await getBook(params.bookId);
       if (!bookRecord) {
         throw new Response("Not Found", { status: 404 });
       }
       return json({ bookRecord });
     }else{
       throw new Response("Not Found", { status: 404 });
     }
   };

   export const action = async ({
     params,
     request,
   }: ActionFunctionArgs) => {
     invariant(params.bookId, "Missing bookId param");
     const formData = await request.formData();
     const updates = Object.fromEntries(formData);
     let bookRecord:BookRecord|null = await getBook(params.bookId);
     if (bookRecord) {
       bookRecord.title = updates.title.toString();
       bookRecord.author = updates.author.toString();
       editBook(params.bookId,bookRecord)
     }
     return redirect(`/books/${params.bookId}`);
   };

   export default function EditBook() {
     const navigate = useNavigate();
     const { bookRecord } = useLoaderData<typeof loader>();
     return (
       <Form id="book-form" method="post">
         <p className="book-info-item">
           <label>
             Title:
           </label>
           <input name="title" type="text" defaultValue={bookRecord.title}/>
           <label>
             Author:
           </label>
           <input name="author" type="text" defaultValue={bookRecord.author}/>
         </p>
         <p>
           <button type="submit">Save</button>
           <button type="button" onClick={()=>{
             navigate(-1);
           }}>Cancel</button>
         </p>
       </Form>
     );
   }
   ```

3. 新建一个图书删除路由模块在`app/routes/books$bookId.destroy.tsx`。用于响应删除请求。

   ```jsx
   import type { ActionFunctionArgs } from "@remix-run/node";
   import { redirect } from "@remix-run/node";
   import invariant from "tiny-invariant";

   import { deleteBook } from "../data";

   export const action = async ({
     params,
   }: ActionFunctionArgs) => {
     invariant(params.bookId, "Missing contactId param");
     await deleteBook(params.bookId);
     return redirect("/");
   };
   ```

好了，demo已经编写好了。我们可以将其部署到Vercel这样的平台上。

## 源代码

<https://github.com/tony-xlh/remix-barcode-scanner>

