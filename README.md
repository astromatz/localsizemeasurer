# LocalSizeMeasurer

**Wie groß ist das, was ich da fotografiert habe, wirklich?**

LocalSizeMeasurer ist ein Script für [PixInsight](https://pixinsight.com). Du ziehst damit Linien oder Kreise über ein Objekt in deinem Astrofoto. Das Script rechnet daraus die tatsächliche Ausdehnung aus, in Lichtjahren bei Nebeln und Galaxien und in Kilometern bei Mond, Sonne und Planeten.

> Aktuelle Version: **v2.3.6** · getestet mit PixInsight 1.9.6 (Build 1713)

---

## Funktionen

- **Interaktiv messen:** Strecken (Linie) und Kreisflächen direkt im Bild, beliebig viele nacheinander, mit Legende und Beschriftung
- **Zwei Modi:**
  - *Deepsky:* Ergebnis in Lichtjahren, Vergleich mit dem Sonnensystem (100 AE)
  - *Sonnensystem:* Ergebnis in Kilometern, Vergleich mit dem Erddurchmesser; Entfernungsstufen Minimal / Mittel / Maximal für Mond, Sonne und Planeten
- **Maßstab aus dem Bild:** Hat das Bild einen Plate-Solve, nutzt das Script die gelöste Skala. Sonst rechnet es mit Brennweite und Pixelgröße aus dem Header.
- **Plausibilitätsprüfung:** Warnt, wenn Optik und Plate-Solve nicht zusammenpassen, und nennt die wahrscheinliche Ursache (Binning, Super-Pixel-Debayer, Resample, Drizzle, fehlende Barlow). Veraltete Plate-Solve-Daten im Header erkennt es.
- **Entfernung online suchen:** Abfrage bei SIMBAD und NED, mit lokalem Katalog als Rückfall
- **Export:** Speichert das Bild mit allen Messungen, Legende, Maßstabsleiste und Infobanner als PNG oder JPEG
- **Nicht-destruktiv:** Deine Bilddaten werden nicht verändert.

## Dateien

| Datei | Inhalt |
|---|---|
| `LSM_2_3.js` | Das Script |
| `LocalSizeMeasurer_Doc.html` | Ausführliche Dokumentation (öffnet sich auch über den Button „Dokumentation“ im Script) |

Lege beide Dateien **in denselben Ordner**, sonst findet der Doku-Button die Hilfe nicht.

## Installation

**Zum Ausprobieren:**
`Script > Execute Script File …` und `LSM_2_3.js` wählen. Dabei wird nichts installiert.

**Dauerhaft ins Menü:**
1. `Script > Feature Scripts …` öffnen
2. Mit **Add** den Ordner mit `LSM_2_3.js` hinzufügen
3. Mit **Done** bestätigen

Danach findest du das Script unter `Script > Utilities > LocalSizeMeasurer`.

## Kurzanleitung

1. Bild (FITS oder XISF) in PixInsight öffnen und aktivieren
2. Script starten
3. Im Parameter-Dialog den Modus wählen und die Entfernung eintragen, online suchen oder aus dem Katalog übernehmen
4. Maßstab prüfen: Orange Warnungen ernst nehmen. Ohne Plate-Solve fragt das Script, ob die Pixelgröße zum Bild passt.
5. Im Messfenster mit gedrückter linker Maustaste messen: <kbd>L</kbd> = Linie, <kbd>K</kbd> = Kreis
6. Mit **Bild speichern …** das annotierte Bild exportieren

**Tipp:** Löse das Bild nach dem letzten Schritt, der die Bildgröße ändert, mit dem ImageSolver. Dann stimmt der Maßstab in jedem Fall.

## Wichtige Hinweise zur Genauigkeit

- Gemessen wird die **Projektion** am Himmel. Ein geneigtes Objekt ist in Wirklichkeit größer.
- **Entfernungen sind Richtwerte.** Je nach Quelle schwanken sie um 5 bis 30 %, und der Messwert schwankt im gleichen Verhältnis mit.
- Mond- und Planetenbilder lassen sich meist nicht plate-solven. Zur Kontrolle: Eine Linie über den ganzen Mond muss rund **3.474 km** ergeben.

Details stehen in der Dokumentation.

## Web-App (in Arbeit)

Eine Browser-Version, die ohne PixInsight läuft, ist in Arbeit, aber noch nicht fertig. Sie wird hier ergänzt, sobald sie einsatzbereit ist.

## Feedback

Fehler gefunden, Rechnung unplausibel oder eine Idee? Ich freue mich über ein [Issue](../../issues) oder eine Nachricht. Hilfreich sind dabei:
- Kamera, Brennweite und Bearbeitungsschritte (Debayer, Binning, Resample, Drizzle)
- der Konsolenbericht des Scripts (steht in der PixInsight-Konsole)

## Credits

Die ursprüngliche Idee und die Excel-Tabelle, mit der ich seit 2021 gerechnet habe, stammen von **Rainer und Daniel**. Herzlichen Dank für die Vorarbeit und die Inspiration!
▶ [Rechner! Ausdehnung pro Pixel in Kilometer bzw. Lichtjahre bei Mond Krater oder Planeten bestimmen (YouTube)](https://www.youtube.com/watch?v=s6AZzTCcYxc)

Das Script ist mit Unterstützung von KI („Vibe Coding“) entstanden.

## Lizenz

*Noch festzulegen.*
