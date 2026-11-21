# LocalSizeMeasurer

**Wie groß ist das, was ich da fotografiert habe, wirklich?**

LocalSizeMeasurer ist ein Script für [PixInsight](https://pixinsight.com). Du ziehst damit Linien oder Kreise über ein Objekt in deinem Astrofoto. Das Script rechnet daraus die tatsächliche Ausdehnung aus, in Lichtjahren bei Nebeln und Galaxien und in Kilometern bei Mond, Sonne und Planeten.

> Aktuelle Version: **v2.4.1** · getestet mit PixInsight 1.9.6 (Build 1713)

**Ohne PixInsight:** Die Web-App läuft direkt im Browser → https://astromatz.github.io/localsizemeasurer/ (v1.4, Testphase, siehe [unten](#web-app)).

---

## Funktionen

- **Interaktiv messen:** Strecken (Linie) und Kreisflächen direkt im Bild, beliebig viele nacheinander, mit Legende, Beschriftung und Ergebnisliste
- **Eingaben ändern ohne Neustart:** Optik, Entfernung oder Modus im Messfenster anpassen – die Messungen bleiben erhalten und werden neu berechnet
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
| `LSM_2_4.js` | Das Script |
| `LocalSizeMeasurer_Doc.html` | Ausführliche Dokumentation (öffnet sich auch über den Button „Dokumentation“ im Script) |
| `index.html` | Die Web-App (eine einzelne Datei) |

Lege **Script und Doku in denselben Ordner**, sonst findet der Doku-Button die Hilfe nicht.

## Installation

**Empfohlen: über das Update-Repository (Updates kommen automatisch)**
1. In PixInsight `Resources > Updates > Manage Repositories` öffnen
2. **Add** klicken und diese Adresse eintragen (mit „/“ am Ende):
   ```
   https://raw.githubusercontent.com/astromatz/localsizemeasurer/main/updates/
   ```
3. `Resources > Updates > Check for Updates`, das Paket mit **Apply** installieren, PixInsight neu starten
4. Das Script steht unter `Script > Utilities > LocalSizeMeasurer`. Neue Versionen erscheinen künftig beim Start von PixInsight bzw. bei *Check for Updates*.

Hinweise:
- Das Repository ist **nicht signiert**. PixInsight warnt deshalb vor dem Download – mit „Ja“ bestätigen.
- Voraussetzung: PixInsight ab 1.9.4.
- Wer das Script vorher über *Feature Scripts* eingebunden hat: diesen Ordner dort mit **Remove** entfernen, sonst steht es doppelt im Menü.

**Zum Ausprobieren:**
`Script > Execute Script File …` und `LSM_2_4.js` wählen. Dabei wird nichts installiert.

**Dauerhaft ins Menü:**
1. `Script > Feature Scripts …` öffnen
2. Mit **Add** den Ordner mit `LSM_2_4.js` hinzufügen
3. Mit **Done** bestätigen

Danach findest du das Script unter `Script > Utilities > LocalSizeMeasurer`.

## Kurzanleitung

1. Bild (FITS oder XISF) in PixInsight öffnen und aktivieren
2. Script starten
3. Im Parameter-Dialog den Modus wählen und die Entfernung eintragen, online suchen oder aus dem Katalog übernehmen
4. Maßstab prüfen: Orange Warnungen ernst nehmen. Ohne Plate-Solve fragt das Script, ob die Pixelgröße zum Bild passt.
5. Im Messfenster mit gedrückter linker Maustaste messen: <kbd>L</kbd> = Linie, <kbd>K</kbd> = Kreis. <kbd>Esc</kbd> bricht die laufende Messung ab. Mit **Eingaben ändern …** lassen sich Optik und Entfernung nachträglich korrigieren.
6. Mit **Bild speichern …** das annotierte Bild exportieren

Schließt sich das Messfenster über <kbd>Esc</kbd> oder das Fenster-X, bietet das Script an, es mit allen nicht gespeicherten Messungen wieder zu öffnen.

**Tipp:** Löse das Bild nach dem letzten Schritt, der die Bildgröße ändert, mit dem ImageSolver. Dann stimmt der Maßstab in jedem Fall.

## Wichtige Hinweise zur Genauigkeit

- Gemessen wird die **Projektion** am Himmel. Ein geneigtes Objekt ist in Wirklichkeit größer.
- **Entfernungen sind Richtwerte.** Je nach Quelle schwanken sie um 5 bis 30 %, und der Messwert schwankt im gleichen Verhältnis mit.
- Mond- und Planetenbilder lassen sich meist nicht plate-solven. Zur Kontrolle: Eine Linie über den ganzen Mond muss rund **3.474 km** ergeben.

Details stehen in der Dokumentation.

## Web-App

**LocalSizeMeasurer Web** misst wie das Script, braucht aber kein PixInsight: https://astromatz.github.io/localsizemeasurer/
Aktuelle Version **v1.4**, noch in der Testphase.

- **Bild bleibt bei dir:** Das Bild wird nur im Browser verarbeitet, nichts wird hochgeladen.
- **Vier Schritte:** Bild prüfen → Optik → Entfernung → Messen. Ein fünfter Reiter „Hinweise“ enthält Version, Credits und Datenschutz.
- **Messen:** Die Linie ist voreingestellt. Verschieben mit der mittleren Maustaste oder Leertaste + Ziehen. Rechts stehen Live-Werte, die Messliste (einzeln löschbar) und die Messgrundlage, darüber Maßstab, Lj/px bzw. km/px und Entfernung mit Links zum Ändern.
- **Bildzustand ist Pflicht:** Schritt 1 fragt, ob das Bild verändert wurde. Bei „Weiß ich nicht“ wird das Ergebnis als „Maßstab ungeprüft“ gekennzeichnet, solange kein Plate-Solve-Wert verwendet wird.
- **Kameraliste:** Rund 60 Astro-, Spiegelreflex- und Systemkameras tragen Pixelgröße und Sensorbreite automatisch ein. Andere Kameras gibst du von Hand ein.
- **Prüfungen:** Die App vergleicht Bild- und Sensorbreite und erkennt so Binning, Skalierung, Super-Pixel-Debayer und Zuschnitt. Optional gleicht sie mit deinem Plate-Solve-Wert ab.
- **Entfernung:** Du trägst sie selbst ein oder übernimmst sie aus dem eingebauten Deepsky-Katalog. Für Mond, Sonne und Planeten gibt es Stufen von Erdnähe bis Erdferne.
- **Hell oder dunkel:** Das Design ist umschaltbar. Optik-Profile werden lokal im Browser gespeichert.

**Bildformate:** JPG, PNG, WebP sowie TIFF und FITS (8/16/32 Bit, unkomprimiert, LZW oder ZIP). TIFF und FITS müssen **bereits gestreckt** sein – die App streckt nicht selbst und reduziert die Anzeige auf 8 Bit. XISF bitte vorher als TIFF, FITS oder PNG speichern.

**Bild speichern:** Am Ende lässt sich das Bild mit Messungen, Legende, Maßstabsleiste und Info-Leiste in voller Auflösung als PNG oder JPEG sichern.

**Unterschiede zum Script:** Die Web-App liest keine FITS-Header und keine Plate-Solve-Daten aus der Datei. Brennweite, Kamera und Bearbeitungsschritte gibst du deshalb selbst an. Eine Online-Entfernungssuche gibt es nicht.

**Offline nutzen:** `index.html` herunterladen und per Doppelklick öffnen.

## Feedback

Fehler gefunden, Rechnung unplausibel oder eine Idee? Ich freue mich über ein [Issue](../../issues) oder eine Nachricht. Hilfreich sind dabei:
- Kamera, Brennweite und Bearbeitungsschritte (Debayer, Binning, Resample, Drizzle)
- der Konsolenbericht des Scripts (steht in der PixInsight-Konsole)
- bei der Web-App: ein Screenshot der Seitenleiste „Prüfungen“

## Credits

Die ursprüngliche Idee und die Excel-Tabelle, mit der ich seit 2021 gerechnet habe, stammen von **Rainer und Daniel**. Herzlichen Dank für die Vorarbeit und die Inspiration!
▶ [Rechner! Ausdehnung pro Pixel in Kilometer bzw. Lichtjahre bei Mond Krater oder Planeten bestimmen (YouTube)](https://www.youtube.com/watch?v=s6AZzTCcYxc)

Script und Web-App sind mit Unterstützung von KI („Vibe Coding“) entstanden.

## Lizenz

MIT-Lizenz – siehe [LICENSE](LICENSE). Du darfst das Script frei nutzen, verändern und weitergeben, solange der Urheberhinweis erhalten bleibt. Es gibt keine Gewähr für die Richtigkeit der Ergebnisse.
