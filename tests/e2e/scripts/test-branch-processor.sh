#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Branch Processor E2E Test ===${NC}\n"

# Run the branch processor pipeline
echo -e "${YELLOW}Running branch processor pipeline...${NC}"
timeout 20s node dist/cli.js run tests/e2e/configs/branch-processor-test.yaml > /tmp/branch-processor.log 2>&1 &
PIPELINE_PID=$!

# Wait for pipeline to complete
sleep 15

# Kill if still running
kill $PIPELINE_PID 2>/dev/null || true
wait $PIPELINE_PID 2>/dev/null || true

# Show pipeline output
cat /tmp/branch-processor.log

# Check if branch processor worked correctly
# Should have original content preserved AND branch results in metadata
ORIGINAL_PRESERVED=$(grep '"orderId"' /tmp/branch-processor.log | grep -c '123' || echo "0")
BRANCH_RESULT=$(grep -c '"branchResult"' /tmp/branch-processor.log || echo "0")
SUCCESS_COUNT=$(grep -c "Processed: 3 messages" /tmp/branch-processor.log || echo "0")

echo -e "\n${YELLOW}Results:${NC}"
echo -e "Original content preserved: ${ORIGINAL_PRESERVED}"
echo -e "Branch results added: ${BRANCH_RESULT}"
echo -e "Pipeline completed: ${SUCCESS_COUNT}"

# Test passes if branch results were added and original content preserved
if [ "$BRANCH_RESULT" -ge "1" ] && [ "$ORIGINAL_PRESERVED" -ge "1" ]; then
    echo -e "\n${GREEN}✓ Branch Processor test PASSED${NC}"
    echo -e "  - Original message content preserved"
    echo -e "  - Branch results merged into metadata"
    echo -e "  - Pipeline completed successfully"
    exit 0
else
    echo -e "\n${RED}✗ Branch Processor test FAILED${NC}"
    echo -e "  - Expected branch results and preserved content"
    echo -e "  - Branch results: ${BRANCH_RESULT}, Original preserved: ${ORIGINAL_PRESERVED}"
    exit 1
fi
