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

    function encodeProtobuf(json) {
        const buffers = [];

        for (const [fieldNum, value] of Object.entries(json)) {
            const fieldNumber = parseInt(fieldNum);

            if (typeof value === 'number') {
                const tag = (fieldNumber << 3) | WireType.VARINT;
                buffers.push(...encodeVarint(tag));
                buffers.push(...encodeVarint(value));
            } else if (typeof value === 'string') {
                const tag = (fieldNumber << 3) | WireType.LENGTH_DELIMITED;
                buffers.push(...encodeVarint(tag));
                const bytes = new TextEncoder().encode(value);
                buffers.push(...encodeVarint(bytes.length));
                buffers.push(...Array.from(bytes));
            } else if (typeof value === 'boolean') {
                const tag = (fieldNumber << 3) | WireType.VARINT;
                buffers.push(...encodeVarint(tag));
                buffers.push(...encodeVarint(value ? 1 : 0));
            } else if (Array.isArray(value)) {
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
            return encodeProtobuf(json);
        }
    };
})();
