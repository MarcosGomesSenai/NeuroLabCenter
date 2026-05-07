from back_end.database.connection import db_cursor


def query_one(query, params=None):
    with db_cursor() as cursor:
        cursor.execute(query, params or ())
        return cursor.fetchone()


def query_all(query, params=None):
    with db_cursor() as cursor:
        cursor.execute(query, params or ())
        return cursor.fetchall()


def execute_query(query, params=None):
    with db_cursor(commit=True) as cursor:
        cursor.execute(query, params or ())
        return cursor.lastrowid


def execute_many(query, values):
    with db_cursor(commit=True) as cursor:
        cursor.executemany(query, values)
        return cursor.rowcount
