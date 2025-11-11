# Mapping Processor

## Overview

Transforms message content using powerful JSONata expressions. Enables complex data transformations, filtering, aggregations, and conditional logic - similar to Benthos Bloblang.

## Configuration

### Required Fields

- `expression`: JSONata expression for message transformation

### Optional Fields

None

## Examples

### Basic Transformation

```yaml
pipeline:
  processors:
    - mapping:
        expression: |
          {
            "fullName": $uppercase(firstName) & " " & $uppercase(lastName),
            "email": $lowercase(email),
            "discountRate": tier = "gold" ? 0.15 : tier = "silver" ? 0.10 : 0.05,
            "total": $sum(items.price),
            "itemCount": $count(items)
          }
```

### E-commerce Order Processing

```yaml
pipeline:
  processors:
    - mapping:
        expression: |
          (
            $subtotal := $sum(items.(price * qty));
            $discount := customer.tier = "gold" ? 0.15 :
                         customer.tier = "silver" ? 0.10 : 0.05;
            $tax := ($subtotal - ($subtotal * $discount)) * 0.0725;

            {
              "orderId": orderId,
              "customer": {
                "fullName": $uppercase(customer.firstName) & " " & $uppercase(customer.lastName),
                "email": $lowercase(customer.email),
                "discountRate": $discount * 100 & "%"
              },
              "pricing": {
                "subtotal": $subtotal,
                "discount": $subtotal * $discount,
                "tax": $tax,
                "total": $subtotal - ($subtotal * $discount) + $tax
              },
              "itemCount": $count(items)
            }
          )
```

### IoT Sensor Aggregation

```yaml
pipeline:
  processors:
    - mapping:
        expression: |
          (
            $readings := readings;
            $avgTemp := $average($readings.temp);
            $maxTemp := $max($readings.temp);

            {
              "device": {
                "id": deviceId,
                "location": location.building & "/" & location.floor & "/" & location.room
              },
              "analysis": {
                "temperature": {
                  "average": $round($avgTemp, 1),
                  "max": $maxTemp,
                  "min": $min($readings.temp),
                  "trend": $readings[-1].temp > $readings[0].temp ? "rising" : "falling"
                }
              },
              "alert": $maxTemp > 25 ? {
                "severity": $maxTemp > 27 ? "critical" : "warning",
                "message": "High temperature detected"
              } : null
            }
          )
```

### Data Filtering and Selection

```yaml
pipeline:
  processors:
    - mapping:
        expression: |
          {
            "activeUsers": users[status = "active"],
            "premiumUsers": users[tier = "premium"]{
              "name": name,
              "email": email
            },
            "totalActive": $count(users[status = "active"])
          }
```

### String Manipulation

```yaml
pipeline:
  processors:
    - mapping:
        expression: |
          {
            "slug": $lowercase($replace(title, ' ', '-')),
            "preview": $substring(description, 0, 100) & "...",
            "tags": $split(tagString, ',').$trim($)
          }
```

## Features

- **Full JSONata Expression Support**: Complete JSONata language
- **Variable Assignments**: Use `:=` for intermediate calculations
- **Conditional Logic**: Ternary operators, if/then/else
- **String Operations**: uppercase, lowercase, substring, replace, split, trim
- **Array Operations**: map, filter, reduce, sort, count, sum, average
- **Math Operations**: +, -, *, /, $round, $floor, $ceil, $abs
- **Access to Metadata**: Use `$meta` to access message metadata
- **Access to Message Info**: Use `$message` for id, timestamp, correlationId
- **Nested Transformations**: Deep object and array transformations
- **Type Conversions**: String to number, date formatting, etc.

## JSONata Language Basics

### Accessing Fields

```javascript
name                    // Access field
user.name               // Nested field
items[0]                // Array index
items[-1]               // Last element
items.price             // Map over array
```

### String Functions

```javascript
$uppercase(name)        // Convert to uppercase
$lowercase(email)       // Convert to lowercase
$substring(text, 0, 10) // Extract substring
$replace(text, 'a', 'b')// Replace text
$split(text, ',')       // Split into array
$trim(text)             // Remove whitespace
& " "                   // String concatenation
```

### Array Functions

```javascript
$count(items)           // Count elements
$sum(items.price)       // Sum values
$average(values)        // Calculate average
$max(values)            // Find maximum
$min(values)            // Find minimum
$sort(items)            // Sort array
items[price > 10]       // Filter array
items{name: name}       // Transform array
```

### Math Functions

```javascript
$round(value, 2)        // Round to 2 decimals
$floor(value)           // Round down
$ceil(value)            // Round up
$abs(value)             // Absolute value
$power(2, 3)            // Exponentiation (2^3)
```

### Conditional Logic

```javascript
x > 10 ? "high" : "low"                    // Ternary operator
tier = "gold" ? 0.15 : tier = "silver" ? 0.10 : 0.05  // Chained
```

### Variables

```javascript
(
  $total := $sum(items.price);
  $tax := $total * 0.0725;

  {
    "total": $total,
    "tax": $tax,
    "grandTotal": $total + $tax
  }
)
```

## Special Variables

### $meta - Message Metadata

```javascript
{
  "correlationId": $meta.correlationId,
  "source": $meta.source,
  "receivedAt": $meta.receivedAt
}
```

### $message - Message Information

```javascript
{
  "messageId": $message.id,
  "timestamp": $message.timestamp,
  "correlationId": $message.correlationId
}
```

## Use Cases

- Complex data transformations
- Field mapping between different schemas
- Data enrichment and calculation
- Filtering and selecting data
- Aggregating arrays of data
- String manipulation and formatting
- Conditional transformations
- Event normalization
- API response transformation
- ETL pipelines

## Best Practices

- **Use Variables**: For complex calculations, use `:=` to store intermediate results
- **Keep Expressions Readable**: Use multi-line format with proper indentation
- **Test Incrementally**: Build complex expressions step by step
- **Handle Nulls**: Use conditional operators to handle missing fields
- **Comment Complex Logic**: Add YAML comments to explain transformations
- **Validate Output**: Ensure output matches expected schema

## Performance Considerations

- JSONata expressions are evaluated for each message
- Complex expressions with large arrays may impact performance
- Consider using multiple simple processors instead of one complex mapping
- Test with representative data volumes

## Troubleshooting

### Expression Errors

- Verify JSONata syntax (parentheses, brackets, quotes)
- Check field names match input data
- Use simple expressions first, then add complexity
- Test expressions with sample data

### Null/Undefined Results

- Check that input fields exist
- Use conditional logic: `field ? field : "default"`
- Verify array access doesn't exceed bounds

### Performance Issues

- Profile expression complexity
- Consider breaking into multiple mapping processors
- Cache calculated values in variables
- Reduce array transformations when possible

## Testing JSONata Expressions

You can test JSONata expressions online at [https://try.jsonata.org](https://try.jsonata.org) before using them in your pipeline.

## See Also

- [Metadata Processor](metadata.md) - Add correlation IDs accessible in mapping
- [Uppercase Processor](uppercase.md) - Simple field transformation alternative
- [Logging Processor](logging.md) - Debug mapping output
- [Bloblang Integration](../advanced/bloblang.md) - Alternative transformation syntax
- [JSONata Documentation](https://docs.jsonata.org) - Full language reference
