#!/usr/bin/env python3
"""
Clearpoint AI Detection Engine
Runs on Mini PC — motion detection + YOLOv8s (OpenVINO/ONNX)
Sends alerts to the Clearpoint API when objects are detected.
"""

import os
import sys
import json
import time
import signal
import logging
import base64
import threading
from datetime import datetime, timezone
from pathlib import Path
from io import BytesIO
from collections import defaultdict

import cv2
import numpy as np
import requests

# ─── Logging ────────────────────────────────────────────────
LOG_DIR = Path.home() / "clearpoint-logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("clearpoint-ai")

# ─── COCO class mapping ────────────────────────────────────
# YOLOv8/COCO 80 classes → Clearpoint detection types
COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
    "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
    "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
    "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
    "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush",
]

# Map COCO classes → our detection_type categories
COCO_TO_DETECTION = {}
for i, cls in enumerate(COCO_CLASSES):
    if cls == "person":
        COCO_TO_DETECTION[i] = "person"
    elif cls in ("car", "motorcycle", "bus", "truck", "bicycle"):
        COCO_TO_DETECTION[i] = "vehicle"
    elif cls in ("bird", "cat", "dog", "horse", "sheep", "cow", "elephant",
                 "bear", "zebra", "giraffe"):
        COCO_TO_DETECTION[i] = "animal"

# ─── Bounding box colors per detection type ─────────────────
DETECTION_COLORS = {
    "person": (255, 100, 50),    # Blue (BGR)
    "vehicle": (0, 140, 255),    # Orange
    "animal": (0, 200, 80),      # Green
}
DETECTION_LABELS = {
    "person": "Person",
    "vehicle": "Vehicle",
    "animal": "Animal",
}


def draw_detections(frame: np.ndarray, detections: list) -> np.ndarray:
    """Draw bounding boxes + labels on a copy of the frame."""
    annotated = frame.copy()
    for det in detections:
        bbox = det["bbox"]
        x1, y1, x2, y2 = [int(v) for v in bbox]
        det_type = det["detection_type"]
        color = DETECTION_COLORS.get(det_type, (200, 200, 200))
        label_text = DETECTION_LABELS.get(det_type, det_type)
        conf = det["confidence"]

        # Draw rectangle
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        # Label background
        label = f"{label_text} {conf:.0%}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
        cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 6, y1), color, -1)

        # Label text (white on colored background)
        cv2.putText(annotated, label, (x1 + 3, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)

    return annotated


# ─── Configuration ──────────────────────────────────────────
class Config:
    def __init__(self):
        self.config_path = Path.home() / "clearpoint-core" / "ai-config.json"
        self.env_path = Path.home() / "clearpoint-core" / ".env"

        # API
        self.api_base = "https://www.clearpoint.co.il/api"
        self.device_token = self._load_device_token()

        # Detection settings (defaults, can be overridden per camera)
        self.analysis_fps = 1            # Frames to analyze per second
        self.motion_threshold = 25       # Pixel diff threshold for motion
        self.motion_min_area = 500       # Min contour area to count as motion
        self.motion_blur_size = 21       # Gaussian blur kernel size
        self.default_confidence = 0.45   # Min YOLOv8 confidence
        self.cooldown_seconds = 60       # 1 min cooldown per camera+type (server enforces rule cooldown)
        self.periodic_scan_interval = 10  # Run YOLO every N seconds even without motion

        # Model
        self.model_path = Path(__file__).parent / "models" / "yolov8s.onnx"
        self.model_input_size = (640, 640)

        # Snapshot
        self.snapshot_dir = Path.home() / "clearpoint-snapshots"
        self.snapshot_dir.mkdir(exist_ok=True)
        self.max_snapshots = 500  # Keep last N snapshots

        # Cameras
        self.cameras = self._load_cameras()

        log.info(f"Loaded {len(self.cameras)} cameras")

    def _load_device_token(self) -> str:
        token = os.environ.get("CLEARPOINT_DEVICE_TOKEN", "")
        if not token and self.env_path.exists():
            for line in self.env_path.read_text().splitlines():
                if line.startswith("CLEARPOINT_DEVICE_TOKEN="):
                    token = line.split("=", 1)[1].strip().strip("'\"")
                    break
        if not token:
            log.error("Missing CLEARPOINT_DEVICE_TOKEN")
            sys.exit(1)
        return token

    def _load_cameras(self) -> list:
        """Load cameras from ai-config.json"""
        if self.config_path.exists():
            try:
                data = json.loads(self.config_path.read_text())
                return data.get("cameras", [])
            except Exception as e:
                log.error(f"Failed to load config: {e}")

        # Auto-discover cameras from camera scripts
        cameras = []
        scripts_dir = Path.home() / "clearpoint-scripts"
        if scripts_dir.exists():
            for script in sorted(scripts_dir.glob("camera-*.sh")):
                cam = self._parse_camera_script(script)
                if cam:
                    cameras.append(cam)

        if cameras:
            # Save discovered config
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            self.config_path.write_text(json.dumps(
                {"cameras": cameras, "analysis_fps": self.analysis_fps},
                indent=2
            ))
            log.info(f"Auto-discovered {len(cameras)} cameras, saved config")

        return cameras

    def _parse_camera_script(self, path: Path) -> dict | None:
        """Extract camera info from a camera-*.sh script"""
        text = path.read_text()
        cam = {}
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("CAMERA_ID="):
                cam["id"] = line.split("=", 1)[1].strip('"').strip("'")
            elif line.startswith("RTSP_URL="):
                cam["rtsp_url"] = line.split("=", 1)[1].strip('"').strip("'")
            elif line.startswith("# Name:"):
                cam["name"] = line.split(":", 1)[1].strip()
        if "id" in cam and "rtsp_url" in cam:
            cam.setdefault("name", f"Camera {cam['id'][:8]}")
            return cam
        return None


# ─── YOLOv8s Model ────────────────────────────────────────
class YOLOv8Detector:
    def __init__(self, config: Config):
        self.config = config
        self.model = None
        self.use_openvino = False
        self._lock = threading.Lock()
        self._load_model()

    def _load_model(self):
        model_path = str(self.config.model_path)

        if not Path(model_path).exists():
            log.warning(f"Model not found at {model_path}")
            log.warning("Download YOLOv8s: see scripts/ai/setup-ai.sh")
            return

        # Try OpenVINO first (optimized for Intel)
        try:
            from openvino.runtime import Core
            ie = Core()
            compiled = ie.compile_model(model_path, "AUTO")
            self._infer_request = compiled.create_infer_request()
            self.model = compiled
            self.use_openvino = True
            log.info("Loaded YOLOv8s with OpenVINO (Intel optimized)")
            return
        except Exception as e:
            log.info(f"OpenVINO not available ({e}), falling back to ONNX Runtime")

        # Fallback to ONNX Runtime
        try:
            import onnxruntime as ort
            self.model = ort.InferenceSession(model_path)
            self.use_openvino = False
            log.info("Loaded YOLOv8s with ONNX Runtime")
        except Exception as e:
            log.error(f"Failed to load model: {e}")
            self.model = None

    def detect(self, frame: np.ndarray) -> list:
        """Run YOLOv8s inference on a frame.
        Returns list of detections: [{class_id, class_name, detection_type, confidence, bbox}]
        """
        if self.model is None:
            return []

        # Preprocess
        input_h, input_w = self.config.model_input_size
        img, ratio = self._preprocess(frame, input_h, input_w)

        # Inference (thread-safe — single lock for all cameras)
        with self._lock:
            try:
                if self.use_openvino:
                    self._infer_request.infer({0: img})
                    output = self._infer_request.get_output_tensor(0).data.copy()
                else:
                    input_name = self.model.get_inputs()[0].name
                    output = self.model.run(None, {input_name: img})[0]
            except Exception as e:
                log.warning(f"Inference error (skipping frame): {e}")
                return []

        # Postprocess
        detections = self._postprocess(output, ratio, frame.shape)
        return detections

    def _preprocess(self, img: np.ndarray, input_h: int, input_w: int):
        """Resize + letterbox pad + normalize for YOLOv8"""
        # YOLOv8 expects RGB input, OpenCV reads BGR
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]
        ratio = min(input_h / h, input_w / w)
        new_h, new_w = int(h * ratio), int(w * ratio)

        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        padded = np.full((input_h, input_w, 3), 114, dtype=np.uint8)
        padded[:new_h, :new_w, :] = resized

        # HWC → CHW, uint8 → float32, normalize to 0-1
        blob = padded.transpose(2, 0, 1).astype(np.float32) / 255.0
        blob = np.expand_dims(blob, axis=0)

        return blob, ratio

    def _postprocess(self, output: np.ndarray, ratio: float, img_shape: tuple) -> list:
        """Parse YOLOv8 output into detections.
        YOLOv8 output shape: (1, 84, 8400) → transpose to (8400, 84)
        Columns 0-3: cx, cy, w, h (in input-image pixel space)
        Columns 4-83: class scores (no objectness — scores are direct)
        """
        detections = []

        # Handle shape: (1, 84, N) → (N, 84)
        preds = output[0]  # (84, 8400)
        if preds.shape[0] < preds.shape[1]:
            preds = preds.T  # (8400, 84)

        if len(preds) == 0:
            return detections

        # Extract bbox and class scores
        boxes_cxcywh = preds[:, :4]          # cx, cy, w, h
        class_scores = preds[:, 4:]          # 80 class scores

        # Best class per detection
        class_ids = class_scores.argmax(axis=1)
        scores = class_scores[np.arange(len(class_ids)), class_ids]

        # Filter by confidence
        mask = scores > self.config.default_confidence
        if not mask.any():
            return detections

        boxes_cxcywh = boxes_cxcywh[mask]
        scores_filtered = scores[mask]
        class_ids_filtered = class_ids[mask]

        # cx, cy, w, h → x1, y1, x2, y2 (in input space)
        x1 = boxes_cxcywh[:, 0] - boxes_cxcywh[:, 2] / 2
        y1 = boxes_cxcywh[:, 1] - boxes_cxcywh[:, 3] / 2
        x2 = boxes_cxcywh[:, 0] + boxes_cxcywh[:, 2] / 2
        y2 = boxes_cxcywh[:, 1] + boxes_cxcywh[:, 3] / 2
        boxes = np.stack([x1, y1, x2, y2], axis=1) / ratio  # scale to original

        # NMS
        indices = cv2.dnn.NMSBoxes(
            boxes.tolist(),
            scores_filtered.tolist(),
            self.config.default_confidence,
            0.45,
        )

        if len(indices) == 0:
            return detections

        for idx in indices:
            i = idx[0] if isinstance(idx, (list, np.ndarray)) else idx
            class_id = int(class_ids_filtered[i])
            detection_type = COCO_TO_DETECTION.get(class_id)

            if detection_type is None:
                continue  # Skip objects we don't care about

            bx1, by1, bx2, by2 = boxes[i].astype(int)
            h, w = img_shape[:2]
            bx1, by1 = max(0, bx1), max(0, by1)
            bx2, by2 = min(w, bx2), min(h, by2)

            detections.append({
                "class_id": class_id,
                "class_name": COCO_CLASSES[class_id],
                "detection_type": detection_type,
                "confidence": float(scores_filtered[i]),
                "bbox": [int(bx1), int(by1), int(bx2), int(by2)],
            })

        return detections


# ─── Motion Detector ───────────────────────────────────────
class MotionDetector:
    def __init__(self, config: Config):
        self.config = config
        self.prev_gray = None

    def reset(self):
        self.prev_gray = None

    def detect(self, frame: np.ndarray) -> bool:
        """Returns True if significant motion is detected"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (self.config.motion_blur_size,
                                        self.config.motion_blur_size), 0)

        if self.prev_gray is None:
            self.prev_gray = gray
            return False

        delta = cv2.absdiff(self.prev_gray, gray)
        self.prev_gray = gray

        thresh = cv2.threshold(delta, self.config.motion_threshold,
                               255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)

        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL,
                                        cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            if cv2.contourArea(c) > self.config.motion_min_area:
                return True

        return False


# ─── Alert Sender ──────────────────────────────────────────
class AlertSender:
    def __init__(self, config: Config):
        self.config = config
        # Cooldown tracker: {(camera_id, detection_type): last_sent_timestamp}
        self.cooldowns: dict[tuple, float] = {}
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "x-clearpoint-device-token": config.device_token,
        })

    def is_cooled_down(self, camera_id: str, detection_type: str) -> bool:
        key = (camera_id, detection_type)
        last = self.cooldowns.get(key, 0)
        return (time.time() - last) >= self.config.cooldown_seconds

    def send_alert(self, camera_id: str, detection: dict, snapshot: np.ndarray | None):
        detection_type = detection["detection_type"]
        key = (camera_id, detection_type)

        if not self.is_cooled_down(camera_id, detection_type):
            return

        # Save snapshot
        snapshot_path = None
        snapshot_b64 = None
        if snapshot is not None:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{camera_id}_{detection_type}_{ts}.jpg"
            snapshot_path = self.config.snapshot_dir / filename
            cv2.imwrite(str(snapshot_path), snapshot, [cv2.IMWRITE_JPEG_QUALITY, 80])

            # Encode as base64 for API
            _, buf = cv2.imencode(".jpg", snapshot, [cv2.IMWRITE_JPEG_QUALITY, 60])
            snapshot_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

        payload = {
            "camera_id": camera_id,
            "detection_type": detection_type,
            "confidence": detection["confidence"],
            "snapshot_url": f"data:image/jpeg;base64,{snapshot_b64}" if snapshot_b64 else None,
            "message": f"זוהה {detection['class_name']} (ביטחון {detection['confidence']:.0%})",
            "metadata": {
                "class_name": detection["class_name"],
                "class_id": detection["class_id"],
                "bbox": detection["bbox"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "snapshot_file": str(snapshot_path) if snapshot_path else None,
            },
        }

        try:
            resp = self.session.post(
                f"{self.config.api_base}/ingest/alert",
                json=payload,
                timeout=10,
            )
            if resp.ok:
                self.cooldowns[key] = time.time()
                log.info(
                    f"✅ Alert sent: {detection_type} on camera {camera_id[:8]}... "
                    f"({detection['confidence']:.0%})"
                )
            else:
                log.warning(f"Alert API error: {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            log.error(f"Failed to send alert: {e}")

    def cleanup_snapshots(self):
        """Remove old snapshots if over limit"""
        files = sorted(self.config.snapshot_dir.glob("*.jpg"), key=lambda f: f.stat().st_mtime)
        if len(files) > self.config.max_snapshots:
            for f in files[: len(files) - self.config.max_snapshots]:
                f.unlink()


# ─── Camera Monitor (per camera thread) ───────────────────
class CameraMonitor(threading.Thread):
    def __init__(self, camera: dict, config: Config,
                 detector: YOLOv8Detector, sender: AlertSender):
        super().__init__(daemon=True)
        self.camera = camera
        self.config = config
        self.detector = detector
        self.sender = sender
        self.running = True
        self.cam_id = camera["id"]
        self.cam_name = camera.get("name", self.cam_id[:8])

    def stop(self):
        self.running = False

    def run(self):
        log.info(f"📷 Starting monitor: {self.cam_name} ({self.cam_id[:8]}...)")
        frame_interval = 1.0 / self.config.analysis_fps
        retry_delay = 5

        while self.running:
            cap = None
            try:
                rtsp_url = self.camera["rtsp_url"]
                cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 15000)
                cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 15000)

                if not cap.isOpened():
                    log.warning(f"Cannot open stream: {self.cam_name}")
                    time.sleep(retry_delay)
                    retry_delay = min(retry_delay * 2, 60)
                    continue

                retry_delay = 5  # Reset on success
                log.info(f"🟢 Connected: {self.cam_name}")
                consecutive_fails = 0

                while self.running and cap.isOpened():
                    start = time.time()

                    ret, frame = cap.read()
                    if not ret:
                        consecutive_fails += 1
                        if consecutive_fails > 30:
                            log.warning(f"Too many read failures: {self.cam_name}")
                            break
                        time.sleep(0.1)
                        continue

                    consecutive_fails = 0

                    # YOLOv8 inference on every frame — no motion gate
                    try:
                        detections = self.detector.detect(frame)
                    except Exception as e:
                        log.warning(f"Detection error on {self.cam_name}: {e}")
                        detections = []

                    if detections:
                        for d in detections:
                            log.info(f"🎯 {self.cam_name}: {d['detection_type']} {d['confidence']:.0%}")
                        annotated = draw_detections(frame, detections)
                        for det in detections:
                            self.sender.send_alert(self.cam_id, det, annotated)

                    # Maintain target FPS
                    elapsed = time.time() - start
                    sleep_time = frame_interval - elapsed
                    if sleep_time > 0:
                        time.sleep(sleep_time)

            except Exception as e:
                log.error(f"Error in {self.cam_name}: {e}")
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 60)
            finally:
                if cap is not None:
                    cap.release()


# ─── Main Engine ───────────────────────────────────────────
class DetectionEngine:
    def __init__(self):
        self.config = Config()
        self.detector = YOLOv8Detector(self.config)
        self.sender = AlertSender(self.config)
        self.monitors: list[CameraMonitor] = []
        self.running = True

        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

    def _shutdown(self, *_):
        log.info("🛑 Shutting down detection engine...")
        self.running = False
        for m in self.monitors:
            m.stop()

    def start(self):
        if not self.config.cameras:
            log.error("No cameras configured. Run setup-ai.sh or create ai-config.json")
            sys.exit(1)

        if self.detector.model is None:
            log.error("YOLOv8s model not loaded. Run setup-ai.sh to download.")
            sys.exit(1)

        log.info("=" * 50)
        log.info("🚀 Clearpoint AI Detection Engine")
        log.info(f"   Cameras: {len(self.config.cameras)}")
        log.info(f"   Analysis FPS: {self.config.analysis_fps}")
        log.info(f"   Cooldown: {self.config.cooldown_seconds}s")
        log.info(f"   Mode: continuous YOLO (every frame)")
        log.info(f"   Model: {'OpenVINO' if self.detector.use_openvino else 'ONNX Runtime'}")
        log.info("=" * 50)

        # Start a monitor thread per camera
        for cam in self.config.cameras:
            monitor = CameraMonitor(cam, self.config, self.detector, self.sender)
            self.monitors.append(monitor)
            monitor.start()

        # Main loop — periodic maintenance
        cleanup_interval = 3600  # Cleanup snapshots every hour
        last_cleanup = time.time()

        try:
            while self.running:
                time.sleep(5)

                # Check all threads alive
                for m in self.monitors:
                    if not m.is_alive() and self.running:
                        log.warning(f"Restarting dead monitor: {m.cam_name}")
                        new_m = CameraMonitor(m.camera, self.config,
                                              self.detector, self.sender)
                        self.monitors.remove(m)
                        self.monitors.append(new_m)
                        new_m.start()

                # Periodic snapshot cleanup
                if time.time() - last_cleanup > cleanup_interval:
                    self.sender.cleanup_snapshots()
                    last_cleanup = time.time()
        except KeyboardInterrupt:
            self._shutdown()

        # Wait for threads
        for m in self.monitors:
            m.join(timeout=5)

        log.info("✅ Detection engine stopped")


# ─── Entry Point ───────────────────────────────────────────
if __name__ == "__main__":
    engine = DetectionEngine()
    engine.start()
