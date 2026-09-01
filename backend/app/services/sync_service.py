"""
Database Sync — batch inserts sensor data into TimescaleDB.
Replaces database-sync.service.ts from the NestJS version.

Uses an in-memory buffer instead of Redis list (simpler, no external dependency).
Flushes to database every 10 seconds.
"""

import logging
import threading
import uuid
from datetime import datetime, timezone

from app.models.database import SessionLocal, Machine, SensorDataLog

logger = logging.getLogger("db_sync")


class DatabaseSync:
    """
    Buffers sensor data in memory and periodically flushes to TimescaleDB.
    Thread-safe implementation using a lock for the buffer.
    """

    def __init__(self):
        self._buffer: list[dict] = []
        self._lock = threading.Lock()

    def add_to_buffer(self, data: dict):
        """Add sensor data to the in-memory buffer (thread-safe)."""
        with self._lock:
            self._buffer.append(data)

    def flush_to_database(self):
        """
        Flush buffered sensor data to TimescaleDB.
        Called periodically by the scheduler in main.py.
        Replaces the Redis rpop + Prisma createMany pattern.
        """
        # Grab current buffer and clear it atomically
        with self._lock:
            if not self._buffer:
                return
            records = self._buffer.copy()
            self._buffer.clear()

        logger.debug(f"Syncing {len(records)} records to TimescaleDB...")

        db = SessionLocal()
        try:
            # Ensure machines exist (upsert pattern)
            machine_ids = set(r["motorId"] for r in records)
            for machine_id in machine_ids:
                existing = db.query(Machine).filter(Machine.id == machine_id).first()
                if not existing:
                    machine = Machine(
                        id=machine_id,
                        name=machine_id,
                        type="HV" if "HV" in machine_id else "MV",
                        status="NORMAL",
                    )
                    db.add(machine)

            db.flush()

            # Batch insert sensor logs
            sensor_logs = [
                SensorDataLog(
                    id=str(uuid.uuid4()),
                    machine_id=r["motorId"],
                    temperature=r["temperature"],
                    vibration=r["vibration"],
                    current_r=r["currentR"],
                    current_s=r["currentS"],
                    current_t=r["currentT"],
                    current_n=r["currentN"],
                    voltage_r=r["voltageR"],
                    voltage_s=r["voltageS"],
                    voltage_t=r["voltageT"],
                    timestamp=datetime.fromisoformat(r["timestamp"]),
                )
                for r in records
            ]

            db.add_all(sensor_logs)
            db.commit()
            logger.debug(f"✅ Successfully saved {len(records)} records to database.")

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to sync records to database: {e}")
            # Put records back in buffer for retry
            with self._lock:
                self._buffer = records + self._buffer
        finally:
            db.close()

    def save_alert(self, motor_id: str, severity: str, message: str, ai_prediction: str | None = None):
        """Save an AI alert to the database."""
        db = SessionLocal()
        try:
            alert = Alert(
                id=str(uuid.uuid4()),
                machine_id=motor_id,
                message=message,
                severity=severity,
                ai_prediction=ai_prediction,
            )
            db.add(alert)

            # Update machine status
            machine = db.query(Machine).filter(Machine.id == motor_id).first()
            if machine:
                machine.status = severity
                machine.updated_at = datetime.now(timezone.utc)

            db.commit()
            logger.info(f"Alert saved for {motor_id}: {severity}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to save alert: {e}")
        finally:
            db.close()


# Import Alert here to avoid circular imports
from app.models.database import Alert

# Singleton instance
db_sync = DatabaseSync()
