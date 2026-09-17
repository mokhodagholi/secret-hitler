# Working with a VPS over SSH

This is a learning note for **any** Linux VPS (Hetzner, DigitalOcean, OVH, a home box, …). The provider does not matter. What matters is the same three pieces every time:

1. A Linux machine with `sshd` listening (usually port 22).
2. A user on that machine (`root`, `ubuntu`, `debian`, …).
3. A way for **your laptop** to prove it is you.

This note follows the exact path we used: first login (password or VNC), then install a laptop key, then clone a private GitHub repo on the VPS with a **separate** GitHub key, then add a git remote on the laptop that **pushes to the VPS**. A `post-receive` hook on that bare repo checks out `master` and rebuilds Docker, so `git push origin master` from the laptop is the deploy.

---

## 1. What SSH actually does

`ssh` is a remote terminal. This command:

```bash
ssh 195.248.241.251
```

means:

- Open a TCP connection to that IP, port 22.
- Run the SSH handshake (crypto, host key, auth).
- If auth succeeds, give you a shell **on that machine**, as some user.

SSH never “logs into an IP”. It logs into a **user on that IP**. If you omit the user, OpenSSH uses your **local** username. On a Mac named for `mohamamd`, this:

```bash
ssh 195.248.241.251
```

is exactly:

```bash
ssh mohamamd@195.248.241.251
```

A fresh VPS almost never has a user called `mohamamd`. It has `root` (or `ubuntu`). So you can paste a key into `/root/.ssh/authorized_keys` and still get rejected, because your Mac is authenticating as `mohamamd`, not `root`.

Always be explicit until it works:

```bash
ssh root@YOUR_IP
# or
ssh ubuntu@YOUR_IP
```

On the VPS, `whoami` and `echo $HOME` tell you which account you are in. The key must go into **that** account’s `~/.ssh/authorized_keys`.

---

## 2. Two ways to prove who you are

The server advertises which methods it will accept. Typical line:

```text
Authentications that can continue: publickey,password
```

| Method | What you prove | Feels like |
|---|---|---|
| `password` | You know the account’s password | Prompt every connection |
| `publickey` | You hold the **private** key that matches a line in `authorized_keys` | No server password |

`Permission denied (publickey)` means: the server **only** accepts keys, and yours did not match (or was not offered).

`Permission denied (publickey,password)` means: keys failed, and then password would be tried — unless you used `BatchMode` (scripts) or cancelled the prompt.

Goal: make `publickey` succeed so the password is never needed.

---

## 3. How a key pair works

You generate two files on the **laptop**:

| File | Secret? | Role |
|---|---|---|
| `~/.ssh/id_ed25519` (or `id_rsa`) | **Yes. Never copy this to the VPS.** | Private key. Proves you are you. |
| `~/.ssh/id_ed25519.pub` (or `id_rsa.pub`) | No. Safe to paste anywhere. | Public key. The VPS stores this. |

Math in one sentence: anything signed with the private key can be checked with the public key. The server keeps the public half. Your laptop keeps the private half. Stealing `authorized_keys` does not let someone log in as you. Stealing `id_rsa` does.

See what you already have:

```bash
ls -l ~/.ssh
cat ~/.ssh/id_ed25519.pub    # prefer this if it exists
cat ~/.ssh/id_rsa.pub
```

Create one if you do not have a key (ed25519 is short and modern):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -C "your-laptop"
```

Empty passphrase is convenient. A passphrase encrypts the private file on disk; `ssh-agent` can remember it for the session.

### Why RSA keys are painful in VNC

An RSA public key is a very long single line. A VNC terminal often wraps or **truncates** the paste. The last part of the command disappears. That is how this happened:

```text
echo 'ssh-rsa AAAA…' >> ~/.ssh/
-bash: /root/.ssh/: Is a directory
```

`>> ~/.ssh/` means “append into the folder”, which bash refuses. The filename `authorized_keys` never made it. **The key was never saved.** That is why SSH still asked for a password.

ed25519 public keys are one short line. Prefer them for pasting. If you must paste a long RSA key, do not put the key and the filename on the same giant command — use `tee` (section 6).

---

## 4. What the VPS checks, in order

When you `ssh root@IP`:

1. TCP to port 22 works (firewall / security group must allow it).
2. Host key: first time, you see “authenticity of host can't be established”. That is the **server’s** identity, not yours. Type `yes` once. It is stored in `~/.ssh/known_hosts`.
3. Auth:
   - Client offers a public key.
   - `sshd` looks in that user’s authorized-keys file (usually `~/.ssh/authorized_keys`).
   - If a line matches, login succeeds.
   - If not, it asks for a password (if allowed).

`sshd` is strict about permissions. If they are too open, it **silently ignores** the file and falls through to password.

Required:

```text
~/.ssh                 directory, mode 700 (drwx------)
~/.ssh/authorized_keys file,      mode 600 (-rw-------)
home directory         not writable by others
```

Fix:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

One key = **one line**. If VNC wraps it onto two lines, `sshd` will not match it.

---

## 5. The workflow that always works

You cannot install a key over SSH if you cannot log in yet. So the first session is always a bootstrap:

1. Open the machine with **whatever the panel gave you**: VNC, serial console, “browser terminal”, or `ssh` + password from the welcome email.
2. Install your **public** key into that user’s `authorized_keys`.
3. From the laptop, log in with the key.
4. Only then disable passwords (optional, section 9).

Never start by turning off password auth. If the key is wrong, you lock yourself out.

`ssh-copy-id` is the same workflow when password SSH already works:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@YOUR_IP
```

It logs in **once** with the password, appends the public key, sets permissions. After that, keys work. Use this when you can already `ssh root@IP` with a password. Use VNC/`tee` when password SSH is off or the panel only gives a console.

---

## 6. Installing the key from a console (VNC / panel)

On the **VPS**, as the user you will SSH as (`root` in our case):

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Then start a writer that waits for stdin:

```bash
tee -a ~/.ssh/authorized_keys
```

On the **laptop**, print the public key:

```bash
cat ~/.ssh/id_ed25519.pub
# or
cat ~/.ssh/id_rsa.pub
```

Paste **only that one line** into the VPS `tee`. Press Enter, then Ctrl+D (`tee` finishes).

Check it is one line and starts with `ssh-ed25519` or `ssh-rsa`:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
wc -l ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys
```

`wc -l` should be the number of keys, not “half a key per line”.

### Commands that look right but fail in VNC

Heredocs:

```bash
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-rsa AAAA…
EOF
```

Many panel terminals do not handle `<<` well. Skip them.

One giant `echo 'very long key' >> ~/.ssh/authorized_keys` also fails when the paste is cut before `authorized_keys`. `tee` separates “open the file” from “paste the key”.

---

## 7. Teaching your laptop which user and which key

`~/.ssh/config` on the **laptop** (not on the VPS):

```sshconfig
Host my-vps
    HostName 195.248.241.251
    User root
    IdentityFile ~/.ssh/id_rsa
    IdentitiesOnly yes
    AddKeysToAgent yes
```

Then:

```bash
ssh my-vps
```

is `ssh -i ~/.ssh/id_rsa root@195.248.241.251`.

| Directive | Why |
|---|---|
| `HostName` | Real IP or DNS. `Host` can be a short nickname. |
| `User` | Stops the Mac from using `mohamamd`. |
| `IdentityFile` | Which private key to offer. |
| `IdentitiesOnly yes` | Do not spray every key in the agent. Some servers reject you after too many wrong keys. |

Load the key into the agent (so it is offered):

```bash
ssh-add ~/.ssh/id_rsa
ssh-add -l
```

On some Macs, `ssh-add --apple-use-keychain ~/.ssh/id_rsa` also stores a passphrase in Keychain. Homebrew OpenSSH may not support that flag; Apple’s `/usr/bin/ssh-add` does.

---

## 8. Debugging when it still asks for a password

Verbose client log (laptop):

```bash
ssh -vvv -o BatchMode=yes root@YOUR_IP
```

`BatchMode=yes` means “never prompt; fail if the key does not work”. Useful to see the real error instead of a password prompt.

Read it like a story:

1. `Offering public key: … RSA SHA256:…` — the laptop sent a key. Good.
2. Immediately `Authentications that can continue: publickey,password` — the **server refused that key**.
3. `Permission denied (publickey,password)` with no offer — the laptop did not even try a key (`ssh-add -l` empty, wrong `IdentityFile`, or `IdentitiesOnly` pointing at a missing file).

Refusal after “Offering public key” is almost always:

- Key is in the wrong user’s `authorized_keys` (you are `root` on the box, Mac connects as `mohamamd`).
- File missing / truncated / wrapped onto two lines.
- Permissions too open (`sshd` ignores the file).
- `PubkeyAuthentication no` in `sshd_config`.
- For `root`: `PermitRootLogin no` (password and keys both blocked) or only password allowed in a bad custom config.

On the VPS, confirm:

```bash
whoami
ls -ld ~ ~/.ssh
ls -l ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys
```

Match the public line to the laptop:

```bash
ssh-keygen -lf ~/.ssh/id_rsa.pub
```

The fingerprint should be the same `SHA256:…` you saw in `ssh -vvv` as “Offering public key”.

sshd settings (VPS):

```bash
sudo grep -E '^(PubkeyAuthentication|AuthorizedKeysFile|PermitRootLogin|PasswordAuthentication)' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/* 2>/dev/null
```

Sane values for key login as root:

```text
PubkeyAuthentication yes
PermitRootLogin prohibit-password
# or: PermitRootLogin yes   (allows root password too — weaker)
```

`prohibit-password` = root may use **keys**, not the root password. After keys work, this is a good target.

Reload after edits:

```bash
sudo systemctl reload sshd || sudo systemctl reload ssh
```

Do not `reload` until a **second** window already logs in with the key.

---

## 9. After keys work (hardening)

Only when `ssh root@YOUR_IP` (or `ssh my-vps`) opens a shell **with no password**:

```text
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
```

Then reload `sshd`. Keep the VNC / panel console bookmarked until you are sure. A typo here is a lockout.

Optional later:

- New user with `sudo`, disable root SSH entirely (`PermitRootLogin no`).
- Fail2ban / firewall allow 22 only from your IP.
- Change the SSH port only if you know why; it is not real security, just less noise.

---

## 10. Mental model so far (SSH only)

```text
Laptop                              VPS
------                              ---
id_rsa          (private, secret)   /root/.ssh/authorized_keys  (public lines)
id_rsa.pub      (public, paste this) → must contain the .pub line, one line
~/.ssh/config   User root           whoami must be that user
ssh-agent       holds unlocked key  sshd reads authorized_keys only if perms are strict
```

The password is a backup bootstrap. The key is the real login. Console/VNC exists so you can always fix `authorized_keys` when SSH is unhappy.

Git is a **second** SSH relationship: the VPS is now the *client*, GitHub is the *server*. That needs its own key. Do not reuse the laptop login key.

---

## 11. Clone a private GitHub repo onto the VPS

You can SSH into the VPS. That does **not** let the VPS clone a private repo. GitHub has never seen this machine.

There are two SSH identities in play. Keep them separate.

| Key | Lives on | Proves | Added where |
|---|---|---|---|
| Laptop `id_rsa` / `id_ed25519` | Mac | You may log into the VPS | VPS `authorized_keys` |
| VPS `github_secret_hitler` | VPS | This box may clone **this** repo | GitHub deploy key |

Never copy your Mac’s GitHub key onto the server. If the VPS is stolen, that key would open every repo your GitHub user can see. A **deploy key** opens only one repository.

### 11.1 Make a GitHub-only key on the VPS

```bash
apt update && apt install -y git
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/github_secret_hitler -N "" -C "vps-secret-hitler"
```

`-N ""` = no passphrase. A server cannot type a passphrase at 3am when `git pull` runs.

Point SSH on the **VPS** at that key. GitHub’s port 22 is often blocked; port 443 (`ssh.github.com`) usually works. Same trick as on the Mac:

```bash
cat >> ~/.ssh/config << 'EOF'
Host github.com
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile ~/.ssh/github_secret_hitler
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
```

Print the public half:

```bash
cat ~/.ssh/github_secret_hitler.pub
```

### 11.2 Register it on GitHub (not on the VPS)

1. Repo → **Settings** → **Deploy keys** → **Add deploy key**.
2. Title: something like `vps-195`.
3. Paste the `ssh-ed25519 …` line.
4. Check **Allow write access** only if this VPS must `git push`. Leave it off for clone/pull only.
5. Save.

Repo URL we used: `git@github.com:mokhodagholi/secret-hitler.git`.

### 11.3 Test, then clone

```bash
ssh -T git@github.com
```

Success looks like:

```text
Hi mokhodagholi/secret-hitler! You've successfully authenticated, but GitHub does not provide shell access.
```

That last clause is normal. GitHub will not give you a bash prompt. `ssh -T` only checks the key.

The first time you also see:

```text
The authenticity of host '[ssh.github.com]:443 (...)' can't be established.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Same idea as section 4: this is **GitHub’s** host key, stored in the VPS `~/.ssh/known_hosts`. Type `yes` once.

Then clone:

```bash
cd ~
git clone git@github.com:mokhodagholi/secret-hitler.git
```

`git clone URL` creates a **new directory** named after the repo (`secret-hitler/`) **inside the current directory**. It does not turn the current directory into a repo.

If `ssh -T` hangs, drop `HostName` / `Port 443` and try GitHub’s port 22. If it says `Permission denied (publickey)`, GitHub does not have that `.pub` yet, or `IdentityFile` is wrong.

Optional, only if you will **commit on the VPS**:

```bash
git config --global user.name mokhodagholi
git config --global user.email mokhodagholi@gmail.com
```

Clone and pull do not need that.

---

## 12. Nested clone: `fatal: not a git repository`

This happened:

```text
root@srv…:~/secret-hitler# git clone git@github.com:mokhodagholi/secret-hitler.git
…
root@srv…:~/secret-hitler# git remote -v
fatal: not a git repository (or any of the parent directories): .git
```

The clone **did** work. `git remote` was run in the wrong folder.

You were already in `~/secret-hitler` (an ordinary empty directory). `git clone` then created:

```text
/root/secret-hitler/                 ← still not a git repo (no .git)
/root/secret-hitler/secret-hitler/   ← the real clone
```

Git commands (`remote`, `status`, `pull`) only work inside a directory that contains `.git`.

Check:

```bash
pwd
ls
ls secret-hitler/.git
```

### Flatten it

If the outer folder has nothing you care about except the inner clone:

```bash
mv /root/secret-hitler /root/secret-hitler-nested
mv /root/secret-hitler-nested/secret-hitler /root/secret-hitler
rmdir /root/secret-hitler-nested
cd /root/secret-hitler
pwd
git remote -v
```

You want:

```text
/root/secret-hitler          ← working tree (files you edit / run)
/root/secret-hitler/.git     ← the git database for that tree
origin → git@github.com:mokhodagholi/secret-hitler.git
```

If a shell is still sitting in the old nested path, `cd /root/secret-hitler` again.

Safer next time: clone from `$HOME`, not from a folder that already has the repo name:

```bash
cd ~
git clone git@github.com:mokhodagholi/secret-hitler.git
# lands at ~/secret-hitler
```

---

## 13. Laptop remotes: GitHub vs the VPS

A **git remote** is only a saved URL with a name. It is not magic. `git remote -v` on the **laptop** now looks like:

```text
github        git@github.com:mokhodagholi/secret-hitler.git
origin        root@195.248.241.251:secret-hitler.git    ← live VPS (auto-deploy)
```

Earlier the old box was `origin` (`194.147.142.231`) and the new one was `origin-plus`. After the cutover, `origin` is the new box. Names are labels you choose.

| Remote | Who is the git server? | Transport |
|---|---|---|
| `github` | GitHub | `git@github.com:…` (SSH as user `git`) |
| `origin` | Live VPS | `root@195.248.241.251:secret-hitler.git` |

`root@IP:secret-hitler.git` is SSH to that VPS as `root`, path `~/secret-hitler.git` (for root: `/root/secret-hitler.git`).

### 13.1 Working tree vs bare repo

You **cannot** normally `git push` into a folder that has a checked-out branch. Git refuses (you would overwrite files another process might be using).

A **bare** repo (`secret-hitler.git`) is only the git database. No checkout. It exists so other machines can `push` and `fetch`. Same idea as GitHub: GitHub does not keep a working tree of your project for you to SSH into; it stores refs and objects.

The live VPS has **two** git directories:

```text
/root/secret-hitler.git   bare repo      ← laptop git push origin
/root/secret-hitler       work tree      ← hook checks out here; Docker Compose runs here
```

The work tree has **no** `.git`. It is a checkout of the bare repo (`GIT_DIR` + `GIT_WORK_TREE`). Do not `git pull` from GitHub inside `/root/secret-hitler` — there is nothing to pull with.

Create the bare one (once), if you still have a GitHub clone on disk:

```bash
git clone --bare /root/secret-hitler /root/secret-hitler.git
```

A fresh box can instead run `scripts/setup-vps-git.sh` on the VPS (creates the bare repo, the empty work tree, and the hook). Then copy `.env` and `ssl/*.pem` into the work tree; they are gitignored.

### 13.2 Add the remote on the laptop

In the project on the Mac:

```bash
git remote add origin root@YOUR_IP:secret-hitler.git
# or, if origin already exists: git remote set-url origin root@YOUR_IP:secret-hitler.git
git remote -v
git fetch origin
```

Then:

```bash
git push origin master
```

That push is the deploy (section 14). Laptop `~/.ssh/config` must already allow `ssh root@YOUR_IP` without a password (sections 7–8). Git uses that same SSH.

### 13.3 Which remote do I use?

- Ship a release to GitHub: `git push github master`.
- Ship the running app: `git push origin master` (checks out + rebuilds Docker on the VPS).

`git pull` without a name uses whatever `branch.*.remote` is (often `origin`). Pulling `origin` fetches from the VPS, not GitHub. Be explicit until muscle memory matches the names.

---

## 14. Auto-deploy on `git push origin master`

Git’s `post-receive` hook runs **on the VPS** after a push is accepted. Ours lives at `/root/secret-hitler.git/hooks/post-receive` (executable). The laptop does not run Docker.

On `refs/heads/master` the hook:

1. Copies host-only files listed in `/root/secret-hitler/.deploy-keep-local` aside (so `checkout -f` cannot wipe them).
2. `git checkout -f master` into `/root/secret-hitler`.
3. Restores those files.
4. Runs `./scripts/deploy.sh` with the previous revision.

`scripts/deploy.sh` bakes `APP_VERSION` (short SHA) into the SPA and rebuilds **only** images whose source changed (`nginx` for client/shared, `server` for server/bale-bot). Unchanged images are left alone. `.env` and `ssl/*.pem` stay on disk because they are untracked.

This box’s keep list:

```text
docker-compose.yml
nginx/nginx.conf
```

Those two carry `plus.mrfantastic.ir` / `mrfantastic.ir` TLS. Without the list, the next push would replace them with the repo copies.

Install the hook:

- **Empty box:** copy `scripts/setup-vps-git.sh` onto the VPS and run it. It writes the hook and prints the laptop `git remote` line.
- **Bare repo already exists:** do not re-run `git init --bare`. Write the same hook file (the script in `setup-vps-git.sh` is the source of truth), `chmod +x` it, put `.deploy-keep-local` in the work tree, and **remove** `/root/secret-hitler/.git` if that folder is still a GitHub clone. Otherwise the hook’s `GIT_DIR` checkout and the leftover clone fight each other.

`git push origin master` prints the Docker build in the remote lines. Success ends with containers up. If **the image build fails**, git on the VPS is still at the new commit (the hook already checked out). The next push only diffs **that** push against the last one, so a failed `nginx` rebuild will not retry unless client files change again. Rebuild the missed image by hand:

```bash
ssh root@195.248.241.251
export GIT_DIR=/root/secret-hitler.git GIT_WORK_TREE=/root/secret-hitler
cd /root/secret-hitler
export APP_VERSION="$(git rev-parse --short HEAD)"
docker compose build nginx   # or server
docker compose up -d
```

Other branches are ignored. Push `master`.

---

## 15. Checklist for the next VPS

**Login**

1. Note the IP and the **panel username** (`root` / `ubuntu`), not your Mac name.
2. On the laptop: `cat ~/.ssh/id_ed25519.pub` (create a key if needed).
3. Open the machine via panel console or `ssh user@IP` + password.
4. `mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys`
5. `tee -a ~/.ssh/authorized_keys` → paste the **one** laptop `.pub` line → Enter → Ctrl+D.
6. `cat ~/.ssh/authorized_keys` — confirm one intact line.
7. Laptop `~/.ssh/config`: `HostName`, `User`, `IdentityFile`.
8. `ssh-add` the private key; `ssh -vvv user@IP` until you see a shell, not a password.
9. Only then turn off password authentication.

**Private GitHub clone on the VPS**

10. On the VPS, `ssh-keygen` a **new** key (not the laptop key). `IdentityFile` it for `github.com`.
11. Add that `.pub` as a **deploy key** on the GitHub repo.
12. `ssh -T git@github.com` — “does not provide shell access” means success.
13. `cd ~` then `git clone git@github.com:owner/repo.git` (do not clone from inside a folder already named `repo`).
14. If you nested it by accident, `mv` the inner clone up one level so `~/repo/.git` exists.

**Laptop remote that pushes to this VPS**

15. On the VPS: `git clone --bare ~/repo ~/repo.git` (skip if `setup-vps-git.sh` already created it).
16. Install the `post-receive` hook (`scripts/setup-vps-git.sh`, or copy that hook onto an existing bare repo). `chmod +x`.
17. If `/root/secret-hitler` is still a GitHub clone, `rm -rf /root/secret-hitler/.git` so the work tree is only a checkout of the bare repo.
18. Copy `.env` and `ssl/*.pem` into the work tree. List host-only tracked files (nginx server_name, extra compose mounts) in `.deploy-keep-local`, one path per line.
19. On the laptop: `git remote add origin root@YOUR_IP:repo.git` (or `git remote set-url origin …`).
20. `git fetch origin` then `git push origin master` — that is the deploy.

That is the whole method. Provider, OS, and IP change. The files, the two users (laptop vs VPS), the two keys (login vs GitHub), and the hook that turns a push into Docker do not.
