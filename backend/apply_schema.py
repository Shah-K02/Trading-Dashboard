"""Applies schema.sql to the database at DATABASE_URL. Idempotent (the SQL
uses CREATE TABLE/TYPE ... IF NOT EXISTS), so it's safe to run on every
deploy — used as a build step for hosted deployments (see render.yaml),
since Alembic's migration chain assumes this base schema already exists
(it only tracks changes made after schema.sql, e.g. adding the users table)."""
import psycopg
from app.core.config import settings


def apply_schema():
    # psycopg.connect() doesn't understand SQLAlchemy's "+psycopg" dialect suffix
    dsn = settings.database_url.replace("postgresql+psycopg://", "postgresql://")
    with psycopg.connect(dsn) as conn:
        with open("schema.sql", "r") as f:
            conn.execute(f.read())
        conn.commit()
    print("Schema applied successfully.")


if __name__ == "__main__":
    apply_schema()
