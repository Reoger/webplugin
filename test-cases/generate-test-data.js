#!/usr/bin/env node

/**
 * 生成 Protocol Buffer 测试数据
 * 使用 protobuf.js 库生成测试用的 .proto 定义和对应的 .pb 二进制文件
 */

const protobuf = require('protobufjs');
const fs = require('fs');
const path = require('path');

// 确保目录存在
const schemasDir = path.join(__dirname, 'schemas');
const pbFilesDir = path.join(__dirname, 'pb-files');

if (!fs.existsSync(schemasDir)) fs.mkdirSync(schemasDir, { recursive: true });
if (!fs.existsSync(pbFilesDir)) fs.mkdirSync(pbFilesDir, { recursive: true });

console.log('开始生成测试数据...\n');

// ============ 测试用例 1: 简单的 Proto3 消息 ============
console.log('生成测试用例 1: 简单的 Proto3 消息');

const proto3Simple = `
syntax = "proto3";

package test;

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
  bool is_active = 4;
}
`;

fs.writeFileSync(path.join(schemasDir, 'test1-proto3-simple.proto'), proto3Simple);

const root1 = protobuf.parse(proto3Simple).root;
const UserMessage = root1.lookupType('test.User');

const userPayload = {
  id: 12345,
  name: '张三',
  email: 'zhangsan@example.com',
  isActive: true
};

const userMessage = UserMessage.create(userPayload);
const userBuffer = UserMessage.encode(userMessage).finish();

fs.writeFileSync(path.join(pbFilesDir, 'test1-user.pb'), Buffer.from(userBuffer));

// 保存 JSON 格式供验证
fs.writeFileSync(
  path.join(pbFilesDir, 'test1-user.json'),
  JSON.stringify({ payload: userPayload, decoded: UserMessage.decode(userBuffer) }, null, 2)
);

console.log('  ✓ Schema: test1-proto3-simple.proto');
console.log('  ✓ Data: test1-user.pb');
console.log('  ✓ Data: test1-user.json (验证用)\n');

// ============ 测试用例 2: 嵌套消息 ============
console.log('生成测试用例 2: 嵌套消息');

const proto3Nested = `
syntax = "proto3";

package test;

message Address {
  string street = 1;
  string city = 2;
  string country = 3;
  string zipCode = 4;
}

message Person {
  int32 id = 1;
  string name = 2;
  Address address = 3;
  repeated string phone_numbers = 4;
}
`;

fs.writeFileSync(path.join(schemasDir, 'test2-nested.proto'), proto3Nested);

const root2 = protobuf.parse(proto3Nested).root;
const PersonMessage = root2.lookupType('test.Person');

const personPayload = {
  id: 1001,
  name: '李四',
  address: {
    street: '中关村大街1号',
    city: '北京',
    country: '中国',
    zipCode: '100080'
  },
  phoneNumbers: ['13800138000', '010-12345678']
};

const personMessage = PersonMessage.create(personPayload);
const personBuffer = PersonMessage.encode(personMessage).finish();

fs.writeFileSync(path.join(pbFilesDir, 'test2-person.pb'), Buffer.from(personBuffer));
fs.writeFileSync(
  path.join(pbFilesDir, 'test2-person.json'),
  JSON.stringify({ payload: personPayload, decoded: PersonMessage.decode(personBuffer) }, null, 2)
);

console.log('  ✓ Schema: test2-nested.proto');
console.log('  ✓ Data: test2-person.pb');
console.log('  ✓ Data: test2-person.json (验证用)\n');

// ============ 测试用例 3: Proto2 格式 ============
console.log('生成测试用例 3: Proto2 格式');

const proto2Simple = `
syntax = "proto2";

package test;

message Product {
  required int32 id = 1;
  required string name = 2;
  optional string description = 3;
  optional float price = 4;
  repeated string tags = 5;
}
`;

fs.writeFileSync(path.join(schemasDir, 'test3-proto2.proto'), proto2Simple);

const root3 = protobuf.parse(proto2Simple).root;
const ProductMessage = root3.lookupType('test.Product');

const productPayload = {
  id: 9001,
  name: 'MacBook Pro',
  description: '高性能笔记本电脑',
  price: 12999.99,
  tags: ['电子产品', '电脑', 'Apple']
};

const productMessage = ProductMessage.create(productPayload);
const productBuffer = ProductMessage.encode(productMessage).finish();

fs.writeFileSync(path.join(pbFilesDir, 'test3-product.pb'), Buffer.from(productBuffer));
fs.writeFileSync(
  path.join(pbFilesDir, 'test3-product.json'),
  JSON.stringify({ payload: productPayload, decoded: ProductMessage.decode(productBuffer) }, null, 2)
);

console.log('  ✓ Schema: test3-proto2.proto');
console.log('  ✓ Data: test3-product.pb');
console.log('  ✓ Data: test3-product.json (验证用)\n');

// ============ 测试用例 4: 复杂类型（Map、枚举、OneOf） ============
console.log('生成测试用例 4: 复杂类型');

const proto3Complex = `
syntax = "proto3";

package test;

enum Status {
  UNKNOWN = 0;
  PENDING = 1;
  APPROVED = 2;
  REJECTED = 3;
}

message OrderItem {
  int32 product_id = 1;
  string product_name = 2;
  int32 quantity = 3;
  float price = 4;
}

message ShippingInfo {
  string method = 1;
  string address = 2;
  float cost = 3;
}

message PaymentInfo {
  string method = 1;
  string transaction_id = 2;
  float amount = 3;
}

message Order {
  int32 order_id = 1;
  int64 timestamp = 2;
  Status status = 3;
  map<string, string> metadata = 4;
  repeated OrderItem items = 5;
  oneof delivery {
    ShippingInfo shipping = 6;
    bool pickup = 7;
  }
  PaymentInfo payment = 8;
}
`;

fs.writeFileSync(path.join(schemasDir, 'test4-complex.proto'), proto3Complex);

const root4 = protobuf.parse(proto3Complex).root;
const OrderMessage = root4.lookupType('test.Order');

const orderPayload = {
  orderId: 2024001,
  timestamp: Date.now(),
  status: 2, // APPROVED
  metadata: {
    customer_id: 'CUST12345',
    source: 'web',
    campaign: 'spring_sale'
  },
  items: [
    { productId: 101, productName: 'iPhone 15 Pro', quantity: 1, price: 7999.0 },
    { productId: 102, productName: 'AirPods Pro', quantity: 2, price: 1899.0 }
  ],
  shipping: {
    method: 'express',
    address: '上海市浦东新区张江高科园区',
    cost: 15.0
  },
  payment: {
    method: 'credit_card',
    transactionId: 'TXN' + Date.now(),
    amount: 11802.0
  }
};

const orderMessage = OrderMessage.create(orderPayload);
const orderBuffer = OrderMessage.encode(orderMessage).finish();

fs.writeFileSync(path.join(pbFilesDir, 'test4-order.pb'), Buffer.from(orderBuffer));
fs.writeFileSync(
  path.join(pbFilesDir, 'test4-order.json'),
  JSON.stringify({ payload: orderPayload, decoded: OrderMessage.decode(orderBuffer) }, null, 2)
);

console.log('  ✓ Schema: test4-complex.proto');
console.log('  ✓ Data: test4-order.pb');
console.log('  ✓ Data: test4-order.json (验证用)\n');

// ============ 测试用例 5: 边界测试 ============
console.log('生成测试用例 5: 边界测试');

const proto3EdgeCases = `
syntax = "proto3";

package test;

message EdgeCases {
  int64 max_int = 1;
  uint64 max_uint = 2;
  double max_double = 3;
  string empty_string = 4;
  string unicode_string = 5;
  repeated int32 empty_array = 6;
  bytes binary_data = 7;
  bool false_value = 8;
}
`;

fs.writeFileSync(path.join(schemasDir, 'test5-edge-cases.proto'), proto3EdgeCases);

const root5 = protobuf.parse(proto3EdgeCases).root;
const EdgeCasesMessage = root5.lookupType('test.EdgeCases');

const edgeCasesPayload = {
  maxInt: Number.MAX_SAFE_INTEGER,
  maxUint: Number.MAX_SAFE_INTEGER,
  maxDouble: Number.MAX_VALUE,
  emptyString: '',
  unicodeString: '🎉 你好世界 Hello World 🌍',
  emptyArray: [],
  binaryData: Buffer.from('Binary data: \x00\x01\x02\x03'),
  falseValue: false
};

const edgeCasesMessage = EdgeCasesMessage.create(edgeCasesPayload);
const edgeCasesBuffer = EdgeCasesMessage.encode(edgeCasesMessage).finish();

fs.writeFileSync(path.join(pbFilesDir, 'test5-edge-cases.pb'), Buffer.from(edgeCasesBuffer));
fs.writeFileSync(
  path.join(pbFilesDir, 'test5-edge-cases.json'),
  JSON.stringify({ payload: edgeCasesPayload, decoded: EdgeCasesMessage.decode(edgeCasesBuffer) }, null, 2)
);

console.log('  ✓ Schema: test5-edge-cases.proto');
console.log('  ✓ Data: test5-edge-cases.pb');
console.log('  ✓ Data: test5-edge-cases.json (验证用)\n');

// ============ 生成测试用例说明文档 ============
const readme = `# Protocol Buffer 测试用例

本目录包含了用于测试 PB 解析器的各种测试数据。

## 目录结构

\`\`\`
test-cases/
├── schemas/          # Proto schema 定义文件
├── pb-files/         # 编译后的 pb 二进制文件
└── README.md         # 本文档
\`\`\`

## 测试用例说明

### 测试用例 1: 简单的 Proto3 消息
- **文件**: \`test1-proto3-simple.proto\`, \`test1-user.pb\`
- **测试点**: 基本数据类型（int32, string, bool）
- **预期结果**: 成功解析为 JSON

### 测试用例 2: 嵌套消息
- **文件**: \`test2-nested.proto\`, \`test2-person.pb\`
- **测试点**: 嵌套 message、repeated 字段、中文字符
- **预期结果**: 正确显示嵌套结构和数组

### 测试用例 3: Proto2 格式
- **文件**: \`test3-proto2.proto\`, \`test3-product.pb\`
- **测试点**: Proto2 语法（required, optional）
- **预期结果**: 兼容 proto2 格式

### 测试用例 4: 复杂类型
- **文件**: \`test4-complex.proto\`, \`test4-order.pb\`
- **测试点**: enum、map、oneof、深层嵌套
- **预期结果**: 正确处理所有复杂类型

### 测试用例 5: 边界测试
- **文件**: \`test5-edge-cases.proto\`, \`test5-edge-cases.pb\`
- **测试点**: 最大数值、空值、Unicode、二进制数据
- **预期结果**: 正确处理边界情况

## 使用方法

1. 上传对应的 \`.proto\` 文件到 Schema 管理器
2. 选择对应的 Schema
3. 上传或粘贴 \`.pb\` 文件内容
4. 查看解析结果

## 验证

每个测试用例都包含一个 \`.json\` 文件，显示预期的解析结果，用于验证插件是否正确工作。

生成时间: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(__dirname, 'README.md'), readme);

console.log('✓ 测试数据生成完成！');
console.log('\n生成的文件:');
console.log('  - 5 个 .proto schema 文件');
console.log('  - 5 个 .pb 二进制文件');
console.log('  - 5 个 .json 验证文件');
console.log('  - 1 个 README 说明文档');
console.log('\n位置: test-cases/');
