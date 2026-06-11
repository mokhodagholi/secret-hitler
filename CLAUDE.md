# Secret Hitler — Multiplayer Web Game

## Project Overview

A real-time multiplayer Secret Hitler board game played in the browser, with voice chat, heavy animations, and high performance as top priorities.

## Tech Stack

### Package Manager
- **pnpm** — workspace monorepo (`pnpm-workspace.yaml`)

### Frontend
- **Solid.js + TypeScript** — no virtual DOM, compiles JSX to direct DOM operations, fine-grained reactivity via signals
- **Rsbuild** — application bundler (Rust-based via Rspack, much faster than Webpack/Vite)
- **Sass Modules** (`.module.scss`) — scoped styles per component, compiled by Rsbuild
- **Web Animations API** (`element.animate()`) — programmatic animation sequences, triggered on signal changes
- **Canvas 2D** — game board rendering (policy tracker, election tracker)
- **WebRTC** — voice chat client

### Shared
- **rslib** — builds the `/shared` package as a library consumed by both client and server
- TypeScript classes, interfaces, and pure game logic

### Backend
- **Node.js + TypeScript**
- **Fastify** — HTTP server (room creation, join endpoints)
- **ws** — raw WebSocket server (no Socket.IO)
- **mediasoup** — WebRTC SFU for voice routing (not peer-to-peer mesh)
- Built with **tsx** in dev, compiled with **tsc** for production

## Architecture Style

**Class-based + functional hybrid.** Business logic and services are written as classes with clear responsibilities. Solid.js UI components are functions (as Solid requires), but they consume class-based services via context. No imperative spaghetti — every object has a single responsibility and communicates through well-defined interfaces.

### Layer Responsibilities

| Layer | Style | Examples |
|---|---|---|
| UI components | Solid.js functions | `<VotePanel>`, `<PolicyBoard>`, `<PlayerCard>` |
| Client services | Classes (Singleton) | `GameStateService`, `WebSocketService`, `VoiceService`, `AnimationService` |
| Domain model | Classes | `Room`, `Player`, `PolicyDeck`, `GamePhase` |
| Game engine | Class + pure methods | `GameEngine` |
| Server handlers | Classes | `RoomRepository`, `SocketHandler`, `VoiceRouter` |

## Design Patterns

### State Machine — game phase management (most critical)
The game progresses through strict phases. Each phase is a class implementing a `GamePhase` interface with `enter()`, `exit()`, and `handle(action)` methods. The `GameEngine` holds the current phase and delegates all actions to it.

```
GamePhase (interface)
├── LobbyPhase
├── NominationPhase
├── VotingPhase
├── PresidentLegislativePhase
├── ChancellorLegislativePhase
├── SpecialPowerPhase
│   ├── InvestigatePhase
│   ├── SpecialElectionPhase
│   ├── PeekPhase
│   └── ExecutionPhase
└── GameOverPhase
```

### Command — player actions over WebSocket
Every player action is a Command object with a `validate()` and `execute()` method. The server receives a command DTO, deserializes it, validates it against current game state, then executes it.

```
GameCommand (abstract)
├── NominateChancellorCommand
├── CastVoteCommand
├── DiscardPolicyCommand
├── EnactPolicyCommand
├── UseSpecialPowerCommand
└── VetoRequestCommand
```

### Observer / EventEmitter — game events
`GameEngine` extends a typed `EventEmitter`. Phases emit events (`policyEnacted`, `playerExecuted`, `electionFailed`) that the server broadcasts and the client animates in response to.

### Repository — server-side room storage
`RoomRepository` owns the `Map<roomId, Room>` and is the only place rooms are read or written. Nothing else touches the map directly.

### Factory — room and player creation
`RoomFactory.create(hostId, options): Room` and `PlayerFactory.create(ws, id): Player` — construction logic stays out of business classes.

### Strategy — special presidential powers
Each special power (investigate, peek, special election, execute) is a `SpecialPowerStrategy` with an `execute(target, gameState)` method. `SpecialPowerPhase` holds the active strategy.

### Singleton — client services
`WebSocketService`, `GameStateService`, `VoiceService`, and `AnimationService` are singletons accessed via Solid.js context, not global variables.

## Project Structure

```
/
├── pnpm-workspace.yaml
├── package.json
├── shared/
│   ├── package.json
│   ├── rslib.config.ts
│   ├── types/
│   │   ├── GameState.ts        ← interfaces: GameState, Player, Role, Phase enum
│   │   └── events.ts           ← WS event payloads (client→server, server→client)
│   └── engine/
│       ├── GameEngine.ts       ← State machine host, extends EventEmitter
│       ├── phases/             ← One file per GamePhase implementation
│       ├── commands/           ← One file per GameCommand implementation
│       ├── PlayerFactory.ts
│       ├── RoomFactory.ts
│       └── PolicyDeck.ts
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.ts                ← Fastify entry, wires everything together
│   ├── RoomRepository.ts       ← Repository pattern, owns Map<roomId, Room>
│   ├── SocketHandler.ts        ← Deserializes WS messages → Commands → GameEngine
│   └── VoiceRouter.ts          ← mediasoup router setup per room
└── client/
    ├── package.json
    ├── rsbuild.config.ts
    ├── index.html
    ├── services/
    │   ├── GameStateService.ts ← Holds Solid signals, synced from server state
    │   ├── WebSocketService.ts ← WS connection, sends Commands, receives state
    │   ├── AnimationService.ts ← Web Animations API sequences, queued by event
    │   └── VoiceService.ts     ← WebRTC getUserMedia, mediasoup producers/consumers
    ├── components/             ← Solid.js UI components + co-located .module.scss
    │   ├── Board/
    │   ├── PlayerPanel/
    │   ├── PolicyCard/
    │   ├── VotePanel/
    │   └── RoleCard/
    └── canvas/
        └── BoardRenderer.ts    ← Canvas 2D class, driven by GameStateService signals
```

## Sass Modules Convention

- Every component folder has a co-located `.module.scss` file
- Import as `import styles from './PolicyCard.module.scss'` — class names are locally scoped
- Shared Sass tokens in `client/styles/_vars.scss` and `client/styles/_mixins.scss`
- Global resets and base styles in `client/styles/global.scss` (not a module)

## Architecture Rules

- **Server is single source of truth.** Client never mutates local state directly — it sends Commands, server validates + applies them via `GameEngine`, broadcasts new `GameState` to all clients.
- **State updates are full state broadcasts**, not diffs, to keep client logic simple.
- **No database.** Game state lives in `RoomRepository` in memory. Add Redis only if multi-instance scaling is ever needed.
- **Animations run on `transform` and `opacity` only** — compositor-thread only, never trigger layout or paint.
- **One class, one responsibility.** If a class needs a comment to explain what it does, split it.

## Performance Rules

- Solid.js has no virtual DOM — JSX compiles to direct DOM mutations, only the exact node that changed updates
- Use `ws` not Socket.IO — avoid polling fallback and extra abstraction
- Use SFU (mediasoup) not P2P mesh — mesh breaks down at 5+ players
- Keep Canvas draws batched inside a single `requestAnimationFrame` callback
- Use `will-change: transform` on elements that will animate, remove it after animation ends
- Rsbuild with Rspack gives significantly faster builds and HMR than Vite/Webpack

## Animation Sequences to Build

| Animation | Trigger | Technique |
|---|---|---|
| Role card reveal | Game start | CSS 3D `rotateY` flip |
| Card draw | Legislative session | Slide + flip chain |
| Policy enactment | Policy chosen | Dramatic reveal + board tracker tick |
| Vote reveal | All votes cast | Simultaneous Ja/Nein flip |
| Badge movement | New President/Chancellor | CSS `translate` transition |
| Game over | Win condition | Full-screen overlay sequence |

## Voice Chat Design

- Push-to-talk: `MediaStreamTrack.enabled = true/false`
- Server controls who can speak (e.g. mute non-president during legislative phase)
- mediasoup handles audio routing — signaling goes over the existing WebSocket connection
- One mediasoup `Router` per room

## UI Screens & Features (from design)

### Visual Design Language
- Dark navy blue background throughout
- Gold/yellow as primary accent (buttons, logo, icons)
- Eagle emblem in header on all screens
- Illustrated character silhouettes (background art on landing)
- Role colors: blue = Liberal, red = Fascist
- Bottom tab navigation on mobile: Rules | Home/Play | Settings

---

### Screen: Landing / Home
- [ ] Secret Hitler logo with eagle emblem + tagline
- [ ] Large gold PLAY button → navigates to Choose an Option
- [ ] Bottom nav: Rules, How to Play, Settings

### Screen: Rules
- [ ] Overview text section
- [ ] Components section (17 Role Cards, Policy Deck, Policy Tracker, Envelope icons)
- [ ] How to Play — 4 numbered steps with icons
- [ ] Remember quote at bottom
- [ ] Scrollable single page

### Screen: How to Play (Tutorial)
- [ ] Paginated tutorial, 4 steps (1/4 … 4/4)
- [ ] Step 1 — Deal Roles (role cards illustrated)
- [ ] Step 2 — Elect a President (President + Chancellor diagram)
- [ ] Step 3 — Enact Policies
- [ ] Step 4 — Achieve Your Agenda (win conditions)
- [ ] Dot pagination indicator + swipe/arrow navigation

### Screen: Settings
- [ ] **Game Settings**
  - [ ] Player Count selector (5–10)
  - [ ] Show Roles in Game toggle (reveals roles to spectators)
  - [ ] Timer toggle (disabled / enabled with countdown)
  - [ ] Confirm Actions toggle (confirmation dialog before submitting actions)
- [ ] **Appearance**
  - [ ] Theme selector (Classic Blue shown — extensible)
  - [ ] Music toggle
  - [ ] Sound Effects toggle
- [ ] **Other**
  - [ ] How to Play shortcut
  - [ ] About
  - [ ] Reset Tutorials
  - [ ] Clear Local Data

### Screen: Choose an Option
- [ ] Two cards: **Create Room** and **Join Game** with icons and short descriptions

### Screen: Create Room
- [ ] Room Name text input
- [ ] Room Password text input (optional, for private rooms)
- [ ] Auto-generated share link with copy-to-clipboard button
- [ ] CREATE ROOM button → transitions to Waiting Room

### Screen: Join Game
- [ ] **Available Rooms** list — each row shows room name + player count
- [ ] Password input field (shown when room is password-protected)
- [ ] JOIN ROOM button

### Screen: Waiting Room
- [ ] Room name + player count (e.g. 7/10)
- [ ] Room code displayed (e.g. X7Y922) for quick sharing
- [ ] Full share link with copy button
- [ ] Player list: avatar, name, Ready / Not Ready badge
- [ ] Players toggle their own ready status
- [ ] Host sees START GAME button (enabled when minimum players met)
- [ ] Non-host sees animated waiting state with circular progress ring and player count
- [ ] Tips carousel (auto-rotating game tips) shown while waiting
- [ ] "Game will start automatically when enough players have joined" note

### Screen: Main Game Board
- [ ] **Header bar** — room name, player count, settings gear icon
- [ ] **Oval table layout** — player avatars arranged around a central table
  - [ ] Each player slot: avatar image, name, role label (LIBERAL / FASCIST / hidden), mic icon
  - [ ] Current President and Chancellor highlighted with badge
  - [ ] Dead players shown as greyed out
- [ ] **Central Policy Board**
  - [ ] Liberal track — dove icons, blue tiles, shows enacted count (0–5)
  - [ ] Fascist track — skull icons, red tiles, shows enacted count (0–6)
  - [ ] Draw pile + Discard pile visible
  - [ ] Current Track counters: LIBERAL N | FASCIST N
  - [ ] Election tracker (failed governments, 1–3 marks)
  - [ ] Last policies enacted strip (e.g. L L F L L)
- [ ] **President / Chancellor labels** below board
- [ ] **Bottom panel — two tabs:**
  - [ ] **Chat tab** — real-time messages, player name + timestamp, role-colored name text, message input field with send button
  - [ ] **Game Log tab** — chronological list of game events (nominations, votes, policies)
- [ ] **Voice Chat panel** (right side)
  - [ ] Mic button — tap to mute / unmute
  - [ ] "Connected" / "Disconnected" status
  - [ ] Per-player mic activity indicator on their avatar
- [ ] **Your Role card** (bottom right) — role name + description text
- [ ] **Action button** (gold, context-sensitive label):
  - NOMINATE CHANCELLOR / CAST VOTE / DRAW POLICIES / ENACT POLICY / USE POWER / END TURN
  - Label shows current role context e.g. "You are the President"
- [ ] **LEAVE ROOM** button (bottom left)
- [ ] **VIEW RULES** button (bottom right)

---

## Roadmap

### Phase 1 — Custom Games (current scope)
Everything in the Screen features above. Players create or join a room with a password/code, play a full game, then the room closes.

### Phase 2 — Ranking System (future, design only for now)
- Player profiles with win/loss history
- ELO or bracket-style ranking score
- Ranked matchmaking — players matched with others in the same skill bracket
- Leaderboard screen
- "Ranked Game" mode distinct from Custom Game
- Keep ranked and custom game flows completely separate in the codebase so Phase 2 can be added without touching Phase 1 logic

---

## Build Phases

---

### Phase 1 — Monorepo Scaffold
> Goal: empty repo compiles, all packages link to each other, nothing breaks.

- [ ] `pnpm-workspace.yaml` — declare `shared`, `server`, `client` packages
- [ ] Root `package.json` — workspace scripts (`build`, `dev`, `test`)
- [ ] Root `tsconfig.base.json` — shared compiler options (strict, ES2022, etc.)
- [ ] `shared/package.json` + `rslib.config.ts` — lib build targeting CJS + ESM
- [ ] `shared/tsconfig.json` — extends base
- [ ] `server/package.json` + `tsconfig.json` — extends base, references shared
- [ ] `client/package.json` + `rsbuild.config.ts` — Solid.js plugin, Sass, references shared
- [ ] `client/tsconfig.json` — extends base, JSX set to solid
- [ ] Verify: `pnpm build:shared` works, server and client can import from `shared`

---

### Phase 2 — Shared Game Engine
> Goal: complete game logic in pure TypeScript, fully tested, no server or browser dependencies.

- [ ] `shared/types/GameState.ts` — `GameState`, `Player`, `Role`, `Phase`, `Policy`, `Vote`
- [ ] `shared/types/events.ts` — all WebSocket event payloads (client→server and server→client)
- [ ] `shared/engine/PolicyDeck.ts` — shuffle, draw, discard logic
- [ ] `shared/engine/PlayerFactory.ts` — creates `Player` objects, assigns roles
- [ ] `shared/engine/RoomFactory.ts` — creates `Room` with defaults
- [ ] `shared/engine/phases/` — one file per phase, all implementing `GamePhase` interface
  - [ ] `LobbyPhase`
  - [ ] `NominationPhase`
  - [ ] `VotingPhase`
  - [ ] `PresidentLegislativePhase`
  - [ ] `ChancellorLegislativePhase`
  - [ ] `SpecialPowerPhase` + strategies (Investigate, Peek, SpecialElection, Execute)
  - [ ] `GameOverPhase`
- [ ] `shared/engine/commands/` — one file per command, all implementing `GameCommand` interface
  - [ ] `NominateChancellorCommand`
  - [ ] `CastVoteCommand`
  - [ ] `DiscardPolicyCommand`
  - [ ] `EnactPolicyCommand`
  - [ ] `UseSpecialPowerCommand`
  - [ ] `VetoRequestCommand`
- [ ] `shared/engine/GameEngine.ts` — state machine host, extends typed EventEmitter
- [ ] Unit tests for all phases, commands, and PolicyDeck

---

### Phase 3 — Server Core
> Goal: players can create and join rooms, game state syncs over WebSocket.

- [ ] `server/index.ts` — Fastify instance, register routes and WebSocket
- [ ] `server/RoomRepository.ts` — `Map<roomId, Room>`, CRUD methods
- [ ] `server/SocketHandler.ts` — WebSocket upgrade, per-connection player registration, message dispatch
- [ ] HTTP endpoints:
  - [ ] `POST /rooms` — create room (name, password, options) → returns `roomId`, `shareLink`
  - [ ] `GET /rooms` — list public rooms (name, playerCount, hasPassword)
  - [ ] `POST /rooms/:id/join` — validate password → returns join token
- [ ] WebSocket events handled:
  - [ ] `player:ready` / `player:unready`
  - [ ] `game:start` (host only)
  - [ ] All `GameCommand` types → deserialize → validate → `GameEngine.handle()`
  - [ ] `chat:message`
- [ ] Server broadcasts on every `GameEngine` event:
  - [ ] Full `GameState` diff to all clients in room
  - [ ] Private data (role, hand) sent only to the relevant player
- [ ] Disconnection handling — grace period, rejoin by token

---

### Phase 4 — Client: Navigation & Pre-game Screens
> Goal: all screens before the game board are complete and navigable.

- [ ] `client/services/WebSocketService.ts` — connect, send, receive, reconnect logic
- [ ] `client/services/GameStateService.ts` — Solid signals wrapping server `GameState`
- [ ] Client-side router (no library — simple signal-based screen switcher)
- [ ] **Landing screen** — logo, PLAY button, bottom nav (Rules / How to Play / Settings)
- [ ] **Rules screen** — static content, scrollable
- [ ] **How to Play screen** — paginated 4-step tutorial, dot indicator, swipe navigation
- [ ] **Settings screen** — all toggles and selectors wired to local storage
  - [ ] Player count, Show Roles, Timer, Confirm Actions
  - [ ] Theme, Music, Sound Effects
  - [ ] Reset Tutorials, Clear Local Data
- [ ] **Choose an Option screen** — Create Room / Join Game cards
- [ ] **Create Room screen** — name, password inputs, auto share link + copy button
- [ ] **Join Game screen** — room list fetched from server, password input, JOIN button
- [ ] **Waiting Room screen**
  - [ ] Host view: player list with ready badges, room code, share link, START GAME button
  - [ ] Guest view: circular progress ring, player count, tips carousel (auto-rotating)
  - [ ] Ready / Not Ready toggle for each player
  - [ ] Auto-navigate to game board when host starts

---

### Phase 5 — Client: Game Board UI
> Goal: full game board renders correctly for all game phases, no animations yet.

- [ ] **Oval table layout** — player avatars positioned around the table using CSS
  - [ ] Avatar, name, role label (hidden until revealed), mic icon per seat
  - [ ] President / Chancellor badge overlaid on correct player
  - [ ] Dead players greyed out
- [ ] **Policy Board** (Canvas 2D via `BoardRenderer`)
  - [ ] Liberal track — 5 dove tile slots
  - [ ] Fascist track — 6 skull tile slots, special power markers
  - [ ] Draw pile + Discard pile
  - [ ] Election tracker (3 marks)
  - [ ] Last policies enacted strip
  - [ ] Current track counters (LIBERAL N | FASCIST N)
- [ ] **President / Chancellor labels** below board
- [ ] **Chat tab** — message list, role-colored player names, timestamp, input + send
- [ ] **Game Log tab** — event entries appended in real time
- [ ] **Voice Chat panel** — mic button, connection status, per-player activity dot on avatar
- [ ] **Your Role card** — role name + description, shown bottom right
- [ ] **Context-sensitive action button** — label and handler changes per phase:
  - NOMINATE CHANCELLOR → CAST VOTE → DRAW POLICIES → DISCARD → ENACT → USE POWER
  - Shows role context ("You are the President")
- [ ] **Confirm Actions dialog** — shown before submitting if setting is on
- [ ] **Timer bar** — shown per-phase countdown if Timer setting is enabled
- [ ] **LEAVE ROOM** and **VIEW RULES** buttons
- [ ] **Game Over overlay** — winner faction, reveal all roles, play again option

---

### Phase 6 — Animations
> Goal: every game event has a polished animation. All run on `transform`/`opacity` only.

- [ ] `client/services/AnimationService.ts` — queue-based sequencer, promise-chained
- [ ] Role card flip on game start (3D `rotateY`, dealt one by one)
- [ ] Policy card draw — slide from deck, flip reveal
- [ ] Policy discard — slide to discard pile
- [ ] Policy enactment — dramatic reveal + tile slots fill on board
- [ ] Vote reveal — all Ja/Nein cards flip simultaneously
- [ ] Election failed — election tracker mark animates in, shake effect if threshold reached
- [ ] President / Chancellor badge slides to new player
- [ ] Player execution — avatar fades + greyscale
- [ ] Special power activation — flash / glow effect on power marker
- [ ] Game over — full-screen overlay sweeps in, role reveals cascade

---

### Phase 7 — Voice Chat
> Goal: players can hear each other with push-to-talk, server controls mute state.

- [ ] `server/VoiceRouter.ts` — one mediasoup `Router` per room, `WebRtcTransport` per player
- [ ] WebSocket signaling messages: `voice:getCapabilities`, `voice:createTransport`, `voice:produce`, `voice:consume`
- [ ] `client/services/VoiceService.ts`
  - [ ] `getUserMedia` — request mic permission
  - [ ] Create send transport → produce audio track
  - [ ] Create receive transport per remote player → consume audio
  - [ ] Push-to-talk: `track.enabled = true/false` on keydown/keyup or button hold
- [ ] Server mute enforcement — server can force-disable a producer (e.g. during legislative phase)
- [ ] Per-player mic activity indicator on avatar (volume level via `AnalyserNode`)
- [ ] Voice connection status shown in Voice Chat panel

---

### Phase 8 — Polish & Hardening
> Goal: production-ready, handles edge cases gracefully.

- [ ] Disconnection + rejoin — grace period (30s), player slot held, state restored on reconnect
- [ ] Host migration — if host disconnects, oldest remaining player becomes host
- [ ] Mobile layout — responsive oval table, bottom sheet for chat/voice panels
- [ ] Sound effects — policy enact, vote reveal, game over sting (respects settings toggle)
- [ ] Background music loop (respects settings toggle)
- [ ] Empty room cleanup — `RoomRepository` removes room after all players leave
- [ ] Share link works as direct join URL (deep link → auto-open Join Game with room pre-filled)
- [ ] Error states — room full, wrong password, game already started, player name taken
- [ ] Loading states on all async actions

---

### Phase 9 — Ranking System (future)
> Design-only for now. Do not mix into Phase 1–8 code.

- [ ] Player profiles (persistent identity — auth needed)
- [ ] Win/loss/role history per player
- [ ] ELO-style ranking score
- [ ] Ranked matchmaking — players queued and matched by skill bracket
- [ ] Ranked Game mode (separate from Custom Game flow)
- [ ] Leaderboard screen
- [ ] Bracket display showing skill tiers

## Game Rules Reference

- 5–10 players: Liberals, Fascists, Hitler
- Fascists know each other and Hitler (in 6+ player games Hitler does not know fascists)
- President nominates Chancellor → all players vote Ja/Nein → if majority Ja, government formed
- President draws 3 policy tiles, discards 1 → Chancellor draws 2, enacts 1
- Liberal track: 5 liberal policies = liberal win
- Fascist track: 6 fascist policies = fascist win; Hitler elected Chancellor after 3 fascist policies = fascist win
- Special powers unlock at fascist policy milestones (investigate, special election, peek, execute)

## Commands

```bash
# Install all workspace dependencies
pnpm install

# Dev
pnpm dev:server    # backend with tsx watch
pnpm dev:client    # Rsbuild dev server

# Build
pnpm build:shared  # rslib build (must run first)
pnpm build:client  # Rsbuild production build
pnpm build:server  # tsc production build
pnpm build         # all in order

# Test
pnpm test          # shared engine unit tests
```
