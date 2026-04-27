import psycopg
from psycopg.errors import DuplicateDatabase

def setup_db():
    try:
        conn = psycopg.connect("dbname=postgres user=postgres password=000000 host=localhost port=5432")
        conn.autocommit = True
        with conn.cursor() as cur:
            try:
                cur.execute("CREATE DATABASE trading_dashboard;")
                print("Database created.")
            except DuplicateDatabase:
                print("Database already exists.")
        conn.close()

        # Apply schema
        conn = psycopg.connect("dbname=trading_dashboard user=postgres password=000000 host=localhost port=5432")
        with conn.cursor() as cur:
            with open("schema.sql", "r") as f:
                cur.execute(f.read())
            conn.commit()
        print("Schema applied successfully.")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    setup_db()
