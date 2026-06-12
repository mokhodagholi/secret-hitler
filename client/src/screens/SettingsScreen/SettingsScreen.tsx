import { useApp } from '../../services/AppContext';
import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { SettingRow } from '../../components/SettingRow/SettingRow';
import styles from './SettingsScreen.module.scss';

export function SettingsScreen() {
  const { nav, settings } = useApp();
  const s = settings.settings;

  return (
    <Screen nav={APP_NAV}>
      <ScreenHeader
        title="Settings"
        right={
          <button class={styles.gear} aria-label="Settings">
            <Icon name="gear" size={22} />
          </button>
        }
      />

      <SectionTitle>Game Settings</SectionTitle>
      <SettingRow
        kind="value"
        icon="people"
        label="Player Count"
        value={`${s.playerCount} Players`}
        onClick={() => settings.cyclePlayerCount()}
      />
      <SettingRow
        kind="toggle"
        icon="masks"
        label="Show Roles in Game"
        checked={s.showRoles}
        onChange={(v) => settings.set('showRoles', v)}
      />
      <SettingRow
        kind="value"
        icon="clock"
        label="Timer"
        value={s.timerEnabled ? 'Enabled' : 'Disabled'}
        onClick={() => settings.toggleTimer()}
      />
      <SettingRow
        kind="toggle"
        icon="chat"
        label="Confirm Actions"
        checked={s.confirmActions}
        onChange={(v) => settings.set('confirmActions', v)}
      />

      <SectionTitle>Display</SectionTitle>
      <SettingRow kind="value" icon="palette" label="Theme" value="Classic Blue" />
      <SettingRow
        kind="toggle"
        icon="music"
        label="Music"
        checked={s.music}
        onChange={(v) => settings.set('music', v)}
      />
      <SettingRow
        kind="toggle"
        icon="speaker"
        label="Sound Effects"
        checked={s.soundEffects}
        onChange={(v) => settings.set('soundEffects', v)}
      />

      <SectionTitle>Other</SectionTitle>
      <SettingRow
        kind="link"
        icon="question"
        label="How to Play"
        onClick={() => nav.navigate('how-to-play')}
      />
      <SettingRow
        kind="link"
        icon="info"
        label="About"
        onClick={() => nav.navigate('about')}
      />
      <SettingRow
        kind="link"
        icon="refresh"
        label="Reset Tutorials"
        onClick={() => settings.resetTutorials()}
      />
      <SettingRow
        kind="link"
        icon="trash"
        label="Clear Local Data"
        onClick={() => settings.clearLocalData()}
      />

      <div class={styles.restore}>
        <Button variant="outline">Restore Purchases</Button>
      </div>
    </Screen>
  );
}
