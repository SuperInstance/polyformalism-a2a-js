# @superinstance/polyformalism-a2a

**9-channel polyglot communication framework for multi-agent alignment.**

Zero dependencies. Works in Node.js and browsers.

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

- `IntentVector` — 9D intent profile with salience + tolerance
- `checkAlignment(sender, receiver)` — alignment report with cosine similarity
- `checkDraft(sender, capacity, speedFactor)` — draft safety check
- `toleranceStack(profile)` — total tolerance ε_total
- `selectFitting(stakes)` — hydraulic fitting selection

## License

Apache-2.0
