# Testing Strategy

This document describes the testing strategy for Effect Connect, designed to scale infinitely without N×N test explosion.

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Testing Utilities](#testing-utilities)
- [Testing Patterns](#testing-patterns)
- [Writing Component Tests](#writing-component-tests)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## The Problem

### N×N Test Explosion

Traditional integration testing creates an explosion of test combinations:

```
3 inputs × 3 outputs = 9 test combinations
10 inputs × 10 outputs = 100 test combinations
13 inputs × 13 outputs = 169 test combinations ❌
```

This approach:
- **Doesn't scale**: Each new component multiplies test count
- **Slow**: Testing every combination takes too long
- **Fragile**: Failures are hard to isolate
- **High cognitive load**: Hard to understand what's being tested

### What We Actually Need to Test

For each component, we need to verify:
- **Inputs**: "Does it read data correctly and produce valid messages?"
- **Processors**: "Does it transform messages correctly?"
- **Outputs**: "Does it write data correctly?"

We don't need to test **every combination** - we need to test **each component in isolation**.

---

## The Solution

### Decoupled Component Testing

Instead of testing N×N combinations, we test:
- **N input tests** (one per input)
- **N processor tests** (one per processor)
- **N output tests** (one per output)
- **~5 E2E tests** (selective real-world scenarios)

**Total: ~3N + 5 tests instead of N² tests** ✅

```
Linear growth: 13 components = ~40 tests
N² growth: 13 components = 169 tests
```

### Testing Utilities

We provide three special components that enable isolated testing:

1. **Generate Input** - Creates test messages without external dependencies
2. **Capture Output** - Collects messages for assertions
3. **Assert Processor** - Validates message structure inline

These utilities eliminate the need for mocking or external services in most tests.

---

## Testing Utilities

### 1. Generate Input

Creates test messages from templates with dynamic placeholders.

**Features:**
- Template-based message generation
- Dynamic placeholders: `{{index}}`, `{{uuid}}`, `{{random}}`, `{{timestamp}}`
- Configurable message count and timing
- Nested object/array support

**Example:**
```typescript
import { createGenerateInput } from "effect-connect"

const input = createGenerateInput({
  count: 10,
  interval: 100, // 100ms between messages (optional)
  template: {
    id: "msg-{{index}}",      // msg-0, msg-1, msg-2, ...
    uuid: "{{uuid}}",          // Unique UUID per message
    amount: "{{random}}",      // Random number (0-999)
    timestamp: "{{timestamp}}", // Current timestamp
    user: {
      name: "User {{index}}"   // Nested templates work too
    }
  }
})
```

**Placeholders:**
- `{{index}}` - Sequential number starting from 0 (or custom start)
- `{{uuid}}` - Unique UUID v4
- `{{random}}` - Random integer 0-999
- `{{timestamp}}` - Current timestamp in milliseconds

### 2. Capture Output

Collects messages in memory for test assertions.

**Features:**
- In-memory message storage
- Retrieve captured messages
- Count messages
- Clear buffer
- Preserves messages after pipeline close

**Example:**
```typescript
import { Effect } from "effect"
import { createCaptureOutput } from "effect-connect"

const output = await Effect.runPromise(createCaptureOutput({
  maxMessages: 1000 // Optional limit (default: 10000)
}))

// ... run pipeline with capture output ...

// Get captured messages
const messages = await Effect.runPromise(output.getMessages())
expect(messages).toHaveLength(10)
expect(messages[0].content.id).toBe("msg-0")

// Get count
const count = await Effect.runPromise(output.getCount())

// Clear for next test
await Effect.runPromise(output.clear())
```

### 3. Assert Processor

Validates message structure and conditions during pipeline execution.

**Features:**
- Field existence validation (including nested paths)
- JSONata condition expressions
- Custom error messages
- Pass-through (doesn't modify messages)

**Example:**
```typescript
import { createAssertProcessor } from "effect-connect"

// Check required fields
const assertFields = createAssertProcessor({
  hasFields: ["id", "amount", "user.name"],
  error: "Missing required fields"
})

// Check conditions
const assertCondition = createAssertProcessor({
  condition: 'content.amount > 100 and content.status = "active"',
  error: "Invalid order state"
})

// Combine both
const assertBoth = createAssertProcessor({
  hasFields: ["id"],
  condition: 'content.id != null',
  error: "Invalid message structure"
})
```

**Supported field paths:**
- Simple: `"id"`, `"name"`
- Nested: `"user.name"`, `"order.items.price"`
- Deep nesting: `"data.nested.deeply.value"`

**JSONata expressions:**
- Full JSONata syntax support
- Access to entire message (content, metadata, etc.)
- Boolean result required

---

## Testing Patterns

### Pattern 1: Testing Inputs

**Goal:** Verify the input reads data correctly and produces valid messages.

**Pattern:**
```typescript
[Input Under Test] → Assert → Capture
```

**Template:**
```typescript
import { Effect, Stream } from "effect"
import { createCaptureOutput, createAssertProcessor } from "effect-connect"
import { createPipeline, runPipeline } from "effect-connect"
import { createMyInput } from "../src/inputs/my-input.js"

it("should read messages from source", async () => {
  // Component to test
  const input = createMyInput({
    url: "http://localhost:8080/data"
  })

  // Validate message structure
  const assertProcessor = createAssertProcessor({
    hasFields: ["id", "content", "timestamp"],
    error: "Invalid message structure from input"
  })

  // Collect for assertions
  const output = await Effect.runPromise(createCaptureOutput())

  const pipeline = createPipeline({
    name: "test-input",
    input,
    processors: [assertProcessor],
    output
  })

  const result = await Effect.runPromise(runPipeline(pipeline))

  // Assertions
  expect(result.success).toBe(true)

  const messages = await Effect.runPromise(output.getMessages())
  expect(messages.length).toBeGreaterThan(0)
  expect(messages[0]).toHaveProperty("id")
  expect(messages[0]).toHaveProperty("content")
  expect(messages[0].metadata).toHaveProperty("source")
})
```

### Pattern 2: Testing Outputs

**Goal:** Verify the output writes data correctly to its destination.

**Pattern:**
```typescript
Generate → [Output Under Test] → Verify External State
```

**Template:**
```typescript
import { Effect } from "effect"
import { createGenerateInput } from "effect-connect"
import { createPipeline, runPipeline } from "effect-connect"
import { createMyOutput } from "../src/outputs/my-output.js"

it("should write messages to destination", async () => {
  // Generate test data
  const input = createGenerateInput({
    count: 5,
    template: {
      id: "msg-{{index}}",
      value: "test-{{random}}"
    }
  })

  // Component to test
  const output = createMyOutput({
    connectionString: "postgresql://localhost/test"
  })

  const pipeline = createPipeline({
    name: "test-output",
    input,
    processors: [],
    output
  })

  const result = await Effect.runPromise(runPipeline(pipeline))

  // Assertions
  expect(result.success).toBe(true)
  expect(result.stats.processed).toBe(5)

  // Verify external state (database, file, API, etc.)
  const rows = await queryDatabase("SELECT * FROM messages")
  expect(rows).toHaveLength(5)
  expect(rows[0].id).toBe("msg-0")
})
```

### Pattern 3: Testing Processors

**Goal:** Verify the processor transforms messages correctly.

**Pattern:**
```typescript
Generate → [Processor Under Test] → Capture
```

**Template:**
```typescript
import { Effect } from "effect"
import { createGenerateInput, createCaptureOutput } from "effect-connect"
import { createPipeline, runPipeline } from "effect-connect"
import { createMyProcessor } from "../src/processors/my-processor.js"

it("should transform messages correctly", async () => {
  // Generate test data
  const input = createGenerateInput({
    count: 3,
    template: {
      name: "test",
      value: "lowercase"
    }
  })

  // Component to test
  const processor = createMyProcessor({
    field: "value",
    transform: "uppercase"
  })

  // Collect results
  const output = await Effect.runPromise(createCaptureOutput())

  const pipeline = createPipeline({
    name: "test-processor",
    input,
    processors: [processor],
    output
  })

  await Effect.runPromise(runPipeline(pipeline))

  const messages = await Effect.runPromise(output.getMessages())

  // Assertions
  expect(messages).toHaveLength(3)
  expect(messages[0].content.value).toBe("LOWERCASE")
  expect(messages[0].content.name).toBe("test") // Unchanged
})
```

### Pattern 4: Testing Multiple Processors

**Goal:** Verify processors work correctly in sequence.

**Pattern:**
```typescript
Generate → Processor1 → Processor2 → Capture
```

**Template:**
```typescript
it("should apply processors in sequence", async () => {
  const input = createGenerateInput({
    count: 2,
    template: { name: "test", status: "new" }
  })

  const processor1 = createMetadataProcessor({
    addTimestamp: true
  })

  const processor2 = createUppercaseProcessor({
    fields: ["name", "status"]
  })

  const output = await Effect.runPromise(createCaptureOutput())

  const pipeline = createPipeline({
    name: "test-multi-processor",
    input,
    processors: [processor1, processor2],
    output
  })

  await Effect.runPromise(runPipeline(pipeline))

  const messages = await Effect.runPromise(output.getMessages())

  // Check processor 1 added timestamp
  expect(messages[0].timestamp).toBeDefined()

  // Check processor 2 uppercased fields
  expect(messages[0].content.name).toBe("TEST")
  expect(messages[0].content.status).toBe("NEW")
})
```

### Pattern 5: E2E Tests (Selective)

**Goal:** Verify real-world component combinations work together.

**Pattern:**
```typescript
Real Input → Real Processors → Real Output
```

**When to use:**
- Critical user journeys
- Complex transformation pipelines
- Integration with external services
- ~5 scenarios maximum

**Example:**
```typescript
it("should process orders end-to-end", async () => {
  const input = createHttpInput({ port: 8080 })

  const processors = [
    createFilterProcessor({ condition: 'content.type = "order"' }),
    createSplitProcessor({ path: "content.items" }),
    createMetadataProcessor({ addTimestamp: true })
  ]

  const output = createPostgresOutput({
    connectionString: process.env.DATABASE_URL,
    table: "orders"
  })

  const pipeline = createPipeline({
    name: "orders-pipeline",
    input,
    processors,
    output
  })

  // Run pipeline with real HTTP requests
  // Verify database state
})
```

---

## Writing Component Tests

### Quick Start Template

```typescript
import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import {
  createGenerateInput,
  createCaptureOutput,
  createAssertProcessor,
  createPipeline,
  runPipeline
} from "effect-connect"
import { createMyComponent } from "../src/components/my-component.js"

describe("MyComponent", () => {
  describe("Configuration", () => {
    it("should accept valid configuration", () => {
      expect(() => createMyComponent({ url: "http://test" })).not.toThrow()
    })

    it("should reject invalid configuration", () => {
      expect(() => createMyComponent({ url: "invalid" })).toThrow()
    })
  })

  describe("Functionality", () => {
    it("should process messages correctly", async () => {
      const input = createGenerateInput({
        count: 5,
        template: { id: "{{index}}" }
      })

      const component = createMyComponent({ /* config */ })

      const output = await Effect.runPromise(createCaptureOutput())

      const pipeline = createPipeline({
        name: "test",
        input,
        processors: [component], // or use as input/output
        output
      })

      const result = await Effect.runPromise(runPipeline(pipeline))

      expect(result.success).toBe(true)

      const messages = await Effect.runPromise(output.getMessages())
      // Your assertions here
    })
  })
})
```

### Test Organization

```
tests/
├── unit/
│   ├── inputs/
│   │   ├── http-input.test.ts
│   │   ├── sqs-input.test.ts
│   │   └── redis-input.test.ts
│   ├── processors/
│   │   ├── filter-processor.test.ts
│   │   ├── split-processor.test.ts
│   │   └── mapping-processor.test.ts
│   └── outputs/
│       ├── postgres-output.test.ts
│       ├── http-output.test.ts
│       └── sqs-output.test.ts
└── e2e/
    ├── order-processing.test.ts
    └── log-aggregation.test.ts
```

### What to Test

**For Inputs:**
- ✅ Valid configuration accepted
- ✅ Invalid configuration rejected
- ✅ Messages produced have correct structure
- ✅ Metadata enrichment works
- ✅ Connection errors handled gracefully
- ✅ Resource cleanup (close) works

**For Processors:**
- ✅ Valid configuration accepted
- ✅ Invalid configuration rejected
- ✅ Transforms messages correctly
- ✅ Preserves untouched fields
- ✅ Handles missing fields gracefully
- ✅ Error handling works
- ✅ 1-to-N expansion works (if applicable)
- ✅ Filtering works (if applicable)

**For Outputs:**
- ✅ Valid configuration accepted
- ✅ Invalid configuration rejected
- ✅ Writes messages correctly
- ✅ Batching works (if applicable)
- ✅ Retry logic works
- ✅ Connection errors handled gracefully
- ✅ Resource cleanup (close) works
- ✅ Flushes pending messages on close

---

## Examples

### Example 1: Testing HTTP Output

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { Effect } from "effect"
import { createGenerateInput, createCaptureOutput, createPipeline, runPipeline } from "effect-connect"
import { createHttpOutput } from "effect-connect"

describe("HttpOutput", () => {
  let mockServer: any

  beforeAll(async () => {
    // Start mock HTTP server
    mockServer = await startMockServer(3000)
  })

  afterAll(async () => {
    await mockServer.close()
  })

  it("should send POST requests to URL", async () => {
    const input = createGenerateInput({
      count: 3,
      template: {
        id: "order-{{index}}",
        amount: "{{random}}"
      }
    })

    const output = createHttpOutput({
      url: "http://localhost:3000/webhook",
      method: "POST"
    })

    const pipeline = createPipeline({
      name: "test",
      input,
      processors: [],
      output
    })

    const result = await Effect.runPromise(runPipeline(pipeline))

    expect(result.success).toBe(true)
    expect(result.stats.processed).toBe(3)

    // Verify mock server received requests
    const requests = mockServer.getRequests()
    expect(requests).toHaveLength(3)
    expect(requests[0].body.id).toBe("order-0")
  })

  it("should retry on failures", async () => {
    const input = createGenerateInput({
      count: 1,
      template: { value: "test" }
    })

    // Configure mock to fail first 2 attempts
    mockServer.failNextRequests(2)

    const output = createHttpOutput({
      url: "http://localhost:3000/webhook",
      maxRetries: 3
    })

    const pipeline = createPipeline({
      name: "test-retry",
      input,
      processors: [],
      output
    })

    const result = await Effect.runPromise(runPipeline(pipeline))

    expect(result.success).toBe(true)
    expect(mockServer.getRequestCount()).toBe(3) // 2 failures + 1 success
  })
})
```

### Example 2: Testing Filter Processor

```typescript
import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { createGenerateInput, createCaptureOutput, createPipeline, runPipeline } from "effect-connect"
import { createFilterProcessor } from "effect-connect"

describe("FilterProcessor", () => {
  it("should pass messages matching condition", async () => {
    const input = createGenerateInput({
      count: 10,
      template: {
        id: "{{index}}",
        amount: "{{random}}"
      }
    })

    const processor = createFilterProcessor({
      condition: 'content.amount > "500"'
    })

    const output = await Effect.runPromise(createCaptureOutput())

    const pipeline = createPipeline({
      name: "test",
      input,
      processors: [processor],
      output
    })

    await Effect.runPromise(runPipeline(pipeline))

    const messages = await Effect.runPromise(output.getMessages())

    // Only messages with amount > 500 should pass
    expect(messages.length).toBeLessThan(10)
    messages.forEach(msg => {
      expect(parseInt(msg.content.amount)).toBeGreaterThan(500)
    })
  })

  it("should drop messages not matching condition", async () => {
    const input = createGenerateInput({
      count: 5,
      template: {
        type: "order",
        status: "pending"
      }
    })

    const processor = createFilterProcessor({
      condition: 'content.status = "completed"'
    })

    const output = await Effect.runPromise(createCaptureOutput())

    const pipeline = createPipeline({
      name: "test",
      input,
      processors: [processor],
      output
    })

    await Effect.runPromise(runPipeline(pipeline))

    const messages = await Effect.runPromise(output.getMessages())

    // All messages have status="pending", so all should be dropped
    expect(messages).toHaveLength(0)
  })
})
```

### Example 3: Testing with Timing

```typescript
it("should handle message timing", async () => {
  const start = Date.now()

  const input = createGenerateInput({
    count: 5,
    interval: 50, // 50ms between messages
    template: {
      id: "{{index}}",
      timestamp: "{{timestamp}}"
    }
  })

  const output = await Effect.runPromise(createCaptureOutput())

  const pipeline = createPipeline({
    name: "test-timing",
    input,
    processors: [],
    output
  })

  await Effect.runPromise(runPipeline(pipeline))

  const duration = Date.now() - start

  // Should take at least 200ms (4 intervals for 5 messages)
  expect(duration).toBeGreaterThanOrEqual(180)

  const messages = await Effect.runPromise(output.getMessages())

  // Timestamps should be increasing
  for (let i = 1; i < messages.length; i++) {
    const ts1 = parseInt(messages[i - 1].content.timestamp)
    const ts2 = parseInt(messages[i].content.timestamp)
    expect(ts2).toBeGreaterThanOrEqual(ts1)
  }
})
```

---

## Best Practices

### Do's ✅

1. **Test components in isolation** - Use generate/capture utilities
2. **Test one thing at a time** - Focus each test on a single concern
3. **Use descriptive test names** - "should transform uppercase fields" not "test1"
4. **Keep tests fast** - Avoid external dependencies when possible
5. **Use realistic data** - Templates should match production data shapes
6. **Test error cases** - Not just happy paths
7. **Clean up resources** - Close connections, clear buffers
8. **Use TypeScript types** - Leverage type safety in tests
9. **Group related tests** - Use describe blocks for organization
10. **Document complex scenarios** - Add comments for non-obvious logic

### Don'ts ❌

1. **Don't test every combination** - Use isolated testing instead
2. **Don't rely on test execution order** - Tests should be independent
3. **Don't share state between tests** - Each test should be isolated
4. **Don't use real credentials** - Mock or use test accounts
5. **Don't skip cleanup** - Always clean up resources (databases, files, etc.)
6. **Don't make tests flaky** - Avoid timing dependencies when possible
7. **Don't test Effect.js internals** - Trust the library works
8. **Don't duplicate test logic** - Extract common patterns to helpers
9. **Don't ignore failing tests** - Fix or remove, don't skip
10. **Don't write tests that take minutes** - Keep test suite under 30 seconds

### Performance Tips

1. **Run unit tests in parallel** - Vitest does this by default
2. **Use in-memory capture** - Avoid file system for test data
3. **Mock external services** - Use capture/generate instead of real APIs
4. **Limit message counts** - 5-10 messages usually enough for tests
5. **Use minimal intervals** - Or omit interval for instant messages
6. **Skip E2E for CI** - Optional, run separately for integration tests
7. **Clear buffers between tests** - Prevent memory buildup

### Debugging Tips

1. **Add `logPassing: true`** to assert processor to see successful validations
2. **Inspect captured messages** with `console.log(messages)`
3. **Use Effect logging** - See pipeline execution logs
4. **Run single test** - `npm test -- -t "test name"`
5. **Check external state** - Database, files, API logs
6. **Use Effect.runPromiseExit** - Get full error details
7. **Add checkpoints** - Multiple capture outputs for different stages

---

## Summary

The testing strategy for Effect Connect is designed for **infinite scalability**:

- ✅ **Linear growth**: N components = ~3N tests (not N²)
- ✅ **Fast execution**: < 10 seconds for 200+ tests
- ✅ **Easy debugging**: Isolated failures, clear error messages
- ✅ **Low cognitive load**: Simple, repeatable patterns
- ✅ **Type safe**: Full TypeScript + Effect.js types
- ✅ **No mocking needed**: Generate/capture utilities provide real execution

**Test Pattern Summary:**
```typescript
// Input tests
Input → Assert → Capture

// Processor tests
Generate → Processor → Capture

// Output tests
Generate → Output → Verify

// E2E tests (selective)
Input → Processors → Output
```

With this approach, you can add 100 components with only 300 tests instead of 10,000! 🎉

---

**Next Steps:**
- See [COMPONENTS.md](./spec/COMPONENTS.md) for component development guide
- See [examples/](../examples/) for full pipeline examples
- Run tests with `npm test` or `npm run test:unit`
