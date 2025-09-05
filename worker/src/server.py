# worker/src/server.py
import runpod
from .handler import handler

# Start the RunPod serverless loop with our handler.
runpod.serverless.start({"handler": handler})
