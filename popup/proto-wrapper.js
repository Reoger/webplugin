// Protobuf Parser Wrapper for Chrome Extension
// 避免使用 eval，通过调用反射 API 实现

const ProtoWrapper = (function() {
    'use strict';

    // 解析 protobuf 二进制数据的辅助函数
    function decodeVarint(buffer, offset) {
        let result = 0;
        let shift = 0;
        let byte;

        do {
            if (offset >= buffer.length) {
                throw new Error('Buffer overflow while reading varint');
            }
            byte = buffer[offset++];
            result |= (byte & 0x7F) << shift;
            shift += 7;
        } while (byte & 0x80);

        return { value: result, offset: offset };
    }

    function encodeVarint(value) {
        const bytes = [];
        let v = value;

        do {
            let byte = v & 0x7F;
            v >>>= 7;
            if (v !== 0) {
                byte |= 0x80;
            }
            bytes.push(byte);
        } while (v !== 0);

        return bytes;
    }

    // Wire types
    const WireType = {
        VARINT: 0,
        BIT64: 1,
        LENGTH_DELIMITED: 2,
        START_GROUP: 3,
        END_GROUP: 4,
        BIT32: 5
    };

    // 简单的 protobuf 解析器
    function parseProtobuf(buffer) {
        console.log('[ProtoWrapper] Starting parse, buffer length:', buffer.length);
        console.log('[ProtoWrapper] Buffer hex:', Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(' '));

        const result = {};
        let offset = 0;
        let fieldCount = 0;

        while (offset < buffer.length) {
            console.log(`[ProtoWrapper] Parsing at offset ${offset}, remaining: ${buffer.length - offset}`);

            const tag = decodeVarint(buffer, offset);
            offset = tag.offset;

            const fieldNumber = tag.value >> 3;
            const wireType = tag.value & 0x07;

            console.log(`[ProtoWrapper] Field ${fieldNumber}, Wire type ${wireType}, Tag value: ${tag.value}`);

            if (wireType < 0 || wireType > 5) {
                console.error(`[ProtoWrapper] Invalid wire type ${wireType} at offset ${offset - (tag.offset - offset)}`);
                throw new Error(`Invalid wire type: ${wireType}`);
            }

            switch (wireType) {
                case WireType.VARINT:
                    const varint = decodeVarint(buffer, offset);
                    offset = varint.offset;
                    result[fieldNumber] = varint.value;
                    console.log(`[ProtoWrapper] VARINT value: ${varint.value}`);
                    break;

                case WireType.BIT64:
                    const uint64 = buffer.subarray(offset, offset + 8);
                    offset += 8;
                    // 将 64-bit 整数视为两个 32-bit
                    const view = new DataView(uint64.buffer);
                    const low = view.getUint32(0, true);
                    const high = view.getUint32(4, true);
                    result[fieldNumber] = (high >>> 0) * 0x100000000 + (low >>> 0);
                    console.log(`[ProtoWrapper] BIT64 value: ${result[fieldNumber]}`);
                    break;

                case WireType.LENGTH_DELIMITED:
                    const length = decodeVarint(buffer, offset);
                    offset = length.offset;
                    console.log(`[ProtoWrapper] Length-delimited, length: ${length.value}`);

                    if (offset + length.value > buffer.length) {
                        throw new Error(`Length ${length.value} exceeds buffer size ${buffer.length - offset}`);
                    }

                    const bytes = buffer.slice(offset, offset + length.value);
                    offset += length.value;

                    // 尝试解析为字符串
                    try {
                        const str = new TextDecoder('utf-8').decode(bytes);
                        console.log(`[ProtoWrapper] Decoded string: "${str}"`);
                        // 检查是否所有字符都是可打印的
                        if (/^[\x20-\x7E\u4e00-\u9fa5]*$/.test(str)) {
                            result[fieldNumber] = str;
                        } else {
                            result[fieldNumber] = Array.from(bytes);
                            console.log(`[ProtoWrapper] Not printable, storing as array`);
                        }
                    } catch (e) {
                        result[fieldNumber] = Array.from(bytes);
                        console.log(`[ProtoWrapper] String decode failed, storing as array`);
                    }
                    break;

                case WireType.BIT32:
                    const uint32 = buffer.subarray(offset, offset + 4);
                    offset += 4;
                    const view32 = new DataView(uint32.buffer);
                    result[fieldNumber] = view32.getUint32(0, true);
                    console.log(`[ProtoWrapper] BIT32 value: ${result[fieldNumber]}`);
                    break;

                case WireType.START_GROUP:
                case WireType.END_GROUP:
                    console.error(`[ProtoWrapper] ERROR: Group wire type ${wireType} not supported`);
                    throw new Error('Group wire types (3, 4) are deprecated and not supported');

                default:
                    console.error(`[ProtoWrapper] ERROR: Unknown wire type ${wireType}`);
                    throw new Error(`Unknown wire type: ${wireType}`);
            }

            fieldCount++;
            if (fieldCount > 100) {
                console.error('[ProtoWrapper] Too many fields, possible infinite loop');
                throw new Error('Too many fields, possible parse error');
            }
        }

        console.log('[ProtoWrapper] Parse completed, fields:', result);
        return result;
    }

    // 将 JSON 编码为 protobuf
    function encodeProtobuf(json) {
        const buffers = [];

        for (const [fieldNum, value] of Object.entries(json)) {
            const fieldNumber = parseInt(fieldNum);

            if (typeof value === 'number') {
                // Varint 编码
                const tag = (fieldNumber << 3) | WireType.VARINT;
                buffers.push(...encodeVarint(tag));
                buffers.push(...encodeVarint(value));
            } else if (typeof value === 'string') {
                // 字符串编码
                const tag = (fieldNumber << 3) | WireType.LENGTH_DELIMITED;
                buffers.push(...encodeVarint(tag));
                const bytes = new TextEncoder().encode(value);
                buffers.push(...encodeVarint(bytes.length));
                buffers.push(...Array.from(bytes));
            } else if (typeof value === 'boolean') {
                // 布尔值编码为 varint (0 或 1)
                const tag = (fieldNumber << 3) | WireType.VARINT;
                buffers.push(...encodeVarint(tag));
                buffers.push(...encodeVarint(value ? 1 : 0));
            } else if (Array.isArray(value)) {
                // 数组（repeated 字段）
                value.forEach(item => {
                    if (typeof item === 'number') {
                        const tag = (fieldNumber << 3) | WireType.VARINT;
                        buffers.push(...encodeVarint(tag));
                        buffers.push(...encodeVarint(item));
                    } else if (typeof item === 'string') {
                        const tag = (fieldNumber << 3) | WireType.LENGTH_DELIMITED;
                        buffers.push(...encodeVarint(tag));
                        const bytes = new TextEncoder().encode(item);
                        buffers.push(...encodeVarint(bytes.length));
                        buffers.push(...Array.from(bytes));
                    }
                });
            }
        }

        return new Uint8Array(buffers);
    }

    // 解析 proto schema（简化版）
    function parseSchema(schemaText) {
        const messages = {};
        const lines = schemaText.split('\n');

        let currentMessage = null;
        let inMessage = false;

        for (const line of lines) {
            const trimmed = line.trim();

            // 匹配 message 定义
            if (trimmed.match(/^message\s+(\w+)\s*\{/)) {
                const match = trimmed.match(/^message\s+(\w+)\s*\{/);
                if (match) {
                    currentMessage = match[1];
                    messages[currentMessage] = {};
                    inMessage = true;
                }
            } else if (inMessage && trimmed === '}') {
                inMessage = false;
                currentMessage = null;
            } else if (inMessage && currentMessage) {
                // 解析字段定义
                // 支持格式：optional string name = 1;
                // 支持格式：string name = 1;
                const fieldMatch = trimmed.match(/(?:optional|repeated|required)?\s*(\w+)\s+(\w+)\s*=\s*(\d+);?/);
                if (fieldMatch) {
                    const [, rule, type, name, num] = fieldMatch;
                    const fieldNumber = parseInt(num);

                    // 按字段号存储，同时保存字段名
                    messages[currentMessage][fieldNumber] = {
                        type: type,
                        number: fieldNumber,
                        name: name,
                        rule: rule || 'optional'
                    };
                }
            }
        }

        return { messages };
    }

    return {
        parse: parseSchema,
        decode: function(buffer, schema) {
            return parseProtobuf(buffer);
        },
        encode: function(json, schema) {
            return encodeProtobuf(json);
        }
    };
})();
