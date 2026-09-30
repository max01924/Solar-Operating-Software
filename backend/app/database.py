import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data'
DATA.mkdir(exist_ok=True)
DATABASE_URL = os.environ.get('DATABASE_URL', f'sqlite:///{DATA / "sonnenweg.db"}')
engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {})

if DATABASE_URL.startswith('sqlite'):
    @event.listens_for(engine, 'connect')
    def configure_sqlite(connection, _):
        cursor = connection.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.execute('PRAGMA journal_mode=WAL')
        cursor.execute('PRAGMA busy_timeout=5000')
        cursor.close()

Session = sessionmaker(engine)

class Base(DeclarativeBase):
    pass

def get_session():
    with Session() as session:
        yield session
