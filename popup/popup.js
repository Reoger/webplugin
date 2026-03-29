// Protobuf Schema Parser - Popup JavaScript
// 使用 IIFE 避免全局变量污染
(function() {
    'use strict';

    // State Management
    const state = {
        currentMode: 'parse',
        selectedSchema: null,
        schemas: [],
        inputData: '',
        inputType: null,
        parsedData: null
    };

    // DOM Elements 缓存
    const elements = {};

    // Utility Functions
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
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // DOM Elements 初始化
    function initElements() {
        // 主要元素
        elements.container = document.querySelector('.container');
        elements.schemaSection = document.getElementById('schema-section');
        elements.inputSection = document.getElementById('input-section');
        elements.resultSection = document.getElementById('result-section');

        // Schema 相关元素
        elements.schemaSelect = document.getElementById('schema-select');
        elements.schemaManagerBtn = document.getElementById('schema-manager-btn');
        elements.schemaDisplay = document.getElementById('schema-display');
        elements.schemaName = document.getElementById('schema-name');
        elements.schemaContent = document.getElementById('schema-content');
        elements.refreshSchemaBtn = document.getElementById('refresh-schema-btn');
        elements.loadExampleBtn = document.getElementById('load-example-btn');
        elements.clearSchemaBtn = document.getElementById('clear-schema-btn');

        // 模式切换元素
        elements.modeSwitcher = document.querySelector('.mode-switcher');
        elements.parseBtn = document.querySelector('.parse-btn');
        elements.generateBtn = document.querySelector('.generate-btn');
        elements.modeButtons = document.querySelectorAll('.mode-btn');

        // 输入相关元素
        elements.uploadArea = document.getElementById('upload-area');
        elements.fileInput = document.getElementById('file-input');
        elements.uploadBtn = document.getElementById('upload-btn');
        elements.textInput = document.getElementById('text-input');
        elements.clearTextBtn = document.getElementById('clear-text-btn');
        elements.formatTextBtn = document.getElementById('format-text-btn');
        elements.formatOptions = document.getElementById('format-options');

        // 模式相关UI元素
        elements.inputTitle = document.querySelector('h3'); // 第一个h3应该是在schema section后面
        elements.uploadText = document.querySelector('.upload-text p');
        elements.dataInput = elements.textInput; // 使用现有的textInput作为dataInput
        elements.convertBtn = elements.processBtn; // 使用现有的processBtn作为convertBtn
        elements.resultTitle = document.querySelector('#result-section h3');

        // 动作按钮
        elements.processBtn = document.getElementById('process-btn');

        // 结果相关元素
        elements.resultTabs = document.querySelector('.result-tabs');
        elements.resultContent = document.getElementById('result-content');
        elements.resultOutput = document.getElementById('result-content');
        elements.resultInfo = document.createElement('div');
        elements.resultInfo.className = 'result-info';
        elements.debugContent = document.getElementById('debug-content');
        elements.rawContent = document.getElementById('raw-content');
        elements.copyResultBtn = document.getElementById('copy-result-btn');
        elements.downloadResultBtn = document.getElementById('download-result-btn');
        elements.clearResultBtn = document.getElementById('clear-result-btn');

        // 模态框元素
        elements.schemaManagerModal = document.getElementById('schema-manager-modal');
        elements.modalBackdrop = document.getElementById('modal-backdrop');
        elements.closeModalBtn = document.getElementById('close-modal-btn');
        elements.schemaList = document.getElementById('schema-list');
        elements.importSchemaBtn = document.getElementById('import-schema-btn');
        elements.exportSchemaBtn = document.getElementById('export-schema-btn');
    }

    // Schema Management Functions
    function loadSchemas() {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.get(['schemas'], (result) => {
                    const schemas = result.schemas || [];
                    state.schemas = schemas;
                    updateSchemaDropdown();
                    updateSchemaList();
                    resolve(schemas);
                });
            } catch (error) {
                console.error('Error loading schemas:', error);
                showToast('Failed to load schemas', 'error');
                reject(error);
            }
        });
    }

    function saveSchemas() {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.set({ schemas: state.schemas }, () => {
                    showToast('Schemas saved successfully', 'success');
                    resolve(state.schemas);
                });
            } catch (error) {
                console.error('Error saving schemas:', error);
                showToast('Failed to save schemas', 'error');
                reject(error);
            }
        });
    }

    function updateSchemaDropdown() {
        const options = ['<option value="">-- Choose a schema --</option>'];

        state.schemas.forEach(schema => {
            const option = `<option value="${escapeHtml(schema.id)}">${escapeHtml(schema.name)}</option>`;
            options.push(option);
        });

        elements.schemaSelect.innerHTML = options.join('');

        if (state.selectedSchema) {
            elements.schemaSelect.value = state.selectedSchema.id;
        }
    }

    function updateSchemaList() {
        if (!state.schemas.length) {
            elements.schemaList.innerHTML = `
                <div class="empty-schema-list">
                    <p>No schemas available</p>
                    <p class="hint">Add your first schema to get started</p>
                </div>
            `;
            return;
        }

        const listItems = state.schemas.map(schema => {
            const now = new Date();
            const schemaDate = new Date(schema.updatedAt || schema.createdAt);
            const daysAgo = Math.floor((now - schemaDate) / (1000 * 60 * 60 * 24));
            const timeAgo = daysAgo === 0 ? 'today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;

            return `
                <div class="schema-list-item" data-schema-id="${schema.id}">
                    <div class="schema-info">
                        <span class="schema-list-name">${escapeHtml(schema.name)}</span>
                        <span class="schema-list-meta">v1.0 • ${timeAgo}</span>
                    </div>
                    <div class="schema-list-actions">
                        <button class="btn-icon use-schema-btn" title="Use Schema">
                            ✓
                        </button>
                        <button class="btn-icon edit-schema-btn" title="Edit Schema">
                            ✏️
                        </button>
                        <button class="btn-icon delete-schema-btn" title="Delete Schema">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        elements.schemaList.innerHTML = listItems;
    }

    function addSchema(name, content) {
        return new Promise((resolve, reject) => {
            try {
                // 验证 proto 语法
                const root = protobuf.parse(content);

                const newSchema = {
                    id: generateUUID(),
                    name: name,
                    content: content,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                state.schemas.push(newSchema);
                saveSchemas().then(resolve).catch(reject);
            } catch (error) {
                console.error('Schema validation error:', error);
                showToast('Invalid proto syntax', 'error');
                reject(error);
            }
        });
    }

    function editSchema(schemaId, name, content) {
        return new Promise((resolve, reject) => {
            try {
                // 验证 proto 语法
                const root = protobuf.parse(content);

                const schemaIndex = state.schemas.findIndex(s => s.id === schemaId);
                if (schemaIndex === -1) {
                    throw new Error('Schema not found');
                }

                state.schemas[schemaIndex] = {
                    ...state.schemas[schemaIndex],
                    name: name,
                    content: content,
                    updatedAt: new Date().toISOString()
                };

                saveSchemas().then(resolve).catch(reject);
            } catch (error) {
                console.error('Schema validation error:', error);
                showToast('Invalid proto syntax', 'error');
                reject(error);
            }
        });
    }

    function deleteSchema(schemaId) {
        return new Promise((resolve, reject) => {
            try {
                state.schemas = state.schemas.filter(s => s.id !== schemaId);

                // 如果删除的是当前选中的 schema，清除选中状态
                if (state.selectedSchema && state.selectedSchema.id === schemaId) {
                    state.selectedSchema = null;
                    displaySchema(null);
                }

                saveSchemas().then(resolve).catch(reject);
            } catch (error) {
                console.error('Error deleting schema:', error);
                showToast('Failed to delete schema', 'error');
                reject(error);
            }
        });
    }

    function exportSchemas() {
        try {
            const dataStr = JSON.stringify(state.schemas, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `protobuf-schemas-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            URL.revokeObjectURL(url);
            showToast('Schemas exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting schemas:', error);
            showToast('Failed to export schemas', 'error');
        }
    }

    function importSchemas() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = function(event) {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const importedSchemas = JSON.parse(e.target.result);

                        if (!Array.isArray(importedSchemas)) {
                            throw new Error('Invalid schema file format');
                        }

                        // 验证并添加导入的 schemas
                        const validatedSchemas = importedSchemas.filter(schema => {
                            return schema.id && schema.name && schema.content &&
                                   typeof schema.name === 'string' &&
                                   typeof schema.content === 'string';
                        });

                        if (validatedSchemas.length === 0) {
                            showToast('No valid schemas found in file', 'error');
                            return;
                        }

                        // 为导入的 schemas 分配新的 UUID
                        validatedSchemas.forEach(schema => {
                            const newSchema = {
                                ...schema,
                                id: generateUUID(),
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };
                            state.schemas.push(newSchema);
                        });

                        saveSchemas().then(() => {
                            showToast(`Imported ${validatedSchemas.length} schemas successfully`, 'success');
                        });

                    } catch (error) {
                        console.error('Error parsing schema file:', error);
                        showToast('Invalid schema file', 'error');
                    }
                };

                reader.readAsText(file);
            };

            input.click();
        } catch (error) {
            console.error('Error importing schemas:', error);
            showToast('Failed to import schemas', 'error');
        }
    }

    // Schema 显示函数
    function displaySchema(schema) {
        if (!schema) {
            elements.schemaName.textContent = 'No schema selected';
            elements.schemaContent.innerHTML = '<div class="placeholder-text">Select a schema to view details</div>';
            elements.processBtn.disabled = true;
            return;
        }

        elements.schemaName.textContent = schema.name;
        elements.schemaContent.innerHTML = `
            <div class="schema-details">
                <div class="schema-meta">
                    <span class="schema-version">Version: 1.0</span>
                    <span class="schema-date">Updated: ${new Date(schema.updatedAt).toLocaleDateString()}</span>
                </div>
                <div class="schema-preview">
                    <pre><code>${escapeHtml(schema.content.substring(0, 500))}${schema.content.length > 500 ? '...' : ''}</code></pre>
                </div>
            </div>
        `;

        // 解析 schema 以获取消息类型
        try {
            const root = protobuf.parse(schema.content);
            const messageTypes = Object.keys(root.nested || {});

            if (messageTypes.length > 0) {
                elements.schemaContent.innerHTML += `
                    <div class="schema-message-types">
                        <h4>Available Message Types:</h4>
                        <div class="message-types-list">
                            ${messageTypes.map(type => `<span class="message-type">${escapeHtml(type)}</span>`).join('')}
                        </div>
                    </div>
                `;
            }

            // 缓存解析后的 schema root 以供验证使用
            state.selectedSchema = {
                ...schema,
                root: root
            };
            elements.processBtn.disabled = false;

        } catch (error) {
            elements.schemaContent.innerHTML += '<div class="schema-error">Error parsing schema</div>';
            state.selectedSchema = null;
            elements.processBtn.disabled = true;
        }
    }

    // 事件监听器设置
    function setupSchemaEventListeners() {
        // Schema 选择器 change 事件
        elements.schemaSelect.addEventListener('change', function() {
            const selectedId = this.value;
            if (!selectedId) {
                displaySchema(null);
                return;
            }

            const schema = state.schemas.find(s => s.id === selectedId);
            if (schema) {
                displaySchema(schema);
            } else {
                displaySchema(null);
            }
        });

        // "管理 Schema" 按钮点击事件
        elements.schemaManagerBtn.addEventListener('click', function() {
            elements.schemaManagerModal.style.display = 'block';
            elements.schemaList.style.display = 'block';
        });

        // Modal 关闭事件
        elements.closeModalBtn.addEventListener('click', function() {
            elements.schemaManagerModal.style.display = 'none';
        });

        elements.modalBackdrop.addEventListener('click', function() {
            elements.schemaManagerModal.style.display = 'none';
        });

        // 模态框外部点击关闭
        window.addEventListener('click', function(event) {
            if (event.target === elements.schemaManagerModal) {
                elements.schemaManagerModal.style.display = 'none';
            }
        });

        // 导入/导出 schemas 按钮事件
        elements.importSchemaBtn.addEventListener('click', importSchemas);
        elements.exportSchemaBtn.addEventListener('click', exportSchemas);
    }

    // Schema 列表动态事件监听器（使用事件委托）
    function setupSchemaListEventListeners() {
        elements.schemaList.addEventListener('click', function(event) {
            const schemaItem = event.target.closest('.schema-list-item');
            if (!schemaItem) return;

            const schemaId = schemaItem.dataset.schemaId;
            const schema = state.schemas.find(s => s.id === schemaId);
            if (!schema) return;

            // 根据点击的按钮执行相应操作
            if (event.target.classList.contains('use-schema-btn')) {
                // 使用 schema
                elements.schemaSelect.value = schemaId;
                displaySchema(schema);
                elements.schemaManagerModal.style.display = 'none';
                showToast(`Using schema: ${schema.name}`, 'success');

            } else if (event.target.classList.contains('edit-schema-btn')) {
                // 编辑 schema
                const newName = prompt('Enter new schema name:', schema.name);
                if (!newName) return;

                const newContent = prompt('Enter new schema content:', schema.content);
                if (!newContent) return;

                editSchema(schemaId, newName, newContent)
                    .then(() => {
                        elements.schemaSelect.value = schemaId;
                        displaySchema(schema);
                    });

            } else if (event.target.classList.contains('delete-schema-btn')) {
                // 删除 schema
                if (confirm(`Delete schema "${schema.name}"?`)) {
                    deleteSchema(schemaId)
                        .then(() => {
                            showToast(`Deleted schema: ${schema.name}`, 'success');
                        });
                }
            }
        });

        // 添加新 Schema 按钮
        const addSchemaBtn = document.createElement('button');
        addSchemaBtn.className = 'btn-primary add-schema-btn';
        addSchemaBtn.innerHTML = '➕ Add Schema';
        addSchemaBtn.onclick = function() {
            const name = prompt('Enter schema name:');
            if (!name) return;

            const content = prompt('Enter schema content:', 'syntax = "proto3";\nmessage Message {\n  string field = 1;\n}');
            if (!content) return;

            addSchema(name, content)
                .then(() => {
                    showToast('Schema added successfully', 'success');
                });
        };

        // 添加到 schema list 区域
        const schemaListSection = document.querySelector('.schema-list-section');
        if (schemaListSection) {
            const header = schemaListSection.querySelector('h4');
            header.appendChild(addSchemaBtn);
        }
    }

    // 模式切换函数
    function switchMode(mode) {
      state.currentMode = mode;

      // 更新模式按钮状态
      elements.modeButtons.forEach(btn => {
        if (btn.dataset.mode === mode) {
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        }
      });

      // 根据模式更新UI
      if (mode === 'parse') {
        elements.inputTitle.textContent = '输入 pb 数据';
        elements.uploadText.innerHTML = '<p>拖拽 .pb 文件到这里，或点击选择文件</p><p class="upload-subtext">支持 .pb 二进制文件</p>';
        elements.fileInput.accept = '.pb';
        elements.dataInput.placeholder = '粘贴 base64 编码的数据或直接粘贴 pb 二进制数据...';
        elements.convertBtn.innerHTML = '<span class="btn-icon">▶️</span><span class="btn-text">解析</span>';
        elements.resultTitle.textContent = '解析结果';
      } else {
        elements.inputTitle.textContent = '输入 JSON 数据';
        elements.uploadText.innerHTML = '<p>拖拽 .json 文件到这里，或点击选择文件</p><p class="upload-subtext">支持 .json 文件</p>';
        elements.fileInput.accept = '.json';
        elements.dataInput.placeholder = '粘贴 JSON 数据...';
        elements.convertBtn.innerHTML = '<span class="btn-icon">⚡</span><span class="btn-text">编码</span>';
        elements.resultTitle.textContent = '编码结果';
      }

      // 清除之前的结果
      elements.resultSection.classList.add('hidden');
      elements.resultContent.innerHTML = '<div class="placeholder-text">处理结果将显示在这里</div>';
      elements.debugContent.innerHTML = '<div class="placeholder-text">调试信息将显示在这里</div>';
      elements.rawContent.innerHTML = '<pre class="raw-data">原始数据将显示在这里</pre>';
    }

    // 设置模式事件监听器
    function setupModeEventListeners() {
      elements.modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          switchMode(btn.dataset.mode);
        });
      });
    }

    // 文件上传处理函数
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

        // 更新UI
        elements.uploadArea.innerHTML = `
          文件: ${escapeHtml(file.name)}<br>
          大小: ${formatBytes(file.size)}
        `;
        elements.convertBtn.disabled = !state.selectedSchema;
      } catch (error) {
        console.error('File upload failed:', error);
        showToast('文件读取失败', 'error');
      }
    }

    function handleTextInput(text) {
      state.inputData = text;
      state.inputType = 'text';

      if (text) {
        const size = new Blob([text]).size;
        elements.uploadArea.textContent = `文本大小: ${formatBytes(size)}`;

        // 在编码模式验证 JSON
        if (state.currentMode === 'encode') {
          const validation = validateJsonInput(text);
          if (!validation.valid) {
            elements.uploadArea.textContent = `❌ ${validation.error}`;
            elements.uploadArea.style.color = 'var(--error-color)';
            elements.convertBtn.disabled = true;
            return;
          }

          // 如果选择了 schema，验证字段
          if (state.selectedSchema) {
            const messageTypes = state.selectedSchema.root.nested;
            const firstType = Object.keys(messageTypes)[0];
            if (firstType) {
              const schemaValidation = validateSchemaFields(validation.data, firstType);
              if (!schemaValidation.valid) {
                elements.uploadArea.textContent = `❌ ${schemaValidation.errors.join('; ')}`;
                elements.uploadArea.style.color = 'var(--error-color)';
                elements.convertBtn.disabled = true;
                return;
              }
            }
          }

          elements.uploadArea.style.color = 'var(--success-color)';
          elements.uploadArea.textContent = `✓ JSON 格式正确 (${formatBytes(size)})`;
        }
      } else {
        elements.uploadArea.innerHTML = '<p>拖拽文件到这里，或点击选择文件</p><p class="upload-subtext">支持 .pb 和 .json 文件</p>';
        elements.uploadArea.style.color = '';
      }

      elements.convertBtn.disabled = !state.selectedSchema || !text;
    }

    function formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Validation Functions
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

    function validateSchemaFields(jsonData, messageType) {
      const type = state.selectedSchema.root.nested[messageType];
      if (!type) {
        return { valid: true }; // 无法验证
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

        // 类型验证
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

      // 检查必填字段（proto2）
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

    function setupFileUploadListeners() {
      // 点击上传
      elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.click();
      });

      elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          handleFileUpload(file);
        }
      });

      // 拖拽上传
      elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
      });

      elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
      });

      elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file) {
          handleFileUpload(file);
        }
      });

      // 文本输入
      elements.dataInput.addEventListener('input', (e) => {
        handleTextInput(e.target.value);
      });
    }

    // Protobuf to JSON parsing function
    async function parseProtoToJson(data) {
      if (!state.selectedSchema) {
        throw new Error('请先选择 Schema');
      }

      try {
        let buffer;

        // 处理不同的输入类型
        if (state.inputType === 'file') {
          buffer = new Uint8Array(data);
        } else {
          // 文本输入 - 先尝试 base64
          const text = data.trim();
          try {
            const binaryString = atob(text);
            buffer = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              buffer[i] = binaryString.charCodeAt(i);
            }
          } catch (e) {
            // 不是 base64，尝试直接二进制
            buffer = new TextEncoder().encode(text);
          }
        }

        // 从 schema 获取所有消息类型
        const root = protobuf.parse(state.selectedSchema.content);
        const messageTypes = root.root.nested;
        if (!messageTypes || Object.keys(messageTypes).length === 0) {
          throw new Error('Schema 中没有定义消息类型');
        }

        // 尝试每个消息类型直到成功
        let decoded = null;
        let usedType = null;

        for (const [typeName, type] of Object.entries(messageTypes)) {
          try {
            decoded = type.decode(buffer);
            usedType = typeName;
            break;
          } catch (e) {
            // 尝试下一个类型
            continue;
          }
        }

        if (!decoded) {
          throw new Error('无法使用 Schema 中的任何消息类型解析数据');
        }

        // 转换为纯对象
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

    // JSON to Protobuf encoding function
    async function encodeJsonToProto(data) {
      if (!state.selectedSchema) {
        throw new Error('请先选择 Schema');
      }

      try {
        let jsonData;

        // 处理不同的输入类型
        if (state.inputType === 'file') {
          const text = new TextDecoder().decode(data);
          jsonData = JSON.parse(text);
        } else {
          jsonData = JSON.parse(data.trim());
        }

        // 添加字段级验证
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

        // 从 schema 获取消息类型
        const root = protobuf.parse(state.selectedSchema.content);
        const messageTypes = root.root.nested;
        if (!messageTypes || Object.keys(messageTypes).length === 0) {
          throw new Error('Schema 中没有定义消息类型');
        }

        // 尝试验证并编码每个消息类型
        let buffer = null;
        let usedType = null;
        let validationErrors = [];

        for (const [typeName, type] of Object.entries(messageTypes)) {
          try {
            // 创建消息实例
            const message = type.create(jsonData);
            buffer = type.encode(message).finish();
            usedType = typeName;

            // 通过解码验证
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

    // Display JSON result
    function displayJsonResult(data, messageType) {
      const json = JSON.stringify(data, null, 2);

      // Show result section
      elements.resultSection.style.display = 'block';

      // Create result info
      const resultInfo = document.createElement('div');
      resultInfo.className = 'result-info';
      resultInfo.innerHTML = `
        消息类型: <strong>${escapeHtml(messageType)}</strong><br>
        数据大小: ${formatBytes(new Blob([json]).size)}
      `;

      // 简单的语法高亮
      const highlighted = highlightJson(json);

      // Update result content
      elements.resultContent.innerHTML = '';
      elements.resultContent.appendChild(resultInfo);
      elements.resultContent.innerHTML += `<pre class="json-output">${highlighted}</pre>`;

      state.parsedData = data;
    }

    // Display encode result
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

    // JSON syntax highlighting
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

    // Setup conversion listeners
    function setupConversionListeners() {
      elements.processBtn.addEventListener('click', async () => {
        if (!state.selectedSchema) {
          showToast('请先选择 Schema', 'warning');
          return;
        }

        if (!state.inputData) {
          showToast('请输入或上传数据', 'warning');
          return;
        }

        elements.processBtn.disabled = true;
        const originalText = elements.processBtn.innerHTML;
        elements.processBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">处理中...</span>';

        try {
          let result;

          if (state.currentMode === 'parse') {
            result = await parseProtoToJson(state.inputData);
            displayJsonResult(result.data, result.messageType);
            showToast('解析成功', 'success');
          } else {
            result = await encodeJsonToProto(state.inputData);
            displayEncodeResult(result);
            showToast('编码成功', 'success');
          }
        } catch (error) {
          console.error('Conversion error:', error);
          showToast(error.message, 'error');
          elements.resultSection.classList.add('hidden');
        } finally {
          elements.processBtn.disabled = false;
          elements.processBtn.innerHTML = originalText;
        }
      });

      // 复制按钮
      if (elements.copyResultBtn) {
        elements.copyResultBtn.addEventListener('click', () => {
          const text = elements.resultContent.textContent;
          navigator.clipboard.writeText(text).then(() => {
            showToast('已复制到剪贴板', 'success');
          }).catch(() => {
            showToast('复制失败', 'error');
          });
        });
      }

      // 下载按钮
      if (elements.downloadResultBtn) {
        elements.downloadResultBtn.addEventListener('click', () => {
          if (state.currentMode === 'parse') {
            const text = elements.resultContent.textContent;
            const blob = new Blob([text], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pb-converter-json-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          } else {
            // 编码模式 - 下载二进制
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
      }
    }

    // 基础初始化函数
    function init() {
        initElements();
        setupSchemaEventListeners();
        setupModeEventListeners();
        setupFileUploadListeners();
        setupConversionListeners();
        setupSchemaListEventListeners();
        loadSchemas();
        switchMode('parse');
    }

    // 当 DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();