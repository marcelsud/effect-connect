#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== HTTP Processor Complex Templates E2E Test ===${NC}\n"

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

# Run the HTTP processor templates pipeline
echo -e "${YELLOW}Running HTTP processor templates pipeline...${NC}"
timeout 30s node dist/cli.js run tests/e2e/configs/http-processor-templates-test.yaml > /tmp/http-processor-templates.log 2>&1 &
PIPELINE_PID=$!

# Wait for pipeline to complete
sleep 15

# Kill if still running
kill $PIPELINE_PID 2>/dev/null || true
wait $PIPELINE_PID 2>/dev/null || true

# Show pipeline output
cat /tmp/http-processor-templates.log

# Check template evaluation
# URL templates should have multiple variables: user, action, timestamp
# Body templates should include JSONata expressions
# httpbin /get echoes back query parameters as args
TEMPLATE_URL_COUNT=$(grep -c '"args"' /tmp/http-processor-templates.log || echo "0")
TEMPLATE_BODY_COUNT=$(grep -c '"data"' /tmp/http-processor-templates.log || echo "0")
SUCCESS_COUNT=$(grep -c "Processed: 3 messages" /tmp/http-processor-templates.log || echo "0")

echo -e "\n${YELLOW}Results:${NC}"
echo -e "URL templates evaluated: ${TEMPLATE_URL_COUNT}"
echo -e "Body templates evaluated: ${TEMPLATE_BODY_COUNT}"
echo -e "Pipeline success: ${SUCCESS_COUNT}"

# Cleanup
docker-compose -f tests/e2e/infrastructure/http/docker-compose.yml down -v

if [ "$TEMPLATE_URL_COUNT" -ge "3" ] && [ "$TEMPLATE_BODY_COUNT" -ge "3" ] && [ "$SUCCESS_COUNT" -eq "1" ]; then
    echo -e "\n${GREEN}✓ HTTP Processor Templates test PASSED${NC}"
    echo -e "  - Processed 3 messages"
    echo -e "  - URL templates with multiple variables"
    echo -e "  - Body templates with JSONata expressions"
    echo -e "  - Template evaluation successful"
    exit 0
else
    echo -e "\n${RED}✗ HTTP Processor Templates test FAILED${NC}"
    echo -e "  - Expected URL templates, got ${TEMPLATE_URL_COUNT}"
    echo -e "  - Expected body templates, got ${TEMPLATE_BODY_COUNT}"
    echo -e "  - Expected pipeline success, got ${SUCCESS_COUNT}"
    exit 1
fi
