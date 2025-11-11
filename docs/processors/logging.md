# Logging Processor

## Overview

Logs messages as they pass through the pipeline for debugging, monitoring, and observability. Essential for understanding message flow and troubleshooting issues in development and production.

## Configuration

### Required Fields

None - works with default settings

### Optional Fields

- `level`: Log level - "debug", "info", "warn", "error" (default: "info")
- `include_content`: Whether to include full message content in logs (default: true)

## Examples

### Basic Example

```yaml
pipeline:
  processors:
    - log:
        level: "info"
        include_content: true
```

### Debug Logging (Development)

```yaml
pipeline:
  processors:
    - log:
        level: "debug"
        include_content: true
```

### Minimal Logging (Production)

```yaml
pipeline:
  processors:
    - log:
        level: "info"
        include_content: false  # Don't log message content (sensitive data)
```

### Multiple Log Points

```yaml
pipeline:
  processors:
    - log:
        level: "debug"
        include_content: true

    - mapping:
        expression: |
          { "transformed": $uppercase(name) }

    - log:
        level: "info"
        include_content: true  # Log after transformation
```

## Features

- **Configurable Log Levels**: debug, info, warn, error
- **Content Control**: Choose whether to log full message content
- **Metadata Logging**: Always logs correlation IDs and timestamps
- **Non-Blocking**: Minimal performance impact
- **Structured Logging**: JSON-formatted logs for easy parsing

## Log Levels

### debug
- Most verbose
- Use in development
- Includes all message details
- Logs every message

### info (default)
- Standard operational logging
- Use in production
- Logs message flow and key information
- Balance between detail and noise

### warn
- Potential issues
- Use for anomalies that don't stop processing
- Less frequent than info

### error
- Critical issues only
- Use for failures and exceptions
- Should be rare in normal operation

## Use Cases

- **Development**: Debug message transformations and flow
- **Debugging**: Trace specific messages through pipeline
- **Monitoring**: Track message throughput and patterns
- **Audit**: Record message processing for compliance
- **Troubleshooting**: Identify where messages fail or change

## Log Output Example

### With `include_content: true`

```json
{
  "level": "info",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "message": "Processing message",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "messageId": "msg-12345",
  "source": "sqs",
  "content": {
    "orderId": "ORD-001",
    "amount": 100.00
  }
}
```

### With `include_content: false`

```json
{
  "level": "info",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "message": "Processing message",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "messageId": "msg-12345",
  "source": "sqs"
}
```

## Best Practices

### Development
- Use `level: "debug"` and `include_content: true`
- Place logging processors after transformations to see results
- Log before and after complex processors

### Production
- Use `level: "info"` to avoid noise
- Set `include_content: false` if messages contain sensitive data (PII, credentials)
- Log at key pipeline points (entry, major transformations, exit)
- Use correlation IDs to trace messages across services

### Security
- **Never log sensitive data**: passwords, tokens, credit cards
- Use `include_content: false` for sensitive pipelines
- Consider data masking before logging
- Rotate and secure log files

### Performance
- Logging has minimal overhead, but excessive logging can impact performance
- In high-throughput pipelines, limit logging or use sampling
- `include_content: false` reduces log size and I/O

## Logging Strategy

### Typical Pipeline Logging

```yaml
pipeline:
  processors:
    # Log input
    - log:
        level: "debug"
        include_content: true

    # Add metadata
    - metadata:
        correlation_id_field: "correlationId"

    # Transform
    - mapping:
        expression: |
          { "processed": $uppercase(name) }

    # Log after transformation
    - log:
        level: "info"
        include_content: true
```

### Conditional Logging

For conditional logging based on message content, use the mapping processor to add flags:

```yaml
pipeline:
  processors:
    - mapping:
        expression: |
          {
            $: $,
            "_shouldLog": amount > 1000  # Flag large transactions
          }

    - log:
        level: "warn"
        include_content: true  # Will log, but you can filter based on _shouldLog in external log aggregation
```

## Integration with Observability

The logging processor works well with:
- **Log aggregation**: ELK Stack, Splunk, Datadog
- **Correlation IDs**: Trace across services
- **Structured logs**: JSON format for parsing
- **Metrics**: Combine with metrics for full observability

## Troubleshooting

### Logs not appearing

- Verify processor is in pipeline configuration
- Check log level settings on your runtime
- Ensure stdout/stderr is being captured
- For containerized apps, check container logs: `docker logs <container>`

### Too many logs

- Increase log level (debug → info → warn)
- Remove logging processors from hot paths
- Use `include_content: false` to reduce log size
- Implement log sampling for high-throughput pipelines

### Sensitive data in logs

- Set `include_content: false`
- Use mapping processor to redact fields before logging
- Review log retention and access policies

### Performance impact

- `include_content: false` reduces I/O
- Remove debug-level logging in production
- Use asynchronous log handling in your runtime

## See Also

- [Metadata Processor](metadata.md) - Add correlation IDs for tracing
- [Mapping Processor](mapping.md) - Transform before logging
- [Advanced Topics](../advanced/bloblang.md) - Complex transformations
