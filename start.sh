#!/bin/bash

echo "🚀 Starting AXL Guestlist Website..."
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:3001"
echo "📧 Gmail monitoring: Enabled"
echo ""

# Start backend in background from email-notification-backend directory
(cd email-notification-backend && npm run dev) &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background from root directory
npm run dev &
FRONTEND_PID=$!

echo "✅ Both services started!"
echo "🔴 Press Ctrl+C to stop both services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on exit
trap cleanup INT TERM

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 