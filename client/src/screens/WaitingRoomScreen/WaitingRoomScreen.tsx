import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { Phase, kickVoteYesNeeded, type GameStateView, type PublicPlayer } from '@secret-hitler/shared';
import awaitingBg from '../../assets/lobby/awaiting-bg.png';
import { useApp } from '../../services/AppContext';
import {
  CONNECTION_STATUS_KEYS,
  ERROR_MESSAGE_KEYS,
  type MessageKey,
} from '../../i18n';
import { isolateBidi } from '../../i18n/utils';
import { Button } from '../../components/Button/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { KickVoteOverlay } from '../GameScreen/KickVoteOverlay';
import { PlayerActionsMenu } from '../GameScreen/PlayerActionsMenu';
import { PlayerSlot } from './PlayerSlot';
import { seatLayoutForBox } from './slotSize';
import styles from './WaitingRoomScreen.module.scss';

const TIP_KEYS: MessageKey[] = [
  'tip.chaos',
  'tip.hitlerOffice',
  'tip.claims',
  'tip.inspect',
  'tip.night',
  'tip.trustedFace',
  'tip.whoTheyCover',
];
const TIP_ROTATION_MS = 5000;

/**
 * Lobby for a joined room. Paper profile cards fill the seats area over the
 * briefing-desk art; a rotating tip and the room controls sit at the bottom.
 * Navigates to the game board as soon as the server leaves the lobby phase.
 */
export function WaitingRoomScreen() {
  const { nav, game, socket, i18n, animation, sound, prefetch, miniApp } = useApp();
  const { formatMessage } = i18n;

  const [copied, setCopied] = createSignal(false);
  const [confirmingLeave, setConfirmingLeave] = createSignal(false);
  const [startOpen, setStartOpen] = createSignal(false);
  const [kickTarget, setKickTarget] = createSignal<{
    id: string;
    name: string;
  } | null>(null);
  const [playerMenu, setPlayerMenu] = createSignal<PublicPlayer | null>(null);
  const [reporting, setReporting] = createSignal<PublicPlayer | null>(null);
  const [nowMs, setNowMs] = createSignal(Date.now());
  const [tipIndex, setTipIndex] = createSignal(0);
  let tipEl: HTMLParagraphElement | undefined;

  const view = game.view;
  const shareLink = () =>
    game.currentSession()?.shareLink ??
    miniApp.inviteLink(view()?.code ?? '', location.origin, location.hostname);
  const amReady = () => game.you()?.ready ?? false;
  const amWantStart = () => game.you()?.wantsStart ?? false;
  const isPublicTable = () => view()?.kind === 'public';

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

  onMount(() => {
    const timer = setInterval(
      () => setTipIndex((index) => (index + 1) % TIP_KEYS.length),
      TIP_ROTATION_MS,
    );
    onCleanup(() => clearInterval(timer));
  });

  createEffect((previous: number | undefined) => {
    const index = tipIndex();
    if (previous !== undefined && tipEl) void animation.play(tipEl, 'fade-in');
    return index;
  });

  async function copyShareLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareLink());
      sound.play('ui-copied');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — nothing to do.
    }
  }

  function leaveRoom(): void {
    setConfirmingLeave(false);
    game.leaveRoom();
    nav.returnTo('play');
  }

  function tryStart(): void {
    const state = view();
    if (!state) return;
    const connected = state.players.filter((player) => player.connected);
    if (
      connected.length < state.minPlayers ||
      !connected.every((player) => player.ready)
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
    if (unreadyPlayers().length > 0) return 'notReady';
    return 'confirm';
  };

  const startConnectedPlayers = () => startConnected();
  const startNeed = () => kickVoteYesNeeded(Math.max(1, startConnectedCount()));
  const startHave = () =>
    startConnectedPlayers().filter((player) => player.wantsStart).length;
  const startCooldownUntil = () => view()?.you.wantStartCooldownUntil ?? null;
  const startCooldownSeconds = () => {
    const until = startCooldownUntil();
    if (until == null) return 0;
    return Math.max(0, Math.ceil((until - nowMs()) / 1000));
  };
  const publicStartCooling = () =>
    !amWantStart() &&
    view()?.startChoice == null &&
    startCooldownSeconds() > 0;
  const startHintText = () => {
    if (publicStartCooling()) {
      return startCooldownSeconds() >= 60
        ? ('waiting.startCooldownMinutes' as const)
        : ('waiting.startCooldownSeconds' as const);
    }
    if (startHave() > 0) return 'waiting.startHintProgress' as const;
    return 'waiting.startHint' as const;
  };

  function tapPublicStart(): void {
    if (publicStartCooling()) return;
    game.setWantStart(!amWantStart());
  }

  createEffect(() => {
    const cooling = startCooldownUntil() != null && startCooldownUntil()! > Date.now();
    if (!view()?.startChoice && !cooling && !view()?.kickVote) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 250);
    onCleanup(() => clearInterval(timer));
  });

  const startChoiceSeconds = () => {
    const choice = view()?.startChoice;
    if (!choice) return 0;
    return Math.max(0, Math.ceil((choice.endsAt - nowMs()) / 1000));
  };

  const playerName = (playerId: string) =>
    view()?.players.find((player) => player.id === playerId)?.name ?? '';
  const playerSeat = (playerId: string) => {
    const seat = view()?.players.find((player) => player.id === playerId)?.seat;
    return seat != null ? seat + 1 : 0;
  };

  const canReportLobby = (player: PublicPlayer, state: GameStateView) => {
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
        />

        <Show
          when={view()}
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
                <p class={styles.tip} ref={(element) => (tipEl = element)}>
                  {formatMessage(TIP_KEYS[tipIndex()])}
                </p>

                <Show when={game.lastError()}>
                  <p class={styles.error} onClick={() => game.clearError()}>
                    {formatMessage(ERROR_MESSAGE_KEYS[game.lastError()!.code])}
                  </p>
                </Show>

                <div class={styles.actions}>
                  <Button variant="outline" onClick={copyShareLink}>
                    {formatMessage(copied() ? 'waiting.copied' : 'waiting.shareLink')}
                  </Button>

                  <Show
                    when={isPublicTable()}
                    fallback={
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
                    }
                  >
                    <Show when={!(view()?.startChoice && !amWantStart())}>
                      <Button
                        variant={amWantStart() ? 'outline' : 'gold'}
                        disabled={
                          view()?.kickVote != null ||
                          (view()?.startChoice != null && amWantStart()) ||
                          publicStartCooling()
                        }
                        onClick={tapPublicStart}
                      >
                        {formatMessage(
                          amWantStart() ? 'waiting.retractStart' : 'waiting.wantStart',
                        )}
                      </Button>
                    </Show>
                  </Show>
                </div>

                <Show when={isPublicTable()}>
                  <p class={styles.startHint}>
                    {formatMessage(startHintText(), {
                      have: startHave(),
                      need: startNeed(),
                      minutes: Math.ceil(startCooldownSeconds() / 60),
                      seconds: startCooldownSeconds(),
                    })}
                  </p>
                  <Show when={view()?.startChoice && amWantStart()}>
                    <p class={styles.startHint}>
                      {formatMessage('waiting.startChoiceWaiting')}
                    </p>
                  </Show>
                </Show>
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
                open={
                  isPublicTable() &&
                  view()?.startChoice != null &&
                  !amWantStart()
                }
                message={formatMessage('waiting.startChoiceHoldout')}
                confirmLabel={formatMessage('waiting.wantStart')}
                onConfirm={() => game.setWantStart(true)}
              >
                {formatMessage('waiting.startChoiceClock', {
                  seconds: startChoiceSeconds(),
                })}
              </ConfirmDialog>

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
              }}
              awaitingLabel={formatMessage('waiting.waitingForPlayers')}
              seatLabel={formatMessage('waiting.seatLabel', {
                n: player.seat + 1,
              })}
              isYou={player.id === props.state.you.id}
              youLabel={formatMessage('game.you')}
              onSelect={
                canReportLobby(player, props.state)
                  ? () => {
                      sound.play('player-ready');
                      setPlayerMenu(player);
                    }
                  : game.isHost() && player.id !== props.state.you.id
                    ? () => {
                        sound.play('player-ready');
                        setKickTarget({ id: player.id, name: player.name });
                      }
                    : undefined
              }
            />
          )}
        </For>
        <For each={Array.from({ length: awaiting() })}>
          {() => (
            <PlayerSlot
              awaitingLabel={formatMessage('waiting.waitingForPlayers')}
            />
          )}
        </For>
      </div>
    );
  }
}
