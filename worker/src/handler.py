# worker/src/handler.py
from __future__ import annotations

import os
import time
import json
import shlex
import subprocess
from typing import Any, Dict, List, Optional

import requests
import runpod

COMFY_DIR = os.getenv("COMFY_DIR", "/opt/ComfyUI")
COMFY_PORT = int(os.getenv("COMFY_PORT", "8188"))
COMFY_ARGS = os.getenv(
    "COMFY_ARGS",
    "--listen 0.0.0.0 --port 8188 --extra-model-paths-config /runpod-volume/ComfyUI/extra_model_paths.yaml",
)

# Allow a longer window on CPU-only runs
COMFY_START_TIMEOUT = int(os.getenv("COMFY_START_TIMEOUT", "240"))

_comfy_proc: Optional[subprocess.Popen[bytes]] = None


def ensure_comfy_ready(timeout_s: int = COMFY_START_TIMEOUT) -> None:
    """Start ComfyUI if not running and wait for HTTP to respond."""
    global _comfy_proc

    # Already running?
    if _comfy_proc and _comfy_proc.poll() is None:
        return

    # Start ComfyUI; inherit stdout/stderr so logs go to container output.
    # IMPORTANT: don't use PIPE unless you plan to read it continuously.
    cmd = ["python3", "main.py"] + shlex.split(COMFY_ARGS)
    _comfy_proc = subprocess.Popen(  # noqa: S603
        cmd,
        cwd=COMFY_DIR,
        stdout=None,
        stderr=None,
    )

    base = f"http://127.0.0.1:{COMFY_PORT}"
    start = time.time()
    last_exc: Optional[Exception] = None

    while time.time() - start < timeout_s:
        # If Comfy exited early, fail fast with its exit code.
        if _comfy_proc.poll() is not None:
            raise RuntimeError(f"ComfyUI exited early with code: {_comfy_proc.returncode}")

        try:
            r = requests.get(f"{base}/system_stats", timeout=2)
            if r.ok:
                return
        except Exception as e:  # noqa: BLE001
            last_exc = e

        time.sleep(1)

    raise RuntimeError(f"ComfyUI failed to start in time (waited {timeout_s}s). Last error: {last_exc!r}")


def apply_patches(workflow: Dict[str, Any], patches: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Deep copy workflow and apply node input patches."""
    wf = json.loads(json.dumps(workflow))  # simple safe deep copy
    for p in patches:
        nid = p["nodeId"]
        key = p["inputKey"]
        val = p["value"]
        node = wf.get(nid)
        if not isinstance(node, dict):
            raise ValueError(f"Node {nid} not found")
        inputs = node.get("inputs")
        if not isinstance(inputs, dict):
            raise ValueError(f"Node {nid} has no inputs")
        inputs[key] = val
    return wf


def handler(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Accepts either:
      { "input": { "workflow": {...}, "patches": [...] } }
      or
      { "workflow": {...}, "patches": [...] }
    """
    body = event.get("input", event)
    workflow = body.get("workflow")
    if not isinstance(workflow, dict):
        return {"error": "missing or invalid 'workflow' object"}

    patches = body.get("patches", [])
    if not isinstance(patches, list):
        return {"error": "invalid 'patches' (must be array)"}

    ensure_comfy_ready()

    patched = apply_patches(workflow, patches)

    base = f"http://127.0.0.1:{COMFY_PORT}"
    r = requests.post(f"{base}/prompt", json={"prompt": patched}, timeout=300)
    r.raise_for_status()
    data = r.json()
    return {"status": "SUBMITTED", "comfy": data}


# Start the RunPod serverless loop
runpod.serverless.start({"handler": handler})
