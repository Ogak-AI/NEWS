import datetime
from sqlalchemy import Column, Integer, String, Text, Float, JSON
from database import Base


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    url = Column(String, nullable=True)
    publisher = Column(String)
    published_date = Column(String)
    content = Column(Text)
    category = Column(String, default="general")
    ingested_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    lede = Column(Text)
    content = Column(Text)
    digest = Column(Text)
    aggregate_confidence = Column(Float, default=0.0)
    depth_meter = Column(Integer, default=1)
    bias_score = Column(Float, default=0.85)
    readability_score = Column(Float, default=0.85)
    category = Column(String, default="general")
    status = Column(String, default="draft")
    provenance_metadata = Column(JSON)
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
