import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { createCaptureOutput } from "../../../src/testing/capture-output.js"
import { createMessage } from "../../../src/core/types.js"

describe("CaptureOutput", () => {
  describe("Message Capture", () => {
    it("should capture sent messages", async () => {
      const output = await Effect.runPromise(createCaptureOutput())
      const message1 = createMessage({ value: "test1" })
      const message2 = createMessage({ value: "test2" })

      await Effect.runPromise(output.send(message1))
      await Effect.runPromise(output.send(message2))

      const messages = await Effect.runPromise(output.getMessages())

      expect(messages).toHaveLength(2)
      expect(messages[0].content).toEqual({ value: "test1" })
      expect(messages[1].content).toEqual({ value: "test2" })
    })

    it("should preserve message order", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      for (let i = 0; i < 5; i++) {
        const message = createMessage({ index: i })
        await Effect.runPromise(output.send(message))
      }

      const messages = await Effect.runPromise(output.getMessages())

      expect(messages.map((m: any) => m.content.index)).toEqual([0, 1, 2, 3, 4])
    })

    it("should capture message metadata", async () => {
      const output = await Effect.runPromise(createCaptureOutput())
      const message = createMessage({ value: "test" }, { source: "test-input" })

      await Effect.runPromise(output.send(message))

      const messages = await Effect.runPromise(output.getMessages())

      expect(messages[0].metadata).toHaveProperty("source", "test-input")
    })
  })

  describe("Message Count", () => {
    it("should return correct message count", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      expect(await Effect.runPromise(output.getCount())).toBe(0)

      await Effect.runPromise(output.send(createMessage({ value: 1 })))
      expect(await Effect.runPromise(output.getCount())).toBe(1)

      await Effect.runPromise(output.send(createMessage({ value: 2 })))
      expect(await Effect.runPromise(output.getCount())).toBe(2)
    })

    it("should update count after clear", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      await Effect.runPromise(output.send(createMessage({ value: 1 })))
      await Effect.runPromise(output.send(createMessage({ value: 2 })))

      expect(await Effect.runPromise(output.getCount())).toBe(2)

      await Effect.runPromise(output.clear())

      expect(await Effect.runPromise(output.getCount())).toBe(0)
    })
  })

  describe("Clear Functionality", () => {
    it("should clear captured messages", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      await Effect.runPromise(output.send(createMessage({ value: 1 })))
      await Effect.runPromise(output.send(createMessage({ value: 2 })))

      expect(await Effect.runPromise(output.getCount())).toBe(2)

      await Effect.runPromise(output.clear())

      const messages = await Effect.runPromise(output.getMessages())
      expect(messages).toHaveLength(0)
    })

    it("should allow capturing after clear", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      await Effect.runPromise(output.send(createMessage({ value: 1 })))
      await Effect.runPromise(output.clear())
      await Effect.runPromise(output.send(createMessage({ value: 2 })))

      const messages = await Effect.runPromise(output.getMessages())

      expect(messages).toHaveLength(1)
      expect(messages[0].content).toEqual({ value: 2 })
    })
  })

  describe("Close Functionality", () => {
    it("should have close method", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      expect(output.close).toBeDefined()
      expect(typeof output.close).toBe("function")
    })

    it("should keep messages after close", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      await Effect.runPromise(output.send(createMessage({ value: 1 })))
      await Effect.runPromise(output.send(createMessage({ value: 2 })))

      expect(await Effect.runPromise(output.getCount())).toBe(2)

      await Effect.runPromise(output.close!())

      // Messages should still be available after close for test assertions
      const messages = await Effect.runPromise(output.getMessages())
      expect(messages).toHaveLength(2)
    })
  })

  describe("Max Messages Limit", () => {
    it("should respect maxMessages limit", async () => {
      const output = await Effect.runPromise(createCaptureOutput({ maxMessages: 5 }))

      // Send more messages than limit
      for (let i = 0; i < 10; i++) {
        await Effect.runPromise(output.send(createMessage({ value: i })))
      }

      const messages = await Effect.runPromise(output.getMessages())

      // Should only have first 5 messages
      expect(messages.length).toBeLessThanOrEqual(5)
      expect(messages[0].content).toEqual({ value: 0 })
    })

    it("should default to large capacity when maxMessages not specified", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      // Send many messages
      for (let i = 0; i < 100; i++) {
        await Effect.runPromise(output.send(createMessage({ value: i })))
      }

      const count = await Effect.runPromise(output.getCount())

      expect(count).toBe(100)
    })
  })

  describe("Concurrent Sends", () => {
    it("should handle concurrent message sends", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      const sends = Array.from({ length: 10 }, (_, i) =>
        output.send(createMessage({ value: i }))
      )

      await Effect.runPromise(Effect.all(sends, { concurrency: 5 }))

      const count = await Effect.runPromise(output.getCount())

      expect(count).toBe(10)
    })
  })

  describe("Component Properties", () => {
    it("should have correct component name", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      expect(output.name).toBe("capture-output")
    })

    it("should have all required Output interface methods", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      expect(output.name).toBeDefined()
      expect(output.send).toBeDefined()
      expect(output.close).toBeDefined()
    })

    it("should have additional test methods", async () => {
      const output = await Effect.runPromise(createCaptureOutput())

      expect(output.getMessages).toBeDefined()
      expect(output.getCount).toBeDefined()
      expect(output.clear).toBeDefined()
    })
  })
})
