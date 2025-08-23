"""
Media Lab API Service

FastAPI application for orchestrating media generation jobs.
"""

from fastapi import FastAPI
from fastapi.responses import JSONResponse
import uvicorn
import os

# Create FastAPI app
app = FastAPI(
    title="Media Lab API",
    description="API for orchestrating media generation jobs",
    version="0.1.0"
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Media Lab API", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker health checks"""
    return {"status": "healthy", "service": "api"}

@app.get("/jobs")
async def list_jobs():
    """List all jobs (placeholder)"""
    return {"jobs": []}

@app.post("/jobs")
async def create_job():
    """Create a new job (placeholder)"""
    return {"message": "Job creation not implemented yet"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port)