#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== HTTP Processor POST with Result Mapping E2E Test ===${NC}\n"

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

# Run the HTTP processor POST pipeline
echo -e "${YELLOW}Running HTTP processor POST pipeline...${NC}"
timeout 30s node dist/cli.js run tests/e2e/configs/http-processor-post-test.yaml > /tmp/http-processor-post.log 2>&1 &
PIPELINE_PID=$!

# Wait for pipeline to complete
sleep 10

# Kill if still running
kill $PIPELINE_PID 2>/dev/null || true
wait $PIPELINE_PID 2>/dev/null || true

# Show pipeline output
cat /tmp/http-processor-post.log

# Check if POST request worked and result_mapping transformed content
# httpbin /post echoes back the data, result_mapping should add it to content
API_RESPONSE_COUNT=$(grep -c '"apiResponse"' /tmp/http-processor-post.log || echo "0")
SUCCESS_COUNT=$(grep -c "Processed: 3 messages" /tmp/http-processor-post.log || echo "0")

echo -e "\n${YELLOW}Results:${NC}"
echo -e "Messages with API response in content: ${API_RESPONSE_COUNT}"
echo -e "Pipeline success: ${SUCCESS_COUNT}"

# Cleanup
docker-compose -f tests/e2e/infrastructure/http/docker-compose.yml down -v

if [ "$API_RESPONSE_COUNT" -eq "3" ] && [ "$SUCCESS_COUNT" -eq "1" ]; then
    echo -e "\n${GREEN}✓ HTTP Processor POST test PASSED${NC}"
    echo -e "  - Processed 3 messages"
    echo -e "  - Sent POST requests with body"
    echo -e "  - Result mapping transformed message content"
    exit 0
else
    echo -e "\n${RED}✗ HTTP Processor POST test FAILED${NC}"
    echo -e "  - Expected 3 messages with apiResponse, got ${API_RESPONSE_COUNT}"
    echo -e "  - Expected pipeline success, got ${SUCCESS_COUNT}"
    exit 1
fi
