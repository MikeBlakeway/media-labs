# Worker Application for Media Labs

This directory contains the worker application for the Media Labs project, responsible for processing jobs related to the image-to-video conversion.

## Overview

The worker application is designed to handle job processing in a scalable manner, utilizing different lanes for various types of tasks. It integrates with GPU resources to perform video generation tasks efficiently.

## Directory Structure

- **src/**: Contains the source code for the worker application.
  - **index.ts**: The entry point for the worker application.
  - **lanes/**: Logic for managing different processing lanes.
  - **runners/**: Runner files that execute specific tasks or jobs.
  - **utils/**: Utility functions used across the worker application.

## Setup & development

Use the repo root scripts or pnpm filtering to run the worker locally.

Install and prepare the workspace (from repo root):

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
```

Build and run the worker:

```bash
pnpm --filter ./apps/worker build
pnpm --filter ./apps/worker start
```

Or run it in development together with other packages using turborepo:

```bash
pnpm run dev
```

## Usage

The worker application listens for job requests and processes them according to the defined lanes. Ensure that the necessary GPU resources are available for video processing tasks.

## Contributing

Contributions to the worker application are welcome! Please follow the project's coding standards and guidelines when making changes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
