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

            state.selectedSchema = schema;
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

    // 基础初始化函数
    function init() {
        initElements();
        setupSchemaEventListeners();
        setupSchemaListEventListeners();
        setupModeEventListeners();
        loadSchemas();
        switchMode('parse'); // 默认模式
    }

    // 当 DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();