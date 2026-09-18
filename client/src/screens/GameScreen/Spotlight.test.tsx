import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, render, waitFor } from '@solidjs/testing-library';
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
  showPrevious?: boolean;
}) {
  stubVisibleBox();
  return render(() => (
    <div>
      <div data-tutorial-target="boards" />
      <Spotlight
        target="boards"
        onContinue={() => undefined}
        onSkip={() => undefined}
        onPrevious={() => undefined}
        formatMessage={(key) => key}
        showContinue={props.showContinue}
        showSkip={props.showSkip}
        showPrevious={props.showPrevious}
      />
    </div>
  ));
}

describe('Spotlight — gold ring', () => {
  it('Should put Next on the left and Skip on the right', () => {
    const { container } = mountSpotlight({
      showContinue: true,
      showSkip: true,
      showPrevious: true,
    });
    const chrome = container.querySelector(`.${styles.chrome}`);
    const labels = [...(chrome?.querySelectorAll('button') ?? [])].map(
      (button) => button.textContent,
    );
    expect(labels).toEqual(['onboard.continue', 'onboard.previous', 'onboard.skip']);
  });

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

  it('Should punch one hole per history role chip', async () => {
    stubVisibleBox();
    const { container } = render(() => (
      <div>
        <span data-tutorial-target="historyRole" />
        <span data-tutorial-target="historyRole" />
        <Spotlight
          target="historyRole"
          onContinue={() => undefined}
          onSkip={() => undefined}
          formatMessage={(key) => key}
          showContinue
          showSkip
        />
      </div>
    ));
    await waitFor(() => {
      expect(container.querySelectorAll(`.${styles.hole}`).length).toBe(2);
    });
  });

  it('Should ignore taps while the guide is speaking', async () => {
    stubVisibleBox();
    const onContinue = rs.fn();
    const onSkip = rs.fn();
    const onPrevious = rs.fn();
    let targetClicks = 0;
    const { container } = render(() => (
      <div>
        <button
          type="button"
          data-tutorial-target="homeSettings"
          onClick={() => {
            targetClicks += 1;
          }}
        >
          Settings
        </button>
        <Spotlight
          target="homeSettings"
          passHole
          guideSpeaking
          showContinue
          showSkip
          showPrevious
          onContinue={onContinue}
          onSkip={onSkip}
          onPrevious={onPrevious}
          formatMessage={(key) => key}
        />
      </div>
    ));

    await waitFor(() => {
      expect(container.querySelector(`.${styles.hole}`)).toBeTruthy();
    });
    const hole = container.querySelector(`.${styles.hole}`);
    expect(hole?.classList.contains(styles.held)).toBe(true);
    expect(hole?.classList.contains(styles.holePass)).toBe(false);
    expect(container.querySelector(`.${styles.chrome}`)?.classList.contains(styles.chromeHeld)).toBe(
      true,
    );

    fireEvent.click(hole!);
    fireEvent.click(container.querySelector(`.${styles.continue}`)!);
    fireEvent.click(container.querySelector(`.${styles.skip}`)!);
    fireEvent.click(container.querySelector(`.${styles.previous}`)!);
    expect(onContinue).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(targetClicks).toBe(0);
  });
});
