"""
In-memory SSE notification bus.
Maps recruiter email -> list of asyncio.Queue for active SSE connections.
"""
import asyncio
from collections import defaultdict
from typing import Dict, List

# email -> list of queues (one per active browser tab / connection)
_subscribers: Dict[str, List[asyncio.Queue]] = defaultdict(list)


def subscribe(email: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _subscribers[email].append(q)
    return q


def unsubscribe(email: str, q: asyncio.Queue) -> None:
    try:
        _subscribers[email].remove(q)
    except ValueError:
        pass


async def publish(email: str, event: dict) -> None:
    """Push an event to all active SSE connections for a recruiter."""
    queues = list(_subscribers.get(email, []))
    for q in queues:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass  # Drop if the client isn't consuming
