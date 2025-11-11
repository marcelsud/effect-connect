#!/usr/bin/env node
/**
 * CLI entry point for running pipelines
 */
import { Effect, Logger, LogLevel } from "effect"
import { loadConfig } from "./core/config-loader.js"
import { buildPipeline } from "./core/pipeline-builder.js"
import { run } from "./core/pipeline.js"

/**
 * Main CLI function
 */
const main = Effect.gen(function* () {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Camel Connect JS - Apache Camel-inspired streaming library using Effect.js

Usage:
  npm run run-pipeline <config-file.yaml>

Example:
  npm run run-pipeline configs/example-pipeline.yaml

Options:
  -h, --help     Show this help message
  -v, --version  Show version information
    `)
    return
  }

  const configPath = args[0]

  yield* Effect.log(`Loading configuration from: ${configPath}`)

  // Load and validate config
  const config = yield* loadConfig(configPath)

  yield* Effect.log(`Configuration loaded successfully`)

  // Build pipeline from config
  const pipeline = yield* buildPipeline(config)

  yield* Effect.log(`Pipeline built successfully with ${pipeline.processors.length} processors`)

  // Run the pipeline
  yield* Effect.log("Starting pipeline execution...")
  const result = yield* run(pipeline)

  // Display results
  if (result.success) {
    yield* Effect.log("✓ Pipeline completed successfully!")
    yield* Effect.log(`  Processed: ${result.stats.processed} messages`)
    yield* Effect.log(`  Failed: ${result.stats.failed} messages`)
    yield* Effect.log(`  Duration: ${result.stats.duration}ms`)
  } else {
    yield* Effect.logError("✗ Pipeline failed!")
    if (result.errors) {
      yield* Effect.logError(`  Errors: ${result.errors.length}`)
      for (const error of result.errors) {
        yield* Effect.logError(`    - ${error}`)
      }
    }
    yield* Effect.fail(new Error("Pipeline execution failed"))
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Fatal error: ${error}`)
      process.exit(1)
    })
  )
)

// Run the CLI
Effect.runPromise(
  main.pipe(Logger.withMinimumLogLevel(LogLevel.Info))
).catch((error) => {
  console.error("Unhandled error:", error)
  process.exit(1)
})
