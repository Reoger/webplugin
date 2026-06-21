// Generate a large protobuf test file
const protobufjs = require('protobufjs');

const proto = `
syntax = "proto3";

message OrderItem {
  int32 product_id = 1;
  string product_name = 2;
  int32 quantity = 3;
  double price = 4;
  string category = 5;
}

message Address {
  string street = 1;
  string city = 2;
  string province = 3;
  string zip_code = 4;
  string country = 5;
  string phone = 6;
}

message Order {
  int64 order_id = 1;
  string user_name = 2;
  string email = 3;
  Address shipping_address = 4;
  Address billing_address = 5;
  repeated OrderItem items = 6;
  double total_amount = 7;
  double discount = 8;
  double shipping_fee = 9;
  string payment_method = 10;
  string order_status = 11;
  string created_at = 12;
  string updated_at = 13;
  string note = 14;
  bool is_gift = 15;
  string gift_message = 16;
  string tracking_number = 17;
  repeated string tags = 18;
  string currency = 19;
  string locale = 20;
}
`;

const root = protobufjs.parse(proto).root;
const Order = root.lookupType('Order');

const order = {
  order_id: 20260331001,
  user_name: "张三丰",
  email: "zhangsan@techcorp.cn",
  shipping_address: {
    street: "中关村南大街5号院",
    city: "北京",
    province: "北京市",
    zip_code: "100081",
    country: "中国",
    phone: "+86-138-0001-2345"
  },
  billing_address: {
    street: "海淀区清华科技园B座16层",
    city: "北京",
    province: "北京市",
    zip_code: "100084",
    country: "中国",
    phone: "+86-138-0001-2346"
  },
  items: [],
  total_amount: 15678.50,
  discount: 1200.00,
  shipping_fee: 25.00,
  payment_method: "支付宝",
  order_status: "已发货",
  created_at: "2026-03-28T10:30:00+08:00",
  updated_at: "2026-03-31T14:20:00+08:00",
  note: "请小心轻放，易碎物品。收件人可能不在家，可放快递柜。如需联系请拨打备用电话。周末不送货，请安排工作日配送。谢谢！",
  is_gift: true,
  gift_message: "生日快乐！祝你新的一年万事如意，工作顺利，身体健康！希望这些书籍和电子产品能帮到你。加油！💪",
  tracking_number: "SF1234567890123",
  tags: ["电子产品", "书籍", "办公用品", "生日礼物", "加急", "易碎", "签收确认", "需要发票"],
  currency: "CNY",
  locale: "zh-CN"
};

// Generate many items
const products = [
  { id: 1001, name: "MacBook Pro 16英寸 M4 Max 64GB 1TB 深空黑", cat: "笔记本电脑", price: 29999.00 },
  { id: 1002, name: "Apple Studio Display 27英寸5K视网膜显示器", cat: "显示器", price: 11499.00 },
  { id: 1003, name: "HHKB Professional HYBRID Type-S 静电容键盘", cat: "键盘", price: 2480.00 },
  { id: 1004, name: "Logitech MX Master 3S 无线蓝牙鼠标 石墨色", cat: "鼠标", price: 699.00 },
  { id: 1005, name: "《深入理解计算机系统》(原书第3版) 中文版", cat: "书籍", price: 139.00 },
  { id: 1006, name: "《设计模式：可复用面向对象软件的基础》", cat: "书籍", price: 89.00 },
  { id: 1007, name: "《重构：改善既有代码的设计》第2版", cat: "书籍", price: 99.00 },
  { id: 1008, name: "Sony WH-1000XM5 头戴式降噪耳机 黑色", cat: "耳机", price: 2499.00 },
  { id: 1009, name: "CalDigit TS4 Thunderbolt 4 扩展坞", cat: "扩展坞", price: 2999.00 },
  { id: 1010, name: "三星 T7 Shield 2TB 移动固态硬盘 IP65防水", cat: "存储", price: 1299.00 },
  { id: 1011, name: "Rain Design mStand360 笔记本铝合金支架", cat: "配件", price: 399.00 },
  { id: 1012, name: "Anker 737 PowerCore 24000mAh 140W移动电源", cat: "电源", price: 599.00 },
  { id: 1013, name: "《算法导论》(原书第3版) 精装版", cat: "书籍", price: 128.00 },
  { id: 1014, name: "Apple Magic Trackpad 妙控板 白色/黑色", cat: "配件", price: 649.00 },
  { id: 1015, name: "BenQ ScreenBar Halo 屏幕挂灯 无线遥控", cat: "灯具", price: 999.00 },
];

for (const p of products) {
  const qty = Math.floor(Math.random() * 3) + 1;
  order.items.push({
    product_id: p.id,
    product_name: p.name,
    quantity: qty,
    price: p.price,
    category: p.cat
  });
}

// Verify + encode
const errMsg = Order.verify(order);
if (errMsg) { console.error('Verify error:', errMsg); process.exit(1); }

const msg = Order.create(order);
const buffer = Order.encode(msg).finish();

// Write .pb file
const fs = require('fs');
fs.writeFileSync('test-cases/pb-files/order-test.pb', Buffer.from(buffer));
console.log('Written: test-cases/pb-files/order-test.pb (' + buffer.length + ' bytes)');

// Also write hex string
const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
fs.writeFileSync('test-cases/pb-files/order-test-hex.txt', hex);
console.log('Written: test-cases/pb-files/order-test-hex.txt (' + hex.length + ' chars)');

// Write the schema
fs.writeFileSync('test-cases/schemas/order.proto', proto);
console.log('Written: test-cases/schemas/order.proto');
