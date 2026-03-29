// Simple Protobuf Parser for Chrome Extension
// 不使用 eval，避免 CSP 问题

const SimpleProto = (function() {
    'use strict';

    // Wire types
    const Varint = 0;
    const Bit64 = 1;
    const Bytes = 2;
    const String = 2; // Same as Bytes
    const Fixed32 = 5;

    // 读取 varint
    function readVarint(buffer, offset) {
        let result = 0;
        let shift = 0;
        let byte;

        do {
            if (offset >= buffer.length) {
                throw new Error('Buffer overflow');
            }
            byte = buffer[offset++];
            result |= (byte & 0x7F) << shift;
            shift += 7;
        } while (byte & 0x80);

        return { value: result, offset: offset };
    }

    // 解析 protobuf 消息
    function parseProtoBuffer(buffer, schema) {
        const result = {};
        let offset = 0;

        while (offset < buffer.length) {
            // 读取 tag
            const tag = readVarint(buffer, offset);
            offset = tag.offset;

            const fieldNumber = tag.value >> 3;
            const wireType = tag.value & 0x07;

            // 根据 wireType 读取值
            switch (wireType) {
                case Varint: // Varint
                    const varint = readVarint(buffer, offset);
                    offset = varint.offset;
                    result[fieldNumber] = varint.value;
                    break;

                case Bit64: // 64-bit
                    offset += 8;
                    result[fieldNumber] = '<64-bit value>';
                    break;

                case Bytes: // Length-delimited
                    const length = readVarint(buffer, offset);
                    offset = length.offset;
                    const bytes = buffer.slice(offset, offset + length.value);
                    offset += length.value;

                    // 尝试解析为字符串
                    try {
                        result[fieldNumber] = new TextDecoder().decode(bytes);
                    } catch (e) {
                        result[fieldNumber] = Array.from(bytes);
                    }
                    break;

                case Fixed32: // 32-bit
                    offset += 4;
                    result[fieldNumber] = '<32-bit value>';
                    break;

                default:
                    throw new Error(`Unknown wire type: ${wireType}`);
            }
        }

        return result;
    }

    // 将 JSON 编码为 protobuf
    function encodeProto(json, schema) {
        const buffers = [];

        for (const [fieldNum, value] of Object.entries(json)) {
            const fieldNumber = parseInt(fieldNum);
            const tag = (fieldNumber << 3) | Varint;

            // 编码 tag
            buffers.push(...encodeVarint(tag));

            // 编码值
            if (typeof value === 'number') {
                buffers.push(...encodeVarint(value));
            } else if (typeof value === 'string') {
                const bytes = new TextEncoder().encode(value);
                buffers.push(...encodeVarint(bytes.length));
                buffers.push(...Array.from(bytes));
            } else if (Array.isArray(value)) {
                // 数组类型
                value.forEach(item => {
                    buffers.push(...encodeVarint(tag));
                    if (typeof item === 'number') {
                        buffers.push(...encodeVarint(item));
                    } else if (typeof item === 'string') {
                        const bytes = new TextEncoder().encode(item);
                        buffers.push(...encodeVarint(bytes.length));
                        buffers.push(...Array.from(bytes));
                    }
                });
            }
        }

        return new Uint8Array(buffers);
    }

    // 编码 varint
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

    // 解析 proto schema (简单实现)
    function parseSchema(schemaText) {
        const messages = {};
        const lines = schemaText.split('\n');

        let currentMessage = null;
        let inMessage = false;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('message ')) {
                const match = trimmed.match(/message\s+(\w+)\s*\{/);
                if (match) {
                    currentMessage = match[1];
                    messages[currentMessage] = {};
                    inMessage = true;
                }
            } else if (inMessage && trimmed === '}') {
                inMessage = false;
                currentMessage = null;
            } else if (inMessage && currentMessage) {
                // 解析字段：optional string name = 1;
                const fieldMatch = trimmed.match(/(optional|repeated|required)?\s*(\w+)\s+(\w+)\s*=\s*(\d+);/);
                if (fieldMatch) {
                    const [, rule, type, name, num] = fieldMatch;
                    messages[currentMessage][name] = {
                        type: type,
                        number: parseInt(num),
                        rule: rule || 'optional'
                    };
                }
            }
        }

        return { messages };
    }

    return {
        parse: parseSchema,
        decode: parseProtoBuffer,
        encode: encodeProto
    };
})();
