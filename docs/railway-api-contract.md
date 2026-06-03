# Echo Railway API Contract

The app and Discord bot should share one Railway-hosted API. The API owns Postgres writes,
balance changes, cooldown validation, casino rolls, and account linking.

## Environment

The Expo app reads:

```txt
EXPO_PUBLIC_ECHO_API_URL=https://your-echo-api.up.railway.app
```

Restart Expo after changing `.env`.

## Discord Link Flow

### 1. App creates a link code

```http
POST /v1/link-codes
Content-Type: application/json

{
  "client": "echo-mobile"
}
```

Response:

```json
{
  "linkCode": "ECHO-482913",
  "expiresAt": "2026-05-26T01:20:00.000Z"
}
```

### 2. User runs Discord command

```txt
/link ECHO-482913
```

The Discord bot calls:

```http
POST /v1/link-codes/ECHO-482913/claim
Content-Type: application/json

{
  "discord_user_id": "123456789012345678",
  "display_name": "Sheyn"
}
```

### 3. App checks link status

```http
GET /v1/link-codes/ECHO-482913
```

Pending response:

```json
{
  "status": "pending",
  "profile": null,
  "sessionToken": null
}
```

Linked response:

```json
{
  "status": "linked",
  "sessionToken": "signed-session-token",
  "profile": {
    "profileId": "profile_123",
    "discordUserId": "123456789012345678",
    "displayName": "Sheyn",
    "walletBalance": 7500,
    "bankBalance": 25000,
    "serverBankBalance": 500000,
    "jobLevel": 1,
    "jobXp": 0,
    "heat": 12,
    "jailedUntil": null
  }
}
```

## Shared Profile Snapshot

Authenticated app requests should use:

```http
GET /v1/me
Authorization: Bearer signed-session-token
```

The response body should match the `profile` object above.

## Next Backend Move

After linking works, move Blackjack settlement server-side:

- app starts table with stake
- API debits wallet and credits server bank
- API creates deck and table state
- app sends hit/stand actions
- API resolves payout and records transactions
- Discord bot reads the same balances and transactions

## Night Walker Railway Implementation

Night Walker must be fully server-owned. The app renders returned state and sends `choiceIndex`; Railway owns session generation, hidden tags, failure, risk, payout rolls, wallet writes, XP, cooldowns, transactions, contracts, standing, effects, and jail validation.

### Routes

```http
GET /v1/jobs/nightwalker
Authorization: Bearer <sessionToken>
```

Return `{ profile, progress, cooldowns, jobs }`, where jobs include `flirt`, `lapDance`, and `prostitute` with title, rounds, cooldown seconds, payout range, XP, availability, and disabled reason.

```http
POST /v1/jobs/nightwalker/:jobId/start
Authorization: Bearer <sessionToken>
```

Validate the linked app session, jail state, supported `jobId`, and the matching cooldown key. Create a persisted active session, pick unique scenarios server-side, and return the first renderable prompt with safe choices only.

```http
GET /v1/jobs/nightwalker/sessions/:sessionId
Authorization: Bearer <sessionToken>
```

Return the current renderable session if it belongs to the authenticated user.

```http
POST /v1/jobs/nightwalker/sessions/:sessionId/action
Authorization: Bearer <sessionToken>
Content-Type: application/json

{ "choiceIndex": 0 }
```

Validate ownership and active status, apply the hidden choice server-side, return the next prompt while active, or settle the job when failed or completed.

### Storage

Use `nightwalker_sessions` or a generic `job_sessions` table:

```txt
id
guild_id
user_id
profile_id
job_id
category = nightwalker
status = active | resolved | expired
state_json
result_json
created_at
updated_at
expires_at
resolved_at
```

Reuse existing tables for balances, transactions, cooldowns, `job_progress`, jail, linked identities/profiles, effects, contracts, standing, and bonds. Do not create duplicate wallet, XP, cooldown, transaction, or account-number storage.

### Job Rules

Shared progression:

```txt
xpToNext(level) = 100 + ((max(1, level) - 1) * 60)
levelMultiplier(level) = min(1.6, 1 + 0.02 * (max(1, level) - 1))
```

Cooldown keys:

```txt
job:nw:flirt       300s
job:nw:lapDance    420s
job:nw:prostitute  600s
```

Jobs:

```txt
flirt
rounds: 5
payout: 2000-3000
success XP: 14
fail when wrongCount >= 2
transaction type: job_nw_flirt

lapDance
rounds: 5
payout: 4000-5000
success XP: 16
fail when penaltyTokens >= 3
smooth choices reduce penaltyTokens by 1, min 0
transaction type: job_nw_lapDance

prostitute
rounds: 4
payout: 4000-6000
success XP: 18
risk is clamped 0-200
do not fail on risk unless Railway config explicitly defines risk.failAt
risk payout bonus rolls between max(0, risk - 5) and risk + 5
transaction type: job_nw_prostitute
```

### Settlement

On start and choices, no money moves. On failure, start the job cooldown and return unchanged profile. On success, call the same shared legal-job settlement path used by Discord `payUser()` or its central equivalent:

- apply job level multiplier
- apply global bonuses, standing, bonds, blessings/curses/effects
- credit wallet through the shared credit helper
- write a transaction with `source: "nightwalker"` and `client: "app"`
- add job XP and level up when needed
- increment `total_jobs`
- update `job_earnings` and `jobs_completed` contract progress
- adjust community standing and milestone achievements
- return the updated profile

The app must never receive hidden choice tags, risk deltas, payout deltas, or final settlement inputs before the server has resolved them.
