require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// One prompt builder per study mode. Each one forces the model to reply
// with nothing but JSON so the frontend can render it directly.
const PROMPTS = {
  flashcards: (content) => `You are a study assistant. Read the notes below and create flashcards covering the key facts, terms, and concepts. Return ONLY valid JSON, no markdown formatting, no commentary, in this exact shape:
{"cards":[{"front":"...","back":"..."}]}
Create between 6 and 12 cards depending on how much material is in the notes. Keep each side concise.

NOTES:
"""
${content}
"""`,

  quiz: (content) => `You are a study assistant. Read the notes below and write a multiple-choice quiz that tests understanding of the material. Return ONLY valid JSON, no markdown formatting, no commentary, in this exact shape:
{"questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}
Create between 5 and 8 questions. Each question needs exactly 4 options and one correct index from 0 to 3. Keep explanations to one short sentence.

NOTES:
"""
${content}
"""`,

  summary: (content) => `You are a study assistant. Read the notes below and produce a clear summary. Return ONLY valid JSON, no markdown formatting, no commentary, in this exact shape:
{"summary":"two or three sentences capturing the big picture","keyPoints":["...","..."]}
Include between 4 and 8 key points, each one sentence.

NOTES:
"""
${content}
"""`
};

app.post('/api/generate', async (req, res) => {
  const { content, mode } = req.body || {};

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Paste some notes first.' });
  }
  if (!PROMPTS[mode]) {
    return res.status(400).json({ error: 'Unknown study mode.' });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it to your .env file and restart the server.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: PROMPTS[mode](content) }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'The AI service returned an error. Check the server logs for details.' });
    }

    const data = await response.json();
    const text = (data.content || [])
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim();

    // Models sometimes wrap JSON in a markdown fence even when told not to.
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', cleaned);
      return res.status(502).json({ error: 'The AI response could not be read. Try generating again.' });
    }

    res.json(parsed);
  } catch (err) {
    console.error('Request to Anthropic API failed:', err);
    res.status(500).json({ error: 'Something went wrong talking to the AI service.' });
  }
});

app.listen(PORT, () => {
  console.log(`AI Study Buddy running at http://localhost:${PORT}`);
});
