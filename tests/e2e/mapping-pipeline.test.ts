import { describe, it, expect } from "vitest";
import { Effect, Stream } from "effect";
import { createMessage } from "../../src/core/types.js";
import { createMappingProcessor } from "../../src/processors/mapping-processor.js";
import { createMetadataProcessor } from "../../src/processors/metadata-processor.js";
import { create, run } from "../../src/core/pipeline.js";
import type { Message, Output } from "../../src/core/types.js";

describe("E2E: Mapping Pipeline", () => {
  it("should process e-commerce orders with complex JSONata transformations", async () => {
    // Simulate order messages from input
    const orderMessages = [
      createMessage({
        orderId: "ORD-001",
        customer: {
          firstName: "john",
          lastName: "doe",
          email: "JOHN@EXAMPLE.COM",
          tier: "gold",
        },
        items: [
          { sku: "LAPTOP-X1", name: "Gaming Laptop", price: 1299.99, qty: 1 },
          { sku: "MOUSE-G2", name: "wireless mouse", price: 49.99, qty: 2 },
        ],
        shipping: { state: "CA" },
      }),
      createMessage({
        orderId: "ORD-002",
        customer: {
          firstName: "jane",
          lastName: "smith",
          email: "JANE@EXAMPLE.COM",
          tier: "silver",
        },
        items: [
          { sku: "DESK-P1", name: "standing desk", price: 599.0, qty: 1 },
        ],
        shipping: { state: "NY" },
      }),
    ];

    const mockInput = {
      name: "mock-input",
      stream: Stream.fromIterable(orderMessages),
    };

    // Metadata processor: add correlation ID
    const metadataProcessor = createMetadataProcessor({
      correlationIdField: "correlationId",
      addTimestamp: true,
    });

    // Mapping processor: complex transformation
    const mappingProcessor = createMappingProcessor({
      expression: `
        (
          $subtotal := $sum(items.(price * qty));
          $discount := customer.tier = "gold" ? 0.15 :
                       customer.tier = "silver" ? 0.10 : 0.05;
          $taxRate := shipping.state = "CA" ? 0.0725 :
                      shipping.state = "NY" ? 0.08875 : 0.06;
          $tax := ($subtotal - ($subtotal * $discount)) * $taxRate;

          {
            "orderId": orderId,
            "customer": {
              "fullName": $uppercase(customer.firstName) & " " & $uppercase(customer.lastName),
              "email": $lowercase(customer.email),
              "tier": customer.tier,
              "discountRate": $discount * 100 & "%"
            },
            "items": items.{
              "sku": sku,
              "name": $uppercase(name),
              "price": price,
              "qty": qty,
              "total": price * qty
            },
            "pricing": {
              "subtotal": $subtotal,
              "discount": $subtotal * $discount,
              "tax": $tax,
              "total": $subtotal - ($subtotal * $discount) + $tax
            },
            "itemCount": $count(items),
            "categories": $distinct(items.sku.$substringBefore("-"))
          }
        )
      `,
    });

    // Mock output that collects results
    const processedOrders: Message[] = [];
    const mockOutput: Output = {
      name: "mock-output",
      send: (msg: Message) =>
        Effect.sync(() => {
          processedOrders.push(msg);
        }),
    };

    // Create and run pipeline
    const pipeline = create({
      name: "order-processing-pipeline",
      input: mockInput,
      processors: [metadataProcessor, mappingProcessor],
      output: mockOutput,
    });

    const result = await Effect.runPromise(run(pipeline));

    // Assertions
    expect(result.success).toBe(true);
    expect(result.stats.processed).toBe(2);
    expect(result.stats.failed).toBe(0);
    expect(processedOrders).toHaveLength(2);

    // Sort orders by orderId to handle concurrent processing
    const sortedOrders = processedOrders.sort((a, b) =>
      a.content.orderId.localeCompare(b.content.orderId),
    );

    // Verify first order (gold tier, CA tax)
    const order1 = sortedOrders[0].content;
    expect(order1.orderId).toBe("ORD-001");
    expect(order1.customer.fullName).toBe("JOHN DOE");
    expect(order1.customer.email).toBe("john@example.com");
    expect(order1.customer.discountRate).toBe("15%");

    // Check transformed items
    expect(order1.items).toHaveLength(2);
    expect(order1.items[0].name).toBe("GAMING LAPTOP");
    expect(order1.items[1].name).toBe("WIRELESS MOUSE");
    expect(order1.items[1].total).toBe(99.98);

    // Check pricing calculations
    expect(order1.pricing.subtotal).toBeCloseTo(1399.97);
    expect(order1.pricing.discount).toBeCloseTo(209.9955);
    expect(order1.itemCount).toBe(2);
    expect(order1.categories).toContain("LAPTOP");
    expect(order1.categories).toContain("MOUSE");

    // Verify second order (silver tier, NY tax)
    const order2 = sortedOrders[1].content;
    expect(order2.customer.fullName).toBe("JANE SMITH");
    expect(order2.customer.discountRate).toBe("10%");
    expect(order2.itemCount).toBe(1);

    // Verify metadata was added
    expect(processedOrders[0].correlationId).toBeDefined();
    expect(processedOrders[0].metadata.processedBy).toBe("metadata-processor");
    expect(processedOrders[0].metadata.mappingApplied).toBe(true);
  });

  it("should handle IoT sensor data aggregation", async () => {
    const sensorMessages = [
      createMessage({
        deviceId: "sensor-001",
        readings: [
          { timestamp: 1642248000, temp: 22.5, humidity: 45 },
          { timestamp: 1642248060, temp: 23.1, humidity: 46 },
          { timestamp: 1642248120, temp: 24.8, humidity: 48 },
          { timestamp: 1642248180, temp: 26.2, humidity: 52 },
        ],
        location: { building: "HQ", floor: 3, room: "server-room-a" },
      }),
    ];

    const mockInput = {
      name: "mock-input",
      stream: Stream.fromIterable(sensorMessages),
    };

    const mappingProcessor = createMappingProcessor({
      expression: `
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
              },
              "humidity": {
                "average": $round($average($readings.humidity), 1),
                "max": $max($readings.humidity)
              }
            },
            "alert": $maxTemp > 25 ? {
              "severity": $maxTemp > 27 ? "critical" : "warning",
              "message": "High temperature detected"
            } : null,
            "readingCount": $count($readings)
          }
        )
      `,
    });

    const processedData: Message[] = [];
    const mockOutput: Output = {
      name: "mock-output",
      send: (msg: Message) =>
        Effect.sync(() => {
          processedData.push(msg);
        }),
    };

    const pipeline = create({
      name: "iot-pipeline",
      input: mockInput,
      processors: [mappingProcessor],
      output: mockOutput,
    });

    const result = await Effect.runPromise(run(pipeline));

    expect(result.success).toBe(true);
    expect(processedData).toHaveLength(1);

    const analyzed = processedData[0].content;
    expect(analyzed.device.location).toBe("HQ/3/server-room-a");
    expect(analyzed.analysis.temperature.average).toBeCloseTo(24.2, 1);
    expect(analyzed.analysis.temperature.max).toBe(26.2);
    expect(analyzed.analysis.temperature.min).toBe(22.5);
    expect(analyzed.analysis.temperature.trend).toBe("rising");
    expect(analyzed.alert).toBeDefined();
    expect(analyzed.alert.severity).toBe("warning");
    expect(analyzed.readingCount).toBe(4);
  });

  it("should handle empty input gracefully", async () => {
    const mockInput = {
      name: "mock-input",
      stream: Stream.empty,
    };

    const mappingProcessor = createMappingProcessor({
      expression: `{ "result": value }`,
    });

    const processedData: Message[] = [];
    const mockOutput: Output = {
      name: "mock-output",
      send: (msg: Message) =>
        Effect.sync(() => {
          processedData.push(msg);
        }),
    };

    const pipeline = create({
      name: "empty-pipeline",
      input: mockInput,
      processors: [mappingProcessor],
      output: mockOutput,
    });

    const result = await Effect.runPromise(run(pipeline));

    expect(result.success).toBe(true);
    expect(result.stats.processed).toBe(0);
    expect(processedData).toHaveLength(0);
  });
});
