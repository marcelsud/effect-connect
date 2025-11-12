import { describe, it, expect } from "vitest"
import { Effect, Stream } from "effect"
import { createGenerateInput } from "../../../src/testing/generate-input.js"

describe("GenerateInput", () => {
  describe("Message Generation", () => {
    it("should generate specified number of messages", async () => {
      const input = createGenerateInput({
        count: 5,
        template: { value: "test" }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      expect(messages).toHaveLength(5)
    })

    it("should replace {{index}} placeholder", async () => {
      const input = createGenerateInput({
        count: 3,
        template: { id: "msg-{{index}}", value: "test" }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      expect(messages[0].content).toEqual({ id: "msg-0", value: "test" })
      expect(messages[1].content).toEqual({ id: "msg-1", value: "test" })
      expect(messages[2].content).toEqual({ id: "msg-2", value: "test" })
    })

    it("should replace {{uuid}} placeholder with unique IDs", async () => {
      const input = createGenerateInput({
        count: 3,
        template: { uuid: "{{uuid}}" }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      const uuids = messages.map((m: any) => m.content.uuid)
      const uniqueUuids = new Set(uuids)

      expect(uniqueUuids.size).toBe(3) // All UUIDs should be unique
      expect(uuids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it("should replace {{random}} placeholder", async () => {
      const input = createGenerateInput({
        count: 2,
        template: { random: "{{random}}" }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      expect(typeof messages[0].content.random).toBe("string")
      expect(parseInt(messages[0].content.random as string)).toBeGreaterThanOrEqual(0)
      expect(parseInt(messages[0].content.random as string)).toBeLessThan(1000)
    })

    it("should replace {{timestamp}} placeholder", async () => {
      const input = createGenerateInput({
        count: 2,
        template: { ts: "{{timestamp}}" }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      const ts1 = parseInt(messages[0].content.ts as string)
      const ts2 = parseInt(messages[1].content.ts as string)

      expect(ts1).toBeGreaterThan(0)
      expect(ts2).toBeGreaterThanOrEqual(ts1) // Second should be same or later
    })

    it("should handle nested template objects", async () => {
      const input = createGenerateInput({
        count: 2,
        template: {
          user: {
            id: "user-{{index}}",
            uuid: "{{uuid}}"
          },
          data: {
            value: "{{random}}"
          }
        }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      expect(messages[0].content).toHaveProperty("user.id", "user-0")
      expect(messages[1].content).toHaveProperty("user.id", "user-1")
      expect(messages[0].content).toHaveProperty("user.uuid")
      expect(messages[0].content).toHaveProperty("data.value")
    })

    it("should support custom start index", async () => {
      const input = createGenerateInput({
        count: 3,
        startIndex: 10,
        template: { id: "{{index}}" }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      expect(messages[0].content).toEqual({ id: "10" })
      expect(messages[1].content).toEqual({ id: "11" })
      expect(messages[2].content).toEqual({ id: "12" })
    })
  })

  describe("Message Metadata", () => {
    it("should add test metadata to messages", async () => {
      const input = createGenerateInput({
        count: 1,
        template: { value: "test" }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      expect(messages[0].metadata).toHaveProperty("source", "generate-input")
      expect(messages[0].metadata).toHaveProperty("testIndex")
      expect(messages[0].metadata).toHaveProperty("generatedAt")
    })

    it("should have unique message IDs", async () => {
      const input = createGenerateInput({
        count: 3,
        template: { value: "test" }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      const ids = messages.map((m) => m.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(3)
    })
  })

  describe("Timing", () => {
    it("should generate messages without delay when interval not specified", async () => {
      const start = Date.now()

      const input = createGenerateInput({
        count: 10,
        template: { value: "test" }
      })

      await Effect.runPromise(Stream.runCollect(input.stream))

      const duration = Date.now() - start

      // Should complete very quickly without delays
      expect(duration).toBeLessThan(100)
    })

    it("should respect interval between messages", async () => {
      const start = Date.now()

      const input = createGenerateInput({
        count: 3,
        interval: 50, // 50ms between messages
        template: { value: "test" }
      })

      await Effect.runPromise(Stream.runCollect(input.stream))

      const duration = Date.now() - start

      // Should take at least 2 intervals (3 messages = 2 delays)
      // 2 * 50ms = 100ms minimum
      expect(duration).toBeGreaterThanOrEqual(90) // Allow some tolerance
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty template", async () => {
      const input = createGenerateInput({
        count: 2,
        template: {}
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      expect(messages[0].content).toEqual({})
      expect(messages[1].content).toEqual({})
    })

    it("should handle array values in template", async () => {
      const input = createGenerateInput({
        count: 2,
        template: {
          items: ["item-{{index}}", "value-{{random}}"]
        }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      expect(messages[0].content).toHaveProperty("items")
      expect(Array.isArray(messages[0].content.items)).toBe(true)
      expect(messages[0].content.items[0]).toBe("item-0")
    })

    it("should generate zero messages when count is 0", async () => {
      const input = createGenerateInput({
        count: 0,
        template: { value: "test" }
      })

      const messages = await Effect.runPromise(
        Stream.runCollect(input.stream).pipe(Effect.map((chunk) => Array.from(chunk)))
      )

      expect(messages).toHaveLength(0)
    })
  })
})
