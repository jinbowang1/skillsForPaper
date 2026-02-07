#!/bin/bash
# Download portable tools for bundling with the Electron app
# Run this before packaging for distribution

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLS_DIR="$SCRIPT_DIR/../tools"

echo "=== Downloading portable tools for bundling ==="

# Create directories
mkdir -p "$TOOLS_DIR/win32/git"
mkdir -p "$TOOLS_DIR/win32/python"
mkdir -p "$TOOLS_DIR/win32/sox"
mkdir -p "$TOOLS_DIR/darwin/python"

# --- Windows Tools ---

# 1. MinGit (portable Git with bash) for Windows
MINGIT_VERSION="2.43.0"
MINGIT_URL="https://github.com/git-for-windows/git/releases/download/v${MINGIT_VERSION}.windows.1/MinGit-${MINGIT_VERSION}-64-bit.zip"
MINGIT_ZIP="$TOOLS_DIR/mingit.zip"

if [ ! -f "$TOOLS_DIR/win32/git/cmd/git.exe" ]; then
    echo "Downloading MinGit ${MINGIT_VERSION} for Windows..."
    curl -L -o "$MINGIT_ZIP" "$MINGIT_URL"
    echo "Extracting MinGit..."
    unzip -q -o "$MINGIT_ZIP" -d "$TOOLS_DIR/win32/git"
    rm "$MINGIT_ZIP"
    echo "MinGit installed to $TOOLS_DIR/win32/git"
else
    echo "MinGit already exists, skipping..."
fi

# 2. Python Embedded for Windows
PYTHON_VERSION="3.11.7"
PYTHON_URL="https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip"
PYTHON_ZIP="$TOOLS_DIR/python-win.zip"

if [ ! -f "$TOOLS_DIR/win32/python/python.exe" ]; then
    echo "Downloading Python ${PYTHON_VERSION} Embedded for Windows..."
    curl -L -o "$PYTHON_ZIP" "$PYTHON_URL"
    echo "Extracting Python..."
    unzip -q -o "$PYTHON_ZIP" -d "$TOOLS_DIR/win32/python"
    rm "$PYTHON_ZIP"

    # Enable pip for embedded Python
    # Remove the "import site" line from python311._pth to allow pip
    PTH_FILE="$TOOLS_DIR/win32/python/python311._pth"
    if [ -f "$PTH_FILE" ]; then
        echo "Enabling site-packages for embedded Python..."
        sed -i.bak 's/#import site/import site/' "$PTH_FILE"
        rm -f "${PTH_FILE}.bak"
    fi

    echo "Python installed to $TOOLS_DIR/win32/python"
else
    echo "Python for Windows already exists, skipping..."
fi

# 3. SoX for Windows
SOX_VERSION="14.4.2"
SOX_URL="https://downloads.sourceforge.net/project/sox/sox/${SOX_VERSION}/sox-${SOX_VERSION}-win32.zip"
SOX_ZIP="$TOOLS_DIR/sox-win.zip"

if [ ! -f "$TOOLS_DIR/win32/sox/sox.exe" ]; then
    echo "Downloading SoX ${SOX_VERSION} for Windows..."
    curl -L -o "$SOX_ZIP" "$SOX_URL"
    echo "Extracting SoX..."
    unzip -q -o "$SOX_ZIP" -d "$TOOLS_DIR/win32"
    # Move contents from sox-version folder to sox folder
    mv "$TOOLS_DIR/win32/sox-${SOX_VERSION}"/* "$TOOLS_DIR/win32/sox/" 2>/dev/null || true
    rm -rf "$TOOLS_DIR/win32/sox-${SOX_VERSION}"
    rm "$SOX_ZIP"
    echo "SoX installed to $TOOLS_DIR/win32/sox"
else
    echo "SoX for Windows already exists, skipping..."
fi

# --- macOS Tools ---

# Python standalone build for macOS (from python-build-standalone project)
# This provides a fully self-contained Python that works without system dependencies
PYTHON_STANDALONE_VERSION="20231002"
PYTHON_STANDALONE_URL="https://github.com/indygreg/python-build-standalone/releases/download/${PYTHON_STANDALONE_VERSION}/cpython-3.11.6+${PYTHON_STANDALONE_VERSION}-aarch64-apple-darwin-install_only.tar.gz"
PYTHON_TAR="$TOOLS_DIR/python-macos.tar.gz"

if [ ! -f "$TOOLS_DIR/darwin/python/bin/python3" ]; then
    echo "Downloading Python standalone for macOS (arm64)..."
    curl -L -o "$PYTHON_TAR" "$PYTHON_STANDALONE_URL"
    echo "Extracting Python..."
    tar -xzf "$PYTHON_TAR" -C "$TOOLS_DIR/darwin"
    mv "$TOOLS_DIR/darwin/python" "$TOOLS_DIR/darwin/python-temp" 2>/dev/null || true
    mv "$TOOLS_DIR/darwin/python-temp" "$TOOLS_DIR/darwin/python" 2>/dev/null || mkdir -p "$TOOLS_DIR/darwin/python"
    rm "$PYTHON_TAR"
    echo "Python installed to $TOOLS_DIR/darwin/python"
else
    echo "Python for macOS already exists, skipping..."
fi

echo ""
echo "=== Tool download complete ==="
echo ""
echo "Windows tools:"
ls -la "$TOOLS_DIR/win32/" 2>/dev/null || echo "  (not downloaded)"
echo ""
echo "macOS tools:"
ls -la "$TOOLS_DIR/darwin/" 2>/dev/null || echo "  (not downloaded)"
echo ""
echo "Next steps:"
echo "1. Run 'npm run package' or 'npm run make' to build the app"
echo "2. The tools will be bundled automatically"
