"""
SonicTone AI — Single Command Launcher
Run: python run.py
"""
import subprocess
import sys
import os
import time
import signal
import threading
from pathlib import Path

ROOT = Path(__file__).parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"

GREEN = "\033[92m"
BLUE = "\033[94m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

processes = []

def log(color, label, msg):
    print(f"{color}{BOLD}[{label}]{RESET} {msg}")

def shutdown(sig=None, frame=None):
    print(f"\n{YELLOW}{BOLD}Shutting down SonicTone AI...{RESET}")
    for p in processes:
        try:
            p.terminate()
        except:
            pass
    sys.exit(0)

signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

def stream_logs(proc, label, color):
    for line in proc.stdout:
        line = line.rstrip()
        if line:
            print(f"{color}[{label}]{RESET} {line}")

def start_ollama():
    """Start Ollama model in background — non-blocking."""
    log(BLUE, "OLLAMA", "Starting gemma3:12b model...")

    # Check if ollama is installed
    ollama_cmd = "ollama.exe" if sys.platform == "win32" else "ollama"

    try:
        # First check if model is already running by pinging ollama
        check = subprocess.run(
            [ollama_cmd, "list"],
            capture_output=True, text=True, timeout=5
        )
        if check.returncode != 0:
            log(YELLOW, "OLLAMA", "Ollama not found. Please install it from https://ollama.ai")
            return None
    except (FileNotFoundError, subprocess.TimeoutExpired):
        log(YELLOW, "OLLAMA", "Ollama not found. Please install it from https://ollama.ai")
        return None

    # Start ollama serve (keeps model loaded in background)
    try:
        # On Windows use CREATE_NO_WINDOW to avoid extra terminal
        kwargs = {}
        if sys.platform == "win32":
            kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW

        ollama_proc = subprocess.Popen(
            [ollama_cmd, "run", "gemma3:12b", "--keepalive", "24h"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            **kwargs
        )
        processes.append(ollama_proc)

        # Give it time to load
        log(YELLOW, "OLLAMA", "Loading model (this may take 30-60s on first run)...")
        time.sleep(8)

        if ollama_proc.poll() is not None:
            log(YELLOW, "OLLAMA", "Model may already be running or failed to start — continuing anyway")
            return None

        log(GREEN, "OLLAMA", "gemma3:12b loaded ✓")

        # Stream logs in background thread
        threading.Thread(
            target=stream_logs,
            args=(ollama_proc, "OLLAMA", BLUE),
            daemon=True
        ).start()

        return ollama_proc

    except Exception as e:
        log(YELLOW, "OLLAMA", f"Could not auto-start Ollama: {e}. Start manually if needed.")
        return None

def main():
    print(f"""
\033[91m\033[1m
  ███████╗ ██████╗ ███╗   ██╗██╗ ██████╗
  ██╔════╝██╔═══██╗████╗  ██║██║██╔════╝
  ███████╗██║   ██║██╔██╗ ██║██║██║
  ╚════██║██║   ██║██║╚██╗██║██║██║
  ███████║╚██████╔╝██║ ╚████║██║╚██████╗
  ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝ ╚═════╝
  TONE AI — Your Studio, Their Soul.
\033[0m""")

    # Step 1 — Start Ollama
    start_ollama()

    # Step 2 — Start Backend
    log(BLUE, "BACKEND", "Starting FastAPI on http://localhost:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(backend_proc)
    time.sleep(2)

    if backend_proc.poll() is not None:
        log(RED, "ERROR", "Backend failed to start. Check your Python environment.")
        shutdown()

    log(GREEN, "BACKEND", "Running on http://localhost:8000 ✓")

    threading.Thread(
        target=stream_logs,
        args=(backend_proc, "BACKEND", BLUE),
        daemon=True
    ).start()

    # Step 3 — Start Frontend
    log(BLUE, "FRONTEND", "Starting React dev server on http://localhost:5173 ...")
    npm = "npm.cmd" if sys.platform == "win32" else "npm"

    frontend_proc = subprocess.Popen(
        [npm, "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(frontend_proc)
    time.sleep(3)

    if frontend_proc.poll() is not None:
        log(RED, "ERROR", "Frontend failed to start. Run 'npm install' in the frontend folder first.")
        shutdown()

    log(GREEN, "FRONTEND", "Running on http://localhost:5173 ✓")

    threading.Thread(
        target=stream_logs,
        args=(frontend_proc, "FRONTEND", GREEN),
        daemon=True
    ).start()

    print()
    print(f"{GREEN}{BOLD}{'='*50}{RESET}")
    print(f"{GREEN}{BOLD}  SonicTone AI is ready!{RESET}")
    print(f"{GREEN}{BOLD}  Open: http://localhost:5173{RESET}")
    print(f"{GREEN}{BOLD}{'='*50}{RESET}")
    print(f"{YELLOW}  Press Ctrl+C to stop everything{RESET}\n")

    # Keep alive — monitor processes
    while True:
        if backend_proc.poll() is not None:
            log(RED, "ERROR", "Backend crashed. Shutting down.")
            shutdown()
        if frontend_proc.poll() is not None:
            log(RED, "ERROR", "Frontend crashed. Shutting down.")
            shutdown()
        time.sleep(2)


if __name__ == "__main__":
    main()