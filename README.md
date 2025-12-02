## 📌 本工具解决什么问题?

你是否想要:
- 🎯 **免费使用** 多种顶级 AI 模型(Claude、GPT、Gemini 等)?
- 🔧 **在自己的应用中调用** 这些模型的 API?
- 💻 **集成到编程工具**(如 VS Code)实现 AI 辅助编程?
- 🌐 **在浏览器插件**(如沉浸式翻译)中使用自定义 AI 服务?

**LMArena API** 就是这样一个工具!它通过浏览器脚本连接 LMArena 平台,将其转换为兼容 OpenAI 格式的本地 API,让你可以在任何支持 OpenAI API 的客户端中使用。

---

## 🛠️ 一、环境配置

### 1.1 什么是油猴插件?为什么需要它?

**油猴(Tampermonkey)** 是一个浏览器扩展程序管理器,它允许我们在网页中运行自定义的 JavaScript 脚本。在本项目中,我们需要通过油猴脚本来:
- 📡 与 LMArena 网站进行交互
- 🔄 拦截和转发 AI 对话请求
- 🔗 建立浏览器与本地 API 服务的连接

### 1.2 安装油猴插件(以 Chrome 为例)

> **💡 提示:** 其他浏览器(Edge、Firefox 等)的安装步骤类似

#### 步骤 1: 打开浏览器扩展管理页面

在 Chrome 浏览器地址栏输入:
```
chrome://extensions/
```
或者点击浏览器右上角 **三个点 → 扩展程序 → 管理扩展程序**

![打开扩展管理](https://cdn.nlark.com/yuque/0/2025/png/21449790/1759288023089-40f777d0-afcc-43d2-b6d4-3d4ffd0f7b77.png)

#### 步骤 2: 启用开发者模式

在扩展程序页面的 **右上角**,找到并打开 **"开发者模式"** 开关。

![启用开发者模式](https://cdn.nlark.com/yuque/0/2025/png/21449790/1759288163925-9eb7d57e-ba53-4700-b6cf-913173b28d6e.png)

> **❓ 为什么需要开发者模式?**  
> 开发者模式允许我们安装未上架到 Chrome 应用商店的扩展,并提供更多调试功能。

#### 步骤 3: 下载并安装 Tampermonkey

1. 访问 [Tampermonkey 官方网站](https://www.tampermonkey.net/)
2. 点击对应浏览器的下载按钮
3. 在浏览器商店页面点击 **"添加到 Chrome"**

![Tampermonkey官网](https://cdn.nlark.com/yuque/0/2025/png/21449790/1758013654833-a56e69c5-7188-4cf2-b562-9124bd78e29d.png)

#### 步骤 4: 配置扩展权限(重要!)

安装完成后,需要给 Tampermonkey 完整的权限:

1. 在扩展程序列表中找到 **Tampermonkey**
2. 点击 **"详情"** 按钮

![点击详情](https://cdn.nlark.com/yuque/0/2025/png/21449790/1759288383734-fa0037ed-cc5e-4732-8e09-cb0aeed7f0ac.png)

3. 往下滚动,确保以下权限都已启用:
   - ✅ **允许访问文件网址**
   - ✅ **在无痕模式下启用**
   - ✅ **允许在所有网站上**

![配置权限](https://cdn.nlark.com/yuque/0/2025/png/21449790/1759288434581-25e0a021-321f-49d0-84ea-edd167de0067.png)

> **⚠️ 注意:** 如果权限未完全启用,脚本可能无法正常工作!

---

### 1.3 安装项目专用油猴脚本

现在我们要安装一个特殊的脚本,它是连接 LMArena 网站和本地 API 服务的桥梁。

#### 步骤 1: 打开 Tampermonkey 管理面板

点击浏览器工具栏中的 **Tampermonkey 图标**(通常是一个黑色方块),在弹出菜单中选择 **"管理面板"**。

![打开管理面板](https://cdn.nlark.com/yuque/0/2025/png/21449790/1758894005935-605a9cb1-74ea-4263-9897-cdc7bf11a13f.png)

#### 步骤 2: 创建新脚本

在管理面板中,点击左侧的 **"+"** 按钮,或者点击 **"添加新脚本"**(Create a new script)按钮。

![创建新脚本](https://cdn.nlark.com/yuque/0/2025/png/21449790/1758894064033-2c3f69fa-b445-439a-b00d-d99b7fa1c872.png)

#### 步骤 3: 导入脚本代码

会打开一个代码编辑器,里面有一些默认模板代码。

**操作步骤:**
1. 按 `Ctrl + A`(全选)
2. 按 `Delete`(删除原有内容)
3. 复制下面的完整代码
4. 粘贴到编辑器中

![粘贴代码](https://cdn.nlark.com/yuque/0/2025/png/21449790/1760765276092-4fcd4f37-628f-4616-b397-c3fce4b81221.png)

<details>
<summary><b>📋 点击展开完整脚本代码</b></summary>

```javascript
// ==UserScript==
// @name         LMArena
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  LMArena Proxy - text chat only
// @author       abc
// @match        https://lmarena.ai/*
// @match        https://*.lmarena.ai/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lmarena.ai
// @connect      localhost
// @connect      127.0.0.1
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const SERVER_URL = "ws://127.0.0.1:61001/ws";
    let socket;
    // 新增:用于存储正在进行的请求及其AbortController
    const activeRequests = new Map();


    function connect() {
        console.log(`[LMArena Proxy] Connecting to ${SERVER_URL}...`);
        socket = new WebSocket(SERVER_URL);

        socket.onopen = () => {
            console.log("[LMArena Proxy] ✅ Connected");
            document.title = "✅ " + document.title;
        };

        socket.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);

                // --- 命令处理 ---
                if (message.command) {
                    console.log(`[LMArena Proxy] Command: ${message.command}`);
                    if (message.command === 'refresh' || message.command === 'reconnect') {
                        location.reload();
                    } else if (message.command === 'send_page_source') {
                        console.log("[LMArena Proxy] Sending page source...");
                        sendPageSource();
                    } else if (message.command === 'cancel_request') {
                        const { request_id } = message;
                        if (request_id && activeRequests.has(request_id)) {
                            console.log(`[LMArena Proxy] 🛑 Cancelling request ${request_id.substring(0, 8)}`);
                            activeRequests.get(request_id).abort();
                            activeRequests.delete(request_id);
                        }
                    } else if (message.command === 'upload_image') {
                        handleImageUpload(message);
                    }
                    return;
                }

                // --- 请求处理 (V2 - 纯执行代理) ---
                const { request_id, data } = message;
                if (!request_id || !data || !data.url || !data.body) {
                    console.error("[LMArena Proxy] Invalid request message:", message);
                    return;
                }

                console.log(`[LMArena Proxy] Executing request ${request_id.substring(0, 8)} for URL: ${data.url}`);

                // 在发送前注入 reCAPTCHA token
                data.body.recaptchaV3Token = window.recaptchaToken || '';
                if (!data.body.recaptchaV3Token) {
                    console.warn("[LMArena Proxy] recaptchaToken not found on window. Sending with empty token.");
                }

                const controller = new AbortController();
                activeRequests.set(request_id, controller);

                try {
                    const response = await fetch(data.url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data.body),
                        credentials: 'include',
                        signal: controller.signal
                    });

                    if (!response.ok || !response.body) {
                        const errorBody = await response.text();
                        throw new Error(`Response error: ${response.status}. ${errorBody}`);
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            console.log(`[LMArena Proxy] ✅ Request ${request_id.substring(0, 8)} complete`);
                            sendToServer(request_id, "[DONE]");
                            break;
                        }
                        sendToServer(request_id, decoder.decode(value));
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log(`[LMArena Proxy] Fetch aborted for request ${request_id.substring(0, 8)}`);
                    } else {
                        console.error(`[LMArena Proxy] ❌ Error for request ${request_id.substring(0, 8)}:`, error);
                        sendToServer(request_id, { error: error.message });
                    }
                } finally {
                    activeRequests.delete(request_id);
                }

            } catch (error) {
                console.error("[LMArena Proxy] General error on message:", error);
            }
        };

        socket.onclose = () => {
            console.warn("[LMArena Proxy] Disconnected. Reconnecting in 5s...");
            if (document.title.startsWith("✅ ")) {
                document.title = document.title.substring(2);
            }
            // 取消所有正在进行的请求
            activeRequests.forEach(controller => controller.abort());
            activeRequests.clear();
            setTimeout(connect, 5000);
        };

        socket.onerror = (error) => {
            console.error("[LMArena Proxy] Error:", error);
            socket.close();
        };
    }


    function sendToServer(requestId, data) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            const message = {
                request_id: requestId,
                data: data
            };
            socket.send(JSON.stringify(message));
        } else {
            console.error("[LMArena Proxy] Cannot send data - not connected");
        }
    }

    // intercept fetch to capture session ids and recaptcha tokens
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
        const urlArg = args[0];
        let urlString = '';

        if (urlArg instanceof Request) {
            urlString = urlArg.url;
        } else if (urlArg instanceof URL) {
            urlString = urlArg.href;
        } else if (typeof urlArg === 'string') {
            urlString = urlArg;
        }

        // Capture recaptcha token from create-evaluation requests
        if (urlString && urlString.includes('/create-evaluation') && !window.isProxyRequest) {
            try {
                const options = args[1];
                if (options && options.body) {
                    const body = JSON.parse(options.body);
                    if (body.recaptchaV3Token) {
                        window.recaptchaToken = body.recaptchaV3Token;
                        console.log("[LMArena Proxy] Captured recaptcha token");
                    }
                }
            } catch (e) { }
        }

        // --- Auto-Capture Next-Action IDs (Self-Healing) ---
        if (urlString && urlString.includes('?mode=direct') && args[1] && args[1].method === 'POST') {
            try {
                const headers = args[1].headers || {};
                const nextAction = headers['Next-Action'] || headers['next-action'];
                const bodyStr = args[1].body;

                if (nextAction && bodyStr) {
                    const body = JSON.parse(bodyStr);
                    // Detect Step 1: [filename, mime]
                    if (Array.isArray(body) && body.length === 2 && typeof body[1] === 'string' && body[1].startsWith('image/')) {
                        localStorage.setItem('LMArena_Action_Upload_Step1', nextAction);
                        console.log(`[LMArena Proxy] 📸 Captured Upload Step 1 Action ID: ${nextAction}`);
                    }
                    // Detect Step 3: [key]
                    else if (Array.isArray(body) && body.length === 1 && typeof body[0] === 'string' && !body[0].startsWith('http')) {
                        localStorage.setItem('LMArena_Action_Upload_Step3', nextAction);
                        console.log(`[LMArena Proxy] 📸 Captured Upload Step 3 Action ID: ${nextAction}`);
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        return originalFetch.apply(this, args);
    };

    async function sendPageSource() {
        try {
            const htmlContent = document.documentElement.outerHTML;
            await fetch('http://localhost:61001/internal/update_available_models', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                },
                body: htmlContent
            });
            console.log("[LMArena Proxy] Page source sent");
        } catch (e) {
            console.error("[LMArena Proxy] Error sending page source:", e);
        }
    }

    // --- Image Upload Helpers ---

    async function handleImageUpload(message) {
        const { id, data, mime } = message;
        console.log(`[LMArena Proxy] Starting image upload for ID: ${id}`);
        try {
            const blob = base64ToBlob(data, mime);
            const result = await uploadImage(blob, mime);
            sendToServer(id, result);
        } catch (error) {
            console.error(`[LMArena Proxy] Image upload failed:`, error);
            sendToServer(id, { error: error.message });
        }
    }

    function base64ToBlob(base64, mime) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mime });
    }

    async function uploadImage(imageBlob, mimeType) {
        const filename = `upload-${Date.now()}.${mimeType.split('/')[1]}`;

        // Get dynamic IDs or fall back to hardcoded ones (which might be outdated)
        const ACTION_ID_STEP1 = localStorage.getItem('LMArena_Action_Upload_Step1') || "70cb393626e05a5f0ce7dcb46977c36c139fa85f91";
        const ACTION_ID_STEP3 = localStorage.getItem('LMArena_Action_Upload_Step3') || "6064c365792a3eaf40a60a874b327fe031ea6f22d7";

        // Step 1: Requesting upload URL
        console.log(`[LMArena Proxy] Step 1: Requesting upload URL (Action: ${ACTION_ID_STEP1.substring(0, 6)}...)`);
        const step1Resp = await fetch("https://lmarena.ai/?mode=direct", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                "Next-Action": ACTION_ID_STEP1,
                "Referer": "https://lmarena.ai/?mode=direct"
            },
            body: JSON.stringify([filename, mimeType])
        });

        if (step1Resp.status === 404) {
            throw new Error("Step 1 Action ID not found (404). Please manually upload an image in LMArena to update the script.");
        }

        const step1Text = await step1Resp.text();
        // Parse response format: 1:{"data":...}
        const step1Line = step1Text.split('\n').find(line => line.startsWith('1:'));
        if (!step1Line) throw new Error(`Invalid response from Step 1: ${step1Text.substring(0, 100)}`);
        const step1Json = JSON.parse(step1Line.substring(2));

        if (!step1Json.success) throw new Error("Failed to get upload URL");
        const { uploadUrl, key } = step1Json.data;

        // Step 2: Upload to R2
        console.log("[LMArena Proxy] Step 2: Uploading to R2");
        await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": mimeType },
            body: imageBlob
        });

        // Step 3: Get Download URL
        console.log(`[LMArena Proxy] Step 3: Requesting signed URL (Action: ${ACTION_ID_STEP3.substring(0, 6)}...)`);
        const step3Resp = await fetch("https://lmarena.ai/?mode=direct", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                "Next-Action": ACTION_ID_STEP3,
                "Referer": "https://lmarena.ai/?mode=direct"
            },
            body: JSON.stringify([key])
        });

        if (step3Resp.status === 404) {
            throw new Error("Step 3 Action ID not found (404). Please manually upload an image in LMArena to update the script.");
        }

        const step3Text = await step3Resp.text();
        const step3Line = step3Text.split('\n').find(line => line.startsWith('1:'));
        if (!step3Line) throw new Error(`Invalid response from Step 3: ${step3Text.substring(0, 100)}`);
        const step3Json = JSON.parse(step3Line.substring(2));

        if (!step3Json.success) throw new Error("Failed to get download URL");

        return {
            name: key,
            contentType: mimeType,
            url: step3Json.data.url
        };
    }

    // --- Auto-Extract Next-Action IDs from Page Source (No Manual Upload Needed) ---
    function extractActionIDsFromPageSource(attempt = 1) {
        try {
            console.log(`[LMArena Proxy] 🔍 Attempting to extract Action IDs (attempt ${attempt})...`);

            // Search through all script tags for the action IDs
            const scripts = document.querySelectorAll('script');
            let foundStep1 = localStorage.getItem('LMArena_Action_Upload_Step1');
            let foundStep3 = localStorage.getItem('LMArena_Action_Upload_Step3');
            let newStep1 = false, newStep3 = false;

            for (const script of scripts) {
                const content = script.textContent || '';

                // Pattern: Look for 40-character hex strings (Next.js Server Action IDs)
                const actionMatches = content.matchAll(/["']([a-f0-9]{40})["']/g);

                for (const match of actionMatches) {
                    const id = match[1];
                    const context = content.substring(Math.max(0, match.index - 200), match.index + 200).toLowerCase();

                    // Try to identify Step 1 (upload initiation)
                    if (!newStep1 && (
                        context.includes('upload') ||
                        context.includes('presign') ||
                        context.includes('putobject') ||
                        context.includes('r2') ||
                        context.includes('storage')
                    )) {
                        if (id !== foundStep1) {
                            localStorage.setItem('LMArena_Action_Upload_Step1', id);
                            console.log(`[LMArena Proxy] 🔍 Auto-extracted Upload Step 1 Action ID: ${id}`);
                            foundStep1 = id;
                        }
                        newStep1 = true;
                    }

                    // Try to identify Step 3 (get signed URL)
                    if (!newStep3 && (
                        context.includes('getobject') ||
                        context.includes('download') ||
                        context.includes('signed') ||
                        context.includes('url')
                    )) {
                        if (id !== foundStep3) {
                            localStorage.setItem('LMArena_Action_Upload_Step3', id);
                            console.log(`[LMArena Proxy] 🔍 Auto-extracted Upload Step 3 Action ID: ${id}`);
                            foundStep3 = id;
                        }
                        newStep3 = true;
                    }
                }

                if (newStep1 && newStep3) break;
            }

            // If not found and this is first attempt, retry after delay
            if ((!newStep1 || !newStep3) && attempt < 3) {
                console.log(`[LMArena Proxy] ⏳ Retrying extraction in ${attempt * 2} seconds...`);
                setTimeout(() => extractActionIDsFromPageSource(attempt + 1), attempt * 2000);
            } else if (!foundStep1 || !foundStep3) {
                console.warn('[LMArena Proxy] ⚠️ Could not auto-extract Action IDs. They will be captured on first manual upload.');
            } else {
                console.log('[LMArena Proxy] ✅ Using cached Action IDs from previous session.');
            }
        } catch (e) {
            console.error('[LMArena Proxy] Error extracting Action IDs:', e);
        }
    }

    // Run extraction with multiple strategies
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => extractActionIDsFromPageSource(1));
    } else {
        extractActionIDsFromPageSource(1);
    }

    // Also try after a delay to catch lazy-loaded scripts
    setTimeout(() => extractActionIDsFromPageSource(1), 3000);

    connect();

})();
```
</details>

#### 步骤 4: 保存脚本

点击编辑器左上角的 **"文件"** → **"保存"**,或者直接按 `Ctrl + S`。

![保存脚本](https://cdn.nlark.com/yuque/0/2025/png/21449790/1760687452785-5c297869-4541-4d78-9d99-98cda6fa34be.png)

> **✅ 成功标志:** 如果保存成功,脚本名称前会显示绿色的 ✓ 符号

#### 步骤 5: 验证脚本是否生效

现在我们来测试一下脚本是否正常工作:

1. 打开一个新标签页,访问 [https://lmarena.ai/](https://lmarena.ai/)
2. 在聊天框中输入任意内容(比如 "你好")
3. 点击发送按钮

![测试脚本](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764233907986-1cac0157-358b-4712-8e3e-7c6801593c19.png)

**如何判断脚本已经运行?**
- 按 `F12` 打开浏览器开发者工具
- 切换到 **"控制台"**(Console)标签
- 如果看到类似 `[LMArena Proxy] Connecting to ws://127.0.0.1:61001/ws...` 的日志,说明脚本已经在运行

> **⚠️ 注意:** 此时连接会失败,因为本地服务还没有启动,这是正常的!

---

## 🚀 二、服务启动与使用

### 2.1 启动本地 API 服务

#### 步骤 1: 运行服务程序

根据你的操作系统:

**Windows 用户:**
- 双击下载文件夹中的 `LMArena-api.exe` 文件

**macOS 用户:**
- 双击 `LMArena-API.app` 文件

> **🍎 macOS 用户特别注意:**  
> 
> 由于 macOS 的安全机制,首次运行可能会遇到以下问题:
> 
> **问题 1: "无法打开" 或 "已损坏" 提示**
> 1. 点击 **"取消"** 关闭提示
> 2. 打开 **系统设置** → **隐私与安全性**
> 3. 滚动到 **安全性** 部分底部
> 4. 点击 **"仍要打开"** 按钮
> 5. 在确认对话框中点击 **"打开"**
> 
> **问题 2: "无法验证开发者" 提示**
> - 这是因为应用没有经过 Apple 公证
> - 解决方法与上述相同
> 
> **为什么会这样?**  
> macOS 为了保护用户安全,默认只允许运行来自已识别开发者的应用。我们需要手动授权信任这个应用。

#### 步骤 2: 完成首次授权验证

如果是第一次运行,会弹出授权窗口。

**操作步骤:**
1. 在输入框中填写你获得的 **授权码**
2. 点击 **"验证授权"** 按钮

![授权验证](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764234021624-7690af86-06a5-4963-b7f9-ea85116c3b15.png)

**📝 如何获取授权码?**

请通过以下方式联系作者:
- **微信:** tostring1(如果扫码失败,请直接搜索微信号)
- **备用 QQ:** 854569279

<img src="https://cdn.nlark.com/yuque/0/2025/jpeg/21449790/1759328682014-7d1623af-0bc5-46d2-b2b8-a91665235130.jpeg" alt="联系方式" style="zoom:25%;" />

> **💡 提示:** 授权只需要验证一次,成功后会自动保存,下次启动不需要重新输入

---

### 2.2 启动服务并验证连接

#### 步骤 1: 启动 API 服务

在应用主界面中,点击 **"启动"** 按钮。

![服务日志](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764234127447-e07cd40c-fd69-4aac-8518-45bb31b5a1df.png)

#### 步骤 2: 查看服务日志

点击左侧菜单的 **"服务日志"** 选项,查看服务运行状态。

**✅ 成功标志:**

当你看到日志中出现 **"油猴脚本客户端已连接"** 时,说明一切配置成功!

![连接成功](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764234215501-688ea844-c040-4fda-8202-74b5de9fe282.png)

**这意味着什么?**
- ✅ 本地 API 服务已成功启动
- ✅ 浏览器中的油猴脚本已连接到服务
- ✅ LMArena 网站已打开并准备就绪
- ✅ 整个通信链路已建立

---

### 2.3 测试 API 是否可用

在正式接入其他客户端之前,我们先用内置的测试功能验证一下。

**操作步骤:**

1. 在应用中切换到 **"测试"** 页面
2. 从下拉列表中选择一个 AI 模型(如 `claude-sonnet-4`)
3. 在输入框中输入测试内容(比如 "介绍一下你自己")
4. 点击 **"发送"** 按钮

![测试功能](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764236401051-cc8cadfa-f599-4645-a53a-4cf0c7bda380.png)

**如果看到了 AI 的回复,恭喜你!** 🎉  
所有配置都已经完成,现在可以开始接入各种 AI 客户端了。

---

## 🔌 三、API 端点信息

在配置各种 AI 客户端时,你需要用到以下信息:

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **Base URL** | `http://127.0.0.1:61001` | 基础地址 |
| **API 密钥** | `123456` | 固定值,不需要修改 |
| **格式** | OpenAI 兼容 | 支持所有兼容 OpenAI 格式的客户端 |

> **📌 重要提示:**  
> - 某些客户端需要在 Base URL 后添加 `/v1`,即 `http://127.0.0.1:61001/v1`
> - 具体是否需要添加,请根据客户端的配置要求决定
> - API 密钥(`123456`)是必填项,但实际上不会被验证,填写即可

---

## 🎯 四、AI 客户端配置示例

下面介绍几个常用的 AI 客户端配置方法。

### 4.1 Cherry Studio 配置

**Cherry Studio** 是一款跨平台的 AI 对话客户端。

**配置步骤:**

1. 打开 Cherry Studio 设置
2. 添加新的 API 提供商
3. 填写配置信息:
   - **提供商类型:** OpenAI Compatible(OpenAI 兼容)
   - **API 地址:** `http://127.0.0.1:61001`
   - **API 密钥:** `123456`

![Cherry Studio 配置](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764466379702-245a2dd3-320d-4aa1-a280-d198f8e7bf60.png)

4. 保存并测试连接

![Cherry Studio 测试](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764234560775-dc916a1c-3832-4f6f-9e2d-db51f13b3bf5.png)

---

### 4.2 Roo Code - AI 编程助手(VS Code 插件)

**Roo Code** 是一个强大的 VS Code AI 编程插件,类似于 Cursor AI。

**配置步骤:**

1. 在 VS Code 中安装 **Roo Code** 插件
2. 打开插件设置
3. 选择 **Custom/自定义提供商**
4. 填写:
   - **Base URL:** `http://127.0.0.1:61001/v1`
   - **API Key:** `123456`
   - **Model:** 选择你想用的模型

![Roo Code 配置](https://cdn.nlark.com/yuque/0/2025/png/21449790/1763097509817-2d94ce58-b798-42d3-b3da-abbe025a0ee4.png)

**现在你可以:**
- 💬 与 AI 对话讨论代码问题
- ✍️ 让 AI 帮你编写代码
- 🔍 要求 AI 审查和优化代码
- 🐛 协助调试和修复 Bug

---

### 4.3 沉浸式翻译 - 自定义 AI 翻译服务

[**沉浸式翻译**](https://immersivetranslate.com/) 是一款优秀的网页翻译扩展。

**配置步骤:**

1. 安装沉浸式翻译浏览器扩展
2. 打开扩展设置
3. 在 **翻译服务** 中选择 **OpenAI**
4. 切换到 **自定义 API**
5. 填写:
   - **API URL:** `http://127.0.0.1:61001/v1/chat/completions`
   - **API Key:** `123456`
   - **模型:** 你想用的 AI 模型

![沉浸式翻译配置](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764234788903-b0759b29-176d-4930-a2e1-3d138a32da1c.png)

**现在你可以:**
- 🌐 用顶级 AI 模型翻译网页
- 📄 翻译 PDF 文档
- 📺 翻译视频字幕

---

## 💻 五、代码调用 API 接口

如果你是开发者,想在自己的程序中调用 API,下面是示例代码。

### 5.1 图生文功能(流式响应)

**适用场景:** 需要让 AI 生成图片,或者处理包含图片的对话

<details>
<summary><b>📋 Python 示例代码(点击展开)</b></summary>

```python
import requests
import json

# ============ API 配置 ============
url = "http://127.0.0.1:61001/v1/chat/completions"
API_KEY = "123456"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

# ============ 请求体 ============
payload = {
    "model": "claude-sonnet-4-20250514",  # 可以修改为你想用的模型
    "messages": [
        {
            "role": "user",
            "content": "生成一个小狗、小猫在草地奔跑的图片,并在图片中标注生成模型名称。"
        }
    ],
    "n": 1,
    "stream": True  # 开启流式响应
}

def make_api_request():
    """发起 API 请求并处理流式响应"""
    try:
        print("📤 开始发送 API 请求...")
        
        # 发起 POST 请求(流式)
        response = requests.post(
            url, 
            headers=headers, 
            json=payload, 
            stream=True,  # 重要:启用流式接收
            timeout=180
        )
        response.raise_for_status()
        
        print("📥 开始接收流式响应:")
        print("-" * 50)
        
        full_content = ""
        
        # 逐行处理流式数据
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                
                # SSE 格式:每行以 "data: " 开头
                if line_str.startswith('data:'):
                    json_str = line_str[len('data: '):].strip()
                    
                    # 检查是否为结束标志
                    if json_str == '[DONE]':
                        print("\n" + "-" * 50)
                        print("✅ 响应接收完毕")
                        break
                    
                    try:
                        data = json.loads(json_str)
                        # 提取增量内容
                        content = data.get('choices', [{}])[0].get('delta', {}).get('content', '')
                        if content:
                            full_content += content
                            print(content, end='', flush=True)  # 实时打印
                    
                    except json.JSONDecodeError:
                        continue
        
        return full_content
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ 网络错误: {e}")
        return None
    
    except Exception as e:
        print(f"\n❌ 未知错误: {e}")
        return None

# ============ 主程序 ============
if __name__ == "__main__":
    response_content = make_api_request()
    
    if response_content:
        print(f"\n\n📝 完整回复:\n{response_content}")
```

</details>

**运行效果:**

![图生文结果](https://cdn.nlark.com/yuque/0/2025/png/21449790/1758941240078-dfcb23b3-4667-4e4a-9c37-edb4880ac527.png)

**代码说明:**
- `stream: True` - 启用流式响应,可以逐字接收 AI 的回复
- `requests.post(..., stream=True)` - 保持连接以接收流式数据
- `response.iter_lines()` - 逐行读取服务器发送的数据
- 每行格式为 `data: {...}`,需要去掉前缀后解析 JSON

---

### 5.2 文本对话功能(非流式响应)

**适用场景:** 不需要实时显示回复过程,等待完整结果

<details>
<summary><b>📋 Python 示例代码(点击展开)</b></summary>

```python
import requests
import json

# ============ API 配置 ============
url = "http://127.0.0.1:61001/v1/chat/completions"
API_KEY = "123456"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

# ============ 请求体 ============
payload = {
    "model": "claude-sonnet-4-20250514",
    "messages": [
        {
            "role": "user",
            "content": "你是哪个模型?"
        }
    ],
    "n": 1
    # 注意:这里没有 stream 参数,默认为 False(非流式)
}

def make_request():
    """发起 API 请求并获取完整响应"""
    try:
        print("📤 发送请求...")
        
        # 发起 POST 请求(非流式)
        response = requests.post(
            url, 
            headers=headers, 
            json=payload, 
            timeout=180
        )
        
        # 检查 HTTP 状态码
        response.raise_for_status()
        
        print("✅ 请求成功!")
        print("-" * 50)
        
        # 直接解析完整的 JSON 响应
        response_data = response.json()
        
        # 美化打印响应
        print(json.dumps(response_data, indent=2, ensure_ascii=False))
        
        # 提取 AI 回复内容
        ai_content = response_data['choices'][0]['message']['content']
        print(f"\n💬 AI 回复:\n{ai_content}")
        
        return response_data
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络错误: {e}")
        return None
    
    except json.JSONDecodeError as e:
        print(f"❌ JSON 解析错误: {e}")
        return None
    
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        return None

# ============ 主程序 ============
if __name__ == "__main__":
    make_request()
```

</details>

**响应格式示例:**

```json
{
  "id": "chatcmpl-d1bba0bb-6bf8-4614-8905-03cf7a51e1f0",
  "object": "chat.completion",
  "created": 1758941327,
  "model": "claude-sonnet-4-20250514",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "我是 Claude Opus 4,来自 Claude 4 模型系列..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 42,
    "total_tokens": 42
  }
}
```

**字段说明:**
- `id` - 本次对话的唯一标识符
- `model` - 使用的模型名称
- `choices[0].message.content` - AI 的回复内容
- `finish_reason` - 结束原因(`stop` 表示正常完成)
- `usage` - Token 使用统计

---

## ⚡ 六、高级功能 - 并发模式

**什么是并发模式?**

默认情况下,API 服务一次只能处理一个请求。如果你需要:
- 🚀 同时发送多个请求
- 📊 提高 API 吞吐量
- 🔄 运行批量任务

那么你需要开启 **并发模式**。

### 6.1 开启并发模式

**操作步骤:**

1. 在应用设置中找到 **"并发模式"** 选项
2. 勾选启用
3. **重启服务**(非常重要!)

![开启并发模式](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764466702055-8d7bd0ca-2e62-4434-b9d7-289375e59bb3.png)

> **⚠️ 重要:**  
> 并发模式启用后,必须重启服务才会生效。否则仍然是单线程模式。

### 6.2 开启多个油猴客户端

启用并发模式后,你需要打开多个 LMArena 网页标签来提供并发能力。

**方法一: 使用浏览器无痕模式** *(简单,但不推荐)*

1. 打开一个普通标签页访问 `https://lmarena.ai/`
2. 按 `Ctrl + Shift + N`(Chrome/Edge)或 `Ctrl + Shift + P`(Firefox)打开无痕窗口
3. 在无痕窗口中再次访问 `https://lmarena.ai/`
4. 重复步骤 2-3,可以开启更多客户端

**每个新客户端都需要:**
- ✅ 同意 LMArena 使用条款
- ✅ 发送任意一条测试消息(确保会话建立)

![无痕模式](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764466921181-e877de33-48b8-4810-9175-ef12574be831.png)

![多客户端连接](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764467163170-684b76b9-54fd-4f2a-8ec8-11d590f178f4.png)

**方法二: 使用 Firefox Multi-Account Containers 插件** *(强烈推荐!)*

**为什么推荐?**
- ✅ 不需要开启多个窗口,在同一窗口用不同标签页即可
- ✅ 每个容器都有独立的 Cookie 和会话
- ✅ 可以用不同颜色标识,管理更方便
- ✅ 容器会话持久化,关闭后重开仍然保持登录

**安装步骤:**

1. 使用 **Firefox 浏览器**(这是 Firefox 专属插件)
2. 访问 [Firefox Add-ons](https://addons.mozilla.org/)
3. 搜索 **"Multi-Account Containers"**
4. 点击 **"添加到 Firefox"**

**使用方法:**

1. 安装后,浏览器右上角会出现容器图标

2. 点击图标,创建多个容器(如 "LMArena-1", "LMArena-2", "LMArena-3")

   ![](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764641870011-db60ce13-f0d7-4280-ad0b-8868d988e353.png)

3. 在每个容器中打开 `https://lmarena.ai/`

4. 每个容器都是独立的客户端

![](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764642245036-a2e8b3a2-1626-4d9f-a1d7-a6630b1c98e5.png)

**开启会话恢复**

- 勾选"**打开上次打开的窗口和标签页**"这个选项

![null](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764409927908-bdf6bc3b-8f60-4001-bd03-8acd406fb81e.png?x-oss-process=image%2Fcrop%2Cx_0%2Cy_0%2Cw_1865%2Ch_877)



**关闭浏览器的正确方式**

- **重要:** 关机前,不要一个个点击关闭标签页
- 直接点击浏览器窗口右上角的"**X**"关闭整个浏览器，或者直接关机也可以

 **重新打开浏览器**

- 下次打开火狐浏览器时,之前的所有标签页会**自动恢复**



**并发数量建议:**

- 💻 普通使用:2-3 个客户端
- 🚀 高频调用:4-6 个客户端
- ⚠️ 不建议超过 10 个(会增加被平台限流的风险)

---

## ❓ 七、常见问题与解决方案

### 问题 1: 油猴脚本显示 "连接失败"

**可能原因:**
- 本地服务未启动
- 端口被占用
- 防火墙拦截

**解决方法:**
1. ✅ 确认 `LMArena-api.exe` 正在运行
2. ✅ 检查应用日志,确认服务已启动
3. ✅ 检查防火墙设置,允许程序访问网络
4. ✅ 尝试重启服务

### 问题 2: 429 错误 - "请求次数过多"

**这是什么?**

LMArena 平台对每个会话有请求频率限制。如果短时间内发送太多请求,会触发 429 错误。

**解决方法:**

**方法 1: 清除 Cookie**
1. 在 LMArena 网页上按 `F12` 打开开发者工具
2. 切换到 **"应用"**(Application)或 **"存储"**(Storage)标签
3. 找到 **Cookies** → `https://lmarena.ai`
4. 点击 **"清除所有 Cookie"**
5. 刷新页面,重新同意用户条款

![清除 Cookie](https://cdn.nlark.com/yuque/0/2025/png/21449790/1764467544694-543f345d-6bc4-45ef-8b9f-f4f3f32bba36.png)

**方法 2: 更换客户端**

如果你启用了并发模式:
1. 关闭触发 429 错误的标签页
2. 打开新的容器或无痕窗口
3. 重新访问 LMArena

**方法 3: 等待冷却**

有时候需要等待 10-30 分钟,限制会自动解除。

### 问题 3: 模型列表为空

**可能原因:**
- 网络连接问题
- LMArena 网站更新

**解决方法:**
1. 在应用中点击 **"更新模型列表"** 按钮
2. 确认浏览器中 LMArena 页面已加载完成
3. 尝试重启服务

### 问题 4: AI 回复乱码

**可能原因:**
- 字符编码问题

**解决方法:**
1. 在客户端设置中选择 UTF-8 编码
2. 如果是自己编写代码,确保使用 `ensure_ascii=False`
3. 检查终端是否支持 UTF-8

### 问题 5: macOS 上无法启动服务

**检查项:**
1. ✅ 是否已在系统设置中授权 "仍要打开"?
2. ✅ 是否有杀毒软件拦截?
3. ✅ 尝试右键点击 → "打开",而不是双击

### 问题 6: 图片上传失败

**可能原因:**
- Action ID 过期

**解决方法:**
1. 在 LMArena 网页中手动上传一张图片
2. 油猴脚本会自动捕获新的 Action ID
3. 重新尝试 API 调用

---

## 🎓 八、使用建议与最佳实践

### ✅ 推荐做法

1. **保持浏览器标签页打开**  
   只要在使用 API,就不要关闭 LMArena 的标签页

2. **定期查看服务日志**  
   有助于及时发现问题

3. **合理设置并发数**  
   根据实际需求,不要盲目开启太多客户端

4. **使用 Firefox 容器管理多会话**  
   比无痕模式更稳定和方便

### ❌ 避免的操作

1. **不要频繁重启服务**  
   除非真的出现问题,否则让服务持续运行

2. **不要在短时间内发送大量请求**  
   容易触发 429 限流

3. **不要暴露你的 API 到公网**  
   这是本地服务,仅供个人使用

---

## 🎉 结语

恭喜你完成了所有配置!现在你已经拥有了一个功能完整的本地 AI API 服务。

**你现在可以:**
- 💬 在各种 AI 客户端中使用顶级模型
- 💻 在自己的程序中调用 AI 能力
- 🌐 在浏览器扩展中使用自定义 AI 翻译
- 🚀 通过并发模式提高处理效率

**遇到问题?**
- 📖 先查看本文档的"常见问题"部分
- 💬 联系作者寻求帮助(微信: tostring1 / QQ: 854569279)

**祝你使用愉快!** 🎊