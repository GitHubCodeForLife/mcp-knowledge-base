# Service A → B over HTTP — Test Case Checklist

Test cases derived from [service-a-b-distributed-systems.html](./service-a-b-distributed-systems.html).
Scope: Service A calls Service B over HTTP (both the internal-B and external-B cases).

**Legend:** P = Precondition/Setup · E = Expected behavior · ☐ = pending

---

## 1. Happy Path

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 1.1 | Synchronous success end-to-end | B returns HTTP 200 + business SUCCESS | A persists SUCCESS, returns success to client, order state = SUCCESS | ☐ |
| 1.2 | Response parsing & mapping | B returns full valid payload | A maps fields correctly through its client/adapter layer into its own domain model | ☐ |
| 1.3 | Latency within budget | B responds in < configured timeout | Call completes, latency metric recorded | ☐ |

---

## 2. Network & Connectivity Failures

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 2.1 | Connection timeout | B unreachable / port closed | A fails fast at connection timeout (not hanging), state = UNKNOWN/PENDING, error logged | ☐ |
| 2.2 | DNS resolution failure | B hostname unresolvable | A surfaces a clear error, no infinite retry loop, alert fires | ☐ |
| 2.3 | Packet loss / connection reset | Drop packets mid-request (e.g. via fault injection) | A hits response timeout, treats as UNKNOWN, safe to retry with idempotency key | ☐ |
| 2.4 | Load balancer failure | LB in front of B returns 502/503 | A treats as transient failure, retries per policy | ☐ |
| 2.5 | B fully down | B process stopped | A degrades gracefully (fallback/queue), does not cascade failure to A's own clients | ☐ |
| 2.6 | TLS handshake failure | Expired/invalid cert on B | A fails with clear TLS error, does NOT fall back to plain HTTP | ☐ |

---

## 3. Timeouts

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 3.1 | Connection timeout configured | B accepts TCP but never completes handshake | A aborts at configured connect timeout | ☐ |
| 3.2 | Response/read timeout configured | B accepts request, delays response beyond timeout | A aborts at read timeout, order marked UNKNOWN (NOT FAILED) | ☐ |
| 3.3 | Timeout < upstream client timeout | A's client waits X; A→B timeout must be < X | A returns/records result before its own caller times out | ☐ |
| 3.4 | Business/job timeout | Async job at B exceeds max duration | A marks job timed out, triggers stuck-job handling | ☐ |
| 3.5 | No infinite waits | Any B call | Verify every outbound call has an explicit finite timeout (no default "forever") | ☐ |

---

## 4. Delivery Uncertainty (Did B get/process it?)

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 4.1 | Scenario A: B never receives request | Request lost before B | A retries; B processes exactly once after retry | ☐ |
| 4.2 | Scenario B: B receives but fails | B returns 500 | A retries if transient; eventually FAILED or DLQ if permanent | ☐ |
| 4.3 | Scenario C: B succeeds but response lost | B commits SUCCESS, response dropped (A times out) | A does NOT blindly create duplicate — retry with idempotency key returns original result | ☐ |
| 4.4 | Timeout ≠ failure | A times out on a request B actually processed | A state = UNKNOWN, not FAILED; no incorrect failure returned to client | ☐ |

---

## 5. Idempotency

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 5.1 | Idempotency key sent | Any mutating A→B request | Request carries stable key (e.g. `Idempotency-Key: ORDER-123`) derived from A's business ID | ☐ |
| 5.2 | Same key, first request | Fresh key | B processes normally, returns result B-999 | ☐ |
| 5.3 | Same key, retry after timeout | Repeat 5.2 after simulated lost response | B returns existing result B-999, creates NO second order/resource | ☐ |
| 5.4 | Same key, different payload | Reuse key with changed body | B rejects or returns original result (depending on contract) — never silently creates conflicting state | ☐ |
| 5.5 | Key uniqueness per business op | Two different orders | Different keys generated; no key reuse across distinct operations | ☐ |
| 5.6 | B does not support idempotency | External B without idempotency support | A uses query-before-retry / reconciliation fallback; documented risk accepted | ☐ |

---

## 6. Consistency & State Machine

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 6.1 | Valid transitions only | Drive order through all paths | PENDING → PROCESSING → SUCCESS/FAILED/UNKNOWN → RECONCILING → SUCCESS/FAILED; invalid transitions rejected | ☐ |
| 6.2 | UNKNOWN state entered on timeout | Timeout during B call | Order in UNKNOWN; A can safely retry / query B / reconcile | ☐ |
| 6.3 | Terminal states immutable | Attempt to update SUCCESS/FAILED order | No state change; duplicate events/late responses ignored | ☐ |
| 6.4 | Temporary disagreement tolerated | A=PENDING, B=SUCCESS simultaneously | System converges to B's truth via polling/webhook/reconciliation without corruption | ☐ |
| 6.5 | Late response after reconciliation | Webhook/response arrives after reconciliation already set SUCCESS | Idempotent handling; no double-processing, no state regression | ☐ |

---

## 7. Transactional Outbox (A-side crash)

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 7.1 | Order + outbox in one transaction | Normal create | Order row and outbox event committed atomically in same DB transaction | ☐ |
| 7.2 | A crashes before calling B | Kill A after DB commit, before HTTP call | Worker picks up outbox event after restart; B is eventually called exactly once (with idempotency) | ☐ |
| 7.3 | Outbox event not lost on rollback | DB commit fails | No orphan outbox event; no call to B | ☐ |
| 7.4 | Outbox worker failure | Worker crashes mid-processing | Event re-delivered; idempotency key prevents duplicate at B | ☐ |
| 7.5 | Outbox event marked done | B returns SUCCESS | Outbox event marked processed, not re-sent | ☐ |

---

## 8. Retry Behavior

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 8.1 | Retry transient errors | B returns 500/502/503 or times out | A retries up to max attempts | ☐ |
| 8.2 | Do NOT retry 4xx | B returns 400/401/403/404/409 | A fails fast, no retry, clear error surfaced | ☐ |
| 8.3 | Exponential backoff | Force repeated transient failures | Retry delays grow exponentially (1s → 5s → 30s → 5m per policy) | ☐ |
| 8.4 | Jitter applied | Many A instances retrying same failing B | Retry times randomized; no thundering herd | ☐ |
| 8.5 | Max attempts bounded | B permanently failing | Retries stop after max; order → FAILED or DLQ; alert raised | ☐ |
| 8.6 | Retry does not double-side-effect | Retry a mutating call | Idempotency key ensures single effect at B | ☐ |
| 8.7 | Retry after 429 respects Retry-After | B rate-limits A | A backs off per `Retry-After` header before retrying | ☐ |

---

## 9. Circuit Breaker

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 9.1 | Circuit opens on failure threshold | N consecutive failures to B | Circuit OPEN; subsequent calls fail fast without hitting B | ☐ |
| 9.2 | Fallback while open | Call during OPEN state | A returns fallback/queued result; no thread pile-up on B | ☐ |
| 9.3 | Half-open probe | After cooldown | One probe request allowed; success → CLOSED, failure → OPEN again | ☐ |
| 9.4 | Recovery | B restored | Traffic resumes automatically; no manual restart needed | ☐ |
| 9.5 | No cascading failure | B slow (near-timeout responses) under load | A's threads/connections bounded; A's other endpoints stay healthy | ☐ |

---

## 10. Rate Limiting & Backpressure

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 10.1 | B returns 429 | Exceed B's rate limit | A throttles via queue; retries after backoff; no dropped work | ☐ |
| 10.2 | Outbound rate cap | A generates 10,000 req/s, B handles 100/s | Queue absorbs burst; B sees ≤ 100/s; A memory stays bounded | ☐ |
| 10.3 | Queue full behavior | Queue exceeds capacity | Explicit policy applied (reject/spill/alert) — no silent data loss | ☐ |
| 10.4 | Burst after outage | B recovers after long downtime | Backlog drains at controlled rate, not a stampede | ☐ |

---

## 11. Long-Running Tasks (Async Jobs)

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 11.1 | 202 Accepted flow | Long task at B | B returns 202 + jobId immediately; A stores jobId, state PROCESSING | ☐ |
| 11.2 | No long-held connection | 30-min task | A never holds an HTTP connection open for the full task duration | ☐ |
| 11.3 | Polling: progress states | Poll job: PROCESSING → PROCESSING → COMPLETED | A tracks transitions and stops polling on terminal state | ☐ |
| 11.4 | Polling: interval & cap | Polling configured | Interval respected; max polling duration enforced (job timeout) | ☐ |
| 11.5 | Polling: unknown jobId | Poll with wrong/lost jobId | Clear error; reconciliation path triggered | ☐ |
| 11.6 | Webhook: happy path | B completes, posts webhook to A | A verifies, updates order to SUCCESS | ☐ |
| 11.7 | Webhook: signature verification | Forged webhook payload | A rejects unsigned/invalid webhook (HTTP 401/403) | ☐ |
| 11.8 | Webhook: duplicate delivery | B sends same webhook twice | A processes once; second is idempotent no-op | ☐ |
| 11.9 | Webhook: late delivery | Webhook arrives hours late, after reconciliation | A converges to correct final state; no regression | ☐ |
| 11.10 | Webhook: never arrives | B completes but webhook lost | Polling fallback or reconciliation detects completion | ☐ |
| 11.11 | Webhook: A down when called | A unavailable at webhook time | B retries (per B contract) or A recovers via reconciliation | ☐ |
| 11.12 | Stuck job detection | Job PROCESSING beyond job timeout | Job flagged stuck; alert + recovery action (re-poll/re-query) | ☐ |
| 11.13 | Job failed at B | Job ends FAILED | A marks order FAILED, surfaces reason | ☐ |

---

## 12. Dead Letter Queue

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 12.1 | Exhausted retries → DLQ | Permanently failing request | After max retries, item lands in DLQ with error context | ☐ |
| 12.2 | DLQ item actionable | Inspect DLQ item | Contains original payload, error, attempt count, correlation ID | ☐ |
| 12.3 | DLQ redrive | Fix root cause, replay DLQ item | Replay succeeds exactly once (idempotent), no duplicate side effects | ☐ |
| 12.4 | DLQ alerting | Item enters DLQ | Alert/notification raised for manual investigation | ☐ |

---

## 13. Security

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 13.1 | HTTPS enforced | All A→B traffic | No plain-HTTP calls; plaintext attempt rejected/redirected to TLS | ☐ |
| 13.2 | Auth credential sent | Valid API key / OAuth token / mTLS | B accepts request (200) | ☐ |
| 13.3 | Missing/expired credential | Omit or expire token | B returns 401; A detects and refreshes token (OAuth) — does not retry forever | ☐ |
| 13.4 | Insufficient scope (authorization) | Valid identity, disallowed operation | B returns 403; A treats as permanent failure, no retry | ☐ |
| 13.5 | Credential rotation | Rotate key/cert | A picks up new credential without downtime/redeploy | ☐ |
| 13.6 | Secrets not in logs | Capture A's logs during calls | No API keys, tokens, or sensitive customer data in logs | ☐ |
| 13.7 | Secrets not in code/config repo | Inspect source | Credentials come from secret manager/env vars, not hardcoded | ☐ |
| 13.8 | Webhook endpoint authenticated | Inbound webhook calls to A | A verifies signature/shared secret before acting | ☐ |

---

## 14. API Contract & Version Changes

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 14.1 | Renamed fields | B changes `orderId`→`id`, `status`→`state` | A's client/adapter layer isolates the change; core A logic untouched (verify by changing adapter only) | ☐ |
| 14.2 | Unexpected extra fields | B adds new fields | A ignores unknown fields, does not crash (lenient deserialization) | ☐ |
| 14.3 | Missing optional field | B omits a field | A handles null/default gracefully | ☐ |
| 14.4 | Missing required field | B omits a required field | A fails with explicit validation error + alert, not an NPE deep in business logic | ☐ |
| 14.5 | Malformed body | B returns invalid JSON / HTML error page | A handles parse error gracefully, marks UNKNOWN or FAILED per policy, logs raw response | ☐ |
| 14.6 | Empty body on 200 | B returns 200 with no body | A handles without crash; clear error if body required | ☐ |
| 14.7 | Oversized payload | B returns huge response | Size limit enforced; no OOM on A | ☐ |
| 14.8 | B-specific code isolation | Review | All B-specific details confined to `ExternalBClient`/adapter layer; no B DTOs leaking into A's domain | ☐ |

---

## 15. HTTP Success ≠ Business Success

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 15.1 | HTTP 200 + business FAILED | B returns `{"status":"FAILED","reason":"INSUFFICIENT_BALANCE"}` | A marks order FAILED (not SUCCESS); reason captured | ☐ |
| 15.2 | HTTP 200 + business PENDING | B returns processing status | A stays in PROCESSING; continues polling/awaiting webhook | ☐ |
| 15.3 | Non-2xx carrying business info | B returns 422 with business error code | A maps business error correctly, distinguishes from transport error | ☐ |
| 15.4 | Unknown business status code | B returns unmapped status value | A treats as UNKNOWN + alerts, does not default to SUCCESS | ☐ |

---

## 16. Observability

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 16.1 | Correlation ID propagated | Any A→B call | Same correlationId appears in A's logs, request header, and (if supported) B's logs | ☐ |
| 16.2 | End-to-end trace | Full flow incl. webhook/reconciliation | One trace covers: order created → call B → job → webhook → final state | ☐ |
| 16.3 | Error logs actionable | Any failure | Log includes correlationId, orderId, B's response/error, retry attempt | ☐ |
| 16.4 | Metrics emitted | Run traffic | B success rate, error rate, latency, retry count recorded | ☐ |
| 16.5 | Business metrics | Run scenarios | Counts of PENDING / PROCESSING / UNKNOWN / FAILED orders available | ☐ |
| 16.6 | Alerts fire | Trigger failure scenarios | Alerts on: B error rate spike, webhook delay, stuck jobs, DLQ entries, reconciliation mismatches | ☐ |
| 16.7 | No sensitive data in traces | Inspect traces/logs | Tokens, PII masked or absent | ☐ |

---

## 17. Reconciliation

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 17.1 | Detect A≠B divergence | Seed A=PENDING, B=SUCCESS | Reconciliation job detects mismatch and updates A to SUCCESS | ☐ |
| 17.2 | Detect missing-at-B | A has order, B has no record | Flagged as never-delivered; safe to resend with idempotency key | ☐ |
| 17.3 | Detect missing-at-A | B has record, A does not | Flagged for investigation (orphan at B) | ☐ |
| 17.4 | UNKNOWN resolution | Order stuck in UNKNOWN | Reconciliation queries B and moves order to SUCCESS/FAILED | ☐ |
| 17.5 | Reconciliation is idempotent | Run reconciliation twice on same data | No duplicate state changes or side effects | ☐ |
| 17.6 | Concurrent webhook + reconciliation | Webhook and reconciliation resolve same order simultaneously | Locking/idempotent update prevents conflict; final state correct | ☐ |
| 17.7 | Mismatch reporting | Reconciliation run completes | Report of mismatches emitted (metric/alert) for audit | ☐ |

---

## 18. Partial Failure & Degradation

| # | Test Case | Setup | Expected | ☐ |
|---|---|---|---|---|
| 18.1 | B down, A's DB up | Kill B only | A's non-B-dependent features keep working; B-dependent flow degrades per design (queue/fallback/reject) | ☐ |
| 18.2 | A's DB down | Kill A's DB | Call to B is not attempted with un-persisted state; no orphan side effect at B | ☐ |
| 18.3 | Bulkhead isolation | Saturate A→B connection pool | Other outbound integrations from A remain unaffected | ☐ |
| 18.4 | Slow B under load | B latency >> normal | A bounded by timeouts; A's own response time to clients stays within SLA | ☐ |

---

## Quick Priority Guide

**Must pass before production:** 2.x, 3.x, 4.x, 5.x, 6.x, 8.x, 15.x, 13.1–13.6, 16.1–16.3, 17.1, 17.4

**High value for external B:** 5.x (idempotency), 11.7–11.11 (webhook), 14.x (API changes), 17.x (reconciliation), 10.x (provider rate limits)

**Chaos/fault-injection candidates:** 2.3, 4.3, 7.2, 11.10, 11.11, 18.x
