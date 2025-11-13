#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== HTTP Processor (API Enrichment) E2E Test ===${NC}\n"

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

# Run the HTTP processor pipeline
echo -e "${YELLOW}Running HTTP processor pipeline...${NC}"
timeout 30s node dist/cli.js run tests/e2e/configs/http-processor-test.yaml > /tmp/http-processor.log 2>&1 &
PIPELINE_PID=$!

# Wait for pipeline to complete
sleep 10

# Kill if still running
kill $PIPELINE_PID 2>/dev/null || true
wait $PIPELINE_PID 2>/dev/null || true

# Show pipeline output
cat /tmp/http-processor.log

# Check if enrichment happened
ENRICHED_COUNT=$(grep -c '"enrichment"' /tmp/http-processor.log || echo "0")
SUCCESS_COUNT=$(grep -c "Processed: 2 messages" /tmp/http-processor.log || echo "0")

echo -e "\n${YELLOW}Results:${NC}"
echo -e "Enriched messages: ${ENRICHED_COUNT}"
echo -e "Pipeline success: ${SUCCESS_COUNT}"

# Cleanup
docker-compose -f tests/e2e/infrastructure/http/docker-compose.yml down -v

if [ "$ENRICHED_COUNT" -eq "2" ] && [ "$SUCCESS_COUNT" -eq "1" ]; then
    echo -e "\n${GREEN}✓ HTTP Processor test PASSED${NC}"
    echo -e "  - Processed 2 messages"
    echo -e "  - Enriched with HTTP API responses"
    echo -e "  - API calls successful"
    exit 0
else
    echo -e "\n${RED}✗ HTTP Processor test FAILED${NC}"
    echo -e "  - Expected 2 enriched messages, got ${ENRICHED_COUNT}"
    echo -e "  - Expected pipeline success, got ${SUCCESS_COUNT}"
    exit 1
fi
