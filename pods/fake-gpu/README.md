# Fake GPU Pod Documentation

This directory contains the implementation for the **Fake GPU** service, which simulates GPU processing for testing and development purposes in the Media Labs project.

## Overview

The Fake GPU pod is designed to mimic the behavior of a real GPU processing service without requiring actual GPU resources. This is particularly useful for local development and testing scenarios where GPU access may not be available.

## Features

- Simulates video generation jobs.
- Provides progress updates and completion callbacks.
- Allows for testing of the entire workflow without the need for a physical GPU.

## Setup Instructions

1. **Clone the Repository**: Ensure you have the Media Labs repository cloned to your local machine.

2. **Navigate to the Fake GPU Directory**:

   ```bash
   cd media-labs/pods/fake-gpu
   ```

3. **Build the Docker Image**:
   Use the provided Dockerfile to build the image for the Fake GPU service.

   ```bash
   docker build -t fake-gpu .
   ```

4. **Run the Fake GPU Service**:
   You can run the service using Docker:

   ```bash
   docker run -p 8080:8080 fake-gpu
   ```

5. **Testing the Service**:
   Once the service is running, you can send requests to simulate video generation jobs and receive progress updates.

## Usage

The Fake GPU service can be integrated into your development workflow to test the frontend and backend interactions without needing a real GPU. It will respond to job requests and simulate the processing time, allowing you to verify that your application handles job submissions and status updates correctly.

## Conclusion

The Fake GPU pod is an essential tool for developers working on the Media Labs project, providing a convenient way to test and develop without the overhead of GPU resources.
