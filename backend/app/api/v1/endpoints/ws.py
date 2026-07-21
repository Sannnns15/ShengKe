from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.security import decode_access_token
from app.services.ws_manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    # Verify token
    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=4001)
        return

    user_id = UUID(payload.get("sub"))
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive; receive pings
            data = await websocket.receive_text()
            # Client can send "ping", server responds "pong"
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
