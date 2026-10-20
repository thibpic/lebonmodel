"""Ouvre index.html et budget/index.html dans Chromium : aucune erreur de console ni de page.

Usage : uv run --with playwright python scripts/check_pages.py
Variable CHROMIUM_PATH : navigateur à utiliser (sinon chromium/chrome du système, sinon celui de Playwright).
"""
import functools
import http.server
import os
import shutil
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parent.parent
PAGES = ["/", "/budget/"]


class Silencieux(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def navigateur_systeme():
    if os.environ.get("CHROMIUM_PATH"):
        return os.environ["CHROMIUM_PATH"]
    for nom in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable"):
        chemin = shutil.which(nom)
        if chemin:
            return chemin
    return None


def main():
    serveur = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Silencieux, directory=str(RACINE))
    )
    threading.Thread(target=serveur.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{serveur.server_port}"
    erreurs = []
    with sync_playwright() as p:
        options = {"args": ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-zygote", "--disable-features=VizDisplayCompositor"]}
        chemin = navigateur_systeme()
        if chemin:
            options["executable_path"] = chemin
        navigateur = p.chromium.launch(**options)
        for page_url in PAGES:
            page = navigateur.new_page()
            page.on("console", lambda m, u=page_url: m.type == "error" and "ERR_FAILED" not in m.text and erreurs.append(f"{u} console : {m.text}"))
            page.on("pageerror", lambda e, u=page_url: erreurs.append(f"{u} exception : {e}"))
            # Hors serveur local (polices, relais de recherche) : coupé, seules les erreurs du site comptent.
            page.route(
                "**/*",
                lambda r: r.continue_() if r.request.url.startswith(base) else r.abort(),
            )
            page.on("requestfailed", lambda q: None)
            reponse = page.goto(base + page_url, wait_until="networkidle")
            if not reponse or reponse.status != 200:
                erreurs.append(f"{page_url} statut {reponse and reponse.status}")
            if not page.title():
                erreurs.append(f"{page_url} sans titre")
            print(f"ouvert {page_url} : {page.title()}")
            page.close()
        navigateur.close()
    serveur.shutdown()
    for e in erreurs:
        print("KO", e, file=sys.stderr)
    return 1 if erreurs else 0


sys.exit(main())
