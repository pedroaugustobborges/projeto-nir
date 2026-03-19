"""
Example Usage of Colmeia API Client

This script demonstrates how to:
1. Authenticate with the API
2. Send marketing campaigns
3. Upload data to a database

Before running:
1. Ensure .env file has your credentials
2. Install dependencies: pip install requests python-dotenv
"""

from colmeia_api import ColmeiaAPI, ColmeiaAPIError


def example_authentication():
    """Example: Authenticate and get an auth token."""
    print("\n" + "=" * 50)
    print("AUTHENTICATION")
    print("=" * 50)

    try:
        api = ColmeiaAPI()
        token = api.authenticate()

        print(f"Authentication successful!")
        print(f"Token: {token[:30]}...")

        return api

    except ColmeiaAPIError as e:
        print(f"Authentication failed: {e.message}")
        return None


def example_send_campaign(api: ColmeiaAPI):
    """Example: Send a marketing campaign."""
    print("\n" + "=" * 50)
    print("SEND CAMPAIGN EXAMPLE")
    print("=" * 50)

    # Sample campaign data (update with your actual campaign ID)
    campaign_action_id = "YOUR_CAMPAIGN_ACTION_ID"

    contact_list = [
        {
            "nome": "Test User",
            "celular": "5511999999999",
            # "url": "https://example.com/image.png"  # Optional: for image campaigns
        }
    ]

    print(f"Campaign Action ID: {campaign_action_id}")
    print(f"Contacts: {contact_list}")

    # Uncomment to actually send:
    # try:
    #     response = api.send_campaign(
    #         campaign_action_id=campaign_action_id,
    #         contact_list=contact_list
    #     )
    #     print(f"Campaign sent successfully!")
    #     print(f"Response: {response}")
    # except ColmeiaAPIError as e:
    #     print(f"Campaign failed: {e.message}")

    print("(Skipped - uncomment code to actually send)")


def example_database_upsert(api: ColmeiaAPI):
    """Example: Insert/update records in a database."""
    print("\n" + "=" * 50)
    print("DATABASE UPSERT EXAMPLE")
    print("=" * 50)

    # Sample data (update with your actual database ID)
    database_id = "YOUR_DATABASE_ID"

    records = [
        {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+5511999999999",
            "status": "active"
        },
        {
            "name": "Jane Smith",
            "email": "jane.smith@example.com",
            "phone": "+5511888888888",
            "status": "active"
        }
    ]

    print(f"Database ID: {database_id}")
    print(f"Records: {len(records)}")

    # Uncomment to actually upsert:
    # try:
    #     response = api.database_upsert_json(database_id, records)
    #     print(f"Data upserted successfully!")
    #     print(f"Response: {response}")
    # except ColmeiaAPIError as e:
    #     print(f"Upsert failed: {e.message}")

    print("(Skipped - uncomment code to actually upsert)")


def main():
    """Main function demonstrating API usage."""
    print("=" * 50)
    print("COLMEIA API - EXAMPLE USAGE")
    print("=" * 50)

    # Step 1: Authenticate
    api = example_authentication()

    if api is None:
        print("\nAuthentication failed. Check your .env credentials.")
        return

    # Step 2: Examples (uncomment the ones you want to test)
    example_send_campaign(api)
    example_database_upsert(api)

    print("\n" + "=" * 50)
    print("DONE!")
    print("=" * 50)
    print("\nTo use these examples for real:")
    print("1. Update the campaign_action_id and database_id")
    print("2. Uncomment the actual API calls")
    print("3. Run again")


if __name__ == "__main__":
    main()
