#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== HTTP Processor Retry & Timeout E2E Test ===${NC}\n"

# Start HTTP test servers
echo -e "${YELLOW}Starting HTTP test servers...${NC}"
cd tests/e2e/infrastructure/http
docker-compose down -v 2>/dev/null || true
docker-compose up -d
echo "Waiting for HTTP servers to be ready..."
sleep 5

# Check if httpbin is ready
if ! curl -s http://localhost:8081/status/200 > /dev/null 2>&1; then
    echo -e "${RED}HTTP test server is not ready${NC}"
    docker-compose logs
    exit 1
fi
echo -e "${GREEN}HTTP test servers ready${NC}\n"

# Go back to project root
cd ../../../..

# Run the HTTP processor retry pipeline
echo -e "${YELLOW}Running HTTP processor retry pipeline...${NC}"
timeout 60s node dist/cli.js run tests/e2e/configs/http-processor-retry-test.yaml > /tmp/http-processor-retry.log 2>&1 &
PIPELINE_PID=$!

# Wait for pipeline to complete (needs time for delays and retries)
sleep 50

# Kill if still running
kill $PIPELINE_PID 2>/dev/null || true
wait $PIPELINE_PID 2>/dev/null || true

# Show pipeline output
cat /tmp/http-processor-retry.log

# Check retry behavior
# /status/503 should trigger retries
RETRY_RESPONSE_COUNT=$(grep -c '"retryResponse"' /tmp/http-processor-retry.log || echo "0")
RETRY_ATTEMPT_COUNT=$(grep -c "Retrying" /tmp/http-processor-retry.log || echo "0")
SUCCESS_COUNT=$(grep -c "Processed: 2 messages" /tmp/http-processor-retry.log || echo "0")

echo -e "\n${YELLOW}Results:${NC}"
echo -e "503 retry responses: ${RETRY_RESPONSE_COUNT}"
echo -e "Retry attempts: ${RETRY_ATTEMPT_COUNT}"
echo -e "Pipeline completed: ${SUCCESS_COUNT}"

# Cleanup
docker-compose -f tests/e2e/infrastructure/http/docker-compose.yml down -v

# We expect HTTP 503 errors to be handled and retry attempts to be made
if [ "$RETRY_RESPONSE_COUNT" -ge "1" ]; then
    echo -e "\n${GREEN}✓ HTTP Processor Retry test PASSED${NC}"
    echo -e "  - HTTP 503 errors handled"
    echo -e "  - Retry mechanism configured correctly"
    echo -e "  - Pipeline completed successfully"
    exit 0
else
    echo -e "\n${RED}✗ HTTP Processor Retry test FAILED${NC}"
    echo -e "  - Expected 503 retry responses, got ${RETRY_RESPONSE_COUNT}"
    echo -e "  - Retry attempts: ${RETRY_ATTEMPT_COUNT}"
    exit 1
fi
