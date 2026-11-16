from pydantic import BaseModel, Field
from datetime import datetime

class MetricResponse(BaseModel):
    metric_id: int
    snapshot_id: str
    reciprocity_ratio: float = Field(..., ge=0.0, le=1.0)
    turnover_rate: float = Field(..., ge=0.0)
    network_density: float = Field(..., ge=0.0, le=1.0)
    computed_at: datetime

    class Config:
        from_attributes = True

class AnomalyReport(BaseModel):
    anomaly_detected: bool
    risk_level: str
    description: str
    flagged_accounts_count: int
