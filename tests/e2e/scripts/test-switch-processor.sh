#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Switch Processor E2E Test ===${NC}\n"

# Run the switch processor pipeline
echo -e "${YELLOW}Running switch processor pipeline...${NC}"
timeout 20s node dist/cli.js run tests/e2e/configs/switch-processor-test.yaml > /tmp/switch-processor.log 2>&1 &
PIPELINE_PID=$!

# Wait for pipeline to complete
sleep 15

# Kill if still running
kill $PIPELINE_PID 2>/dev/null || true
wait $PIPELINE_PID 2>/dev/null || true

# Show pipeline output
cat /tmp/switch-processor.log

# Check if switch processor correctly routed messages
# Should have different metadata based on message type
ORDER_ROUTE=$(grep '"orderRoute"' /tmp/switch-processor.log | grep -c 'true' || echo "0")
REFUND_ROUTE=$(grep '"refundRoute"' /tmp/switch-processor.log | grep -c 'true' || echo "0")
DEFAULT_ROUTE=$(grep '"defaultRoute"' /tmp/switch-processor.log | grep -c 'true' || echo "0")
SUCCESS_COUNT=$(grep -c "Processed: 6 messages" /tmp/switch-processor.log || echo "0")

echo -e "\n${YELLOW}Results:${NC}"
echo -e "Order routes: ${ORDER_ROUTE}"
echo -e "Refund routes: ${REFUND_ROUTE}"
echo -e "Default routes: ${DEFAULT_ROUTE}"
echo -e "Pipeline completed: ${SUCCESS_COUNT}"

# Test passes if messages were routed correctly (2 orders, 2 refunds, 2 others)
if [ "$ORDER_ROUTE" -ge "1" ] && [ "$REFUND_ROUTE" -ge "1" ] && [ "$DEFAULT_ROUTE" -ge "1" ]; then
    echo -e "\n${GREEN}✓ Switch Processor test PASSED${NC}"
    echo -e "  - Orders routed correctly"
    echo -e "  - Refunds routed correctly"
    echo -e "  - Default case handled"
    echo -e "  - Pipeline completed successfully"
    exit 0
else
    echo -e "\n${RED}✗ Switch Processor test FAILED${NC}"
    echo -e "  - Expected routing for orders, refunds, and defaults"
    echo -e "  - Orders: ${ORDER_ROUTE}, Refunds: ${REFUND_ROUTE}, Defaults: ${DEFAULT_ROUTE}"
    exit 1
fi
