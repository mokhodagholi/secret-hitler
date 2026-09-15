import { Show } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { APP_PACKAGE_VERSION } from '../../services/update';
import { RAVI_CLIPS } from '../../assets/sounds/ravi/clips';
import { PORTRAITS } from '../../assets/avatars';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { SettingRow } from '../../components/SettingRow/SettingRow';
import { TextInput } from '../../components/TextInput/TextInput';

export function SettingsScreen() {
  const { settings, i18n, miniApp, nav, flags, ravi } = useApp();
  const state = settings.settings;
  const { formatMessage } = i18n;
  const fromHost = () => miniApp.user() != null;
  const nameFromHostKey =
    miniApp.platform === 'telegram'
      ? 'settings.profileNameFromTelegram'
      : 'settings.profileNameFromBale';
  const cardName = () => {
    const portrait = PORTRAITS[Math.abs(state.avatar) % PORTRAITS.length];
    return i18n.lang() === 'fa' ? portrait.persian : portrait.latin;
  };

  return (
    <Screen>
      <ScreenHeader title={formatMessage('settings.title')} />

      <SectionTitle>{formatMessage('settings.profile')}</SectionTitle>
      <TextInput
        label={formatMessage('settings.profileName')}
        placeholder={
          fromHost()
            ? formatMessage(nameFromHostKey)
            : formatMessage('settings.profileNamePlaceholder')
        }
        icon="people"
        value={fromHost() ? (miniApp.user()?.firstName ?? state.profileName) : state.profileName}
        disabled={fromHost()}
        onInput={(value) => {
          if (!fromHost()) settings.set('profileName', value);
        }}
      />
      <SettingRow
        kind="value"
        icon="cards"
        label={formatMessage('settings.playerCard')}
        value={cardName()}
        onClick={() => nav.navigate('player-cards')}
      />

      <SectionTitle>{formatMessage('settings.display')}</SectionTitle>
      <SettingRow
        kind="toggle"
        icon="music"
        label={formatMessage('settings.music')}
        checked={state.music}
        onChange={(value) => settings.set('music', value)}
      />
      <SettingRow
        kind="toggle"
        icon="speaker"
        label={formatMessage('settings.soundEffects')}
        checked={state.soundEffects}
        onChange={(value) => settings.set('soundEffects', value)}
      />
      <SettingRow
        kind="toggle"
        icon="chat"
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
          label={formatMessage('settings.tableVoice')}
          checked={state.voiceEnabled}
          onChange={(value) => settings.set('voiceEnabled', value)}
        />
      </Show>
      <SettingRow
        kind="value"
        icon="masks"
        label={formatMessage('settings.raviWho')}
        value={formatMessage(`settings.raviNarrator.${state.raviWho}`)}
        onClick={
          Object.keys(RAVI_CLIPS).length > 1 ? () => settings.cycleRaviWho() : undefined
        }
      />
      <SettingRow
        kind="toggle"
        icon="refresh"
        label={formatMessage('settings.reduceMotion')}
        checked={state.reduceMotion}
        onChange={(value) => settings.set('reduceMotion', value)}
      />
      <SettingRow
        kind="value"
        icon="scroll"
        label={formatMessage('settings.changelog')}
        value={formatMessage('settings.version', { package: APP_PACKAGE_VERSION })}
        onClick={() => nav.navigate('changelog')}
      />
      <SettingRow
        kind="link"
        icon="envelope"
        label={formatMessage('settings.support')}
        onClick={() => nav.navigate('support')}
      />
    </Screen>
  );
}
