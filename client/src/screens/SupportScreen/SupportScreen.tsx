import { Show, createMemo, createSignal } from 'solid-js';
import { useApp } from '../../services/AppContext';
import {
  SUPPORT_DESCRIPTION_MAX,
  SUPPORT_DESCRIPTION_MIN,
  SupportError,
  submitSupport,
  type SupportTopic,
} from '../../services/support';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { Dropdown } from '../../components/Dropdown/Dropdown';
import { TextArea } from '../../components/TextArea/TextArea';
import { Button } from '../../components/Button/Button';
import { KeyboardForm } from '../../components/KeyboardForm/KeyboardForm';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import type { MessageKey } from '../../i18n';
import styles from './SupportScreen.module.scss';

const TOPICS: SupportTopic[] = ['help', 'suggestion', 'criticism'];

const TOPIC_KEYS: Record<SupportTopic, MessageKey> = {
  help: 'support.topics.help',
  suggestion: 'support.topics.suggestion',
  criticism: 'support.topics.criticism',
};

const NETWORK_ERROR_KEYS: Record<
  Exclude<SupportError['code'], 'INVALID'>,
  MessageKey
> = {
  NETWORK: 'error.NETWORK',
  RATE_LIMITED: 'error.RATE_LIMITED',
  UNAVAILABLE: 'support.errorUnavailable',
};

export function SupportScreen() {
  const { i18n, settings, miniApp, nav } = useApp();
  const { formatMessage } = i18n;

  const [topic, setTopic] = createSignal<SupportTopic | null>(null);
  const [description, setDescription] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);
  const [topicError, setTopicError] = createSignal<MessageKey | null>(null);
  const [descriptionError, setDescriptionError] = createSignal<MessageKey | null>(null);
  const [formError, setFormError] = createSignal<MessageKey | null>(null);
  const [sent, setSent] = createSignal(false);

  const options = createMemo(() =>
    TOPICS.map((value) => ({
      value,
      label: formatMessage(TOPIC_KEYS[value]),
    })),
  );

  const pickTopic = (value: SupportTopic) => {
    setTopic(value);
    setTopicError(null);
  };

  const writeDescription = (value: string) => {
    setDescription(value);
    if (value.trim().length >= SUPPORT_DESCRIPTION_MIN) setDescriptionError(null);
  };

  const send = async () => {
    if (submitting()) return;

    const chosen = topic();
    const missingText = description().trim().length < SUPPORT_DESCRIPTION_MIN;
    setTopicError(chosen == null ? 'support.errorTopic' : null);
    setDescriptionError(missingText ? 'support.errorDescription' : null);
    setFormError(null);
    if (chosen == null || missingText) return;

    setSubmitting(true);
    try {
      await submitSupport({
        topic: chosen,
        description: description(),
        clientId: settings.settings.profileId,
        initData: miniApp.initData(),
      });
      setSent(true);
    } catch (error) {
      const code = error instanceof SupportError ? error.code : 'NETWORK';
      if (code === 'INVALID') {
        setDescriptionError('support.errorDescription');
      } else {
        setFormError(NETWORK_ERROR_KEYS[code]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const topicErrorText = () => {
    const key = topicError();
    return key ? formatMessage(key) : undefined;
  };

  const descriptionErrorText = () => {
    const key = descriptionError();
    return key ? formatMessage(key) : undefined;
  };

  return (
    <Screen>
      <ScreenHeader title={formatMessage('support.title')} />
      <KeyboardForm class={styles.form}>
        <p class={styles.intro}>{formatMessage('support.intro')}</p>
        <Dropdown
          label={formatMessage('support.topic')}
          value={topic()}
          options={options()}
          placeholder={formatMessage('support.topicPlaceholder')}
          error={topicErrorText()}
          onChange={pickTopic}
          disabled={submitting()}
        />
        <TextArea
          label={formatMessage('support.description')}
          value={description()}
          onInput={writeDescription}
          placeholder={formatMessage('support.descriptionPlaceholder')}
          maxLength={SUPPORT_DESCRIPTION_MAX}
          count={formatMessage('support.count', {
            current: description().length,
            limit: SUPPORT_DESCRIPTION_MAX,
          })}
          error={descriptionErrorText()}
          disabled={submitting()}
        />
        <Show when={formError()}>
          {(key) => <p class={styles.error}>{formatMessage(key())}</p>}
        </Show>
        <Button onClick={() => void send()} disabled={submitting()}>
          {formatMessage('support.send')}
        </Button>
      </KeyboardForm>
      <ConfirmDialog
        open={sent()}
        message={formatMessage('support.thanks')}
        confirmLabel={formatMessage('common.ok')}
        onConfirm={() => nav.back()}
      />
    </Screen>
  );
}
