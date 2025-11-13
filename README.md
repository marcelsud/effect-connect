# Effect Connect

[![npm version](https://img.shields.io/npm/v/effect-connect.svg)](https://www.npmjs.com/package/effect-connect)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Declarative streaming library powered by Effect.js, inspired by Apache Camel and Benthos.

Build type-safe data pipelines with YAML configuration for message processing.

## Features

- **Declarative YAML Configuration** - Define pipelines without code
- **Type-Safe** - Built with TypeScript and Effect.js for compile-time safety
- **YAML Testing** - Declarative test runner with 10 assertion types
- **Stream Processing** - Handle high-throughput message streams efficiently
- **Backpressure Control** - Prevent overwhelming downstream systems
- **Dead Letter Queue (DLQ)** - Graceful failure handling with automatic retries
- **Built-in Observability** - Automatic metrics, tracing, and correlation IDs
- **Modular Architecture** - Pluggable inputs, processors, and outputs
- **Production-Ready** - Connection pooling, batch processing, error categorization

## Installation

### Option 1: Use with npx (No Installation Required)

```bash
npx effect-connect run my-pipeline.yaml
```

### Option 2: Install Globally

```bash
npm install -g effect-connect
effect-connect run my-pipeline.yaml
```

### Option 3: Install as Project Dependency

```bash
npm install effect-connect
npx effect-connect run my-pipeline.yaml
```

## Quick Start

### 1. Create Your Pipeline Configuration

Create a pipeline configuration file (e.g., `my-pipeline.yaml`):

**Example 1: HTTP Webhook Forwarder**
```yaml
input:
  http:
    port: 8080
    path: "/webhook"

pipeline:
  processors:
    - metadata:
        correlation_id_field: "correlationId"
        add_timestamp: true
    - log:
        level: info

output:
  http:
    url: "https://api.example.com/events"
    method: POST
    headers:
      Content-Type: "application/json"
```

**Example 2: SQS to SQS Pipeline**
```yaml
input:
  aws_sqs:
    url: "https://sqs.us-east-1.amazonaws.com/123456789012/input-queue"
    region: "us-east-1"

pipeline:
  processors:
    - metadata:
        correlation_id_field: "correlationId"

output:
  aws_sqs:
    url: "https://sqs.us-east-1.amazonaws.com/123456789012/output-queue"
    region: "us-east-1"
```

### 2. Run Your Pipeline

```bash
# Using npx (recommended)
npx effect-connect run my-pipeline.yaml

# Or if installed globally
effect-connect run my-pipeline.yaml

# Or using npm script in package.json
npm run pipeline
```

### 3. Test Your HTTP Pipeline

For HTTP input pipelines, send test requests:

```bash
# Start the pipeline
effect-connect run my-pipeline.yaml

# In another terminal, send a test request
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "user_signup", "user_id": 12345}'
```

### 4. CLI Commands

```bash
# Run a pipeline
effect-connect run <config-file.yaml>

# Run with debug logging
effect-connect run <config-file.yaml> --debug

# Show help
effect-connect --help

# Show version
effect-connect --version
```

### 5. Debug Mode

Enable detailed debug logging to troubleshoot pipeline configuration and execution:

```bash
# Enable debug mode
effect-connect run my-pipeline.yaml --debug
```

Debug mode provides:
- **Configuration Details**: View the parsed YAML configuration
- **Pipeline Building**: See how inputs, processors, and outputs are constructed
- **Component Initialization**: Track when components start and connect
- **Processing Flow**: Monitor message flow through the pipeline

Example debug output:
```
DEBUG MODE ENABLED
[23:06:11.565] DEBUG (#1): Loaded config: {
  "input": {
    "http": {
      "port": 8080,
      "host": "0.0.0.0",
      "path": "/webhook"
    }
  },
  ...
}
[23:06:11.565] DEBUG (#1): buildPipeline received config: {...}
[23:06:11.565] DEBUG (#1): buildInput received config: {...}
```

## Programmatic Usage

You can also use Effect Connect as a library in your TypeScript/JavaScript projects:

```typescript
import { loadConfig } from "effect-connect"
import { buildPipeline } from "effect-connect"
import { run } from "effect-connect"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  // Load configuration
  const config = yield* loadConfig("my-pipeline.yaml")

  // Build pipeline
  const pipeline = yield* buildPipeline(config)

  // Run pipeline
  const result = yield* run(pipeline)

  return result
})

// Execute
Effect.runPromise(program)
```

### Local Development

For local development with LocalStack and Redis, see the [Local Development Guide](docs/local-development.md).

## Configuration Example

```yaml
input:
  aws_sqs:
    url: "https://sqs.us-east-1.amazonaws.com/123456789012/input-queue"
    region: "us-east-1"
    # See docs/inputs/sqs.md for all options

pipeline:
  backpressure:
    max_concurrent_messages: 10
    max_concurrent_outputs: 5

  processors:
    - metadata:
        correlation_id_field: "correlationId"
        # See docs/processors/metadata.md

    - mapping:
        expression: |
          {
            "fullName": $uppercase(firstName) & " " & $uppercase(lastName),
            "email": $lowercase(email)
          }
        # See docs/processors/mapping.md

output:
  redis_streams:
    url: "rediss://production-redis.example.com:6379"
    stream: "processed-messages"
    max_length: 10000
    tls: true
    # See docs/outputs/redis-streams.md

# Optional: Dead Letter Queue for failures
dlq:
  aws_sqs:
    url: "https://sqs.us-east-1.amazonaws.com/123456789012/dlq-queue"
    region: "us-east-1"
    # See docs/advanced/dlq.md
```

## Components

### 📥 Inputs

- **[HTTP](docs/inputs/http.md)** - Receive webhook POST requests
- **[AWS SQS](docs/inputs/sqs.md)** - Read from AWS SQS queues
- **[Redis Streams](docs/inputs/redis-streams.md)** - Read from Redis Streams (simple or consumer-group mode)
- **[Redis Pub/Sub](docs/inputs/redis-pubsub.md)** - Subscribe to Redis Pub/Sub channels/patterns
- **[Redis Lists](docs/inputs/redis-list.md)** - Pop from Redis Lists (BLPOP/BRPOP queues)

### ⚙️ Processors

- **[Metadata](docs/processors/metadata.md)** - Add correlation IDs and timestamps
- **[Uppercase](docs/processors/uppercase.md)** - Transform fields to uppercase
- **[Mapping](docs/processors/mapping.md)** - JSONata transformations (complex data manipulation)
- **[HTTP](docs/processors/http.md)** - Call external APIs for enrichment and validation
- **[Logging](docs/processors/logging.md)** - Log message flow for debugging

### 📤 Outputs

- **[HTTP](docs/outputs/http.md)** - Send to HTTP/HTTPS endpoints (webhooks, APIs)
- **[AWS SQS](docs/outputs/sqs.md)** - Send to SQS queues (single or batch mode)
- **[Redis Streams](docs/outputs/redis-streams.md)** - Send to Redis Streams with length management
- **[Redis Pub/Sub](docs/outputs/redis-pubsub.md)** - Publish to Redis Pub/Sub channels
- **[Redis Lists](docs/outputs/redis-list.md)** - Push to Redis Lists (LPUSH/RPUSH queues)

### 🚀 Advanced Features

- **[Dead Letter Queue (DLQ)](docs/advanced/dlq.md)** - Handle failures with automatic retries and error enrichment
- **[Backpressure Control](docs/advanced/backpressure.md)** - Control message throughput and concurrency
- **[Bloblang Integration](docs/advanced/bloblang.md)** - Use Benthos Bloblang syntax (for migrations)

## Example Configurations

Explore ready-to-use configurations in `configs/`:

- **[http-webhook-example.yaml](configs/http-webhook-example.yaml)** - HTTP webhook server forwarding to HTTP endpoint
- **[example-pipeline.yaml](configs/example-pipeline.yaml)** - Basic pipeline (SQS → Processors → Redis)
- **[dlq-example.yaml](configs/dlq-example.yaml)** - Dead Letter Queue configuration
- **[backpressure-example.yaml](configs/backpressure-example.yaml)** - Backpressure and batch timeout
- **[advanced-connection.yaml](configs/advanced-connection.yaml)** - Production connection settings

## Project Structure

```
effect-connect/
├── src/
│   ├── core/              # Pipeline orchestration, types, config loader
│   ├── inputs/            # SQS, Redis Streams
│   ├── processors/        # Metadata, Uppercase, Mapping, Logging
│   ├── outputs/           # SQS, Redis Streams
│   └── cli.ts            # CLI entry point
├── docs/
│   ├── inputs/           # Detailed input documentation
│   ├── processors/       # Detailed processor documentation
│   ├── outputs/          # Detailed output documentation
│   ├── advanced/         # DLQ, Backpressure, Bloblang guides
│   └── COMPONENTS.md     # Component development guide
├── configs/              # Example pipeline configurations
└── tests/
    ├── unit/            # Unit tests (154 passing)
    └── e2e/             # End-to-end tests
```

## Development

### Testing

Effect Connect uses a scalable testing strategy that avoids N×N test explosion:

```typescript
import { Effect } from "effect"
import {
  createGenerateInput,
  createCaptureOutput,
  createPipeline,
  runPipeline
} from "effect-connect"

// Generate test messages
const input = createGenerateInput({
  count: 5,
  template: {
    id: "msg-{{index}}",
    value: "{{random}}"
  }
})

// Capture output for assertions
const output = await Effect.runPromise(createCaptureOutput())

// Test your component
const pipeline = createPipeline({
  name: "test",
  input,
  processors: [yourProcessor],
  output
})

await Effect.runPromise(runPipeline(pipeline))

const messages = await Effect.runPromise(output.getMessages())
expect(messages).toHaveLength(5)
```

**Key Benefits:**
- ✅ Test components in isolation
- ✅ No external dependencies needed
- ✅ Linear test growth: N components = ~3N tests (not N²)
- ✅ Fast execution: 228 tests in < 10 seconds

#### YAML Testing

Test complete pipelines declaratively with YAML:

```yaml
name: Uppercase Processor Tests

tests:
  - name: "Should uppercase specified fields"
    pipeline:
      input:
        generate:
          count: 1
          template:
            name: "john doe"
            city: "new york"

      processors:
        - uppercase:
            fields: [name, city]

      output:
        capture: {}

    assertions:
      - type: message_count
        expected: 1
      - type: field_value
        message: 0
        path: content.name
        expected: "JOHN DOE"
```

Run YAML tests with:
```bash
effect-connect test "tests/**/*.yaml"
```

**See [docs/TESTING.md](./docs/TESTING.md) for complete testing guide.**

### Run Tests

```bash
# All unit tests
npm run test

# Unit tests only
npm run test:unit

# E2E tests only
npm run test:e2e

# YAML declarative tests
effect-connect test "tests/yaml/**/*.yaml"

# With coverage
npm run test:coverage
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Architecture

Effect Connect uses a functional, type-safe architecture powered by Effect.js:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Pipeline                                 │
│                                                                   │
│  Input Stream  →  Processor₁  →  Processor₂  →  Output          │
│      ↓              ↓              ↓              ↓              │
│   Effect.Stream   Effect      Effect         Effect             │
│                                                                   │
│  Backpressure ←──────────────────────────────────────           │
│  DLQ          ←────────────────────────────────────────         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

- **Effect.js Foundation**: All components use Effect monad for error handling
- **Stream Processing**: Inputs produce `Stream<Message>`, processors transform via `Effect<Message>`
- **Type Safety**: Full TypeScript types with Effect.js schema validation
- **Resource Management**: Automatic cleanup with Effect's resource management
- **Observability**: Built-in metrics, tracing, and correlation IDs

For more details, see [Component Development Guide](docs/COMPONENTS.md).

## Effect.js Integration

Effect Connect is built on [Effect.js](https://effect.website/), a powerful library for functional programming in TypeScript:

- **Error Handling**: Type-safe errors with automatic retry logic
- **Resource Management**: Automatic cleanup of connections and resources
- **Concurrency**: Built-in backpressure and concurrent processing
- **Composability**: Pipeline components compose naturally with Effect operators
- **Observability**: Automatic spans, traces, and metrics collection

### Configuration Validation

Configurations are validated using Effect Schema:

```typescript
import { Schema } from "effect/Schema"

const SqsInputConfig = Schema.Struct({
  url: Schema.String,
  region: Schema.String,
  endpoint: Schema.optional(Schema.String),
  wait_time_seconds: Schema.optional(Schema.Number),
  max_number_of_messages: Schema.optional(Schema.Number),
})
```

This provides:
- Type-safe configuration parsing
- Helpful error messages for invalid configs
- Auto-completion in IDEs
- Compile-time validation

## Use Cases

- **Webhook Forwarding** - Receive webhooks and forward to multiple destinations with transformation
- **Event-Driven Architectures** - Process events between microservices
- **Data Pipelines** - ETL and data transformation workflows
- **Message Queue Processing** - Reliable message consumption and production
- **Stream Processing** - Real-time data processing with backpressure
- **Integration Patterns** - Connect different systems and protocols
- **API Gateway Patterns** - Route and transform HTTP requests to backend services

## Why Effect Connect?

| Feature | Effect Connect | Benthos | Apache Camel |
|---------|------------------|---------|--------------|
| **Language** | TypeScript | Go | Java/Kotlin |
| **Type Safety** | ✓ (Effect.js) | ✗ | ✓ (with Kotlin) |
| **Configuration** | YAML | YAML | Java/XML/YAML |
| **Streaming** | Effect.js Streams | Native | Camel Streams |
| **Error Handling** | Effect monad | Go errors | Exceptions |
| **Observability** | Built-in | ✓ | ✓ |
| **Best For** | Node.js projects | Go projects | JVM projects |

## Future Enhancements

- [x] HTTP input and output
- [ ] More inputs (Kafka, File, Kinesis, WebSocket)
- [ ] More processors (Filter, Transform, Enrich, Split/Join)
- [ ] More outputs (Postgres, S3, Elasticsearch, gRPC)
- [ ] Circuit breaker pattern
- [ ] Web UI for pipeline management
- [ ] OpenTelemetry exporter integration
- [ ] Kafka Connect compatibility
- [ ] GraphQL processor
- [ ] Rate limiting processor
- [ ] Caching layer

## Documentation

- **[Complete Component Catalog](docs/)** - Detailed documentation for all components
- **[Local Development Setup](docs/local-development.md)** - LocalStack and Docker Compose guide
- **[Component Development Guide](docs/COMPONENTS.md)** - Build custom components
- **[Example Configurations](configs/)** - Ready-to-use pipeline examples

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Acknowledgments

- Inspired by [Apache Camel](https://camel.apache.org/)
- Inspired by [Benthos](https://www.benthos.dev/) / [Redpanda Connect](https://www.redpanda.com/connect)
- Built with [Effect.js](https://effect.website/)
- Powered by [JSONata](https://jsonata.org/) for transformations
