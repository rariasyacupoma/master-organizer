#!/usr/bin/env python3
import http.server, subprocess, json, os, time, threading, socketserver

UI_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(UI_DIR)
JSON_FILE = os.path.join(ROOT_DIR, "master-organizer.json")

_ccorp_dir = os.environ.get("GITHUB_CCORP_ORG_DIR", os.path.expanduser("~/go/src/github.com/calculi-corp"))
GR_ALL_DIR = os.path.join(_ccorp_dir, "gr-all")
SELECTOR_FILE = os.path.join(GR_ALL_DIR, ".active-rbac-ticket")
SWITCHING_LOCK = os.path.join(GR_ALL_DIR, ".switching-ticket")
WATCHER_LOCK = os.path.join(GR_ALL_DIR, ".ticket-watcher.lock")
SWITCH_SCRIPT = os.path.join(GR_ALL_DIR, ".ticket-switcher", "switch-ticket.sh")
WATCHER_SCRIPT = os.path.join(GR_ALL_DIR, ".ticket-switcher", "ticket-watcher-daemon.sh")

# SSE: track connected clients and broadcast on file change
_sse_clients = []
_sse_lock = threading.Lock()

def _watch_json():
    last_mtime = None
    while True:
        try:
            mtime = os.path.getmtime(JSON_FILE)
            if last_mtime is not None and mtime != last_mtime:
                with _sse_lock:
                    for q in list(_sse_clients):
                        try:
                            q.append("data: reload\n\n")
                        except Exception:
                            pass
            last_mtime = mtime
        except Exception:
            pass
        time.sleep(1)

threading.Thread(target=_watch_json, daemon=True).start()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=UI_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/events":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            queue = []
            with _sse_lock:
                _sse_clients.append(queue)
            try:
                while True:
                    if queue:
                        msg = queue.pop(0)
                        self.wfile.write(msg.encode())
                        self.wfile.flush()
                    else:
                        # heartbeat every 15s to keep connection alive
                        self.wfile.write(b": heartbeat\n\n")
                        self.wfile.flush()
                        time.sleep(15)
            except Exception:
                pass
            finally:
                with _sse_lock:
                    try:
                        _sse_clients.remove(queue)
                    except ValueError:
                        pass
            return
        elif self.path == "/master-organizer.json":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            try:
                with open(JSON_FILE) as f:
                    data = json.load(f)
                # Enrich each ticket's epic field from its .jira-info.json
                jira_workdir = os.environ.get("JIRA_TICKETS_WORKDIR", os.path.expanduser("~/workspace/jira-tickets"))
                for ticket in data.get("tickets", []):
                    info_path = os.path.join(jira_workdir, ticket["id"], ".jira-info.json")
                    try:
                        with open(info_path) as f:
                            info = json.load(f)
                            ticket["epic"] = info.get("epic", None)
                    except (FileNotFoundError, json.JSONDecodeError):
                        pass
                self.wfile.write(json.dumps(data).encode())
            except FileNotFoundError:
                self.wfile.write(b"{}")
        elif self.path == "/epics":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            jira_workdir = os.environ.get("JIRA_TICKETS_WORKDIR", os.path.expanduser("~/workspace/jira-tickets"))
            epics_path = os.path.join(jira_workdir, ".epics.json")
            try:
                with open(epics_path) as f:
                    self.wfile.write(f.read().encode())
            except FileNotFoundError:
                self.wfile.write(b"[]")
        elif self.path.startswith("/implementation-plan/"):
            ticket_id = self.path.split("/implementation-plan/")[1].strip("/")
            plan_path = os.path.expandvars(f"$JIRA_TICKETS_WORKDIR/{ticket_id}/implementation-plan.md")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            try:
                with open(plan_path) as f:
                    self.wfile.write(json.dumps({"ok": True, "content": f.read()}).encode())
            except FileNotFoundError:
                self.wfile.write(json.dumps({"ok": False}).encode())
        elif self.path == "/working-status":
            jira_workdir = os.environ.get("JIRA_TICKETS_WORKDIR", os.path.expanduser("~/workspace/jira-tickets"))
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            result = {}
            try:
                for ticket_id in os.listdir(jira_workdir):
                    ticket_path = os.path.join(jira_workdir, ticket_id)
                    if not os.path.isdir(ticket_path):
                        continue
                    info_path = os.path.join(ticket_path, ".jira-info.json")
                    try:
                        with open(info_path) as f:
                            info = json.load(f)
                            if info.get("working"):
                                result[ticket_id] = True
                    except (FileNotFoundError, json.JSONDecodeError):
                        pass
            except FileNotFoundError:
                pass
            self.wfile.write(json.dumps(result).encode())
        elif self.path == "/versioning":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            default_workdir = os.environ.get("DEFAULT_WORKDIR", os.path.expanduser("~/workspace/default"))
            versioning_dir = os.path.join(default_workdir, "platform-helmfiles", "versioning")
            result = {}
            try:
                for fname in os.listdir(versioning_dir):
                    if fname.endswith(".version"):
                        svc = fname[:-len(".version")]
                        try:
                            with open(os.path.join(versioning_dir, fname)) as f:
                                result[svc] = f.read().strip()
                        except Exception:
                            pass
            except FileNotFoundError:
                pass
            self.wfile.write(json.dumps(result).encode())
        elif self.path == "/deployments":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            result = {}
            for env in ("qa", "prod"):
                path = os.path.join(ROOT_DIR, f"deployments-{env}.json")
                try:
                    with open(path) as f:
                        result[env] = json.load(f).get("services", {})
                except FileNotFoundError:
                    result[env] = {}
            self.wfile.write(json.dumps(result).encode())
        elif self.path == "/persistent-sessions":
            path = os.path.expandvars("$JIRA_TICKETS_WORKDIR/.persistent-sessions.json")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            try:
                with open(path) as f:
                    self.wfile.write(f.read().encode())
            except FileNotFoundError:
                self.wfile.write(b"[]")
        elif self.path == "/tilt-status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            # Active ticket
            try:
                with open(SELECTOR_FILE) as f:
                    active = f.read().strip() or "MAIN"
            except FileNotFoundError:
                active = "MAIN"
            # Switching lock
            switching = os.path.exists(SWITCHING_LOCK)
            # Watcher status
            watcher_running = False
            if os.path.exists(WATCHER_LOCK):
                try:
                    with open(WATCHER_LOCK) as f:
                        pid = int(f.read().strip())
                    os.kill(pid, 0)
                    watcher_running = True
                except (ValueError, ProcessLookupError, PermissionError):
                    pass
            # Switchable tickets: workspaces that have at least one service matching DEFAULT_WORKDIR
            jira_workdir = os.environ.get("JIRA_TICKETS_WORKDIR", os.path.expanduser("~/workspace/jira-tickets"))
            default_workdir = os.environ.get("DEFAULT_WORKDIR", os.path.expanduser("~/workspace/default"))
            default_services = set()
            try:
                default_services = set(os.listdir(default_workdir))
            except FileNotFoundError:
                pass
            switchable = []
            try:
                for ticket_id in sorted(os.listdir(jira_workdir)):
                    ticket_path = os.path.join(jira_workdir, ticket_id)
                    if not os.path.isdir(ticket_path) or ticket_id.startswith("."):
                        continue
                    services = [d for d in os.listdir(ticket_path)
                                if os.path.isdir(os.path.join(ticket_path, d)) and d in default_services]
                    if not services:
                        continue
                    info = {"id": ticket_id, "services": services}
                    jira_info_path = os.path.join(ticket_path, ".jira-info.json")
                    try:
                        with open(jira_info_path) as f:
                            ji = json.load(f)
                            info["title"] = ji.get("title", "")
                            info["status"] = ji.get("status", "")
                    except (FileNotFoundError, json.JSONDecodeError):
                        pass
                    switchable.append(info)
            except FileNotFoundError:
                pass
            self.wfile.write(json.dumps({
                "active": active,
                "switching": switching,
                "watcherRunning": watcher_running,
                "switchable": switchable,
            }).encode())
        else:
            super().do_GET()

    def respond(self, ok, output=""):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"ok": ok, "output": output}).encode())

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        if self.path == "/focus-tab":
            ticket_id = body.get("ticketId", "")
            try:
                result = subprocess.run(
                    [os.path.join(ROOT_DIR, "focus-terminal-tab.sh"), ticket_id],
                    capture_output=True, text=True, timeout=15
                )
                self.respond(result.returncode == 0, result.stdout + result.stderr)
            except subprocess.TimeoutExpired:
                self.respond(False, "Timed out")

        elif self.path == "/open-db":
            alias = body.get("alias", "")  # full alias name passed through as-is
            try:
                result = subprocess.run(
                    [os.path.join(ROOT_DIR, "open-db-tab.sh"), alias],
                    capture_output=True, text=True, timeout=15
                )
                self.respond(result.returncode == 0, result.stdout + result.stderr)
            except subprocess.TimeoutExpired:
                self.respond(False, "Timed out")

        elif self.path == "/sync-prs":
            try:
                result = subprocess.run(
                    [os.path.join(ROOT_DIR, "sync-prs.sh")],
                    capture_output=True, text=True, timeout=120
                )
                self.respond(result.returncode == 0, result.stdout + result.stderr)
            except subprocess.TimeoutExpired:
                self.respond(False, "Timed out")

        elif self.path == "/notify":
            title = body.get("title", "Master Organizer")
            message = body.get("message", "")
            truncated = message if len(message) <= 80 else message[:77] + "..."
            custom_app = os.path.expanduser("~/Applications/MasterOrganizer.app/Contents/MacOS/MasterOrganizer")
            terminal_notifier = "/opt/homebrew/bin/terminal-notifier"
            icon_path = os.path.join(UI_DIR, "logo-holo-b.svg.png")
            try:
                if os.path.exists(custom_app):
                    # Best: custom app — logo on the left, no white background
                    subprocess.run([custom_app, "Master Organizer", title, truncated],
                                   capture_output=True, timeout=5)
                elif os.path.exists(terminal_notifier):
                    # Fallback: terminal-notifier — logo on the right
                    cmd = [terminal_notifier,
                           "-title", "Master Organizer",
                           "-subtitle", title,
                           "-message", truncated]
                    if os.path.exists(icon_path):
                        cmd += ["-contentImage", f"file://{icon_path}"]
                    subprocess.run(cmd, capture_output=True, timeout=5)
                else:
                    # Last resort: osascript — no custom icon
                    subprocess.run(
                        ["osascript", "-e",
                         f'display notification "{truncated}" with title "Master Organizer" subtitle "{title}"'],
                        capture_output=True, timeout=5)
                self.respond(True)
            except Exception:
                self.respond(False)

        elif self.path == "/switch-ticket":
            ticket_id = body.get("ticketId", "MAIN")
            try:
                result = subprocess.run(
                    [SWITCH_SCRIPT, ticket_id],
                    capture_output=True, text=True, timeout=30,
                    cwd=GR_ALL_DIR
                )
                self.respond(result.returncode == 0, result.stdout + result.stderr)
            except subprocess.TimeoutExpired:
                self.respond(False, "Timed out")

        elif self.path == "/watcher":
            cmd = body.get("cmd", "status")  # start | stop | restart | status
            try:
                result = subprocess.run(
                    [WATCHER_SCRIPT, cmd],
                    capture_output=True, text=True, timeout=15,
                    cwd=GR_ALL_DIR
                )
                self.respond(result.returncode == 0, result.stdout + result.stderr)
            except subprocess.TimeoutExpired:
                self.respond(False, "Timed out")

        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, fmt, *args):
        pass

if __name__ == "__main__":
    import socket as _socket
    port = 7891

    class ReusableServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
        allow_reuse_address = True
        daemon_threads = True
        def server_bind(self):
            self.socket.setsockopt(_socket.SOL_SOCKET, _socket.SO_REUSEADDR, 1)
            super().server_bind()

    server = ReusableServer(("", port), Handler)
    print(f"Master Organizer running at http://localhost:{port}")
    server.serve_forever()
