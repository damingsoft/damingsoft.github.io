---
layout: post
title: 基于Blazor构建文档扫描Web应用
date: 2021-06-04 13:16:53 +0800
categories: 文档扫描
tags: Blazor
---

Blazor是一个使用.NET构建交互式客户端Web UI的框架[^doc]。用户可以用C#创建交互式UI，而无需使用JavaScript。服务器端和客户端应用程序逻辑都可以使用.NET编写。

在[上一篇文章](https://www.dynamsoft.com/codepool/web-barcode-reader-blazor-webassembly.html)中，我们使用[Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/)和Blazor制作了一个条码阅读器。在本文中，我们将使用[Dynamic Web TWAIN（DWT）](https://www.dynamsoft.com/web-twain/overview/)构建一个文档扫描Web应用。Dynamic Web TWAIN是一个用于文档扫描和文档管理的JavaScript库。我们可以轻松地将其集成到Blazor应用程序中。

## 使用Blazor构建文档扫描Web应用

Blazor应用有两种类别：Blazor WebAssembly和Blazor Server。

Blazor WebAssembly应用可以完全运行在客户端。C#代码文件和Razor文件会被编译成.NET程序集。
程序集和.NET运行时将下载到浏览器。

Blazor Server应用与服务器具有实时连接（[SignalR](https://docs.microsoft.com/en-us/aspnet/core/signalr/introduction?view=aspnetcore-5.0)）。服务器执行应用程序的C#代码并更新客户端的UI。

访问[Blazor 大学](https://blazor-university.com/overview/blazor-hosting-models/)了解Blazor Server和Blazor WebAssembly的优缺点。

在本文中，我们将创建一个WebAssembly版本和一个Server版本。

### 基于Blazor WebAssembly的文档扫描Web应用

1. 打开 Visual Studio，创建一个 Blazor WebAssembly 项目。记得选择.NET 5。

   ![新Blazor项目](/album/2021/Blazor/new_blazor_project.jpg)

2. 下载并安装 [Dynamic Web TWAIN](https://www.dynamsoft.com/web-twain/downloads)。将`Resources`文件夹复制到`wwwroot`文件夹。

3. 修改`Resources`文件夹中的`dynamsoft.webtwain.config.js`。设置`ProductKey`，将`Dynamsoft.DWT.AutoLoad`更改为false，因为我们要手动加载DWT。

4. 修改 `wwwroot/index.html`。

   在head中包含DWT的JavaScript文件：

   ```html
   <script src="Resources/dynamsoft.webtwain.initiate.js"></script>
   <script src="Resources/dynamsoft.webtwain.config.js"></script>
   ```

   在body添加以下JavaScript以实现与C#代码的互操作（在[此处](https://docs.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/?view=aspnetcore-5.0)了解有关JavaScript互操作的更多信息）：

   ```html
   <script type="text/javascript">
       var DWObject = null;

       function CreateDWT() {
           var height = 580;
           var width = 500;

           if (Dynamsoft.Lib.env.bMobile) {
               height = 350;
               width = 270;
           }

           Dynamsoft.DWT.CreateDWTObjectEx({
               WebTwainId: 'dwtcontrol'
           },
               function (obj) {
                   DWObject = obj;
                   DWObject.Viewer.bind(document.getElementById('dwtcontrolContainer'));
                   DWObject.Viewer.height = height;
                   DWObject.Viewer.width = width;
                   DWObject.Viewer.show();
               },
               function (err) {
                   console.log(err);
               }
           );
       }

       function Scan() {
           if (DWObject) {
               DWObject.SelectSource(function () {
                   DWObject.OpenSource();
                   DWObject.AcquireImage();
               },
                   function () {
                       console.log("SelectSource failed!");
                   }
               );
           }
       }

       function LoadImage() {
           if (DWObject) {
               DWObject.LoadImageEx('', 5,
                   function () {
                       console.log('success');
                   },
                   function (errCode, error) {
                       alert(error);
                   }
               );
           }
       }

       function Save() {
           DWObject.IfShowFileDialog = true;
           // The path is selected in the dialog, therefore we only need the file name
           DWObject.SaveAllAsPDF("Sample.pdf",
               function () {
                   console.log('Successful!');
               },
               function (errCode, errString) {
                   console.log(errString);
               }
           );
       }

       function isDesktop() {
           if (Dynamsoft.Lib.env.bMobile) {
               return false;
           } else {
               return true;
           }
       }

   </script>
   ```

5. 新建一个Razor组件`Scanner.razor`，其内容如下：

   ```cs
   @inject IJSRuntime JS
   @page "/scanner"

   <h1>Scanner</h1>

   @if (isDesktop)
   {
   <button class="btn btn-primary" @onclick="Scan">Scan</button>
   }
   <button class="btn btn-primary" @onclick="LoadImage">Load Image</button>
   <button class="btn btn-primary" @onclick="Save">Save</button>

   <div id="dwtcontrolContainer"></div>

   @code{
       private Boolean isDesktop;
       protected override async void OnInitialized()
       {
           await CreateDWT();
           isDesktop = await JS.InvokeAsync<Boolean>("isDesktop");
           StateHasChanged();
       }

       private async Task CreateDWT()
       {
           await JS.InvokeVoidAsync("CreateDWT");
       }

       private async Task Scan()
       {
           await JS.InvokeVoidAsync("Scan");
       }

       private async Task LoadImage()
       {
           await JS.InvokeVoidAsync("LoadImage");
       }

       private async Task Save()
       {
           await JS.InvokeVoidAsync("Save");
       }
   }
   ```

   将组件添加到`Index.razor`：

   ```cs
   @page "/"

   <h1>Hello, world!</h1>

   Welcome to your new app.

   <Scanner/>
   ```

6. 运行应用程序并查看结果。应用运行时，将检测对源代码所做的任何更改，并进行更新。

   ![应用](/album/2021/Blazor/app.jpg)

   应用可以从扫描仪捕获文档，也可以加载本地图像。它可以输出PDF以保存结果。

7. 我们还可以使用以下命令运行应用：

   ```
   dotnet watch run
   ```

   如果手机和服务器在同一个网络上，我们可以在手机上访问该应用程序。

   我们可能还需要修改`Properties/launchSettings.json`，这样应用不会被限制在本地网络中。

   更改此行：

   ```
   "applicationUrl": "https://localhost:5001;http://localhost:5000",
   ```

   更改为：

   ```
   "applicationUrl": "https://+:5001;http://+:5000",
   ```

   ![移动设备上](/album/2021/Blazor/mobile.jpg)

   由于移动设备不能直接控制扫描仪，不显示扫描按钮。可以使用`Dynamsoft.Lib.env.bMobile`检测设备是否是移动设备。


### 基于Blazor Server的文档扫描Web应用

创建Blazor Server服务器版本的步骤大致相同。

区别在于Server版没有`Index.html`，但存在`_Host.cshtml`。我们需要将DWT的JavaScript文件添加到此文件中。

网页需要与服务器保持连接。如果失去服务器连接，页面将无法正常工作。

![重新连接](/album/2021/Blazor/reconnecting.jpg)


## JavaScript隔离

.NET 5有一个叫做JavaScript隔离（JavaScript Isolation）的新特性。

JS隔离提供以下好处[^js_isolation]：

* 导入的JS不再污染全局命名空间。
* 库和组件的使用者不需要导入相关的JS。

PS：使用JavaScript隔离可能会导致网页在旧浏览器上无法正常工作。

让我们在刚刚创建的WebAssembly项目中使用JavaScript隔离。

1. 在`wwwroot/js`下创建一个名为`DWT.JS`的JS文件，其内容如下：


   ```js
   var DWObject = null;

   export function CreateDWT() {
       var height = 580;
       var width = 500;

       if (Dynamsoft.Lib.env.bMobile) {
           height = 350;
           width = 270;
       }

       Dynamsoft.DWT.CreateDWTObjectEx({
           WebTwainId: 'dwtcontrol'
       },
           function (obj) {
               DWObject = obj;
               DWObject.Viewer.bind(document.getElementById('dwtcontrolContainer'));
               DWObject.Viewer.height = height;
               DWObject.Viewer.width = width;
               DWObject.Viewer.show();
           },
           function (err) {
               console.log(err);
           }
       );
   }

   export function Scan() {
       if (DWObject) {
           DWObject.SelectSource(function () {
               DWObject.OpenSource();
               DWObject.AcquireImage();
           },
               function () {
                   console.log("SelectSource failed!");
               }
           );
       }
   }

   export function LoadImage() {
       if (DWObject) {
           DWObject.LoadImageEx('', 5,
               function () {
                   console.log('success');
               },
               function (errCode, error) {
                   alert(error);
               }
           );
       }
   }

   export function Save() {
       DWObject.IfShowFileDialog = true;
       // The path is selected in the dialog, therefore we only need the file name
       DWObject.SaveAllAsPDF("Sample.pdf",
           function () {
               console.log('Successful!');
           },
           function (errCode, errString) {
               console.log(errString);
           }
       );
   }

   export function isDesktop() {
       if (Dynamsoft.Lib.env.bMobile) {
           return false;
       } else {
           return true;
       }
   }
   ```

   现在可以删除我们在 `wwwroot/index.html` 中添加的 JavaScript。

2. 修改 `Scanner.razor` 以使用 JS 文件。

   ```cs
   @page "/scanner"
   @implements IAsyncDisposable
   @inject IJSRuntime JS

   <h1>Scanner</h1>

   @if (isDesktop)
   {
   <button class="btn btn-primary" @onclick="Scan">Scan</button>
   }
   <button class="btn btn-primary" @onclick="LoadImage">Load Image</button>
   <button class="btn btn-primary" @onclick="Save">Save</button>

   <div id="dwtcontrolContainer"></div>



   @code{
       private Boolean isDesktop;
       private IJSObjectReference module;
       protected override async void OnAfterRender(bool firstRender)
       {
           if (firstRender)
           {
               module = await JS.InvokeAsync<IJSObjectReference>("import", "./js/DWT.js");
               isDesktop = await IsDesktop();
               StateHasChanged();
               await CreateDWT();
           }
       }

       private async Task CreateDWT()
           {
               await module.InvokeVoidAsync("CreateDWT");
       }

       private async Task Scan()
       {
           await module.InvokeVoidAsync("Scan");
       }

       private async Task LoadImage()
       {
           await module.InvokeVoidAsync("LoadImage");
       }

       private async Task Save()
       {
           await module.InvokeVoidAsync("Save");
       }

       private async Task<Boolean> IsDesktop()
       {
           return await module.InvokeAsync<Boolean>("isDesktop");
       }

       async ValueTask IAsyncDisposable.DisposeAsync()
       {
           await module.DisposeAsync();
       }
   }
   ```


### 创建 C# 封装

我们可以更进一步，对DWT进行封装来简化使用。

1. 创建一个名为`DWT`的C#类文件。

2. 将以下代码添加到类文件：

   ```cs
   public class DWT
   {
       private IJSObjectReference module;
       [Inject]
       IJSRuntime JS { get; set; }
       private DWT()
       {
       }
       public static async Task<DWT> CreateAsync(IJSRuntime JS)
       {
           DWT dwt = new DWT();
           dwt.JS = JS;
           await dwt.LoadJSAsync();
           return dwt;
       }

       private async Task LoadJSAsync()
       {
           module = await JS.InvokeAsync<IJSObjectReference>("import", "./js/DWT.js");
       }

       public async Task CreateDWT()
       {
           await module.InvokeVoidAsync("CreateDWT");
       }

       public async Task Scan()
       {
           await module.InvokeVoidAsync("Scan");
       }

       public async Task LoadImage()
       {
           await module.InvokeVoidAsync("LoadImage");
       }

       public async Task Save()
       {
           await module.InvokeVoidAsync("Save");
       }

       public async Task<Boolean> IsDesktop()
       {
           return await module.InvokeAsync<Boolean>("isDesktop");
       }

       protected virtual async ValueTask DisposeAsync()
       {
           await module.DisposeAsync();
       }
   }
   ```

   因为构造函数不能是异步的，所以我们创建一个`CreateAsync`方法来创建实例[^async_constructor]。

3. 更新 `Scanner.razor` 以使用 `DWT` 类：

   ```cs
   @inject IJSRuntime JS
   @page "/scanner"

   <h1>Scanner</h1>

   @if (isDesktop)
   {
   <button class="btn btn-primary" @onclick="Scan">Scan</button>}
   <button class="btn btn-primary" @onclick="LoadImage">Load Image</button>
   <button class="btn btn-primary" @onclick="Save">Save</button>

   <div id="dwtcontrolContainer"></div>

   @code{
       private Boolean isDesktop;
       private DWT dwt;
       protected override async void OnAfterRender(bool firstRender)
       {
           if (firstRender)
           {
               dwt = await DWT.CreateAsync(JS);
               isDesktop = await dwt.IsDesktop();
               StateHasChanged();
               await dwt.CreateDWT();
           }
       }

       private async Task Scan()
       {
           await dwt.Scan();
       }

       private async Task LoadImage()
       {
           await dwt.LoadImage();
       }

       private async Task Save()
       {
           await dwt.Save();
       }
   }
   ```

## 源代码

<https://github.com/xulihang/BlazorTWAIN>

## 参考

[^doc]: <https://docs.microsoft.com/en-us/aspnet/core/blazor/?view=aspnetcore-5.0>
[^js_isolation]: <https://docs.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/call-javascript-from-dotnet?view=aspnetcore-5.0#javascript-isolation-in-javascript-modules>
[^async_constructor]: <https://stackoverflow.com/questions/25816064/how-can-i-await-a-task-within-a-class-constructor-timer-callback>
