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
