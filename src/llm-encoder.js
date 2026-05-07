/**
 * LLM-based encoder for polyformalism-a2a.
 * 
 * Replaces heuristic keyword matching with model-driven intent extraction.
 * Uses any OpenAI-compatible API (DeepInfra, DeepSeek, etc.)
 */

export class LLMEncoder {
  /**
   * @param {object} config
   * @param {string} config.endpoint - OpenAI-compatible chat completions endpoint
   * @param {string} config.apiKey - API key
   * @param {string} config.model - Model ID (e.g. "ByteDance/Seed-2.0-mini")
   */
  constructor(config) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  /**
   * Encode a natural language message into a 9-channel IntentVector.
   * Uses the LLM to extract intent profile with tolerance.
   * 
   * @param {string} message - The message to encode
   * @param {object} [options]
   * @param {string} [options.context] - Additional context about the communication
   * @param {number} [options.temperature=0.3] - LLM temperature (low for consistency)
   * @returns {Promise<import('./index.js').IntentVector>}
   */
  async encode(message, options = {}) {
    const systemPrompt = `You are a communication intent analyzer. Given a message, extract its 9-channel intent profile.

The 9 channels are:
C1 Boundary: "What are we talking about?" — Topic scope, domain boundaries
C2 Pattern: "How do pieces connect?" — Structural/logical relationships
C3 Process: "What's happening over time?" — Temporal dynamics, state changes
C4 Knowledge: "How sure am I?" — Confidence, certainty, evidence level
C5 Social: "Who cares and why?" — Social dynamics, stakeholders
C6 Deep Structure: "What's really being said?" — Hidden intent, subtext, implications
C7 Instrument: "What tools are available?" — Medium, format, channel constraints
C8 Paradigm: "What model of thought?" — Reasoning framework, worldview
C9 Stakes: "What matters vs what doesn't?" — Priority, urgency, consequences

For each channel, provide:
1. A salience value [0.0, 1.0] — how important is this channel for this message
2. A tolerance value [0.01, 1.0] — how much deviation is acceptable

ALSO provide a brief "draft" assessment:
- draft [0.0, 1.0]: How much shared context does this message require? (0=nobody needs context, 1=deep expert knowledge required)
- speed_factor [0.0, 1.0]: How rushed is this communication? (0=careful, 1=emergency)

Respond in EXACTLY this JSON format, nothing else:
{"channels":[{"salience":0.0,"tolerance":0.5},{"salience":0.0,"tolerance":0.5},{"salience":0.0,"tolerance":0.5},{"salience":0.0,"tolerance":0.5},{"salience":0.0,"tolerance":0.5},{"salience":0.0,"tolerance":0.5},{"salience":0.0,"tolerance":0.5},{"salience":0.0,"tolerance":0.5},{"salience":0.0,"tolerance":0.5}],"draft":0.0,"speed_factor":0.0}`;

    const userPrompt = options.context
      ? `Context: ${options.context}\n\nMessage: ${message}`
      : `Message: ${message}`;

    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: options.temperature ?? 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in LLM response');

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(`Failed to parse LLM response as JSON: ${content.slice(0, 200)}`);
    }

    // Import IntentVector dynamically to avoid circular deps
    const { IntentVector } = await import('./index.js');
    const vector = IntentVector.zero();

    for (let i = 0; i < 9 && i < parsed.channels.length; i++) {
      vector.set(i, parsed.channels[i].salience);
      vector.setTolerance(i, parsed.channels[i].tolerance);
    }

    return vector;
  }

  /**
   * Batch encode multiple messages.
   * @param {string[]} messages
   * @param {object} [options]
   * @returns {Promise<import('./index.js').IntentVector[]>}
   */
  async encodeBatch(messages, options = {}) {
    return Promise.all(messages.map(m => this.encode(m, options)));
  }
}
