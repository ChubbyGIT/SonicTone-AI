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

    # Step 1 — Groq API (cloud — no local startup needed)
    log(GREEN, "GROQ", "Using Groq cloud API (openai/gpt-oss-120b) ✓")

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