# Endpoint overview

Endpoints are the foundation of Runpod Serverless, serving as the gateway for deploying and managing your Serverless workers. They provide a consistent API interface that allows your applications to interact with powerful computational resources on demand.

Whether you're processing large datasets, running AI inference, or performing compute-intensive tasks, endpoints give you the flexibility to deploy and scale your workloads.

## What are endpoints?

Runpod endpoints are RESTful APIs that accept HTTP requests, execute your code, and return the result via HTTP response. Each endpoint provides a unique URL and abstracts away the complexity of managing infrastructure. Behind the scenes, Runpod handles the entire lifecycle of Serverless workers, including job queuing, execution, and result delivery, so you can focus on your code, not the infrastructure.

## Key features

### Execution modes

Serverless offers **asynchronous processing** via the `/run` endpoint operation, which lets you submit jobs that run in the background and check results later, making this ideal for long-running tasks.

It also provides **synchronous operations** through the `/runsync` endpoint operation, allowing you to receive immediate results in the same request, which is perfect for interactive applications.

To learn more, see [Endpoint operations](/serverless/endpoints/operations).

### Deployment and scaling

Runpod endpoints are **auto-scaling**, automatically scaling from zero to hundreds of workers based on demand. You can **customize your endpoint configuration** to adjust the minimum and maximum worker count, GPU allocation, and memory settings. The system also offers **GPU prioritization**, allowing you to specify preferred GPU types in order of priority.

To learn more, see [Endpoint configurations](/serverless/endpoints/endpoint-configurations).

### Integration options

Runpod endpoints support [webhook notifications](/serverless/endpoints/send-requests#webhook-notifications), allowing you to configure endpoints to call your webhook when jobs complete.

It also includes [S3-compatible storage integration](/serverless/endpoints/send-requests#s3-compatible-storage-integration) for working with object storage for larger inputs and outputs.

## Key concepts

Understanding these fundamental concepts will help you work effectively with Serverless endpoints:

An **endpoint** is a RESTful API, which provides a URL that serves as the entry point for your Serverless worker, allowing you to send requests and receive responses.

A [request](/serverless/endpoints/send-requests) is an HTTP request that you send to an endpoint, which can include parameters, payloads, and headers that define what the endpoint should process. For example, a `POST` request to run a job, or a `GET` request to check status of a job or endpoint health.

When a request is sent to an endpoint, it creates a **job** that gets processed by a worker. **Jobs** can be either synchronous (immediate response) or asynchronous (background processing).

A [worker](/serverless/workers/overview) is the containerized environment that executes your handler code, providing the compute resources (CPU, GPU, memory) needed to process requests.

The [handler function](/serverless/workers/handler-functions) is the code that processes incoming requests and returns responses, defining the business logic of your endpoint.

<Frame>
  <img src="https://mintcdn.com/runpod-b18f5ded/QcR4sHy3480YmZ2d/images/7c4cfa11-serverless-request-flow.png?fit=max&auto=format&n=QcR4sHy3480YmZ2d&q=85&s=80df882db38422564aa2c640c57328a1" width="1302" height="836" data-path="images/7c4cfa11-serverless-request-flow.png" srcset="https://mintcdn.com/runpod-b18f5ded/QcR4sHy3480YmZ2d/images/7c4cfa11-serverless-request-flow.png?w=280&fit=max&auto=format&n=QcR4sHy3480YmZ2d&q=85&s=00373de474fb4f33d0be29bd41991f1a 280w, https://mintcdn.com/runpod-b18f5ded/QcR4sHy3480YmZ2d/images/7c4cfa11-serverless-request-flow.png?w=560&fit=max&auto=format&n=QcR4sHy3480YmZ2d&q=85&s=a5167297f22fa399d383dec687f10f35 560w, https://mintcdn.com/runpod-b18f5ded/QcR4sHy3480YmZ2d/images/7c4cfa11-serverless-request-flow.png?w=840&fit=max&auto=format&n=QcR4sHy3480YmZ2d&q=85&s=efcdf27367ff693272bd72fa9cbe32f1 840w, https://mintcdn.com/runpod-b18f5ded/QcR4sHy3480YmZ2d/images/7c4cfa11-serverless-request-flow.png?w=1100&fit=max&auto=format&n=QcR4sHy3480YmZ2d&q=85&s=9401d1057bb4baefe647fb0ab7168739 1100w, https://mintcdn.com/runpod-b18f5ded/QcR4sHy3480YmZ2d/images/7c4cfa11-serverless-request-flow.png?w=1650&fit=max&auto=format&n=QcR4sHy3480YmZ2d&q=85&s=f6470f3eb467d03c45fe0aaceef6503f 1650w, https://mintcdn.com/runpod-b18f5ded/QcR4sHy3480YmZ2d/images/7c4cfa11-serverless-request-flow.png?w=2500&fit=max&auto=format&n=QcR4sHy3480YmZ2d&q=85&s=46763eae36a059020f0905c44c60a77c 2500w" data-optimize="true" data-opv="2" />
</Frame>

## Getting started

[Follow this step-by-step guide](/serverless/workers/custom-worker) to create your first custom endpoint. This tutorial walks you through the process of setting up your development environment, creating a handler file, testing your endpoint locally, building and deploying a worker image, and sending endpoint requests using the Runpod console.

## Next steps

Dive deeper into what you can achieve with Runpod Serverless endpoints:

- [Deploy a vLLM worker as a Serverless endpoint.](/serverless/vllm/overview)
- [Submit jobs to your Serverless workers.](/serverless/endpoints/operations)
- [Send requests to your endpoints programmatically.](/serverless/endpoints/send-requests)
- [Manage your endpoints using the Runpod console.](/serverless/endpoints/manage-endpoints)
- [Configure your endpoints for optimal performance and cost.](/serverless/endpoints/endpoint-configurations)
