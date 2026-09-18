import {
  For,
  Index,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import {
  Phase,
  type GameStateView,
  type PublicPlayer,
  type RoomSummary,
  type SocialPerson,
} from '@secret-hitler/shared';
import awaitingBg from '../../assets/lobby/awaiting-bg.png';
import { useApp } from '../../services/AppContext';
import { CONNECTION_STATUS_KEYS, ERROR_MESSAGE_KEYS } from '../../i18n';
import { isolateBidi } from '../../i18n/utils';
import type { SocialIdentity } from '../../services/SocialService';
import { Button } from '../../components/Button/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { KickVoteOverlay } from '../GameScreen/KickVoteOverlay';
import { PlayerActionsMenu } from '../GameScreen/PlayerActionsMenu';
import { InviteFriendsSheet } from '../HomeScreen/InviteFriendsSheet';
import { LobbyChat } from './LobbyChat';
import { PlayerSlot } from './PlayerSlot';
import { lobbyNudgeTiming, pickFullerLobby } from './lobbyNudge';
import { seatLayoutForBox } from './slotSize';
import styles from './WaitingRoomScreen.module.scss';

/**
 * Lobby for a joined room. Paper profile cards fill the seats area over the
 * briefing-desk art; chat and the room controls sit at the bottom.
 * Navigates to the game board as soon as the server leaves the lobby phase.
 */
export function WaitingRoomScreen() {
  const { nav, game, socket, i18n, sound, prefetch, miniApp, flags, social, settings } = useApp();
  const { formatMessage } = i18n;

  const [confirmingLeave, setConfirmingLeave] = createSignal(false);
  const [startOpen, setStartOpen] = createSignal(false);
  const [inviteOpen, setInviteOpen] = createSignal(false);
  const [kickTarget, setKickTarget] = createSignal<{
    id: string;
    name: string;
  } | null>(null);
  const [playerMenu, setPlayerMenu] = createSignal<PublicPlayer | null>(null);
  const [reporting, setReporting] = createSignal<PublicPlayer | null>(null);
  const [nowMs, setNowMs] = createSignal(Date.now());
  const [nudge, setNudge] = createSignal<RoomSummary | null>(null);
  const [switchingNudge, setSwitchingNudge] = createSignal(false);

  const view = game.view;
  const amReady = () => game.you()?.ready ?? false;
  const isPublicTable = () => view()?.kind === 'public';
  const lobbyRoomId = createMemo(() => view()?.roomId);

  function socialIdentity(): SocialIdentity {
    const name = miniApp.user()?.firstName ?? settings.settings.profileName.trim();
    return {
      clientId: settings.settings.profileId,
      initData: miniApp.initData(),
      name: name || formatMessage('home.guest'),
      avatar: settings.settings.avatar,
      token: game.currentSession()?.token,
    };
  }

  async function openInvites(): Promise<void> {
    setInviteOpen(true);
    try {
      await social.load(socialIdentity());
    } catch {
      // Empty list + server error toast from fetch; sheet still opens.
    }
  }

  async function inviteFriend(friend: SocialPerson): Promise<void> {
    try {
      await social.inviteFriend(friend.accountId, socialIdentity());
    } catch {
      // Stay on the sheet; the list reload or a later tap is enough.
    }
  }

  async function acceptInvite(id: string): Promise<void> {
    try {
      await social.acceptInvite(id, socialIdentity());
      setInviteOpen(false);
    } catch {
      /* Keep the sheet open. */
    }
  }

  // Session dropped (left room / token expired) → back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.returnTo('play');
  });

  // Host pressed start → server flips the phase → everyone moves to the board.
  // A leftover snapshot from a previous table must not yank them onto that board.
  createEffect(() => {
    const state = view();
    const session = game.currentSession();
    if (!state || !session || state.roomId !== session.roomId) return;
    if (state.phase === Phase.Lobby) return;
    sound.play('room-start');
    game.clearError(); // don't carry a lobby error into the game
    nav.navigate('game');
  });

  let seenPlayerIds: Set<string> | null = null;
  let lastReadyCount = -1;
  createEffect(() => {
    const state = view();
    if (!state) return;
    const ids = new Set(state.players.map((player) => player.id));
    const readyCount = state.players.filter((player) => player.ready).length;
    if (seenPlayerIds == null) {
      seenPlayerIds = ids;
      lastReadyCount = readyCount;
      return;
    }
    for (const id of ids) {
      if (!seenPlayerIds.has(id)) sound.play('player-join');
    }
    for (const id of seenPlayerIds) {
      if (!ids.has(id)) sound.play('player-leave');
    }
    if (readyCount > lastReadyCount) sound.play('player-ready');
    seenPlayerIds = ids;
    lastReadyCount = readyCount;
  });

  function leaveRoom(): void {
    setConfirmingLeave(false);
    game.leaveRoom();
    nav.returnTo('play');
  }

  function nudgeBusy(): boolean {
    return (
      confirmingLeave() ||
      startOpen() ||
      inviteOpen() ||
      kickTarget() != null ||
      playerMenu() != null ||
      reporting() != null ||
      switchingNudge()
    );
  }

  function nudgeIdentity() {
    return {
      initData: miniApp.initData(),
      clientId: settings.settings.profileId,
    };
  }

  async function considerNudge(): Promise<void> {
    const state = view();
    if (!state || state.phase !== Phase.Lobby || state.adminPlay) return;
    if (nudgeBusy()) return;
    if (state.kickVote || state.startChoice) return;
    try {
      const rooms = await game.listRooms();
      const latest = view();
      if (!latest || latest.phase !== Phase.Lobby || latest.adminPlay) return;
      if (latest.roomId !== state.roomId) return;
      const connected = latest.players.filter((player) => player.connected).length;
      const fuller = pickFullerLobby({
        rooms,
        currentRoomId: latest.roomId,
        currentCount: connected,
      });
      if (!fuller) {
        setNudge(null);
        return;
      }
      const alreadyOpen = nudge();
      setNudge(fuller);
      if (alreadyOpen) return;
      void game.recordLobbyNudge('prompt', {
        ...nudgeIdentity(),
        fromCode: latest.code,
        toCode: fuller.code,
        seats: fuller.playerCount,
      });
    } catch {
      /* next tick retries with live seats */
    }
  }

  async function switchToFuller(): Promise<void> {
    const target = nudge();
    if (!target || switchingNudge()) return;
    const name = miniApp.user()?.firstName ?? settings.settings.profileName.trim();
    if (!name) return;
    setSwitchingNudge(true);
    const fromCode = view()?.code;
    try {
      await game.joinRoom(target.id, {
        name,
        avatar: settings.settings.avatar,
        clientId: settings.settings.profileId,
        initData: miniApp.initData(),
      });
      void game.recordLobbyNudge('join', {
        ...nudgeIdentity(),
        fromCode,
        toCode: target.code,
        seats: target.playerCount,
      });
      setNudge(null);
    } catch {
      setNudge(null);
    } finally {
      setSwitchingNudge(false);
    }
  }

  // First offer after a minute in this lobby, then every three minutes with a
  // fresh room list. Changing tables restarts the wait.
  createEffect(() => {
    const roomId = lobbyRoomId();
    if (!roomId) return;
    setNudge(null);
    let cancelled = false;
    let repeatTimer: ReturnType<typeof setInterval> | undefined;
    const firstTimer = window.setTimeout(() => {
      if (cancelled) return;
      void considerNudge();
      if (cancelled) return;
      repeatTimer = window.setInterval(() => {
        void considerNudge();
      }, lobbyNudgeTiming.repeatMs);
    }, lobbyNudgeTiming.firstWaitMs);
    onCleanup(() => {
      cancelled = true;
      clearTimeout(firstTimer);
      if (repeatTimer) clearInterval(repeatTimer);
    });
  });

  function tryStart(): void {
    const state = view();
    if (!state) return;
    const connected = state.players.filter((player) => player.connected);
    const needReady = !isPublicTable();
    if (
      connected.length < state.minPlayers ||
      (needReady && !connected.every((player) => player.ready))
    ) {
      sound.play('ui-error');
    }
    setStartOpen(true);
  }

  function confirmStart(): void {
    setStartOpen(false);
    game.startGame();
  }

  const startConnected = () => {
    const state = view();
    if (!state) return [];
    return state.players.filter((player) => player.connected);
  };

  const startConnectedCount = () => startConnected().length;

  const startNeedCount = () => {
    const state = view();
    if (!state) return 0;
    return Math.max(0, state.minPlayers - startConnectedCount());
  };

  const unreadyPlayers = () =>
    startConnected().filter((player) => !player.ready);

  const startGate = (): 'needPlayers' | 'notReady' | 'confirm' | null => {
    if (!startOpen()) return null;
    const state = view();
    if (!state) return null;
    const connected = startConnected();
    if (connected.length < state.minPlayers) return 'needPlayers';
    if (!isPublicTable() && unreadyPlayers().length > 0) return 'notReady';
    return 'confirm';
  };

  createEffect(() => {
    if (!view()?.startChoice && !view()?.kickVote) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 250);
    onCleanup(() => clearInterval(timer));
  });

  const playerName = (playerId: string) =>
    view()?.players.find((player) => player.id === playerId)?.name ?? '';
  const playerSeat = (playerId: string) => {
    const seat = view()?.players.find((player) => player.id === playerId)?.seat;
    return seat != null ? seat + 1 : 0;
  };

  const canKickInLobby = () => flags.enabled('lobbyKick');

  const canReportLobby = (player: PublicPlayer, state: GameStateView) => {
    if (!canKickInLobby()) return false;
    if (state.kind !== 'public') return false;
    if (!state.you.canRequestKick) return false;
    if (state.kickVote || state.startChoice) return false;
    if (player.id === state.you.id) return false;
    return state.players.filter((sitter) => sitter.connected).length >= 3;
  };

  return (
    <Screen fill>
      <div class={styles.scene}>
        <div
          class={styles.backdrop}
          aria-hidden="true"
          style={{ '--lobby-art': `url("${prefetch.src(awaitingBg)}")` }}
        />

        <ScreenHeader
          title={formatMessage('waiting.title')}
          tone="warm"
          onBack={() => setConfirmingLeave((open) => !open)}
          right={
            <button
              type="button"
              class={styles.guide}
              aria-label={formatMessage('nav.rules')}
              onClick={() => nav.navigate('rules')}
            >
              <Icon name="book" size={22} />
            </button>
          }
        />

        {/* A new snapshot is a new object; remounting would rebuild every seat. */}
        <Show
          when={view()}
          keyed={false}
          fallback={
            <p class={styles.note}>
              {formatMessage(CONNECTION_STATUS_KEYS[socket.status()])}
            </p>
          }
        >
          {(state) => (
            <>
              <SeatBoard state={state()} />

              <footer class={styles.footer}>
                <Show when={game.lastError()}>
                  <p class={styles.error} onClick={() => game.clearError()}>
                    {formatMessage(ERROR_MESSAGE_KEYS[game.lastError()!.code])}
                  </p>
                </Show>

                <div class={styles.actions}>
                  <Button variant="outline" onClick={() => void openInvites()}>
                    {formatMessage('waiting.inviteFriends')}
                  </Button>

                  <Show
                    when={game.isHost()}
                    fallback={
                      <Button
                        variant={amReady() ? 'outline' : 'gold'}
                        onClick={() => game.setReady(!amReady())}
                      >
                        {formatMessage(
                          amReady() ? 'waiting.notReadyYet' : 'waiting.imReady',
                        )}
                      </Button>
                    }
                  >
                    <Button onClick={tryStart}>
                      {formatMessage('waiting.startGame')}
                    </Button>
                  </Show>
                </div>

                <LobbyChat />
              </footer>

              <ConfirmDialog
                open={confirmingLeave()}
                message={formatMessage(
                  game.isHost() ? 'leaveDialog.hostMessage' : 'leaveDialog.message',
                )}
                confirmLabel={formatMessage('leaveDialog.confirm')}
                cancelLabel={formatMessage('common.cancel')}
                onConfirm={leaveRoom}
                onCancel={() => setConfirmingLeave(false)}
              />

              <ConfirmDialog
                open={nudge() != null && !confirmingLeave()}
                message={formatMessage('waiting.nudgeBody', {
                  count: nudge()?.playerCount ?? 0,
                })}
                confirmLabel={formatMessage('waiting.nudgeJoin')}
                cancelLabel={formatMessage('waiting.nudgeStay')}
                stackActions
                onConfirm={() => {
                  void switchToFuller();
                }}
                onCancel={() => setNudge(null)}
              />

              <ConfirmDialog
                open={startGate() === 'needPlayers'}
                message={formatMessage('waiting.startNeedPlayers', {
                  current: startConnectedCount(),
                  count: startNeedCount(),
                })}
                confirmLabel={formatMessage('common.ok')}
                onConfirm={() => setStartOpen(false)}
                onCancel={() => setStartOpen(false)}
              />

              <ConfirmDialog
                open={startGate() === 'confirm'}
                message={formatMessage('waiting.startConfirm', {
                  count: startConnectedCount(),
                })}
                confirmLabel={formatMessage('waiting.startGame')}
                cancelLabel={formatMessage('common.cancel')}
                onConfirm={confirmStart}
                onCancel={() => setStartOpen(false)}
              />

              <ConfirmDialog
                open={startGate() === 'notReady'}
                message={formatMessage('waiting.startNotReady')}
                confirmLabel={formatMessage('common.ok')}
                onConfirm={() => setStartOpen(false)}
                onCancel={() => setStartOpen(false)}
              >
                <div class={styles.unreadyList}>
                  <For each={unreadyPlayers()}>
                    {(player) => (
                      <div class={styles.unreadyRow}>
                        <div class={styles.unreadyPortrait}>
                          <PlayerSlot
                            player={{
                              name: player.name,
                              avatar: player.avatar,
                              seat: player.seat,
                              ready: player.ready,
                              wantsStart: player.wantsStart,
                              connected: player.connected,
                            }}
                            awaitingLabel={formatMessage(
                              'waiting.waitingForPlayers',
                            )}
                            seatLabel={formatMessage('waiting.seatLabel', {
                              n: player.seat + 1,
                            })}
                            compact
                          />
                        </div>
                        <Show when={canKickInLobby()}>
                          <Button
                            variant="danger"
                            onClick={() => {
                              sound.play('player-ready');
                              setKickTarget({ id: player.id, name: player.name });
                            }}
                          >
                            {formatMessage('waiting.kickNamed', {
                              name: player.name,
                            })}
                          </Button>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </ConfirmDialog>

              <ConfirmDialog
                open={kickTarget() != null}
                message={formatMessage('waiting.kickConfirm', {
                  name: kickTarget()?.name ?? '',
                })}
                confirmLabel={formatMessage('waiting.kick')}
                cancelLabel={formatMessage('common.cancel')}
                onConfirm={() => {
                  const target = kickTarget();
                  if (target) game.kickPlayer(target.id);
                  setKickTarget(null);
                }}
                onCancel={() => setKickTarget(null)}
              />

              <Show when={playerMenu()}>
                {(target) => (
                  <PlayerActionsMenu
                    player={target()}
                    canReport={canReportLobby(target(), state())}
                    canMute={false}
                    muted={false}
                    formatMessage={formatMessage}
                    onReport={() => {
                      const player = target();
                      setPlayerMenu(null);
                      setReporting(player);
                    }}
                    onMute={() => setPlayerMenu(null)}
                    onClose={() => setPlayerMenu(null)}
                  />
                )}
              </Show>

              <ConfirmDialog
                open={reporting() != null}
                message={formatMessage('game.kickVote.confirm', {
                  name: isolateBidi(reporting()?.name ?? ''),
                })}
                confirmLabel={formatMessage('game.kickVote.request')}
                cancelLabel={formatMessage('common.cancel')}
                onConfirm={() => {
                  const target = reporting();
                  setReporting(null);
                  if (target) game.requestKick(target.id);
                }}
                onCancel={() => setReporting(null)}
              />

              <Show when={state().kickVote}>
                {(vote) => (
                  <KickVoteOverlay
                    formatMessage={formatMessage}
                    prompt={formatMessage(
                      vote().targetId === state().you.id
                        ? 'game.kickVote.promptYou'
                        : vote().requesterId === state().you.id
                          ? 'game.kickVote.promptYours'
                          : 'game.kickVote.prompt',
                      {
                        requester: isolateBidi(playerName(vote().requesterId)),
                        target: isolateBidi(playerName(vote().targetId)),
                        requesterSeat: playerSeat(vote().requesterId),
                        targetSeat: playerSeat(vote().targetId),
                      },
                    )}
                    canVote={
                      vote().targetId !== state().you.id &&
                      vote().yourVote == null
                    }
                    yourVote={vote().yourVote}
                    votedCount={vote().votedCount}
                    totalVoters={vote().voterCount}
                    secondsLeft={Math.max(
                      0,
                      Math.ceil((vote().endsAt - nowMs()) / 1000),
                    )}
                    startedAt={vote().startedAt}
                    endsAt={vote().endsAt}
                    onVote={(agree) => game.voteKick(agree)}
                  />
                )}
              </Show>
            </>
          )}
        </Show>
      </div>

      <InviteFriendsSheet
        open={inviteOpen()}
        onClose={() => setInviteOpen(false)}
        onInvite={(friend) => void inviteFriend(friend)}
        onAcceptInvite={(id) => void acceptInvite(id)}
        onIgnoreInvite={(id) => void social.ignoreInvite(id, socialIdentity())}
        onAcceptRequest={(id) => void social.acceptFriendRequest(id, socialIdentity())}
        onIgnoreRequest={(id) => void social.ignoreFriendRequest(id, socialIdentity())}
      />
    </Screen>
  );

  // --- Player seats, filled then empty (grayed) up to capacity ---------------

  function SeatBoard(props: { state: GameStateView }) {
    const seated = createMemo(() =>
      [...props.state.players].sort((a, b) => a.seat - b.seat),
    );
    const awaiting = createMemo(() =>
      Math.max(0, props.state.maxPlayers - seated().length),
    );
    const [slotPx, setSlotPx] = createSignal(96);
    const [columnGapPx, setColumnGapPx] = createSignal(10);
    const [rowGapPx, setRowGapPx] = createSignal(10);
    let seatsEl: HTMLDivElement | undefined;

    const measure = () => {
      if (!seatsEl) return;
      if (seatsEl.clientWidth < 8 || seatsEl.clientHeight < 8) return;
      const firstSeat = seatsEl.querySelector('[role="listitem"]') as HTMLElement | null;
      const captionPx =
        firstSeat != null && slotPx() > 0
          ? Math.max(12, firstSeat.clientHeight - slotPx())
          : undefined;
      const layout = seatLayoutForBox({
        width: seatsEl.clientWidth,
        height: seatsEl.clientHeight,
        count: props.state.maxPlayers,
        captionPx,
      });
      setSlotPx(layout.slotPx);
      setColumnGapPx(layout.columnGapPx);
      setRowGapPx(layout.rowGapPx);
    };

    onMount(() => {
      if (!seatsEl) return;
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(seatsEl);
      onCleanup(() => observer.disconnect());
    });

    createEffect(() => {
      props.state.maxPlayers;
      measure();
    });

    return (
      <div
        ref={(element) => {
          seatsEl = element;
        }}
        class={styles.seats}
        role="list"
        style={{
          '--slot-size': `${slotPx()}px`,
          'column-gap': `${columnGapPx()}px`,
          'row-gap': `${rowGapPx()}px`,
        }}
      >
        <For each={seated()}>
          {(player) => (
            <PlayerSlot
              player={{
                name: player.name,
                avatar: player.avatar,
                seat: player.seat,
                ready: props.state.kind === 'public' ? true : player.ready,
                wantsStart: player.wantsStart,
                connected: player.connected,
                role: player.role,
              }}
              awaitingLabel={formatMessage('waiting.waitingForPlayers')}
              seatLabel={formatMessage('waiting.seatLabel', {
                n: player.seat + 1,
              })}
              isYou={player.id === props.state.you.id}
              youLabel={formatMessage('game.you')}
              roleLabel={
                player.role
                  ? formatMessage(`role.${player.role}`)
                  : undefined
              }
              onSelect={
                canReportLobby(player, props.state)
                  ? () => {
                      sound.play('player-ready');
                      setPlayerMenu(player);
                    }
                  : canKickInLobby() &&
                      game.isHost() &&
                      player.id !== props.state.you.id
                    ? () => {
                        sound.play('player-ready');
                        setKickTarget({ id: player.id, name: player.name });
                      }
                    : undefined
              }
            />
          )}
        </For>
        <Index each={Array.from({ length: awaiting() })}>
          {() => (
            <PlayerSlot
              awaitingLabel={formatMessage('waiting.waitingForPlayers')}
            />
          )}
        </Index>
      </div>
    );
  }
}
