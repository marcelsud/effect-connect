# Effect Connect - Component Catalog

Complete documentation for all inputs, processors, outputs, and advanced features.

## 📥 Inputs

Message sources for your pipelines:

- **[AWS SQS](inputs/sqs.md)** - Read from SQS queues with LocalStack support
- **[Redis Streams](inputs/redis-streams.md)** - Read from Redis Streams (simple or consumer-group mode)

## ⚙️ Processors

Transform and enrich messages:

- **[Metadata](processors/metadata.md)** - Add correlation IDs and timestamps for tracing
- **[Uppercase](processors/uppercase.md)** - Simple field transformation to uppercase
- **[Mapping](processors/mapping.md)** - Complex JSONata transformations and data manipulation
- **[Logging](processors/logging.md)** - Log messages for debugging and monitoring

## 📤 Outputs

Destination systems for processed messages:

- **[AWS SQS](outputs/sqs.md)** - Send to SQS queues (single or batch mode)
- **[Redis Streams](outputs/redis-streams.md)** - Send to Redis Streams with length management

## 🚀 Advanced Features

Production-ready patterns and integrations:

- **[Dead Letter Queue (DLQ)](advanced/dlq.md)** - Handle failures with automatic retries and error enrichment
- **[Backpressure Control](advanced/backpressure.md)** - Control message throughput and concurrency limits
- **[Bloblang Integration](advanced/bloblang.md)** - Use Benthos Bloblang syntax for migrations

## 🛠️ Development

- **[Component Development Guide](COMPONENTS.md)** - Build custom inputs, processors, and outputs

## Quick Links

### By Use Case

**Getting Started:**
- [SQS Input](inputs/sqs.md) → [Metadata Processor](processors/metadata.md) → [Redis Streams Output](outputs/redis-streams.md)

**Data Transformation:**
- [Mapping Processor](processors/mapping.md) - JSONata expressions
- [Uppercase Processor](processors/uppercase.md) - Simple field transforms

**Production Patterns:**
- [DLQ](advanced/dlq.md) - Failure handling
- [Backpressure](advanced/backpressure.md) - Throughput control
- [Redis Consumer Groups](inputs/redis-streams.md#consumer-group-mode) - Distributed processing

**Debugging:**
- [Logging Processor](processors/logging.md) - Debug message flow
- [Metadata Processor](processors/metadata.md) - Add correlation IDs for tracing

### By Technology

**AWS:**
- [SQS Input](inputs/sqs.md)
- [SQS Output](outputs/sqs.md)
- [DLQ with SQS](advanced/dlq.md)

**Redis:**
- [Redis Streams Input](inputs/redis-streams.md)
- [Redis Streams Output](outputs/redis-streams.md)
- [Consumer Groups](inputs/redis-streams.md#consumer-group-mode)

**Transformations:**
- [JSONata Mapping](processors/mapping.md)
- [Bloblang](advanced/bloblang.md)
- [Uppercase](processors/uppercase.md)

## Documentation Structure

Each component page includes:

- **Overview** - What the component does
- **Configuration** - Required and optional fields
- **Examples** - Basic and advanced usage
- **Features** - Key capabilities
- **Use Cases** - When to use this component
- **Troubleshooting** - Common issues and solutions
- **See Also** - Related components

## Contributing

Found an issue or want to improve the docs? Please submit a PR!

- Docs are written in Markdown
- Follow the existing template structure
- Include working examples
- Cross-reference related components

## Need Help?

- Check the [main README](../README.md) for getting started
- Review [example configurations](../configs/)
- See the [Component Development Guide](COMPONENTS.md) for building custom components
