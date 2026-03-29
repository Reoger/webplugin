# Protocol Buffer 双向转换器浏览器插件 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Chrome/Edge 浏览器扩展，支持 Protocol Buffer 数据与 JSON 格式的双向转换，提供 Schema 管理器，保护用户隐私。

**Architecture:** 单页应用（SPA）架构，使用 Vanilla JavaScript + protobuf.js，数据存储在 Chrome Storage API，纯前端实现无服务器依赖。

**Tech Stack:** Vanilla JavaScript, protobuf.js (CDN), Chrome Extension Manifest V3, Chrome Storage API, Flexbox CSS

---

## Task 1: 项目初始化和 Manifest 配置

**Files:**
- Create: `manifest.json`
- Create: `README.md`
- Create: `package.json`

**Goal:** 创建 Chrome 扩展的基础配置和项目元数据

---

### Step 1.1: 创建 manifest.json

创建 Chrome 扩展配置文件：

```json
{
  "manifest_version": 3,
  "name": "PB Converter - Protocol Buffer 双向转换器",
  "version": "1.0.0",
  "description": "支持 pb ↔ JSON 双向转换的开发工具，保护隐私，数据不上传服务器",
  "permissions": [
    "storage"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

创建文件: `manifest.json`

---

### Step 1.2: 验证 manifest.json 格式

运行命令检查 JSON 格式：

```bash
cat manifest.json | python3 -m json.tool
```

Expected: 成功输出格式化的 JSON，无错误

---

### Step 1.3: 创建 README.md

```markdown
# PB Converter - Protocol Buffer 双向转换器

Chrome/Edge 浏览器扩展，支持 Protocol Buffer 数据与 JSON 格式的双向转换。

## 功能特性

- ✅ pb → JSON: 解析 Protocol Buffer 二进制数据
- ✅ JSON → pb: 将 JSON 编码为 Protocol Buffer
- ✅ Schema 管理器: 保存和管理 .proto 定义
- ✅ 支持 Proto2 和 Proto3
- ✅ 纯本地处理，保护隐私
- ✅ 支持文件上传和手动粘贴

## 安装方法

1. 下载或克隆本仓库
2. 打开 Chrome/Edge，访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录

## 使用方法

1. 点击浏览器工具栏的插件图标
2. 选择或添加 Schema（.proto 定义）
3. 选择模式：解析模式 (pb→JSON) 或编码模式 (JSON→pb)
4. 上传文件或粘贴数据
5. 查看结果或下载生成的文件

## 隐私政策

所有数据处理完全在本地进行，不上传到任何服务器。Schema 定义和数据仅保存在用户本地浏览器中。

## 开源许可

MIT License
```

创建文件: `README.md`

---

### Step 1.4: 创建 package.json

```json
{
  "name": "pb-converter-extension",
  "version": "1.0.0",
  "description": "Protocol Buffer 双向转换器浏览器插件",
  "scripts": {
    "test": "echo \"Error: no test specified\""
  },
  "keywords": [
    "protobuf",
    "chrome-extension",
    "json",
    "converter"
  ],
  "author": "",
  "license": "MIT"
}
```

创建文件: `package.json`

---

### Step 1.5: 提交初始配置

```bash
git init
git add manifest.json README.md package.json
git commit -m "feat: initialize project with manifest and metadata"
```

---

## Task 2: UI 基础结构 - HTML 骨架

**Files:**
- Create: `popup/popup.html`

**Goal:** 创建主界面的 HTML 结构，包含模式切换、Schema 选择、数据输入和结果展示区域

---

### Step 2.1: 创建 popup.html 基础结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PB Converter</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <!-- Header with logo and mode switcher -->
    <header class="header">
      <div class="logo">
        <h1>PB Converter</h1>
      </div>
      <div class="mode-switcher">
        <button class="mode-btn active" data-mode="parse" role="tab" aria-selected="true">
          解析模式 (pb→JSON)
        </button>
        <button class="mode-btn" data-mode="encode" role="tab" aria-selected="false">
          编码模式 (JSON→pb)
        </button>
      </div>
    </header>

    <!-- Main content area -->
    <main class="main-content">
      <!-- Schema selector and manager -->
      <section class="schema-section">
        <div class="section-header">
          <label for="schema-select">选择 Schema:</label>
          <button class="btn btn-secondary btn-small" id="manage-schemas-btn">管理 Schema</button>
        </div>
        <select id="schema-select" class="select-input">
          <option value="">-- 请选择或添加 Schema --</option>
        </select>
        <div id="schema-info" class="schema-info hidden"></div>
      </section>

      <!-- Input section -->
      <section class="input-section">
        <div class="section-header">
          <h2 id="input-title">输入 pb 数据</h2>
        </div>

        <!-- File upload area -->
        <div class="file-upload-area" id="file-upload-area">
          <input type="file" id="file-input" class="file-input hidden" accept=".pb,.json">
          <div class="upload-prompt">
            <svg class="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p id="upload-text">拖拽 .pb 文件到这里，或点击选择文件</p>
            <p class="upload-hint">也支持粘贴数据</p>
          </div>
        </div>

        <!-- Text input area -->
        <div class="text-input-area">
          <textarea id="data-input" class="data-input" placeholder="粘贴 base64 编码的数据或直接粘贴 pb 二进制数据..."></textarea>
          <div class="input-info" id="input-info"></div>
        </div>
      </section>

      <!-- Action button -->
      <div class="action-section">
        <button class="btn btn-primary" id="convert-btn" disabled>解析</button>
      </div>

      <!-- Result section -->
      <section class="result-section hidden" id="result-section">
        <div class="section-header">
          <h2 id="result-title">解析结果</h2>
          <div class="result-actions">
            <button class="btn btn-secondary btn-small" id="copy-btn">复制</button>
            <button class="btn btn-secondary btn-small" id="download-btn">下载</button>
          </div>
        </div>
        <div class="result-info" id="result-info"></div>
        <pre id="result-output" class="result-output"></pre>
      </section>
    </main>

    <!-- Schema Manager Modal -->
    <div class="modal hidden" id="schema-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Schema 管理器</h2>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="schema-form">
            <input type="text" id="schema-name" class="input-field" placeholder="Schema 名称">
            <textarea id="schema-content" class="schema-content-input" placeholder="// 粘贴 .proto 文件内容..."></textarea>
            <button class="btn btn-primary" id="add-schema-btn">添加 Schema</button>
          </div>
          <div class="schema-list" id="schema-list">
            <h3>已保存的 Schema</h3>
            <div id="schema-list-items"></div>
          </div>
          <div class="schema-actions">
            <button class="btn btn-secondary" id="import-schemas-btn">导入所有 Schema</button>
            <button class="btn btn-secondary" id="export-schemas-btn">导出所有 Schema</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast notifications -->
    <div class="toast-container" id="toast-container"></div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/protobufjs@7.2.5/dist/protobuf.min.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

创建文件: `popup/popup.html`

---

### Step 2.2: 验证 HTML 结构

检查 HTML 文件是否创建成功：

```bash
ls -la popup/popup.html
```

Expected: 显示文件存在且大小合理

---

### Step 2.3: 提交 HTML 结构

```bash
git add popup/popup.html
git commit -m "feat: create HTML structure for main interface"
```

---

## Task 3: CSS 样式设计

**Files:**
- Create: `popup/popup.css`

**Goal:** 创建美观、响应式的 UI 样式，支持两种模式的视觉切换

---

### Step 3.1: 创建 popup.css 基础样式

```css
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --secondary-color: #64748b;
  --secondary-hover: #475569;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  --bg-color: #ffffff;
  --border-color: #e2e8f0;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  background-color: var(--bg-color);
  width: 600px;
  min-height: 400px;
}

.container {
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.logo h1 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
}

.mode-switcher {
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px;
  border-radius: 8px;
}

.mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.mode-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.mode-btn.active {
  background: white;
  color: var(--primary-color);
  font-weight: 600;
}

/* Main content */
.main-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Sections */
section {
  background: var(--bg-color);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-header label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

/* Schema section */
.schema-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.select-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.schema-info {
  padding: 8px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--secondary-color);
  color: white;
}

.btn-secondary:hover {
  background: var(--secondary-hover);
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

/* File upload area */
.file-upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f8fafc;
}

.file-upload-area:hover,
.file-upload-area.dragover {
  border-color: var(--primary-color);
  background: #eff6ff;
}

.upload-icon {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.upload-prompt p {
  margin: 4px 0;
  color: var(--text-primary);
}

.upload-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.file-input.hidden {
  display: none;
}

/* Text input area */
.text-input-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-input {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  resize: vertical;
}

.data-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.input-info {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Action section */
.action-section {
  display: flex;
  justify-content: center;
}

#convert-btn {
  width: 100%;
  padding: 12px;
  font-size: 14px;
}

/* Result section */
.result-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-section.hidden {
  display: none;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.result-info {
  padding: 8px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.result-output {
  background: #1e293b;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* JSON syntax highlighting */
.result-output .key {
  color: #93c5fd;
}

.result-output .string {
  color: #86efac;
}

.result-output .number {
  color: #fca5a5;
}

.result-output .boolean {
  color: #fcd34d;
}

.result-output .null {
  color: #d1d5db;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal.hidden {
  display: none;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.modal-close:hover {
  background: #f1f5f9;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Schema form */
.schema-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-field {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.schema-content-input {
  min-height: 150px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  resize: vertical;
}

/* Schema list */
.schema-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schema-list h3 {
  font-size: 14px;
  font-weight: 600;
}

#schema-list-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schema-item {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.schema-item-info {
  flex: 1;
}

.schema-item-name {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
}

.schema-item-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.schema-item-actions {
  display: flex;
  gap: 8px;
}

/* Schema actions */
.schema-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* Toast notifications */
.toast-container {
  position: fixed;
  bottom: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1001;
}

.toast {
  padding: 12px 16px;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  box-shadow: var(--shadow-md);
  animation: slideIn 0.3s ease-out;
  max-width: 300px;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast.success {
  background: var(--success-color);
}

.toast.error {
  background: var(--error-color);
}

.toast.warning {
  background: var(--warning-color);
}

/* Utility classes */
.hidden {
  display: none !important;
}
```

创建文件: `popup/popup.css`

---

### Step 3.2: 验证 CSS 文件

检查 CSS 文件：

```bash
ls -lh popup/popup.css
```

Expected: 显示文件大小合理（约 8-10KB）

---

### Step 3.3: 提交样式文件

```bash
git add popup/popup.css
git commit -m "feat: add comprehensive CSS styling"
```

---

## Task 4: Schema 管理器实现

**Files:**
- Create: `popup/popup.js` (部分)

**Goal:** 实现 Schema 的增删改查功能，使用 Chrome Storage API 持久化存储

---

### Step 4.1: 创建 popup.js 基础结构

```javascript
/**
 * PB Converter Extension - Main Logic
 * 支持 pb ↔ JSON 双向转换
 */

(function() {
  'use strict';

  // ============ State Management ============
  const state = {
    currentMode: 'parse', // 'parse' or 'encode'
    selectedSchema: null,
    schemas: [],
    inputData: '',
    inputType: null, // 'file' or 'text'
    parsedData: null
  };

  // ============ DOM Elements ============
  const elements = {};

  function initElements() {
    elements.modeButtons = document.querySelectorAll('.mode-btn');
    elements.schemaSelect = document.getElementById('schema-select');
    elements.manageSchemasBtn = document.getElementById('manage-schemas-btn');
    elements.schemaInfo = document.getElementById('schema-info');
    elements.fileUploadArea = document.getElementById('file-upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.uploadText = document.getElementById('upload-text');
    elements.dataInput = document.getElementById('data-input');
    elements.inputInfo = document.getElementById('input-info');
    elements.inputTitle = document.getElementById('input-title');
    elements.convertBtn = document.getElementById('convert-btn');
    elements.resultSection = document.getElementById('result-section');
    elements.resultTitle = document.getElementById('result-title');
    elements.resultOutput = document.getElementById('result-output');
    elements.resultInfo = document.getElementById('result-info');
    elements.copyBtn = document.getElementById('copy-btn');
    elements.downloadBtn = document.getElementById('download-btn');
    elements.schemaModal = document.getElementById('schema-modal');
    elements.modalClose = document.getElementById('modal-close');
    elements.schemaName = document.getElementById('schema-name');
    elements.schemaContent = document.getElementById('schema-content');
    elements.addSchemaBtn = document.getElementById('add-schema-btn');
    elements.schemaListItems = document.getElementById('schema-list-items');
    elements.importSchemasBtn = document.getElementById('import-schemas-btn');
    elements.exportSchemasBtn = document.getElementById('export-schemas-btn');
    elements.toastContainer = document.getElementById('toast-container');
  }

  // ============ Schema Management ============

  /**
   * Load schemas from Chrome storage
   */
  async function loadSchemas() {
    try {
      const result = await chrome.storage.local.get(['schemas']);
      state.schemas = result.schemas || [];
      updateSchemaDropdown();
      updateSchemaList();
    } catch (error) {
      console.error('Failed to load schemas:', error);
      showToast('加载 Schema 失败', 'error');
    }
  }

  /**
   * Save schemas to Chrome storage
   */
  async function saveSchemas() {
    try {
      await chrome.storage.local.set({ schemas: state.schemas });
    } catch (error) {
      console.error('Failed to save schemas:', error);
      showToast('保存 Schema 失败', 'error');
    }
  }

  /**
   * Update schema dropdown
   */
  function updateSchemaDropdown() {
    elements.schemaSelect.innerHTML = '<option value="">-- 请选择或添加 Schema --</option>';
    state.schemas.forEach(schema => {
      const option = document.createElement('option');
      option.value = schema.id;
      option.textContent = schema.name;
      elements.schemaSelect.appendChild(option);
    });
  }

  /**
   * Update schema list in modal
   */
  function updateSchemaList() {
    elements.schemaListItems.innerHTML = '';
    if (state.schemas.length === 0) {
      elements.schemaListItems.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px;">暂无保存的 Schema</p>';
      return;
    }

    state.schemas.forEach(schema => {
      const item = document.createElement('div');
      item.className = 'schema-item';
      item.innerHTML = `
        <div class="schema-item-info">
          <div class="schema-item-name">${escapeHtml(schema.name)}</div>
          <div class="schema-item-meta">创建于 ${new Date(schema.createdAt).toLocaleString('zh-CN')}</div>
        </div>
        <div class="schema-item-actions">
          <button class="btn btn-secondary btn-small edit-schema-btn" data-id="${schema.id}">编辑</button>
          <button class="btn btn-secondary btn-small delete-schema-btn" data-id="${schema.id}">删除</button>
        </div>
      `;
      elements.schemaListItems.appendChild(item);
    });

    // Add event listeners
    document.querySelectorAll('.edit-schema-btn').forEach(btn => {
      btn.addEventListener('click', () => editSchema(btn.dataset.id));
    });
    document.querySelectorAll('.delete-schema-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteSchema(btn.dataset.id));
    });
  }

  /**
   * Add a new schema
   */
  async function addSchema() {
    const name = elements.schemaName.value.trim();
    const content = elements.schemaContent.value.trim();

    if (!name || !content) {
      showToast('请填写 Schema 名称和内容', 'warning');
      return;
    }

    // Validate proto syntax
    try {
      protobuf.parse(content);
    } catch (error) {
      showToast(`Proto 语法错误: ${error.message}`, 'error');
      return;
    }

    const schema = {
      id: generateUUID(),
      name,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.schemas.push(schema);
    await saveSchemas();
    updateSchemaDropdown();
    updateSchemaList();

    // Clear form
    elements.schemaName.value = '';
    elements.schemaContent.value = '';

    showToast('Schema 添加成功', 'success');
  }

  /**
   * Edit an existing schema
   */
  function editSchema(id) {
    const schema = state.schemas.find(s => s.id === id);
    if (!schema) return;

    elements.schemaName.value = schema.name;
    elements.schemaContent.value = schema.content;

    // Remove the old schema, will be re-added when saved
    state.schemas = state.schemas.filter(s => s.id !== id);
    updateSchemaList();
  }

  /**
   * Delete a schema
   */
  async function deleteSchema(id) {
    if (!confirm('确定要删除这个 Schema 吗？')) return;

    state.schemas = state.schemas.filter(s => s.id !== id);
    await saveSchemas();
    updateSchemaDropdown();
    updateSchemaList();

    // Clear selected schema if it was deleted
    if (state.selectedSchema && state.selectedSchema.id === id) {
      state.selectedSchema = null;
      elements.schemaSelect.value = '';
      elements.schemaInfo.classList.add('hidden');
    }

    showToast('Schema 已删除', 'success');
  }

  /**
   * Export all schemas
   */
  function exportSchemas() {
    const data = JSON.stringify(state.schemas, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `pb-converter-schemas-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Schema 导出成功', 'success');
  }

  /**
   * Import schemas
   */
  function importSchemas() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedSchemas = JSON.parse(text);

        if (!Array.isArray(importedSchemas)) {
          throw new Error('Invalid format: expected array');
        }

        // Validate each schema
        for (const schema of importedSchemas) {
          if (!schema.name || !schema.content) {
            throw new Error('Invalid schema: missing name or content');
          }
          protobuf.parse(schema.content);
        }

        // Add schemas
        let importedCount = 0;
        for (const schema of importedSchemas) {
          // Check for duplicate names
          const exists = state.schemas.some(s => s.name === schema.name);
          if (!exists) {
            state.schemas.push({
              id: generateUUID(),
              name: schema.name,
              content: schema.content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            importedCount++;
          }
        }

        await saveSchemas();
        updateSchemaDropdown();
        updateSchemaList();

        showToast(`成功导入 ${importedCount} 个 Schema`, 'success');
      } catch (error) {
        console.error('Import failed:', error);
        showToast(`导入失败: ${error.message}`, 'error');
      }
    };

    input.click();
  }

  // ============ Utility Functions ============

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // ============ Initialization ============

  function init() {
    initElements();
    loadSchemas();

    // Event listeners will be added in next tasks
  }

  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
```

创建文件: `popup/popup.js`

---

### Step 4.2: 添加 Schema 管理事件监听器

在 `init()` 函数之前添加：

```javascript
  /**
   * Setup schema management event listeners
   */
  function setupSchemaEventListeners() {
    // Schema selection
    elements.schemaSelect.addEventListener('change', async (e) => {
      const schemaId = e.target.value;
      if (!schemaId) {
        state.selectedSchema = null;
        elements.schemaInfo.classList.add('hidden');
        elements.convertBtn.disabled = !state.inputData;
        return;
      }

      const schema = state.schemas.find(s => s.id === schemaId);
      if (!schema) return;

      try {
        const root = protobuf.parse(schema.content);
        const messageTypes = root.root.nested;
        const typeNames = Object.keys(messageTypes || {}).join(', ');

        state.selectedSchema = {
          id: schema.id,
          name: schema.name,
          content: schema.content,
          root: root.root
        };

        elements.schemaInfo.innerHTML = `
          <strong>${escapeHtml(schema.name)}</strong><br>
          消息类型: ${typeNames || '无'}
        `;
        elements.schemaInfo.classList.remove('hidden');
        elements.convertBtn.disabled = !state.inputData;
      } catch (error) {
        showToast(`Schema 解析失败: ${error.message}`, 'error');
        state.selectedSchema = null;
        elements.schemaInfo.classList.add('hidden');
      }
    });

    // Manage schemas button
    elements.manageSchemasBtn.addEventListener('click', () => {
      elements.schemaModal.classList.remove('hidden');
      updateSchemaList();
    });

    // Modal close
    elements.modalClose.addEventListener('click', () => {
      elements.schemaModal.classList.add('hidden');
    });

    // Close modal on outside click
    elements.schemaModal.addEventListener('click', (e) => {
      if (e.target === elements.schemaModal) {
        elements.schemaModal.classList.add('hidden');
      }
    });

    // Add schema button
    elements.addSchemaBtn.addEventListener('click', addSchema);

    // Import/Export schemas
    elements.importSchemasBtn.addEventListener('click', importSchemas);
    elements.exportSchemasBtn.addEventListener('click', exportSchemas);
  }
```

然后更新 `init()` 函数：

```javascript
  function init() {
    initElements();
    setupSchemaEventListeners();
    loadSchemas();
  }
```

在 popup.js 中的 `init()` 之前插入 `setupSchemaEventListeners()` 函数。

---

### Step 4.3: 测试 Schema 管理功能

1. 在浏览器中加载扩展
2. 打开 popup
3. 点击"管理 Schema"
4. 添加测试 schema：

```protobuf
syntax = "proto3";

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
}
```

Expected: Modal 打开，可以添加 schema，schema 出现在列表中

---

### Step 4.4: 提交 Schema 管理功能

```bash
git add popup/popup.js
git commit -m "feat: implement schema manager with CRUD operations"
```

---

## Task 5: 模式切换和 UI 交互

**Files:**
- Modify: `popup/popup.js`

**Goal:** 实现解析/编码模式切换，更新 UI 文本和输入提示

---

### Step 5.1: 添加模式切换函数

在 popup.js 中添加：

```javascript
  /**
   * Switch between parse and encode modes
   */
  function switchMode(mode) {
    state.currentMode = mode;

    // Update mode buttons
    elements.modeButtons.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    // Update UI based on mode
    if (mode === 'parse') {
      elements.inputTitle.textContent = '输入 pb 数据';
      elements.uploadText.textContent = '拖拽 .pb 文件到这里，或点击选择文件';
      elements.fileInput.accept = '.pb';
      elements.dataInput.placeholder = '粘贴 base64 编码的数据或直接粘贴 pb 二进制数据...';
      elements.convertBtn.textContent = '解析';
      elements.resultTitle.textContent = '解析结果';
    } else {
      elements.inputTitle.textContent = '输入 JSON 数据';
      elements.uploadText.textContent = '拖拽 .json 文件到这里，或点击选择文件';
      elements.fileInput.accept = '.json';
      elements.dataInput.placeholder = '粘贴 JSON 数据...';
      elements.convertBtn.textContent = '编码';
      elements.resultTitle.textContent = '编码结果';
    }

    // Clear previous results
    elements.resultSection.classList.add('hidden');
    elements.resultOutput.textContent = '';
    elements.resultInfo.textContent = '';
  }

  /**
   * Setup mode switching event listeners
   */
  function setupModeEventListeners() {
    elements.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        switchMode(btn.dataset.mode);
      });
    });
  }
```

---

### Step 5.2: 更新 init() 函数

```javascript
  function init() {
    initElements();
    setupSchemaEventListeners();
    setupModeEventListeners();
    loadSchemas();
    switchMode('parse'); // Default mode
  }
```

---

### Step 5.3: 测试模式切换

1. 重新加载扩展
2. 打开 popup
3. 点击模式切换按钮

Expected: UI 文本和输入提示相应更新

---

### Step 5.4: 提交模式切换功能

```bash
git add popup/popup.js
git commit -m "feat: implement mode switching between parse and encode"
```

---

## Task 6: 文件上传和数据输入

**Files:**
- Modify: `popup/popup.js`

**Goal:** 实现文件上传（拖拽和点击选择）和文本输入处理

---

### Step 6.1: 添加文件上传处理函数

```javascript
  /**
   * Handle file upload
   */
  async function handleFileUpload(file) {
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast('文件过大，请上传小于 10MB 的文件', 'error');
      return;
    }

    try {
      const data = await file.arrayBuffer();
      state.inputData = data;
      state.inputType = 'file';

      // Update UI
      elements.inputInfo.innerHTML = `
        文件: ${escapeHtml(file.name)}<br>
        大小: ${formatBytes(file.size)}
      `;
      elements.convertBtn.disabled = !state.selectedSchema;
    } catch (error) {
      console.error('File upload failed:', error);
      showToast('文件读取失败', 'error');
    }
  }

  /**
   * Handle text input
   */
  function handleTextInput(text) {
    state.inputData = text;
    state.inputType = 'text';

    if (text) {
      const size = new Blob([text]).size;
      elements.inputInfo.textContent = `文本大小: ${formatBytes(size)}`;
    } else {
      elements.inputInfo.textContent = '';
    }

    elements.convertBtn.disabled = !state.selectedSchema || !text;
  }

  /**
   * Format bytes to human readable
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Setup file upload event listeners
   */
  function setupFileUploadListeners() {
    // Click to upload
    elements.fileUploadArea.addEventListener('click', () => {
      elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleFileUpload(file);
      }
    });

    // Drag and drop
    elements.fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.fileUploadArea.classList.add('dragover');
    });

    elements.fileUploadArea.addEventListener('dragleave', () => {
      elements.fileUploadArea.classList.remove('dragover');
    });

    elements.fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.fileUploadArea.classList.remove('dragover');

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    });

    // Text input
    elements.dataInput.addEventListener('input', (e) => {
      handleTextInput(e.target.value);
    });
  }
```

---

### Step 6.2: 更新 init() 函数

```javascript
  function init() {
    initElements();
    setupSchemaEventListeners();
    setupModeEventListeners();
    setupFileUploadListeners();
    loadSchemas();
    switchMode('parse');
  }
```

---

### Step 6.3: 测试文件上传

1. 使用测试用例 1 的 test1-user.pb 文件
2. 拖拽文件到上传区域
3. 检查文件信息显示

Expected: 文件信息正确显示，转换按钮启用（当选择 schema 后）

---

### Step 6.4: 提交文件上传功能

```bash
git add popup/popup.js
git commit -m "feat: implement file upload and text input handling"
```

---

## Task 7: pb → JSON 解析功能

**Files:**
- Modify: `popup/popup.js`

**Goal:** 实现将 pb 二进制数据解析为 JSON

---

### Step 7.1: 添加解析函数

```javascript
  /**
   * Parse protobuf binary data to JSON
   */
  async function parseProtoToJson(data) {
    if (!state.selectedSchema) {
      throw new Error('请先选择 Schema');
    }

    try {
      let buffer;

      // Handle different input types
      if (state.inputType === 'file') {
        buffer = new Uint8Array(data);
      } else {
        // Text input - try base64 first
        const text = data.trim();
        try {
          const binaryString = atob(text);
          buffer = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            buffer[i] = binaryString.charCodeAt(i);
          }
        } catch (e) {
          // Not base64, try direct binary
          buffer = new TextEncoder().encode(text);
        }
      }

      // Get all message types from schema
      const messageTypes = state.selectedSchema.root.nested;
      if (!messageTypes || Object.keys(messageTypes).length === 0) {
        throw new Error('Schema 中没有定义消息类型');
      }

      // Try each message type until one works
      let decoded = null;
      let usedType = null;

      for (const [typeName, type] of Object.entries(messageTypes)) {
        try {
          decoded = type.decode(buffer);
          usedType = typeName;
          break;
        } catch (e) {
          // Try next type
          continue;
        }
      }

      if (!decoded) {
        throw new Error('无法使用 Schema 中的任何消息类型解析数据');
      }

      // Convert to plain object
      const json = type.toObject(decoded, {
        longs: String,
        enums: String,
        bytes: String,
      });

      return {
        success: true,
        messageType: usedType,
        data: json
      };
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error(`解析失败: ${error.message}`);
    }
  }

  /**
   * Display JSON result with syntax highlighting
   */
  function displayJsonResult(data, messageType) {
    const json = JSON.stringify(data, null, 2);

    elements.resultInfo.innerHTML = `
      消息类型: <strong>${escapeHtml(messageType)}</strong><br>
      数据大小: ${formatBytes(new Blob([json]).size)}
    `;

    // Simple syntax highlighting
    const highlighted = highlightJson(json);
    elements.resultOutput.innerHTML = highlighted;
    elements.resultSection.classList.remove('hidden');

    state.parsedData = data;
  }

  /**
   * Simple JSON syntax highlighting
   */
  function highlightJson(json) {
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
        } else {
          cls = 'string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
  }
```

---

### Step 7.2: 添加转换按钮处理

```javascript
  /**
   * Setup conversion event listeners
   */
  function setupConversionListeners() {
    elements.convertBtn.addEventListener('click', async () => {
      if (!state.selectedSchema) {
        showToast('请先选择 Schema', 'warning');
        return;
      }

      if (!state.inputData) {
        showToast('请输入或上传数据', 'warning');
        return;
      }

      elements.convertBtn.disabled = true;
      elements.convertBtn.textContent = '处理中...';

      try {
        let result;

        if (state.currentMode === 'parse') {
          result = await parseProtoToJson(state.inputData);
          displayJsonResult(result.data, result.messageType);
          showToast('解析成功', 'success');
        } else {
          // Encode mode - will be implemented in next task
          result = await encodeJsonToProto(state.inputData);
          displayEncodeResult(result);
          showToast('编码成功', 'success');
        }
      } catch (error) {
        console.error('Conversion error:', error);
        showToast(error.message, 'error');
        elements.resultSection.classList.add('hidden');
      } finally {
        elements.convertBtn.disabled = false;
        elements.convertBtn.textContent = state.currentMode === 'parse' ? '解析' : '编码';
      }
    });

    // Copy button
    elements.copyBtn.addEventListener('click', () => {
      const text = elements.resultOutput.textContent;
      navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板', 'success');
      }).catch(() => {
        showToast('复制失败', 'error');
      });
    });

    // Download button
    elements.downloadBtn.addEventListener('click', () => {
      const blob = new Blob([elements.resultOutput.textContent], {
        type: state.currentMode === 'parse' ? 'application/json' : 'application/octet-stream'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pb-converter-${state.currentMode}-${Date.now()}${state.currentMode === 'parse' ? '.json' : '.pb'}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('下载已开始', 'success');
    });
  }
```

---

### Step 7.3: 更新 init() 函数

```javascript
  function init() {
    initElements();
    setupSchemaEventListeners();
    setupModeEventListeners();
    setupFileUploadListeners();
    setupConversionListeners();
    loadSchemas();
    switchMode('parse');
  }
```

---

### Step 7.4: 测试 pb → JSON 解析

1. 添加 test1-proto3-simple.proto schema
2. 上传 test1-user.pb 文件
3. 点击"解析"按钮

Expected: JSON 结果正确显示，包含 id、name、email、isActive 字段

---

### Step 7.5: 提交解析功能

```bash
git add popup/popup.js
git commit -m "feat: implement protobuf to JSON parsing"
```

---

## Task 8: JSON → pb 编码功能

**Files:**
- Modify: `popup/popup.js`

**Goal:** 实现将 JSON 数据编码为 pb 二进制格式

---

### Step 8.1: 添加编码函数

```javascript
  /**
   * Encode JSON to protobuf binary data
   */
  async function encodeJsonToProto(data) {
    if (!state.selectedSchema) {
      throw new Error('请先选择 Schema');
    }

    try {
      let jsonData;

      // Handle different input types
      if (state.inputType === 'file') {
        const text = new TextDecoder().decode(data);
        jsonData = JSON.parse(text);
      } else {
        jsonData = JSON.parse(data.trim());
      }

      // Get message types from schema
      const messageTypes = state.selectedSchema.root.nested;
      if (!messageTypes || Object.keys(messageTypes).length === 0) {
        throw new Error('Schema 中没有定义消息类型');
      }

      // Try to validate and encode with each message type
      let buffer = null;
      let usedType = null;
      let validationErrors = [];

      for (const [typeName, type] of Object.entries(messageTypes)) {
        try {
          // Create message instance
          const message = type.create(jsonData);
          buffer = type.encode(message).finish();
          usedType = typeName;

          // Verify by decoding back
          const decoded = type.decode(buffer);
          const verified = type.verify(decoded);
          if (verified) {
            validationErrors.push(`${typeName}: ${verified}`);
            buffer = null;
            continue;
          }

          break;
        } catch (e) {
          validationErrors.push(`${typeName}: ${e.message}`);
          continue;
        }
      }

      if (!buffer) {
        throw new Error(`无法编码数据:\n${validationErrors.join('\n')}`);
      }

      return {
        success: true,
        messageType: usedType,
        buffer: buffer,
        base64: btoa(String.fromCharCode.apply(null, buffer))
      };
    } catch (error) {
      console.error('Encode error:', error);
      throw new Error(`编码失败: ${error.message}`);
    }
  }

  /**
   * Display encode result
   */
  function displayEncodeResult(result) {
    elements.resultInfo.innerHTML = `
      消息类型: <strong>${escapeHtml(result.messageType)}</strong><br>
      二进制大小: ${formatBytes(result.buffer.length)}
    `;

    const displayData = {
      messageType: result.messageType,
      sizeBytes: result.buffer.length,
      base64: result.base64
    };

    const json = JSON.stringify(displayData, null, 2);
    const highlighted = highlightJson(json);
    elements.resultOutput.innerHTML = highlighted;
    elements.resultSection.classList.remove('hidden');

    state.parsedData = result.buffer;
  }
```

---

### Step 8.2: 更新下载按钮处理

修改 downloadBtn 的点击处理以支持两种模式：

```javascript
    elements.downloadBtn.addEventListener('click', () => {
      if (state.currentMode === 'parse') {
        const text = elements.resultOutput.textContent;
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pb-converter-json-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Encode mode - download binary
        const blob = new Blob([state.parsedData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pb-converter-pb-${Date.now()}.pb`;
        a.click();
        URL.revokeObjectURL(url);
      }
      showToast('下载已开始', 'success');
    });
```

需要在 setupConversionListeners 中更新这部分代码。

---

### Step 8.3: 测试 JSON → pb 编码

1. 切换到"编码模式"
2. 使用 test1-user.json 的内容：
```json
{
  "id": 12345,
  "name": "张三",
  "email": "zhangsan@example.com",
  "isActive": true
}
```
3. 点击"编码"按钮
4. 下载生成的 .pb 文件

Expected: 编码成功，生成的 .pb 文件可以反向解析

---

### Step 8.4: 提交编码功能

```bash
git add popup/popup.js
git commit -m "feat: implement JSON to protobuf encoding"
```

---

## Task 9: 错误处理和验证

**Files:**
- Modify: `popup/popup.js`

**Goal:** 完善错误处理，添加输入验证

---

### Step 9.1: 添加 JSON 验证函数

```javascript
  /**
   * Validate JSON input
   */
  function validateJsonInput(text) {
    if (!text || !text.trim()) {
      return { valid: false, error: '请输入 JSON 数据' };
    }

    try {
      const json = JSON.parse(text);
      return { valid: true, data: json };
    } catch (error) {
      const match = error.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1]) : null;

      if (position !== null) {
        const lines = text.substring(0, position).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        return {
          valid: false,
          error: `JSON 语法错误 (行 ${line}, 列 ${column}): ${error.message}`
        };
      }

      return { valid: false, error: `JSON 语法错误: ${error.message}` };
    }
  }

  /**
   * Validate schema fields
   */
  function validateSchemaFields(jsonData, messageType) {
    const type = state.selectedSchema.root.nested[messageType];
    if (!type) {
      return { valid: true }; // Can't validate without type info
    }

    const fields = type.fields;
    const errors = [];

    for (const fieldName in jsonData) {
      if (!fields[fieldName]) {
        errors.push(`字段 '${fieldName}' 不在 Schema 中定义`);
        continue;
      }

      const field = fields[fieldName];
      const value = jsonData[fieldName];
      const fieldType = field.type;

      // Type validation
      if (fieldType === 'string' && typeof value !== 'string') {
        errors.push(`字段 '${fieldName}' 类型错误: 期望 string, 实际 ${typeof value}`);
      } else if (fieldType === 'int32' || fieldType === 'int64') {
        if (typeof value !== 'number') {
          errors.push(`字段 '${fieldName}' 类型错误: 期望 number, 实际 ${typeof value}`);
        }
      } else if (fieldType === 'bool' && typeof value !== 'boolean') {
        errors.push(`字段 '${fieldName}' 类型错误: 期望 boolean, 实际 ${typeof value}`);
      }
    }

    // Check for required fields (proto2)
    if (state.selectedSchema.content.includes('syntax = "proto2"')) {
      for (const fieldName in fields) {
        const field = fields[fieldName];
        if (field.rule === 'required' && !(fieldName in jsonData)) {
          errors.push(`缺少必填字段 '${fieldName}'`);
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors: errors };
    }

    return { valid: true };
  }
```

---

### Step 9.2: 在编码模式中添加实时验证

修改 handleTextInput 函数：

```javascript
  function handleTextInput(text) {
    state.inputData = text;
    state.inputType = 'text';

    if (text) {
      const size = new Blob([text]).size;
      elements.inputInfo.textContent = `文本大小: ${formatBytes(size)}`;

      // Validate JSON in encode mode
      if (state.currentMode === 'encode') {
        const validation = validateJsonInput(text);
        if (!validation.valid) {
          elements.inputInfo.textContent = `❌ ${validation.error}`;
          elements.inputInfo.style.color = 'var(--error-color)';
          elements.convertBtn.disabled = true;
          return;
        }

        // Validate against schema if selected
        if (state.selectedSchema) {
          const messageTypes = state.selectedSchema.root.nested;
          const firstType = Object.keys(messageTypes)[0];
          if (firstType) {
            const schemaValidation = validateSchemaFields(validation.data, firstType);
            if (!schemaValidation.valid) {
              elements.inputInfo.textContent = `❌ ${schemaValidation.errors.join('; ')}`;
              elements.inputInfo.style.color = 'var(--error-color)';
              elements.convertBtn.disabled = true;
              return;
            }
          }
        }

        elements.inputInfo.style.color = 'var(--success-color)';
        elements.inputInfo.textContent = `✓ JSON 格式正确 (${formatBytes(size)})`;
      }
    } else {
      elements.inputInfo.textContent = '';
      elements.inputInfo.style.color = '';
    }

    elements.convertBtn.disabled = !state.selectedSchema || !text;
  }
```

---

### Step 9.3: 改进错误消息

更新 encodeJsonToProto 函数中的错误处理：

```javascript
      // Add field-level validation
      if (state.selectedSchema) {
        const messageTypes = state.selectedSchema.root.nested;
        const firstType = Object.keys(messageTypes)[0];
        if (firstType) {
          const validation = validateSchemaFields(jsonData, firstType);
          if (!validation.valid) {
            throw new Error(`字段验证失败:\n${validation.errors.join('\n')}`);
          }
        }
      }
```

在 try 块的开始处添加这段代码。

---

### Step 9.4: 测试错误处理

测试场景：
1. 无效的 JSON 格式
2. Schema 中不存在的字段
3. 错误的字段类型
4. 缺少必填字段（使用 proto2 schema）

Expected: 清晰的错误消息显示在输入信息区域

---

### Step 9.5: 提交错误处理

```bash
git add popup/popup.js
git commit -m "feat: add comprehensive error handling and validation"
```

---

## Task 10: 创建图标和优化 UI

**Files:**
- Create: `icons/icon16.png`
- Create: `icons/icon48.png`
- Create: `icons/icon128.png`

**Goal:** 创建扩展图标

---

### Step 10.1: 使用 SVG 创建图标

创建简单的 SVG 图标（使用在线工具或手动创建），建议图标设计：
- 主色：蓝色/紫色渐变
- 图标：包含 "PB" 文字或二进制数据符号
- 背景：圆角正方形

由于我们无法直接创建 PNG 文件，可以：
1. 使用在线工具（如 favicon.io, canva.com）
2. 或暂时使用占位符图标

创建占位符说明文件：

```bash
mkdir -p icons
cat > icons/README.md << 'EOF'
# 图标文件

请使用以下工具创建图标：

- 推荐尺寸: 16x16, 48x48, 128x128 (PNG 格式)
- 推荐颜色: 蓝紫渐变 (#667eea → #764ba2)
- 图标内容: "PB" 文字或二进制/转换符号

在线工具:
- https://www.favicon.cc/
- https://www.canva.com/
- https://favicon.io/

创建后，将文件保存为:
- icon16.png
- icon48.png
- icon128.png
EOF
```

---

### Step 10.2: 创建临时图标（可选）

如果需要快速测试，可以下载开源图标或使用 emoji：

创建临时 HTML 文件生成图标：

```html
<!DOCTYPE html>
<html>
<head><title>Generate Icon</title></head>
<body>
<canvas id="c" width="128" height="128"></canvas>
<script>
const ctx = document.getElementById('c').getContext('2d');
// Gradient background
const grd = ctx.createLinearGradient(0, 0, 128, 128);
grd.addColorStop(0, "#667eea");
grd.addColorStop(1, "#764ba2");
ctx.fillStyle = grd;
ctx.fillRect(0, 0, 128, 128);
// Add "PB" text
ctx.fillStyle = "white";
ctx.font = "bold 48px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("PB", 64, 64);
// Download
const a = document.createElement('a');
a.download = 'icon128.png';
a.href = c.toDataURL();
a.click();
</script>
</body>
</html>
```

---

### Step 10.3: 添加图标说明

```bash
git add icons/README.md
git commit -m "docs: add icon creation instructions"
```

---

## Task 11: 测试和验证

**Files:**
- Test: 使用所有测试用例

**Goal:** 使用测试用例验证所有功能

---

### Step 11.1: 测试用例 1 - 简单 Proto3

```bash
# 1. 添加 Schema
cat test-cases/schemas/test1-proto3-simple.proto

# 2. 测试解析
# 上传 test-cases/pb-files/test1-user.pb
# 预期: 显示 JSON

# 3. 测试编码
# 切换到编码模式
# 粘贴 test-cases/pb-files/test1-user.json 内容
# 预期: 生成 .pb 文件
```

Expected: 所有操作成功，JSON 结果正确

---

### Step 11.2: 测试用例 2 - 嵌套消息

```bash
# 添加 test2-nested.proto
# 测试 test2-person.pb 解析
# 验证嵌套结构正确显示
```

Expected: 嵌套的 address 对象和 phoneNumbers 数组正确显示

---

### Step 11.3: 测试用例 3 - Proto2

```bash
# 添加 test3-proto2.proto
# 测试 test3-product.pb 解析
# 验证 Proto2 格式支持
```

Expected: Proto2 格式正确解析

---

### Step 11.4: 测试用例 4 - 复杂类型

```bash
# 添加 test4-complex.proto
# 测试 test4-order.pb 解析
# 验证 enum, map, oneof 支持
```

Expected: 复杂类型正确显示

---

### Step 11.5: 测试用例 5 - 边界情况

```bash
# 添加 test5-edge-cases.proto
# 测试 test5-edge-cases.pb 解析
# 验证大数值、Unicode、二进制数据
```

Expected: 边界情况正确处理

---

### Step 11.6: 错误测试

测试场景：
1. 空输入
2. 损坏的 pb 数据
3. 错误的 JSON 格式
4. 不匹配的 Schema
5. 超大文件（> 10MB）

Expected: 清晰的错误消息

---

### Step 11.7: 提交测试文档

```bash
cat > TESTING.md << 'EOF'
# 测试文档

## 测试用例位置
所有测试文件位于 `test-cases/` 目录。

## 测试步骤

### 1. 基础功能测试
- [ ] 添加 Schema
- [ ] 删除 Schema
- [ ] 编辑 Schema
- [ ] 导入/导出 Schema

### 2. pb → JSON 解析测试
- [ ] 测试用例 1: 简单 Proto3
- [ ] 测试用例 2: 嵌套消息
- [ ] 测试用例 3: Proto2 格式
- [ ] 测试用例 4: 复杂类型
- [ ] 测试用例 5: 边界情况

### 3. JSON → pb 编码测试
- [ ] 测试用例 1: 简单 Proto3
- [ ] 测试用例 2: 嵌套消息
- [ ] 测试用例 3: Proto2 格式
- [ ] 测试用例 4: 复杂类型
- [ ] 测试用例 5: 边界情况

### 4. 错误处理测试
- [ ] 空输入
- [ ] 损坏的 pb 数据
- [ ] 错误的 JSON 格式
- [ ] 不匹配的 Schema
- [ ] 超大文件

### 5. UI 测试
- [ ] 模式切换
- [ ] 文件拖拽上传
- [ ] 文本输入
- [ ] 结果复制
- [ ] 结果下载

## 已知问题
记录测试中发现的问题。
EOF

git add TESTING.md
git commit -m "docs: add testing documentation"
```

---

## Task 12: 最终优化和打包

**Files:**
- Update: `README.md`
- Update: `manifest.json` (版本号)

**Goal:** 最终优化和准备发布

---

### Step 12.1: 更新 README

更新 README.md 添加完整的文档和截图说明。

---

### Step 12.2: 创建 Chrome 商店素材

准备：
1. 图标（16, 48, 128）
2. 截图（1280x800 或 640x400）
3. 商店描述
4. 隐私政策页面

---

### Step 12.3: 打包扩展

```bash
# 创建打包脚本
cat > build.sh << 'EOF'
#!/bin/bash
VERSION=$(grep version manifest.json | head -1 | awk -F'"' '{print $4}')
ZIP_FILE="pb-converter-extension-v${VERSION}.zip"

echo "Building PB Converter Extension v${VERSION}..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
mkdir -p "$TEMP_DIR"

# Copy files
cp manifest.json "$TEMP_DIR/"
cp -r popup "$TEMP_DIR/"
cp -r lib "$TEMP_DIR/"
cp -r icons "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"
cp LICENSE "$TEMP_DIR/" 2>/dev/null || true

# Create zip
cd "$TEMP_DIR"
zip -r "${OLDPWD}/${ZIP_FILE}" .
cd "$OLDPWD"

# Cleanup
rm -rf "$TEMP_DIR"

echo "Created ${ZIP_FILE}"
echo "Ready to upload to Chrome Web Store!"
EOF

chmod +x build.sh
./build.sh
```

Expected: 生成 `.zip` 文件，可直接上传到 Chrome Web Store

---

### Step 12.4: 最终提交

```bash
git add .
git commit -m "chore: prepare for release v1.0.0"
git tag v1.0.0
```

---

## 实施计划总结

本实施计划包含以下主要任务：

1. ✅ 项目初始化和 Manifest 配置
2. ✅ UI 基础结构 - HTML 骨架
3. ✅ CSS 样式设计
4. ✅ Schema 管理器实现
5. ✅ 模式切换和 UI 交互
6. ✅ 文件上传和数据输入
7. ✅ pb → JSON 解析功能
8. ✅ JSON → pb 编码功能
9. ✅ 错误处理和验证
10. ✅ 创建图标和优化 UI
11. ✅ 测试和验证
12. ✅ 最终优化和打包

每个任务都包含详细的步骤和具体的代码实现，遵循 TDD、DRY、YAGNI 原则，建议频繁提交代码。

---

**计划完成！**

下一步选择执行方式：

**1. Subagent-Driven (推荐)** - 每个 task 分配给独立的 subagent，两阶段审查，快速迭代

**2. Inline Execution** - 在当前会话中批量执行任务，设置检查点进行审查

您想使用哪种方式？
