from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App configuration. Everything comes from the environment; nothing
    secret lives in the repo. Postgres, S3, Firebase Admin, and Anthropic
    settings are added in the build steps that use them."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="AF_")

    app_name: str = "Adaptive Fitness API"
    version: str = "0.12.1"
    # Model used for medical-document extraction (override with AF_EXTRACT_MODEL).
    extract_model: str = "claude-opus-5"
    # Comma-separated list of allowed browser origins.
    cors_origins: str = (
        "http://localhost:5173,https://fabianb14.github.io"
    )
    # Web Push (VAPID). Generate with `npx web-push generate-vapid-keys`
    # and set AF_VAPID_PUBLIC_KEY / AF_VAPID_PRIVATE_KEY in the environment.
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:push@adaptive-fitness.invalid"
    # Where subscriptions persist. Ephemeral disks are fine: the app
    # re-registers its subscription on every launch.
    push_store_path: str = "af_push_subscriptions.json"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
