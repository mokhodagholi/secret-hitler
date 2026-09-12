import { describe, expect, it } from '@rstest/core';
import { NavigationService } from './NavigationService';

describe('NavigationService', () => {
  it('Should start on the home screen by default', () => {
    const nav = new NavigationService('/');
    expect(nav.screen()).toBe('home');
  });

  it('Should boot into the join screen for a /join/CODE share link', () => {
    const nav = new NavigationService('/join/ABC123');
    expect(nav.screen()).toBe('join-game');
    expect(nav.consumeJoinCode()).toBe('ABC123');
  });

  it('Should uppercase a /join/CODE share link so it matches the room', () => {
    const nav = new NavigationService('/join/l2yyp4');
    expect(nav.screen()).toBe('join-game');
    expect(nav.consumeJoinCode()).toBe('L2YYP4');
  });

  it('Should boot into the join screen for a mini-app startapp room code', () => {
    window.history.replaceState(null, '', '/?tgWebAppStartParam=abc123');
    const nav = new NavigationService('/');
    expect(nav.screen()).toBe('join-game');
    expect(nav.consumeJoinCode()).toBe('ABC123');
    window.history.replaceState(null, '', '/');
  });

  it('Should hand the join code out only once', () => {
    const nav = new NavigationService('/join/ABC123');
    expect(nav.consumeJoinCode()).toBe('ABC123');
    expect(nav.consumeJoinCode()).toBeNull();
  });

  it('Should ignore unrelated paths', () => {
    const nav = new NavigationService('/settings');
    expect(nav.screen()).toBe('home');
    expect(nav.consumeJoinCode()).toBeNull();
  });

  it('Should walk back through the navigation history', () => {
    const nav = new NavigationService('/');
    nav.navigate('play');
    nav.navigate('create-room');
    nav.back();
    expect(nav.screen()).toBe('play');
    nav.back();
    expect(nav.screen()).toBe('home');
  });

  it('Should not stack a repeated navigation to the current screen', () => {
    const nav = new NavigationService('/');
    nav.navigate('play');
    nav.navigate('play');
    nav.back();
    expect(nav.screen()).toBe('home');
  });

  it('Should offer back from any screen that is not home', () => {
    const nav = new NavigationService('/');
    expect(nav.canGoBack()).toBe(false);
    nav.navigate('play');
    expect(nav.canGoBack()).toBe(true);
  });

  it('Should offer back on a deep-linked join screen with an empty stack', () => {
    const nav = new NavigationService('/join/ABC123');
    expect(nav.screen()).toBe('join-game');
    expect(nav.canGoBack()).toBe(true);
    nav.back();
    expect(nav.screen()).toBe('home');
  });

  it('Should run a back handler instead of popping the stack', () => {
    const nav = new NavigationService('/');
    nav.navigate('waiting-room');
    let intercepted = 0;
    nav.setBackHandler(() => {
      intercepted += 1;
    });
    nav.requestBack();
    expect(intercepted).toBe(1);
    expect(nav.screen()).toBe('waiting-room');
    nav.setBackHandler(null);
    nav.requestBack();
    expect(nav.screen()).toBe('home');
  });

  it('Should ignore a stale back-handler cleanup after a newer handler is set', () => {
    const nav = new NavigationService('/');
    nav.navigate('game');
    let fromGame = 0;
    const waitingHandler = () => {};
    const gameHandler = () => {
      fromGame += 1;
    };
    nav.setBackHandler(waitingHandler);
    nav.setBackHandler(gameHandler);
    nav.clearBackHandler(waitingHandler);
    nav.requestBack();
    expect(fromGame).toBe(1);
    expect(nav.screen()).toBe('game');
  });

  it('Should pop room screens so back from play can reach home', () => {
    const nav = new NavigationService('/');
    nav.navigate('play');
    nav.navigate('waiting-room');
    nav.navigate('game');
    nav.navigate('play');
    nav.back();
    expect(nav.screen()).toBe('game');

    nav.returnTo('play');
    expect(nav.screen()).toBe('play');
    nav.back();
    expect(nav.screen()).toBe('home');
  });

  it('Should replace the current screen without stacking it', () => {
    const nav = new NavigationService('/');
    nav.navigate('rules');
    nav.navigate('rules-what-is-this');
    nav.replace('rules-roles');
    expect(nav.screen()).toBe('rules-roles');
    nav.back();
    expect(nav.screen()).toBe('rules');
  });

  it('Should return to play from a deep-linked join with no home on the stack', () => {
    const nav = new NavigationService('/join/ABC123');
    nav.navigate('waiting-room');
    nav.returnTo('play');
    expect(nav.screen()).toBe('play');
    nav.back();
    expect(nav.screen()).toBe('home');
  });
});
