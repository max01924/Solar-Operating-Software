import tempfile
import unittest
from datetime import date
from pathlib import Path
from alembic import command
from alembic.config import Config
from fastapi import HTTPException
from sqlalchemy import create_engine, event, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app import services
from app.models import Assignment, Employee, Project, TeamGroup
from app.main import NameInput

class CoreTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.engine = create_engine(f'sqlite:///{self.directory.name}/test.db')
        @event.listens_for(self.engine, 'connect')
        def foreign_keys(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
        config = Config(str(Path(__file__).parent / 'alembic.ini'))
        config.attributes['connection'] = self.engine.connect()
        command.upgrade(config, 'head')
        config.attributes['connection'].close()
        self.db = Session(self.engine)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        self.directory.cleanup()

    def test_schedule_boundaries_deduplication_and_persistence(self):
        project = services.create_named(self.db, Project, 'Testprojekt')
        employee = services.create_named(self.db, Employee, 'Testperson')
        services.set_schedule(self.db, project.id, date(2026, 10, 1), date(2026, 10, 3))
        first = services.assign(self.db, project.id, employee.id, date(2026, 10, 1))
        again = services.assign(self.db, project.id, employee.id, date(2026, 10, 1))
        self.assertEqual(first.id, again.id)
        services.assign(self.db, project.id, employee.id, date(2026, 10, 3))
        with self.assertRaises(HTTPException) as error:
            services.assign(self.db, project.id, employee.id, date(2026, 10, 4))
        self.assertEqual(error.exception.status_code, 422)
        with self.assertRaises(HTTPException) as error:
            services.set_schedule(self.db, project.id, date(2026, 10, 2), date(2026, 10, 3))
        self.assertEqual(error.exception.status_code, 409)
        with Session(self.engine) as fresh:
            self.assertEqual(len(fresh.scalars(select(Assignment)).all()), 2)

    def test_groups_and_invalid_references(self):
        employee = services.create_named(self.db, Employee, 'Testperson')
        group = services.create_named(self.db, TeamGroup, 'Testgruppe')
        self.assertEqual(services.set_group(self.db, employee.id, group.id).group_id, group.id)
        with self.assertRaises(HTTPException):
            services.set_group(self.db, employee.id, 'missing')
        self.assertIsNone(services.set_group(self.db, employee.id, None).group_id)
        self.db.add(Assignment(project_id='missing', employee_id=employee.id, day=date(2026, 10, 1)))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_blank_names_are_rejected(self):
        with self.assertRaises(ValueError):
            NameInput(name='   ')
        self.assertEqual(NameInput(name='  Name  ').name, 'Name')

if __name__ == '__main__':
    unittest.main()
