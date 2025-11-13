#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== HTTP Processor Authentication & Headers E2E Test ===${NC}\n"

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

# Run the HTTP processor auth pipeline
echo -e "${YELLOW}Running HTTP processor authentication pipeline...${NC}"
timeout 30s node dist/cli.js run tests/e2e/configs/http-processor-auth-test.yaml > /tmp/http-processor-auth.log 2>&1 &
PIPELINE_PID=$!

# Wait for pipeline to complete
sleep 10

# Kill if still running
kill $PIPELINE_PID 2>/dev/null || true
wait $PIPELINE_PID 2>/dev/null || true

# Show pipeline output
cat /tmp/http-processor-auth.log

# Check if authentication headers were sent correctly
# httpbin /bearer adds bearer auth attempts to metadata
# httpbin /basic-auth adds basic auth attempts to metadata
# httpbin /headers echoes back all headers including custom ones
BEARER_AUTH_COUNT=$(grep -c '"bearerAuth"' /tmp/http-processor-auth.log || echo "0")
BASIC_AUTH_COUNT=$(grep -c '"basicAuth"' /tmp/http-processor-auth.log || echo "0")
CUSTOM_HEADER_COUNT=$(grep -c '"X-Api-Key"' /tmp/http-processor-auth.log || echo "0")
SUCCESS_COUNT=$(grep -c "Processed: 3 messages" /tmp/http-processor-auth.log || echo "0")

echo -e "\n${YELLOW}Results:${NC}"
echo -e "Bearer auth attempts: ${BEARER_AUTH_COUNT}"
echo -e "Basic auth attempts: ${BASIC_AUTH_COUNT}"
echo -e "Custom headers present: ${CUSTOM_HEADER_COUNT}"
echo -e "Pipeline success: ${SUCCESS_COUNT}"

# Cleanup
docker-compose -f tests/e2e/infrastructure/http/docker-compose.yml down -v

# We expect all 3 types of auth/headers to be attempted and custom headers to be sent
if [ "$BEARER_AUTH_COUNT" -ge "3" ] && [ "$BASIC_AUTH_COUNT" -ge "3" ] && [ "$CUSTOM_HEADER_COUNT" -ge "3" ] && [ "$SUCCESS_COUNT" -eq "1" ]; then
    echo -e "\n${GREEN}✓ HTTP Processor Authentication test PASSED${NC}"
    echo -e "  - Processed 3 messages"
    echo -e "  - Bearer token authentication attempted"
    echo -e "  - Basic authentication attempted"
    echo -e "  - Custom headers sent correctly"
    exit 0
else
    echo -e "\n${RED}✗ HTTP Processor Authentication test FAILED${NC}"
    echo -e "  - Bearer auth attempts: ${BEARER_AUTH_COUNT} (expected >=3)"
    echo -e "  - Basic auth attempts: ${BASIC_AUTH_COUNT} (expected >=3)"
    echo -e "  - Custom headers: ${CUSTOM_HEADER_COUNT} (expected >=3)"
    echo -e "  - Pipeline success: ${SUCCESS_COUNT} (expected 1)"
    exit 1
fi
