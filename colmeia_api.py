"""
Colmeia API Client

A Python client for interacting with the Colmeia API.
Supports authentication, database operations, and marketing campaigns.

Usage:
    from colmeia_api import ColmeiaAPI

    api = ColmeiaAPI()
    api.authenticate()

    # Now use the API
    result = api.database_upsert_json(database_id, records)
"""

import os
import hashlib
import requests
from typing import Optional, Dict, List, Any

# Try to load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class ColmeiaAPIError(Exception):
    """Custom exception for Colmeia API errors."""
    def __init__(self, message: str, status_code: int = None, response: dict = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class ColmeiaAPI:
    """
    Colmeia API Client

    Handles authentication and API requests to the Colmeia platform.
    """

    BASE_URL = "https://api.colmeia.me/v1/rest"

    def __init__(
        self,
        social_network_id: str = None,
        token_id: str = None,
        email: str = None,
        password: str = None
    ):
        """
        Initialize the Colmeia API client.

        Args:
            social_network_id: Your Colmeia Social Network ID (idSocialNetwork)
            token_id: Token ID for refreshing auth tokens (idTokenToRefresh)
            email: Account email for authentication
            password: Account password (plain text - will be hashed)
        """
        self.social_network_id = social_network_id or os.getenv("COLMEIA_SOCIAL_NETWORK_ID")
        self.token_id = token_id or os.getenv("COLMEIA_TOKEN_ID")
        self.email = email or os.getenv("COLMEIA_EMAIL")
        self._password = password or os.getenv("COLMEIA_PASSWORD")

        self.auth_token: Optional[str] = None
        self.session = requests.Session()

        # Validate required credentials
        if not self.social_network_id:
            raise ValueError("social_network_id is required (or set COLMEIA_SOCIAL_NETWORK_ID env var)")

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash password using SHA256 (uppercase hex).

        Args:
            password: Plain text password

        Returns:
            SHA256 hash of the password in uppercase hex
        """
        return hashlib.sha256(password.encode()).hexdigest().upper()

    def _get_headers(self, content_type: str = "application/json") -> Dict[str, str]:
        """
        Get headers for API requests.

        Args:
            content_type: Content-Type header value

        Returns:
            Dictionary of headers
        """
        headers = {
            "idSocialNetwork": self.social_network_id,
        }

        if self.auth_token:
            headers["Authorization"] = self.auth_token

        if content_type:
            headers["Content-Type"] = content_type

        return headers

    def _request(
        self,
        method: str,
        endpoint: str,
        data: dict = None,
        files: dict = None,
    ) -> Dict[str, Any]:
        """
        Make an API request.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (without base URL)
            data: Request body data
            files: Files for multipart upload

        Returns:
            Response data as dictionary

        Raises:
            ColmeiaAPIError: If the request fails
        """
        url = f"{self.BASE_URL}/{endpoint}"

        # Determine content type
        content_type = None if files else "application/json"
        headers = self._get_headers(content_type=content_type)

        try:
            if files:
                response = self.session.request(method, url, headers=headers, files=files, data=data)
            else:
                response = self.session.request(method, url, headers=headers, json=data)

            # Try to parse JSON response
            try:
                response_data = response.json()
            except ValueError:
                response_data = {"raw": response.text}

            # Check for errors
            if response.status_code >= 400:
                error_msg = response_data.get("error", {}).get("descriptions", [{}])
                error_text = error_msg[0].get("error", str(response_data)) if error_msg else str(response_data)
                raise ColmeiaAPIError(
                    f"API request failed: {error_text}",
                    status_code=response.status_code,
                    response=response_data
                )

            return response_data

        except requests.RequestException as e:
            raise ColmeiaAPIError(f"Request failed: {str(e)}")

    # =========================================================================
    # Authentication
    # =========================================================================

    def authenticate(self, email: str = None, password: str = None) -> str:
        """
        Generate an authentication token.

        Args:
            email: Account email (uses instance email if not provided)
            password: Account password in plain text (uses instance password if not provided)

        Returns:
            The generated auth token
        """
        email = email or self.email
        password = password or self._password

        if not email or not password:
            raise ValueError("Email and password are required for authentication")

        if not self.token_id:
            raise ValueError("token_id is required for authentication (set COLMEIA_TOKEN_ID)")

        data = {
            "idTokenToRefresh": self.token_id,
            "email": email,
            "password": self.hash_password(password)
        }

        # For generate-token, we don't need auth_token yet
        url = f"{self.BASE_URL}/generate-token"
        headers = {
            "Content-Type": "application/json",
            "idSocialNetwork": self.social_network_id,
        }

        response = self.session.post(url, headers=headers, json=data)

        if response.status_code not in [200, 201]:
            raise ColmeiaAPIError(
                f"Authentication failed: {response.text}",
                status_code=response.status_code
            )

        response_data = response.json()
        self.auth_token = response_data.get("token")

        if not self.auth_token:
            raise ColmeiaAPIError("No token in authentication response")

        return self.auth_token

    def generate_single_use_token(self) -> Dict[str, Any]:
        """
        Generate a single-use authentication token.

        Returns:
            Response containing the single-use token
        """
        return self._request("POST", "generate-token-exp-once", data={})

    # =========================================================================
    # Database Operations
    # =========================================================================

    def database_upsert_json(
        self,
        database_id: str,
        records: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Insert or update records in a database using JSON.

        Args:
            database_id: The database ID to update
            records: List of records to upsert

        Returns:
            API response
        """
        if not self.auth_token:
            self.authenticate()

        data = {
            "idDatabase": database_id,
            "data": records
        }

        return self._request("POST", "database-upsert", data=data)

    def database_upsert_file(
        self,
        database_id: str,
        file_path: str,
    ) -> Dict[str, Any]:
        """
        Insert or update records in a database using a CSV file.

        Args:
            database_id: The database ID to update
            file_path: Path to the CSV file

        Returns:
            API response
        """
        if not self.auth_token:
            self.authenticate()

        from pathlib import Path
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(path, "rb") as f:
            files = {"file": (path.name, f, "text/csv")}
            data = {"idDatabase": database_id}
            return self._request("POST", "database-upsert", data=data, files=files)

    def database_delete(
        self,
        database_id: str,
        records: List[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Delete records from a database.

        Args:
            database_id: The database ID
            records: List of records to delete (by key)

        Returns:
            API response
        """
        if not self.auth_token:
            self.authenticate()

        data = {
            "idDatabase": database_id,
            "data": records or []
        }

        return self._request("POST", "database-delete", data=data)

    # =========================================================================
    # Marketing Campaigns
    # =========================================================================

    def send_campaign(
        self,
        campaign_action_id: str,
        contact_list: List[Dict[str, Any]],
        schedule_timestamp: int = None,
        cadence_config: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Send a marketing campaign.

        Args:
            campaign_action_id: The campaign action ID (idCampaignAction)
            contact_list: List of contacts with 'nome', 'celular/telefone', and optional 'url'
            schedule_timestamp: Unix timestamp for scheduling (milliseconds)
            cadence_config: Optional cadence configuration

        Returns:
            API response
        """
        if not self.auth_token:
            self.authenticate()

        data = {
            "idCampaignAction": campaign_action_id,
            "contactList": contact_list,
        }

        if schedule_timestamp:
            data["scheduleClockTick"] = schedule_timestamp

        if cadence_config:
            data["cadenceConfig"] = cadence_config

        return self._request("POST", "marketing-send-campaign", data=data)

    def cancel_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """
        Cancel a scheduled campaign.

        Args:
            campaign_id: The campaign ID to cancel

        Returns:
            API response
        """
        if not self.auth_token:
            self.authenticate()

        data = {"idCampaign": campaign_id}
        return self._request("POST", "marketing-cancel-send-campaign", data=data)

    # =========================================================================
    # Agent Management
    # =========================================================================

    def agent_login(self, agent_email: str) -> Dict[str, Any]:
        """
        Log in an agent.

        Args:
            agent_email: The agent's email

        Returns:
            API response
        """
        if not self.auth_token:
            self.authenticate()

        data = {
            "idTokenToRefresh": self.token_id,
            "agentEmail": agent_email
        }

        return self._request("POST", "agent-login", data=data)

    def agent_logout(self, agent_email: str) -> Dict[str, Any]:
        """
        Log out an agent.

        Args:
            agent_email: The agent's email

        Returns:
            API response
        """
        if not self.auth_token:
            self.authenticate()

        data = {
            "idTokenToRefresh": self.token_id,
            "agentEmail": agent_email
        }

        return self._request("POST", "agent-logout", data=data)

    # =========================================================================
    # Bot Flow
    # =========================================================================

    def callback_resume_bot_flow(self, callback_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resume a bot flow with callback data.

        Args:
            callback_data: Callback configuration

        Returns:
            API response
        """
        if not self.auth_token:
            self.authenticate()

        return self._request("POST", "callback-resume-bot-flow", data=callback_data)


# =============================================================================
# Example Usage
# =============================================================================

if __name__ == "__main__":
    print("Colmeia API Client - Test")
    print("=" * 50)

    try:
        api = ColmeiaAPI()
        print(f"Social Network ID: {api.social_network_id}")
        print(f"Token ID: {api.token_id}")
        print(f"Email: {api.email}")

        print("\nAuthenticating...")
        token = api.authenticate()
        print(f"Auth Token: {token[:30]}...")
        print("\nAuthentication successful!")

    except ColmeiaAPIError as e:
        print(f"API Error: {e.message}")
        if e.response:
            print(f"Response: {e.response}")
    except Exception as e:
        print(f"Error: {e}")
