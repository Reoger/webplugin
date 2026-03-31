# PB Converter UI Redesign — A1 Minimalist Single-Column

## Goal
Simplify the Chrome extension popup UI so that the most common action (paste data → parse) takes minimal effort, while secondary features (file upload, encode mode, schema management) are accessible but not prominent.

## Approved Design

### Layout (top to bottom)
1. **Header** — Compact bar: "PB Converter" logo + ⚙️ settings icon on right
2. **Schema row** — One-line: label "Schema" + dropdown selector
3. **Input area** — Format tag pills (Hex/Base64/Binary) + 📁 file button on same row, textarea below. Textarea supports drag-drop .pb files
4. **Action button** — Single centered "解析" button (changes to "编码" in encode mode)
5. **Result** — Compact: title bar with copy/download + JSON output

### Settings Panel (click ⚙️ to toggle)
- Mode switch: "解析 PB → JSON" / "编码 JSON → PB"
- Schema management: Load Example, Manage List (opens modal)

### Removed from main view
- Large Schema Configuration section (replaced by one-line dropdown)
- File upload area (replaced by 📁 button + drag-drop on textarea)
- Separate text input actions row (Clear/Format removed)
- Result tabs (Debug/Raw tabs removed from main view)

### Interaction flow
- **Parse**: Paste Hex/Base64 → click 解析 → see JSON result
- **File**: Click 📁 or drag .pb onto textarea → click 解析 → see JSON result
- **Encode**: ⚙️ → switch to encode mode → paste JSON → click 编码 → see Base64/Hex + download
- **Schema**: Dropdown to switch, ⚙️ → manage schemas

## Files to modify
- `popup/popup.html` — Restructure HTML
- `popup/popup.css` — Rewrite styles for compact layout
- `popup/popup.js` — Update JS for new UI elements and interactions
