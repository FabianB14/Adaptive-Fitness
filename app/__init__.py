"""Render start-command shim — NOT the real package.

The application lives in ``backend/app``. When the Render service's Root
Directory isn't set to ``backend``, uvicorn runs from the repo root and
``uvicorn app.main:app`` imports *this* package. Extending ``__path__``
makes ``app.main`` (and every ``app.*`` import inside the backend) resolve
into ``backend/app``, so the default start command boots either way.

With Root Directory set to ``backend`` this file is outside the deployed
tree and never imported.
"""

from pathlib import Path

__path__.append(str(Path(__file__).resolve().parent.parent / "backend" / "app"))
