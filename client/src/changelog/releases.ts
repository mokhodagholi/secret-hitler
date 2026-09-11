import releasesJson from './releases.json';
import { parseChangelog, type ChangelogRelease } from './changelog';

/** Bundled notes shipped with this build — newest first. */
export const CHANGELOG_RELEASES: ChangelogRelease[] = parseChangelog(releasesJson);
