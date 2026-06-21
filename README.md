# AI Study Buddy

Paste in lecture notes, a textbook paragraph, an article, whatever and get back flashcards, a multiple-choice quiz, or a summary.

## What it does

- **Flashcards**: flip through a stack of cards generated from your notes
- **Quiz**: multiple choice, with an explanation after each answer and a score at the end
- **Summary**: a short TL;DR plus a list of key points

No framework, no build step. It's a plain HTML/CSS/JS frontend talking to a small Express server, which is the part that actually calls the API.

## Setup

```bash
npm install
cp .env.example .env
```

Open `.env` and add your own key:

```
ANTHROPIC_API_KEY=your-key-here
```

You can get one at [console.anthropic.com](https://console.anthropic.com).

Then:

```bash
npm start
```

and go to `http://localhost:3000`.

## How it's wired together

The page sends whatever you typed plus the selected mode (flashcards / quiz / summary) to `POST /api/generate`. The server builds a prompt for that mode, calls the Anthropic API, and tells the model to return strict JSON so it can hand the result straight back to the frontend to render. The API key stays in `.env` on the server and never touches the browser.

If the model wraps its JSON in a code fence anyway (it happens occasionally), the server strips that before parsing.

## Changing things

- Different model: set `ANTHROPIC_MODEL` in `.env`. Defaults to `claude-sonnet-4-6`.
- More or fewer flashcards/questions: edit the prompt strings in `server.js`.
- Colors and type: all in one place at the top of `public/style.css`.

## Pushing this to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
```

Create an empty repo on GitHub (don't let it add a README for you), then:

```bash
git remote add origin https://github.com/your-username/ai-study-buddy.git
git branch -M main
git push -u origin main
```

`.env` is already in `.gitignore`, so your key won't get pushed by accident.

## License

MIT, see [LICENSE](LICENSE).
