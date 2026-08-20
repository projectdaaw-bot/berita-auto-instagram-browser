# Berita Auto Instagram Browser

Browser-only Instagram Story uploader for the user-owned `@berita.auto` account.

## Safety

- Playwright + Google Chrome UI only; no private Instagram API.
- Never reads, exports, or logs passwords, cookies, tokens, auth headers, or auth storage.
- Stops on password/OTP/CAPTCHA/checkpoint/security confirmation.
- Refuses account mismatch and Chrome profile conflicts.
- One publish maximum per run; no blind publish retry.
- Local duplicate guard is advisory only and is not production state.

## Requirements

- macOS
- Node.js 22+
- Google Chrome installed at `/Applications/Google Chrome.app`
- A Chrome profile whose display name is `projectdaaw`, or an explicitly selected dedicated automation profile.

## Setup

```bash
cp .env.example .env
npm install
npx playwright install
```

The preferred browser is installed Google Chrome (`channel: chrome`), so Playwright does not need to download another browser for normal operation.

## Chrome profile discovery

Chrome stores profiles under:

`~/Library/Application Support/Google/Chrome/`

The application reads `Local State` and matches the profile **display name** `projectdaaw`; it does not assume `Profile 1`, `Profile 2`, etc.

If the profile is currently locked, the automation refuses to start a second persistent Chrome instance. It never kills Chrome automatically.

### Remote debugging

If Chrome is already open, a safe option is to start a separate Chrome process configured for remote debugging with the same profile only after ensuring that profile is not already in use:

```bash
open -na "Google Chrome" --args \
  --remote-debugging-port=9222 \
  --profile-directory="<PROFILE_DIRECTORY>"
```

Do **not** run two Chrome instances against the same user-data directory/profile simultaneously.

Set:

```env
CHROME_REMOTE_DEBUGGING_URL=http://127.0.0.1:9222
```

The application will attach with Playwright `connectOverCDP`.

## Dry run

The required first live test is:

```bash
DRY_RUN=true npm run story:test
```

It opens Instagram, verifies `@berita.auto`, selects a current article, renders a 1080x1920 Story, opens the Story composer, uploads the asset and verifies the preview. It **must not click Share**.

## Live upload

Only after dry-run PASS:

```bash
DRY_RUN=false npm run story:upload
```

The live command performs one final safety validation and permits at most one final Share click. If confirmation is ambiguous it returns `PUBLISH_AMBIGUOUS` and does not retry.

## Manual authentication

If Instagram asks for a password, OTP, CAPTCHA, checkpoint, or security confirmation, the run stops with `BLOCKED_MANUAL_AUTH_REQUIRED`. Complete authentication manually in the visible browser and rerun; credentials are never entered or extracted by this project.

## Outputs

Debug-only files are written under `tmp/` and are ignored by Git:

- `tmp/story-<articleId>.jpg`
- `tmp/story-state.json`
- `tmp/screenshots/01-instagram-home.png`
- `tmp/screenshots/02-story-composer.png`
- `tmp/screenshots/03-story-preview.png`
- `tmp/screenshots/04-story-published.png`

No screenshots or Story assets should be committed.

## Tests

```bash
npm test
```

Unit tests cover profile mapping, article parsing/selection, sensitive-content filtering, Story dimensions, duplicate guard, account mismatch, and dry-run/single-publish safety. They do not claim an Instagram live test.

## Security

Never place `.env`, Chrome user data, `Local State`, `Cookies`, `Login Data`, `Web Data`, session storage, or any authentication artifact in this repository.
