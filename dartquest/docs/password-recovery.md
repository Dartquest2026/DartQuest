# Passwort-Wiederherstellung

Der Client erzeugt die Redirect-URL zentral aus der aktuellen App-Origin und dem festen Pfad `/reset-password`. Dadurch wird keine fremde oder fest verdrahtete Produktionsdomain akzeptiert.

In Supabase unter **Authentication → URL Configuration → Redirect URLs** müssen freigegeben werden:

- lokal: `http://localhost:5173/reset-password`
- Vercel Preview/Test: `https://*-dartquest2026.vercel.app/reset-password` (oder die im Vercel-Projekt tatsächlich verwendete Preview-Domain)
- Produktion: `https://<produktive-dartquest-domain>/reset-password`

Die konkrete Preview- und Produktionsdomain ist derzeit nicht im Repository konfiguriert. Vor dem Freigeben muss sie im Vercel-Projekt geprüft und der Platzhalter durch die tatsächlich verwendete Domain ersetzt werden. Die Supabase **Site URL** sollte auf die produktive App-Origin zeigen. Diese Einstellungen werden nicht durch Code oder Migration verändert.

Für den lokalen Test muss Vite unter `http://localhost:5173` laufen. `vercel.json` leitet den direkten Aufruf der Recovery-Route auf die SPA zurück.

Eine echte Reset-Mail darf ausschließlich mit einem kontrollierten Testkonto geprüft werden. Dabei sind Anforderung, einmalige Verwendung, Ablauf, Abmeldung und anschließende Anmeldung mit neuem Passwort zu testen.
