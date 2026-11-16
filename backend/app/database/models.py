from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Observer(Base):
    __tablename__ = "observers"

    observer_id = Column(String(64), primary_key=True)
    username = Column(String(64), nullable=False, unique=True)
    email = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    scans = relationship("Scan", back_populates="observer", cascade="all, delete-orphan")
    snapshots = relationship("Snapshot", back_populates="observer", cascade="all, delete-orphan")


class ScanStatus(Base):
    __tablename__ = "scan_statuses"

    status_code = Column(String(32), primary_key=True)
    status_label = Column(String(64), nullable=False)
    description = Column(String)
    is_valid_for_analysis = Column(Boolean, default=False, nullable=False)


class Scan(Base):
    __tablename__ = "scans"

    scan_id = Column(String(64), primary_key=True)
    observer_id = Column(String(64), ForeignKey("observers.observer_id", ondelete="CASCADE"), nullable=False)
    scan_type = Column(String(32), nullable=False)
    status_code = Column(String(32), ForeignKey("scan_statuses.status_code"), nullable=False)
    reported_count = Column(Integer, nullable=False)
    collected_count = Column(Integer, nullable=False)
    duplicate_count = Column(Integer, default=0, nullable=False)
    error_count = Column(Integer, default=0, nullable=False)
    confidence_score = Column(Float, nullable=False)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)

    observer = relationship("Observer", back_populates="scans")
    status = relationship("ScanStatus")
    snapshot = relationship("Snapshot", uselist=False, back_populates="scan")


class Snapshot(Base):
    __tablename__ = "snapshots"

    snapshot_id = Column(String(64), primary_key=True)
    observer_id = Column(String(64), ForeignKey("observers.observer_id", ondelete="CASCADE"), nullable=False)
    scan_id = Column(String(64), ForeignKey("scans.scan_id", ondelete="CASCADE"), unique=True, nullable=False)
    total_followers = Column(Integer, default=0, nullable=False)
    total_following = Column(Integer, default=0, nullable=False)
    total_mutuals = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    observer = relationship("Observer", back_populates="snapshots")
    scan = relationship("Scan", back_populates="snapshot")
    relationships = relationship("SnapshotRelationship", back_populates="snapshot", cascade="all, delete-orphan")
    metric = relationship("SnapshotMetric", uselist=False, back_populates="snapshot", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    user_id = Column(String(64), primary_key=True)
    username = Column(String(64), nullable=False, unique=True)
    full_name = Column(String(128))
    avatar_url = Column(String)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_private = Column(Boolean, default=False, nullable=False)
    first_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class RelationshipType(Base):
    __tablename__ = "relationship_types"

    relationship_type_id = Column(Integer, primary_key=True)
    type_code = Column(String(32), unique=True, nullable=False)
    type_label = Column(String(64), nullable=False)
    follows_observer = Column(Boolean, nullable=False)
    followed_by_observer = Column(Boolean, nullable=False)
    is_mutual = Column(Boolean, nullable=False)


class SnapshotRelationship(Base):
    __tablename__ = "snapshot_relationships"

    snapshot_id = Column(String(64), ForeignKey("snapshots.snapshot_id", ondelete="CASCADE"), primary_key=True)
    target_user_id = Column(String(64), ForeignKey("users.user_id", ondelete="RESTRICT"), primary_key=True)
    relationship_type_id = Column(Integer, ForeignKey("relationship_types.relationship_type_id"), nullable=False)
    observed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    snapshot = relationship("Snapshot", back_populates="relationships")
    target_user = relationship("User")
    relationship_type = relationship("RelationshipType")


class ChangeType(Base):
    __tablename__ = "change_types"

    change_type_id = Column(Integer, primary_key=True)
    type_code = Column(String(32), unique=True, nullable=False)
    description = Column(String(128), nullable=False)
    is_churn = Column(Boolean, default=False, nullable=False)


class RelationshipDelta(Base):
    __tablename__ = "relationship_deltas"

    delta_id = Column(Integer, primary_key=True, autoincrement=True)
    from_snapshot_id = Column(String(64), ForeignKey("snapshots.snapshot_id", ondelete="CASCADE"), nullable=False)
    to_snapshot_id = Column(String(64), ForeignKey("snapshots.snapshot_id", ondelete="CASCADE"), nullable=False)
    target_user_id = Column(String(64), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)
    change_type_id = Column(Integer, ForeignKey("change_types.change_type_id"), nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    from_snapshot = relationship("Snapshot", foreign_keys=[from_snapshot_id])
    to_snapshot = relationship("Snapshot", foreign_keys=[to_snapshot_id])
    target_user = relationship("User")
    change_type = relationship("ChangeType")

    __table_args__ = (
        UniqueConstraint("from_snapshot_id", "to_snapshot_id", "target_user_id", "change_type_id", name="uq_delta_event"),
    )


class SnapshotMetric(Base):
    __tablename__ = "snapshot_metrics"

    metric_id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_id = Column(String(64), ForeignKey("snapshots.snapshot_id", ondelete="CASCADE"), unique=True, nullable=False)
    reciprocity_ratio = Column(Float, nullable=False)
    turnover_rate = Column(Float, nullable=False)
    network_density = Column(Float)
    computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    snapshot = relationship("Snapshot", back_populates="metric")
