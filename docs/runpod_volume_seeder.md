# Seeder Worker — Extensible Volume Ops (RunPod Serverless)

Easily extend the **Seeder** image into a small **volume operations service** that runs inside RunPod Serverless and writes to the same Network Volume mounted at **`/runpod-volume`**. Keep your ComfyUI endpoint unchanged; add new behaviors by introducing new **`op`** (or `task`) values handled by the same worker.

---

## 0) Design goals

- **Single tiny image** with a **router** for multiple operations.
- **Idempotent** and **safe by default** (path sandboxing; dry‑run).
- **Composable** JSON contracts so your Next.js app (or an LLM agent) can orchestrate CRUD + model tasks.
- **Zero idle cost**: deploy on Serverless Flex with Active=0.

---

## 1) Supported operations (initial set)

All requests POST to RunPod Serverless **`/run`** with an `input` payload:

```json
{
  "op": "seed|verify|ls|stat|mkdir|rm|mv|checksum|df|gc_cache",
  "args": {
    /* op-specific shape */
  }
}
```

### Seed models (download from Hugging Face)

- **`op: "seed"`**
- **Args:** `{ manifest: Entry[], dryRun?: boolean }` where each `Entry` has:
  - `repo` (string) — HF repo id
  - `remote` (string) — path inside repo (single file)
  - `destDir` (string) — absolute path under `/runpod-volume`
  - `filename` (string) — final local filename (allows rename)
  - `required` (boolean, default true)

**Returns:** list of `{status: downloaded|skipped|failed-optional, dest, bytes?, sha256?}`

### Verify (presence check without downloading)

- **`op: "verify"`**
- **Args:** `{ manifest: Entry[] }`
- **Returns:** `{ present: [...], missing: [...] }`

### List directory

- **`op: "ls"`**
- **Args:** `{ path: "/runpod-volume/...", recursive?: boolean, max?: number, pattern?: string }`
- **Returns:** array of `{ path, type: file|dir, bytes, mtime }`

### File/Dir stat

- **`op: "stat"`** — one or more targets
- **Args:** `{ paths: ["/runpod-volume/...", ...], checksum?: boolean }`
- **Returns:** `{ path, exists, type, bytes, mtime, sha256? }[]`

### Make directory

- **`op: "mkdir"`**
- **Args:** `{ path: "/runpod-volume/...", parents?: boolean }`

### Remove (guarded)

- **`op: "rm"`** (files only by default; dirs with `recursive: true`)
- **Args:** `{ paths: ["/runpod-volume/..."], recursive?: boolean, dryRun?: boolean }`
- **Env gate:** `ALLOW_DELETE=true` required on the endpoint.

### Move/Rename

- **`op: "mv"`**
- **Args:** `{ src: "/runpod-volume/...", dest: "/runpod-volume/...", overwrite?: boolean }`

### Checksum

- **`op: "checksum"`**
- **Args:** `{ paths: ["/runpod-volume/..."], algo?: "sha256" }`

### Disk usage

- **`op: "df"`**
- **Args:** `{ paths?: ["/runpod-volume/..."], maxDepth?: number }`

### Cache GC (optional)

- **`op: "gc_cache"`** — trim old/orphaned files under `HF_HOME` (default `/runpod-volume/hf_cache`)
- **Args:** `{ maxSizeGB?: number, dryRun?: boolean }`

> You can add more ops (e.g., `mirror_s3`, `reconcile_workflow`) by following the same router pattern below.

---

## 2) Security & safety

- **Path sandboxing:** every op must resolve inside `/runpod-volume`.
- **Normalize & validate:** resolve `realpath` and reject path traversal.
- **Gate deletions:** require `ALLOW_DELETE=true` env + `dryRun` default.
- **Rate limit / concurrency:** set Serverless concurrency=1; use a simple file lock for critical sections.
- **Audit log:** append JSONL to `/runpod-volume/.ops/log.jsonl`.

---

## 3) Reference handler (Python)

Drop‐in `handler.py` with a small router. This version includes `seed`, `verify`, `ls`, `stat`, `mkdir`, `rm`, `mv`, `checksum`, `df`, `gc_cache`.

```python
# handler.py
import os, json, re, shutil, hashlib, time
from pathlib import Path
from typing import Dict, Any, List, Iterable
import runpod
from huggingface_hub import hf_hub_download

ROOT = "/runpod-volume"
HF_HOME = os.environ.get("HF_HOME", f"{ROOT}/hf_cache")
os.environ["HF_HOME"] = HF_HOME
ALLOW_DELETE = os.environ.get("ALLOW_DELETE", "false").lower() == "true"

# ---- helpers ----

def within_root(p: str) -> Path:
    rp = Path(p).resolve()
    if not str(rp).startswith(str(Path(ROOT).resolve())):
        raise ValueError(f"path outside root: {p}")
    return rp

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1<<20), b''):
            h.update(chunk)
    return h.hexdigest()

def log_event(ev: Dict[str, Any]):
    try:
        logp = within_root(f"{ROOT}/.ops/log.jsonl")
        logp.parent.mkdir(parents=True, exist_ok=True)
        with logp.open('a') as f:
            f.write(json.dumps({"ts": time.time(), **ev}) + "\n")
    except Exception:
        pass

# ---- ops ----

def op_seed(args: Dict[str, Any]) -> Dict[str, Any]:
    manifest: List[Dict[str, Any]] = args.get("manifest", [])
    dry = bool(args.get("dryRun", False))
    results = []
    for e in manifest:
        repo = e["repo"]
        remote = e["remote"]
        dest_dir = within_root(e["destDir"])
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / e["filename"]
        required = bool(e.get("required", True))
        if dest.exists():
            results.append({"status":"skipped","dest":str(dest),"bytes":dest.stat().st_size,"sha256":sha256(dest)})
            continue
        if dry:
            results.append({"status":"would-download","dest":str(dest)})
            continue
        try:
            cached = hf_hub_download(repo_id=repo, filename=remote, token=os.getenv("HF_TOKEN"))
            shutil.copy2(cached, dest)
            results.append({"status":"downloaded","dest":str(dest),"bytes":dest.stat().st_size,"sha256":sha256(dest)})
        except Exception as ex:
            if required:
                return {"ok": False, "error": str(ex), "failedEntry": e, "results": results}
            results.append({"status":"failed-optional","error":str(ex), **e})
    return {"ok": True, "results": results}


def op_verify(args: Dict[str, Any]) -> Dict[str, Any]:
    present, missing = [], []
    for e in args.get("manifest", []):
        dest = within_root(e["destDir"]) / e["filename"]
        (present if dest.exists() else missing).append(str(dest))
    return {"present": present, "missing": missing}


def op_ls(args: Dict[str, Any]) -> List[Dict[str, Any]]:
    root = within_root(args["path"]) if "path" in args else Path(ROOT)
    recursive = bool(args.get("recursive", False))
    maxn = int(args.get("max", 1000))
    pattern = args.get("pattern")
    out = []
    if recursive:
        for p in root.rglob('*'):
            if len(out) >= maxn: break
            if pattern and not re.search(pattern, str(p)): continue
            st = p.stat()
            out.append({"path": str(p), "type": "dir" if p.is_dir() else "file", "bytes": st.st_size, "mtime": st.st_mtime})
    else:
        for p in root.iterdir():
            if len(out) >= maxn: break
            if pattern and not re.search(pattern, str(p)): continue
            st = p.stat()
            out.append({"path": str(p), "type": "dir" if p.is_dir() else "file", "bytes": st.st_size, "mtime": st.st_mtime})
    return out


def op_stat(args: Dict[str, Any]) -> List[Dict[str, Any]]:
    ck = bool(args.get("checksum", False))
    res = []
    for path in args.get("paths", []):
        try:
            p = within_root(path)
            if not p.exists():
                res.append({"path": str(p), "exists": False})
                continue
            st = p.stat()
            item = {"path": str(p), "exists": True, "type": "dir" if p.is_dir() else "file", "bytes": st.st_size, "mtime": st.st_mtime}
            if ck and p.is_file():
                item["sha256"] = sha256(p)
            res.append(item)
        except Exception as ex:
            res.append({"path": path, "error": str(ex)})
    return res


def op_mkdir(args: Dict[str, Any]) -> Dict[str, Any]:
    p = within_root(args["path"]) ; parents = bool(args.get("parents", True))
    p.mkdir(parents=parents, exist_ok=True)
    return {"ok": True, "path": str(p)}


def op_rm(args: Dict[str, Any]) -> Dict[str, Any]:
    if not ALLOW_DELETE:
        return {"ok": False, "error": "deletes disabled; set ALLOW_DELETE=true"}
    dry = bool(args.get("dryRun", True))
    recursive = bool(args.get("recursive", False))
    results = []
    for path in args.get("paths", []):
        p = within_root(path)
        if not p.exists():
            results.append({"path": str(p), "status": "missing"}); continue
        if dry:
            results.append({"path": str(p), "status": "would-delete"}); continue
        if p.is_dir():
            if not recursive:
                results.append({"path": str(p), "status": "dir-not-deleted (set recursive:true)"}); continue
            shutil.rmtree(p)
        else:
            p.unlink()
        results.append({"path": str(p), "status": "deleted"})
    return {"ok": True, "results": results}


def op_mv(args: Dict[str, Any]) -> Dict[str, Any]:
    src = within_root(args["src"]) ; dest = within_root(args["dest"]) ; overwrite = bool(args.get("overwrite", False))
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and not overwrite:
        return {"ok": False, "error": "dest exists; set overwrite:true", "dest": str(dest)}
    shutil.move(str(src), str(dest))
    return {"ok": True, "src": str(src), "dest": str(dest)}


def op_checksum(args: Dict[str, Any]) -> List[Dict[str, Any]]:
    res = []
    for path in args.get("paths", []):
        p = within_root(path)
        if not p.exists() or not p.is_file():
            res.append({"path": str(p), "error": "not a file or missing"}); continue
        res.append({"path": str(p), "sha256": sha256(p), "bytes": p.stat().st_size})
    return res


def op_df(args: Dict[str, Any]) -> Dict[str, Any]:
    paths = args.get("paths", [ROOT])
    out = []
    for path in paths:
        p = within_root(path)
        total = 0
        for sub in p.rglob('*'):
            if sub.is_file():
                try: total += sub.stat().st_size
                except Exception: pass
        out.append({"path": str(p), "bytes": total})
    return {"ok": True, "usage": out}


def op_gc_cache(args: Dict[str, Any]) -> Dict[str, Any]:
    home = Path(os.environ.get("HF_HOME", HF_HOME))
    dry = bool(args.get("dryRun", True))
    max_gb = float(args.get("maxSizeGB", 50))
    max_bytes = max_gb * (1<<30)
    reclaimed = 0
    items = sorted([p for p in home.rglob('*') if p.is_file()], key=lambda x: x.stat().st_mtime)
    total = sum(p.stat().st_size for p in items)
    victims = []
    while total > max_bytes and items:
        p = items.pop(0)
        sz = p.stat().st_size
        total -= sz
        reclaimed += sz
        victims.append({"path": str(p), "bytes": sz})
        if not dry:
            try: p.unlink()
            except Exception: pass
    return {"ok": True, "reclaimed": reclaimed, "dryRun": dry, "victims": victims}

# ---- router ----

OPS = {
    "seed": op_seed,
    "verify": op_verify,
    "ls": op_ls,
    "stat": op_stat,
    "mkdir": op_mkdir,
    "rm": op_rm,
    "mv": op_mv,
    "checksum": op_checksum,
    "df": op_df,
    "gc_cache": op_gc_cache,
}


def handler(job):
    inp = job.get("input", {})
    op = inp.get("op") or inp.get("task")
    if op not in OPS:
        return {"ok": False, "error": f"unknown op '{op}'", "supported": list(OPS.keys())}
    args = inp.get("args", inp)
    res = OPS[op](args)
    log_event({"op": op, "args": {k: v for k, v in args.items() if k not in ("manifest",)}, "ok": True})
    return res

runpod.serverless.start({"handler": handler})
```

**Environment variables (Seeder endpoint):**

- `HF_TOKEN` — Hugging Face token with access to gated models.
- `HF_HOME=/runpod-volume/hf_cache` — cache on the shared volume.
- `HF_HUB_ENABLE_HF_TRANSFER=1` _(optional)_ — faster transfers if `huggingface_hub[hf_transfer]` is installed.
- `ALLOW_DELETE=true` _(optional)_ — enable `rm` operations (defaults to **disabled**).

---

## 4) Dockerfile (Seeder)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN pip install --no-cache-dir runpod "huggingface_hub[hf_transfer]"
COPY handler.py .
CMD ["python", "handler.py"]
```

> Deploy as a separate **Serverless endpoint** attached to the **same Network Volume** as ComfyUI. Keep concurrency=1 and Flex Active=0.

---

## 5) Client request examples

### Seed (full manifest)

```json
{
  "op": "seed",
  "args": {
    "manifest": [
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/diffusion_models/wan2.1_flf2v_720p_14B_fp8_e4m3fn.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "wan2.1_flf2v_14b_fp8_e4m3fn_scaled.safetensors",
        "required": true
      },
      {
        "repo": "Comfy-Org/Wan_2.1_ComfyUI_repackaged",
        "remote": "split_files/diffusion_models/wan2.1_t2v_1.3B_fp16.safetensors",
        "destDir": "/runpod-volume/ComfyUI/models/diffusion_models",
        "filename": "wan2.1_t2v_1.3B_fp16.safetensors",
        "required": true
      }
    ]
  }
}
```

### Verify

```json
{
  "op": "verify",
  "args": {
    "manifest": [
      { "destDir": "/runpod-volume/ComfyUI/models/diffusion_models", "filename": "wan2.1_t2v_1.3B_fp16.safetensors" }
    ]
  }
}
```

### List & stat

```json
{ "op": "ls", "args": { "path": "/runpod-volume/ComfyUI/models", "recursive": false, "max": 200 }}
{ "op": "stat", "args": { "paths": ["/runpod-volume/ComfyUI/models/diffusion_models/sdxl_base.safetensors"], "checksum": true }}
```

### Move, remove (guarded)

```json
{ "op": "mv", "args": { "src": "/runpod-volume/tmp/foo.safetensors", "dest": "/runpod-volume/ComfyUI/models/diffusion_models/foo.safetensors", "overwrite": false }}
{ "op": "rm", "args": { "paths": ["/runpod-volume/tmp/old.safetensors"], "dryRun": true }}
```

### Disk usage & cache GC

```json
{ "op": "df", "args": { "paths": ["/runpod-volume/ComfyUI/models", "/runpod-volume/hf_cache"] }}
{ "op": "gc_cache", "args": { "maxSizeGB": 40, "dryRun": true }}
```

---

## 6) Next.js helper (caller route)

Create `src/app/api/volume/route.ts` to forward any op to the Seeder endpoint.

```ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`https://api.runpod.ai/v2/${process.env.SEED_ENDPOINT_ID}/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input: body })
  })
  const json = await res.json()
  return NextResponse.json(json, { status: res.ok ? 200 : 500 })
}
```

---

## 7) Extending with new endpoints (ops)

1. **Add a function** `op_<name>(args)` in `handler.py`.
2. **Register it** in `OPS = { ... }`.
3. **Define schema** for `args` (document in your repo).
4. **Update your client** to send `{ op: "<name>", args: {...} }`.

No new Docker image or serverless endpoint is required—just redeploy the existing Seeder image when you add an op.
