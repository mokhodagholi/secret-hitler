# Commit Messages

Follow Conventional Commits, but **capitalize the first word of the subject**
(the description after `type(scope):`).

```
type(scope): Capitalized summary
```

### Do / Don't

| Don't | Do |
|---|---|
| `feat(client): add font` | `feat(client): Adds font` |
| `fix(server): handle reconnect` | `fix(server): Handles reconnect` |
| `refactor(shared): rename phase` | `refactor(shared): Renames phase` |

- The first word after the colon is capitalized.
- Keep the `type(scope):` prefix lowercase (e.g. `feat(client):`).
- Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`.
