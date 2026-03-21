export async function parseScheduleWithClaude(rawText, apiKey) {
  const systemPrompt = `You are a schedule extraction assistant. The user will give you the text of a document describing a structured weekly practice plan. Your job is to extract it into a precise JSON format.

Return ONLY valid JSON, no markdown, no explanation, no backticks. The JSON must exactly match this schema:

{
  "title": "string — name of the plan",
  "description": "string — 1-2 sentence summary",
  "days": [
    {
      "id": "string — lowercase day name e.g. monday",
      "name": "string — e.g. Monday",
      "subtitle": "string — short theme e.g. Foundation",
      "theme": "string — full day theme e.g. Foundation Day — Reset & Baseline",
      "steps": [
        {
          "id": "string — unique e.g. mon-1",
          "title": "string — short step name",
          "durationMinutes": number,
          "type": "active | rest | evening",
          "instructions": "string — full instructions for this step",
          "source": "string — citation if present, empty string if not"
        }
      ]
    }
  ]
}

Rules:
- type is "rest" if the step involves palming, resting, or closing eyes
- type is "evening" if the step is marked as evening or night
- type is "active" for all other steps
- durationMinutes must be a number, not a string
- Every step must have a unique id
- Include all 7 days if present
- If a day has no steps, still include it with an empty steps array
- Do not invent steps — only extract what is in the document`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Here is the document text:\n\n${rawText.slice(0, 50000)}` }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Claude API error');
  }

  const data = await response.json();
  const jsonText = data.content[0].text.trim();

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Claude returned invalid JSON — try again');
  }
}
