// PB Converter - Popup JavaScript (A1 Minimalist Redesign)
(function() {
    'use strict';

    // State
    const state = {
        currentMode: 'parse',  // 'parse' | 'encode'
        selectedSchema: null,
        schemas: [],
        inputData: '',
        inputType: null,       // 'text' | 'file'
        inputFormat: 'hex',    // 'hex' | 'base64' | 'binary'
        parsedData: null
    };

    // DOM refs
    const $ = id => document.getElementById(id);

    // ---- Utilities ----

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function showToast(message, type = 'info') {
        const container = $('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 200); }, 2500);
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024, s = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + s[i];
    }

    function highlightJson(json) {
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
            let cls = 'number';
            if (/^"/.test(match)) { cls = /:$/.test(match) ? 'key' : 'string'; }
            else if (/true|false/.test(match)) { cls = 'boolean'; }
            else if (/null/.test(match)) { cls = 'null'; }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    // ---- Schema CRUD ----

    function loadSchemas() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['schemas'], result => {
                if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
                state.schemas = result.schemas || [];
                updateSchemaSelect();
                updateSchemaList();
                resolve(state.schemas);
            });
        });
    }

    function saveSchemas() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ schemas: state.schemas }, () => {
                if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
                resolve();
            });
        });
    }

    function addSchema(name, content) {
        const root = ProtoWrapper.parse(content);
        const schema = {
            id: uuid(),
            name, content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        state.schemas.push(schema);
        return saveSchemas().then(() => { updateSchemaSelect(); updateSchemaList(); return schema; });
    }

    function editSchema(schemaId, name, content) {
        ProtoWrapper.parse(content); // validate
        const idx = state.schemas.findIndex(s => s.id === schemaId);
        if (idx === -1) throw new Error('Schema not found');
        state.schemas[idx] = { ...state.schemas[idx], name, content, updatedAt: new Date().toISOString() };
        return saveSchemas().then(() => { updateSchemaSelect(); updateSchemaList(); return state.schemas[idx]; });
    }

    function deleteSchema(schemaId) {
        state.schemas = state.schemas.filter(s => s.id !== schemaId);
        if (state.selectedSchema && state.selectedSchema.id === schemaId) {
            state.selectedSchema = null;
            updateProcessBtn();
        }
        return saveSchemas().then(() => { updateSchemaSelect(); updateSchemaList(); });
    }

    function exportSchemas() {
        const blob = new Blob([JSON.stringify(state.schemas, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pb-schemas-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importSchemas() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (!Array.isArray(imported)) throw new Error('Invalid format');
                    imported.forEach(s => {
                        if (s.id && s.name && s.content) {
                            state.schemas.push({ ...s, id: uuid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                        }
                    });
                    saveSchemas().then(() => { updateSchemaSelect(); updateSchemaList(); showToast(`已导入 ${imported.length} 个 Schema`, 'success'); });
                } catch (err) { showToast('导入失败: 无效文件', 'error'); }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ---- UI Updates ----

    function updateSchemaSelect() {
        const sel = $('schema-select');
        sel.innerHTML = '<option value="">-- 选择 Schema --</option>';
        state.schemas.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            sel.appendChild(opt);
        });
        if (state.selectedSchema) sel.value = state.selectedSchema.id;
    }

    function updateSchemaList() {
        const list = $('schema-list');
        if (!state.schemas.length) {
            list.innerHTML = '<div class="empty-schema-list">暂无 Schema，点击下方加载示例开始</div>';
            return;
        }
        list.innerHTML = state.schemas.map(s => {
            const days = Math.floor((Date.now() - new Date(s.updatedAt || s.createdAt)) / 86400000);
            const ago = days === 0 ? '今天' : days === 1 ? '1天前' : `${days}天前`;
            return `<div class="schema-list-item" data-id="${s.id}">
                <div class="schema-info">
                    <span class="schema-list-name">${escapeHtml(s.name)}</span>
                    <span class="schema-list-meta">${ago}</span>
                </div>
                <div class="schema-list-actions">
                    <button class="list-action-btn use" data-action="use" title="使用">✓</button>
                    <button class="list-action-btn edit" data-action="edit" title="编辑">✏</button>
                    <button class="list-action-btn delete" data-action="delete" title="删除">✕</button>
                </div>
            </div>`;
        }).join('');
    }

    function updateProcessBtn() {
        const btn = $('process-btn');
        const hasSchema = !!state.selectedSchema;
        const hasData = !!(state.inputData);
        btn.disabled = !(hasSchema && hasData);
    }

    // ---- Schema Selection ----

    function selectSchema(schemaId) {
        if (!schemaId) { state.selectedSchema = null; updateProcessBtn(); return; }
        const schema = state.schemas.find(s => s.id === schemaId);
        if (!schema) { state.selectedSchema = null; updateProcessBtn(); return; }

        try {
            const root = ProtoWrapper.parse(schema.content);
            state.selectedSchema = { ...schema, messages: root.messages };
        } catch (e) {
            showToast('Schema 解析失败', 'error');
            state.selectedSchema = null;
        }
        updateProcessBtn();
    }

    // ---- Core: Parse & Encode ----

    async function parseProtoToJson(data) {
        if (!state.selectedSchema) throw new Error('请先选择 Schema');

        let buffer;
        if (state.inputType === 'file') {
            buffer = data;
        } else {
            const text = data.trim();
            if (state.inputFormat === 'base64') {
                const binary = atob(text.replace(/\s/g, ''));
                buffer = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
            } else if (state.inputFormat === 'hex') {
                const clean = text.replace(/\s/g, '');
                if (clean.length % 2 !== 0) throw new Error('Hex 长度必须为偶数');
                buffer = new Uint8Array(clean.length / 2);
                for (let i = 0; i < clean.length; i += 2) {
                    const b = parseInt(clean.substr(i, 2), 16);
                    if (isNaN(b)) throw new Error(`无效 Hex 字符，位置 ${i}`);
                    buffer[i / 2] = b;
                }
            } else {
                buffer = new TextEncoder().encode(text);
            }
        }

        const root = ProtoWrapper.parse(state.selectedSchema.content);
        const messageTypes = root.messages;
        if (!messageTypes || !Object.keys(messageTypes).length) throw new Error('Schema 中没有消息类型');

        const messageType = Object.keys(messageTypes)[0];
        const decoded = ProtoWrapper.decode(buffer, messageTypes[messageType]);

        return { success: true, messageType, data: decoded };
    }

    async function encodeJsonToProto(data) {
        if (!state.selectedSchema) throw new Error('请先选择 Schema');

        let jsonData;
        if (state.inputType === 'file') {
            jsonData = JSON.parse(new TextDecoder().decode(data));
        } else {
            jsonData = JSON.parse(data.trim());
        }

        const root = ProtoWrapper.parse(state.selectedSchema.content);
        const messageTypes = root.messages;
        if (!messageTypes || !Object.keys(messageTypes).length) throw new Error('Schema 中没有消息类型');

        const messageType = Object.keys(messageTypes)[0];
        const buffer = ProtoWrapper.encode(jsonData, messageTypes[messageType]);

        return {
            success: true, messageType, buffer,
            base64: btoa(String.fromCharCode.apply(null, buffer)),
            hex: Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('')
        };
    }

    // ---- Display Results ----

    function displayJsonResult(data, messageType) {
        const messageFields = (state.selectedSchema.messages || {})[messageType];
        let output = data;

        if (messageFields) {
            // Build field map
            const fieldMap = {};
            for (const [num, field] of Object.entries(messageFields)) {
                if (field.name) fieldMap[num] = field.name;
            }

            // Map data
            const mapped = {};
            for (const [fieldNum, value] of Object.entries(data)) {
                const key = String(fieldNum);
                const name = fieldMap[key] || key;
                const def = messageFields[key];
                let finalVal = value;
                if (def && def.type === 'bool') finalVal = value === 1;
                mapped[name] = finalVal;
            }
            output = mapped;
        }

        const json = JSON.stringify(output, null, 2);
        const section = $('result-section');
        const title = $('result-title');
        const content = $('result-content');

        title.textContent = `解析结果 · ${messageType} · ${formatBytes(new Blob([json]).size)}`;
        content.innerHTML = highlightJson(json);
        section.style.display = 'block';
        section.classList.add('fade-in');
        state.parsedData = output;
    }

    function displayEncodeResult(result) {
        const section = $('result-section');
        const title = $('result-title');
        const content = $('result-content');

        const display = {
            messageType: result.messageType,
            sizeBytes: result.buffer.length,
            base64: result.base64,
            hex: result.hex
        };
        const json = JSON.stringify(display, null, 2);

        title.textContent = `编码结果 · ${result.messageType} · ${formatBytes(result.buffer.length)}`;
        content.innerHTML = highlightJson(json);
        section.style.display = 'block';
        section.classList.add('fade-in');
        state.parsedData = result.buffer;
    }

    // ---- Mode Switching ----

    function switchMode(mode) {
        state.currentMode = mode;

        // Update mode buttons
        document.querySelectorAll('.mode-opt').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update UI labels
        const textarea = $('text-input');
        const processBtn = $('process-btn');
        const formatPills = document.querySelector('.format-pills');

        if (mode === 'parse') {
            textarea.placeholder = '粘贴 Hex / Base64 数据，或拖拽 .pb 文件到这里';
            processBtn.querySelector('.btn-text').textContent = '解析';
            formatPills.style.display = 'flex';
        } else {
            textarea.placeholder = '粘贴 JSON 数据...';
            processBtn.querySelector('.btn-text').textContent = '编码';
            formatPills.style.display = 'none';
        }

        // Clear result
        $('result-section').style.display = 'none';
        state.parsedData = null;
    }

    // ---- Event Setup ----

    function setupEvents() {
        // Settings panel toggle
        const settingsBtn = $('settings-btn');
        const settingsPanel = $('settings-panel');
        settingsBtn.addEventListener('click', () => {
            const isActive = settingsPanel.classList.toggle('active');
            settingsBtn.classList.toggle('active', isActive);
        });

        // Mode switch in settings
        document.querySelectorAll('.mode-opt').forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.mode));
        });

        // Load example schema
        $('load-example-btn').addEventListener('click', () => {
            const exampleSchema = `syntax = "proto3";

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
  bool is_active = 4;
}`;
            addSchema('Example User Schema', exampleSchema)
                .then(schema => {
                    $('schema-select').value = schema.id;
                    selectSchema(schema.id);
                    showToast('示例 Schema 已加载', 'success');
                })
                .catch(() => showToast('加载失败', 'error'));
        });

        // Schema manager button
        $('schema-manager-btn').addEventListener('click', () => {
            $('schema-manager-modal').classList.add('active');
        });

        // Schema select dropdown
        $('schema-select').addEventListener('change', function() {
            selectSchema(this.value);
        });

        // Format pills
        document.querySelectorAll('.format-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.format-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                state.inputFormat = pill.dataset.format;
            });
        });

        // File upload button
        $('upload-btn').addEventListener('click', () => $('file-input').click());
        $('file-input').addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });

        // Text input
        $('text-input').addEventListener('input', e => {
            state.inputData = e.target.value;
            state.inputType = 'text';
            updateProcessBtn();
        });

        // Drag & drop on textarea
        const textarea = $('text-input');
        textarea.addEventListener('dragover', e => { e.preventDefault(); textarea.classList.add('drag-over'); });
        textarea.addEventListener('dragleave', () => textarea.classList.remove('drag-over'));
        textarea.addEventListener('drop', e => {
            e.preventDefault();
            textarea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });

        // Process button
        $('process-btn').addEventListener('click', async () => {
            if (!state.selectedSchema || !state.inputData) return;

            const btn = $('process-btn');
            btn.disabled = true;
            const origText = btn.querySelector('.btn-text').textContent;
            btn.querySelector('.btn-text').textContent = '处理中...';

            try {
                if (state.currentMode === 'parse') {
                    const result = await parseProtoToJson(state.inputData);
                    displayJsonResult(result.data, result.messageType);
                    showToast('解析成功', 'success');
                } else {
                    const result = await encodeJsonToProto(state.inputData);
                    displayEncodeResult(result);
                    showToast('编码成功', 'success');
                }
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.querySelector('.btn-text').textContent = origText;
                updateProcessBtn();
            }
        });

        // Copy result
        $('copy-result-btn').addEventListener('click', () => {
            const text = $('result-content').textContent;
            navigator.clipboard.writeText(text)
                .then(() => showToast('已复制', 'success'))
                .catch(() => showToast('复制失败', 'error'));
        });

        // Download result
        $('download-result-btn').addEventListener('click', () => {
            if (state.currentMode === 'parse') {
                const text = $('result-content').textContent;
                downloadBlob(new Blob([text], { type: 'application/json' }), `pb-result-${Date.now()}.json`);
            } else if (state.parsedData instanceof Uint8Array) {
                downloadBlob(new Blob([state.parsedData], { type: 'application/octet-stream' }), `pb-encoded-${Date.now()}.pb`);
            }
        });

        // Modal close
        $('close-modal-btn').addEventListener('click', () => $('schema-manager-modal').classList.remove('active'));
        $('modal-backdrop').addEventListener('click', () => $('schema-manager-modal').classList.remove('active'));

        // Schema list actions (delegation)
        $('schema-list').addEventListener('click', e => {
            const item = e.target.closest('.schema-list-item');
            if (!item) return;
            const id = item.dataset.id;
            const action = e.target.dataset.action;

            if (action === 'use') {
                $('schema-select').value = id;
                selectSchema(id);
                $('schema-manager-modal').classList.remove('active');
                showToast('Schema 已选择', 'success');
            } else if (action === 'edit') {
                const schema = state.schemas.find(s => s.id === id);
                if (!schema) return;
                const newName = prompt('Schema 名称:', schema.name);
                if (!newName) return;
                const newContent = prompt('Schema 内容:', schema.content);
                if (!newContent) return;
                editSchema(id, newName, newContent)
                    .then(() => { selectSchema(id); showToast('已更新', 'success'); })
                    .catch(() => showToast('更新失败', 'error'));
            } else if (action === 'delete') {
                const schema = state.schemas.find(s => s.id === id);
                if (!schema) return;
                if (!confirm(`删除 "${schema.name}"？`)) return;
                deleteSchema(id).then(() => showToast('已删除', 'success'));
            }
        });

        // Import / Export
        $('import-schema-btn').addEventListener('click', importSchemas);
        $('export-schema-btn').addEventListener('click', exportSchemas);

        // Close settings when clicking outside
        document.addEventListener('click', e => {
            if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
                settingsPanel.classList.remove('active');
                settingsBtn.classList.remove('active');
            }
        });
    }

    function handleFile(file) {
        if (file.size > 10 * 1024 * 1024) { showToast('文件过大（最大 10MB）', 'error'); return; }
        const reader = new FileReader();
        reader.onload = e => {
            state.inputData = new Uint8Array(e.target.result);
            state.inputType = 'file';
            $('text-input').value = `[文件] ${file.name} (${formatBytes(file.size)})`;
            updateProcessBtn();
            showToast(`已加载 ${file.name}`, 'success');
        };
        reader.readAsArrayBuffer(file);
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }

    // ---- Init ----

    function init() {
        setupEvents();
        loadSchemas().catch(e => console.error('Failed to load schemas:', e));
        switchMode('parse');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
