Level 5 — Observability
- config alarm 
- view metrics, cpu, ...


                 OBSERVABILITY
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
      Logs         Metrics        Traces
        │             │             │
        ▼             ▼             ▼
      Loki        Prometheus     Tempo/Jaeger
        │             │             │
        └─────────────┼─────────────┘
                      ▼
                   Grafana


