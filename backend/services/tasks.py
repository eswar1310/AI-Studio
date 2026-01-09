from typing import Dict, Any
from threading import Lock


class TaskStore:
    """
    Simple in-memory task storage.
    Holds:
      - status: queued / running / done / error
      - files: wav/mp3/mp4 links
      - meta: prompt, model, seed, style, etc.
      - error: error message if any
    """

    def __init__(self):
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()

    def create(self, task_id: str, payload: Dict[str, Any]):
        """Create new task entry."""
        with self._lock:
            self._tasks[task_id] = payload

    def set_status(self, task_id: str, status: str, **extra):
        """Update task status and attach any extra fields."""
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id]["status"] = status
                for k, v in extra.items():
                    self._tasks[task_id][k] = v

    def get(self, task_id: str) -> Dict[str, Any] | None:
        """Retrieve task entry."""
        with self._lock:
            return self._tasks.get(task_id)


# ✅ Global TASK STORE instance
TASKS = TaskStore()
