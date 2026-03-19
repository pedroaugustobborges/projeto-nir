"""
Test Colmeia API Connection - Based on PDF documentation
"""

import requests
import hashlib

BASE_URL = "https://api.colmeia.me/v1/rest"

# From PDF: HECAD social network
ID_SOCIAL_NETWORK = "oFzvyMeL6e8ALfPc4DPQlCNTwWhuU9"

# From "Copy ID" button
ID_TOKEN_TO_REFRESH = "cwbChwILZ6y8OAg9h0bdrZcNADELcrs6"

# Your credentials
EMAIL = "raul.cirqueira@agirsaude.org.br"
PASSWORD = "Rv@3063355"
PASSWORD_HASH = hashlib.sha256(PASSWORD.encode()).hexdigest().upper()


def test_generate_token():
    """Test generate-token endpoint (no Authorization header needed)."""
    print("=" * 70)
    print("TESTING GENERATE-TOKEN")
    print("=" * 70)

    url = f"{BASE_URL}/generate-token"

    # According to PDF, only idSocialNetwork header is needed
    headers = {
        "Content-Type": "application/json",
        "idSocialNetwork": ID_SOCIAL_NETWORK,
    }

    body = {
        "idTokenToRefresh": ID_TOKEN_TO_REFRESH,
        "email": EMAIL,
        "password": PASSWORD_HASH
    }

    print(f"URL: {url}")
    print(f"Headers: {headers}")
    print(f"Body: {body}")
    print(f"Password SHA256: {PASSWORD_HASH}")

    try:
        response = requests.post(url, headers=headers, json=body, timeout=15)
        print(f"\nStatus: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code in [200, 201]:
            print("\n" + "=" * 70)
            print("SUCCESS! Token generated!")
            print("=" * 70)
            return True, response.json()
        return False, {}
    except Exception as e:
        print(f"Error: {e}")
        return False, {}


def test_with_generated_token(auth_token: str):
    """Test an endpoint using the generated token."""
    print("\n" + "=" * 70)
    print("TESTING WITH GENERATED AUTH TOKEN")
    print("=" * 70)

    url = f"{BASE_URL}/generate-token-exp-once"

    headers = {
        "Content-Type": "application/json",
        "idSocialNetwork": ID_SOCIAL_NETWORK,
        "Authorization": auth_token,
    }

    print(f"Using auth token: {auth_token[:30]}...")

    try:
        response = requests.post(url, headers=headers, json={}, timeout=15)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"Error: {e}")
        return False


if __name__ == "__main__":
    print("\nColmeia API Test - HECAD")
    print(f"Email: {EMAIL}")
    print(f"idSocialNetwork: {ID_SOCIAL_NETWORK}")
    print(f"idTokenToRefresh: {ID_TOKEN_TO_REFRESH}")
    print()

    success, data = test_generate_token()

    if success:
        # Extract the auth token from response
        auth_token = data.get("authToken") or data.get("token") or data.get("authorization")
        if auth_token:
            print(f"\nGenerated Auth Token: {auth_token}")
            test_with_generated_token(auth_token)
        else:
            print(f"\nFull response data: {data}")
