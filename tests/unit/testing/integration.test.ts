/**
 * Integration tests demonstrating how testing utilities work together
 * This shows the pattern for testing components without N×N explosion
 */
import { describe, it, expect } from "vitest"
import { Effect, Stream } from "effect"
import { createGenerateInput } from "../../../src/testing/generate-input.js"
import { createCaptureOutput } from "../../../src/testing/capture-output.js"
import { createAssertProcessor } from "../../../src/testing/assert-processor.js"
import { createUppercaseProcessor } from "../../../src/processors/uppercase-processor.js"
import { createMetadataProcessor } from "../../../src/processors/metadata-processor.js"
import { create, run } from "../../../src/core/pipeline.js"

describe("Testing Utilities Integration", () => {
  describe("Generate → Processor → Capture Pattern", () => {
    it("should test uppercase processor in isolation", async () => {
      // Generate test messages
      const input = createGenerateInput({
        count: 3,
        template: {
          name: "test-{{index}}",
          value: "lowercase"
        }
      })

      // Processor to test
      const processor = createUppercaseProcessor({
        fields: ["name", "value"]
      })

      // Capture output for assertions
      const output = await Effect.runPromise(createCaptureOutput())

      // Create and run pipeline
      const pipeline = create({
        name: "test-pipeline",
        input,
        processors: [processor],
        output
      })

      const result = await Effect.runPromise(run(pipeline))

      // Assertions
      expect(result.success).toBe(true)
      expect(result.stats.processed).toBe(3)

      const messages = await Effect.runPromise(output.getMessages())
      expect(messages).toHaveLength(3)
      expect(messages[0].content.name).toBe("TEST-0")
      expect(messages[0].content.value).toBe("LOWERCASE")
      expect(messages[2].content.name).toBe("TEST-2")
    })

    it("should test multiple processors in sequence", async () => {
      const input = createGenerateInput({
        count: 2,
        template: {
          name: "test",
          value: "data"
        }
      })

      const metadataProcessor = createMetadataProcessor({
        addTimestamp: true
      })

      const uppercaseProcessor = createUppercaseProcessor({
        fields: ["name"]
      })

      const output = await Effect.runPromise(createCaptureOutput())

      const pipeline = create({
        name: "test-pipeline",
        input,
        processors: [metadataProcessor, uppercaseProcessor],
        output
      })

      await Effect.runPromise(run(pipeline))

      const messages = await Effect.runPromise(output.getMessages())

      // Check metadata was added
      expect(messages[0].timestamp).toBeDefined()

      // Check uppercase was applied
      expect(messages[0].content.name).toBe("TEST")
      expect(messages[0].content.value).toBe("data") // Not uppercased
    })
  })

  describe("Generate → Assert → Capture Pattern", () => {
    it("should validate message structure with assert processor", async () => {
      const input = createGenerateInput({
        count: 5,
        template: {
          id: "msg-{{index}}",
          amount: "{{random}}",
          user: {
            name: "User {{index}}"
          }
        }
      })

      // Validate message structure
      const assertProcessor = createAssertProcessor({
        hasFields: ["id", "amount", "user.name"],
        condition: 'content.amount >= "0"'
      })

      const output = await Effect.runPromise(createCaptureOutput())

      const pipeline = create({
        name: "validation-pipeline",
        input,
        processors: [assertProcessor],
        output
      })

      const result = await Effect.runPromise(run(pipeline))

      // All messages should pass validation
      expect(result.success).toBe(true)
      expect(result.stats.processed).toBe(5)
      expect(result.stats.failed).toBe(0)
    })

    it("should fail pipeline when assertions don't pass", async () => {
      const input = createGenerateInput({
        count: 3,
        template: {
          value: "test"
          // Intentionally missing 'id' field
        }
      })

      const assertProcessor = createAssertProcessor({
        hasFields: ["id", "value"],
        error: "Missing required ID field"
      })

      const output = await Effect.runPromise(createCaptureOutput())

      const pipeline = create({
        name: "failing-pipeline",
        input,
        processors: [assertProcessor],
        output
      })

      const result = await Effect.runPromise(run(pipeline))

      // Pipeline should fail
      expect(result.success).toBe(false)
      expect(result.stats.failed).toBeGreaterThan(0)
    })
  })

  describe("Testing with Intervals", () => {
    it("should generate messages with timing", async () => {
      const start = Date.now()

      const input = createGenerateInput({
        count: 3,
        interval: 50, // 50ms between messages
        template: {
          id: "msg-{{index}}",
          timestamp: "{{timestamp}}"
        }
      })

      const output = await Effect.runPromise(createCaptureOutput())

      const pipeline = create({
        name: "timed-pipeline",
        input,
        processors: [], // No processors for this test
        output
      })

      await Effect.runPromise(run(pipeline))

      const duration = Date.now() - start

      // Should take at least 100ms (2 intervals for 3 messages)
      expect(duration).toBeGreaterThanOrEqual(90)

      const messages = await Effect.runPromise(output.getMessages())
      expect(messages).toHaveLength(3)

      // Timestamps should be increasing
      const ts1 = parseInt(messages[0].content.timestamp)
      const ts2 = parseInt(messages[1].content.timestamp)
      const ts3 = parseInt(messages[2].content.timestamp)

      expect(ts2).toBeGreaterThanOrEqual(ts1)
      expect(ts3).toBeGreaterThanOrEqual(ts2)
    })
  })

  describe("Testing Complex Scenarios", () => {
    it("should handle dynamic content generation", async () => {
      const input = createGenerateInput({
        count: 10,
        template: {
          id: "{{uuid}}",
          orderId: "order-{{index}}",
          amount: "{{random}}",
          items: [
            { sku: "item-{{index}}-1" },
            { sku: "item-{{index}}-2" }
          ]
        }
      })

      const output = await Effect.runPromise(createCaptureOutput())

      const pipeline = create({
        name: "complex-pipeline",
        input,
        processors: [], // No processors for this test
        output
      })

      await Effect.runPromise(run(pipeline))

      const messages = await Effect.runPromise(output.getMessages())

      // Check UUID uniqueness
      const uuids = messages.map((m: any) => m.content.id)
      const uniqueUuids = new Set(uuids)
      expect(uniqueUuids.size).toBe(10)

      // Check sequential order IDs
      expect(messages[0].content.orderId).toBe("order-0")
      expect(messages[9].content.orderId).toBe("order-9")

      // Check nested array replacements
      expect(messages[0].content.items[0].sku).toBe("item-0-1")
      expect(messages[5].content.items[1].sku).toBe("item-5-2")
    })

    it("should handle empty streams", async () => {
      const input = createGenerateInput({
        count: 0,
        template: { value: "test" }
      })

      const output = await Effect.runPromise(createCaptureOutput())

      const pipeline = create({
        name: "empty-pipeline",
        input,
        processors: [], // No processors for this test
        output
      })

      const result = await Effect.runPromise(run(pipeline))

      expect(result.success).toBe(true)
      expect(result.stats.processed).toBe(0)

      const messages = await Effect.runPromise(output.getMessages())
      expect(messages).toHaveLength(0)
    })
  })
})
