<img src="LocalSizeMeasurer.svg" alt="LocalSizeMeasurer-Icon: Galaxie mit Messlinie" width="96">

# LocalSizeMeasurer

> **Testbranch: SkySolver · Web v1.5.0-test**
>
> Diese Version liegt ausschließlich auf `codex/skysolver-test`. `main`, die veröffentlichte GitHub-Pages-App und das PixInsight-Script bleiben unverändert.
>
> **Zum Ausprobieren:** [index.html dieses Branches öffnen](https://github.com/astromatz/localsizemeasurer/blob/codex/skysolver-test/index.html), über **Download raw file** herunterladen und lokal per Doppelklick im Browser öffnen. Für das Online-Solving ist eine Internetverbindung nötig.
>
> Anleitung, Grenzen und Prüffälle: [TESTING_SKYSOLVER.md](TESTING_SKYSOLVER.md).

**Wie groß ist das, was ich da fotografiert habe, wirklich?**

LocalSizeMeasurer ist ein Script für [PixInsight](https://pixinsight.com). Du ziehst damit Linien oder Kreise über ein Objekt in deinem Astrofoto. Das Script rechnet daraus die tatsächliche Ausdehnung aus, in Lichtjahren bei Nebeln und Galaxien und in Kilometern bei Mond, Sonne und Planeten.

> Aktuelle Version des Scripts: **v2.4.2** · getestet mit PixInsight 1.9.6 (Build 1713)

**Ohne PixInsight:** Die Web-App läuft direkt im Browser → https://astromatz.github.io/localsizemeasurer/ (v1.4.1, Testphase, siehe [unten](#web-app)).

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
| `LocalSizeMeasurer.svg` | Das Icon von Script und Web-App |
| `updates/` | Das PixInsight-Update-Repository (Paket und `updates.xri`) |

Lege **Script und Doku in denselben Ordner**, sonst findet der Doku-Button die Hilfe nicht. Liegt dort auch `LocalSizeMeasurer.svg`, zeigt der Parameter-Dialog das Icon. Ohne die Datei läuft das Script genauso, nur ohne Icon.

## Installation

**Empfohlen: über das Update-Repository (Updates kommen automatisch)**
1. In PixInsight `Resources > Updates > Manage Repositories` öffnen
2. **Add** klicken und diese Adresse eintragen (mit „/“ am Ende):
   ```
   https://raw.githubusercontent.com/astromatz/localsizemeasurer/main/updates/
   ```
3. `Resources > Updates > Check for Updates`, das Paket mit **Apply** installieren, PixInsight neu starten
4. Das Script steht unter `Script > Utilities > LocalSizeMeasurer`. Neue Versionen erscheinen künftig beim Start von PixInsight bzw. bei *Check for Updates*.

Das Paket installiert auch das Icon. Nur auf diesem Weg kennt PixInsight es auch außerhalb des Script-Dialogs.

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

**LocalSizeMeasurer Web** misst wie das Script, braucht aber kein PixInsight. Dieser Branch enthält **v1.5.0-test mit optionalem SkySolver**. Die bisherige Version **v1.4.1** bleibt unter https://astromatz.github.io/localsizemeasurer/ erreichbar. Der Browser-Tab zeigt das Icon von LocalSizeMeasurer.

- **Lokal oder optional online:** Messen und Export laufen im Browser. Erst mit „Bildkopie senden und lösen“ wird eine gegebenenfalls verkleinerte PNG-Kopie ohne Messungen und ohne Metadaten der Originaldatei an SkySolver geschickt. Laut Anbieter werden Bilder und Ergebnisse nicht gespeichert.
- **Sternfeld-Solving:** Bestimmt den Winkelmaßstab, rechnet ihn auf die Originalauflösung zurück und verwendet ihn statt der Optikangaben. Der Wert gilt in der Bildmitte; bei größeren Bildfeldern kann der lokale Maßstab abweichen. Panorama-/Fisheye-Projektionslösungen werden nicht als konstante Kalibrierung übernommen.
- **Mond-Solving:** Eigener Endpunkt, ausschließlich sicher bestätigte Lösungen. Die projizierten Kilometerwerte werden direkt aus km/Pixel berechnet. Keine Oberflächenstrecken; der Abstand in Schritt 3 dient nur der ungefähren Winkelanzeige. Eine numerische Messunsicherheit wird nicht behauptet.
- **Sonne und Planeten:** Ohne Sternfeld gibt es keinen passenden SkySolver-Endpunkt. Optikangaben oder manuelle Bildskala bleiben verfügbar; bei sichtbaren Sternen kann Sternfeld-Solving versucht werden.
- **Bildwechsel:** Automatische und manuelle Kalibrierungen werden verworfen. Verspätete Antworten und veraltete Ladevorgänge können kein neues Bild überschreiben.
- **Vier Schritte:** Bild prüfen → Optik → Entfernung → Messen. Ein fünfter Reiter „Hinweise“ enthält Version, Credits und Datenschutz.
- **Messen:** Die Linie ist voreingestellt. Verschieben mit der mittleren Maustaste oder Leertaste + Ziehen. Rechts stehen Live-Werte, die Messliste (einzeln löschbar) und die Messgrundlage, darüber Maßstab, Lj/px bzw. km/px und Entfernung mit Links zum Ändern.
- **Bildzustand ist Pflicht:** Schritt 1 fragt, ob das Bild verändert wurde. Bei „Weiß ich nicht“ wird das Ergebnis als „Maßstab ungeprüft“ gekennzeichnet, solange kein Plate-Solve-Wert verwendet wird.
- **Kameraliste:** Rund 60 Astro-, Spiegelreflex- und Systemkameras tragen Pixelgröße und Sensorbreite automatisch ein. Andere Kameras gibst du von Hand ein.
- **Prüfungen:** Die App vergleicht Bild- und Sensorbreite und prüft auf Binning, Skalierung, Super-Pixel-Debayer und Zuschnitt. Optional gleicht sie mit einem Plate-Solve-Wert ab. Aktive Online-Kalibrierung hat Vorrang; Kamera und Brennweite sind dann optional.
- **Entfernung:** Du trägst sie selbst ein oder übernimmst sie aus dem eingebauten Deepsky-Katalog. Für Mond, Sonne und Planeten gibt es Stufen von Erdnähe bis Erdferne.
- **Hell oder dunkel:** Das Design ist umschaltbar. Optik-Profile werden lokal im Browser gespeichert.

**Bildformate:** JPG, PNG, WebP sowie TIFF und FITS (8/16/32 Bit, unkomprimiert, LZW oder ZIP). TIFF und FITS müssen **bereits gestreckt** sein – die App streckt nicht selbst und reduziert die Anzeige auf 8 Bit. XISF bitte vorher als TIFF, FITS oder PNG speichern.

**Bild speichern:** Am Ende lässt sich das Bild mit Messungen, Legende, Maßstabsleiste und Info-Leiste in voller Auflösung als PNG oder JPEG sichern.

**Unterschiede zum Script:** Die Web-App liest keine FITS-Header und keine Plate-Solve-Daten aus der Datei. Brennweite, Kamera und Bearbeitungsschritte gibst du deshalb selbst an. Eine Online-Entfernungssuche gibt es nicht.

**Lokal nutzen:** `index.html` dieses Branches herunterladen und per Doppelklick öffnen. Messen mit Optikangaben und Export funktionieren offline; SkySolver benötigt Internet. GitHub Pages bleibt auf der bisherigen Version – die Pages-Einstellung zum Testen nicht verändern.

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

## Automatische Tests der SkySolver-Integration

Mit Node.js ab Version 18: `node --test tests/skysolver.test.cjs`.

Die Tests führen das vollständige App-Script mit nachgebildeten DOM-, Canvas- und API-Schnittstellen aus. Sie senden keine Bilder ins Internet. Sie prüfen Berechnung, Zustände, Abbruch, Zeitüberschreitung, Bildwechsel und Fehlermeldungen. Echte Bilddekodierung, visuelle Darstellung und Live-Solving müssen zusätzlich im Browser geprüft werden; siehe [Testanleitung](TESTING_SKYSOLVER.md).
