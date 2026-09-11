import { useApp } from '../../services/AppContext';
import { APP_PACKAGE_VERSION } from '../../services/update';
import { RAVI_CLIPS } from '../../assets/sounds/ravi/clips';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { SettingRow } from '../../components/SettingRow/SettingRow';
import { TextInput } from '../../components/TextInput/TextInput';

export function SettingsScreen() {
  const { settings, i18n, bale, nav } = useApp();
  const state = settings.settings;
  const { formatMessage } = i18n;
  const fromBale = () => bale.user() != null;

  return (
    <Screen>
      <ScreenHeader title={formatMessage('settings.title')} />

      <SectionTitle>{formatMessage('settings.profile')}</SectionTitle>
      <TextInput
        label={formatMessage('settings.profileName')}
        placeholder={
          fromBale()
            ? formatMessage('settings.profileNameFromBale')
            : formatMessage('settings.profileNamePlaceholder')
        }
        icon="people"
        value={fromBale() ? (bale.user()?.firstName ?? state.profileName) : state.profileName}
        disabled={fromBale()}
        onInput={(value) => {
          if (!fromBale()) settings.set('profileName', value);
        }}
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
        onChange={(value) => settings.set('raviVoice', value)}
      />
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
    </Screen>
  );
}
