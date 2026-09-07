// Groq's OpenAI-compatible chat completions endpoint used for all AI features
// (roadmap generation, resume feedback, step elaboration).
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-20b';

// sends a system+user prompt pair to Groq and returns the parsed JSON response.
// every caller in this app instructs the model to return JSON only, so this
// helper always expects and parses JSON 
export async function askAI(systemPrompt, userPrompt) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      // forces Groq to return a valid JSON object rather than free-form text
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();

  // Groq returns error details in data.error.message 
  if (!response.ok) {
    throw new Error(data.error?.message || 'AI request failed');
  }

  try {
    // the actual JSON payload is a string inside the first choice's message,
    // so it needs a second JSON.parse even though the outer response is JSON
    return JSON.parse(data.choices[0].message.content);
  } catch {
    // model occasionally returns malformed/truncated JSON despite response_format,
    // surface this distinctly so callers can show a retry-friendly error message
    throw new Error('AI returned malformed JSON');
  }
}