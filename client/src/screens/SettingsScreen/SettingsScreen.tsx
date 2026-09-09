import { createSignal } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { SettingRow } from '../../components/SettingRow/SettingRow';
import { TextInput } from '../../components/TextInput/TextInput';
import styles from './SettingsScreen.module.scss';

export function SettingsScreen() {
  const { nav, settings, i18n, bale } = useApp();
  const state = settings.settings;
  const { formatMessage } = i18n;
  const [clearingData, setClearingData] = createSignal(false);
  const fromBale = () => bale.user() != null;

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
        onClick={() => setClearingData(true)}
      />

      <div class={styles.restore}>
        <Button variant="outline">
          {formatMessage('settings.restorePurchases')}
        </Button>
      </div>

      <ConfirmDialog
        open={clearingData()}
        message={formatMessage('settings.clearLocalDataMessage')}
        confirmLabel={formatMessage('settings.clearLocalData')}
        cancelLabel={formatMessage('common.cancel')}
        onConfirm={() => {
          settings.clearLocalData();
          setClearingData(false);
        }}
        onCancel={() => setClearingData(false)}
      />
    </Screen>
  );
}
