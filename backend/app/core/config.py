from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TradeLens API"
    app_env: str = "development"
    app_debug: bool = False
    database_url: str
    secret_key: str  # Required — generate with: python -c "import secrets; print(secrets.token_hex(32))"
    mt5_login: str | None = None
    mt5_password: str | None = None
    mt5_server: str | None = None
    mt5_path: str | None = None
    # Comma-separated origins, e.g.: http://localhost:5173,https://myapp.com
    allowed_origins_str: str = "http://localhost:3000,http://localhost:5173"

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins_str.split(",") if o.strip()]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")


settings = Settings()
