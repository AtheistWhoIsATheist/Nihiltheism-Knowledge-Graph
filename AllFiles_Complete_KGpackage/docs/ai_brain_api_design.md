# AI Brain API Integration Blueprint: REST, WebSocket, Schemas, Auth, Errors, and OpenAPI

## Executive Summary

This document defines an implementation-ready API design and integration blueprint for embedding an AI Brain into a Flask-based product. The blueprint delivers a unified, versioned, and contract-first API surface comprising a REST interface for conversational operations and a WebSocket interface for real-time collaboration, augmented by a rigorous JSON Schema approach for validation, a secure and pragmatic authentication model, and a standardized error taxonomy. The design emphasizes backward-compatible evolution, production-grade streaming, and a clear path to federated tooling. It is intended for backend/API engineers, solution architects, platform engineers, DevOps/SRE, and QA leads who require a single source of truth for integration, validation, and operational readiness.

The scope covers: REST endpoints for conversations, messages, streaming, tools, administration, analytics, and Webhooks; real-time collaboration via WebSockets for presence, typing, delta streams, and collaborative context editing; data models for conversations, messages, users, tools, and collaboration; authentication and session management using JSON Web Tokens (JWT) and refresh tokens with clear cookie and header semantics; error handling with machine-parseable codes and RFC 7807-style problem details; robust integration patterns for embedding into Flask with module boundaries, async task queues, rate limiting, and OpenAPI-first validation; detailed event streaming design including Server-Sent Events (SSE), token budgeting, and partial responses; and a comprehensive OpenAPI 3.1 specification with examples and reusable components. The blueprint also codifies versioning, deprecation and sunset policies, observability and audit practices, a security model, and a phased implementation roadmap.

Deliverables include: a detailed API design document (this blueprint), an OpenAPI 3.1 specification (YAML) that defines endpoints, schemas, and examples, and JSON Schema definitions that may be referenced or embedded within the OpenAPI document. The specification and supporting schemas should be validated with automated tooling to ensure schema conformity, contract stability, and backward compatibility across releases.

Expected outcomes are: a single, definitive contract for the AI Brain API; an integration pattern that minimizes impact on existing Flask services; robust real-time collaboration that coexists with asynchronous processing; clear ownership boundaries; and a shared language for product, engineering, and QA to validate behavior end-to-end. The design explicitly addresses information gaps (e.g., final identity provider and domain model specifics) via configurable placeholders and policy-driven defaults, enabling near-term development while avoiding premature decisions that would lock in suboptimal trade-offs.

## Context and Requirements

The AI Brain is a set of services powering conversational intelligence and tools. It will be embedded into an existing Flask-based platform to enable new capabilities and real-time collaboration flows without disrupting current production paths. The API must support user- and assistant-driven conversational flows, including single-turn and multi-turn interactions, short- and long-term memory, tool invocation, and collaborative experiences such as presence and typing indicators. It must integrate with existing authentication, session, and multi-tenant constructs. The platform must continue to operate with predictable performance and safety while introducing these capabilities.

This blueprint aligns to the following functional and non-functional needs:

- Functional scope: conversation lifecycle management; message send/receive (including streaming); tool catalogs and function calling; integration with identity and user/session constructs; real-time collaboration signals (presence, typing, deltas); and secure webhooks for external events.
- Non-functional quality attributes: availability, latency, throughput, observability, security, auditability, and compliance with data protection requirements. Particular attention is given to streaming interaction patterns, real-time collaboration over WebSockets, task offloading via queues, and tenant isolation.

Assumptions and constraints include: incremental rollouts; WebSocket compatibility with proxies and load balancers; compliance with regional residency if required; and an OpenAPI-first development workflow that prevents contract drift. Open decisions (information gaps) are surfaced and bounded by placeholders to enable productive work without constraining future choices.

To make responsibilities and dependencies explicit, we map the AI Brain features to system components and provide a requirements traceability matrix.

To ground the allocation of responsibilities, the following table maps key AI Brain features to system components and integration touchpoints.

Table 1: System Components and Responsibilities for AI Brain Integration

| Component | Responsibilities | Notes |
|----------|-------------------|------|
| Flask API Gateway | Request routing, auth middleware, rate limiting, OpenAPI validation | Exposes REST endpoints; applies cross-cutting policies |
| AI Brain Service(s) | Conversational orchestration, tool routing, memory management | Stateless where possible; orchestrates LLM/tool calls |
| Redis/Queue Layer | Async job queue, rate-limit counters, presence backend, pub/sub | Offload long-running tasks; real-time signal fan-out |
| Database | Persistent storage for conversations, messages, users, tools | Postgres or equivalent; schema per models below |
| WebSocket Service | Real-time presence, typing, delta streams, collaborative editing | Shared state via Redis or equivalent; backpressure handling |
| Observability | Structured logging, metrics, tracing, audit | End-to-end correlation IDs; privacy-aware payloads |
| Security | Auth/authorization, secrets, token management, tenant scoping | JWT/refresh, cookie security flags, RBAC/ABAC |

The table highlights the split between synchronous request/response handling and asynchronous workflows (tool invocations, embeddings, batch processing). The Redis/Queue layer serves as the backbone for both offloading heavy work and supporting real-time collaboration signals.

To ensure we capture all functional and non-functional requirements, the following traceability matrix links top-level requirements to API endpoints and acceptance tests.

Table 2: Requirements Traceability Matrix

| Requirement | API Endpoints | Acceptance Criteria |
|-------------|---------------|---------------------|
| Create/read/update/delete conversations | /v1/conversations, /v1/conversations/{id} | CRUD semantics, idempotency, concurrency control, audit |
| Send message (sync/stream) | /v1/messages, /v1/messages/{id}/stream | SSE/WS streaming, token budgeting, partial responses |
| Tool invocation | /v1/tools, /v1/tools/{id}/invoke | Sync/async patterns, circuit breaker, typed outputs |
| Real-time collaboration | WS /v1/ws | Presence, typing, deltas, collaborative context, retries |
| Memory management | /v1/memory/{id} | Versioned memory, retention policies, conflict resolution |
| Auth/session | /v1/auth/*, cookie + header | JWT/refresh, logout, rotation, revocation, RBAC/ABAC |
| Admin/ops | /v1/admin/*, /v1/health, /v1/metrics | Operational controls, readiness, observability |
| Webhooks | /v1/webhooks | Signature verification, replay protection, idempotency |
| Analytics | /v1/analytics/* | Privacy-aware metrics, aggregate exports |
| Error handling | Standardized problem+details | RFC 7807 mapping, rate-limit headers, correlation IDs |
| Versioning | /v1/* + headers | Deprecation/sunset policy, compatibility guidelines |

Information gaps acknowledged: final identity provider and token formats; domain model specifics (user attributes, tenant scope); exact rate limits per tier; hosting constraints (TLS, proxies, load balancing); performance budgets; webhook secret management and signature standards; regional residency and PII classification; observability stack and alert thresholds; final tool invocation catalog and environment; and localization strategy.

## Design Principles and Versioning Strategy

The API is resource-oriented and RESTful, exposing versioned endpoints under a stable base path (for example, /v1). Endpoint design emphasizes resource clarity, statelessness where possible, and explicit separation of synchronous and asynchronous operations. The API favors coarse-grained resources (e.g., conversations, messages) for simple client workflows and thin clients, while enabling fine-grained controls (e.g., memory, tool invocation) when needed.

Versioning is encoded in the base path to guarantee routing stability and facilitate blue/green or canary deployments. Backward-compatible changes (for example, adding optional fields, new endpoints, or new enum values) are permitted without a major version bump. Breaking changes (for example, removing fields, renaming types, altering semantic behavior) require a new major version path (for example, /v2) and must be accompanied by a deprecation and sunset plan. Version negotiation is explicit via Accept headers (for example, Accept: application/vnd.company.v1+json), and responses include Deprecation and Sunset headers when applicable.

Backward- and forward-compatibility guidelines include: adopt tolerant readers (ignore unknown fields), avoid reusing field names for different semantics, provide schema version indicators in payloads, and publish migration guides. Compatibility must be validated via automated schema diffing and contract tests to detect accidental breaking changes early.

Table 3: Version Lifecycle Policy

| Stage | Definition | Required Actions |
|-------|------------|------------------|
| Active | Fully supported, no planned deprecation | Monitor SLOs, publish docs, accept change requests |
| Maintenance | Supported with known deprecation | Publish deprecation date, publish migration guide |
| Deprecated | Still available but not recommended | Send Deprecation and Sunset headers; discourage use |
| Retired | Not available; removal planned/complete | 410 Gone; archive docs; redirect to newer versions |

Table 4: Backward Compatibility Matrix

| Change Type | Example | Allowed in v1? |
|-------------|---------|----------------|
| Additive | New optional field or endpoint | Yes |
| Restrictive | Narrowing enum or field constraints | Yes with caution (validate clients) |
| Non-breaking behavioral change | New default behavior with opt-out | Yes (document clearly) |
| Breaking | Remove/repurpose field or alter semantics | No (requires v2) |

## API Surface Overview

The API is organized into logical groups: conversations and messages (including streaming); tools; memory; admin/ops; analytics; and webhooks. Content negotiation follows JSON-first patterns (application/json), with Server-Sent Events (text/event-stream) for streaming responses and WebSocket for real-time collaboration. CORS is selectively enabled for browser clients. Standard request identification includes request IDs and ETags where relevant.

Concurrency and idempotency are enforced through idempotency keys on POST requests to prevent duplicate message sends or tool invocations in the face of retries. Clients provide a unique Idempotency-Key header per request; servers store and reuse results for the specified window (for example, 24 hours). PII minimization and data classification annotations are included in the schema to inform storage, logging, and masking policies.

Table 5: Endpoint Summary

| Path | Method | Purpose | Auth Scope | Streaming | Rate Limits |
|------|--------|---------|------------|-----------|-------------|
| /v1/auth/login | POST | Exchange credentials for JWT/refresh | Public | No | Per IP |
| /v1/auth/refresh | POST | Rotate access token | Public (refresh token) | No | Stricter |
| /v1/auth/logout | POST | Invalidate session | User | No | Standard |
| /v1/users/me | GET | Current user profile | User | No | Standard |
| /v1/conversations | POST | Create conversation | User | No | Standard |
| /v1/conversations | GET | List conversations | User | No | Paged |
| /v1/conversations/{id} | GET | Retrieve conversation | User | No | Standard |
| /v1/conversations/{id} | PATCH | Update conversation | User | No | Standard |
| /v1/conversations/{id} | DELETE | Soft-delete conversation | User | No | Standard |
| /v1/messages | POST | Send message (sync) | User | Optional | Standard |
| /v1/messages/{id} | GET | Retrieve message | User | No | Standard |
| /v1/messages/{id}/stream | GET | Stream assistant response | User | SSE | Tighter |
| /v1/tools | GET | Tool catalog | User | No | Standard |
| /v1/tools/{id}/invoke | POST | Invoke tool (sync) | User | No | Standard |
| /v1/tools/{id}/invoke_async | POST | Invoke tool (async) | User | No | Standard |
| /v1/memory/{id} | GET | Retrieve memory | User | No | Standard |
| /v1/memory/{id} | PATCH | Update memory | User | No | Standard |
| /v1/admin/queue/jobs | GET | List jobs | Admin | No | Restricted |
| /v1/admin/rate-limits | PATCH | Update rate limits | Admin | No | Restricted |
| /v1/health | GET | Health check | Public | No | N/A |
| /v1/metrics | GET | Metrics snapshot | Admin | No | Restricted |
| /v1/analytics/usage | GET | Aggregated usage | Admin | No | Restricted |
| /v1/webhooks | POST | Receive external event | Public (signed) | No | Signed |
| WS /v1/ws | WS | Real-time collaboration | User | WS | Connection caps |

The summary demonstrates a cohesive surface area that cleanly separates synchronous, streaming, and real-time operations. The design allows the platform to gradually expand capabilities (for example, adding tool environments or analytics dimensions) without altering existing client contracts.

## RESTful Endpoints — Detailed Specification

This section defines method semantics, request/response bodies, headers, and status codes per resource. Idempotency is enforced where state changes occur, and concurrency control uses ETags or If-Match headers to prevent lost updates.

### Conversations

Create, read, update, delete, and archive conversations. Scopes: user (for own resources) and admin (for cross-user operations). PATCH semantics support partial updates with optimistic concurrency control via If-Match and ETag responses.

Table 6: Conversation Endpoints

| Method | Path | Request Schema | Response Schema | Headers |
|--------|------|----------------|-----------------|---------|
| POST | /v1/conversations | ConversationCreate | Conversation | Idempotency-Key, Authorization |
| GET | /v1/conversations | ConversationQuery | ConversationPage | Authorization, Accept |
| GET | /v1/conversations/{id} | N/A | Conversation | Authorization, If-None-Match (optional) |
| PATCH | /v1/conversations/{id} | ConversationUpdate | Conversation | Authorization, If-Match |
| DELETE | /v1/conversations/{id} | N/A | DeleteResult | Authorization |

Example: Create conversation
```
POST /v1/conversations
Authorization: Bearer <jwt>

{
  "title": "Design Review",
  "context": {
    "tenantId": "tenant_123",
    "visibility": "private"
  },
  "participants": ["user_42", "assistant:planner"]
}
```

Example response:
```
200 OK
ETag: "conversation-abc-1"

{
  "id": "conversation-abc",
  "title": "Design Review",
  "createdAt": "2025-10-25T09:30:00Z",
  "updatedAt": "2025-10-25T09:30:00Z",
  "context": {"tenantId": "tenant_123", "visibility": "private"},
  "participants": ["user_42", "assistant:planner"],
  "status": "active",
  "tags": ["design", "review"],
  "pIILevel": "low"
}
```

### Messages

Send user and assistant messages with content parts (text, image, file). Streaming is supported via SSE at /v1/messages/{id}/stream for assistant responses. Attachments are referenced by URL and verified via hashing. Tool call results are embedded as message parts for traceability and audit.

Table 7: Message Endpoints

| Method | Path | Request Schema | Response Schema | Notes |
|--------|------|----------------|-----------------|-------|
| POST | /v1/messages | MessageCreate | Message | Idempotency-Key recommended |
| GET | /v1/messages/{id} | N/A | Message | Authorization |
| GET | /v1/messages/{id}/stream | StreamRequest (query) | text/event-stream | SSE; token budgeting |

Example: Send message
```
POST /v1/messages
Authorization: Bearer <jwt>
Idempotency-Key: 3f6f9b5b-...

{
  "conversationId": "conversation-abc",
  "role": "user",
  "content": {
    "parts": [{"type": "text", "text": "Summarize last week's incidents"}]
  },
  "metadata": {"source": "ui"}
}
```

Example response:
```
200 OK

{
  "id": "message-123",
  "conversationId": "conversation-abc",
  "role": "user",
  "createdAt": "2025-10-25T09:31:00Z",
  "content": {
    "parts": [{"type": "text", "text": "Summarize last week's incidents"}]
  },
  "status": "delivered",
  "metadata": {"source": "ui"},
  "traceId": "trace-xyz-789"
}
```

Example: Stream assistant response
```
GET /v1/messages/message-456/stream?mode=assistant
Authorization: Bearer <jwt>
Accept: text/event-stream
```

SSE events:
```
retry: 1500

event: start
data: {"messageId":"message-456","mode":"assistant","startTime":"2025-10-25T09:32:00Z"}

event: delta
data: {"part":{"type":"text","text":"Incidents last week:"},"usage":{"inputTokens":120,"outputTokens":5}}

event: partial
data: {"part":{"type":"text","text":"- API latency spike on Tuesday"},"usage":{"inputTokens":320,"outputTokens":35}}

event: tool_call
data: {"tool":"incident_summary","input":{"window":"7d"},"output":{"summary":"..."}}

event: partial
data: {"part":{"type":"text","text":"- Database connectivity error on Friday"},"usage":{"inputTokens":480,"outputTokens":60}}

event: end
data: {"messageId":"message-456","finalUsage":{"inputTokens":480,"outputTokens":120}}
```

### Tools

Discover and invoke tools. Function calling follows a typed, schema-driven approach. Clients pass a name and a structured input that conforms to the tool’s declared JSON Schema. Output includes stdout, stderr, exit code, artifacts, and a structured result. Long-running tools use async invocation and return a job link. Sync invocations time out with 503 if the circuit breaker opens.

Table 8: Tool Endpoints

| Method | Path | Request Schema | Response Schema | Notes |
|--------|------|----------------|-----------------|-------|
| GET | /v1/tools | N/A | ToolList | Pagination |
| POST | /v1/tools/{id}/invoke | ToolCallRequest | ToolCallResult | Idempotency-Key recommended |
| POST | /v1/tools/{id}/invoke_async | ToolCallRequest | AsyncJobReference | Returns jobId |

Example: Invoke tool
```
POST /v1/tools/search_incidents/invoke
Authorization: Bearer <jwt>
Idempotency-Key: 8a7d2f...

{
  "input": {
    "timeRange": {"start":"2025-10-18T00:00:00Z","end":"2025-10-25T00:00:00Z"},
    "severity": ["high"]
  },
  "timeoutMs": 8000
}
```

Example response:
```
200 OK

{
  "tool": "search_incidents",
  "output": {
    "items": [
      {"id":"INC-901","title":"Latency spike on Tuesday","severity":"high"}
    ]
  },
  "stdout": "Found 1 incident\n",
  "stderr": "",
  "exitCode": 0,
  "usage": {"durationMs": 312},
  "startedAt": "2025-10-25T09:33:00Z",
  "finishedAt": "2025-10-25T09:33:00Z"
}
```

### Memory

Support short-term memory (conversation-level working context) and long-term memory (per-user persistent store). Memory resources are versioned; updates must include If-Match for concurrency. Retention policies are expressed as metadata and enforced by the storage layer. Conflict resolution is optimistic; clients receive version conflicts and must retry.

Table 9: Memory Endpoints

| Method | Path | Request Schema | Response Schema | Notes |
|--------|------|----------------|-----------------|-------|
| GET | /v1/memory/{id} | N/A | MemoryBundle | Includes version, retention policy |
| PATCH | /v1/memory/{id} | MemoryUpdate | MemoryBundle | If-Match required |

Example: Retrieve memory
```
GET /v1/memory/memory-789
Authorization: Bearer <jwt>
```

Response:
```
200 OK

{
  "id": "memory-789",
  "version": 5,
  "retentionPolicy": {"type":"tenant_default","days":365},
  "shortTerm": {"windowTokens": 8000, "items": [{"role":"user","text":"Summarize incidents"}]},
  "longTerm": {"items":[{"key":"incident:INC-901","value":{"title":"Latency spike","severity":"high"}}]},
  "pIILevel": "medium"
}
```

### Admin & Ops

Provide administrative controls and health metrics. Rate limit updates are scoped to tenant or user. Job listings include filtering and pagination. Health endpoints support readiness and liveness probes.

Table 10: Admin Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /v1/admin/queue/jobs | Inspect async jobs | Admin |
| PATCH | /v1/admin/rate-limits | Update rate limits | Admin |
| GET | /v1/health | Liveness/readiness | Public |
| GET | /v1/metrics | Service metrics | Admin |

Example: Update rate limits
```
PATCH /v1/admin/rate-limits
Authorization: Bearer <admin-jwt>

{
  "tenantId": "tenant_123",
  "limits": {
    "messagesPerMinute": 120,
    "concurrentStreams": 4
  }
}
```

Response:
```
200 OK

{
  "tenantId": "tenant_123",
  "limits": {"messagesPerMinute": 120, "concurrentStreams": 4},
  "updatedAt": "2025-10-25T09:35:00Z"
}
```

### Analytics

Provide usage metrics with privacy-aware aggregation. Exports can be delivered as signed URLs or via webhook callbacks. PII classification drives masking and minimization in exports.

Table 11: Analytics Endpoints

| Method | Path | Purpose | Privacy |
|--------|------|---------|---------|
| GET | /v1/analytics/usage | Aggregate usage metrics | Anonymized/aggregated |
| POST | /v1/analytics/export | Request export job | Pseudonymized; signed links |

Example: Usage aggregates
```
GET /v1/analytics/usage?period=7d&tenantId=tenant_123
Authorization: Bearer <admin-jwt>
```

Response:
```
200 OK

{
  "period": "7d",
  "tenantId": "tenant_123",
  "metrics": {
    "messageCount": 15340,
    "activeUsers": 420,
    "toolInvocations": 2190,
    "avgLatencyMs": 320
  },
  "generatedAt": "2025-10-25T09:36:00Z"
}
```

### Webhooks

Allow external systems to receive events. Delivery is signed; clients validate HMAC signatures with per-tenant secrets and support replay protection via timestamps and nonce checks. Idempotency is enforced via a Webhook-Id header.

Table 12: Webhook Endpoints

| Method | Path | Purpose | Headers |
|--------|------|---------|---------|
| POST | /v1/webhooks | Receive external event | X-Signature, X-Timestamp, Webhook-Id |

Example: Incoming webhook
```
POST /v1/webhooks
X-Signature: sha256=abc123...
X-Timestamp: 1735124100
Webhook-Id: wh-001

{
  "eventType": "ticket.created",
  "data": {"id":"INC-902","title":"DB error"}
}
```

Response:
```
202 Accepted

{"received": true}
```

## WebSocket for Real-Time Collaboration

The WebSocket endpoint /v1/ws provides low-latency collaboration features: presence (who’s online), typing indicators, message deltas (assistant token streaming over WS as an alternative to SSE), and collaborative context editing. Clients authenticate using a short-lived JWT passed in the connection query or an initial JSON message immediately after the upgrade. The server validates the token, enforces tenant isolation, and establishes presence.

Heartbeats/pings and pong messages keep connections alive and detect dead peers. Exponential backoff with jitter is used for reconnect attempts. The server enforces connection caps per tenant and token bucket limits per user. Messages are validated against JSON schemas and signed/encrypted if required by tenant policy. Sensitive fields are masked in logs.

Table 13: WS Message Types

| Direction | Schema | Required Fields | Optional Fields |
|-----------|--------|-----------------|-----------------|
| Client → Server | ClientHello | token, clientInfo | requestedSubs |
| Server → Client | SessionInit | sessionId, tenantId | features |
| Bidirectional | Ping/Pong | ts | - |
| Client → Server | PresenceSubscribe | topic | filters |
| Server → Client | PresenceUpdate | users | - |
| Client → Server | TypingEvent | conversationId, isTyping | - |
| Client → Server | MessageDeltaSubscribe | conversationId, messageId | - |
| Server → Client | DeltaChunk | messageId, token | usage |
| Client → Server | ContextEdit | conversationId, patch | baseVersion |
| Server → Client | ContextSnapshot | conversationId, state | version |
| Bidirectional | Error | code, message | details |

Table 14: Presence and Typing Payloads

| Event | Fields | Example |
|-------|--------|---------|
| PresenceSubscribe | topic, filters | {"topic":"conversation:abc","filters":{"role":["user"]}} |
| PresenceUpdate | users | {"users":["user_42","assistant:planner"]} |
| TypingEvent | conversationId, isTyping, ts | {"conversationId":"abc","isTyping":true,"ts":"2025-10-25T09:37:00Z"} |

Table 15: WS Headers and Query Params

| Name | Used By | Purpose |
|------|---------|---------|
| Authorization | ClientHello | Authenticate at connection time |
| X-Trace-Id | Both | Correlate across channels |
| X-Tenant-Id | Both | Enforce tenant isolation |
| Token (query) | ClientHello (alt) | Convenience for browser connections |

### Auth Handshake and Re-Authentication

On connection, the client sends ClientHello with token and clientInfo or includes Authorization as a header. The server returns SessionInit with sessionId and tenant-scoped features. Mid-stream token expiry is handled by sending a re-auth challenge; clients should proactively refresh tokens and reconnect or re-authenticate with a new token in SessionInit. On logout or token revocation, the server terminates connections and sends a terminal Error.

### Collaboration Features

Presence topics include per-tenant and per-conversation channels. Typing indicators are ephemeral and broadcast to participants with a small suppression window to avoid spamming. Message deltas over WS mirror SSE content but allow richer multiplexing of signals. Collaborative context editing uses optimistic concurrency: clients send patches with baseVersion; the server validates and applies, returning ContextSnapshot or a conflict with the latest version.

Table 16: Collaboration State Transitions

| State | Trigger | Next State |
|-------|---------|-----------|
| INIT | SessionInit | ACTIVE |
| ACTIVE | Token expiry | REAUTH_REQUIRED |
| ACTIVE | Error or idle timeout | CLOSING |
| REAUTH_REQUIRED | Re-auth success | ACTIVE |
| REAUTH_REQUIRED | Re-auth failure | CLOSING |
| CLOSING | Disconnect | CLOSED |

## Data Models and Schemas

The API uses JSON Schema Draft 2020-12 for request/response validation. All schemas are annotated with data classification to guide storage, transport, and logging policies. Schemas support extensibility via additionalProperties: false at the core boundary while allowing vendor extension namespaces (for example, x-company-*) to evolve non-breaking customizations. Field names are consistent with verbs like createdAt and updatedAt.

Table 17: Schema Catalog

| Name | Description | Version | Required Fields |
|------|-------------|---------|-----------------|
| Conversation | Conversation metadata and participants | v1 | id, createdAt |
| Message | User or assistant message | v1 | id, conversationId, role |
| User | Identity and profile | v1 | id, email |
| ToolDefinition | Tool metadata and JSON Schema | v1 | name, schema |
| ToolCallRequest | Typed tool invocation | v1 | input |
| ToolCallResult | Tool output and usage | v1 | tool, output |
| MemoryBundle | Short- and long-term memory | v1 | id, version |
| Error | Problem details (RFC 7807) | v1 | type, title |
| AsyncJobReference | Async job handle | v1 | jobId |

### Conversation

- id: string (identifier)
- title: string
- createdAt, updatedAt: RFC 3339 timestamps
- context: object (tenant-scoped metadata)
- participants: array of user IDs and assistant roles
- status: enum (active, archived)
- tags: array of strings
- pIILevel: enum (low, medium, high)

Table 18: Conversation Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Stable conversation ID |
| title | string | No | Human-friendly title |
| createdAt | string (date-time) | Yes | Creation time |
| updatedAt | string (date-time) | Yes | Last update time |
| context | object | No | Tenant/visibility metadata |
| participants | array[string] | Yes | Participants |
| status | enum | No | Lifecycle state |
| tags | array[string] | No | Labels |
| pIILevel | enum | No | Data classification |

### Message

- id: string
- conversationId: string
- role: enum (user, assistant, system, tool)
- content: array of parts (text, image, file)
- attachments: array of attachment references
- toolCalls: optional array of tool call inputs
- toolResults: optional array of tool call outputs
- metadata: arbitrary object
- status: enum (queued, delivered, failed)
- createdAt, updatedAt: timestamps
- traceId: string for correlation

Table 19: Message Fields

| Field | Type | Required | Notes |
|-------|------|----------|------|
| id | string | Yes | Stable ID |
| conversationId | string | Yes | Belongs to conversation |
| role | enum | Yes | user/assistant/system/tool |
| content | array[Part] | Yes | Multi-modal |
| attachments | array[Attachment] | No | URL + hash |
| toolCalls | array[ToolCall] | No | Function calling inputs |
| toolResults | array[ToolResult] | No | Outputs |
| status | enum | No | Delivery state |
| metadata | object | No | Free-form |
| createdAt | string (date-time) | Yes | |
| updatedAt | string (date-time) | No | |
| traceId | string | No | Correlation |

### User

- id: string
- email: string
- name: string
- roles: array (RBAC/ABAC)
- preferences: object
- pIILevel: enum

Table 20: User Fields

| Field | Type | Required | Notes |
|-------|------|----------|------|
| id | string | Yes | Primary key |
| email | string | Yes | Contact |
| name | string | No | Display name |
| roles | array[string] | No | RBAC/ABAC |
| preferences | object | No | Settings |
| pIILevel | enum | No | Classification |

### ToolDefinition, ToolCallRequest, ToolCallResult

ToolDefinition includes name, description, input JSON Schema, output JSON Schema, and timeout policy. ToolCallRequest specifies the tool name, typed input, and optional timeout. ToolCallResult includes stdout, stderr, exit code, usage, and structured result.

Table 21: Tool Schemas

| Schema | Fields |
|--------|--------|
| ToolDefinition | name, description, inputSchema, outputSchema, timeoutMs |
| ToolCallRequest | tool, input, timeoutMs |
| ToolCallResult | tool, stdout, stderr, exitCode, output, usage, startedAt, finishedAt |

### MemoryBundle

- shortTerm: working context window with items and token budget
- longTerm: persistent per-user store with items and retention policy
- version: integer (for optimistic concurrency)
- retentionPolicy: object (type, days)
- pIILevel: enum

Table 22: Memory Fields

| Field | Type | Notes |
|-------|------|------|
| shortTerm | object | Window of most recent context |
| longTerm | object | Persistent store |
| version | integer | Concurrency control |
| retentionPolicy | object | Tenant/user policy |
| pIILevel | enum | Classification |

### Error and AsyncJobReference

Error follows RFC 7807 problem+details, with standard codes (validation_error, not_found, unauthorized, forbidden, rate_limited, timeout, circuit_open, conflict, internal_error, service_unavailable).

AsyncJobReference returns jobId and a link to check status.

Table 23: Error Codes

| Code | HTTP Status | Example Message |
|------|-------------|-----------------|
| validation_error | 400 | Invalid request body |
| not_found | 404 | Conversation not found |
| unauthorized | 401 | Missing/invalid token |
| forbidden | 403 | Insufficient scope |
| rate_limited | 429 | Too many requests |
| timeout | 504 | Tool invocation timed out |
| circuit_open | 503 | Tool unavailable |
| conflict | 409 | Resource version conflict |
| internal_error | 500 | Unexpected server error |
| service_unavailable | 503 | Service temporarily unavailable |

## Authentication and Session Management

Authentication uses short-lived JSON Web Tokens (JWT) and refresh tokens. Access tokens are issued at /v1/auth/login and /v1/auth/refresh. Access tokens can be returned in the response body or set as cookies. Refresh tokens are stored as secure, httpOnly cookies. Authorization is conveyed via the Authorization: Bearer header. Logout invalidates the refresh token and the associated session.

Access token claims include sub (user ID), exp, iat, jti (token ID), tenantId (if applicable), scopes (for RBAC/ABAC), and optional deviceId. Cookies carry the SameSite, Secure, and httpOnly flags per deployment environment. Token rotation and revocation are supported via a token family concept: each refresh rotates the refresh token and invalidates the previous one.

Table 24: Token and Cookie Attributes

| Attribute | Purpose |
|-----------|---------|
| SameSite (Lax/Strict) | CSRF posture for browser contexts |
| Secure (true) | Enforce HTTPS-only transport |
| httpOnly (true) | Mitigate XSS token theft |
| Domain, Path | Scope of cookie |
| Max-Age/Expires | Token lifetime management |

Table 25: Auth Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | /v1/auth/login | Credentials {email, password} or OAuth exchange | {accessToken, refreshToken? or Set-Cookie} |
| POST | /v1/auth/refresh | Refresh token (cookie or body) | {accessToken, refreshToken?} |
| POST | /v1/auth/logout | Refresh token (cookie or body) | 204 No Content |

Table 26: Session Lifetime and Rotation Policies

| Policy | Value |
|--------|-------|
| Access token TTL | 15 minutes (recommended) |
| Refresh token TTL | 30 days (recommended) |
| Rotation | On each refresh; revoke previous |
| Revocation | Immediate on logout or admin action |
| Device limit | Optional cap per user |

### Scopes and Roles (RBAC/ABAC)

Scopes are coarse-grained privileges: user:read, user:write, conversation:read, conversation:write, tool:invoke, admin:manage, admin:metrics. RBAC maps roles to scopes; ABAC adds attributes such as tenantId or pIILevel to enforce data isolation at the resource layer. Enforce least privilege by default and log all scope escalations.

Table 27: Scopes and Endpoint Access

| Endpoint | Required Scope |
|----------|----------------|
| /v1/conversations | conversation:read/write |
| /v1/messages | conversation:read/write |
| /v1/tools | tool:invoke |
| /v1/memory | user:read/write |
| /v1/admin/* | admin:manage |
| /v1/analytics | admin:manage (or user:read with tenant constraints) |

## Error Handling and Status Codes

Errors adhere to RFC 7807 problem details with a standardized envelope: type (a URL identifying the error code), title, detail, instance, and extensions (code, moreInfo, traceId, tenantId). HTTP status mapping is consistent: 4xx for client errors and 5xx for server errors. Rate limiting uses Retry-After and X-RateLimit-* headers. Correlation IDs (traceId) appear in responses to support distributed tracing. Sensitive fields are redacted in logs; problem details include enough information for clients to self-correct without exposing internals.

Table 28: HTTP Status Mapping

| HTTP Status | Error Code | Retryable |
|-------------|------------|-----------|
| 400 | validation_error | No |
| 401 | unauthorized | Yes (after auth) |
| 403 | forbidden | No |
| 404 | not_found | No |
| 409 | conflict | Yes (after conflict resolution) |
| 429 | rate_limited | Yes (after backoff) |
| 500 | internal_error | Yes (after backoff) |
| 503 | service_unavailable, circuit_open, timeout | Yes (after backoff) |

Table 29: Rate Limit Headers

| Header | Meaning |
|--------|---------|
| X-RateLimit-Limit | Request quota in window |
| X-RateLimit-Remaining | Remaining requests |
| X-RateLimit-Reset | Epoch seconds when window resets |
| Retry-After | Seconds to wait before retrying |

## Integration Patterns with Flask

The AI Brain API is embedded into Flask as a dedicated blueprint (brain_api) with versioned routes (/v1/*). Cross-cutting middleware handles authentication, rate limiting, correlation IDs, and request validation. Long-running operations (for example, tool invocations and embeddings) are offloaded to an async queue (Redis + RQ/Celery). Streaming responses (SSE) use Flask’s streaming capabilities or an async web server adapter.

OpenAPI-driven validation is performed at ingress (schema validation) and in tests. Health endpoints and readiness probes integrate with deployment orchestrators. Observability hooks are present via request lifecycle hooks for logging, metrics, and tracing. For horizontal scaling, real-time collaboration signals are fanned out via pub/sub; memory/state stores are shared and bounded by retention policies. Rate limit counters and presence are kept in Redis to support multi-instance deployments.

Table 30: Flask Integration Tasks

| Component | Tasks | Notes |
|----------|-------|------|
| Middleware | Auth, rate limit, correlation, CORS | Enforce per-tenant policies |
| Routes | Register blueprint /v1 | Versioned endpoints |
| Validation | OpenAPI schema enforcement | Reject invalid requests |
| Async Jobs | Tool invocations, embeddings | Use Redis-backed queue |
| Streaming | SSE and WS | Backpressure and token budgeting |
| Observability | Logs, metrics, tracing | Correlation IDs end-to-end |
| Storage | Conversations, messages, memory | Partition by tenant |
| Admin | Rate limit updates, metrics | Secure with admin scopes |

### Rate Limiting, Backpressure, and Timeouts

Token buckets enforce per-user and per-tenant rate limits for REST and WS endpoints. Streaming endpoints have stricter caps on concurrent streams and token usage per time window. Clients receive 429 with headers and should implement backoff and jitter. Idle timeouts, slow client handling, and read/write timeouts are configured per endpoint. Circuit breakers isolate failing dependencies (for example, a flaky tool) and return 503 with circuit_open.

Table 31: Rate Limit Tiers

| Tier | Messages/min | Concurrent Streams | Notes |
|------|---------------|--------------------|-------|
| Free | 30 | 1 | Conservative defaults |
| Standard | 120 | 4 | Typical user tier |
| Premium | 600 | 10 | Enterprise customers |
| Admin | N/A | N/A | Internal ops limits |

### Async Processing and Job Management

POST endpoints that may exceed latency SLOs offer async variants returning AsyncJobReference. Status endpoints allow polling or webhook callbacks upon completion. Retries use idempotency keys and exponential backoff. Jobs expose lifecycle states: queued, running, succeeded, failed.

Table 32: Job Lifecycle States

| State | Description |
|-------|-------------|
| queued | Accepted, waiting for worker |
| running | In progress |
| succeeded | Completed successfully |
| failed | Completed with errors |
| canceled | User/admin canceled |

## Frontend Communication Protocols

Browsers use fetch/axios for REST, with CORS configured for allowed origins and methods. SSE connects via EventSource or fetch ReadableStream with proper headers and error handling. The WebSocket client uses an auth token (header or initial JSON message), establishes presence, subscribes to updates, and handles reconnects with exponential backoff and jitter.

Offline and retry behavior: clients use idempotency keys to avoid duplicate sends on retries, exponential backoff with jitter for both REST and WS reconnects, and partial result caching to recover gracefully after transient failures. UI guidance includes suppression of excessive typing events and debounced presence updates.

Table 33: Client Events and Handlers

| Protocol | Event | Handler |
|---------|-------|---------|
| REST | 429 Too Many Requests | Show message, schedule retry with backoff |
| REST | 401 Unauthorized | Refresh token; retry once |
| SSE | end | Mark completion; show final message |
| SSE | error | Retry with exponential backoff |
| WS | reauth_required | Refresh token; reconnect |
| WS | presence_update | Update UI roster |
| WS | delta_chunk | Append token to message |

## Security and Compliance Model

Transport security mandates TLS for all endpoints. WebSockets are secured (wss). Secrets management uses environment-based injection and a secrets manager in production. PII classification is explicit per schema and drives masking, minimization, and retention. Token storage follows least privilege: httpOnly, secure cookies for refresh tokens; short-lived access tokens in memory or secure storage. Audit logging records security-relevant events such as auth, scope changes, and admin actions.

Table 34: Data Classification

| Class | Examples | Storage | Logging Policy |
|-------|----------|---------|----------------|
| low | public metadata | Standard | Full logging |
| medium | user preferences | Encrypted at rest | Mask identifiers |
| high | messages with PII | Encrypted; restricted access | Redact content; minimal logs |

## Observability, Auditing, and SLOs

Observability uses structured logging with correlation IDs (traceId) and spans to follow a request across REST, queue, and WS boundaries. Metrics cover latency, throughput, error rates, token usage, and WebSocket connections. Tracing connects interactions across services. Audit logging captures security-sensitive operations (logins, token refreshes, admin actions). SLOs define availability and latency targets for streaming and non-streaming endpoints, with alerts tied to rate-limited errors and error bursts.

Table 35: Metrics Catalog

| Name | Type | Unit | Dimensions | SLO Target |
|------|------|------|------------|------------|
| http_requests_total | Counter | count | endpoint, method, status | N/A |
| http_request_duration_ms | Histogram | ms | endpoint | p95 < 500 ms |
| streaming_latency_ms | Histogram | ms | endpoint, mode | p95 < 800 ms |
| ws_connections | Gauge | count | tenant | < capacity |
| rate_limited_requests | Counter | count | endpoint, tier | < 1% |
| tool_invocations_total | Counter | count | tool, status | N/A |
| token_usage | Histogram | tokens | model | budget adherence |
| audit_events_total | Counter | count | action | N/A |

## Versioning, Deprecation, and Backward Compatibility

Versioning is path-based (/v1). New minor versions add optional fields and endpoints; breaking changes require a new major version. The API publishes Deprecation and Sunset headers for deprecated endpoints and fields. Compatibility shims may be offered temporarily. Automated schema diffs detect breaking changes and enforce contract stability. Clients are encouraged to use Accept headers to request specific versions.

Table 36: Deprecation Policy

| Item | Deprecation Date | Sunset Date | Migration Path |
|------|------------------|-------------|----------------|
| Field: message.metadata | TBD | TBD | Move to message.annotations |
| Endpoint: /v1/tools/{id}/invoke_async | TBD | TBD | Use /v1/jobs and webhooks |
| Header: X-Legacy-Trace | TBD | TBD | Use X-Trace-Id |

## Testing and Conformance Strategy

OpenAPI-driven contract testing validates endpoint adherence. Schema validation tests ensure request/response conformance. Unit tests cover middleware, routing, and utility functions. Integration tests cover end-to-end scenarios including streaming and WS flows. Property-based tests validate idempotency and conflict behaviors. Security tests verify auth boundaries, rate limit enforcement, and webhook signature verification. A shared test suite (SDKs, Postman/Insomnia, Python JS〖ython〗 client generators) maintains a single source of truth.

Table 37: Test Suite Coverage

| Area | Tools | Pass Criteria |
|------|-------|---------------|
| OpenAPI contract | dredd, spectral | 100% paths, no violations |
| Schema validation | jsonschema, pydantic | All payloads validated |
| REST flows | pytest, requests | Status/code conformity |
| SSE streaming | custom harness | Complete event sequences |
| WS collaboration | websockets client | Presence, typing, deltas |
| Security | auth tunneling, zap | No auth bypass; 429 on limits |
| Async jobs | worker harness | Correct state transitions |

## Webhooks and External Integrations

Webhooks deliver events to external subscribers, with signatures computed over the raw body using HMAC-SHA256. Payloads include event type, timestamp, idempotency key, and data. Replay protection uses X-Timestamp and a nonce stored for a bounded window (for example, 5 minutes). Retries use exponential backoff with idempotency to prevent duplicate processing. Security considerations include TLS pinning, IP allowlists, and tenant-scoped secrets.

Table 38: Webhook Events

| Event | Data Fields | Delivery Policy |
|-------|-------------|-----------------|
| conversation.created | id, title, tenantId | At-least-once; retry with backoff |
| message.created | id, conversationId, role | At-least-once |
| tool.completed | tool, jobId, result | At-least-once |
| job.failed | jobId, reason | At-least-once |

## Implementation Roadmap and Work Breakdown

Implementation proceeds in phases to ensure contract-first development, secure embedding into Flask, robust real-time behavior, and operational readiness.

Table 39: Work Breakdown Structure

| Task | Owner | Dependencies | Duration |
|------|-------|--------------|----------|
| Define OpenAPI v1 + JSON Schemas | API team | None | 2 weeks |
| Implement Flask blueprint + routes | Backend | OpenAPI | 3 weeks |
| Add auth/session and middleware | Security/Backend | OpenAPI | 2 weeks |
| Build SSE streaming | Backend | Auth | 2 weeks |
| Build WebSocket collaboration | Platform | SSE readiness | 3 weeks |
| Tool invocation and async jobs | Backend | Auth | 2 weeks |
| Observability, audit, metrics | SRE | Routes | 2 weeks |
| Rate limiting & admin ops | Platform | Metrics | 1 week |
| Contract testing & QA | QA/API | Implementation | 2 weeks |
| Security review & pen tests | Security | Full stack | 2 weeks |

Table 40: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance regressions in streaming | Medium | High | Token budgeting, backpressure, autoscaling |
| Auth drift across services | Medium | High | Centralize middleware; shared schemas |
| WS scalability under load | Medium | High | Redis pub/sub, connection caps, sharding |
| Breaking change to client contracts | Low | High | OpenAPI diffs, version gates, deprecation |
| Tool dependency instability | Medium | Medium | Circuit breakers, retries, isolation |
| PII handling inconsistencies | Low | High | Schema classification, masking policies |

## Appendices

### Glossary

- RFC 7807: Problem Details for HTTP APIs, a standard for error response bodies.
- JSON Schema Draft 2020-12: The specification for validating JSON documents.
- Server-Sent Events (SSE): A unidirectional streaming protocol from server to client over HTTP.
- WebSocket (WS): A bidirectional, persistent connection over TCP for real-time messaging.
- JSON Web Token (JWT): A compact, URL-safe token format for claims.
- RBAC/ABAC: Role-Based and Attribute-Based Access Control.
- ETag: HTTP entity tag for resource versioning in conditional requests.

### OpenAPI Specification

The OpenAPI 3.1 specification defines endpoints, schemas, security schemes, and examples. It should be stored alongside this document and used for code generation, validation, and contract testing. Below is a condensed version illustrating the key artifacts. In practice, this should be expanded to cover all endpoints and schemas listed in this blueprint.

```yaml
openapi: 3.1.0
info:
  title: AI Brain API
  version: 1.0.0
  contact:
    name: API Team
servers:
  - url: https://api.example.com
paths:
  /v1/auth/login:
    post:
      summary: Exchange credentials for tokens
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Credentials'
      responses:
        '200':
          description: Tokens issued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /v1/auth/refresh:
    post:
      summary: Refresh access token
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RefreshRequest'
      responses:
        '200':
          description: New access token
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /v1/auth/logout:
    post:
      summary: Invalidate session
      responses:
        '204':
          description: Logged out
  /v1/conversations:
    get:
      summary: List conversations
      parameters:
        - in: query
          name: page
          schema: {type: integer}
        - in: query
          name: pageSize
          schema: {type: integer}
      responses:
        '200':
          description: Paginated list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConversationPage'
    post:
      summary: Create conversation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConversationCreate'
      responses:
        '200':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Conversation'
  /v1/conversations/{id}:
    get:
      summary: Get conversation
      parameters:
        - in: path
          name: id
          required: true
          schema: {type: string}
      responses:
        '200':
          description: Conversation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Conversation'
    patch:
      summary: Update conversation
      parameters:
        - in: path
          name: id
          required: true
          schema: {type: string}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConversationUpdate'
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Conversation'
    delete:
      summary: Delete conversation
      parameters:
        - in: path
          name: id
          required: true
          schema: {type: string}
      responses:
        '204':
          description: Deleted
  /v1/messages:
    post:
      summary: Send message
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MessageCreate'
      responses:
        '200':
          description: Message created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Message'
  /v1/messages/{id}:
    get:
      summary: Get message
      parameters:
        - in: path
          name: id
          required: true
          schema: {type: string}
      responses:
        '200':
          description: Message
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Message'
  /v1/messages/{id}/stream:
    get:
      summary: Stream assistant response
      parameters:
        - in: path
          name: id
          required: true
          schema: {type: string}
        - in: query
          name: mode
          schema: {type: string, enum: [assistant]}
      responses:
        '200':
          description: SSE stream
          content:
            text/event-stream:
              schema:
                type: string
  /v1/tools:
    get:
      summary: List tools
      responses:
        '200':
          description: Tools
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ToolList'
  /v1/tools/{id}/invoke:
    post:
      summary: Invoke tool
      parameters:
        - in: path
          name: id
          required: true
          schema: {type: string}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ToolCallRequest'
      responses:
        '200':
          description: Tool result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ToolCallResult'
  /v1/tools/{id}/invoke_async:
    post:
      summary: Invoke tool asynchronously
      parameters:
        - in: path
          name: id
          required: true
          schema: {type: string}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ToolCallRequest'
      responses:
        '202':
          description: Job accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AsyncJobReference'
  /v1/memory/{id}:
    get:
      summary: Get memory bundle
      parameters:
        - in: path
          name: id
          required: true
          schema: {type: string}
      responses:
        '200':
          description: Memory bundle
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MemoryBundle'
    patch:
      summary: Update memory bundle
      parameters:
        - in: path
          name: id
          required: true
          schema: {type: string}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MemoryUpdate'
      responses:
        '200':
          description: Updated memory
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MemoryBundle'
  /v1/health:
    get:
      summary: Health check
      responses:
        '200':
          description: OK
  /v1/metrics:
    get:
      summary: Metrics snapshot
      responses:
        '200':
          description: Metrics
          content:
            application/json:
              schema:
                type: object
  /v1/analytics/usage:
    get:
      summary: Aggregated usage
      responses:
        '200':
          description: Usage
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageAggregate'
  /v1/webhooks:
    post:
      summary: Receive external event
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WebhookEvent'
      responses:
        '202':
          description: Accepted
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    Credentials:
      type: object
      properties:
        email: {type: string}
        password: {type: string}
    AuthResponse:
      type: object
      properties:
        accessToken: {type: string}
        refreshToken: {type: string}
    RefreshRequest:
      type: object
      properties:
        refreshToken: {type: string}
    Conversation:
      type: object
      properties:
        id: {type: string}
        title: {type: string}
        createdAt: {type: string, format: date-time}
        updatedAt: {type: string, format: date-time}
        context: {type: object}
        participants:
          type: array
          items: {type: string}
        status: {type: string, enum: [active, archived]}
        tags:
          type: array
          items: {type: string}
        pIILevel: {type: string, enum: [low, medium, high]}
    ConversationCreate:
      type: object
      properties:
        title: {type: string}
        context: {type: object}
        participants:
          type: array
          items: {type: string}
    ConversationUpdate:
      type: object
      properties:
        title: {type: string}
        status: {type: string, enum: [active, archived]}
        tags:
          type: array
          items: {type: string}
    ConversationPage:
      type: object
      properties:
        items:
          type: array
          items: {$ref: '#/components/schemas/Conversation'}
        nextPageToken: {type: string}
    Message:
      type: object
      properties:
        id: {type: string}
        conversationId: {type: string}
        role: {type: string, enum: [user, assistant, system, tool]}
        content:
          type: array
          items:
            oneOf:
              - $ref: '#/components/schemas/TextPart'
              - $ref: '#/components/schemas/ImagePart'
              - $ref: '#/components/schemas/FilePart'
        attachments:
          type: array
          items: {$ref: '#/components/schemas/Attachment'}
        toolCalls:
          type: array
          items: {type: object}
        toolResults:
          type: array
          items: {type: object}
        status: {type: string, enum: [queued, delivered, failed]}
        metadata: {type: object}
        createdAt: {type: string, format: date-time}
        updatedAt: {type: string, format: date-time}
        traceId: {type: string}
    MessageCreate:
      type: object
      properties:
        conversationId: {type: string}
        role: {type: string, enum: [user, assistant, system, tool]}
        content:
          type: array
          items:
            oneOf:
              - $ref: '#/components/schemas/TextPart'
              - $ref: '#/components/schemas/ImagePart'
              - $ref: '#/components/schemas/FilePart'
        metadata: {type: object}
    TextPart:
      type: object
      properties:
        type: {type: string, enum: [text]}
        text: {type: string}
    ImagePart:
      type: object
      properties:
        type: {type: string, enum: [image]}
        url: {type: string}
    FilePart:
      type: object
      properties:
        type: {type: string, enum: [file]}
        url: {type: string}
        hash: {type: string}
    Attachment:
      type: object
      properties:
        url: {type: string}
        hash: {type: string}
    ToolList:
      type: object
      properties:
        tools:
          type: array
          items:
            type: object
            properties:
              name: {type: string}
              description: {type: string}
              inputSchema: {type: object}
              outputSchema: {type: object}
    ToolCallRequest:
      type: object
      properties:
        tool: {type: string}
        input: {type: object}
        timeoutMs: {type: integer}
    ToolCallResult:
      type: object
      properties:
        tool: {type: string}
        stdout: {type: string}
        stderr: {type: string}
        exitCode: {type: integer}
        output: {type: object}
        usage:
          type: object
          properties:
            durationMs: {type: integer}
        startedAt: {type: string, format: date-time}
        finishedAt: {type: string, format: date-time}
    MemoryBundle:
      type: object
      properties:
        id: {type: string}
        version: {type: integer}
        shortTerm:
          type: object
        longTerm:
          type: object
        retentionPolicy:
          type: object
        pIILevel: {type: string, enum: [low, medium, high]}
    MemoryUpdate:
      type: object
      properties:
        shortTerm: {type: object}
        longTerm: {type: object}
        retentionPolicy: {type: object}
    AsyncJobReference:
      type: object
      properties:
        jobId: {type: string}
        status: {type: string, enum: [queued, running, succeeded, failed, canceled]}
    WebhookEvent:
      type: object
      properties:
        eventType: {type: string}
        data: {type: object}
    Error:
      type: object
      properties:
        type: {type: string}
        title: {type: string}
        detail: {type: string}
        instance: {type: string}
        code: {type: string}
        moreInfo: {type: string}
        traceId: {type: string}
        tenantId: {type: string}
    UsageAggregate:
      type: object
      properties:
        period: {type: string}
        tenantId: {type: string}
        metrics:
          type: object
          properties:
            messageCount: {type: integer}
            activeUsers: {type: integer}
            toolInvocations: {type: integer}
            avgLatencyMs: {type: integer}
        generatedAt: {type: string, format: date-time}
security:
  - BearerAuth: []
```

### JSON Schema Definitions

The API reuses JSON Schema Draft 2020-12 for all request/response bodies. Components referenced by $ref above (Conversation, Message, ToolCallRequest, ToolCallResult, MemoryBundle, Error, AsyncJobReference) should be expanded into full schemas in the OpenAPI components.schemas or in separate schema files. Each schema must include data classification extensions (for example, x-pii-level) and be validated in middleware and tests.

### Example Payloads

- ConversationCreate
```
{
  "title": "Incident Triage",
  "context": {"tenantId": "tenant_123"},
  "participants": ["user_42", "assistant:incident_manager"]
}
```

- MessageCreate (user)
```
{
  "conversationId": "conversation-abc",
  "role": "user",
  "content": {
    "parts": [
      {"type":"text","text":"List top 3 incidents with causes and actions"}
    ]
  },
  "metadata": {"source":"ui"}
}
```

- ToolCallRequest
```
{
  "tool": "search_incidents",
  "input": {"timeRange":{"start":"2025-10-18T00:00:00Z","end":"2025-10-25T00:00:00Z"},"severity":["high","critical"]},
  "timeoutMs": 8000
}
```

- ToolCallResult
```
{
  "tool": "search_incidents",
  "stdout": "",
  "stderr": "",
  "exitCode": 0,
  "output": {
    "items": [
      {"id":"INC-901","title":"Latency spike on Tuesday","severity":"high"},
      {"id":"INC-902","title":"DB connectivity error on Friday","severity":"critical"}
    ]
  },
  "usage": {"durationMs": 245},
  "startedAt": "2025-10-25T09:40:00Z",
  "finishedAt": "2025-10-25T09:40:00Z"
}
```

- MemoryUpdate
```
{
  "shortTerm": {
    "windowTokens": 8000,
    "items": [
      {"role":"user","text":"List top incidents"},
      {"role":"assistant","text":"Top 3 incidents retrieved"}
    ]
  },
  "longTerm": {
    "items": [
      {"key":"incident:INC-901","value":{"title":"Latency spike","severity":"high"}}
    ]
  }
}
```

- WebhookEvent (incoming)
```
{
  "eventType": "job.completed",
  "data": {
    "jobId": "job-abc",
    "tool": "search_incidents",
    "status": "succeeded"
  }
}
```

### HTTP Header Reference

Table 41: HTTP Header Reference

| Name | Direction | Purpose |
|------|-----------|---------|
| Authorization | Request/Response | Bearer token for auth |
| Idempotency-Key | Request | Idempotency for POST |
| X-Trace-Id | Request/Response | Correlation ID |
| ETag | Response | Resource versioning |
| If-Match | Request | Optimistic concurrency |
| X-RateLimit-Limit | Response | Rate limit quota |
| X-RateLimit-Remaining | Response | Remaining requests |
| X-RateLimit-Reset | Response | Reset epoch |
| Retry-After | Response | Backoff duration |
| X-Tenant-Id | Request/Response | Tenant scoping |
| X-Signature | Request (Webhook) | HMAC signature |
| X-Timestamp | Request (Webhook) | Replay protection |
| Webhook-Id | Request (Webhook) | Idempotency |
| Cookie | Request/Response | Refresh tokens |
| Set-Cookie | Response | Refresh token cookies |

---

Acknowledged Information Gaps

- Identity provider specifics (OAuth provider, token formats, and key rotation), exact user/session models, rate limits per tier, precise hosting constraints, performance budgets and SLO targets, webhook signature standards and secret management specifics, data residency and PII classification details, observability stack selections and alert thresholds, final tool invocation catalog and execution environment, and localization/internationalization strategy require finalization. This blueprint defines interfaces, policies, and placeholders that enable parallel progress while preserving flexibility to make these decisions with full visibility into their effects on the API and platform.

End of document.