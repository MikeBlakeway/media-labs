from typing import Union
import httpx


class ComfyClient:
    def __init__(self, base_url: str = "http://localhost:8188", timeout: int = 60):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(timeout=timeout)

    async def run_pipeline(self, payload: Union[dict, bytes]) -> httpx.Response:
        """Send a payload to the ComfyUI pipeline endpoint.

        This is intentionally small: it POSTS JSON if given a dict, otherwise posts raw bytes.
        It returns the httpx.Response so callers can stream or inspect headers.
        """
        url = f"{self.base_url}/api/pipeline"
        headers = {"accept": "*/*"}
        if isinstance(payload, (bytes, bytearray)):
            resp = await self._client.post(url, content=payload, headers=headers)
        else:
            resp = await self._client.post(url, json=payload, headers=headers)
        # Do not raise here; let callers handle non-2xx if they want. But ensure response is returned.
        return resp

    async def close(self) -> None:
        await self._client.aclose()

    async def run_prompt(self, payload: Union[dict, str]) -> httpx.Response:
        """Send a payload to the ComfyUI prompt endpoint (/api/prompt).

        Accepts either a dict or a plain prompt string. Returns the httpx.Response.
        """
        url = f"{self.base_url}/api/prompt"
        headers = {"accept": "*/*"}
        if isinstance(payload, (bytes, bytearray)):
            resp = await self._client.post(url, content=payload, headers=headers)
        else:
            # if payload is a plain string, send as JSON {"prompt": payload}
            if isinstance(payload, str):
                resp = await self._client.post(url, json={"prompt": payload}, headers=headers)
            else:
                resp = await self._client.post(url, json=payload, headers=headers)
        return resp
