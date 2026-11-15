# CLAUDE.md – LocalSizeMeasurer (LSM)

Diese Datei übergibt den Projektstand aus dem claude.ai-Projekt „LSM“ an Claude Code.
Stand: 15.11.2026

## Über den Nutzer (Mathias)
- Kann nicht programmieren. Bei Code-Änderungen immer **komplette, fertige Dateien** liefern, keine Schnipsel zum Einfügen.
- Ablauf bei Änderungen: erst vorschlagen und abstimmen, dann umsetzen, dann Test- und GitHub-Schritte erklären.
- Kommunikation auf Deutsch, knapp, kritisch beraten statt bestätigen. Schlussfolgerungen mit [Wahrscheinlich] markieren, geschlossene Lücken mit [Vermutung].
- Begriff: „debayern“/„debayert“ verwenden, nicht „entbayern“.

## Repo-Inhalt (astromatz/localsizemeasurer, Branch main)
- `index.html` – **LocalSizeMeasurer Web**, Standalone-Web-App (eine HTML-Datei, läuft lokal per Doppelklick und auf GitHub Pages)
- `LSM_2_3.js` – aktuelles PixInsight-Script (PJSR)
- Dokumentation (`LocalSizeMeasurer_Doc.html`), `README`, MIT-Lizenz

## Teil 1: PixInsight-Script (LSM_2_3.js)
- Interaktives Mess-Lineal: zeigt die projizierte physische Größe einer gezogenen Linie am angenommenen Zielort.
- Ziel: PixInsight 1.9.6 (Build 1713), V8-Engine.
- Referenz-Setup zum Testen: Brennweite 480 mm (Apo), Pixel 3,75 µm (ASI2600MC), Entfernung 3000 Lichtjahre.
- Wichtig: Maus-Events am ImageWindow funktionieren nicht. Interaktion läuft ausschließlich **dialog-intern** (Bitmap in ScrollBox mit eigenen Maus-Handlern).
- Skalenberechnung in `getPixelscale()` gekapselt; Maßstab kann aus Plate-Solve kommen.
- Versionsgeschichte: v1.0 → Merge mit v0.93 (gecachte Bitmap, Mausrad-Zoom, AutoSTF per PixelMath) → v2.1 → v2.2 (Plate-Solve-Maßstab, robustere Online-Suche, Eingabe-Parser, Rückfrage vor Beenden) → **v2.3** (AE-Ausgabe im Sonnensystem-Modus entfernt, Plausibilitätsprüfung Binning/Debayern/Resample). v2.3 in PixInsight an einem gelösten Bild getestet.
- Offener Wunsch: unter 100 Lichtjahren eine Nachkommastelle anzeigen.
- Später geplant: Bild mit Maßstab speichern/exportieren.

## Teil 2: LocalSizeMeasurer Web (index.html)
Ziel: niederschwellige, teilbare Browser-Version ohne PixInsight. Keine Astrometrie, kein Upload auf Server. Nutzer gibt Optik und Entfernung selbst ein. Oberfläche komplett auf Deutsch. Vorlage für die Parität: LSM_2_2.js / LSM_2_3.js. Die Berechnung am Nebel stimmt mit dem Script überein.

### Umgesetzte Entscheidungen
- Exakte Formel `2·d·tan(θ/2)`.
- Schritt 1: Antworten „Ja, unverändert“, „Nur zugeschnitten“, „Nein, anders verändert“ plus Haken „Zusätzlich zugeschnitten (Stacking-Rand)“. Zuschneiden ändert den Maßstab nicht; Zuschnitt kombiniert mit Binning/Skalierung muss sauber behandelt werden.
- Zahlen-Parser aus dem Script: Komma und Punkt, deutsche und englische Tausendertrennung (bei Optikwerten keine Tausender-Erkennung). **Komma vs. Punkt ist besonders wichtig.**
- Entfernung ist Pflichtfeld ohne Vorbelegung; Sperre vor Schritt 4.
- Grenzen für Brennweite und Pixelgröße wie im Script; Maßstabsgrenzen je Objektart.
- Pixelgröße wahlweise direkt in µm oder aus Sensorbreite und Pixelzahl.
- Sonnensystem: Entfernungsstufen Minimal/Mittelwert/Maximal/Frei je Körper (Script-Werte), Lichtlaufzeit, Hinweis auf JPL Horizons, Ergebnisspanne aus Erdnähe/Erdferne, Vergleich mit Erddurchmesser. **Keine AE-Angaben** für gemessene Größen.
- Deepsky-Objektkatalog integriert.
- Optionales Kontrollfeld „Maßstab aus Plate-Solve“ in Schritt 2: Wert muss manuell aus ImageSolver/ASTAP/astrometry.net übernommen werden und gilt nur bei unveränderter Export-Auflösung. Haken „verwenden“ erst aktiv, wenn ein Wert drinsteht. Link zu nova.astrometry.net (nur zum Vorher-Lösen, außerhalb der App).
- Teleskopöffnung wird nicht abgefragt (ggf. v2 mit Abtastfaktor/Seeing).
- Generiertes Beispielbild nur über einen „Ausprobieren“-Knopf.
- Redesign: hell/dunkel umschaltbar, präzises Werkzeug, am Look von PixInsight orientiert, eher grau, Desktop-Fokus. Features dabei unverändert.
- Versionsinfo, Credits (Rainer und Daniel) und Datenschutzhinweis in einem eigenen 5. Tab „Hinweise“ neben „Messen“.

### Bewusst nicht übernommen
AutoSTF, FITS-Header, Bildexport mit Maßstabsleiste (Export kommt später).

### Bekannte Eigenheit
Bild-Upload funktioniert nur, wenn die Datei lokal gespeichert oder über GitHub Pages geöffnet wird (nicht in einer eingebetteten Vorschau).

### Offen
- Browser-Test des Redesigns durch Mathias steht noch aus.
- Prüfen, ob die letzte Fassung (Tab „Hinweise“, gekürzter Plate-Solve-Text) schon auf main liegt.

## Nächste Schritte
- Script und Web-App an Karsten und Dietmar zum Testen geben, Feedback einarbeiten.
- Vorstellung im nächsten Astro-Workshop.
- Grundsatz: Die Web-App soll alle Faktoren berücksichtigen, die PixInsight ab Werk mitbringt, oder sie als Fehlerquelle ausschließen. Dabei komfortable Nutzerführung ohne überfrachtete Oberfläche.
