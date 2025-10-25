"""
Provenance Tracker for AI Brain
Tracks origin, quality, and validation of all AI-generated content
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum


class ProvenanceType(Enum):
    """Types of content provenance"""
    AI_GENERATED = "ai_generated"
    USER_CREATED = "user_created"
    AI_SUGGESTED = "ai_suggested"
    COLLABORATIVE = "collaborative"
    IMPORTED = "imported"


class QualityLevel(Enum):
    """Quality levels for content"""
    UNVERIFIED = "unverified"
    REVIEWED = "reviewed"
    VALIDATED = "validated"
    EXPERT_APPROVED = "expert_approved"


class ProvenanceRecord:
    """Record of content provenance and quality"""
    
    def __init__(
        self,
        content_id: str,
        content_type: str,
        provenance_type: ProvenanceType,
        quality_level: QualityLevel = QualityLevel.UNVERIFIED
    ):
        self.content_id = content_id
        self.content_type = content_type  # 'node', 'edge', 'analysis', 'suggestion'
        self.provenance_type = provenance_type
        self.quality_level = quality_level
        
        self.metadata = {
            'created_at': datetime.now().isoformat(),
            'last_updated': datetime.now().isoformat(),
            'creator': None,
            'ai_model': None,
            'confidence_score': None,
            'validation_notes': []
        }
        
        self.lineage: List[Dict[str, Any]] = []  # Track changes over time
        self.reviews: List[Dict[str, Any]] = []  # Track reviews and validations
    
    def add_ai_metadata(self, model: str, confidence: float, reasoning: str):
        """Add AI-specific metadata"""
        self.metadata['ai_model'] = model
        self.metadata['confidence_score'] = confidence
        self.metadata['reasoning'] = reasoning
        self.metadata['last_updated'] = datetime.now().isoformat()
    
    def add_user_metadata(self, user_id: str, action: str):
        """Add user interaction metadata"""
        self.metadata['creator'] = user_id
        self.metadata['last_user_action'] = action
        self.metadata['last_updated'] = datetime.now().isoformat()
    
    def add_to_lineage(self, action: str, details: Dict[str, Any]):
        """Add an entry to the lineage"""
        lineage_entry = {
            'action': action,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }
        self.lineage.append(lineage_entry)
    
    def add_review(self, reviewer: str, rating: int, notes: str):
        """Add a review/validation"""
        review = {
            'reviewer': reviewer,
            'rating': rating,  # 1-5
            'notes': notes,
            'timestamp': datetime.now().isoformat()
        }
        self.reviews.append(review)
        
        # Update quality level based on reviews
        self._update_quality_level()
    
    def _update_quality_level(self):
        """Update quality level based on reviews"""
        if not self.reviews:
            return
        
        avg_rating = sum(r['rating'] for r in self.reviews) / len(self.reviews)
        
        if len(self.reviews) >= 3 and avg_rating >= 4.5:
            self.quality_level = QualityLevel.EXPERT_APPROVED
        elif len(self.reviews) >= 2 and avg_rating >= 4.0:
            self.quality_level = QualityLevel.VALIDATED
        elif len(self.reviews) >= 1 and avg_rating >= 3.0:
            self.quality_level = QualityLevel.REVIEWED
        else:
            self.quality_level = QualityLevel.UNVERIFIED
    
    def get_quality_score(self) -> float:
        """Calculate overall quality score (0-1)"""
        scores = []
        
        # Confidence score
        if self.metadata.get('confidence_score'):
            scores.append(self.metadata['confidence_score'])
        
        # Review ratings
        if self.reviews:
            avg_rating = sum(r['rating'] for r in self.reviews) / len(self.reviews)
            scores.append(avg_rating / 5.0)
        
        # Quality level weight
        quality_weights = {
            QualityLevel.UNVERIFIED: 0.4,
            QualityLevel.REVIEWED: 0.6,
            QualityLevel.VALIDATED: 0.8,
            QualityLevel.EXPERT_APPROVED: 1.0
        }
        scores.append(quality_weights[self.quality_level])
        
        return sum(scores) / len(scores) if scores else 0.5
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        return {
            'content_id': self.content_id,
            'content_type': self.content_type,
            'provenance_type': self.provenance_type.value,
            'quality_level': self.quality_level.value,
            'quality_score': self.get_quality_score(),
            'metadata': self.metadata,
            'lineage': self.lineage,
            'reviews': self.reviews
        }


class ProvenanceTracker:
    """Track provenance for all content in the system"""
    
    def __init__(self):
        self.records: Dict[str, ProvenanceRecord] = {}
    
    def create_record(
        self,
        content_id: str,
        content_type: str,
        provenance_type: ProvenanceType,
        quality_level: QualityLevel = QualityLevel.UNVERIFIED
    ) -> ProvenanceRecord:
        """Create a new provenance record"""
        record = ProvenanceRecord(content_id, content_type, provenance_type, quality_level)
        self.records[content_id] = record
        return record
    
    def get_record(self, content_id: str) -> Optional[ProvenanceRecord]:
        """Get provenance record"""
        return self.records.get(content_id)
    
    def track_ai_content(
        self,
        content_id: str,
        content_type: str,
        model: str,
        confidence: float,
        reasoning: str
    ) -> ProvenanceRecord:
        """Track AI-generated content"""
        record = self.create_record(
            content_id,
            content_type,
            ProvenanceType.AI_GENERATED
        )
        record.add_ai_metadata(model, confidence, reasoning)
        record.add_to_lineage('ai_generation', {
            'model': model,
            'confidence': confidence
        })
        return record
    
    def track_user_content(
        self,
        content_id: str,
        content_type: str,
        user_id: str,
        action: str
    ) -> ProvenanceRecord:
        """Track user-created content"""
        record = self.create_record(
            content_id,
            content_type,
            ProvenanceType.USER_CREATED,
            QualityLevel.REVIEWED  # User content starts as reviewed
        )
        record.add_user_metadata(user_id, action)
        record.add_to_lineage('user_creation', {'user_id': user_id})
        return record
    
    def track_collaborative_edit(
        self,
        content_id: str,
        user_id: str,
        ai_model: str,
        details: Dict[str, Any]
    ):
        """Track collaborative AI-user edit"""
        record = self.get_record(content_id)
        if not record:
            record = self.create_record(
                content_id,
                details.get('content_type', 'unknown'),
                ProvenanceType.COLLABORATIVE
            )
        
        record.provenance_type = ProvenanceType.COLLABORATIVE
        record.add_to_lineage('collaborative_edit', {
            'user_id': user_id,
            'ai_model': ai_model,
            'details': details
        })
    
    def get_high_quality_content(self, min_score: float = 0.7) -> List[ProvenanceRecord]:
        """Get all high-quality content"""
        return [
            record for record in self.records.values()
            if record.get_quality_score() >= min_score
        ]
    
    def get_unverified_content(self) -> List[ProvenanceRecord]:
        """Get all unverified content"""
        return [
            record for record in self.records.values()
            if record.quality_level == QualityLevel.UNVERIFIED
        ]
    
    def get_ai_generated_content(self) -> List[ProvenanceRecord]:
        """Get all AI-generated content"""
        return [
            record for record in self.records.values()
            if record.provenance_type == ProvenanceType.AI_GENERATED
        ]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get provenance statistics"""
        if not self.records:
            return {
                'total_records': 0,
                'by_provenance': {},
                'by_quality': {},
                'average_quality_score': 0.0
            }
        
        by_provenance = {}
        by_quality = {}
        total_score = 0.0
        
        for record in self.records.values():
            # Count by provenance type
            prov_type = record.provenance_type.value
            by_provenance[prov_type] = by_provenance.get(prov_type, 0) + 1
            
            # Count by quality level
            qual_level = record.quality_level.value
            by_quality[qual_level] = by_quality.get(qual_level, 0) + 1
            
            # Sum quality scores
            total_score += record.get_quality_score()
        
        return {
            'total_records': len(self.records),
            'by_provenance': by_provenance,
            'by_quality': by_quality,
            'average_quality_score': total_score / len(self.records)
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize all records"""
        return {
            'records': {
                content_id: record.to_dict()
                for content_id, record in self.records.items()
            },
            'stats': self.get_stats()
        }


# Global provenance tracker instance
provenance_tracker = ProvenanceTracker()
