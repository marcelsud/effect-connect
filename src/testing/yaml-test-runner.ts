/**
 * YAML Test Runner
 *
 * Runs tests defined in YAML files using the testing utilities
 */
import { Effect } from "effect"
import { glob } from "glob"
import { parseTestFile, type Test, type TestFile } from "./test-file-parser.js"
import { buildPipeline } from "../core/pipeline-builder.js"
import { run as runPipeline } from "../core/pipeline.js"
import { executeAssertions, type AssertionContext } from "./assertions.js"

/**
 * Test result for a single test case
 */
export interface TestResult {
  readonly testName: string
  readonly passed: boolean
  readonly duration: number
  readonly error?: string
  readonly assertionResults?: readonly {
    readonly passed: boolean
    readonly message: string
  }[]
}

/**
 * Test file result
 */
export interface TestFileResult {
  readonly fileName: string
  readonly tests: readonly TestResult[]
  readonly passed: boolean
  readonly duration: number
}

/**
 * Overall test run result
 */
export interface TestRunResult {
  readonly files: readonly TestFileResult[]
  readonly totalTests: number
  readonly passedTests: number
  readonly failedTests: number
  readonly duration: number
}

/**
 * Run a single test case
 */
const runTest = (test: Test, _fileName: string) =>
  Effect.gen(function* () {
    const startTime = Date.now()

    // Build pipeline from test config
    const pipeline = yield* buildPipeline({
      input: test.pipeline.input,
      pipeline: {
        processors: test.pipeline.processors ?? []
      },
      output: test.pipeline.output
    })

    // Run pipeline
    const result = yield* runPipeline(pipeline)

    // Get captured messages
    const output = pipeline.output as any
    const outputMessages = output.getMessages
      ? yield* output.getMessages()
      : []

    // Check if test expects error
    if (test.expectError) {
      if (result.success) {
        return {
          testName: test.name,
          passed: false,
          duration: Date.now() - startTime,
          error: "Expected pipeline to fail but it succeeded"
        }
      }

      // Verify error type if specified
      if (test.expectError.type) {
        const errorType = (result as any).error?._tag
        if (errorType !== test.expectError.type) {
          return {
            testName: test.name,
            passed: false,
            duration: Date.now() - startTime,
            error: `Expected error type '${test.expectError.type}' but got '${errorType}'`
          }
        }
      }

      // Verify error message contains expected string
      if (test.expectError.messageContains) {
        const errorMessage = String((result as any).error?.message ?? "")
        if (!errorMessage.includes(test.expectError.messageContains)) {
          return {
            testName: test.name,
            passed: false,
            duration: Date.now() - startTime,
            error: `Expected error message to contain '${test.expectError.messageContains}' but got: ${errorMessage}`
          }
        }
      }

      return {
        testName: test.name,
        passed: true,
        duration: Date.now() - startTime
      }
    }

    // If no error expected, verify pipeline succeeded
    if (!result.success) {
      return {
        testName: test.name,
        passed: false,
        duration: Date.now() - startTime,
        error: `Pipeline failed: ${(result as any).error}`
      }
    }

    // Run assertions if provided
    if (test.assertions && test.assertions.length > 0) {
      const context: AssertionContext = {
        outputMessages,
        pipelineSuccess: result.success
      }

      const assertionResults = yield* executeAssertions(test.assertions, context)

      const allPassed = assertionResults.every(r => r.passed)

      return {
        testName: test.name,
        passed: allPassed,
        duration: Date.now() - startTime,
        assertionResults: assertionResults.map(r => ({
          passed: r.passed,
          message: r.message
        }))
      }
    }

    // No assertions, just check if pipeline succeeded
    return {
      testName: test.name,
      passed: true,
      duration: Date.now() - startTime
    }
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed({
        testName: test.name,
        passed: false,
        duration: Date.now(),
        error: `Unexpected error: ${error}`
      })
    )
  )

/**
 * Run all tests in a test file
 */
const runTestFile = (testFile: TestFile, fileName: string) =>
  Effect.gen(function* () {
    const startTime = Date.now()

    const testResults = yield* Effect.all(
      testFile.tests.map(test => runTest(test, fileName)),
      { concurrency: 1 } // Run tests sequentially
    )

    const passed = testResults.every(r => r.passed)

    return {
      fileName,
      tests: testResults,
      passed,
      duration: Date.now() - startTime
    }
  })

/**
 * Find test files matching pattern
 */
export const findTestFiles = (pattern: string): Effect.Effect<readonly string[], Error> =>
  Effect.tryPromise({
    try: async () => {
      const files = await glob(pattern, {
        absolute: true,
        nodir: true
      })
      return files
    },
    catch: (error) => new Error(`Failed to find test files: ${error}`)
  })

/**
 * Run YAML tests
 */
export const runYamlTests = (pattern: string) =>
  Effect.gen(function* () {
    const startTime = Date.now()

    // Find test files
    const filePaths = yield* findTestFiles(pattern)

    if (filePaths.length === 0) {
      yield* Effect.log(`No test files found matching pattern: ${pattern}`)
      return {
        files: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        duration: 0
      }
    }

    yield* Effect.log(`Found ${filePaths.length} test file(s)`)

    // Parse test files
    const testFiles = yield* Effect.all(
      filePaths.map(filePath =>
        parseTestFile(filePath).pipe(
          Effect.map(testFile => ({ filePath, testFile })),
          Effect.mapError((error) => new Error(error.message))
        )
      )
    )

    // Run all test files
    const fileResults = yield* Effect.all(
      testFiles.map(({ filePath, testFile }) =>
        runTestFile(testFile, filePath)
      ),
      { concurrency: 1 } // Run files sequentially
    )

    // Calculate totals
    const totalTests = fileResults.reduce((sum, file) => sum + file.tests.length, 0)
    const passedTests = fileResults.reduce(
      (sum, file) => sum + file.tests.filter(t => t.passed).length,
      0
    )
    const failedTests = totalTests - passedTests

    return {
      files: fileResults,
      totalTests,
      passedTests,
      failedTests,
      duration: Date.now() - startTime
    }
  })

/**
 * Format test results for display
 */
export const formatTestResults = (result: TestRunResult): string => {
  const lines: string[] = []

  lines.push("")
  lines.push("=" .repeat(70))
  lines.push("YAML Test Results")
  lines.push("=".repeat(70))
  lines.push("")

  for (const file of result.files) {
    const fileStatus = file.passed ? "✓" : "✗"
    lines.push(`${fileStatus} ${file.fileName} (${file.duration}ms)`)

    for (const test of file.tests) {
      const testStatus = test.passed ? "  ✓" : "  ✗"
      lines.push(`${testStatus} ${test.testName} (${test.duration}ms)`)

      if (test.error) {
        lines.push(`     Error: ${test.error}`)
      }

      if (test.assertionResults) {
        for (const assertion of test.assertionResults) {
          lines.push(`     ${assertion.message}`)
        }
      }
    }

    lines.push("")
  }

  lines.push("=".repeat(70))
  lines.push(`Tests: ${result.passedTests} passed, ${result.failedTests} failed, ${result.totalTests} total`)
  lines.push(`Time:  ${result.duration}ms`)
  lines.push("=".repeat(70))
  lines.push("")

  return lines.join("\n")
}
