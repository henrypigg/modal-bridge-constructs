# modal-bridge-constructs

AWS CDK constructs for integrating [Modal](https://modal.com) serverless GPU/CPU functions with AWS services.

Bridge the gap between AWS event sources (S3, SQS, API Gateway, etc.) and Modal's powerful serverless compute platform. Trigger Modal functions from AWS events with full IAM security via OIDC federation.

## Features

- **Event-driven Modal functions** - Trigger Modal functions from any AWS Lambda event source
- **Two integration patterns** - `spawn` for fire-and-forget, `remote` for synchronous responses
- **Secure OIDC authentication** - Modal functions can assume AWS IAM roles without long-lived credentials
- **CDK native** - Familiar patterns like `grantReadWrite()` work seamlessly
- **Automatic secret management** - Modal API tokens stored securely in AWS Secrets Manager

## Installation

```bash
npm install modal-bridge-constructs
```

## Prerequisites

1. **Modal account** - Sign up at [modal.com](https://modal.com)
2. **Modal API token** - Generate at [modal.com/settings](https://modal.com/settings)
3. **A deployed Modal app** - The Modal function you want to invoke must already be deployed
4. **AWS account**

## Quick Start

```typescript
import { ModalFunction, ModalIntegration, ModalSecret } from 'modal-bridge-constructs';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

// Create an S3 bucket that will trigger the Modal function
const bucket = new Bucket(this, 'ImageBucket', {
  bucketName: 'my-image-bucket',
});

// Create the Modal function bridge
const modalFunction = new ModalFunction(this, 'ImageProcessor', {
  functionName: 'process_image', // Name of your Modal function
  integrationPattern: ModalIntegration.Remote,
  modalConfig: {
    appName: 'my-modal-app', // Your Modal app name
    workspaceId: 'ws-abc123', // Your Modal workspace ID
    environment: 'main', // Modal environment
  },
});

// Grant the Modal function access to the bucket via OIDC
bucket.grantReadWrite(modalFunction);

// Trigger on S3 uploads
modalFunction.addEventSource(
  new S3EventSource(bucket, {
    events: [EventType.OBJECT_CREATED],
    filters: [{ prefix: 'uploads/', suffix: '.png' }],
  })
);
```

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  AWS Event  │────▶│   Lambda    │────▶│    Modal    │────▶│  Your Modal │
│  (S3, SQS,  │     │   Bridge    │     │    API      │     │  Function   │
│   etc.)     │     │             │     │             │     │  (GPU/CPU)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                                       │
                           │                                       │
                           ▼                                       ▼
                    ┌─────────────┐                         ┌─────────────┐
                    │  Secrets    │                         │  AWS (S3,   │
                    │  Manager    │                         │  etc.) via  │
                    │  (Token)    │                         │  OIDC       │
                    └─────────────┘                         └─────────────┘
```

1. An AWS event (S3 upload, SQS message, etc.) triggers the Lambda bridge function
2. The Lambda retrieves your Modal API token from Secrets Manager
3. The Lambda invokes your Modal function via the Modal API
4. Your Modal function can access AWS resources using OIDC-based IAM roles (no credentials needed)

## API Reference

### ModalFunction

The main construct that creates a Lambda bridge to invoke Modal functions.

```typescript
new ModalFunction(scope, id, {
  // Required
  functionName: string;              // Name of the Modal function to invoke
  integrationPattern: ModalIntegration;  // Spawn or Remote
  modalConfig: ModalConfig;          // Modal app configuration

  // Optional
  params?: Record<string, any>;      // Static parameters passed to every invocation
  delimiter?: string;                // Delimiter for generated resource names
  executionRole?: Role;              // Custom Lambda execution role
  lambdaRuntime?: Runtime;           // Lambda runtime (default: Python 3.10)
  lambdaTimeout?: Duration;          // Lambda timeout (default: 5 minutes)
  oidcProvider?: OpenIdConnectProvider;  // Existing OIDC provider
});
```

**Methods:**

| Method                   | Description                                  |
| ------------------------ | -------------------------------------------- |
| `addEventSource(source)` | Add an AWS event source (S3, SQS, SNS, etc.) |

### ModalConfig

Configuration for connecting to your Modal app.

```typescript
interface ModalConfig {
  appName: string; // Your Modal app name
  environment: string; // Modal environment (e.g., 'main', 'dev')
  workspaceId: string; // Your Modal workspace ID
  tokenSecret?: Secret; // Optional: existing secret with Modal token. One will be created if not provided.
}
```

**Finding your workspace ID:**

1. Go to [modal.com/settings](https://modal.com/settings)
2. Your workspace ID is shown under "Workspace"

### ModalIntegration

Choose how your Modal function is invoked:

| Pattern                   | Description                              | Use Case                            |
| ------------------------- | ---------------------------------------- | ----------------------------------- |
| `ModalIntegration.Spawn`  | Fire-and-forget async invocation         | Long-running tasks, background jobs |
| `ModalIntegration.Remote` | Synchronous invocation, waits for result | Quick processing, need return value |

### ModalSecret

A helper construct for creating Secrets Manager secrets for Modal tokens.

```typescript
const secret = new ModalSecret(this, 'MyModalSecret', {
  secretName: 'my-modal-token', // Optional custom name
});
```

After deployment, update the secret in AWS Console or CLI with your actual Modal credentials:

```json
{
  "MODAL_TOKEN_ID": "your-token-id",
  "MODAL_TOKEN_SECRET": "your-token-secret"
}
```

## Integration Patterns

### Spawn (Fire-and-Forget)

Use `spawn` when you don't need to wait for the result. The Lambda returns immediately with a function call ID.

```typescript
const modalFunction = new ModalFunction(this, 'BackgroundProcessor', {
  functionName: 'train_model',
  integrationPattern: ModalIntegration.Spawn,
  modalConfig: { ... },
});
```

**Lambda response:**

```json
{
  "status": "Success",
  "response": {
    "function_call_id": "fc-abc123"
  }
}
```

### Remote (Synchronous)

Use `remote` when you need the result of the Modal function. The Lambda waits for completion.

```typescript
const modalFunction = new ModalFunction(this, 'ImageProcessor', {
  functionName: 'process_image',
  integrationPattern: ModalIntegration.Remote,
  modalConfig: { ... },
});
```

**Lambda response:**

```json
{
  "status": "Success",
  "response": {
    "result": { "processed": true, "output_path": "/mnt/output.png" }
  }
}
```

## OIDC Authentication

Modal functions can securely access AWS resources without storing AWS credentials. The construct automatically:

1. Creates an OIDC provider for `oidc.modal.com`
2. Configures the Lambda execution role to be assumable by your specific Modal function
3. Scopes access by workspace, environment, app, and function name

In your Modal function, use `CloudBucketMount` to access S3:

```python
import modal

app = modal.App('my-modal-app')

@app.function(
    volumes={
        "/mnt": modal.CloudBucketMount(
            bucket_name='my-image-bucket',
            oidc_auth_role_arn='arn:aws:iam::123456789:role/ImageProcessor_remote_role'
        )
    }
)
def process_image(event: dict, params: dict):
    # Access S3 files directly via /mnt
    with open('/mnt/uploads/image.png', 'rb') as f:
        # Process the image...
        pass
```

## Event Sources

`ModalFunction` works with any Lambda event source. Common examples:

### S3

```typescript
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

modalFunction.addEventSource(
  new S3EventSource(bucket, {
    events: [EventType.OBJECT_CREATED],
  })
);
```

### SQS

```typescript
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

modalFunction.addEventSource(
  new SqsEventSource(queue, {
    batchSize: 10,
  })
);
```

### API Gateway

```typescript
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

api.root.addMethod('POST', new LambdaIntegration(modalFunction.handler));
```

### Scheduled Events

```typescript
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

new Rule(this, 'ScheduleRule', {
  schedule: Schedule.rate(Duration.hours(1)),
  targets: [new LambdaFunction(modalFunction.handler)],
});
```

## Static Parameters

Pass static parameters that are included with every invocation:

```typescript
const modalFunction = new ModalFunction(this, 'Processor', {
  functionName: 'process',
  integrationPattern: ModalIntegration.Remote,
  modalConfig: { ... },
  params: {
    outputFormat: 'png',
    quality: 95,
    resize: { width: 1920, height: 1080 },
  },
});
```

Your Modal function receives these in the `params` argument:

```python
@app.function()
def process(event: dict, params: dict):
    output_format = params['outputFormat']  # 'png'
    quality = params['quality']              # 95
    # ...
```

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting a PR.

## License

Apache-2.0 - see [LICENSE](LICENSE) for details.
