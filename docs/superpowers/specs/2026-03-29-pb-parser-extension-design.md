# Protocol Buffer 双向转换器浏览器插件 - 设计文档

**项目名称**: PB Converter Extension (PB Parser & Encoder)
**创建日期**: 2026-03-29
**版本**: 1.0.0
**作者**: Claude Code + Superpowers

## 1. 项目概述

### 1.1 目标
开发一个 Chrome/Edge 浏览器扩展，用于 Protocol Buffer (pb) 数据与 JSON 格式的双向转换，主要面向开发人员用于调试和生成 pb 数据。

### 1.2 核心功能
- **pb → JSON**: 解析 Protocol Buffer 二进制数据并展示为 JSON
- **JSON → pb**: 将 JSON 数据编码为 Protocol Buffer 二进制格式
- 支持本地 .pb 文件上传和手动粘贴数据
- 支持 JSON 文件上传和手动粘贴
- Schema 管理器：保存和管理多个 .proto 定义
- 支持 Proto2 和 Proto3 语法
- 支持下载生成的 .pb 文件
- 纯浏览器实现，数据不上传到任何服务器，保护隐私

### 1.3 目标用户
- 开发人员：调试 API 接口和 pb 数据
- QA 工程师：验证数据格式和内容
- 产品经理：查看数据结构

## 2. 技术架构

### 2.1 技术栈
- **前端框架**: Vanilla JavaScript（无构建工具）
- **核心库**: protobuf.js
- **存储**: Chrome Storage API (chrome.storage.local)
- **样式**: 原生 CSS + Flexbox
- **浏览器版本**: Manifest V3 (Chrome 88+, Edge 88+)

### 2.2 项目结构

```
pb-parser-extension/
├── manifest.json              # Chrome 扩展配置文件
├── popup/
│   ├── popup.html            # 主界面
│   ├── popup.css             # 样式文件
│   └── popup.js              # 主逻辑
├── lib/
│   └── protobuf.js           # protobuf.js 库 (或通过 CDN)
├── icons/                     # 扩展图标
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── test-cases/               # 测试用例
│   ├── schemas/              # .proto 文件
│   ├── pb-files/             # .pb 二进制文件
│   └── README.md
└── README.md
```

### 2.3 架构设计

插件采用**单页应用（SPA）**架构，所有功能在 popup 页面中完成：

1. **UI 层**：提供数据输入、Schema 选择、结果展示的界面
2. **业务逻辑层**：处理用户交互、调用解析库、管理 schema
3. **数据持久层**：使用 `chrome.storage.local` 保存用户的 schema 定义
4. **解析引擎**：使用 `protobuf.js` 库解析 pb 数据

### 2.4 数据流

**模式 1: pb → JSON**
```
用户选择 "解析模式"
  ↓
选择/管理 Schema → chrome.storage.local 保存/读取
  ↓
输入 pb 数据（文件/粘贴）
  ↓
验证输入（文件格式、大小）
  ↓
调用 protobuf.js 解析
  ↓
展示结果（JSON 高亮）
  ↓
可选：复制 JSON 或下载为 .json 文件
```

**模式 2: JSON → pb**
```
用户选择 "编码模式"
  ↓
选择/管理 Schema → chrome.storage.local 保存/读取
  ↓
输入 JSON 数据（文件/粘贴）
  ↓
验证 JSON 格式和字段匹配
  ↓
调用 protobuf.js 编码
  ↓
展示结果（二进制大小、Base64 预览）
  ↓
下载 .pb 文件或复制 Base64
```

## 3. 功能模块

### 3.1 主界面布局

**顶部区域：模式切换**
- 两个标签页："解析模式 (pb→JSON)" 和 "编码模式 (JSON→pb)"
- 点击切换模式，界面相应更新

**主要内容区域：**

```
┌─────────────────────────────────────┐
│  Header: Logo + 标题 + 模式切换标签  │
├─────────────────────────────────────┤
│  ┌─────────────┐  ┌───────────────┐ │
│  │ Schema 选择  │  │ 数据输入区域   │ │
│  │ 下拉选择框   │  │ 文件上传/粘贴   │ │
│  │ + 管理 Schema│  │               │ │
│  └─────────────┘  └───────────────┘ │
│                                     │
│  [解析] 按钮                         │
├─────────────────────────────────────┤
│  结果展示区域                        │
│  JSON 高亮显示                       │
│  可折叠/展开                         │
└─────────────────────────────────────┘
```

### 3.2 Schema 管理器

**功能：**
- 添加新 schema：输入名称和 .proto 文件内容
- 编辑现有 schema
- 删除 schema
- 导入/导出 schema（JSON 格式）
- Schema 列表显示：名称、消息类型数量、最后修改时间

**数据结构：**
```javascript
{
  "schemas": [
    {
      "id": "uuid",
      "name": "User",
      "content": "// proto file content",
      "createdAt": "2026-03-29T12:00:00Z",
      "updatedAt": "2026-03-29T12:00:00Z"
    }
  ]
}
```

### 3.3 数据输入方式

**解析模式 (pb → JSON):**
- **文件上传**：拖拽或点击上传 .pb 文件
- **手动粘贴**：文本框粘贴 base64 编码的 pb 数据或二进制数据
- **实时预览**：显示文件大小、数据类型

**编码模式 (JSON → pb):**
- **文件上传**：拖拽或点击上传 .json 文件
- **手动粘贴**：文本框粘贴 JSON 数据
- **实时验证**：JSON 语法检查，提示格式错误
- **字段验证**：根据选中的 Schema 验证字段名和类型

### 3.4 结果展示

**解析模式 (pb → JSON):**
- JSON 格式，带语法高亮
- 树形结构，可折叠/展开嵌套对象
- 显示字段类型（string, int32, message 等）
- 支持复制 JSON 到剪贴板
- 支持下载为 .json 文件

**编码模式 (JSON → pb):**
- 显示编码成功消息
- 显示生成的 pb 文件大小
- Base64 预览（可复制）
- 下载 .pb 文件按钮
- 显示编码过程的详细信息（消息类型、字段数量）
- 支持复制 JSON 到剪贴板
- 错误提示：清晰的错误信息

## 4. 错误处理

### 4.1 输入验证错误
- **文件过大**（>10MB）：提示 "文件过大，请上传小于 10MB 的文件"
- **文件格式错误**：提示 "无法识别的文件格式"
- **空输入**：提示 "请输入或上传数据"

### 4.2 Schema 错误
- **语法错误**：显示具体错误行和原因
- **不匹配**：提示 "该数据与选中的 schema 不匹配"

### 4.3 解析错误 (pb → JSON)
- **数据损坏**：提示 "pb 数据已损坏或格式不正确"
- **字段缺失**：显示警告但仍展示解析结果

### 4.4 编码错误 (JSON → pb)
- **JSON 语法错误**：显示具体的 JSON 语法错误位置
- **字段名不匹配**：提示 "JSON 中的字段 'xxx' 不在 Schema 中定义"
- **类型错误**：提示 "字段 'xxx' 的类型不匹配，期望 string，实际是 number"
- **必填字段缺失**：提示 "缺少必填字段 'xxx'"（Proto2）
- **枚举值错误**：提示 "字段 'xxx' 的值 'yyy' 不是有效的枚举值"

### 4.5 用户友好的错误提示
- 使用 toast 消息，不使用 alert
- 提供具体的错误原因和建议的解决方法
- 错误日志保存在本地，方便调试
- 对于 JSON 错误，显示具体的行号和列号

### 4.4 用户友好的错误提示
- 使用 toast 消息，不使用 alert
- 提供具体的错误原因和建议的解决方法
- 错误日志保存在本地，方便调试

## 5. Chrome 商店适配

### 5.1 权限声明

```json
{
  "permissions": [
    "storage"
  ]
}
```

- **最小权限原则**：只请求必要的权限
- 不需要 `activeTab`、`<all_urls>` 等敏感权限

### 5.2 安全要求
- 内容安全策略（CSP）：不允许内联脚本和样式
- 不使用 `eval()` 或动态代码生成
- 使用 HTTPS 加载外部资源（如果使用 CDN）

### 5.3 隐私政策
- 明确说明：所有数据在本地处理，不上传到任何服务器
- 不收集任何用户数据或使用统计
- Schema 定义和数据仅保存在用户本地

### 5.4 商店素材

**必需素材：**
- 图标：16x16px、48x48px、128x128px
- 截图：1280x800px 或 640x400px（至少 1 张，最多 5 张）
- 商店描述：简短描述（132 字符）、详细描述
- 隐私政策页面

## 6. 测试策略

### 6.1 测试用例

使用 `test-cases/` 目录中的 5 个测试用例：

1. **测试用例 1**: 简单的 Proto3 消息
   - 文件: `test1-proto3-simple.proto`, `test1-user.pb`, `test1-user.json`
   - 测试点: 基本数据类型（int32, string, bool）
   - 双向测试: pb→JSON 和 JSON→pb

2. **测试用例 2**: 嵌套消息
   - 文件: `test2-nested.proto`, `test2-person.pb`, `test2-person.json`
   - 测试点: 嵌套 message、repeated 字段、中文字符
   - 双向测试: pb→JSON 和 JSON→pb

3. **测试用例 3**: Proto2 格式
   - 文件: `test3-proto2.proto`, `test3-product.pb`, `test3-product.json`
   - 测试点: Proto2 语法（required, optional）
   - 双向测试: pb→JSON 和 JSON→pb

4. **测试用例 4**: 复杂类型
   - 文件: `test4-complex.proto`, `test4-order.pb`, `test4-order.json`
   - 测试点: enum、map、oneof、深层嵌套
   - 双向测试: pb→JSON 和 JSON→pb

5. **测试用例 5**: 边界测试
   - 文件: `test5-edge-cases.proto`, `test5-edge-cases.pb`, `test5-edge-cases.json`
   - 测试点: 最大数值、空值、Unicode、二进制数据
   - 双向测试: pb→JSON 和 JSON→pb

### 6.2 测试类型

**功能测试 (pb → JSON)：**
- 上传 .pb 文件解析
- 粘贴 base64 数据解析
- JSON 结果展示和复制
- 下载 JSON 文件

**功能测试 (JSON → pb)：**
- 上传 .json 文件编码
- 粘贴 JSON 数据编码
- JSON 语法验证
- 字段类型验证
- 下载 .pb 文件
- 复制 Base64 编码

**Schema 管理测试：**
- Schema 的增删改查
- 导入/导出 Schema

**边界测试：**
- 空文件
- 超大文件
- 特殊字符处理
- 深层嵌套结构

**错误测试：**
- 错误的 .proto 语法
- 数据与 schema 不匹配
- 损坏的 pb 数据

## 7. 开发里程碑

### Phase 1: 基础功能 (Week 1-2)
- [ ] manifest.json 配置
- [ ] 基础 UI 布局（带模式切换）
- [ ] Schema 管理器（增删改查）
- [ ] **pb → JSON 功能**
  - [ ] pb 数据解析
  - [ ] JSON 展示和语法高亮
  - [ ] 复制和下载 JSON
- [ ] **JSON → pb 功能**
  - [ ] JSON 数据编码
  - [ ] JSON 验证和字段检查
  - [ ] Base64 预览和下载 pb
  - [ ] 错误提示

### Phase 2: 增强功能 (Week 2-3)
- [ ] 文件拖拽上传
- [ ] JSON 语法高亮优化
- [ ] 导入/导出 Schema
- [ ] 完善错误处理和用户提示
- [ ] 模式切换动画和状态保持

### Phase 3: 商店准备 (Week 3)
- [ ] 图标和 UI 优化
- [ ] 商店素材准备
- [ ] 完整测试
- [ ] 文档编写

### Phase 4: 发布 (Week 4)
- [ ] 创建 GitHub 仓库
- [ ] 打包扩展程序
- [ ] 提交 Chrome Web Store
- [ ] 等待审核

## 8. 设计原则

1. **简单优先**: 避免引入 React/Vue 等框架，减少复杂度
2. **用户隐私**: 所有数据在本地处理，不上传到服务器
3. **易用性**: 直观的界面，清晰的操作流程
4. **兼容性**: 支持 Proto2 和 Proto3，覆盖更多使用场景
5. **可维护性**: 清晰的代码结构，方便后续维护

## 9. 非功能性需求

### 9.1 性能
- 文件解析时间 < 1 秒（10MB 以内）
- UI 响应时间 < 100ms
- 内存占用 < 50MB

### 9.2 安全性
- 不使用 eval 或动态代码执行
- 遵循 Chrome Extension CSP 规范
- 不收集任何用户数据

### 9.3 可访问性
- 支持键盘导航
- 适当的 ARIA 标签
- 清晰的错误提示

## 10. 依赖项

- **protobuf.js**: ^7.2.5（通过 CDN 或本地引入）
- **Chrome API**: Storage API
- **浏览器要求**: Chrome 88+ / Edge 88+

## 11. 后续扩展可能性

- 支持 .proto 文件 URL 自动加载
- 支持多个 Schema 同时对比
- 支持导出为其他格式（XML、YAML）
- 支持网络请求拦截和自动解析/编码
- 批量转换功能（多个文件）
- 历史记录功能（保存最近的转换）
- 自定义字段映射和转换规则

## 12. 附录

### 12.1 参考资料
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [protobuf.js Documentation](https://protobufjs.github.io/protobuf.js/)
- [Protocol Buffers Language Guide](https://protobuf.dev/programming-guides/proto3/)

### 12.2 测试数据
测试数据位于 `test-cases/` 目录，包含：
- 5 个 .proto schema 文件
- 5 个 .pb 二进制文件
- 5 个 .json 验证文件
- README 说明文档

---

## 13. 总结

这个浏览器插件是一个**双向转换工具**，核心功能包括：

**核心功能：**
- ✅ pb → JSON: 解析 Protocol Buffer 二进制数据并展示为 JSON
- ✅ JSON → pb: 将 JSON 数据编码为 Protocol Buffer 二进制格式
- ✅ Schema 管理器：保存和管理多个 .proto 定义
- ✅ 支持 Proto2 和 Proto3
- ✅ 纯浏览器实现，保护用户隐私
- ✅ 上架 Chrome 插件商店

**技术实现：**
- 前端：Vanilla JavaScript（无框架）
- 核心库：protobuf.js
- 存储：Chrome Storage API
- 架构：单页应用，模式切换设计

**用户体验：**
- 直观的界面设计
- 清晰的错误提示
- 完善的验证机制
- 支持文件上传和手动粘贴
- 支持下载生成的文件

---

**文档状态**: 已更新（添加 JSON → pb 功能）
**下一步**: 用户审查后调用 `writing-plans` 技能创建实施计划
