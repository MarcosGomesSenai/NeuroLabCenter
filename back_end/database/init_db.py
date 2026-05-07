from pathlib import Path

import mysql.connector

from back_end.config import Config


def _run_sql_file(cursor, path):
    sql = Path(path).read_text(encoding="utf-8")
    for statement in sql.split(";"):
        statement = statement.strip()
        if statement:
            cursor.execute(statement)


def init_database(with_seed=True):
    connection = mysql.connector.connect(
        host=Config.MYSQL_HOST,
        port=Config.MYSQL_PORT,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        autocommit=False,
    )
    cursor = connection.cursor()
    base_dir = Path(__file__).resolve().parent
    try:
        _run_sql_file(cursor, base_dir / "schema.sql")
        if with_seed:
            _run_sql_file(cursor, base_dir / "seed.sql")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    init_database(with_seed=True)
    print("Banco NeuroLab Center inicializado.")
