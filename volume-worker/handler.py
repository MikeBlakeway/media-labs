# handler.py
import os, json, re, shutil, hashlib, time
from pathlib import Path
from typing import Dict, Any, List, Iterable
import runpod
from huggingface_hub import hf_hub_download

ROOT = os.environ.get("ROOT", "/runpod-volume")
HF_HOME = os.environ.get("HF_HOME", f"{ROOT}/hf_cache")
os.environ["HF_HOME"] = HF_HOME
ALLOW_DELETE = os.environ.get("ALLOW_DELETE", "false").lower() == "true"

# ---- helpers ----

def within_root(p: str) -> Path:
    """Ensure path is within ROOT and return resolved Path"""
    rp = Path(p).resolve()
    if not str(rp).startswith(str(Path(ROOT).resolve())):
        raise ValueError(f"path outside root: {p}")
    return rp

def sha256(path: Path) -> str:
    """Calculate SHA256 hash of file"""
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1<<20), b''):
            h.update(chunk)
    return h.hexdigest()

def log_event(ev: Dict[str, Any]):
    """Log operation to audit log"""
    try:
        logp = within_root(f"{ROOT}/.ops/log.jsonl")
        logp.parent.mkdir(parents=True, exist_ok=True)
        with logp.open('a') as f:
            f.write(json.dumps({"ts": time.time(), **ev}) + "\n")
    except Exception:
        pass

# ---- operations ----

def op_seed(args: Dict[str, Any]) -> Dict[str, Any]:
    """Download models from HuggingFace based on manifest"""
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
            results.append({
                "status": "skipped",
                "dest": str(dest),
                "bytes": dest.stat().st_size,
                "sha256": sha256(dest)
            })
            continue

        if dry:
            results.append({"status": "would-download", "dest": str(dest)})
            continue

        try:
            cached = hf_hub_download(
                repo_id=repo,
                filename=remote,
                token=os.getenv("HF_TOKEN")
            )
            shutil.copy2(cached, dest)
            results.append({
                "status": "downloaded",
                "dest": str(dest),
                "bytes": dest.stat().st_size,
                "sha256": sha256(dest)
            })
        except Exception as ex:
            if required:
                return {
                    "ok": False,
                    "error": str(ex),
                    "failedEntry": e,
                    "results": results
                }
            results.append({
                "status": "failed-optional",
                "error": str(ex),
                **e
            })

    return {"ok": True, "results": results}


def op_verify(args: Dict[str, Any]) -> Dict[str, Any]:
    """Verify presence of models without downloading"""
    manifest = args.get("manifest", [])
    present, missing = [], []

    for e in manifest:
        dest = within_root(e["destDir"]) / e["filename"]
        (present if dest.exists() else missing).append(str(dest))

    return {"present": present, "missing": missing}


def op_ls(args: Dict[str, Any]) -> List[Dict[str, Any]]:
    """List directory contents"""
    root = within_root(args["path"]) if "path" in args else Path(ROOT)
    recursive = bool(args.get("recursive", False))
    maxn = int(args.get("max", 1000))
    pattern = args.get("pattern")
    out = []

    if recursive:
        for p in root.rglob('*'):
            if len(out) >= maxn:
                break
            if pattern and not re.search(pattern, str(p)):
                continue
            st = p.stat()
            out.append({
                "path": str(p),
                "type": "dir" if p.is_dir() else "file",
                "bytes": st.st_size,
                "mtime": st.st_mtime
            })
    else:
        for p in root.iterdir():
            if len(out) >= maxn:
                break
            if pattern and not re.search(pattern, str(p)):
                continue
            st = p.stat()
            out.append({
                "path": str(p),
                "type": "dir" if p.is_dir() else "file",
                "bytes": st.st_size,
                "mtime": st.st_mtime
            })

    return out


def op_stat(args: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get file/directory statistics"""
    ck = bool(args.get("checksum", False))
    res = []

    for path in args.get("paths", []):
        try:
            p = within_root(path)
            if not p.exists():
                res.append({"path": str(p), "exists": False})
                continue

            st = p.stat()
            item = {
                "path": str(p),
                "exists": True,
                "type": "dir" if p.is_dir() else "file",
                "bytes": st.st_size,
                "mtime": st.st_mtime
            }

            if ck and p.is_file():
                item["sha256"] = sha256(p)

            res.append(item)
        except Exception as ex:
            res.append({"path": path, "error": str(ex)})

    return res


def op_mkdir(args: Dict[str, Any]) -> Dict[str, Any]:
    """Create directory"""
    p = within_root(args["path"])
    parents = bool(args.get("parents", True))
    p.mkdir(parents=parents, exist_ok=True)
    return {"ok": True, "path": str(p)}


def op_rm(args: Dict[str, Any]) -> Dict[str, Any]:
    """Remove files/directories (guarded)"""
    if not ALLOW_DELETE:
        return {"ok": False, "error": "deletes disabled; set ALLOW_DELETE=true"}

    dry = bool(args.get("dryRun", True))
    recursive = bool(args.get("recursive", False))
    results = []

    for path in args.get("paths", []):
        p = within_root(path)
        if not p.exists():
            results.append({"path": str(p), "status": "missing"})
            continue

        if dry:
            results.append({"path": str(p), "status": "would-delete"})
            continue

        if p.is_dir():
            if not recursive:
                results.append({
                    "path": str(p),
                    "status": "dir-not-deleted (set recursive:true)"
                })
                continue
            shutil.rmtree(p)
        else:
            p.unlink()

        results.append({"path": str(p), "status": "deleted"})

    return {"ok": True, "results": results}


def op_mv(args: Dict[str, Any]) -> Dict[str, Any]:
    """Move/rename files or directories"""
    src = within_root(args["src"])
    dest = within_root(args["dest"])
    overwrite = bool(args.get("overwrite", False))

    dest.parent.mkdir(parents=True, exist_ok=True)

    if dest.exists() and not overwrite:
        return {
            "ok": False,
            "error": "dest exists; set overwrite:true",
            "dest": str(dest)
        }

    shutil.move(str(src), str(dest))
    return {"ok": True, "src": str(src), "dest": str(dest)}


def op_checksum(args: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Calculate checksums for files"""
    res = []

    for path in args.get("paths", []):
        p = within_root(path)
        if not p.exists() or not p.is_file():
            res.append({"path": str(p), "error": "not a file or missing"})
            continue

        res.append({
            "path": str(p),
            "sha256": sha256(p),
            "bytes": p.stat().st_size
        })

    return res


def op_df(args: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate disk usage"""
    paths = args.get("paths", [ROOT])
    out = []

    for path in paths:
        p = within_root(path)
        total = 0
        for sub in p.rglob('*'):
            if sub.is_file():
                try:
                    total += sub.stat().st_size
                except Exception:
                    pass
        out.append({"path": str(p), "bytes": total})

    return {"ok": True, "usage": out}


def op_gc_cache(args: Dict[str, Any]) -> Dict[str, Any]:
    """Garbage collect HuggingFace cache"""
    home = Path(os.environ.get("HF_HOME", HF_HOME))
    dry = bool(args.get("dryRun", True))
    max_gb = float(args.get("maxSizeGB", 50))
    max_bytes = max_gb * (1<<30)

    reclaimed = 0
    items = sorted(
        [p for p in home.rglob('*') if p.is_file()],
        key=lambda x: x.stat().st_mtime
    )
    total = sum(p.stat().st_size for p in items)
    victims = []

    while total > max_bytes and items:
        p = items.pop(0)
        sz = p.stat().st_size
        total -= sz
        reclaimed += sz
        victims.append({"path": str(p), "bytes": sz})

        if not dry:
            try:
                p.unlink()
            except Exception:
                pass

    return {
        "ok": True,
        "reclaimed": reclaimed,
        "dryRun": dry,
        "victims": victims
    }


def op_ping(args: Dict[str, Any]) -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "ok": True,
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0",
        "root": ROOT,
        "hf_home": HF_HOME,
        "allow_delete": ALLOW_DELETE
    }


def op_status(args: Dict[str, Any]) -> Dict[str, Any]:
    """Get current operation status"""
    try:
        logp = within_root(f"{ROOT}/.ops/log.jsonl")
        if not logp.exists():
            return {"ok": True, "status": "no operations logged"}

        # Get last few operations
        with logp.open('r') as f:
            lines = f.readlines()
            recent_ops = [json.loads(line.strip()) for line in lines[-10:]]

        return {
            "ok": True,
            "recent_operations": recent_ops,
            "last_operation": recent_ops[-1] if recent_ops else None
        }
    except Exception as ex:
        return {"ok": False, "error": str(ex)}


def op_logs(args: Dict[str, Any]) -> Dict[str, Any]:
    """Get operation logs"""
    try:
        logp = within_root(f"{ROOT}/.ops/log.jsonl")
        if not logp.exists():
            return {"ok": True, "logs": []}

        limit = int(args.get("limit", 100))
        with logp.open('r') as f:
            lines = f.readlines()
            logs = [json.loads(line.strip()) for line in lines[-limit:]]

        return {"ok": True, "logs": logs}
    except Exception as ex:
        return {"ok": False, "error": str(ex)}


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
    "ping": op_ping,
    "status": op_status,
    "logs": op_logs,
}


def handler(job):
    """Main RunPod handler"""
    inp = job.get("input", {})
    op = inp.get("op") or inp.get("task")

    if op not in OPS:
        return {
            "ok": False,
            "error": f"unknown op '{op}'",
            "supported": list(OPS.keys())
        }

    args = inp.get("args", inp)

    try:
        res = OPS[op](args)
        log_event({
            "op": op,
            "args": {k: v for k, v in args.items() if k not in ("manifest",)},
            "ok": True
        })
        return res
    except Exception as ex:
        error_result = {"ok": False, "error": str(ex)}
        log_event({
            "op": op,
            "args": {k: v for k, v in args.items() if k not in ("manifest",)},
            "ok": False,
            "error": str(ex)
        })
        return error_result


# ---- local server for testing ----

def run_local_server():
    """Run a local Flask server for testing"""
    try:
        from flask import Flask, request, jsonify
    except ImportError:
        print("Flask not available. Install with: pip install flask")
        return

    app = Flask(__name__)

    @app.route('/', methods=['POST'])
    def handle_request():
        try:
            data = request.get_json()
            if not data or 'input' not in data:
                return jsonify({"error": "Missing 'input' in request"}), 400

            result = handler(data)
            return jsonify(result)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy", "mode": "local"})

    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = 8000
    print(f"🚀 Starting local server on http://{host}:{port}")
    print("📁 ROOT:", ROOT)
    print("🏠 HF_HOME:", HF_HOME)
    print("🗑️ ALLOW_DELETE:", ALLOW_DELETE)
    print("Press Ctrl+C to stop")

    app.run(host=host, port=port, debug=False)


if __name__ == "__main__":
    import sys
    if "--local" in sys.argv or os.environ.get("LOCAL_MODE") == "true":
        run_local_server()
    else:
        runpod.serverless.start({"handler": handler})
