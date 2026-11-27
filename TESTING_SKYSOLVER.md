# SkySolver-Testversion v1.5.0-test

Die Testversion liegt ausschließlich im Branch `codex/skysolver-test`. Die veröffentlichte App unter https://astromatz.github.io/localsizemeasurer/ bleibt unverändert. Bitte zum Ausprobieren weder den Branch mergen noch die GitHub-Pages-Quelle umstellen.

## Testversion öffnen

1. [index.html im Testbranch](https://github.com/astromatz/localsizemeasurer/blob/codex/skysolver-test/index.html) öffnen.
2. Oben rechts im Dateibereich **Download raw file** verwenden (Download-Symbol). Die Datei als `index.html` speichern.
3. Die heruntergeladene Datei per Doppelklick in einem aktuellen Edge, Chrome, Firefox oder Safari öffnen. Im Kopf muss **Testversion v1.5.0-test** stehen.
4. Ein eigenes, bereits gestrecktes Astrofoto laden und die Frage zum Bildzustand beantworten. Bei unbekannter Bearbeitung ist „Weiß ich nicht“ passend.
5. In Schritt 2 die Bildart wählen und **Bildkopie senden und lösen** drücken. Die Internetverbindung wird erst bei diesem Klick benutzt. Die generierte Demo hat keine echte Himmelsposition und lässt sich absichtlich nicht lösen.

Eine Branch-Adresse unter der bisherigen GitHub-Pages-URL ist kein separater Testserver. Diese Version wird lokal geöffnet.

## Deep-Sky und Sternfelder

- „Sternfeld / Deep-Sky“ wählen.
- Nach Erfolg erscheint der auf die Originalauflösung bezogene Maßstab in Bogensekunden/Pixel. Die Kalibrierung ist automatisch aktiviert; Kamera und Brennweite sind dann optional.
- Die Entfernung des Zielobjekts in Schritt 3 bleibt erforderlich. Sie wird durch Solving nicht ermittelt.
- Die App nutzt zunächst einen konstanten Maßstab aus der Bildmitte. Bei Weitwinkelbildern kann der örtliche Maßstab abweichen. Panorama-/Fisheye-Projektionslösungen werden deshalb nicht als konstante Kalibrierung übernommen.
- Falls Optikangaben vorliegen, bleibt ihr Vergleich mit der gelösten Skala sichtbar.
- Manuelle Bildskala und automatische Kalibrierung können sich gegenseitig ablösen; der jeweils aktivierte Weg wird als Quelle angezeigt.

## Mondbilder

- „Mond (Scheibe oder Ausschnitt)“ wählen. Die Objektart wird auf Sonnensystem und der Himmelskörper auf Mond gestellt.
- Der separate Mond-Solver funktioniert laut Anbieter auch ohne Sterne und mit ausreichend großen Ausschnitten. Sehr kleine Krater-Nahaufnahmen können scheitern.
- Ausschließlich `verdict: verified` wird übernommen. `plausible`, `unsure` oder `solved: false` aktivieren keine neue Kalibrierung.
- Die Lösung liefert **Kilometer/Pixel**, keine Himmelskoordinaten und keine Bildskala in Bogensekunden/Pixel. Die App rechnet projizierte Größen direkt aus diesem Wert.
- Ein eingezeichneter Durchmesser über die ganze Mondscheibe sollte ungefähr **3474,8 km** ergeben (Referenzradius des Dienstes: 1737,4 km).
- Eine geänderte Entfernung darf die Kilometerwerte bei aktiver Mondkalibrierung nicht ändern. Sie dient nur zur ungefähren Winkelanzeige.
- Projizierte Längen und Kreisflächen sind **keine Oberflächenstrecken oder Oberflächenflächen** auf der gekrümmten Mondkugel. Das ist insbesondere nahe dem Mondrand relevant.
- Die App erfindet keine numerische Messunsicherheit. Das wird in Ergebnissen und Exportgrundlage angegeben.
- Nach einem Wechsel zu einem anderen Himmelskörper oder einem Deep-Sky-Katalogobjekt wird die Mondkalibrierung deaktiviert.

## Sonne und Planeten

SkySolver dokumentiert keinen eigenen Solving-Endpunkt für Sonne oder Planeten ohne Sterne. Dafür „Sonne / Planet ohne Sternfeld – manuell“ wählen und Brennweite/Kamera oder eine bekannte Bildskala verwenden. Das Online-Solving ist in dieser Auswahl gesperrt.

Bei einer Sonnensystemaufnahme mit genügend sichtbaren Sternen kann „Sternfeld / Deep-Sky“ verwendet werden. Ob ein konkretes Bild lösbar ist, muss praktisch geprüft werden.

## Übertragung und Fehlerfälle

- Vor dem Klick auf den Solving-Knopf wird keine Verbindung zu SkySolver aufgebaut.
- Übertragen wird eine im Browser erzeugte PNG-Kopie ohne Messungen und ohne die Metadaten der Originaldatei. Die Ausrichtung entspricht der Anzeige, auch bei FITS.
- Lange Seite höchstens 3000 Pixel für Sternfelder, 2048 Pixel für den Mond. Zu große PNG-Dateien werden vor der Übertragung weiter verkleinert. Maßstäbe werden mit dem exakten Kopierfaktor auf Originalpixel zurückgerechnet.
- Die Originalauflösung, die Bilddatei und die Messkoordinaten bleiben unverändert.
- Mit **Abbrechen** lässt sich die Anfrage abbrechen. Das garantiert nicht, dass die serverseitige Rechnung sofort endet.
- Nach 65 Sekunden ohne abgeschlossenes Ergebnis bricht der Browser die Anfrage ab. Der serverseitige Suchzeitraum für Sternfelder ist separat auf 12 Sekunden gesetzt.
- Bei HTTP 429 berücksichtigt die App `Retry-After` beziehungsweise `retry_after` und zeigt eine Wartezeit. Es gibt keine automatischen Wiederholungs-Uploads.
- Bei Fehlern bleiben Optik und manuelle Kalibrierung verfügbar. Eine zuvor für dasselbe Bild aktivierte Kalibrierung bleibt erhalten, solange sie nicht abgewählt oder durch Bild-/Moduswechsel verworfen wurde.
- Neues Bild: automatische **und manuelle** Kalibrierungen werden verworfen. Verspätete Antworten und ältere Ladevorgänge können das neue Bild nicht überschreiben.

## Empfohlene Prüfung mit echten Aufnahmen

| Prüfung | Erwartung |
|---|---|
| Ein in PixInsight gelöstes Sternfeld als PNG, TIFF und FITS | Gleiche Originalauflösung; Maßstab nahe dem Wert aus PixInsight |
| Dasselbe Bild auf halbe Breite/Höhe skaliert | Ungefähr doppelter Maßstab in ″/Pixel |
| Dasselbe Bild nur zugeschnitten | Maßstab ungefähr gleich; örtliche Verzeichnung kann einen Unterschied erklären |
| FITS und PNG desselben Bildes | Gleiche projizierte Größen; keine unerwartete Drehung/Spiegelung der Anzeige |
| Vollmond, Halbmond, größerer Mond-Ausschnitt | Nur verifizierte Lösung wird verwendet; keine vorgetäuschte Oberflächenmessung |
| Mondentfernung zwischen Minimum und Maximum wechseln | Kilometerwerte konstant, Winkelanzeige verändert |
| Sonnen- oder Planetennahaufnahme ohne Sterne | Manueller Weg, keine ungeeignete Online-Anfrage |
| Bild B laden, während Bild A gelöst wird | Ergebnis von A wird nicht auf B angewendet |
| Online-Kalibrierung abwählen / manuellen Wert aktivieren | Angezeigte Quelle und sämtliche Messwerte folgen der Auswahl |
| Netzwerk unterbrechen, abbrechen, später erneut starten | Verständliche Meldung, keine dauerhaft gesperrten Bedienelemente |
| PNG-/JPEG-Export mit Info-Leiste | Originalauflösung, richtige Quelle und passende Messgrundlage |
| Lokale Datei in Edge/Chrome, Firefox und Safari | Upload-CORS, Dateiimport und Export praktisch prüfen |

## Automatische Regressionen

```sh
node --test tests/skysolver.test.cjs
```

Die Tests benötigen Node.js ab Version 18 und keine Zusatzpakete. Sie führen das vollständige App-Script mit nachgebildeten DOM-, Canvas- und API-Schnittstellen aus. Es werden keine echten Bilder übertragen.

Prüfumfang: Rückrechnung auf Originalpixel, getrennte Mond-Einheiten, Ablehnung unsicherer oder widersprüchlicher Antworten, gegenseitige Auswahl der Kalibrierungswege, projizierte Mondgrößen, Exportgrundlage, Bild-/Objektwechsel, Lade-Rennen, Abbruch, späte Antworten, Zeitüberschreitung, Rate-Limits, Server-/Netzwerkfehler und Größenbegrenzung.

**Stand bei Erstellung:** 45 Logiktests erfolgreich in einer JavaScript-Laufzeit ausgeführt; beide Inline-Scripts auf Syntax geprüft. Der Node-Aufruf wird zusätzlich durch den auf diesen Branch begrenzten Workflow „SkySolver test branch“ auf GitHub ausgeführt; sein Status steht im Actions-Reiter. Echte Bilddekodierung/PNG-Erzeugung, visuelle Browserprüfungen und ein echter API-Solving-Durchlauf stehen mit den eigenen Aufnahmen noch aus.

API-Referenz: https://skysolver.app/de/api-docs
