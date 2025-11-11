# Metadata Processor

## Overview

Adds correlation IDs and timestamps to messages for tracking and observability. Essential for distributed tracing and debugging message flow through pipelines.

## Configuration

### Required Fields

None - works with default settings

### Optional Fields

- `correlation_id_field`: Field name for correlation ID (default: "correlationId")
- `add_timestamp`: Whether to add processedAt timestamp (default: true)

## Examples

### Basic Example

```yaml
pipeline:
  processors:
    - metadata:
        correlation_id_field: "correlationId"
        add_timestamp: true
```

### Custom Correlation ID Field

```yaml
pipeline:
  processors:
    - metadata:
        correlation_id_field: "traceId"  # Custom field name
        add_timestamp: true
```

### Minimal Configuration (Defaults)

```yaml
pipeline:
  processors:
    - metadata: {}
```

## Features

- **Auto-generated Correlation IDs**: Creates unique IDs if not present
- **Timestamp Addition**: Adds ISO 8601 timestamp to message metadata
- **Preserves Existing Data**: Does not overwrite existing correlation IDs
- **Distributed Tracing**: Enables request tracking across services
- **Lightweight**: Minimal performance overhead

## Use Cases

- Distributed tracing across microservices
- Debugging message flow through pipelines
- Correlating logs and metrics
- Request tracking in event-driven architectures
- Audit trails for message processing

## Metadata Added

This processor adds the following to message metadata:

- `correlationId` (or custom field name): Unique identifier for tracing
- `processedAt`: ISO 8601 timestamp when the processor ran

## Example Output

**Input message:**
```json
{
  "orderId": "12345",
  "amount": 100.00
}
```

**Output message metadata:**
```json
{
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "processedAt": "2025-01-15T10:30:45.123Z",
  "source": "sqs",
  "receivedAt": "2025-01-15T10:30:44.000Z"
}
```

## Best Practices

- Place this processor **early** in your pipeline
- Use consistent `correlation_id_field` names across services
- Always enable `add_timestamp` for debugging
- Include correlation IDs in all log statements
- Use correlation IDs in downstream services

## Troubleshooting

### Correlation ID not appearing

- Verify processor is in the pipeline configuration
- Check the field name matches your expectations
- Ensure no other processor is removing metadata

### Timestamps look incorrect

- Verify system clock is synchronized (NTP)
- Check timezone settings (timestamps are always UTC)
- Ensure no other processor is modifying the timestamp

## See Also

- [Logging Processor](logging.md) - Log messages with correlation IDs
- [Mapping Processor](mapping.md) - Access metadata in transformations
- [Redis Streams Input](../inputs/redis-streams.md) - Automatic metadata from inputs
