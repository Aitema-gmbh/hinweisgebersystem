# Häufige Fragen – aitema|Hinweis

## Allgemein

### Sind unsere Daten bei aitema gespeichert?

Nein. aitema|Hinweis ist eine **selbst gehostete** Software (On-Premise).
Alle Daten – Hinweise, Anhänge, Kommunikation – verbleiben ausschließlich auf Ihren eigenen
Servern. aitema hat keinen Zugriff auf Ihre Daten.

### Wie lange dauert die Installation?

Bei vorhandener Docker-Umgebung ca. **30 Minuten** für den ersten Start.
Inklusive SSL-Zertifikat und Produktionskonfiguration rechnen Sie mit ca. 1–2 Stunden.

### Brauchen wir eigene IT-Kapazitäten?

Grundlegende **Docker-Kenntnisse** reichen aus. Wer schon einmal `docker compose up`
ausgeführt hat, kann aitema|Hinweis in Betrieb nehmen. Für Updates und Wartung genügen
ca. 1–2 Stunden pro Monat.

### Ist die Software kostenlos?

Ja. aitema|Hinweis ist unter der **AGPL-3.0-Lizenz** veröffentlicht und damit kostenfrei
nutzbar. Der Quellcode ist öffentlich einsehbar und prüfbar.

### Erfüllt das System die Anforderungen des Hinweisgeberschutzgesetzes?

aitema|Hinweis wurde speziell für die Anforderungen des deutschen
Hinweisgeberschutzgesetzes (HinSchG) entwickelt und unterstützt:
- Anonyme Meldungen ohne IP-Protokollierung
- Vertrauliche Zwei-Wege-Kommunikation
- Fristenmanagement gemäß HinSchG §17
- Rollenbasierte Zugriffskontrolle

### Kann ich mehrere Gemeinden / Mandanten betreiben?

Derzeit unterstützt eine Installation einen Mandanten. Für Zweckverbände oder
kommunale Zusammenschlüsse empfehlen wir separate Instanzen pro Körperschaft.

### Wie werden Updates eingespielt?

```bash
git pull
docker compose pull
docker compose up -d
```

Datenbank-Migrationen laufen automatisch beim Start. Ein Backup vor dem Update ist dennoch empfohlen.

## Support

- GitHub Issues: https://github.com/Aitema-gmbh/hinweisgebersystem/issues
- E-Mail: kontakt@aitema.de
