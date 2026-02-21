"""add_deadline_and_ombudsperson_fields

Revision ID: a1b2c3d4e5f6
Revises: 6864ecd7d91e
Create Date: 2026-02-21 16:00:00.000000

D3: acknowledged_at, resolved_at fuer HinSchG-Fristenampel
D4: forwarded_to_ombudsperson_at/by, ombudsperson_recommendation,
    ombudsperson_notes_encrypted, ombudsperson_reviewed_at/by
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '6864ecd7d91e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # D3: HinSchG-Fristenampel
    op.add_column('cases',
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column('cases',
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True)
    )

    # D4: Ombudsperson-Workflow
    op.add_column('cases',
        sa.Column('forwarded_to_ombudsperson_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column('cases',
        sa.Column('forwarded_to_ombudsperson_by', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.add_column('cases',
        sa.Column('ombudsperson_recommendation', sa.String(20), nullable=True)
    )
    op.add_column('cases',
        sa.Column('ombudsperson_notes_encrypted', sa.Text(), nullable=True)
    )
    op.add_column('cases',
        sa.Column('ombudsperson_reviewed_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column('cases',
        sa.Column('ombudsperson_reviewed_by', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True)
    )

    # Foreign Keys
    op.create_foreign_key(
        'fk_cases_forwarded_to_ombudsperson_by_users',
        'cases', 'users',
        ['forwarded_to_ombudsperson_by'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_cases_ombudsperson_reviewed_by_users',
        'cases', 'users',
        ['ombudsperson_reviewed_by'], ['id'],
        ondelete='SET NULL'
    )

    # Indizes
    op.create_index('ix_cases_forwarded_ombudsperson', 'cases', ['forwarded_to_ombudsperson_at'])
    op.create_index('ix_cases_acknowledged', 'cases', ['acknowledged_at'])


def downgrade() -> None:
    op.drop_index('ix_cases_acknowledged', table_name='cases')
    op.drop_index('ix_cases_forwarded_ombudsperson', table_name='cases')

    op.drop_constraint('fk_cases_ombudsperson_reviewed_by_users', 'cases', type_='foreignkey')
    op.drop_constraint('fk_cases_forwarded_to_ombudsperson_by_users', 'cases', type_='foreignkey')

    op.drop_column('cases', 'ombudsperson_reviewed_by')
    op.drop_column('cases', 'ombudsperson_reviewed_at')
    op.drop_column('cases', 'ombudsperson_notes_encrypted')
    op.drop_column('cases', 'ombudsperson_recommendation')
    op.drop_column('cases', 'forwarded_to_ombudsperson_by')
    op.drop_column('cases', 'forwarded_to_ombudsperson_at')
    op.drop_column('cases', 'resolved_at')
    op.drop_column('cases', 'acknowledged_at')
