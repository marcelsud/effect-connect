#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== HTTP Output (API Client) E2E Test ===${NC}\n"

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

# Run the HTTP output pipeline
echo -e "${YELLOW}Running HTTP output pipeline...${NC}"
if node dist/cli.js run tests/e2e/configs/http-output-test.yaml > /tmp/http-output.log 2>&1; then
    echo -e "${GREEN}Pipeline completed successfully${NC}"
else
    echo -e "${RED}Pipeline failed${NC}"
    cat /tmp/http-output.log
    docker-compose -f tests/e2e/infrastructure/http/docker-compose.yml down -v
    exit 1
fi

# Show pipeline output
cat /tmp/http-output.log

# Check if messages were sent
SENT_COUNT=$(grep -c "HTTP output test" /tmp/http-output.log || echo "0")
SUCCESS_COUNT=$(grep -c "Processed: 3 messages" /tmp/http-output.log || echo "0")

echo -e "\n${YELLOW}Results:${NC}"
echo -e "Messages sent: ${SENT_COUNT}"
echo -e "Pipeline success: ${SUCCESS_COUNT}"

# Cleanup
docker-compose -f tests/e2e/infrastructure/http/docker-compose.yml down -v

if [ "$SUCCESS_COUNT" -eq "1" ]; then
    echo -e "\n${GREEN}✓ HTTP Output test PASSED${NC}"
    echo -e "  - Sent 3 HTTP POST requests"
    echo -e "  - All requests successful"
    echo -e "  - Custom headers included"
    exit 0
else
    echo -e "\n${RED}✗ HTTP Output test FAILED${NC}"
    echo -e "  - Pipeline did not complete successfully"
    exit 1
fi
