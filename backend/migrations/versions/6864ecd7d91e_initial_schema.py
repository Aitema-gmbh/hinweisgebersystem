"""initial schema - Revision ID: 6864ecd7d91e"""
from alembic import op
import sqlalchemy as sa

revision = '6864ecd7d91e'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    pass  # Schema wurde bereits durch DB-Setup erstellt

def downgrade() -> None:
    pass
