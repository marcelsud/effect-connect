import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { createUppercaseProcessor } from "../../../src/processors/uppercase-processor.js";
import { createMessage } from "../../../src/core/types.js";

describe("UppercaseProcessor", () => {
  it("should transform specified field to uppercase", async () => {
    const processor = createUppercaseProcessor({
      fields: ["name"],
    });

    const message = createMessage({ name: "hello world", value: 123 });

    const result = await Effect.runPromise(processor.process(message));

    expect(result.content.name).toBe("HELLO WORLD");
    expect(result.content.value).toBe(123);
  });

  it("should transform multiple fields to uppercase", async () => {
    const processor = createUppercaseProcessor({
      fields: ["name", "title"],
    });

    const message = createMessage({
      name: "john doe",
      title: "software engineer",
      age: 30,
    });

    const result = await Effect.runPromise(processor.process(message));

    expect(result.content.name).toBe("JOHN DOE");
    expect(result.content.title).toBe("SOFTWARE ENGINEER");
    expect(result.content.age).toBe(30);
  });

  it("should handle nested fields", async () => {
    const processor = createUppercaseProcessor({
      fields: ["user.name"],
    });

    const message = createMessage({
      user: {
        name: "jane smith",
        email: "jane@example.com",
      },
    });

    const result = await Effect.runPromise(processor.process(message));

    expect(result.content.user.name).toBe("JANE SMITH");
    expect(result.content.user.email).toBe("jane@example.com");
  });

  it("should skip non-string fields", async () => {
    const processor = createUppercaseProcessor({
      fields: ["name", "value"],
    });

    const message = createMessage({ name: "test", value: 123 });

    const result = await Effect.runPromise(processor.process(message));

    expect(result.content.name).toBe("TEST");
    expect(result.content.value).toBe(123); // unchanged
  });

  it("should add metadata about transformed fields", async () => {
    const processor = createUppercaseProcessor({
      fields: ["name"],
    });

    const message = createMessage({ name: "test" });

    const result = await Effect.runPromise(processor.process(message));

    expect(result.metadata.uppercasedFields).toEqual(["name"]);
  });
});
