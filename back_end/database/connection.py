from contextlib import contextmanager

import mysql.connector
from mysql.connector import pooling

from back_end.config import Config

_pool = None


def get_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name=Config.MYSQL_POOL_NAME,
            pool_size=Config.MYSQL_POOL_SIZE,
            host=Config.MYSQL_HOST,
            port=Config.MYSQL_PORT,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DATABASE,
            autocommit=False,
        )
    return _pool


def get_connection():
    return get_pool().get_connection()


@contextmanager
def db_cursor(commit=False):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        yield cursor
        if commit:
            connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


def fetch_one(query, params=None):
    with db_cursor() as cursor:
        cursor.execute(query, params or ())
        return cursor.fetchone()


def fetch_all(query, params=None):
    with db_cursor() as cursor:
        cursor.execute(query, params or ())
        return cursor.fetchall()


def execute(query, params=None):
    with db_cursor(commit=True) as cursor:
        cursor.execute(query, params or ())
        return cursor.lastrowid
