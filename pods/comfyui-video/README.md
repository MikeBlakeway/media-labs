# ComfyUI Video Pod

This directory contains the Docker setup and configuration for the ComfyUI video processing service used in the Media Labs project. The ComfyUI video pod is responsible for generating videos from images using advanced AI models.

## Setup Instructions

1. **Docker Installation**: Ensure that Docker is installed on your machine. You can download it from [Docker's official website](https://www.docker.com/get-started).

2. **Build the Docker Image**: Navigate to the `comfyui-video` directory and build the Docker image using the following command:

   ```bash
   docker build -t comfyui-video .
   ```

3. **Run the Docker Container**: After building the image, you can run the container with:

   ```bash
   docker run -p 8188:8188 comfyui-video
   ```

4. **Access the Service**: Once the container is running, you can access the ComfyUI video service at `<http://localhost:8188>`.

## Configuration

The Dockerfile in this directory sets up the necessary environment for running the ComfyUI video processing service. It installs required dependencies and configures the service to listen for incoming requests.

## Usage

To generate videos, send requests to the service with the appropriate parameters as defined in the Media Labs project specifications. Ensure that you follow the API guidelines for job creation and management.

## Additional Information

For more details on the ComfyUI framework and its capabilities, refer to the [ComfyUI documentation](https://github.com/comfyanonymous/ComfyUI).

This README will be updated as the project evolves and more features are added.
