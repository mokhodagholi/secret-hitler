import { describe, it, expect } from '@rstest/core';
import { Phase } from '../types/GameState';
import { BotBrain } from './BotBrain';
import { GameMemory } from './GameMemory';
import type { GameStateView, PublicPlayer, BoardState } from '../types/GameState';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(id: string, opts: Partial<PublicPlayer> = {}): PublicPlayer {
  return {
    id,
    name: `Player ${id}`,
    avatar: 0,
    seat: 0,
    isHost: false,
    connected: true,
    ready: true,
    wantsStart: false,
    isAlive: true,
    isPresident: false,
    isChancellor: false,
    hasVoted: false,
    vote: null,
    wantsContinue: false,
    isBot: false,
    role: null,
    party: null,
    selfMuted: false,
    ...opts,
  };
}

function makeBoard(overrides: Partial<BoardState> = {}): BoardState {
  return {
    liberalPolicies: 0,
    fascistPolicies: 0,
    electionTracker: 0,
    drawPile: 17,
    discardPile: 0,
    president: null,
    chancellor: null,
    lastEnacted: [],
    ...overrides,
  };
}

function makeView(overrides: Partial<GameStateView> = {}): GameStateView {
  const botId = 'bot-1';
  const players = overrides.players ?? [
    makePlayer(botId),
    makePlayer('p2'),
    makePlayer('p3'),
    makePlayer('p4'),
    makePlayer('p5'),
  ];
  return {
    roomId: 'room-1',
    code: 'ABCD',
    name: 'Test Room',
    phase: Phase.Nomination,
    hostId: botId,
    minPlayers: 5,
    maxPlayers: 10,
    kind: 'hosted',
    adminPlay: false,
    startChoice: null,
    players,
    board: makeBoard(),
    winner: null,
    roundHistory: [],
    breathDeadline: null,
    discussionDeadline: null,
    voteDeadline: null,
    legislativeDeadline: null,
    nominationDeadline: { startedAt: Date.now() - 1000, endsAt: Date.now() + 30000 },
    specialPowerDeadline: null,
    kickVote: null,
    ineligibleChancellors: [],
    activePower: null,
    vetoUnlocked: false,
    vetoRequested: false,
    you: {
      id: botId,
      role: 'liberal',
      vote: null,
      policies: [],
      peek: [],
      investigation: null,
      canRequestKick: true,
      wantStartCooldownUntil: null,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BotBrain', () => {
  it('Should nominate a chancellor when president during Nomination phase', () => {
    const brain = new BotBrain('bot-1', 'liberal', new Set());
    const memory = new GameMemory();
    const view = makeView({
      phase: Phase.Nomination,
      board: makeBoard({ president: 'bot-1' }),
      discussionDeadline: null,
      nominationDeadline: { startedAt: Date.now() - 1000, endsAt: Date.now() + 30000 },
    });

    const decision = brain.decide(view, memory);

    expect(decision).not.toBeNull();
    expect(decision!.command.kind).toBe('nominateChancellor');
    expect('targetId' in decision!.command).toBe(true);
  });

  it('Should not act during Nomination phase when not president', () => {
    const brain = new BotBrain('bot-1', 'liberal', new Set());
    const memory = new GameMemory();
    const view = makeView({
      phase: Phase.Nomination,
      board: makeBoard({ president: 'p2' }), // someone else is president
    });

    const decision = brain.decide(view, memory);
    expect(decision).toBeNull();
  });

  it('Should cast a vote during Voting phase', () => {
    const brain = new BotBrain('bot-1', 'liberal', new Set());
    const memory = new GameMemory();
    const view = makeView({
      phase: Phase.Voting,
      board: makeBoard({ president: 'p2', chancellor: 'p3' }),
      you: {
        id: 'bot-1',
        role: 'liberal',
        vote: null, // has not voted yet
        policies: [],
        peek: [],
        investigation: null,
        canRequestKick: true,
        wantStartCooldownUntil: null,
      },
    });

    const decision = brain.decide(view, memory);

    expect(decision).not.toBeNull();
    expect(decision!.command.kind).toBe('castVote');
  });

  it('Should not vote again if already voted', () => {
    const brain = new BotBrain('bot-1', 'liberal', new Set());
    const memory = new GameMemory();
    const view = makeView({
      phase: Phase.Voting,
      you: {
        id: 'bot-1',
        role: 'liberal',
        vote: 'ja', // already voted
        policies: [],
        peek: [],
        investigation: null,
        canRequestKick: true,
        wantStartCooldownUntil: null,
      },
    });

    const decision = brain.decide(view, memory);
    expect(decision).toBeNull();
  });

  it('Should discard a fascist policy as liberal president', () => {
    const brain = new BotBrain('bot-1', 'liberal', new Set());
    const memory = new GameMemory();
    const view = makeView({
      phase: Phase.PresidentLegislative,
      board: makeBoard({ president: 'bot-1' }),
      legislativeDeadline: { startedAt: Date.now() - 1000, endsAt: Date.now() + 30000 },
      you: {
        id: 'bot-1',
        role: 'liberal',
        vote: null,
        policies: ['liberal', 'fascist', 'liberal'], // has 3 cards
        peek: [],
        investigation: null,
        canRequestKick: true,
        wantStartCooldownUntil: null,
      },
    });

    const decision = brain.decide(view, memory);

    expect(decision).not.toBeNull();
    expect(decision!.command.kind).toBe('discardPolicy');
    // Should discard the fascist (index 1)
    const cmd = decision!.command as { kind: 'discardPolicy'; index: number };
    expect(view.you.policies[cmd.index]).toBe('fascist');
  });

  it('Should discard a liberal policy as fascist president', () => {
    const brain = new BotBrain('bot-1', 'fascist', new Set(['bot-2']));
    const memory = new GameMemory();
    const view = makeView({
      phase: Phase.PresidentLegislative,
      board: makeBoard({ president: 'bot-1' }),
      legislativeDeadline: { startedAt: Date.now() - 1000, endsAt: Date.now() + 30000 },
      you: {
        id: 'bot-1',
        role: 'fascist',
        vote: null,
        policies: ['fascist', 'liberal', 'fascist'],
        peek: [],
        investigation: null,
        canRequestKick: true,
        wantStartCooldownUntil: null,
      },
    });

    const decision = brain.decide(view, memory);

    expect(decision).not.toBeNull();
    expect(decision!.command.kind).toBe('discardPolicy');
    const cmd = decision!.command as { kind: 'discardPolicy'; index: number };
    expect(view.you.policies[cmd.index]).toBe('liberal');
  });

  it('Should vote nein on a government it has seen enact fascist laws', () => {
    const brain = new BotBrain('bot-1', 'liberal', new Set());
    const memory = new GameMemory();

    // Record that p2 + p3 enacted a fascist policy together
    memory.recordRound({
      round: 1,
      presidentId: 'p2',
      chancellorId: 'p3',
      elected: true,
      votes: new Map([['bot-1', 'ja']]),
      enacted: 'fascist',
      power: null,
    });

    const view = makeView({
      phase: Phase.Voting,
      board: makeBoard({ president: 'p2', chancellor: 'p3' }),
      you: {
        id: 'bot-1',
        role: 'liberal',
        vote: null,
        policies: [],
        peek: [],
        investigation: null,
        canRequestKick: true,
        wantStartCooldownUntil: null,
      },
    });

    const decision = brain.decide(view, memory);
    expect(decision).not.toBeNull();
    expect(decision!.command.kind).toBe('castVote');
    const cmd = decision!.command as { kind: 'castVote'; vote: string };
    expect(cmd.vote).toBe('nein');
  });

  it('Should include a humanlike delay in the decision', () => {
    const brain = new BotBrain('bot-1', 'liberal', new Set());
    const memory = new GameMemory();
    const view = makeView({
      phase: Phase.Voting,
      you: {
        id: 'bot-1',
        role: 'liberal',
        vote: null,
        policies: [],
        peek: [],
        investigation: null,
        canRequestKick: true,
        wantStartCooldownUntil: null,
      },
    });

    const decision = brain.decide(view, memory);
    expect(decision).not.toBeNull();
    expect(decision!.delayMs).toBeGreaterThanOrEqual(500);
    expect(decision!.delayMs).toBeLessThanOrEqual(10_000);
  });
});
