# Protocol Buffer 测试用例

本目录包含了用于测试 PB 解析器的各种测试数据。

## 目录结构

```
test-cases/
├── schemas/          # Proto schema 定义文件
├── pb-files/         # 编译后的 pb 二进制文件
└── README.md         # 本文档
```

## 测试用例说明

### 测试用例 1: 简单的 Proto3 消息
- **文件**: `test1-proto3-simple.proto`, `test1-user.pb`
- **测试点**: 基本数据类型（int32, string, bool）
- **预期结果**: 成功解析为 JSON

### 测试用例 2: 嵌套消息
- **文件**: `test2-nested.proto`, `test2-person.pb`
- **测试点**: 嵌套 message、repeated 字段、中文字符
- **预期结果**: 正确显示嵌套结构和数组

### 测试用例 3: Proto2 格式
- **文件**: `test3-proto2.proto`, `test3-product.pb`
- **测试点**: Proto2 语法（required, optional）
- **预期结果**: 兼容 proto2 格式

### 测试用例 4: 复杂类型
- **文件**: `test4-complex.proto`, `test4-order.pb`
- **测试点**: enum、map、oneof、深层嵌套
- **预期结果**: 正确处理所有复杂类型

### 测试用例 5: 边界测试
- **文件**: `test5-edge-cases.proto`, `test5-edge-cases.pb`
- **测试点**: 最大数值、空值、Unicode、二进制数据
- **预期结果**: 正确处理边界情况

## 使用方法

1. 上传对应的 `.proto` 文件到 Schema 管理器
2. 选择对应的 Schema
3. 上传或粘贴 `.pb` 文件内容
4. 查看解析结果

## 验证

每个测试用例都包含一个 `.json` 文件，显示预期的解析结果，用于验证插件是否正确工作。

生成时间: 2026-03-29T07:16:24.182Z
