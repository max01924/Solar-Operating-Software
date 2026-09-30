"""Initial named objects and scheduling relations."""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def named_columns():
    return [sa.Column('id', sa.String(36), primary_key=True), sa.Column('name', sa.String(200), nullable=False), sa.Column('created_at', sa.DateTime(timezone=True), nullable=False), sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)]

def upgrade():
    for table in ['projects', 'customers', 'team_groups']:
        op.create_table(table, *named_columns())
    op.create_table('employees', *named_columns(), sa.Column('group_id', sa.String(36), sa.ForeignKey('team_groups.id')))
    op.create_table('project_schedules', sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id'), primary_key=True), sa.Column('start_date', sa.Date(), nullable=False), sa.Column('end_date', sa.Date(), nullable=False), sa.CheckConstraint('end_date >= start_date', name='schedule_valid_range'))
    op.create_table('assignments', sa.Column('id', sa.String(36), primary_key=True), sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id'), nullable=False), sa.Column('employee_id', sa.String(36), sa.ForeignKey('employees.id'), nullable=False), sa.Column('day', sa.Date(), nullable=False), sa.UniqueConstraint('project_id', 'employee_id', 'day', name='assignment_unique'))

def downgrade():
    for table in ['assignments', 'project_schedules', 'employees', 'team_groups', 'customers', 'projects']:
        op.drop_table(table)
