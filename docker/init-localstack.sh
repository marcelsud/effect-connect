#!/bin/bash

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
until curl -s http://localhost:4566/_localstack/health | grep -q '"sqs": "available"'; do
  echo "Waiting for SQS service..."
  sleep 2
done

echo "LocalStack is ready!"

# Create SQS queue
echo "Creating SQS queue..."
aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    sqs create-queue \
    --queue-name test-queue \
    --attributes VisibilityTimeout=30

echo "SQS queue 'test-queue' created successfully!"

# Get queue URL
QUEUE_URL=$(aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    sqs get-queue-url \
    --queue-name test-queue \
    --query 'QueueUrl' \
    --output text)

echo "Queue URL: $QUEUE_URL"

# Send some test messages
echo "Sending test messages..."
for i in {1..5}; do
  aws --endpoint-url=http://localhost:4566 \
      --region us-east-1 \
      sqs send-message \
      --queue-url "$QUEUE_URL" \
      --message-body "{\"name\":\"test message $i\",\"value\":$i}"
  echo "Sent message $i"
done

echo "Setup complete!"
