# Prüfungswerk – IHK Lerntrainer

Eine offlinefähige, installierbare Web-App (PWA) für iPhone und Desktop.

## Eure sechs Prüfungen

Die sechs bereitgestellten Prüfungen sind in `pruefungen-quiz.json` enthalten und werden beim ersten Öffnen automatisch geladen. In der App ist außerdem ein Import für eigene JSON-Prüfungen vorhanden. Ein Teil der PDF-Seiten waren Scans oder OCR-unsauber; bei nicht zweifelsfrei bestätigten Antworten zeigt die App eine **Selbstbewertung** statt eine erfundene Musterlösung. Das betrifft besonders Prüfung VI und zahlreiche Aufgaben in Prüfung IV.

Für Prüfung IV wurden die sicher lesbaren Aufgaben anhand öffentlich zugänglicher BWV-/DIHK-Unterlagen, Proximus-5-Informationen und einschlägiger Gesetze gelöst. Das vollständige Proximus-5-Bedingungswerk ist laut BWV ein käufliches Lehr- und Prüfungshilfsmittel; nicht zugängliche Tarifdetails wurden daher nicht als gesichert ausgegeben. Die Quellenhinweise stehen – soweit hinterlegt – direkt bei der Lösung in der App.

## Auf beiden iPhones verwenden

1. Den Inhalt dieses Pakets auf einen statischen Webhost laden, der HTTPS bereitstellt (zum Beispiel eigener Webspace oder ein statischer Hostingdienst).
2. Die HTTPS-Adresse auf beiden iPhones in Safari öffnen.
3. In Safari **Teilen → Zum Home-Bildschirm** wählen.
4. Die Prüfungen werden beim ersten Laden automatisch eingeblendet; für den jeweils eigenen Lernstand ein eigenes Profil anlegen.
5. Auf jedem Gerät ein eigenes Lernprofil verwenden. Lernstände werden getrennt auf dem jeweiligen Gerät gespeichert.

Die App kann offline genutzt werden, nachdem sie einmal über HTTPS geladen wurde. Ein Home-Screen-Icon allein synchronisiert keine Daten zwischen Geräten.

## Prüfungen übertragen

In der App **Prüfungsdaten übertragen → ↓** verwenden und die exportierte JSON-Datei auf dem zweiten Gerät importieren. Die beiden Lernstatistiken bleiben dabei getrennt.

## Lernstände sichern

**Lernstand sichern → ↓** exportiert die Statistik des gerade aktiven Profils. Auf dem anderen Gerät kann die Sicherung als neues Profil hinzugefügt werden.

## Unterstützte Aufgabentypen

- `single`: genau eine richtige Auswahl; `answerIds` enthält eine ID.
- `multiple`: alle richtigen Auswahlmöglichkeiten müssen markiert sein.
- `text`: Freitext; die Antwort wird mit der Musterlösung angezeigt und selbst als richtig/noch zu üben bewertet.

Eine JSON-Datei darf eine Prüfung oder ein Array mehrerer Prüfungen enthalten. Beim erneuten Import einer Prüfung mit derselben `examId` wird diese ersetzt.

## Datenschutz & Grenzen

Es gibt keinen Server und keine automatische Kontosynchronisierung. Prüfungen und Lernstatistiken liegen in `localStorage` des jeweiligen Browsers. Browserdaten nicht löschen, wenn der Lernstand erhalten bleiben soll; regelmäßig exportieren. Die Fragenstruktur bildet Auswahl- und Freitext ab. Sonderformate oder komplexe IHK-Bewertungsschemata müssen in den Aufgabeninhalten passend abgebildet werden.
