from datetime import date
from typing import Annotated
from fastapi import Depends, FastAPI
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import get_session
from .models import Assignment, Customer, Employee, Project, ProjectSchedule, TeamGroup
from . import services

app = FastAPI(title='Sonnenweg Solar', version='0.0.1')
DB = Annotated[Session, Depends(get_session)]

class NameInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)

    @field_validator('name')
    @classmethod
    def clean_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Bitte einen Namen eingeben.')
        return value

class NamedOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str

class EmployeeOutput(NamedOutput):
    group_id: str | None

class GroupInput(BaseModel):
    group_id: str | None

class ScheduleInput(BaseModel):
    start_date: date
    end_date: date

class ScheduleOutput(ScheduleInput):
    model_config = ConfigDict(from_attributes=True)
    project_id: str

class AssignmentInput(BaseModel):
    project_id: str
    employee_id: str
    day: date

class AssignmentOutput(AssignmentInput):
    model_config = ConfigDict(from_attributes=True)
    id: str

def register_collection(path, model, output):
    def list_objects(db: DB):
        return db.scalars(select(model).order_by(model.name, model.id)).all()

    def add_object(data: NameInput, db: DB):
        return services.create_named(db, model, data.name)

    app.add_api_route(f'/api/{path}', list_objects, methods=['GET'], response_model=list[output], name=f'list_{path}')
    app.add_api_route(f'/api/{path}', add_object, methods=['POST'], response_model=output, status_code=201, name=f'create_{path}')

register_collection('projects', Project, NamedOutput)
register_collection('customers', Customer, NamedOutput)
register_collection('employees', Employee, EmployeeOutput)
register_collection('groups', TeamGroup, NamedOutput)

@app.patch('/api/employees/{employee_id}/group', response_model=EmployeeOutput)
def employee_group(employee_id: str, data: GroupInput, db: DB):
    return services.set_group(db, employee_id, data.group_id)

@app.get('/api/schedules', response_model=list[ScheduleOutput])
def schedules(db: DB):
    return db.scalars(select(ProjectSchedule)).all()

@app.put('/api/projects/{project_id}/schedule', response_model=ScheduleOutput)
def schedule(project_id: str, data: ScheduleInput, db: DB):
    return services.set_schedule(db, project_id, data.start_date, data.end_date)

@app.get('/api/assignments', response_model=list[AssignmentOutput])
def assignments(db: DB):
    return db.scalars(select(Assignment)).all()

@app.post('/api/assignments', response_model=AssignmentOutput, status_code=201)
def assignment(data: AssignmentInput, db: DB):
    return services.assign(db, data.project_id, data.employee_id, data.day)

@app.delete('/api/assignments/{assignment_id}', status_code=204)
def remove_assignment(assignment_id: str, db: DB):
    db.delete(services.require(db, Assignment, assignment_id))
    db.commit()
