# Comments

Keep comments concise. One line where possible. Explain *why*, not *what* —
the code already says what it does.

- No multi-sentence narration or storytelling.
- No restating the code in prose.
- Drop a comment entirely when the name and code are self-explanatory.
- Reserve longer notes for genuine constraints, gotchas, or non-obvious intent.

### Do / Don't

| Don't | Do |
|---|---|
| `// We need to do X because the server may catch its own broadcast — only players still holding a session were actually kicked, so we guard here to avoid …` | `// Host can catch its own broadcast; only kicked players still hold a session.` |
| `// This function takes the player id and returns the player` | (no comment) |
| `// Loop over every player and send them the state` | (no comment) |
