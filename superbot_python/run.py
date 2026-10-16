#!/usr/bin/env python3
"""
Entry point for SuperBot Multi-Platform Engine (Telegram, Bale, Rubika)
Phase 1 - Enterprise Architecture
"""
import sys
import os

# Ensure package root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server import start_server

if __name__ == "__main__":
    start_server()
