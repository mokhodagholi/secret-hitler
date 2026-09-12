import { For, Show } from 'solid-js';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import styles from './RulesScreen.module.scss';

export type KitArtKind = 'portrait' | 'landscape' | 'board' | 'office';

export interface KitBadge {
  label: string;
  tone: 'president' | 'chancellor';
}

export interface KitPieceProps {
  title: string;
  body: string;
  images?: string[];
  badges?: KitBadge[];
  kind: KitArtKind;
}

function artClass(kind: KitArtKind): string {
  if (kind === 'landscape') return styles.kitLandscape;
  if (kind === 'board') return styles.kitBoard;
  return styles.kitPortrait;
}

/** One real table piece: the art from the game, then what it is. */
export function KitPiece(props: KitPieceProps) {
  return (
    <article class={styles.kitPiece}>
      <Show when={props.badges}>
        {(badges) => (
          <div class={styles.kitArts}>
            <For each={badges()}>
              {(badge) => (
                <span
                  classList={{
                    [styles.kitOffice]: true,
                    [styles.kitOfficePresident]: badge.tone === 'president',
                    [styles.kitOfficeChancellor]: badge.tone === 'chancellor',
                  }}
                >
                  {badge.label}
                </span>
              )}
            </For>
          </div>
        )}
      </Show>
      <Show when={props.images}>
        {(images) => (
          <div
            classList={{
              [styles.kitArts]: true,
              [styles.kitArtsStack]: props.kind === 'board',
            }}
          >
            <For each={images()}>
              {(image) => (
                <WarmImg class={artClass(props.kind)} src={image} alt="" />
              )}
            </For>
          </div>
        )}
      </Show>
      <h3 class={styles.kitTitle}>{props.title}</h3>
      <p class={styles.kitBody}>{props.body}</p>
    </article>
  );
}
