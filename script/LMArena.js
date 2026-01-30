// ==UserScript==
// @name         arena
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  LMArena API - text chat only
// @author       abc
// @match        https://arena.ai/*
// @match        https://*.arena.ai/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=arena.ai
// @connect      localhost
// @connect      127.0.0.1
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const SERVER_URL = "ws://127.0.0.1:61001/ws";
    let socket;
    // 新增：用于存储正在进行的请求及其AbortController
    const activeRequests = new Map();


    function connect() {
        console.log(`[LMArena API] Connecting to ${SERVER_URL}...`);
        socket = new WebSocket(SERVER_URL);

        socket.onopen = () => {
            console.log("[LMArena API] ✅ Connected");
            document.title = "✅ " + document.title;
        };

        socket.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);

                // --- 命令处理 ---
                if (message.command) {
                    console.log(`[LMArena API] Command: ${message.command}`);
                    if (message.command === 'refresh' || message.command === 'reconnect') {
                        location.reload();
                    } else if (message.command === 'send_page_source') {
                        console.log("[LMArena API] Sending page source...");
                        sendPageSource();
                    } else if (message.command === 'cancel_request') {
                        const { request_id } = message;
                        if (request_id && activeRequests.has(request_id)) {
                            console.log(`[LMArena API] 🛑 Cancelling request ${request_id.substring(0, 8)}`);
                            activeRequests.get(request_id).abort();
                            activeRequests.delete(request_id);
                        }
                    } else if (message.command === 'upload_image') {
                        handleImageUpload(message);
                    } else if (message.command === 'update_recaptcha_token') {
                        if (message.token) {
                            window.recaptchaToken = message.token;
                            console.log("[LMArena API] recaptcha token updated from server");
                        }
                    }
                    return;
                }

                // --- 请求处理 (V2 - 纯执行代理) ---
                const { request_id, data } = message;
                if (!request_id || !data || !data.url || !data.body) {
                    console.error("[LMArena API] Invalid request message:", message);
                    return;
                }

                console.log(`[LMArena API] Executing request ${request_id.substring(0, 8)} for URL: ${data.url}`);

                const controller = new AbortController();
                activeRequests.set(request_id, controller);

                (async () => {
                    // 获取最新 reCAPTCHA token，失败则回退已有缓存
                    const freshToken = await getFreshRecaptchaToken();
                    if (freshToken) {
                        window.recaptchaToken = freshToken;
                        data.body.recaptchaV3Token = freshToken;
                        console.log(`[LMArena API] ✅ Generated new reCAPTCHA token: ${freshToken.substring(0, 10)}...`);
                    } else {
                        data.body.recaptchaV3Token = window.recaptchaToken || '';
                        console.warn("[LMArena API] ⚠️ Failed to generate new token, using cached/empty token.");
                    }

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
                                console.log(`[LMArena API] ✅ Request ${request_id.substring(0, 8)} complete`);
                                sendToServer(request_id, "[DONE]");
                                break;
                            }
                            sendToServer(request_id, decoder.decode(value));
                        }
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            console.log(`[LMArena API] Fetch aborted for request ${request_id.substring(0, 8)}`);
                        } else {
                            console.error(`[LMArena API] ❌ Error for request ${request_id.substring(0, 8)}:`, error);
                            sendToServer(request_id, { error: error.message });
                        }
                    } finally {
                        activeRequests.delete(request_id);
                    }
                })();

            } catch (error) {
                console.error("[LMArena API] General error on message:", error);
            }
        };

        socket.onclose = () => {
            console.warn("[LMArena API] Disconnected. Reconnecting in 5s...");
            if (document.title.startsWith("✅ ")) {
                document.title = document.title.substring(2);
            }
            // 取消所有正在进行的请求
            activeRequests.forEach(controller => controller.abort());
            activeRequests.clear();
            setTimeout(connect, 5000);
        };

        socket.onerror = (error) => {
            console.error("[LMArena API] Error:", error);
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
            console.error("[LMArena API] Cannot send data - not connected");
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
                        console.log("[LMArena API] Captured recaptcha token");
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
                        console.log(`[LMArena API] 📸 Captured Upload Step 1 Action ID: ${nextAction}`);
                    }
                    // Detect Step 3: [key]
                    else if (Array.isArray(body) && body.length === 1 && typeof body[0] === 'string' && !body[0].startsWith('http')) {
                        localStorage.setItem('LMArena_Action_Upload_Step3', nextAction);
                        console.log(`[LMArena API] 📸 Captured Upload Step 3 Action ID: ${nextAction}`);
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
            console.log("[LMArena API] Page source sent");
        } catch (e) {
            console.error("[LMArena API] Error sending page source:", e);
        }
    }

    // --- Image Upload Helpers ---

    async function handleImageUpload(message) {
        const { id, data, mime } = message;
        console.log(`[LMArena API] Starting image upload for ID: ${id}`);
        try {
            const blob = base64ToBlob(data, mime);
            const result = await uploadImage(blob, mime);
            sendToServer(id, result);
        } catch (error) {
            console.error(`[LMArena API] Image upload failed:`, error);
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

    // 获取最新 reCAPTCHA token（WebSocket 客户端自给自足）
    async function getFreshRecaptchaToken() {
        try {
            if (window.grecaptcha && window.grecaptcha.enterprise) {
                return await new Promise((resolve) => {
                    window.grecaptcha.enterprise.ready(async () => {
                        try {
                            const token = await window.grecaptcha.enterprise.execute(
                                '6Led_uYrAAAAAKjxDIF58fgFtX3t8loNAK85bW9I',
                                { action: 'chat_submit' }
                            );
                            resolve(token);
                        } catch (e) {
                            console.error("[LMArena API] reCAPTCHA execute failed:", e);
                            resolve(null);
                        }
                    });
                });
            }
            console.warn("[LMArena API] grecaptcha not found");
            return null;
        } catch (e) {
            console.error("[LMArena API] Error getting reCAPTCHA token:", e);
            return null;
        }
    }

    async function uploadImage(imageBlob, mimeType) {
        const filename = `upload-${Date.now()}.${mimeType.split('/')[1]}`;

        // Get dynamic IDs or fall back to hardcoded ones (which might be outdated)
        const ACTION_ID_STEP1 = localStorage.getItem('LMArena_Action_Upload_Step1') || "70cb393626e05a5f0ce7dcb46977c36c139fa85f91";
        const ACTION_ID_STEP3 = localStorage.getItem('LMArena_Action_Upload_Step3') || "6064c365792a3eaf40a60a874b327fe031ea6f22d7";

        // Step 1: Requesting upload URL
        console.log(`[LMArena API] Step 1: Requesting upload URL (Action: ${ACTION_ID_STEP1.substring(0, 6)}...)`);
        const step1Resp = await fetch("https://arena.ai/?mode=direct", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                "Next-Action": ACTION_ID_STEP1,
                "Referer": "https://arena.ai/?mode=direct"
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
        console.log("[LMArena API] Step 2: Uploading to R2");
        await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": mimeType },
            body: imageBlob
        });

        // Step 3: Get Download URL
        console.log(`[LMArena API] Step 3: Requesting signed URL (Action: ${ACTION_ID_STEP3.substring(0, 6)}...)`);
        const step3Resp = await fetch("https://arena.ai/?mode=direct", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                "Next-Action": ACTION_ID_STEP3,
                "Referer": "https://arena.ai/?mode=direct"
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
            console.log(`[LMArena API] 🔍 Attempting to extract Action IDs (attempt ${attempt})...`);

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
                            console.log(`[LMArena API] 🔍 Auto-extracted Upload Step 1 Action ID: ${id}`);
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
                            console.log(`[LMArena API] 🔍 Auto-extracted Upload Step 3 Action ID: ${id}`);
                            foundStep3 = id;
                        }
                        newStep3 = true;
                    }
                }

                if (newStep1 && newStep3) break;
            }

            // If not found and this is first attempt, retry after delay
            if ((!newStep1 || !newStep3) && attempt < 3) {
                console.log(`[LMArena API] ⏳ Retrying extraction in ${attempt * 2} seconds...`);
                setTimeout(() => extractActionIDsFromPageSource(attempt + 1), attempt * 2000);
            } else if (!foundStep1 || !foundStep3) {
                console.warn('[LMArena API] ⚠️ Could not auto-extract Action IDs. They will be captured on first manual upload.');
            } else {
                console.log('[LMArena API] ✅ Using cached Action IDs from previous session.');
            }
        } catch (e) {
            console.error('[LMArena API] Error extracting Action IDs:', e);
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
