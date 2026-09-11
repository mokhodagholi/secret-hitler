export type NativeEnterKeyHint = 'done' | 'go' | 'send';

/**
 * Browser-chrome kills every real field must ship.
 * See `client/docs/native-feel.md`.
 */
export function nativeFieldAttrs(options?: {
  password?: boolean;
  enterKeyHint?: NativeEnterKeyHint;
}): {
  autocomplete: 'off' | 'new-password';
  autocorrect: 'off';
  autocapitalize: 'none';
  spellcheck: false;
  enterkeyhint: NativeEnterKeyHint;
} {
  const password = options?.password === true;
  return {
    autocomplete: password ? 'new-password' : 'off',
    autocorrect: 'off',
    autocapitalize: 'none',
    spellcheck: false,
    enterkeyhint: options?.enterKeyHint ?? (password ? 'go' : 'done'),
  };
}
