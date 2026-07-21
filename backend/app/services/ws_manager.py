from __future__ import annotations

from uuid import UUID
from fastapi import WebSocket
from typing import Dict, Set
import json


class ConnectionManager:
    """Manages WebSocket connections per user."""

    def __init__(self):
        self._connections: dict[UUID, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: UUID):
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = set()
        self._connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: UUID):
        if user_id in self._connections:
            self._connections[user_id].discard(websocket)
            if not self._connections[user_id]:
                del self._connections[user_id]

    async def send_to_user(self, user_id: UUID, message: dict):
        """Send a JSON message to all connections of a user."""
        if user_id not in self._connections:
            return
        disconnected = set()
        for ws in self._connections[user_id]:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.add(ws)
        for ws in disconnected:
            self._connections[user_id].discard(ws)
        if not self._connections[user_id]:
            del self._connections[user_id]

    async def broadcast(self, message: dict):
        """Send to all connected users."""
        for user_id in list(self._connections.keys()):
            await self.send_to_user(user_id, message)


manager = ConnectionManager()
