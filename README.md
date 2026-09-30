# Sonnenweg Solar — v0 Grundgerüst

Minimale Web-App mit Projekten, Kunden, Teamgruppen und Monatskalender. Keine Beispieldaten. Objekte besitzen zunächst nur Namen; Projektzeiträume und tägliche Mitarbeiterzuordnungen sind separate Beziehungen. Mitarbeiter sind noch keine Benutzerkonten.

## Lokal starten

Python 3.11+ und Node.js 20+ werden benötigt.

```sh
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/alembic -c backend/alembic.ini upgrade head
.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In einem zweiten Terminal:

```sh
cd frontend
npm install
npm run dev
```

Web-App: http://127.0.0.1:5173. API-Dokumentation: http://127.0.0.1:8000/docs.

## Aufbau

- React / TypeScript / Vite für die Oberfläche.
- FastAPI für die API, Services für Änderungen und fachliche Validierung.
- SQLAlchemy mit SQLite, Alembic für versionierte Migrationen.
- Daten lokal in `data/sonnenweg.db`; anderer Datenbankpfad über `DATABASE_URL`.
- UUIDs als stabile IDs. Fremdschlüsselprüfungen, WAL und kurze Transaktionen.
- Ein Projektzeitraum ist inklusive Start- und Enddatum. Zuordnungen müssen darin liegen. Dieselbe Person kann mehreren Projekten am selben Tag zugeordnet werden.
- Pro Mitarbeiter eine optionale Gruppe; Initialen dienen als Profilbild-Platzhalter.

Noch keine Anmeldung oder Rechteverwaltung: ausschließlich lokales Entwicklungsgerüst. Kommentare, Kommunikation, Dokumente, Historie und weitere v0-Funktionen folgen später.

## Prüfen

```sh
.venv/bin/python -m unittest discover -s backend -p 'test_*.py'
cd frontend
npm run build
```
