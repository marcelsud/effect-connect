import { describe, it, expect } from "vitest";
import { createHttpOutput } from "../../../src/outputs/http-output.js";

describe("HttpOutput", () => {
  describe("Configuration Validation", () => {
    it("should create output with valid POST configuration", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
          method: "POST",
        }),
      ).not.toThrow();
    });

    it("should create output with valid PUT configuration", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
          method: "PUT",
        }),
      ).not.toThrow();
    });

    it("should create output with valid PATCH configuration", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
          method: "PATCH",
        }),
      ).not.toThrow();
    });

    it("should default to POST when method not specified", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
        }),
      ).not.toThrow();
    });

    it("should validate HTTP URL format", () => {
      expect(() =>
        createHttpOutput({
          url: "not-a-valid-url",
        }),
      ).toThrow();
    });

    it("should accept HTTP URLs", () => {
      expect(() =>
        createHttpOutput({
          url: "http://example.com/webhook",
        }),
      ).not.toThrow();
    });

    it("should accept HTTPS URLs", () => {
      expect(() =>
        createHttpOutput({
          url: "https://example.com/webhook",
        }),
      ).not.toThrow();
    });

    it("should support custom headers configuration", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
          method: "POST",
          headers: {
            "X-Custom-Header": "custom-value",
            "X-Request-ID": "123",
          },
        }),
      ).not.toThrow();
    });

    it("should support Bearer authentication", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
          method: "POST",
          auth: {
            type: "bearer",
            token: "test-token-123",
          },
        }),
      ).not.toThrow();
    });

    it("should support Basic authentication", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
          method: "POST",
          auth: {
            type: "basic",
            username: "testuser",
            password: "testpass",
          },
        }),
      ).not.toThrow();
    });

    it("should throw on missing bearer token", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
          auth: {
            type: "bearer",
            // Missing token
          } as any,
        }),
      ).toThrow("Bearer token required");
    });

    it("should throw on missing basic auth credentials", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
          auth: {
            type: "basic",
            username: "testuser",
            // Missing password
          } as any,
        }),
      ).toThrow("Username and password required");
    });

    it("should support timeout configuration", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
          timeout: 10000,
        }),
      ).not.toThrow();
    });

    it("should support retry configuration", () => {
      expect(() =>
        createHttpOutput({
          url: "https://webhook.site/test",
          maxRetries: 5,
        }),
      ).not.toThrow();
    });
  });

  describe("Component Structure", () => {
    it("should have correct component name", () => {
      const output = createHttpOutput({
        url: "https://webhook.site/test",
      });

      expect(output.name).toBe("http-output");
    });

    it("should have send method", () => {
      const output = createHttpOutput({
        url: "https://webhook.site/test",
      });

      expect(typeof output.send).toBe("function");
    });

    it("should have close method", () => {
      const output = createHttpOutput({
        url: "https://webhook.site/test",
      });

      expect(typeof output.close).toBe("function");
    });
  });
});
