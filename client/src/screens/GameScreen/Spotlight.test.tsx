import { afterEach, describe, expect, it } from '@rstest/core';
import { render, waitFor } from '@solidjs/testing-library';
import { Spotlight } from './Spotlight';
import styles from './Spotlight.module.scss';

const originalBox = Element.prototype.getBoundingClientRect;

afterEach(() => {
  Element.prototype.getBoundingClientRect = originalBox;
});

function stubVisibleBox() {
  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 8,
      y: 8,
      top: 8,
      left: 8,
      bottom: 48,
      right: 88,
      width: 80,
      height: 40,
      toJSON() {
        return {};
      },
    };
  };
}

function mountSpotlight(props: {
  showContinue?: boolean;
  showSkip?: boolean;
}) {
  stubVisibleBox();
  return render(() => (
    <div>
      <div data-tutorial-target="boards" />
      <Spotlight
        target="boards"
        onContinue={() => undefined}
        onSkip={() => undefined}
        formatMessage={(key) => key}
        showContinue={props.showContinue}
        showSkip={props.showSkip}
      />
    </div>
  ));
}

describe('Spotlight — gold ring', () => {
  it('Should hold the ring still while Continue is hidden', async () => {
    const { container } = mountSpotlight({ showContinue: false });
    await waitFor(() => {
      const hole = container.querySelector(`.${styles.hole}`);
      expect(hole).toBeTruthy();
      expect(hole?.classList.contains(styles.holeStatic)).toBe(true);
    });
  });

  it('Should hold the ring still while Skip is hidden', async () => {
    const { container } = mountSpotlight({ showSkip: false });
    await waitFor(() => {
      const hole = container.querySelector(`.${styles.hole}`);
      expect(hole).toBeTruthy();
      expect(hole?.classList.contains(styles.holeStatic)).toBe(true);
    });
  });

  it('Should pulse the ring once Continue and Skip are shown', async () => {
    const { container } = mountSpotlight({
      showContinue: true,
      showSkip: true,
    });
    await waitFor(() => {
      const hole = container.querySelector(`.${styles.hole}`);
      expect(hole).toBeTruthy();
      expect(hole?.classList.contains(styles.holeStatic)).toBe(false);
    });
  });
});
