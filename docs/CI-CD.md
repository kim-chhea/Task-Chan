# CI and production deploy

This page says what the GitHub Actions workflows do, and how to set them up.
Read it from the top. The words are plain on purpose.

There are two workflows.

- `.github/workflows/ci.yml` runs the tests.
- `.github/workflows/deploy-production.yml` copies a new release to a server.

No passwords or private keys are stored in the git repo.
You add those in GitHub, in the browser.

## What CI does

CI runs on every pull request.
It also runs when someone pushes to `main`.

Two jobs run at the same time.
If you push again quickly, the older run of the same branch is cancelled.
A deploy is never cancelled this way. Deploys wait their turn.

### Backend job

1. The runner checks out the code.
2. It installs PHP 8.4 and Composer.
3. It starts MySQL 8.
   The database name is `work_tracker_test`.
   That is the name in `backend/phpunit.xml`.
   The user is `root` and the password is empty.
   The port is `3306`.
   Your laptop may use port `3307`. CI does not.
4. It copies `backend/.env.example` to `backend/.env` and runs `composer install`.
5. It runs `php artisan test`.

PHP on the runner allows 12 MB uploads.
That matches `backend/php.ini`.
CI does not start PHP with `php -c php.ini`.
That flag would ignore the normal PHP config and drop extensions such as `pdo_mysql`.

### Frontend job

1. The runner installs the current Node.js LTS release.
2. It runs `npm ci` in `frontend/`.
3. It runs `npm test`.
4. It runs `npm run build`.

The CI build does not set `VITE_API_URL`.
The production build does. That happens in the deploy workflow.

### Workflow lint job

This job runs `actionlint` on the workflow files and `shellcheck` on the scripts in `.github/scripts/`.
If a script has a quoting bug, this job fails.

## What the deploy does

The deploy workflow starts only after a CI run on `main` finishes with success.
A pull request does not deploy.

Then:

1. A small job checks the two deploy secrets.
   If either one is missing or blank, this job writes a notice and the deploy job is skipped.
   The workflow stays green.
   Nothing is sent to a server.
2. If both secrets are set, the deploy job starts.
   It uses the GitHub Environment named `production`.
   If you add a required reviewer, GitHub waits for that person before the job continues.
3. The job checks the secrets for real.
   A bad private key or a bad known_hosts file fails the job.
   The log names the secret and shows what a correct value looks like.
4. If this commit is no longer the latest commit on `main`, the job stops.
   A newer commit will deploy instead.
   The server is not changed.
5. It builds the frontend and installs PHP dependencies.
6. It uploads a new folder to the server over SSH.
7. On the server it links the shared `.env` and `storage`, runs migrations, and caches config.
8. It points the live symlink at the new folder and requests `/up`.
9. If `/up` fails, it points the symlink back at the previous folder.

Two deploys never run at the same time.
The second one waits until the first one is done.

The SSH config keeps strict host-key checking on.
The server's host key comes from the `SSH_KNOWN_HOSTS` secret.
The workflow will not connect if that key does not match.

### Folders on the server

Pick one folder, for example `/var/www/taskchan`.
That value is the `DEPLOY_PATH` variable.

```
/var/www/taskchan/
  current -> releases/20261022T120000Z-abc123/
  releases/
    20261022T120000Z-abc123/
      backend/
      frontend/dist/
  shared/
    .env
    storage/
```

`current` is the live release.
`shared/.env` is the production env file.
It is not in git.
Each new deploy links that same file into the new release.
Uploaded files live in `shared/storage`, so they survive the next deploy.

The five newest releases are kept.
Older ones are deleted after a healthy deploy.
The previous release is kept so a bad deploy can roll back.

## GitHub secrets

Create these as **repository** secrets.

GitHub path: the repo, then **Settings**, then **Secrets and variables**, then **Actions**, then **Secrets**, then **New repository secret**.

Do not put them only on the `production` environment.
The skip check runs before that environment starts.
It can see repository secrets.
It cannot see environment secrets.
If you put the key only on the environment, the deploy stays skipped.

### `SSH_PRIVATE_KEY`

This is the private key GitHub uses to log in to the server.

On your own computer:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/taskchan_deploy -N ""
```

`-N ""` means the key has no passphrase.
The deploy cannot type a passphrase.

That command writes two files:

- `~/.ssh/taskchan_deploy` is the private key. This is the secret.
- `~/.ssh/taskchan_deploy.pub` is the public key. Put this on the server. Do not put it in the GitHub secret.

Install the public key for the deploy user (the example user is `deploy` and the example host is your real IP):

```bash
ssh-copy-id -i ~/.ssh/taskchan_deploy.pub deploy@YOUR_REAL_IP
```

Use the real user and the real IP.
Do not type `YOUR_REAL_IP` as the text.

A correct secret looks like this.
The middle lines are more base64.
They are not shown here.

```
-----BEGIN OPENSSH PRIVATE KEY-----
-----END OPENSSH PRIVATE KEY-----
```

The last line must be `-----END OPENSSH PRIVATE KEY-----` and the value must end with a newline.

Paste the private file into the secret.
On macOS or Linux:

```bash
pbcopy < ~/.ssh/taskchan_deploy
```

On a machine without `pbcopy`, open the file and copy all of it, including the begin and end lines.

### `SSH_KNOWN_HOSTS`

This is the server's host key.
SSH checks it so GitHub talks only to your server.

On your computer, after you can reach the server:

```bash
ssh-keyscan -t ed25519 <real server IP>
```

Replace `<real server IP>` with the server's real IP address.
Do not type the characters `<real server IP>`.
Do not leave the angle brackets in the command.

If SSH is not on port 22, add the port:

```bash
ssh-keyscan -t ed25519 -p 22 203.0.113.10
```

`203.0.113.10` is a documentation address.
It is not your server.
Use your real IP in the command you actually run.

A correct secret is one line, or a few lines, in this form:

`<host> <keytype> <base64>`

Example of the shape (do not paste this line; the checker rejects it):

```
203.0.113.10 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILaiAE1SWMJ16zJOVxUn2ZX22PNeZWG72FNEAQPM6+WJ
```

Your real line starts with your real IP or hostname.
The middle word is `ssh-ed25519` when you used `-t ed25519`.
The last word is a long base64 string.
The value must end with a newline.

`ssh-keyscan` may also print a comment line that starts with `#`.
You can keep that comment.
You still need one real key line.

The host on that line must be the same value as the `SSH_HOST` variable.
If `SSH_PORT` is not 22, the host field must look like `[203.0.113.10]:2222` with your real IP and port.

## GitHub variables

Create these as **repository** variables.
Same Settings page, then the **Variables** tab, then **New repository variable**.

You can also set them on the `production` environment.
An environment value wins over the repository value.
Secrets still belong on the repository. See above.

### `SSH_HOST`

The server's IP address or hostname.
Example shape: `198.51.100.20`.
That address is documentation only.
Use the real one.
Do not include the port. The port is `SSH_PORT`.

### `SSH_USER`

The Linux user GitHub logs in as.
Example: `deploy`.
A normal user is safer than `root`.

### `SSH_PORT`

The SSH port.
Leave it unset to use `22`.

### `DEPLOY_PATH`

The absolute folder on the server.
Example: `/var/www/taskchan`.
No trailing slash.

### `VITE_API_URL`

The API address baked into the frontend at build time.
Leave it empty when the site and the API share one host.
When the API is on another host, set it to that origin, such as `https://api.example.com`.
Use your real host, not `example.com`.

### `CSP_CONNECT_SRC`

Extra origins the browser may call.
Leave it empty when the site and the API share one host.
When `VITE_API_URL` is set, set this to the same origin.
The frontend build fails if they do not match.
Set the same value in the server `.env`.
The deploy runs `php artisan csp:nginx` and writes `backend/deploy/nginx/csp.conf` from that value.

### `HEALTHCHECK_URL`

The URL the server requests after the symlink moves.
It must end in `/up`.
Leave it unset to use `http://127.0.0.1/up`.
That works when nginx on the same machine answers `/up`.
A public API host looks like `https://api.example.com/up`.

Laravel already serves `/up`.
A `200` means the new release is up.
Anything else rolls back.

### `WEB_USER`

The PHP user that must write `storage`.
Leave it unset to use `www-data`.

### `PHP_BIN`

The PHP command on the server.
Leave it unset to use `php`.
The server needs PHP 8.4.

### `PHP_FPM_SERVICE`

Optional systemd unit to reload, such as `php8.4-fpm`.
If you leave it empty, the deploy tries `php8.4-fpm`, then `php8.3-fpm`, then `php-fpm`.
A failed reload does not fail the deploy.
If old code stays on screen, allow the deploy user to reload PHP without a password:

```bash
sudo visudo -f /etc/sudoers.d/taskchan-deploy
```

```
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl reload php8.4-fpm, /usr/bin/systemctl reload nginx
```

Use your real user and unit names.

### `PHP_INI_DIR`

Optional directory for an extra PHP ini file.
Example: `/etc/php/8.4/fpm/conf.d`.

If you set it, the deploy copies `backend/deploy/php/production.ini` to `99-task-chan.ini` in that directory.
That file sets `upload_max_filesize` and `post_max_size` to `12M`, and turns `expose_php` off.
If the production file is missing, it copies `backend/php.ini` instead.
Copying into `conf.d` adds those settings.
It does not replace the rest of PHP's config.
`backend/DEPLOY.md` also copies the file into the CLI `conf.d` directory.
Set `PHP_INI_DIR` to the FPM directory.
Copy the same file into the CLI directory yourself if you want `php artisan` to show the same limits.

If you leave `PHP_INI_DIR` empty, the deploy does not change PHP's settings.
Copy the file into `conf.d` yourself if uploads over 2 MB must work.

## The production environment

The deploy job uses a GitHub Environment named `production`.
The name must be exactly that.

1. Open the repo on GitHub.
2. Go to **Settings**, then **Environments**.
3. Click **New environment**.
4. Name it `production`.
5. Open **Required reviewers**.
6. Add the GitHub user who should approve deploys.
7. Save.

After that, a push to `main` still runs CI.
When CI passes and the secrets exist, the deploy job waits.
GitHub shows a **Review deployments** button.
The job connects to the server only after approval.
Rejecting the review skips the deploy.

## Prepare the server once

The server in this setup is a VPS you can SSH to.
Ubuntu is a good fit. The scripts use `bash`, `rsync`, `flock`, and GNU `mv`.

Install PHP 8.4, nginx, MySQL 8, `curl`, `rsync`, and `unzip`.
PHP needs the mysql, mbstring, xml, curl, zip, and bcmath extensions.

Create the deploy user and the folder:

```bash
sudo mkdir -p /var/www/taskchan/shared /var/www/taskchan/releases
sudo chown -R deploy:deploy /var/www/taskchan
```

Create the env file on the server.
Start from `backend/.env.production.example`.
Set a real `APP_KEY` (`php artisan key:generate --show`), a real database password, and your real domains.
Set `APP_ENV=production` and `APP_DEBUG=false`.
Do not commit this file.

`TRUSTED_PROXIES` can stay empty when nginx and PHP are on the same machine.
Set it to the load balancer IP only if a proxy is in front and sends `X-Forwarded-*` headers.
The value is read from `config/trustedproxy.php`, so it still works after `php artisan config:cache`.

Point nginx at the live folders:

- The API site root is `/var/www/taskchan/current/backend/public`.
- The site root for the React app is `/var/www/taskchan/current/frontend/dist`.
- Proxy or fastcgi `/up` to Laravel so the health check can succeed.
- Include `/var/www/taskchan/current/backend/deploy/nginx/csp.conf` from the site that serves the React app.

Create a MySQL database and a user that can use only that database.
Put those values in `shared/.env`.

The first deploy needs this in place.
If `/up` fails, the workflow removes the new symlink when there is no older release.

## What happens on a failure

| When it fails | What stays live |
|---|---|
| Secret missing | Nothing changes. The deploy job is skipped. |
| Secret present but invalid | Nothing is uploaded. The log names the secret. |
| Upload or migrate fails | The previous `current` symlink stays. |
| `/up` fails | `current` is pointed back at the previous release. |

Migrations that already ran are not undone.
Rolling back the folder does not roll back the database.

## How to undo a bad deploy

If the health check failed, the workflow already pointed `current` back.

To go back by hand, SSH to the server:

```bash
cd /var/www/taskchan
readlink -f current
ls releases
ln -sfn /var/www/taskchan/releases/THE_OLDER_FOLDER /var/www/taskchan/current.next
mv -Tf /var/www/taskchan/current.next /var/www/taskchan/current
sudo systemctl reload php8.4-fpm
```

Replace `THE_OLDER_FOLDER` with a name from `ls releases`.

To ship the old code again through GitHub, revert the bad commit and push to `main`.
CI runs. After it passes, approve the `production` deploy.

Do not run `php artisan migrate:rollback` unless you know the `down` method is safe.
The workflow will not run it for you.

## Common mistakes

- Pasting `taskchan_deploy.pub` into `SSH_PRIVATE_KEY`.
  The `.pub` file is one line that starts with `ssh-ed25519`.
  The private file starts with `-----BEGIN OPENSSH PRIVATE KEY-----`.
- Leaving `SSH_KNOWN_HOSTS` empty.
  An empty secret skips the deploy.
  It does not mean "skip the host check".
- Typing `<real server IP>` in the `ssh-keyscan` command or in the secret.
  Those words are instructions. Replace them with the real IP.
- Using `203.0.113.10`, `example.com`, or `YOUR_SERVER_IP`.
  The checker rejects documentation addresses and placeholders.
- Forgetting the trailing newline after `-----END OPENSSH PRIVATE KEY-----` or after the known_hosts line.
  The log warns and adds the newline when it can.
  If the key is still invalid, the job fails and names the secret.
- Putting the secrets only on the `production` environment.
  Put them on the repository.
- Setting `StrictHostKeyChecking` to `no` on the server or in a fork of this workflow.
  This repo does not do that. Do not add it.
- Expecting `backend/php.ini` to be passed as `php -c php.ini` in production.
  That file is for the local dev server.
  Production loads `backend/deploy/php/production.ini` from PHP's `conf.d` directory.

## Laravel Cloud or Forge

You can host the app on Laravel Cloud or Forge instead of a VPS.
Only the deploy job changes.
Keep `.github/workflows/ci.yml` as it is.
Tests should still run on pull requests.

You would delete or replace `.github/workflows/deploy-production.yml`.
Cloud and Forge run `composer install`, migrations, and their own build commands.
You would not need `SSH_PRIVATE_KEY` or `SSH_KNOWN_HOSTS`.
Follow `backend/DEPLOY.md` for their env vars and PHP upload limits.

On Forge, include `backend/deploy/nginx/csp.conf` from the site config.
On Cloud, install `backend/deploy/php/production.ini` the way `backend/DEPLOY.md` describes.
`CSP_CONNECT_SRC` is the same variable in both places.
The rest of this page is the VPS path.
