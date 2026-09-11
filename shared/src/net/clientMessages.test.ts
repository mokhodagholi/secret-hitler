import { describe, expect, it } from '@rstest/core';
import { parseClientMessage } from './clientMessages';

describe('parseClientMessage', () => {
  it('Should accept every well-formed message type', () => {
    expect(parseClientMessage('{"type":"auth","token":"abc"}')).toEqual({
      type: 'auth',
      token: 'abc',
    });
    expect(parseClientMessage('{"type":"chat:message","text":"hi"}')).toEqual({
      type: 'chat:message',
      text: 'hi',
    });
    expect(
      parseClientMessage(
        '{"type":"command","command":{"kind":"castVote","vote":"ja"}}',
      ),
    ).toEqual({ type: 'command', command: { kind: 'castVote', vote: 'ja' } });
    expect(
      parseClientMessage('{"type":"player:kick","playerId":"p1"}'),
    ).toEqual({ type: 'player:kick', playerId: 'p1' });
    expect(parseClientMessage('{"type":"player:kick"}')).toBeNull();
    expect(
      parseClientMessage('{"type":"kick:request","playerId":"p1"}'),
    ).toEqual({ type: 'kick:request', playerId: 'p1' });
    expect(parseClientMessage('{"type":"kick:request"}')).toBeNull();
    expect(parseClientMessage('{"type":"kick:vote","agree":true}')).toEqual({
      type: 'kick:vote',
      agree: true,
    });
    expect(parseClientMessage('{"type":"kick:vote","agree":"yes"}')).toBeNull();
    for (const type of ['player:ready', 'player:unready', 'game:start', 'room:leave', 'ping']) {
      expect(parseClientMessage(JSON.stringify({ type }))).toEqual({ type });
    }
    expect(parseClientMessage('{"type":"voice:join"}')).toEqual({ type: 'voice:join' });
    expect(parseClientMessage('{"type":"voice:leave"}')).toEqual({ type: 'voice:leave' });
    expect(
      parseClientMessage('{"type":"voice:createTransport","direction":"send"}'),
    ).toEqual({ type: 'voice:createTransport', direction: 'send' });
    expect(
      parseClientMessage(
        '{"type":"voice:mute","muted":true,"extra":1}',
      ),
    ).toEqual({ type: 'voice:mute', muted: true });
    expect(parseClientMessage('{"type":"voice:createTransport","direction":"both"}')).toBeNull();
    expect(parseClientMessage('{"type":"voice:produce","transportId":"t"}')).toBeNull();
  });

  it('Should reject frames that are not JSON objects', () => {
    expect(parseClientMessage('not json at all')).toBeNull();
    expect(parseClientMessage('42')).toBeNull();
    expect(parseClientMessage('"auth"')).toBeNull();
    expect(parseClientMessage('null')).toBeNull();
  });

  it('Should reject a chat message whose text is not a string', () => {
    // The exact frame that used to throw inside the ws handler.
    expect(parseClientMessage('{"type":"chat:message","text":123}')).toBeNull();
    expect(parseClientMessage('{"type":"chat:message"}')).toBeNull();
  });

  it('Should reject commands with unknown kinds or malformed payloads', () => {
    const command = (payload: unknown) =>
      parseClientMessage(JSON.stringify({ type: 'command', command: payload }));
    expect(command({ kind: 'hackTheGame' })).toBeNull();
    expect(command({ kind: 'castVote', vote: 'maybe' })).toBeNull();
    expect(command({ kind: 'nominateChancellor', targetId: 7 })).toBeNull();
    expect(command({ kind: 'discardPolicy', index: 'first' })).toBeNull();
    expect(command({ kind: 'discardPolicy', index: 1.5 })).toBeNull();
    expect(command(null)).toBeNull();
    expect(command('castVote')).toBeNull();
  });

  it('Should reject unknown message types and bad auth payloads', () => {
    expect(parseClientMessage('{"type":"admin:shutdown"}')).toBeNull();
    expect(parseClientMessage('{"type":"auth","token":{}}')).toBeNull();
  });

  it('Should rebuild payloads so unexpected extra fields are dropped', () => {
    const parsed = parseClientMessage(
      '{"type":"chat:message","text":"hi","__proto__":{"polluted":true},"extra":1}',
    );
    expect(parsed).toEqual({ type: 'chat:message', text: 'hi' });
  });
});
