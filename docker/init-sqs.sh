#!/bin/bash

echo "Waiting for LocalStack to be ready..."
sleep 5

echo "Creating SQS queue..."
docker exec -e AWS_ACCESS_KEY_ID=test -e AWS_SECRET_ACCESS_KEY=test camel-connect-localstack \
  aws --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  sqs create-queue \
  --queue-name test-queue

echo "SQS queue 'test-queue' created!"

echo "Getting queue URL..."
QUEUE_URL=$(docker exec -e AWS_ACCESS_KEY_ID=test -e AWS_SECRET_ACCESS_KEY=test camel-connect-localstack \
  aws --endpoint-url=http://localhost:4566 \
  --region us-east-1 \
  sqs get-queue-url \
  --queue-name test-queue \
  --query 'QueueUrl' \
  --output text)

echo "Queue URL: $QUEUE_URL"

echo "Sending test messages..."
for i in {1..5}; do
  docker exec -e AWS_ACCESS_KEY_ID=test -e AWS_SECRET_ACCESS_KEY=test camel-connect-localstack \
    aws --endpoint-url=http://localhost:4566 \
    --region us-east-1 \
    sqs send-message \
    --queue-url "$QUEUE_URL" \
    --message-body "{\"name\":\"test message $i\",\"value\":$i}"
  echo "Sent message $i"
done

echo "Setup complete! Queue has 5 messages ready."
