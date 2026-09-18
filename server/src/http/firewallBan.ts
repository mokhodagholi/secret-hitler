import { spawn } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';

const BAN_FILE = '/etc/secret-hitler/banned-ips';

/** Public clients only. A private peer is the proxy, not someone to lock out. */
export function isPublicAddress(ip: string): boolean {
  if (isIP(ip) === 0) return false;
  if (ip === '::1' || ip.startsWith('127.')) return false;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return false;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return false;
  return true;
}

/**
 * Direct connections are the real client. Behind nginx the peer is the
 * bridge, so the forwarded address is the one that opened the table.
 */
export function addressToBan(peer: string | undefined, forwarded: string): string {
  const normalized = (peer ?? '').replace(/^::ffff:/, '');
  if (isPublicAddress(normalized)) return normalized;
  return forwarded.replace(/^::ffff:/, '');
}

function iptables(command: 'iptables' | 'ip6tables', args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore' });
    child.on('error', () => resolve(127));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

function rule(action: '-C' | '-I' | '-D', chain: 'INPUT' | 'DOCKER-USER', ip: string): string[] {
  return [action, chain, '-s', ip, '-m', 'comment', '--comment', 'secret-hitler-spam', '-j', 'DROP'];
}

/** Drop this address at the host firewall and remember it across reboot. */
export async function firewallBan(ip: string): Promise<void> {
  if (!isPublicAddress(ip)) return;
  const command = isIP(ip) === 6 ? 'ip6tables' : 'iptables';
  if ((await iptables(command, rule('-C', 'INPUT', ip))) !== 0) {
    await iptables(command, rule('-I', 'INPUT', ip));
  }
  if ((await iptables(command, rule('-C', 'DOCKER-USER', ip))) !== 0) {
    await iptables(command, rule('-I', 'DOCKER-USER', ip));
  }
  try {
    const existing = await readFile(BAN_FILE, 'utf8').catch(() => '');
    if (!existing.split('\n').includes(ip)) await appendFile(BAN_FILE, `${ip}\n`);
  } catch {
    // The ban file is a host mount. Missing it still leaves the in-app ban.
  }
}

/**
 * Take the address off the firewall. The boot script re-reads the file, so
 * the line has to go too or a reboot would lock them out again.
 */
export async function firewallUnban(ip: string): Promise<void> {
  if (!isPublicAddress(ip)) return;
  const command = isIP(ip) === 6 ? 'ip6tables' : 'iptables';
  await iptables(command, rule('-D', 'INPUT', ip));
  await iptables(command, rule('-D', 'DOCKER-USER', ip));
  try {
    const existing = await readFile(BAN_FILE, 'utf8').catch(() => '');
    const kept = existing.split('\n').filter((line) => line !== '' && line !== ip);
    await writeFile(BAN_FILE, kept.length > 0 ? `${kept.join('\n')}\n` : '');
  } catch {
    // Same mount as the ban. The in-app block is already gone.
  }
}
