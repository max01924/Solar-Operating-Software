from datetime import date, datetime, timezone
from uuid import uuid4
from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

def new_id():
    return str(uuid4())

def now():
    return datetime.now(timezone.utc)

class NamedObject:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

class Project(NamedObject, Base):
    __tablename__ = 'projects'

class Customer(NamedObject, Base):
    __tablename__ = 'customers'

class TeamGroup(NamedObject, Base):
    __tablename__ = 'team_groups'

class Employee(NamedObject, Base):
    __tablename__ = 'employees'
    group_id: Mapped[str | None] = mapped_column(ForeignKey('team_groups.id'))

class ProjectSchedule(Base):
    __tablename__ = 'project_schedules'
    __table_args__ = (CheckConstraint('end_date >= start_date', name='schedule_valid_range'),)
    project_id: Mapped[str] = mapped_column(ForeignKey('projects.id'), primary_key=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)

class Assignment(Base):
    __tablename__ = 'assignments'
    __table_args__ = (UniqueConstraint('project_id', 'employee_id', 'day', name='assignment_unique'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey('projects.id'))
    employee_id: Mapped[str] = mapped_column(ForeignKey('employees.id'))
    day: Mapped[date] = mapped_column(Date)
