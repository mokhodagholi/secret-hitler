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
});
