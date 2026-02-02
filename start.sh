#!/bin/bash

# Filesystem Chatbot Startup Script
# This script starts both the backend and frontend servers

echo "Starting Filesystem Chatbot..."
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found!"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo ""
    echo "Please edit .env and add your Gemini API key:"
    echo "   nano .env"
    echo ""
    echo "Get your API key from: https://aistudio.google.com/apikey"
    exit 1
fi

# Check if API key is set
if grep -q "your_gemini_api_key_here" .env; then
    echo "WARNING: Please add your Gemini API key to .env file!"
    echo "   nano .env"
    echo ""
    echo "Get your API key from: https://aistudio.google.com/apikey"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd client && npm install && cd ..
fi

echo ""
echo "Starting servers..."
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""

npm run dev


