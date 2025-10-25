"""
Flask Routes for AI Brain
Provides REST API and WebSocket endpoints for AI Brain interactions
"""
from flask import Blueprint, request, jsonify
import uuid
from typing import Dict, Any

ai_brain_bp = Blueprint('ai_brain', __name__)

# WebSocket will be initialized from main app
_socketio = None


def init_socketio(socketio_instance):
    """Initialize SocketIO instance for this blueprint"""
    global _socketio
    _socketio = socketio_instance
    register_socketio_handlers(socketio_instance)


def register_socketio_handlers(socketio):
    """Register all WebSocket event handlers"""
    from flask_socketio import emit, join_room, leave_room
    from ..core.ai_brain import create_ai_brain
    from ..core.context_manager import context_store
    from ..core.provenance_tracker import provenance_tracker
    
    @socketio.on('connect', namespace='/ai_brain')
    def handle_connect():
        """Handle WebSocket connection"""
        emit('connected', {
            'success': True,
            'message': 'Connected to AI Brain'
        })

    @socketio.on('disconnect', namespace='/ai_brain')
    def handle_disconnect():
        """Handle WebSocket disconnection"""
        print('Client disconnected from AI Brain')

    @socketio.on('join_session', namespace='/ai_brain')
    def handle_join_session(data):
        """Join a specific AI Brain session"""
        try:
            session_id = data.get('session_id')
            
            if not session_id:
                emit('error', {'error': 'session_id is required'})
                return
            
            join_room(session_id)
            brain = create_ai_brain(session_id)
            
            emit('session_joined', {
                'success': True,
                'session_id': session_id,
                'capabilities': brain.get_capabilities(),
                'context_summary': brain.get_context_summary()
            })
        except Exception as e:
            emit('error', {'error': str(e)})

    @socketio.on('send_message', namespace='/ai_brain')
    def handle_send_message(data):
        """Handle real-time message to AI Brain"""
        try:
            session_id = data.get('session_id')
            message = data.get('message')
            graph_data = data.get('graph_data')
            
            if not session_id or not message:
                emit('error', {'error': 'session_id and message are required'})
                return
            
            brain = create_ai_brain(session_id)
            
            emit('thinking', {
                'session_id': session_id,
                'status': 'processing'
            }, room=session_id)
            
            response = brain.process_message(message, graph_data)
            
            emit('message_response', {
                'success': True,
                'session_id': session_id,
                'response': response,
                'context_summary': brain.get_context_summary()
            }, room=session_id)
            
        except Exception as e:
            emit('error', {'error': str(e)})


# REST API Endpoints
from ..core.ai_brain import create_ai_brain
from ..core.context_manager import context_store
from ..core.provenance_tracker import provenance_tracker


@ai_brain_bp.route('/brain/session', methods=['POST'])
def create_session():
    """Create a new AI Brain session"""
    try:
        session_id = str(uuid.uuid4())
        brain = create_ai_brain(session_id)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'capabilities': brain.get_capabilities(),
            'message': 'AI Brain session created successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_brain_bp.route('/brain/message', methods=['POST'])
def send_message():
    """Send a message to AI Brain"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        message = data.get('message')
        graph_data = data.get('graph_data')
        
        if not session_id or not message:
            return jsonify({
                'success': False,
                'error': 'session_id and message are required'
            }), 400
        
        brain = create_ai_brain(session_id)
        response = brain.process_message(message, graph_data)
        
        return jsonify({
            'success': True,
            'response': response,
            'context_summary': brain.get_context_summary()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_brain_bp.route('/brain/context/<session_id>', methods=['GET'])
def get_context(session_id):
    """Get conversation context for a session"""
    try:
        context = context_store.get_context(session_id)
        
        if not context:
            return jsonify({
                'success': False,
                'error': 'Session not found'
            }), 404
        
        return jsonify({
            'success': True,
            'context': context.to_dict()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_brain_bp.route('/brain/provenance', methods=['GET'])
def get_provenance_stats():
    """Get provenance tracking statistics"""
    try:
        stats = provenance_tracker.get_stats()
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_brain_bp.route('/brain/capabilities', methods=['GET'])
def get_capabilities():
    """Get AI Brain capabilities"""
    try:
        temp_brain = create_ai_brain('temp')
        
        return jsonify({
            'success': True,
            'capabilities': temp_brain.get_capabilities()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
