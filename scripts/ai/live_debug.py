#!/usr/bin/env python3
"""
Clearpoint AI — Live Debug (Direct Display)
Shows camera feeds with YOLO detections on the Mini PC screen.

Run:  python3 ~/clearpoint-ai/live_debug.py
Keys:  1-4 = switch camera | Q = quit | S = save screenshot
"""

import sys
import json
import time
import threading
from pathlib import Path

import cv2
import numpy as np

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

COLORS = {
    "person": (0, 255, 0),
    "bicycle": (0, 140, 255), "car": (0, 140, 255), "motorcycle": (0, 140, 255),
    "bus": (0, 140, 255), "train": (0, 140, 255), "truck": (0, 140, 255),
    "bird": (255, 200, 0), "cat": (255, 200, 0), "dog": (255, 200, 0),
}
DEFAULT_COLOR = (200, 200, 200)


def load_model(model_path):
    try:
        from openvino.runtime import Core
        ie = Core()
        compiled = ie.compile_model(str(model_path), "AUTO")
        infer_request = compiled.create_infer_request()
        print("✅ Model loaded with OpenVINO")
        return ("openvino", compiled, infer_request)
    except Exception:
        pass
    try:
        import onnxruntime as ort
        session = ort.InferenceSession(str(model_path))
        print("✅ Model loaded with ONNX Runtime")
        return ("onnx", session, None)
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        sys.exit(1)


def preprocess(img, input_size=640):
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = img_rgb.shape[:2]
    ratio = min(input_size / h, input_size / w)
    new_h, new_w = int(h * ratio), int(w * ratio)
    resized = cv2.resize(img_rgb, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    padded = np.full((input_size, input_size, 3), 114, dtype=np.uint8)
    padded[:new_h, :new_w, :] = resized
    blob = padded.transpose(2, 0, 1).astype(np.float32) / 255.0
    return np.expand_dims(blob, axis=0), ratio


def run_inference(model_info, blob):
    backend, model, infer_req = model_info
    if backend == "openvino":
        infer_req.infer({0: blob})
        return infer_req.get_output_tensor(0).data.copy()
    else:
        input_name = model.get_inputs()[0].name
        return model.run(None, {input_name: blob})[0]


def postprocess(output, ratio, img_shape, conf_thresh=0.25):
    preds = output[0]
    if preds.shape[0] < preds.shape[1]:
        preds = preds.T
    if len(preds) == 0:
        return []

    boxes_cxcywh = preds[:, :4]
    class_scores = preds[:, 4:]
    class_ids = class_scores.argmax(axis=1)
    scores = class_scores[np.arange(len(class_ids)), class_ids]

    mask = scores > conf_thresh
    if not mask.any():
        return []

    boxes_cxcywh = boxes_cxcywh[mask]
    scores_f = scores[mask]
    class_ids_f = class_ids[mask]
    class_scores_f = class_scores[mask]

    x1 = boxes_cxcywh[:, 0] - boxes_cxcywh[:, 2] / 2
    y1 = boxes_cxcywh[:, 1] - boxes_cxcywh[:, 3] / 2
    x2 = boxes_cxcywh[:, 0] + boxes_cxcywh[:, 2] / 2
    y2 = boxes_cxcywh[:, 1] + boxes_cxcywh[:, 3] / 2
    boxes = np.stack([x1, y1, x2, y2], axis=1) / ratio

    indices = cv2.dnn.NMSBoxes(boxes.tolist(), scores_f.tolist(), conf_thresh, 0.45)
    if len(indices) == 0:
        return []

    results = []
    for idx in indices:
        i = idx[0] if isinstance(idx, (list, np.ndarray)) else idx
        cid = int(class_ids_f[i])
        cls_name = COCO_CLASSES[cid] if cid < len(COCO_CLASSES) else f"class_{cid}"

        raw = class_scores_f[i]
        top3_idx = np.argsort(raw)[::-1][:3]
        top3 = [(COCO_CLASSES[int(ti)], float(raw[ti])) for ti in top3_idx]

        bx1, by1, bx2, by2 = boxes[i].astype(int)
        h, w = img_shape[:2]
        bx1, by1 = max(0, bx1), max(0, by1)
        bx2, by2 = min(w, bx2), min(h, by2)

        results.append({
            "class_name": cls_name,
            "confidence": float(scores_f[i]),
            "bbox": (bx1, by1, bx2, by2),
            "top3": top3,
        })
    return results


def draw(frame, detections, cam_name, inference_ms):
    annotated = frame.copy()

    # Top bar
    cv2.rectangle(annotated, (0, 0), (annotated.shape[1], 36), (0, 0, 0), -1)
    info = f"[{cam_name}] YOLO Live | {inference_ms:.0f}ms | {len(detections)} det | Keys: 1-4=cam Q=quit S=save"
    cv2.putText(annotated, info, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 1, cv2.LINE_AA)

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        cls = det["class_name"]
        conf = det["confidence"]
        color = COLORS.get(cls, DEFAULT_COLOR)

        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        label = f"{cls} {conf:.0%}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw + 6, y1), color, -1)
        cv2.putText(annotated, label, (x1 + 3, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

        # Top-3 classes below box
        for j, (cname, cscore) in enumerate(det["top3"]):
            txt = f"  {j+1}. {cname}: {cscore:.2f}"
            cy = y2 + 18 + j * 16
            if cy < annotated.shape[0] - 5:
                cv2.putText(annotated, txt, (x1, cy),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 0), 1, cv2.LINE_AA)

    return annotated


class FrameGrabber:
    """Drains RTSP buffer, keeps only latest frame."""
    def __init__(self, rtsp_url):
        self.cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.frame = None
        self.ret = False
        self.lock = threading.Lock()
        self.running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        while self.running:
            if self.cap is None or not self.cap.isOpened():
                break
            try:
                ret, frame = self.cap.read()
                if ret:
                    with self.lock:
                        self.frame = frame
                        self.ret = True
                else:
                    time.sleep(0.05)
            except Exception:
                break
        # Release inside the thread that owns it
        try:
            if self.cap is not None:
                self.cap.release()
        except Exception:
            pass

    def get(self):
        with self.lock:
            if self.ret and self.frame is not None:
                return True, self.frame.copy()
            return False, None

    def stop(self):
        self.running = False
        self._thread.join(timeout=3)


def main():
    config_path = Path.home() / "clearpoint-core" / "ai-config.json"
    if not config_path.exists():
        print(f"❌ Config not found: {config_path}")
        sys.exit(1)

    config = json.loads(config_path.read_text())
    cameras = config.get("cameras", [])
    if not cameras:
        print("❌ No cameras")
        sys.exit(1)

    model_path = Path(__file__).parent / "models" / "yolov8s.onnx"
    if not model_path.exists():
        model_path = Path.home() / "clearpoint-ai" / "models" / "yolov8s.onnx"
    if not model_path.exists():
        print("❌ Model not found")
        sys.exit(1)

    model_info = load_model(model_path)

    current_cam = 0
    grabber = None

    print(f"\n📷 {len(cameras)} cameras available:")
    for i, c in enumerate(cameras):
        print(f"   [{i+1}] {c.get('name', c['id'][:8])}")
    print(f"\n🔑 Keys: 1-{len(cameras)}=switch camera | Q=quit | S=save screenshot")
    print("=" * 50)

    window_name = "Clearpoint AI - Live YOLO Debug"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 1280, 720)

    while True:
        cam = cameras[current_cam]
        cam_name = cam.get("name", cam["id"][:8])

        if grabber is None:
            print(f"\n🔌 Connecting to: {cam_name}...")
            grabber = FrameGrabber(cam["rtsp_url"])
            if not grabber.cap.isOpened():
                print(f"❌ Failed to connect to {cam_name}")
                err_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
                cv2.putText(err_frame, f"Cannot connect to: {cam_name}", (50, 360),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2)
                cv2.imshow(window_name, err_frame)
                key = cv2.waitKey(2000) & 0xFF
                if key == ord('q'):
                    break
                grabber.stop()
                grabber = None
                continue
            print(f"🟢 Connected: {cam_name}")
            time.sleep(0.5)  # Let grabber get first frame

        ret, frame = grabber.get()
        if not ret:
            time.sleep(0.1)
            cv2.waitKey(1)
            continue

        # YOLO inference
        blob, ratio = preprocess(frame, 640)
        t0 = time.time()
        output = run_inference(model_info, blob)
        inference_ms = (time.time() - t0) * 1000

        detections = postprocess(output, ratio, frame.shape, conf_thresh=0.25)
        annotated = draw(frame, detections, cam_name, inference_ms)

        cv2.imshow(window_name, annotated)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            path = Path.home() / f"clearpoint-debug-{cam_name}.jpg"
            cv2.imwrite(str(path), annotated)
            print(f"💾 Saved: {path}")
        elif ord('1') <= key <= ord('4'):
            new_cam = key - ord('1')
            if new_cam < len(cameras) and new_cam != current_cam:
                current_cam = new_cam
                if grabber is not None:
                    grabber.stop()
                grabber = None
                print(f"🔄 Switching to camera {new_cam + 1}...")

    if grabber is not None:
        grabber.stop()
    cv2.destroyAllWindows()
    print("🛑 Done")


if __name__ == "__main__":
    main()
