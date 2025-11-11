# Uppercase Processor

## Overview

Transforms specified fields in message content to uppercase. Useful for data normalization, standardization, and simple text transformations.

## Configuration

### Required Fields

- `fields`: Array of field names to transform to uppercase

### Optional Fields

None

## Examples

### Basic Example

```yaml
pipeline:
  processors:
    - uppercase:
        fields: ["name", "title"]
```

### Multiple Fields

```yaml
pipeline:
  processors:
    - uppercase:
        fields: ["firstName", "lastName", "city", "state", "country"]
```

### Single Field

```yaml
pipeline:
  processors:
    - uppercase:
        fields: ["status"]  # Transform status to uppercase
```

## Features

- **Simple Field Transformation**: Converts string fields to uppercase
- **Multiple Fields**: Transform multiple fields in one processor
- **Type-Safe**: Only transforms string fields, ignores others
- **Non-Destructive**: Preserves other message fields
- **Fast**: Minimal performance overhead

## Use Cases

- Normalize user input (names, addresses)
- Standardize status codes or categories
- Format display data
- Data cleaning and preparation
- Consistent text formatting across systems

## Behavior

- **String fields**: Converted to uppercase
- **Non-string fields**: Ignored (not modified)
- **Missing fields**: Ignored (no error)
- **Nested fields**: Not supported (only top-level fields)

## Example Transformation

**Input message:**
```json
{
  "name": "john doe",
  "email": "john@example.com",
  "status": "active",
  "age": 30
}
```

**Configuration:**
```yaml
- uppercase:
    fields: ["name", "status"]
```

**Output message:**
```json
{
  "name": "JOHN DOE",
  "email": "john@example.com",
  "status": "ACTIVE",
  "age": 30
}
```

## Best Practices

- Use early in pipeline for input normalization
- Combine with other processors for complex transformations
- List only fields that should be uppercase (selective)
- Consider using [Mapping Processor](mapping.md) for more complex transformations

## Limitations

- **Top-level fields only**: Cannot transform nested fields
- **Arrays not supported**: Cannot transform array elements
- **No conditional logic**: Always transforms specified fields
- **Strings only**: Non-string fields are ignored

For more complex transformations including nested fields, arrays, and conditional logic, use the [Mapping Processor](mapping.md).

## Troubleshooting

### Fields not being transformed

- Verify field names are spelled correctly
- Check that fields exist in the message content
- Ensure fields contain string values (numbers/booleans are ignored)
- Verify processor is in the pipeline

### Nested fields not working

- Use [Mapping Processor](mapping.md) for nested field transformations
- Example: `{"user": {"name": "john"}}` cannot be transformed with uppercase processor

## See Also

- [Mapping Processor](mapping.md) - Complex transformations with JSONata
- [Metadata Processor](metadata.md) - Add correlation IDs and timestamps
- [Logging Processor](logging.md) - Log transformed messages
