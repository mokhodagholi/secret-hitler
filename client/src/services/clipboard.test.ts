import { afterEach, describe, expect, it } from '@rstest/core';
import { copyText } from './clipboard';

afterEach(() => {
  Reflect.deleteProperty(document, 'execCommand');
});

function stubExecCommand(impl: (command: string) => boolean): { calls: string[] } {
  const calls: string[] = [];
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    writable: true,
    value: (command: string) => {
      calls.push(command);
      return impl(command);
    },
  });
  return { calls };
}

describe('copyText', () => {
  it('Should use the Clipboard API when it succeeds', async () => {
    const written: string[] = [];
    Object.assign(navigator, {
      clipboard: { writeText: async (text: string) => written.push(text) },
    });
    const exec = stubExecCommand(() => true);

    await expect(copyText('https://ble.ir/secret_hitler_bot?startapp=ABC123')).resolves.toBe(true);
    expect(written).toEqual(['https://ble.ir/secret_hitler_bot?startapp=ABC123']);
    expect(exec.calls).toEqual([]);
  });

  it('Should fall back to execCommand when the Clipboard API is blocked', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: async () => {
          throw new DOMException('Clipboard API has been blocked', 'NotAllowedError');
        },
      },
    });
    stubExecCommand((command) => {
      expect(command).toBe('copy');
      expect(document.activeElement).toBeInstanceOf(HTMLTextAreaElement);
      expect((document.activeElement as HTMLTextAreaElement).value).toBe('invite');
      return true;
    });

    await expect(copyText('invite')).resolves.toBe(true);
  });

  it('Should return false when neither clipboard path works', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: async () => {
          throw new Error('blocked');
        },
      },
    });
    stubExecCommand(() => false);

    await expect(copyText('invite')).resolves.toBe(false);
  });
});
