# Effect Connect

Declarative streaming library powered by Effect.js, inspired by Apache Camel and Benthos.

Build type-safe data pipelines with YAML configuration for message processing.

## Features

- **Declarative YAML Configuration** - Define pipelines without code
- **Type-Safe** - Built with TypeScript and Effect.js for compile-time safety
- **Stream Processing** - Handle high-throughput message streams efficiently
- **Backpressure Control** - Prevent overwhelming downstream systems
- **Dead Letter Queue (DLQ)** - Graceful failure handling with automatic retries
- **Built-in Observability** - Automatic metrics, tracing, and correlation IDs
- **Modular Architecture** - Pluggable inputs, processors, and outputs
- **Production-Ready** - Connection pooling, batch processing, error categorization

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Infrastructure

Start LocalStack (SQS) and Redis using Docker Compose:

```bash
docker-compose up -d
```

Services:
- LocalStack (SQS) on port 4566
- Redis on port 6379
- Redis Commander (GUI) on port 8081
- Auto-creates queues: `test-queue`, `input-queue`, `output-queue`, `dlq-queue`

### 3. Run Example Pipeline

```bash
npm run run-pipeline configs/example-pipeline.yaml
```

This pipeline:
1. Reads messages from SQS (LocalStack)
2. Adds metadata and correlation IDs
3. Transforms fields to uppercase
4. Logs each message
5. Sends to Redis Streams

### 4. Verify Results

```bash
docker exec -it effect-connect-redis redis-cli XREAD COUNT 10 STREAMS processed-messages 0
```

Or visit Redis Commander at http://localhost:8081

## Configuration Example

```yaml
input:
  aws_sqs:
    url: "http://localhost:4566/000000000000/input-queue"
    region: "us-east-1"
    endpoint: "http://localhost:4566"
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
    url: "redis://localhost:6379"
    stream: "processed-messages"
    max_length: 10000
    # See docs/outputs/redis-streams.md

# Optional: Dead Letter Queue for failures
dlq:
  aws_sqs:
    url: "http://localhost:4566/000000000000/dlq-queue"
    # See docs/advanced/dlq.md
```

## Components

### 📥 Inputs

- **[AWS SQS](docs/inputs/sqs.md)** - Read from SQS queues (LocalStack compatible)
- **[Redis Streams](docs/inputs/redis-streams.md)** - Read from Redis Streams (simple or consumer-group mode)

### ⚙️ Processors

- **[Metadata](docs/processors/metadata.md)** - Add correlation IDs and timestamps
- **[Uppercase](docs/processors/uppercase.md)** - Transform fields to uppercase
- **[Mapping](docs/processors/mapping.md)** - JSONata transformations (complex data manipulation)
- **[Logging](docs/processors/logging.md)** - Log message flow for debugging

### 📤 Outputs

- **[AWS SQS](docs/outputs/sqs.md)** - Send to SQS queues (single or batch mode)
- **[Redis Streams](docs/outputs/redis-streams.md)** - Send to Redis Streams with length management

### 🚀 Advanced Features

- **[Dead Letter Queue (DLQ)](docs/advanced/dlq.md)** - Handle failures with automatic retries and error enrichment
- **[Backpressure Control](docs/advanced/backpressure.md)** - Control message throughput and concurrency
- **[Bloblang Integration](docs/advanced/bloblang.md)** - Use Benthos Bloblang syntax (for migrations)

## Example Configurations

Explore ready-to-use configurations in `configs/`:

- **[example-pipeline.yaml](configs/example-pipeline.yaml)** - Basic pipeline (SQS → Processors → Redis)
- **[dlq-example.yaml](configs/dlq-example.yaml)** - Dead Letter Queue configuration
- **[backpressure-example.yaml](configs/backpressure-example.yaml)** - Backpressure and batch timeout
- **[advanced-connection.yaml](configs/advanced-connection.yaml)** - Production connection settings

## Docker Commands

Start all services:
```bash
# Using npm scripts
npm run docker:up

# Or directly
docker-compose up -d
```

Stop all services:
```bash
npm run docker:down
```

View logs:
```bash
npm run docker:logs

# Or specific service
docker-compose logs -f localstack
docker-compose logs -f redis
docker-compose logs -f redis-commander
```

Check service health:
```bash
npm run docker:ps
```

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
├── tests/
│   ├── unit/            # Unit tests (154 passing)
│   └── e2e/             # End-to-end tests
└── docker-compose.yml   # LocalStack, Redis, Redis Commander
```

## Development

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm test:unit

# E2E tests only
npm test:e2e

# With coverage
npm test:coverage
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

Configurations are validated using `@effect/schema`:

```typescript
import { Schema } from "@effect/schema"

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

- **Event-Driven Architectures** - Process events between microservices
- **Data Pipelines** - ETL and data transformation workflows
- **Message Queue Processing** - Reliable message consumption and production
- **Stream Processing** - Real-time data processing with backpressure
- **Integration Patterns** - Connect different systems and protocols

## Why Effect Connect?

| Feature | Effect Connect | Benthos | Apache Camel |
|---------|------------------|---------|--------------|
| **Language** | TypeScript | Go | Java/Kotlin |
| **Type Safety** | ✓ (Effect.js) | ✗ | ✓ (with Kotlin) |
| **Configuration** | YAML | YAML | Java/XML/YAML |
| **Streaming** | Effect.js Streams | Native | Camel Streams |
| **Error Handling** | Effect monad | Go errors | Exceptions |
| **LocalStack Support** | ✓ | ✓ | ✓ |
| **Best For** | Node.js projects | Go projects | JVM projects |

## Future Enhancements

- [ ] More inputs (Kafka, HTTP, File, Kinesis)
- [ ] More processors (Filter, Transform, Enrich, Split/Join)
- [ ] More outputs (Postgres, HTTP, S3, Elasticsearch)
- [ ] Circuit breaker pattern
- [ ] Web UI for pipeline management
- [ ] OpenTelemetry exporter integration
- [ ] Kafka Connect compatibility
- [ ] GraphQL processor
- [ ] Rate limiting processor
- [ ] Caching layer

## Documentation

- **[Complete Component Catalog](docs/)** - Detailed documentation for all components
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
