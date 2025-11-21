# gRPC Integration Guide

This guide explains how to deploy Solin as a gRPC service for production use with encryption and security features.

## Overview

Solin provides a gRPC API for remote analysis of Solidity code. This is ideal for:

- Production deployments
- Microservices architectures
- CI/CD pipelines
- Enterprise integrations

## Features

- **High Performance**: Binary protocol with streaming support
- **Encryption**: AES-256-GCM encryption for code privacy
- **TLS Support**: Secure communication over the network
- **Streaming**: Analyze large files efficiently
- **Language Agnostic**: Use from any language with gRPC support

**Note:** The gRPC server currently supports a basic subset of 6 core rules for demonstration purposes. For production use with all 151 rules, the server code needs to be updated to register all available rules. See the REST API for full rule support.

## Quick Start

### 1. Start the gRPC Server

```bash
# Default (localhost:50051, no TLS)
node dist/grpc/server.js

# With custom port
GRPC_PORT=9090 node dist/grpc/server.js

# With TLS enabled
GRPC_TLS=true GRPC_CERT=/path/to/cert.pem GRPC_KEY=/path/to/key.pem node dist/grpc/server.js
```

### 2. Generate Client Code

```bash
# For Node.js/TypeScript
npm install @grpc/grpc-js @grpc/proto-loader

# For Python
pip install grpcio grpcio-tools
python -m grpc_tools.protoc -I./lib/grpc/proto --python_out=. --grpc_python_out=. solin.proto

# For Go
protoc --go_out=. --go-grpc_out=. lib/grpc/proto/solin.proto

# For Java
protoc --java_out=. --grpc-java_out=. lib/grpc/proto/solin.proto
```

## API Reference

### AnalyzeCode

Analyzes Solidity code and returns issues.

**Request:**

```protobuf
message AnalyzeRequest {
  string code = 1;
  string format = 2;
  repeated string rules = 3;
  string encryption_key = 4;
}
```

**Response:**

```protobuf
message AnalyzeResponse {
  string result = 1;
  int32 total_issues = 2;
  int32 errors = 3;
  int32 warnings = 4;
  int32 info = 5;
  int64 duration_ms = 6;
}
```

### ListRules

Lists available analysis rules.

**Request:**

```protobuf
message ListRulesRequest {
  string category = 1;
  string severity = 2;
}
```

**Response:**

```protobuf
message ListRulesResponse {
  repeated RuleInfo rules = 1;
  int32 total_count = 2;
}
```

### GetRule

Gets details of a specific rule.

**Request:**

```protobuf
message GetRuleRequest {
  string rule_id = 1;
}
```

**Response:**

```protobuf
message RuleResponse {
  RuleInfo rule = 1;
  bool found = 2;
}
```

### AnalyzeStream (Streaming)

Analyzes large files using streaming.

**Request Stream:**

```protobuf
message AnalyzeChunk {
  bytes data = 1;
  int32 chunk_index = 2;
  bool is_final = 3;
}
```

**Response Stream:**

```protobuf
message AnalysisResult {
  string issue_json = 1;
  int32 issue_index = 2;
  bool is_complete = 3;
}
```

## Client Examples

### Node.js/TypeScript

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

// Load proto
const packageDefinition = protoLoader.loadSync('solin.proto');
const solinProto = grpc.loadPackageDefinition(packageDefinition).solin;

// Create client
const client = new solinProto.SolinService('localhost:50051', grpc.credentials.createInsecure());

// Analyze code
client.AnalyzeCode(
  {
    code: contractCode,
    format: 'json',
    encryption_key: 'my-key',
  },
  (error, response) => {
    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Issues found:', response.total_issues);
    console.log('Result:', response.result);
  }
);
```

### Python

```python
import grpc
import solin_pb2
import solin_pb2_grpc

# Create channel
channel = grpc.insecure_channel('localhost:50051')
stub = solin_pb2_grpc.SolinServiceStub(channel)

# Analyze code
request = solin_pb2.AnalyzeRequest(
    code=contract_code,
    format='json'
)

response = stub.AnalyzeCode(request)
print(f'Issues found: {response.total_issues}')
print(f'Result: {response.result}')
```

### Go

```go
package main

import (
    "context"
    "log"

    "google.golang.org/grpc"
    pb "path/to/solin"
)

func main() {
    conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure())
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    client := pb.NewSolinServiceClient(conn)

    resp, err := client.AnalyzeCode(context.Background(), &pb.AnalyzeRequest{
        Code: contractCode,
        Format: "json",
    })

    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Issues found: %d\n", resp.TotalIssues)
}
```

## Encryption

### Setting Up Encryption

```typescript
import { EncryptionService } from './lib/grpc/encryption';

const encryption = new EncryptionService();

// Generate a key
const keyId = 'my-project-key';
const key = encryption.generateKey(keyId);

console.log('Save this key securely:', key);
```

### Encrypting Code

```typescript
// Encrypt code before sending
const encrypted = encryption.encrypt(contractCode, keyId);

// Send to server
client.AnalyzeCode(
  {
    code: encrypted,
    encryption_key: keyId,
  },
  callback
);
```

### Server-Side Decryption

The server automatically decrypts when `encryption_key` is provided:

```typescript
// Server decrypts automatically
const decryptedCode = encryption.decrypt(request.code, request.encryption_key);
```

## TLS/SSL Setup

### Generate Certificates

```bash
# Generate private key
openssl genrsa -out server-key.pem 2048

# Generate certificate signing request
openssl req -new -key server-key.pem -out server-csr.pem

# Generate self-signed certificate (for testing)
openssl x509 -req -in server-csr.pem -signkey server-key.pem -out server-cert.pem

# For production, use a certificate from a CA
```

### Start Server with TLS

```bash
GRPC_TLS=true \
GRPC_CERT=/path/to/server-cert.pem \
GRPC_KEY=/path/to/server-key.pem \
node dist/grpc/server.js
```

### Client with TLS

```typescript
import * as fs from 'fs';

const cert = fs.readFileSync('server-cert.pem');
const credentials = grpc.credentials.createSsl(cert);

const client = new solinProto.SolinService('localhost:50051', credentials);
```

## Streaming Analysis

For large files, use streaming:

```typescript
const stream = client.AnalyzeStream();

// Send chunks
const chunkSize = 64 * 1024; // 64KB chunks
for (let i = 0; i < code.length; i += chunkSize) {
  stream.write({
    data: Buffer.from(code.slice(i, i + chunkSize)),
    chunk_index: Math.floor(i / chunkSize),
    is_final: i + chunkSize >= code.length,
  });
}

// Receive results
stream.on('data', result => {
  if (!result.is_complete) {
    const issue = JSON.parse(result.issue_json);
    console.log('Issue:', issue);
  } else {
    console.log('Analysis complete');
  }
});

stream.on('end', () => {
  console.log('Stream ended');
});
```

## Production Deployment

### Docker

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY dist ./dist
COPY lib/grpc/proto ./lib/grpc/proto

EXPOSE 50051

CMD ["node", "dist/grpc/server.js"]
```

Build and run:

```bash
docker build -t solin-grpc .
docker run -p 50051:50051 solin-grpc
```

### Kubernetes

Create `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solin-grpc
spec:
  replicas: 3
  selector:
    matchLabels:
      app: solin-grpc
  template:
    metadata:
      labels:
        app: solin-grpc
    spec:
      containers:
        - name: solin
          image: solin-grpc:latest
          ports:
            - containerPort: 50051
          env:
            - name: GRPC_PORT
              value: '50051'
            - name: ENCRYPTION_ENABLED
              value: 'true'
---
apiVersion: v1
kind: Service
metadata:
  name: solin-grpc-service
spec:
  selector:
    app: solin-grpc
  ports:
    - protocol: TCP
      port: 50051
      targetPort: 50051
  type: LoadBalancer
```

## Performance Tuning

### Connection Pooling

```typescript
const pool = [];
for (let i = 0; i < 10; i++) {
  pool.push(new solinProto.SolinService('localhost:50051', credentials));
}

// Use round-robin
let index = 0;
function getClient() {
  return pool[index++ % pool.length];
}
```

### Caching

Enable caching on the server:

```bash
CACHE_ENABLED=true node dist/grpc/server.js
```

## Security Best Practices

1. **Always use TLS in production**
2. **Enable encryption for sensitive code**
3. **Implement authentication** (add auth interceptors)
4. **Rate limiting** (use nginx or envoy proxy)
5. **Network isolation** (use VPC/private networks)
6. **Rotate encryption keys** regularly
7. **Monitor and log** all requests

## Monitoring

Add metrics:

```typescript
import { collectDefaultMetrics, Counter, Histogram } from 'prom-client';

const requestCounter = new Counter({
  name: 'solin_grpc_requests_total',
  help: 'Total gRPC requests',
  labelNames: ['method', 'status'],
});

const requestDuration = new Histogram({
  name: 'solin_grpc_request_duration_seconds',
  help: 'gRPC request duration',
  labelNames: ['method'],
});
```

## Troubleshooting

### Connection Refused

- Check server is running
- Verify port is correct
- Check firewall rules

### TLS Errors

- Verify certificate paths
- Check certificate validity
- Ensure client trusts certificate

### Encryption Failures

- Verify encryption key exists
- Check key format (base64)
- Ensure key length matches algorithm

## Additional Resources

- [gRPC Documentation](https://grpc.io/docs/)
- [Protocol Buffers](https://protobuf.dev/)
- [TLS Best Practices](https://ssl-config.mozilla.org/)
- [Solin Documentation](../README.md)

---

For support, visit: https://github.com/0xmhha/solin/issues
