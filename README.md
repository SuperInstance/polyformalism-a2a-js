# @superinstance/polyformalism-a2a


## Meta

**Domain:** constraint-theory
**Depends on:** —
**Depended by:** —
**Implements:** 9-channel polyglot communication framework for multi-agent alignment (JS/Node.js...
**Related:** —


**9-channel polyglot communication framework for multi-agent alignment.**

Zero dependencies. ESM-only. Works in Node.js and browsers.

## Install

```bash
npm install @superinstance/polyformalism-a2a
```

## Quick Start

```js
import { IntentVector, Channels, checkAlignment, selectFitting } from '@superinstance/polyformalism-a2a';

// Create intent vectors
const sender = IntentVector.zero()
  .set(Channels.Stakes, 0.9)
  .set(Channels.Process, 0.8);

const receiver = IntentVector.zero()
  .set(Channels.Stakes, 0.85);

// Check alignment
const report = checkAlignment(sender, receiver);
console.log(report.isSafe); // true
console.log(report.cosineSimilarity); // 0.998

// Select hydraulic fitting (right-size tooling to pressure)
const fitting = selectFitting(0.9);
console.log(fitting.name); // "DeepSeaSeal"
```

## The 9 Channels

| # | Channel | Question |
|---|---------|----------|
| C1 | Boundary | What are we talking about? |
| C2 | Pattern | How do pieces connect? |
| C3 | Process | What's happening over time? |
| C4 | Knowledge | How sure am I? |
| C5 | Social | Who cares and why? |
| C6 | Deep Structure | What's really being said? |
| C7 | Instrument | What tools are available? |
| C8 | Paradigm | What model of thought? |
| C9 | Stakes | What matters vs what doesn't? |

## API

### Core

- `IntentVector` — 9D intent profile with salience + tolerance (backed by `Float64Array`)
- `checkAlignment(sender, receiver)` — alignment report with cosine similarity, draft margin, and per-channel warnings
- `checkDraft(sender, capacity, speedFactor)` — draft safety check with dynamic amplification
- `toleranceStack(profile)` — RSS tolerance: ε_total = √(ε₁² + ε₂² + ... + ε₉²)
- `selectFitting(stakes)` — hydraulic fitting selection (HoseClamp → DeepSeaSeal)

### LLM Encoder

```js
import { LLMEncoder } from '@superinstance/polyformalism-a2a';

const encoder = new LLMEncoder({
  endpoint: 'https://api.deepinfra.com/v1/openai',
  apiKey: 'your-key',
  model: 'ByteDance/Seed-2.0-mini',
});

const profile = await encoder.encode('The submarine hull pressure is critical');
```

Model-driven intent extraction via any OpenAI-compatible API. Replaces heuristic keyword matching with structured 9-channel extraction.

### Intent Compilation

```js
import { classifyPrecision, batchClassify } from '@superinstance/polyformalism-a2a/intent-compile';
```

Intent-directed constraint compilation — classify precision (INT8/INT16/INT32/DUAL) from C9 stakes channel.

## License

Apache-2.0
