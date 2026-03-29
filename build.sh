#!/bin/bash
VERSION=$(grep version manifest.json | head -1 | awk -F'"' '{print $4}')
ZIP_FILE="pb-converter-extension-v${VERSION}.zip"

echo "Building PB Converter Extension v${VERSION}..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
mkdir -p "$TEMP_DIR"

# Copy files
cp manifest.json "$TEMP_DIR/"
cp -r popup "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"
cp TESTING.md "$TEMP_DIR/" 2>/dev/null || true

# Create zip
cd "$TEMP_DIR"
zip -r "${OLDPWD}/${ZIP_FILE}" .
cd "$OLDPWD"

# Cleanup
rm -rf "$TEMP_DIR"

echo "Created ${ZIP_FILE}"
echo "Ready to upload to Chrome Web Store!"
