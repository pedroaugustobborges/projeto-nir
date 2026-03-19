# Colmeia API - Complete Guide

## Overview

The Colmeia API is a REST API for communication and data management within the Colmeia platform. It provides endpoints for database operations, marketing campaigns, and agent management.

**Base URL:** `https://api.colmeia.me/v1/rest/`

---

## Quick Start

```python
from colmeia_api import ColmeiaAPI

# Initialize and authenticate
api = ColmeiaAPI()
api.authenticate()

# Send a campaign
api.send_campaign(
    campaign_action_id="your_campaign_id",
    contact_list=[
        {"nome": "John", "celular": "5511999999999"},
        {"nome": "Jane", "celular": "5511888888888"}
    ]
)
```

---

## Authentication Flow

### Step 1: Get Your Credentials

1. Go to `https://app.colmeia.cx/dashboard/communication/api`
2. Click on **Tokens** tab
3. Click the **3 dots menu** (⋮) on your token → **Copy ID**
4. This gives you the `idTokenToRefresh`

Your `idSocialNetwork` depends on which social network you're in:
- **HECAD:** `oFzvyMeL6e8ALfPc4DPQlCNTwWhuU9`
- **CRER:** `K36LwFWX0tIrMjmRm643PqLSziJ9pU`
- **HDS:** `SHieySEXmIspZdFQ31Dd7bEuqkSUHr`
- **HUGOL:** `riOMRFeqi2QEwz3QT0PVQEK8YbtTIe`

### Step 2: Configure .env File

```env
COLMEIA_SOCIAL_NETWORK_ID=oFzvyMeL6e8ALfPc4DPQlCNTwWhuU9
COLMEIA_TOKEN_ID=your_token_id_from_copy_id
COLMEIA_EMAIL=your.email@domain.com
COLMEIA_PASSWORD=your_password
```

### Step 3: Generate Auth Token

```python
from colmeia_api import ColmeiaAPI

api = ColmeiaAPI()
token = api.authenticate()
print(f"Token: {token}")  # Valid for 1 hour
```

**Or via curl:**
```bash
curl -X POST 'https://api.colmeia.me/v1/rest/generate-token' \
  -H 'Content-Type: application/json' \
  -H 'idSocialNetwork: YOUR_SOCIAL_NETWORK_ID' \
  -d '{
    "idTokenToRefresh": "YOUR_TOKEN_ID",
    "email": "your.email@domain.com",
    "password": "SHA256_HASH_OF_PASSWORD"
  }'
```

---

## Available Endpoints

### Token Generation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `generate-token` | POST | Generate auth token (expires in 1h) |
| `generate-token-exp-once` | POST | Generate single-use token |

### Database Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `database-upsert` | POST | Insert/update records |
| `database-upsert-json` | POST | Insert/update via JSON |
| `database-delete` | POST | Delete records |
| `callback-resume-bot-flow` | POST | Resume bot with callback |

### Marketing Campaigns
| Endpoint | Method | Description |
|----------|--------|-------------|
| `marketing-send-campaign` | POST | Send campaign |
| `marketing-cancel-send-campaign` | POST | Cancel scheduled campaign |
| `general-marketing-send-campaign` | POST | Generic campaign sending |

### Agent Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `agent-login` | POST | Log in agent |
| `agent-logout` | POST | Log out agent |

---

## Example: Send Marketing Campaign

```python
from colmeia_api import ColmeiaAPI

api = ColmeiaAPI()
api.authenticate()

# Send campaign
result = api.send_campaign(
    campaign_action_id="kUooKKDMcINBU5a1leb93QRtmzjhDE",
    contact_list=[
        {
            "nome": "Rodrigo Valentim",
            "celular": "351965026231",
            "url": "https://example.com/image.png"
        }
    ]
)
print(result)
```

---

## Example: Database Upsert

```python
from colmeia_api import ColmeiaAPI

api = ColmeiaAPI()
api.authenticate()

# Insert/update records
records = [
    {"name": "John Doe", "email": "john@example.com", "phone": "+5511999999999"},
    {"name": "Jane Doe", "email": "jane@example.com", "phone": "+5511888888888"}
]

result = api.database_upsert_json("your_database_id", records)
print(result)
```

---

## Error Handling

```python
from colmeia_api import ColmeiaAPI, ColmeiaAPIError

api = ColmeiaAPI()

try:
    api.authenticate()
    result = api.send_campaign(...)
except ColmeiaAPIError as e:
    print(f"Error: {e.message}")
    print(f"Status: {e.status_code}")
    print(f"Response: {e.response}")
```

---

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created (token generated) |
| 400 | Bad Request (invalid fields or token not valid for endpoint) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## Important Notes

1. **Token Expiration:** Auth tokens expire in 1 hour. Re-authenticate when you get 401 errors.
2. **API Type:** The token is only valid for endpoints matching the "Tipo de API" selected during token creation.
3. **Password:** Always hash passwords with SHA256 (uppercase hex) before sending.
4. **SHA256 Generator:** Use the tool at `https://app.colmeia.me/dashboard/communication/api` (Documentação de Endpoints tab).

---

## Files in This Project

| File | Purpose |
|------|---------|
| `colmeia_api.py` | Python client library |
| `.env` | Your credentials |
| `test_connection.py` | Connection test script |
| `example_usage.py` | Usage examples |
| `requirements.txt` | Python dependencies |
