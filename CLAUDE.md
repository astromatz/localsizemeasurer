# CLAUDE.md – LocalSizeMeasurer (LSM)

Diese Datei übergibt den Projektstand aus dem claude.ai-Projekt „LSM“ an Claude Code.
Stand: 15.11.2026 (Script v2.4.1, Web v1.4)

## Über den Nutzer (Mathias)
- Kann nicht programmieren. Bei Code-Änderungen immer **komplette, fertige Dateien** liefern, keine Schnipsel zum Einfügen.
- Ablauf bei Änderungen: erst vorschlagen und abstimmen, dann umsetzen, dann Test- und GitHub-Schritte erklären.
- Kommunikation auf Deutsch, knapp, kritisch beraten statt bestätigen. Schlussfolgerungen mit [Wahrscheinlich] markieren, geschlossene Lücken mit [Vermutung].
- Begriff: „debayern“/„debayert“ verwenden, nicht „entbayern“.

## Repo-Inhalt (astromatz/localsizemeasurer, Branch main)
- `index.html` – **LocalSizeMeasurer Web**, Standalone-Web-App (eine HTML-Datei, läuft lokal per Doppelklick und auf GitHub Pages)
- `LSM_2_4.js` – aktuelles PixInsight-Script (PJSR), v2.4.1
- Dokumentation (`LocalSizeMeasurer_Doc.html`), `README`, MIT-Lizenz

## Teil 1: PixInsight-Script (LSM_2_4.js)
- Interaktives Mess-Lineal: zeigt die projizierte physische Größe einer gezogenen Linie am angenommenen Zielort.
- Ziel: PixInsight 1.9.6 (Build 1713), V8-Engine.
- Referenz-Setup zum Testen: Brennweite 480 mm (Apo), Pixel 3,76 µm (ASI2600MC Pro), Entfernung 3000 Lichtjahre.
- Wichtig: Maus-Events am ImageWindow funktionieren nicht. Interaktion läuft ausschließlich **dialog-intern** (Bitmap in ScrollBox mit eigenen Maus-Handlern).
- Skalenberechnung in `getPixelscale()` gekapselt; Maßstab kann aus Plate-Solve kommen.
- Versionsgeschichte: v1.0 → Merge mit v0.93 (gecachte Bitmap, Mausrad-Zoom, AutoSTF per PixelMath) → v2.1 → v2.2 (Plate-Solve-Maßstab, robustere Online-Suche, Eingabe-Parser, Rückfrage vor Beenden) → v2.3 (AE-Ausgabe im Sonnensystem-Modus entfernt, Plausibilitätsprüfung Binning/Debayern/Resample; in PixInsight an einem gelösten Bild getestet) → **v2.4** (Angleichung an die Web-App, siehe unten; von Mathias in PixInsight erfolgreich getestet).
- 10–100 Lj mit einer Nachkommastelle: im Script schon seit v2.3, in der Web-App seit v1.4.
- Später geplant: Bild mit Maßstab speichern/exportieren.

## Teil 2: LocalSizeMeasurer Web (index.html)
Ziel: niederschwellige, teilbare Browser-Version ohne PixInsight. Keine Astrometrie, kein Upload auf Server. Nutzer gibt Optik und Entfernung selbst ein. Oberfläche komplett auf Deutsch. Vorlage für die Parität: LSM_2_2.js / LSM_2_4.js. Die Berechnung am Nebel stimmt mit dem Script überein.

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
- **v1.1:** Keine Teleskopliste mehr – Brennweite ist Pflichtfeld ohne Vorbelegung (Sperre vor Schritt 3, wie bei der Entfernung). Reducer/Barlow bleiben.
- Kameraliste (63 Modelle, 4 Gruppen: Deep-Sky, Planeten/Guiding, DSLR, DSLM) aus Mathias' Liste, 11/2026 per Websuche gegen Hersteller-/Händlerangaben geprüft. Gespeichert nur: Pixelzahl horizontal, Pixelgröße (Astro: Herstellerangabe) bzw. Sensorbreite (Foto-Kameras: Pixelgröße berechnet), Farbe/Mono, ggf. Hinweis. Infobox zeigt Herkunft des Werts. Keine Vorauswahl. Eigene Änderung an den Sensordaten setzt die Auswahl auf „eigene Werte“.
- Korrekturen ggü. Alt-CSV: GPM174M = IMX249 (1920 px), ATR2600 23,5 mm, EOS 7D II 4,1 µm. ATR533M-Pixelzahl in Händlerquellen widersprüchlich (Hinweis in der App).
- **v1.2:** Debayer-Auswahl und Sensortyp aus Schritt 2 gestrichen (wirkten nicht auf die Rechnung). Super-Pixel nur noch in Schritt 1: Hinweis „auch beim Stacken, z. B. WBPP“, Faktor 2 wird bei Auswahl vorbelegt (wie im Script). Restrisiko: Kamera ohne Sensor-Pixelbreite + Super-Pixel + „unverändert“ fängt nur der Plate-Solve-Abgleich.
- Schritt 2 aufgeräumt: Abschnitte Teleskop / Kamera / Kontrolle mit Plate-Solve, Profile oben rechts, Pixelgröße standardmäßig direkt (Umschalter „aus Sensorbreite berechnen“), Seitenleiste ohne doppelte Werte. Optik-Profile speichern jetzt auch das Kameramodell.
- Generiertes Beispielbild nur über einen „Ausprobieren“-Knopf.
- Redesign: hell/dunkel umschaltbar, präzises Werkzeug, am Look von PixInsight orientiert, eher grau, Desktop-Fokus. Features dabei unverändert.
- Versionsinfo, Credits (Rainer und Daniel) und Datenschutzhinweis in einem eigenen 5. Tab „Hinweise“ neben „Messen“.

- **v1.3:** TIFF und FITS laden (eigener Leser in index.html, keine Bibliothek): TIFF 8/16/32 Bit Ganzzahl + 32/64 Bit Gleitkomma, RGB/Graustufen, chunky/planar, Strips/Tiles, unkomprimiert/LZW/ZIP/PackBits, Predictor 2 und 3; FITS BITPIX 8/16/32/-32/-64 mit BZERO/BSCALE, RGB über NAXIS3, IMAGE-Extension, Zeilenfolge nach ROWORDER (Standard: unten zuerst). Entscheidung Mathias: **nur bereits gestreckte Bilder**, keine Streckung, lineare Abbildung auf 8 Bit (Ganzzahl: Typbereich; Gleitkomma: 0–1, sonst 0–Max). Hinweis im Ladefeld. Warnung in Schritt 1, wenn das Bild linear wirkt (Median < 8 und 99-%-Wert < 40 von 255) bzw. bei BAYERPAT. Nicht unterstützt (mit Fehlermeldung): JPEG-TIFF, Palette/CMYK/YCbCr, BigTIFF, 16-Bit-Float, .fz, XISF.
- **v1.3:** Speichern-Dialog („Bild speichern …“ in der Werkzeugleiste und am Ende von Schritt 4): volle Auflösung, PNG/JPEG, wählbar Beschriftung, Legende, Maßstabsleiste (runde Länge in Lj/AE/km plus Winkel), Info-Leiste unter dem Bild. Chrome/Edge: echter Speichern-Dialog (showSaveFilePicker), sonst Download. Zeichenfunktionen nehmen dafür ein Render-Objekt (Strichstärke/Schrift skaliert mit der Bildgröße).
- Getestet (automatisch, Chromium): 16 Testdateien pixelgenau gegen Sollwerte, 26-MP-Dateien laden in 3–7 s, Export als Download und über den Speichern-Dialog.

### Bewusst nicht übernommen
AutoSTF bzw. eigene Streckung, FITS-Header (Brennweite/Pixelgröße werden nicht ausgelesen).

### Bekannte Eigenheit
Bild-Upload funktioniert nur, wenn die Datei lokal gespeichert oder über GitHub Pages geöffnet wird (nicht in einer eingebetteten Vorschau).

### Offen
- Browser-Test von v1.3/v1.4 durch Mathias mit echten Exporten aus PixInsight (TIFF 16/32 Bit, FITS) – vor allem: Ist ein FITS aus PixInsight richtig herum oder gespiegelt? (Messung ist davon unabhängig.)
- Export in Firefox/Safari prüfen (dort Download statt Speichern-Dialog).

## Angleichung Script v2.4 / Web v1.4 (Sitzung 15.11.2026, Branch claude/webapp-script-alignment-yh9r54)
Grundlage: HANDOVER.md aus dem Code-Review (ist hier eingearbeitet, Datei wird nicht mehr gebraucht).
Entscheidungen Mathias: „Weiß ich nicht“ in der Web-App ja · Einheit **Lj** · Begriff **Einpassen** · Script-Ergebnisliste **rechts vom Bild** · Versionen v1.4 / v2.4.

**Web v1.4 (umgesetzt, automatisch getestet und von Mathias im Browser erfolgreich getestet)**
- W1: Linie ist Standardwerkzeug; Verschieben mit mittlerer Maustaste oder Leertaste + Ziehen; Knopf „Verschieben“ und Taste V bleiben.
- W2: Schritt 4 mit Seitenleiste (ab 1280 px): Live-Werte, Messliste (einzeln löschbar), Messgrundlage. Grundlagen-Zeile über dem Bild (″/px, Lj/px bzw. km/px, Entfernung, Quelle, Links zu Schritt 2/3). Details in der Ergebnistabelle aufklappbar.
- W4: „Weiter“ aus Schritt 1 und Sprung über die Schrittleiste gesperrt, bis die Bildfrage beantwortet ist (bei „Nein“ auch die Art). Neue Antwort „Weiß ich nicht“: Pixelgröße 1:1, ohne verwendeten Plate-Solve „Maßstab ungeprüft“ in Prüfungen, Messgrundlage, Grundlagen-Zeile und Export-Info-Leiste.
- `fLy`: 10–100 Lj mit einer Nachkommastelle.

**Script v2.4.0 (umgesetzt, von Mathias in PixInsight erfolgreich getestet; Esc siehe 2.4.1)**
- Datei umbenannt: `LSM_2_3.js` → `LSM_2_4.js`.
- S1: Ergebnisliste (TreeBox) rechts vom Bild: Nr., Art, Winkel, Größe, Spanne (Spanne nur Sonnensystem mit Katalog-Körper, sonst „–“; Deepsky hat im Script keine numerische Entfernungsunsicherheit). „Markierte löschen“.
- S2: „Eingaben ändern …“ öffnet den ParameterDialog mit einer Kopie der aktuellen Werte (inkl. Antwort zur Originalauflösung über `params.origAnswer`). Nach OK: Messungen aus `x0,y0,x1,y1` neu berechnet, Titel/Kopfzeile/Legende/Liste aktualisiert, `saveParams`, `dirty = true`, Konsolenbericht (neue Funktion `printParamSummary`) und alle Messungen erneut ausgegeben. Moduswechsel möglich.
- Esc bricht nur die laufende Messung ab; Beenden nur über „Messmodus beenden“. Werkzeug als zwei ToolButtons (Text, umschaltbar) statt Auswahlliste. „Fit“ → „Einpassen“. „lj“ → „Lj“ überall.
- Doku (`LocalSizeMeasurer_Doc.html`) und README nachgezogen.
- Test Mathias: Esc ohne laufende Messung schließt das Messfenster sofort (PixInsight/Qt, vom Script nicht abfangbar; war vermutlich schon in v2.3 so, die Rückfrage griff nur beim Knopf).
- **v2.4.1:** `main()` führt den Messdialog in einer Schleife aus. Endete er nicht über „Messmodus beenden“ (`md.endedByButton`) und gibt es ungespeicherte Messungen (`md.unsavedCount()`), Rückfrage und erneutes `md.execute()` mit allen Messungen. **Ungetestet:** ob PixInsight einen geschlossenen Dialog erneut öffnet.

**Bedienunterschiede, die bleiben:** Taste V/Verschieben-Werkzeug nur Web. Script nummeriert Messungen nach dem Löschen nicht um (passt zum Konsolenbericht), Web schon.

**Gefunden, bewusst zurückgestellt (nur auf ausdrücklichen Wunsch)**
- Web W3: „Hinweise“ aus der Schrittleiste als Info-Knopf in den Kopf.
- Web W5: Ablagefeld nach dem Laden einklappen, größere Vorschau.
- Web W6: `prompt`/`alert`/`confirm` durch eigene `<dialog>` ersetzen.
- Web W7: Tastaturhilfe als Einblendung über „?“; „Ist das unverändertes Originalbild?“ → „Ist das Bild unverändert?“; Zurück/Weiter unter langen Karten.
- Web Touch: kein Zwei-Finger-Zoom.
- Script S3: Parameter-Dialog entschlacken (Ampel-Statuszeile, Tooltips, Fehler bei Eingabe statt Meldungsfenster, `fitInfoHeight` ersetzen).
- Script S5: Winkeleinheit wählbar; Export beachtet Haken Beschriftung/Legende nicht; kein Optionsdialog beim Export.

## Übergabe (Sitzung 15.11.2026 früher, Claude Code Cloud)
- Web-App v1.2 fertig: Kameraliste, aufgeräumter Schritt 2, Debayer-Auswahl gestrichen. Automatisch im Browser getestet (hell/dunkel, keine Konsolenfehler). Die Messung selbst blieb unverändert. v1.1 hat Mathias erfolgreich getestet.
- Pull Request #1 gemerged, v1.2 ist auf GitHub Pages online. README um einen Web-App-Abschnitt ergänzt.
- Kameradaten: Herstellerseiten waren aus der Cloud gesperrt, Prüfung lief über die Websuche (Handbücher, Händler, Datenbanken). Mathias' Prüfdateien (camera_catalogue.json/.csv) liegen nicht im Repo.
- Mods „Model selector“ und „cache clock“ laufen nur lokal bei Mathias, nicht in Cloud-Sitzungen. Option: als Plugin in ein GitHub-Repo legen. Offen, ob Mathias das will.
- Nächster sinnvoller Schritt: v1.2 online prüfen → an Karsten und Dietmar zum Testen geben.

## Nächste Schritte
- Script und Web-App an Karsten und Dietmar zum Testen geben, Feedback einarbeiten.
- Vorstellung im nächsten Astro-Workshop.
- Grundsatz: Die Web-App soll alle Faktoren berücksichtigen, die PixInsight ab Werk mitbringt, oder sie als Fehlerquelle ausschließen. Dabei komfortable Nutzerführung ohne überfrachtete Oberfläche.
