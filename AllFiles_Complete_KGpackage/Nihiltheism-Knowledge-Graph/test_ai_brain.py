"""
AI Brain Test Module
Simple test file to validate AI Brain functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.core.ai_brain import AIBrain
from src.core.context_manager import ConversationContext
from src.core.provenance_tracker import ProvenanceTracker, QualityLevel

def test_basic_functionality():
    """Test basic AI Brain initialization and message processing"""
    print("🧠 Testing AI Brain Basic Functionality...")
    
    # Test AI Brain initialization
    brain = AIBrain("test-session-123")
    print(f"✅ AI Brain initialized with session ID: {brain.session_id}")
    
    # Test message processing
    response = brain.process_message("Brainstorm concepts related to existential anxiety")
    print(f"✅ AI Brain processed message: {response[:100]}...")
    
    return True

def test_context_manager():
    """Test conversation context management"""
    print("\n📝 Testing Context Manager...")
    
    context = ConversationContext("test-session-456")
    context.add_message("user", "What is meaninglessness?")
    context.add_message("ai", "Meaninglessness is...")
    
    messages = context.get_recent_messages(5)
    print(f"✅ Context manager captured {len(messages)} messages")
    
    return True

def test_provenance_tracker():
    """Test content quality tracking"""
    print("\n🔍 Testing Provenance Tracker...")
    
    tracker = ProvenanceTracker()
    suggestion_id = tracker.track_suggestion(
        content="Test suggestion",
        origin_type="ai",
        context="test"
    )
    
    print(f"✅ Provenance tracker created suggestion ID: {suggestion_id}")
    
    return True

def main():
    """Run all AI Brain tests"""
    print("🚀 Starting AI Brain Tests...\n")
    
    try:
        test_basic_functionality()
        test_context_manager()
        test_provenance_tracker()
        
        print("\n🎉 All AI Brain tests completed successfully!")
        print("✅ AI Brain system is ready for use")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()