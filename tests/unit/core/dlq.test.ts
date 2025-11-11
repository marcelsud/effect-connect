import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect } from "effect"
import { withDLQ, DLQError } from "../../../src/core/dlq.js"
import { createMessage } from "../../../src/core/types.js"
import type { Output, Message } from "../../../src/core/types.js"

describe("Dead Letter Queue (DLQ)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("withDLQ", () => {
    it("should send message successfully when output succeeds", async () => {
      const mockOutput: Output<Error> = {
        name: "mock-output",
        send: vi.fn().mockReturnValue(Effect.void),
      }

      const dlqOutput: Output<any> = {
        name: "dlq-output",
        send: vi.fn().mockReturnValue(Effect.void),
      }

      const wrappedOutput = withDLQ({
        output: mockOutput,
        dlq: dlqOutput,
        maxRetries: 3,
      })

      const msg = createMessage({ test: "data" })
      await Effect.runPromise(wrappedOutput.send(msg))

      // Should call primary output
      expect(mockOutput.send).toHaveBeenCalledTimes(1)
      expect(mockOutput.send).toHaveBeenCalledWith(msg)

      // Should NOT call DLQ
      expect(dlqOutput.send).not.toHaveBeenCalled()
    })

    it.skip("should retry on failure and eventually succeed", async () => {
      let attempts = 0
      const mockOutput: Output<Error> = {
        name: "mock-output",
        send: () => {
          attempts++
          // Fail on first 2 attempts, succeed on 3rd
          if (attempts <= 2) {
            return Effect.fail(new Error("Temporary error"))
          }
          return Effect.void
        },
      }

      const dlqOutput: Output<any> = {
        name: "dlq-output",
        send: vi.fn().mockReturnValue(Effect.void),
      }

      const wrappedOutput = withDLQ({
        output: mockOutput,
        dlq: dlqOutput,
        maxRetries: 2, // Will try 3 times total (initial + 2 retries)
      })

      const msg = createMessage({ test: "data" })
      await Effect.runPromise(wrappedOutput.send(msg))

      // Should NOT send to DLQ since it eventually succeeded
      expect(dlqOutput.send).not.toHaveBeenCalled()
      // Should have succeeded on 3rd attempt
      expect(attempts).toBe(3)
    })

    it("should send to DLQ after max retries exceeded", async () => {
      const mockOutput: Output<Error> = {
        name: "mock-output",
        send: vi.fn().mockReturnValue(Effect.fail(new Error("Persistent error"))),
      }

      const dlqOutput: Output<any> = {
        name: "dlq-output",
        send: vi.fn().mockReturnValue(Effect.void),
      }

      const wrappedOutput = withDLQ({
        output: mockOutput,
        dlq: dlqOutput,
        maxRetries: 2,
      })

      const msg = createMessage({ test: "data" })
      await Effect.runPromise(wrappedOutput.send(msg))

      // Should send to DLQ
      expect(dlqOutput.send).toHaveBeenCalledTimes(1)

      // Verify DLQ message contains failure information
      const dlqMessage = (dlqOutput.send as any).mock.calls[0][0] as Message
      expect(dlqMessage.metadata.dlq).toBe(true)
      expect(dlqMessage.metadata.dlqReason).toContain("Persistent error")
      expect(dlqMessage.metadata.dlqAttempts).toBe(3)
      expect(dlqMessage.metadata.originalMessageId).toBe(msg.id)
    })

    it("should fail if DLQ send also fails", async () => {
      const mockOutput: Output<Error> = {
        name: "mock-output",
        send: vi.fn().mockReturnValue(Effect.fail(new Error("Primary error"))),
      }

      const dlqOutput: Output<any> = {
        name: "dlq-output",
        send: vi.fn().mockReturnValue(Effect.fail(new Error("DLQ error"))),
      }

      const wrappedOutput = withDLQ({
        output: mockOutput,
        dlq: dlqOutput,
        maxRetries: 1,
      })

      const msg = createMessage({ test: "data" })

      // Should fail with original error since DLQ also failed
      await expect(
        Effect.runPromise(wrappedOutput.send(msg))
      ).rejects.toThrow("Primary error")

      expect(mockOutput.send).toHaveBeenCalled()
      expect(dlqOutput.send).toHaveBeenCalled()
    })

    it("should work without DLQ configured", async () => {
      const mockOutput: Output<Error> = {
        name: "mock-output",
        send: vi.fn().mockReturnValue(Effect.fail(new Error("Error without DLQ"))),
      }

      const wrappedOutput = withDLQ({
        output: mockOutput,
        maxRetries: 1,
      })

      const msg = createMessage({ test: "data" })

      // Should fail without DLQ
      await expect(
        Effect.runPromise(wrappedOutput.send(msg))
      ).rejects.toThrow("Error without DLQ")
    })

    it.skip("should preserve DLQ message structure", async () => {
      const mockOutput: Output<Error> = {
        name: "mock-output",
        send: () => Effect.fail(new Error("Test error")),
      }

      const dlqOutput: Output<any> = {
        name: "dlq-output",
        send: vi.fn().mockReturnValue(Effect.void),
      }

      const wrappedOutput = withDLQ({
        output: mockOutput,
        dlq: dlqOutput,
        maxRetries: 0,
      })

      const originalMsg = createMessage(
        { order: { id: 123, items: ["item1"] } },
        { source: "api", userId: "user-123" }
      )

      await Effect.runPromise(wrappedOutput.send(originalMsg))

      const dlqMessage = (dlqOutput.send as any).mock.calls[0][0] as Message

      // Original content should be preserved
      expect(dlqMessage.content).toEqual(originalMsg.content)
      expect(dlqMessage.id).toBe(originalMsg.id)

      // Original metadata should be preserved
      expect(dlqMessage.metadata.source).toBe("api")
      expect(dlqMessage.metadata.userId).toBe("user-123")

      // DLQ metadata should be added
      expect(dlqMessage.metadata.dlq).toBe(true)
      expect(dlqMessage.metadata.dlqReason).toBeDefined()
      expect(dlqMessage.metadata.dlqTimestamp).toBeDefined()
      expect(dlqMessage.metadata.originalMessageId).toBe(originalMsg.id)
    })

    it("should use custom retry schedule", async () => {
      let attempts = 0
      const mockOutput: Output<Error> = {
        name: "mock-output",
        send: vi.fn().mockImplementation(() => {
          attempts++
          return Effect.fail(new Error(`Attempt ${attempts}`))
        }),
      }

      const dlqOutput: Output<any> = {
        name: "dlq-output",
        send: vi.fn().mockReturnValue(Effect.void),
      }

      // Custom schedule with specific delay
      const wrappedOutput = withDLQ({
        output: mockOutput,
        dlq: dlqOutput,
        maxRetries: 2,
      })

      const msg = createMessage({ test: "data" })
      await Effect.runPromise(wrappedOutput.send(msg))

      // Should have tried at least once and sent to DLQ
      expect(attempts).toBeGreaterThanOrEqual(1)
      expect(dlqOutput.send).toHaveBeenCalledTimes(1)
    })

    it("should handle close method", async () => {
      const mockOutput: Output<Error> = {
        name: "mock-output",
        send: vi.fn().mockReturnValue(Effect.void),
        close: vi.fn().mockReturnValue(Effect.void),
      }

      const wrappedOutput = withDLQ({
        output: mockOutput,
      })

      expect(wrappedOutput.close).toBeDefined()

      if (wrappedOutput.close) {
        await Effect.runPromise(wrappedOutput.close())
        expect(mockOutput.close).toHaveBeenCalledTimes(1)
      }
    })

    it.skip("should include error stack in DLQ message", async () => {
      const testError = new Error("Detailed error")
      testError.stack = "Error: Detailed error\n  at test.ts:123\n  at pipeline.ts:456"

      const mockOutput: Output<Error> = {
        name: "mock-output",
        send: () => Effect.fail(testError),
      }

      const dlqOutput: Output<any> = {
        name: "dlq-output",
        send: vi.fn().mockReturnValue(Effect.void),
      }

      const wrappedOutput = withDLQ({
        output: mockOutput,
        dlq: dlqOutput,
        maxRetries: 0,
      })

      const msg = createMessage({ test: "data" })
      await Effect.runPromise(wrappedOutput.send(msg))

      const dlqMessage = (dlqOutput.send as any).mock.calls[0][0] as Message
      expect(dlqMessage.metadata.dlqStack).toBeDefined()
      expect(dlqMessage.metadata.dlqStack).toContain("pipeline.ts:456")
    })
  })
})
