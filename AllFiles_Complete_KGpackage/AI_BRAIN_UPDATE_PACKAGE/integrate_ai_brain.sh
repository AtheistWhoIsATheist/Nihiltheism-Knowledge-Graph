#!/bin/bash
# AI Brain Integration Script
# This script automates the integration of AI Brain into your Nihiltheism Knowledge Graph

echo "🤖 AI Brain Integration Script"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "App.jsx" ]; then
    echo "❌ Error: Please run this script from your Nihiltheism-Knowledge-Graph repository root"
    echo "   Make sure App.jsx exists in the current directory"
    exit 1
fi

echo "✅ Repository confirmed"

# Create directories
echo "📁 Creating directories..."
mkdir -p src/core/
mkdir -p src/routes/

# Copy new files (you'll need to manually copy the actual files from the update package)
echo "📋 Please manually copy these files from the AI_BRAIN_UPDATE_PACKAGE:"
echo "   - All files from new_files/backend/src/core/ to src/core/"
echo "   - All files from new_files/backend/src/routes/ to src/routes/"
echo "   - AIBrainChat.jsx from new_files/frontend/src/components/ to src/components/"
echo "   - All documentation files from new_files/docs/ to docs/"

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip install flask flask-cors flask-socketio flask-sqlalchemy python-socketio

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build frontend
echo "🏗️  Building frontend..."
npm run build

echo ""
echo "✅ Integration preparation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the new files manually (listed above)"
echo "2. Update main.py with the provided version"
echo "3. Update App.jsx with AI Brain integration code"
echo "4. Start server: python3 main.py"
echo "5. Open http://localhost:5000 and click 'AI Brain'"
echo ""
echo "🚀 Ready to test!"