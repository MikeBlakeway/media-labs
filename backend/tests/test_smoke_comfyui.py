import os
import json
import requests
import pytest


BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")


def minimal_prompt_payload():
    # Minimal graph: LoadImage -> PreviewImage using the example input image
    # Node ids are arbitrary strings; ComfyUI requires each node to include class_type and inputs
    return {
        "prompt": {
            "1": {
                "class_type": "LoadImage",
                "inputs": {
                    "path": "/opt/comfyui/input/example.png"
                }
            },
            "2": {
                "class_type": "PreviewImage",
                "inputs": {"image": {"node_id": "1", "output_name": "image"}}
            },
        }
    }


@pytest.mark.smoke
def test_smoke_post_minimal_prompt():
    # Quick health check: if backend isn't running, skip the smoke test.
    health_url = f"{BACKEND_URL.rstrip('/')}/health"
    try:
        h = requests.get(health_url, timeout=3)
    except requests.exceptions.RequestException as e:
        pytest.skip(f"Backend not reachable at {health_url}: {e}")
    if h.status_code != 200:
        pytest.skip(f"Backend health check failed ({h.status_code}) at {health_url}")

    url = f"{BACKEND_URL.rstrip('/')}/generate"
    payload = minimal_prompt_payload()
    headers = {"Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)

    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}: {resp.text}"

    # Response should be JSON with a prompt_id when ComfyUI accepted the prompt
    data = resp.json()
    assert isinstance(data, dict), f"Expected JSON object, got: {data}"
    assert "prompt_id" in data, f"Response JSON missing prompt_id: {data}"
