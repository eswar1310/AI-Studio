from pydantic import BaseModel
from typing import Optional, Dict


class GenerateResponse(BaseModel):
    model_config = {
        "protected_namespaces": ()
    }
    task_id: str
    status: str


class ResultResponse(BaseModel):
    """
    Response returned when polling /api/result/{task_id}
    - status: queued / running / done / error
    - files: dict { wav: url, mp3: url }
    - meta: prompt, seed, model, timestamps
    - error: error message only if failed
    """
    task_id: str
    status: str
    files: Optional[Dict[str, str]] = None
    meta: Optional[Dict] = None
    error: Optional[str] = None
