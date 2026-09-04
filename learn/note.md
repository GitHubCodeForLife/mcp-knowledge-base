Level 1 — Microservices fundamentals
Spring Boot
REST
gRPC -> call btw services + loging + trace
PostgreSQL
Redis
Docker
Loging 
Configuration: icompara/DRM
SOFA router
ID generation


Level 2 — Distributed communication
Kafka
RabbitMQ
Async processing
Distributed Scheduler 
Idempotency
Retry
Timeout
Circuit Breaker
Dead Letter Queue

Level 3 — Kubernetes
Pod
Deployment
Service
Ingress
ConfigMap
Secret
HPA
Health Check
Rolling Deployment
Helm

Level 4 — Distributed-system problems

This is probably the most important level for your interviews/design work:

Distributed Transactions
      ↓
Saga
      ↓
Outbox Pattern
      ↓
Idempotency
      ↓
Distributed Lock
      ↓
Consistency
      ↓
Eventual Consistency
      ↓
CAP
      ↓
Failure Handling
      ↓
Reconciliation


Level 5 — Observability
Prometheus
    ↓
Grafana

Loki
    ↓
Grafana

OpenTelemetry
    ↓
Tempo / Jaeger
    ↓
Grafana

Level 6 — Production
AWS
Terraform
CI/CD
Argo CD
Security
Load Testing
Disaster Recovery
High Availability