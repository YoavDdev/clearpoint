#!/bin/bash
#
# Clearpoint AI Detection — Setup Script
# Run this on the Mini PC to install dependencies and download the model.
#

set -e

echo "🤖 Clearpoint AI Detection — Setup (YOLOv8s)"
echo "========================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AI_DIR="$HOME/clearpoint-ai"
MODEL_DIR="$AI_DIR/models"
VENV_DIR="$AI_DIR/venv"

# === Create directories ===
mkdir -p "$AI_DIR" "$MODEL_DIR" "$HOME/clearpoint-snapshots" "$HOME/clearpoint-logs"

# === Copy detection script ===
cp "$SCRIPT_DIR/detect.py" "$AI_DIR/"
cp "$SCRIPT_DIR/requirements.txt" "$AI_DIR/"
echo "📁 Copied files to $AI_DIR"

# === Install system dependencies ===
echo "📦 Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq python3 python3-pip python3-venv libglib2.0-0 \
  libgl1-mesa-glx 2>/dev/null || sudo apt-get install -y -qq libgl1 2>/dev/null || true

# === Create Python venv ===
if [ ! -d "$VENV_DIR" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

# === Install Python packages ===
echo "📦 Installing Python packages..."
pip install --quiet --upgrade pip
pip install --quiet -r "$AI_DIR/requirements.txt"

# === Export YOLOv8s ONNX model ===
MODEL_FILE="$MODEL_DIR/yolov8s.onnx"
IR_FILE="$MODEL_DIR/yolov8s_fp16.xml"

if [ ! -f "$MODEL_FILE" ]; then
    echo "🧠 Exporting YOLOv8s to ONNX (this may take a minute)..."
    pip install --quiet ultralytics
    python3 -c "
from ultralytics import YOLO
import shutil
model = YOLO('yolov8s.pt')
model.export(format='onnx', imgsz=640, simplify=True)
import pathlib
src = pathlib.Path('yolov8s.onnx')
if src.exists():
    shutil.move(str(src), '$MODEL_FILE')
    print('Export complete')
else:
    print('Export failed')
"
    # Cleanup temp files
    rm -f yolov8s.pt
    
    if [ -f "$MODEL_FILE" ]; then
        SIZE=$(du -h "$MODEL_FILE" | cut -f1)
        echo "✅ YOLOv8s ONNX ready: $MODEL_FILE ($SIZE)"
    else
        echo "❌ Failed to export model"
        echo "   Try manually: pip install ultralytics && yolo export model=yolov8s.pt format=onnx"
        echo "   Then move yolov8s.onnx to: $MODEL_FILE"
    fi
else
    echo "✅ ONNX model already exists: $MODEL_FILE"
fi

# === Convert to OpenVINO IR FP16 (faster inference) ===
if [ -f "$MODEL_FILE" ] && [ ! -f "$IR_FILE" ]; then
    echo "⚡ Converting to OpenVINO IR FP16 (2-3x faster)..."
    python3 -c "
import openvino as ov
core = ov.Core()
model = core.read_model('$MODEL_FILE')
ov.save_model(model, '$IR_FILE', compress_to_fp16=True)
print('OpenVINO IR FP16 export complete')
" 2>/dev/null || python3 -c "
from openvino.runtime import Core, serialize
core = Core()
model = core.read_model('$MODEL_FILE')
serialize(model, '$IR_FILE')
print('OpenVINO IR export complete (legacy API)')
" 2>/dev/null || echo "⚠️  OpenVINO IR conversion failed — will use ONNX (still works)"
    
    if [ -f "$IR_FILE" ]; then
        SIZE=$(du -h "$IR_FILE" | cut -f1)
        echo "✅ OpenVINO IR FP16 ready: $IR_FILE ($SIZE)"
    fi
elif [ -f "$IR_FILE" ]; then
    echo "✅ OpenVINO IR already exists: $IR_FILE"
fi

# === Create systemd service ===
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/clearpoint-ai.service > /dev/null <<EOF
[Unit]
Description=Clearpoint AI Detection Engine
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$AI_DIR
ExecStart=$VENV_DIR/bin/python3 $AI_DIR/detect.py
Restart=always
RestartSec=10
Environment=CLEARPOINT_DEVICE_TOKEN=$(grep -E '^CLEARPOINT_DEVICE_TOKEN=' "$HOME/clearpoint-core/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "")

# Logging
StandardOutput=append:$HOME/clearpoint-logs/ai-detect.log
StandardError=append:$HOME/clearpoint-logs/ai-detect-error.log

# Resource limits (200% = 2 full CPU cores)
CPUQuota=200%
MemoryMax=1G

[Install]
WantedBy=multi-user.target
EOF

# === Fix model path symlink ===
DETECT_MODELS="$SCRIPT_DIR/models"
if [ ! -L "$DETECT_MODELS" ] && [ ! -d "$DETECT_MODELS" ]; then
    ln -sf "$MODEL_DIR" "$DETECT_MODELS"
fi

# Also symlink for the copied script
ln -sf "$MODEL_DIR" "$AI_DIR/models"

# === Enable and start service ===
sudo systemctl daemon-reload
sudo systemctl enable clearpoint-ai.service

echo ""
echo "==================================="
echo "✅ Setup complete!"
echo ""
echo "📂 Files:"
echo "   Script:    $AI_DIR/detect.py"
echo "   Model:     $MODEL_FILE (YOLOv8s)"
echo "   Snapshots: $HOME/clearpoint-snapshots/"
echo "   Logs:      $HOME/clearpoint-logs/ai-detect.log"
echo ""
echo "🚀 Commands:"
echo "   Start:     sudo systemctl start clearpoint-ai"
echo "   Stop:      sudo systemctl stop clearpoint-ai"
echo "   Status:    sudo systemctl status clearpoint-ai"
echo "   Logs:      tail -f ~/clearpoint-logs/ai-detect.log"
echo ""
echo "⚙️  Config:   ~/clearpoint-core/ai-config.json"
echo "   (auto-generated from camera scripts on first run)"
echo "==================================="
