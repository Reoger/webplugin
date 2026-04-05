// Protobuf Parser Wrapper for Chrome Extension
const ProtoWrapper = (function() {
    'use strict';

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

    const WireType = {
        VARINT: 0,
        BIT64: 1,
        LENGTH_DELIMITED: 2,
        START_GROUP: 3,
        END_GROUP: 4,
        BIT32: 5
    };

    function parseProtobuf(buffer) {
        const result = {};
        let offset = 0;
        let fieldCount = 0;

        while (offset < buffer.length) {
            const tag = decodeVarint(buffer, offset);
            offset = tag.offset;

            const fieldNumber = tag.value >> 3;
            const wireType = tag.value & 0x07;

            if (wireType < 0 || wireType > 5) {
                throw new Error(`Invalid wire type: ${wireType}`);
            }

            switch (wireType) {
                case WireType.VARINT:
                    const varint = decodeVarint(buffer, offset);
                    offset = varint.offset;
                    result[fieldNumber] = varint.value;
                    break;

                case WireType.BIT64:
                    const uint64 = buffer.subarray(offset, offset + 8);
                    offset += 8;
                    const view = new DataView(uint64.buffer);
                    const low = view.getUint32(0, true);
                    const high = view.getUint32(4, true);
                    result[fieldNumber] = (high >>> 0) * 0x100000000 + (low >>> 0);
                    break;

                case WireType.LENGTH_DELIMITED:
                    const length = decodeVarint(buffer, offset);
                    offset = length.offset;

                    if (offset + length.value > buffer.length) {
                        throw new Error(`Length ${length.value} exceeds buffer size ${buffer.length - offset}`);
                    }

                    const bytes = buffer.slice(offset, offset + length.value);
                    offset += length.value;

                    try {
                        const str = new TextDecoder('utf-8').decode(bytes);
                        if (/^[\x20-\x7E\u4e00-\u9fa5]*$/.test(str)) {
                            result[fieldNumber] = str;
                        } else {
                            result[fieldNumber] = Array.from(bytes);
                        }
                    } catch (e) {
                        result[fieldNumber] = Array.from(bytes);
                    }
                    break;

                case WireType.BIT32:
                    const uint32 = buffer.subarray(offset, offset + 4);
                    offset += 4;
                    const view32 = new DataView(uint32.buffer);
                    result[fieldNumber] = view32.getUint32(0, true);
                    break;

                case WireType.START_GROUP:
                case WireType.END_GROUP:
                    throw new Error('Group wire types (3, 4) are deprecated and not supported');

                default:
                    throw new Error(`Unknown wire type: ${wireType}`);
            }

            fieldCount++;
            if (fieldCount > 100) {
                throw new Error('Too many fields, possible parse error');
            }
        }

        return result;
    }

    function encodeProtobuf(json, schema) {
        const buffers = [];
        const errors = [];

        // Build name→number reverse map from schema if available
        const nameToNum = {};
        const nameToDef = {};
        if (schema && typeof schema === 'object') {
            for (const [num, def] of Object.entries(schema)) {
                if (def && def.name) {
                    nameToNum[def.name] = parseInt(num);
                    nameToDef[def.name] = def;
                }
            }
        }

        for (const [key, value] of Object.entries(json)) {
            // Resolve field name → number, or use key directly if numeric
            let fieldNumber = parseInt(key);
            let fieldDef = null;

            if (isNaN(fieldNumber)) {
                // Key is a field name, look up number from schema
                fieldNumber = nameToNum[key];
                fieldDef = nameToDef[key];
                if (fieldNumber === undefined) {
                    continue; // Unknown field, skip
                }
            } else {
                // Key is already a number, look up def
                fieldDef = schema ? schema[fieldNumber] : null;
            }

            // Validate type match
            if (fieldDef) {
                const err = validateFieldType(key, value, fieldDef);
                if (err) { errors.push(err); continue; }
            }

            const wireType = guessWireType(value, fieldDef);
            const tag = (fieldNumber << 3) | wireType;
            buffers.push(...encodeVarint(tag));
            buffers.push(...encodeValue(value, wireType, fieldDef));
        }

        if (errors.length > 0) {
            throw new Error('编码类型错误:\n' + errors.join('\n'));
        }

        return new Uint8Array(buffers);
    }

    function validateFieldType(fieldName, value, fieldDef) {
        const t = fieldDef.type;

        // bool
        if (t === 'bool') {
            if (typeof value !== 'boolean') return `字段 "${fieldName}" 期望 bool，实际 ${typeof value}`;
        }
        // Integer types
        else if (['int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64', 'enum'].includes(t)) {
            if (typeof value !== 'number' || !Number.isInteger(value)) return `字段 "${fieldName}" 期望整数(${t})，实际 ${JSON.stringify(value)}`;
        }
        // Float/double
        else if (['float', 'double', 'fixed32', 'fixed64', 'sfixed32', 'sfixed64'].includes(t)) {
            if (typeof value !== 'number') return `字段 "${fieldName}" 期望数字(${t})，实际 ${typeof value}`;
        }
        // string
        else if (t === 'string') {
            if (typeof value !== 'string') return `字段 "${fieldName}" 期望 string，实际 ${typeof value}`;
        }
        // bytes
        else if (t === 'bytes') {
            if (!Array.isArray(value)) return `字段 "${fieldName}" 期望 bytes(数组)，实际 ${typeof value}`;
        }

        return null; // valid or unknown type, allow
    }

    function guessWireType(value, fieldDef) {
        if (fieldDef) {
            const t = fieldDef.type;
            if (t === 'int32' || t === 'int64' || t === 'uint32' || t === 'uint64' ||
                t === 'sint32' || t === 'sint64' || t === 'bool' || t === 'enum') {
                return WireType.VARINT;
            }
            if (t === 'fixed32' || t === 'sfixed32' || t === 'float') {
                return WireType.BIT32;
            }
            if (t === 'fixed64' || t === 'sfixed64' || t === 'double') {
                return WireType.BIT64;
            }
            if (t === 'string' || t === 'bytes') {
                return WireType.LENGTH_DELIMITED;
            }
            // Nested message types
            if (t !== 'string' && t !== 'bytes' && /^[A-Z]/.test(t)) {
                return WireType.LENGTH_DELIMITED;
            }
        }
        // Fallback: guess from JS type
        if (typeof value === 'boolean') return WireType.VARINT;
        if (typeof value === 'number') return WireType.VARINT;
        if (typeof value === 'string') return WireType.LENGTH_DELIMITED;
        if (typeof value === 'object' && value !== null) return WireType.LENGTH_DELIMITED;
        return WireType.VARINT;
    }

    function encodeValue(value, wireType, fieldDef) {
        const buffers = [];

        if (typeof value === 'boolean') {
            buffers.push(...encodeVarint(value ? 1 : 0));
        } else if (typeof value === 'number') {
            if (wireType === WireType.BIT32) {
                const view = new DataView(new ArrayBuffer(4));
                view.setUint32(0, value, true);
                for (let i = 0; i < 4; i++) buffers.push(view.getUint8(i));
            } else if (wireType === WireType.BIT64) {
                const view = new DataView(new ArrayBuffer(8));
                view.setFloat64(0, value, true);
                for (let i = 0; i < 8; i++) buffers.push(view.getUint8(i));
            } else {
                buffers.push(...encodeVarint(value));
            }
        } else if (typeof value === 'string') {
            const bytes = new TextEncoder().encode(value);
            buffers.push(...encodeVarint(bytes.length));
            buffers.push(...Array.from(bytes));
        } else if (Array.isArray(value)) {
            // Byte array
            buffers.push(...encodeVarint(value.length));
            buffers.push(...value);
        } else if (typeof value === 'object' && value !== null) {
            // Nested message — encode recursively
            const nestedBytes = encodeProtobuf(value, null); // TODO: pass nested schema
            buffers.push(...encodeVarint(nestedBytes.length));
            buffers.push(...Array.from(nestedBytes));
        }

        return buffers;
    }

    function parseSchema(schemaText) {
        const messages = {};
        const lines = schemaText.split('\n');

        let currentMessage = null;
        let inMessage = false;

        for (const line of lines) {
            const trimmed = line.trim();

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
                const fieldMatch = trimmed.match(/(optional|repeated|required)?\s*(\w+)\s+(\w+)\s*=\s*(\d+);?/);
                if (fieldMatch) {
                    const [, rule, type, name, num] = fieldMatch;
                    const fieldNumber = parseInt(num);

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
            return encodeProtobuf(json, schema);
        }
    };
})();
