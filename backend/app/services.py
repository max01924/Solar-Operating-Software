from datetime import date
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Assignment, Employee, Project, ProjectSchedule, TeamGroup

def require(session: Session, model, object_id: str):
    obj = session.get(model, object_id)
    if obj is None:
        raise HTTPException(404, 'Objekt nicht gefunden.')
    return obj

def create_named(session: Session, model, name: str):
    obj = model(name=name)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

def set_group(session: Session, employee_id: str, group_id: str | None):
    employee = require(session, Employee, employee_id)
    if group_id:
        require(session, TeamGroup, group_id)
    employee.group_id = group_id
    session.commit()
    return employee

def set_schedule(session: Session, project_id: str, start: date, end: date):
    require(session, Project, project_id)
    if end < start:
        raise HTTPException(422, 'Das Ende muss am oder nach dem Start liegen.')
    existing = session.scalars(select(Assignment).where(Assignment.project_id == project_id)).all()
    if any(a.day < start or a.day > end for a in existing):
        raise HTTPException(409, 'Der neue Zeitraum würde bestehende Zuordnungen ausschließen. Entferne diese zuerst.')
    schedule = session.get(ProjectSchedule, project_id)
    if schedule is None:
        schedule = ProjectSchedule(project_id=project_id, start_date=start, end_date=end)
        session.add(schedule)
    else:
        schedule.start_date, schedule.end_date = start, end
    session.commit()
    return schedule

def assign(session: Session, project_id: str, employee_id: str, day: date):
    require(session, Project, project_id)
    require(session, Employee, employee_id)
    schedule = session.get(ProjectSchedule, project_id)
    if schedule is None or not schedule.start_date <= day <= schedule.end_date:
        raise HTTPException(422, 'Der Tag muss im Projektzeitraum liegen.')
    existing = session.scalar(select(Assignment).where(Assignment.project_id == project_id, Assignment.employee_id == employee_id, Assignment.day == day))
    if existing:
        return existing
    obj = Assignment(project_id=project_id, employee_id=employee_id, day=day)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj
