import os
from dotenv import load_dotenv

load_dotenv()

DISCORD_TOKEN: str = os.environ["DISCORD_TOKEN"]
GUILD_ID: int | None = int(os.environ["GUILD_ID"]) if os.environ.get("GUILD_ID") else None
ADMIN_ROLE_ID: int | None = int(os.environ["ADMIN_ROLE_ID"]) if os.environ.get("ADMIN_ROLE_ID") else None
UPDATE_INTERVAL_HOURS: float = float(os.environ.get("UPDATE_INTERVAL_HOURS", "168"))

DB_PATH: str = os.path.join(os.path.dirname(__file__), "data", "stardew.db")
