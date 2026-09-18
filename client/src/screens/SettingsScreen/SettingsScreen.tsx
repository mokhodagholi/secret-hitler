import { Show, createEffect, createSignal, onCleanup } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { APP_PACKAGE_VERSION } from '../../services/update';
import { RAVI_CLIPS } from '../../assets/sounds/ravi/clips';
import { PORTRAITS } from '../../assets/avatars';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { SettingRow } from '../../components/SettingRow/SettingRow';
import { TextInput } from '../../components/TextInput/TextInput';
import { GameEventHeader } from '../GameScreen/GameEventHeader';
import { Spotlight } from '../GameScreen/Spotlight';
import { SETTINGS_TARGET } from '../../tutorial/settingsView';
import styles from './SettingsScreen.module.scss';

export function SettingsScreen() {
  const { settings, i18n, miniApp, nav, flags, ravi, tutorial } = useApp();
  const state = settings.settings;
  const { formatMessage } = i18n;
  const fromHost = () => miniApp.user() != null;
  const guiding = () => tutorial.settingsPage();
  const nameFromHostKey =
    miniApp.platform === 'telegram'
      ? 'settings.profileNameFromTelegram'
      : 'settings.profileNameFromBale';
  const cardName = () => {
    const portrait = PORTRAITS[Math.abs(state.avatar) % PORTRAITS.length];
    return i18n.lang() === 'fa' ? portrait.persian : portrait.latin;
  };

  const headlineText = () => formatMessage(tutorial.headlineKey());
  const [headlineTyped, setHeadlineTyped] = createSignal<{
    text: string;
    done: boolean;
  }>({ text: '', done: false });
  const headlineReady = () =>
    headlineTyped().done && headlineTyped().text === headlineText();

  createEffect(() => {
    if (!guiding()) return;
    const handleBack = () => {
      tutorial.skipHomeSettings();
      nav.navigate('home');
    };
    nav.setBackHandler(handleBack);
    onCleanup(() => nav.clearBackHandler(handleBack));
  });

  createEffect(() => {
    if (!guiding()) return;
    tutorial.beat();
    const target = tutorial.target();
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-tutorial-target="${target}"]`)
        ?.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
  });

  function leaveTour(): void {
    tutorial.skipHomeSettings();
    nav.navigate('home');
  }

  function goPrevious(): void {
    tutorial.retreatHomeSettings();
    if (!tutorial.settingsPage()) nav.navigate('home');
  }

  function goContinue(): void {
    if (tutorial.advanceHomeSettings()) nav.navigate('home');
  }

  return (
    <Screen fill>
      <div class={styles.page}>
        <Show
          when={guiding()}
          fallback={<ScreenHeader title={formatMessage('settings.title')} />}
        >
          <div class={styles.guideHeader}>
            <GameEventHeader
              headline={headlineText()}
              onTyped={(done, text) => setHeadlineTyped({ text, done })}
            />
          </div>
        </Show>
        <div
          classList={{
            [styles.body]: true,
            [styles.bodyGuide]: guiding(),
          }}
        >
          <SectionTitle>{formatMessage('settings.profile')}</SectionTitle>
          <div data-tutorial-target={SETTINGS_TARGET.name}>
            <TextInput
              label={formatMessage('settings.profileName')}
              placeholder={
                fromHost()
                  ? formatMessage(nameFromHostKey)
                  : formatMessage('settings.profileNamePlaceholder')
              }
              icon="people"
              value={
                fromHost()
                  ? (miniApp.user()?.firstName ?? state.profileName)
                  : state.profileName
              }
              disabled={fromHost()}
              onInput={(value) => {
                if (!fromHost()) settings.set('profileName', value);
              }}
            />
          </div>
          <SettingRow
            kind="value"
            icon="cards"
            tutorialTarget={SETTINGS_TARGET.card}
            label={formatMessage('settings.playerCard')}
            value={cardName()}
            onClick={() => nav.navigate('player-cards')}
          />

          <SectionTitle>{formatMessage('settings.display')}</SectionTitle>
          <SettingRow
            kind="toggle"
            icon="music"
            tutorialTarget={SETTINGS_TARGET.music}
            label={formatMessage('settings.music')}
            checked={state.music}
            onChange={(value) => settings.set('music', value)}
          />
          <SettingRow
            kind="toggle"
            icon="speaker"
            tutorialTarget={SETTINGS_TARGET.sound}
            label={formatMessage('settings.soundEffects')}
            checked={state.soundEffects}
            onChange={(value) => settings.set('soundEffects', value)}
          />
          <SettingRow
            kind="toggle"
            icon="chat"
            tutorialTarget={SETTINGS_TARGET.ravi}
            label={formatMessage('settings.raviVoice')}
            checked={state.raviVoice}
            onChange={(value) => {
              settings.set('raviVoice', value);
              ravi.setVoiceEnabled(value);
            }}
          />
          <Show when={flags.flags.voice}>
            <SettingRow
              kind="toggle"
              icon="mic"
              tutorialTarget={SETTINGS_TARGET.table}
              label={formatMessage('settings.tableVoice')}
              checked={state.voiceEnabled}
              onChange={(value) => settings.set('voiceEnabled', value)}
            />
          </Show>
          <SettingRow
            kind="value"
            icon="masks"
            tutorialTarget={SETTINGS_TARGET.who}
            label={formatMessage('settings.raviWho')}
            value={formatMessage(`settings.raviNarrator.${state.raviWho}`)}
            onClick={
              Object.keys(RAVI_CLIPS).length > 1
                ? () => settings.cycleRaviWho()
                : undefined
            }
          />
          <SettingRow
            kind="toggle"
            icon="refresh"
            tutorialTarget={SETTINGS_TARGET.motion}
            label={formatMessage('settings.reduceMotion')}
            checked={state.reduceMotion}
            onChange={(value) => settings.set('reduceMotion', value)}
          />
          <SettingRow
            kind="value"
            icon="scroll"
            tutorialTarget={SETTINGS_TARGET.briefing}
            label={formatMessage('settings.changelog')}
            value={formatMessage('settings.version', { package: APP_PACKAGE_VERSION })}
            onClick={() => nav.navigate('changelog')}
          />
          <SettingRow
            kind="link"
            icon="envelope"
            tutorialTarget={SETTINGS_TARGET.support}
            label={formatMessage('settings.support')}
            onClick={() => nav.navigate('support')}
          />
        </div>
        <Show when={guiding()}>
          <Spotlight
            target={tutorial.target()}
            lifted={tutorial.maskLifted()}
            passHole={tutorial.passHole()}
            layoutKey={tutorial.beat()}
            showContinue={
              tutorial.canContinueHomeSettings() && headlineReady()
            }
            showPrevious={tutorial.beat() > 0 && headlineReady()}
            showSkip={headlineReady()}
            onPrevious={goPrevious}
            onContinue={goContinue}
            onSkip={leaveTour}
            formatMessage={formatMessage}
          />
        </Show>
      </div>
    </Screen>
  );
}
