"""
Database module — SQLAlchemy models + TimescaleDB hypertable setup.
Replaces Prisma ORM from the NestJS version.

Models: Machine, SensorDataLog, Alert (matching the original Prisma schema).
"""

import logging
from datetime import datetime, timezone

from typing import Generator
from sqlalchemy import (
    String, Float, DateTime, Boolean, Text,
    ForeignKey, Index, create_engine, text
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session, Mapped, mapped_column
from app.core.config import settings

logger = logging.getLogger("database")

# --- SQLAlchemy Engine & Session ---
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# --- Models (matching original Prisma schema) ---

class Machine(Base):
    """Represents an industrial motor/machine being monitored."""
    __tablename__ = "machines"

    id: Mapped[str] = mapped_column(String, primary_key=True)                       # e.g., 'Motor-HV-01'
    type: Mapped[str] = mapped_column(String, nullable=False)                       # 'HV' or 'MV'
    name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="NORMAL")                   # NORMAL, WARNING, CRITICAL
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    logs = relationship("SensorDataLog", back_populates="machine", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="machine", cascade="all, delete-orphan")


class SensorDataLog(Base):
    """Time-series sensor readings from a machine."""
    __tablename__ = "sensor_data_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    machine_id: Mapped[str] = mapped_column(String, ForeignKey("machines.id"), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, nullable=False)
    vibration: Mapped[float] = mapped_column(Float, nullable=False)
    current_r: Mapped[float] = mapped_column(Float, nullable=False)
    current_s: Mapped[float] = mapped_column(Float, nullable=False)
    current_t: Mapped[float] = mapped_column(Float, nullable=False)
    current_n: Mapped[float] = mapped_column(Float, nullable=False)
    voltage_r: Mapped[float] = mapped_column(Float, nullable=False)
    voltage_s: Mapped[float] = mapped_column(Float, nullable=False)
    voltage_t: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    machine = relationship("Machine", back_populates="logs")

    __table_args__ = (
        Index("idx_sensor_machine_id", "machine_id"),
        Index("idx_sensor_timestamp", "timestamp"),
    )


class Alert(Base):
    """AI-generated alerts for anomalies detected in sensor data."""
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    machine_id: Mapped[str] = mapped_column(String, ForeignKey("machines.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)           # WARNING, CRITICAL
    ai_prediction: Mapped[str | None] = mapped_column(Text, nullable=True)          # Raw ML output / confidence score
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)

    machine = relationship("Machine", back_populates="alerts")


# --- Database Initialization ---

def init_db():
    """
    Create all tables and convert sensor_data_logs to a TimescaleDB hypertable.
    Safe to call multiple times — hypertable creation is idempotent.
    """
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")

    # Convert sensor_data_logs to TimescaleDB hypertable for time-series optimization
    try:
        with engine.connect() as conn:
            # Enable TimescaleDB extension
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
            conn.commit()

            # Convert to hypertable (skip if already a hypertable)
            conn.execute(text("""
                SELECT create_hypertable(
                    'sensor_data_logs', 
                    by_range('timestamp'),
                    if_not_exists => TRUE
                );
            """))
            conn.commit()
            logger.info("TimescaleDB hypertable created for 'sensor_data_logs'.")
    except Exception as e:
        logger.warning(f"TimescaleDB setup note: {e} (this is OK if using plain PostgreSQL)")


def get_db() -> Generator[Session, None, None]:
    """Get a database session — use as a dependency or context manager."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
