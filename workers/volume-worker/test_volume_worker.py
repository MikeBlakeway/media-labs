#!/usr/bin/env python3
"""
Test script for RunPod Volume Worker
Tests all operations locally or against deployed endpoint
"""

import json
import requests
import time
import os
from typing import Dict, Any

# Configuration
LOCAL_URL = "http://localhost:8000"
RUNPOD_ENDPOINT = None  # Set to your endpoint ID
RUNPOD_API_KEY = None   # Set to your API key

# Use appropriate root path for testing
ROOT = os.environ.get("ROOT", "/runpod-volume")

def test_local(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Test against local handler"""
    response = requests.post(f"{LOCAL_URL}/", json={"input": payload})
    return response.json()

def test_runpod(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Test against RunPod endpoint"""
    if not RUNPOD_ENDPOINT or not RUNPOD_API_KEY:
        raise ValueError("Set RUNPOD_ENDPOINT and RUNPOD_API_KEY")

    headers = {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        f"https://api.runpod.ai/v2/{RUNPOD_ENDPOINT}/runsync",
        headers=headers,
        json={"input": payload}
    )

    result = response.json()
    if result.get("status") == "COMPLETED":
        return result.get("output", {})
    else:
        return {"error": f"RunPod error: {result}"}

def run_test(name: str, payload: Dict[str, Any], use_runpod: bool = False):
    """Run a single test"""
    print(f"\n=== {name} ===")
    print(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        if use_runpod:
            result = test_runpod(payload)
        else:
            result = test_local(payload)

        print(f"Result: {json.dumps(result, indent=2)}")

        if result.get("ok") is False:
            print(f"❌ FAILED: {result.get('error')}")
        else:
            print("✅ SUCCESS")
    except Exception as e:
        print(f"❌ ERROR: {e}")

def main():
    """Run all tests"""
    use_runpod = "--runpod" in __import__("sys").argv

    print("🧪 RunPod Volume Worker Tests")
    print(f"Mode: {'RunPod Endpoint' if use_runpod else 'Local'}")

    # Test ping
    run_test("Ping", {"op": "ping"}, use_runpod)

    # Test mkdir
    run_test("Create Directory", {
        "op": "mkdir",
        "args": {"path": f"{ROOT}/test-dir"}
    }, use_runpod)

    # Test ls
    run_test("List Root", {
        "op": "ls",
        "args": {"path": ROOT}
    }, use_runpod)

    # Test stat
    run_test("Stat Test Dir", {
        "op": "stat",
        "args": {"paths": [f"{ROOT}/test-dir"]}
    }, use_runpod)

    # Test df
    run_test("Disk Usage", {
        "op": "df",
        "args": {"paths": [ROOT]}
    }, use_runpod)

    # Test verify (empty manifest)
    run_test("Verify Empty", {
        "op": "verify",
        "args": {"manifest": []}
    }, use_runpod)

    # Test seed dry run
    run_test("Seed Dry Run", {
        "op": "seed",
        "args": {
            "dryRun": True,
            "manifest": [{
                "repo": "runwayml/stable-diffusion-v1-5",
                "remote": "v1-5-pruned.safetensors",
                "destDir": f"{ROOT}/models/checkpoints",
                "filename": "sd-v1-5.safetensors"
            }]
        }
    }, use_runpod)

    # Test rm dry run
    run_test("Remove Dry Run", {
        "op": "rm",
        "args": {
            "dryRun": True,
            "paths": [f"{ROOT}/test-dir"]
        }
    }, use_runpod)

    # Test gc_cache dry run
    run_test("GC Cache Dry Run", {
        "op": "gc_cache",
        "args": {"dryRun": True, "maxSizeGB": 10}
    }, use_runpod)

    # Test status
    run_test("Status", {"op": "status"}, use_runpod)

    print("\n🎉 All tests completed!")

if __name__ == "__main__":
    main()
