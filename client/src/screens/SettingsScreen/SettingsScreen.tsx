import { useApp } from '../../services/AppContext';
import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { SettingRow } from '../../components/SettingRow/SettingRow';
import { TextInput } from '../../components/TextInput/TextInput';
import styles from './SettingsScreen.module.scss';

export function SettingsScreen() {
  const { nav, settings, i18n } = useApp();
  const state = settings.settings;
  const { formatMessage } = i18n;

  const activeLanguageName = () =>
    i18n.available().find((language) => language.code === state.language)!
      .nativeName;

  return (
    <Screen nav={APP_NAV}>
      <ScreenHeader
        title={formatMessage('settings.title')}
        right={
          <button
            class={styles.gear}
            aria-label={formatMessage('settings.headerLabel')}
          >
            <Icon name="gear" size={22} />
          </button>
        }
      />

      <SectionTitle>{formatMessage('settings.profile')}</SectionTitle>
      <TextInput
        label={formatMessage('settings.profileName')}
        placeholder={formatMessage('settings.profileNamePlaceholder')}
        icon="people"
        value={state.profileName}
        onInput={(value) => settings.set('profileName', value)}
      />

      <SectionTitle>{formatMessage('settings.gameSettings')}</SectionTitle>
      <SettingRow
        kind="value"
        icon="people"
        label={formatMessage('settings.playerCount')}
        value={formatMessage('settings.players', { count: state.playerCount })}
        onClick={() => settings.cyclePlayerCount()}
      />
      <SettingRow
        kind="value"
        icon="clock"
        label={formatMessage('settings.timer')}
        value={formatMessage(
          state.timerEnabled ? 'settings.enabled' : 'settings.disabled',
        )}
        onClick={() => settings.toggleTimer()}
      />
      <SettingRow
        kind="toggle"
        icon="chat"
        label={formatMessage('settings.confirmActions')}
        checked={state.confirmActions}
        onChange={(value) => settings.set('confirmActions', value)}
      />

      <SectionTitle>{formatMessage('settings.display')}</SectionTitle>
      <SettingRow
        kind="value"
        icon="palette"
        label={formatMessage('settings.theme')}
        value={formatMessage('settings.classicBlue')}
      />
      <SettingRow
        kind="value"
        icon="globe"
        label={formatMessage('settings.language')}
        value={activeLanguageName()}
        onClick={() => settings.set('language', i18n.next(state.language))}
      />
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
        icon="refresh"
        label={formatMessage('settings.reduceMotion')}
        checked={state.reduceMotion}
        onChange={(value) => settings.set('reduceMotion', value)}
      />

      <SectionTitle>{formatMessage('settings.other')}</SectionTitle>
      <SettingRow
        kind="link"
        icon="question"
        label={formatMessage('settings.howToPlay')}
        onClick={() => nav.navigate('how-to-play')}
      />
      <SettingRow
        kind="link"
        icon="info"
        label={formatMessage('settings.about')}
        onClick={() => nav.navigate('about')}
      />
      <SettingRow
        kind="link"
        icon="refresh"
        label={formatMessage('settings.resetTutorials')}
        onClick={() => settings.resetTutorials()}
      />
      <SettingRow
        kind="link"
        icon="trash"
        label={formatMessage('settings.clearLocalData')}
        onClick={() => settings.clearLocalData()}
      />

      <div class={styles.restore}>
        <Button variant="outline">
          {formatMessage('settings.restorePurchases')}
        </Button>
      </div>
    </Screen>
  );
}
