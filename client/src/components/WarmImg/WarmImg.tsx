import { splitProps, type JSX } from 'solid-js';
import { useApp } from '../../services/AppContext';

/** `<img>` that prefers a blob already sitting in PrefetchService. */
export function WarmImg(props: JSX.ImgHTMLAttributes<HTMLImageElement>) {
  const [local, rest] = splitProps(props, ['src']);
  const { prefetch } = useApp();
  const src = () =>
    typeof local.src === 'string' ? prefetch.src(local.src) : local.src;
  return <img {...rest} src={src()} />;
}
