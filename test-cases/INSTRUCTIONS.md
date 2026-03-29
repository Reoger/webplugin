# PB Converter 测试指南

## 测试数据 1：简单用户信息（Proto3）

### Schema (test1-user.proto)
```protobuf
syntax = "proto3";

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
  bool is_active = 4;
}
```

### 测试步骤：

#### 1. 添加 Schema
1. 点击 "⚙️ Manager" 按钮
2. 点击 "➕ Add Schema" 按钮（或手动添加）
3. 输入名称：`User Schema`
4. 输入内容（复制上面的 schema）
5. 确认

#### 2. 加载 PB 文件测试（解析模式）
**PB 文件位置：** `test-cases/pb-files/test1-user.pb`

**十六进制内容：**
```
08 b9 60 12 06 e5 bc a0 e4 b8 89 1a 14 7a 68 61 6e 67 73 61 6e 40 65 78 61 6d 70 6c 65 2e 63 6f 6d 20 01
```

**Base64 编码：**
```
CLtiEhsB5ry6S5b2+AFxemhhbmdzYW5AZXhhbXBsZS5jb20gAQ==
```

**期望的 JSON 结果：**
```json
{
  "id": 12345,
  "name": "张三",
  "email": "zhangsan@example.com",
  "is_active": true
}
```

#### 3. 手动输入测试
**方式 1 - 使用 Base64：**
1. 选择 "User Schema"
2. 切换到 "Parse" 模式
3. 在 "Or paste content directly" 文本框中粘贴上面的 Base64 字符串
4. 点击 "▶️ Process Data"

**方式 2 - 使用十六进制：**
1. 选择输入格式为 "Hex"
2. 粘贴上面的十六进制字符串（去掉空格）
3. 点击 "▶️ Process Data"

**方式 3 - 上传文件：**
1. 直接将 `test1-user.pb` 文件拖拽到上传区域
2. 或点击 "Choose Files" 按钮选择文件

---

## 快速测试（使用 Load Example）

### 最简单的测试方法：
1. 点击 "📝 Load Example" 按钮
2. 会自动加载示例 Schema（User Schema）
3. 在文本框中粘贴上面的 Base64 数据：
   ```
   CLtiEhsB5ry6S5b2+AFxemhhbmdzYW5AZXhhbXBsZS5jb20gAQ==
   ```
4. 点击 "▶️ Process Data"
5. 查看结果是否正确

---

## 编码模式测试（JSON → PB）

### 测试步骤：
1. 加载 "User Schema"（点击 Load Example）
2. 切换到 "⚡ Generate" 模式
3. 在文本框中输入以下 JSON：
   ```json
   {
     "id": 12345,
     "name": "张三",
     "email": "zhangsan@example.com",
     "is_active": true
   }
   ```
4. 点击 "⚡ Process Data"
5. 查看生成的 Base64 编码
6. 下载生成的 .pb 文件

---

## 其他测试用例

### 测试用例 2：嵌套消息
- Schema: `test-cases/schemas/test2-nested.proto`
- PB 文件: `test-cases/pb-files/test2-person.pb`
- JSON: `test-cases/pb-files/test2-person.json`

### 测试用例 3：Proto2 格式
- Schema: `test-cases/schemas/test3-proto2.proto`
- PB 文件: `test-cases/pb-files/test3-product.pb`
- JSON: `test-cases/pb-files/test3-product.json`

---

## 常见问题

### Q: Load Example 点击没反应？
**A:** 请确保已经刷新了扩展。在 Console 中应该能看到 "Load Example clicked" 日志。

### Q: 解析失败怎么办？
**A:** 检查：
1. Schema 是否正确加载
2. 输入的数据格式是否正确
3. Console 中是否有错误信息

### Q: 编码失败怎么办？
**A:** 检查：
1. JSON 格式是否正确
2. JSON 中的字段名是否与 Schema 匹配
3. 字段类型是否正确

---

## 验证成功的标志

✅ 能成功添加 Schema
✅ 能成功解析 PB 数据并显示正确的 JSON
✅ 能成功编码 JSON 并生成 PB 数据
✅ 能正确显示中文字符
✅ 能正确处理布尔值
✅ Modal 能正常打开和关闭
