#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== HTTP Input (Webhook) E2E Test ===${NC}\n"

# Start the HTTP input pipeline in background
echo -e "${YELLOW}Starting HTTP webhook server...${NC}"
timeout 30s node dist/cli.js run tests/e2e/configs/http-input-test.yaml > /tmp/http-input.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
for i in {1..10}; do
    if curl -s http://localhost:8090/webhook > /dev/null 2>&1; then
        echo -e "${GREEN}Server is ready${NC}\n"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}Server failed to start${NC}"
        kill $SERVER_PID 2>/dev/null || true
        cat /tmp/http-input.log
        exit 1
    fi
    sleep 1
done

# Send test webhook requests
echo -e "${YELLOW}Sending webhook requests...${NC}"

# Send 3 test messages
for i in {1..3}; do
    echo "Sending message $i..."
    curl -X POST http://localhost:8090/webhook \
        -H "Content-Type: application/json" \
        -d "{\"messageId\": \"webhook-$i\", \"content\": \"Test webhook message $i\", \"timestamp\": \"$(date +%s)\"}" \
        -s -o /dev/null -w "Status: %{http_code}\n"
    sleep 1
done

# Give some time for processing
sleep 3

# Stop the server
echo -e "\n${YELLOW}Stopping server...${NC}"
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

# Show server output
echo -e "\n${YELLOW}Server output:${NC}"
cat /tmp/http-input.log

# Check if messages were received
RECEIVED_COUNT=$(grep -c "Test webhook message" /tmp/http-input.log || echo "0")
echo -e "\n${YELLOW}Messages received: ${RECEIVED_COUNT}${NC}"

if [ "$RECEIVED_COUNT" -eq "3" ]; then
    echo -e "\n${GREEN}✓ HTTP Input test PASSED${NC}"
    echo -e "  - Server started successfully"
    echo -e "  - Received 3 webhook messages"
    echo -e "  - Messages processed correctly"
    exit 0
else
    echo -e "\n${RED}✗ HTTP Input test FAILED${NC}"
    echo -e "  - Expected 3 messages, got ${RECEIVED_COUNT}"
    exit 1
fi
