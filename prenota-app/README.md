# Prenota App

App per la gestione delle prenotazioni di un ristorante — ottimizzata per l'uso rapido durante il servizio, con import automatico delle prenotazioni scritte a mano tramite foto dell'agenda.

## Stack

- **Next.js 14** (App Router) — frontend + API routes
- **Supabase** — database Postgres, autenticazione staff, storage
- **Claude API (Anthropic)** — lettura foto agenda scritta a mano
- **Tailwind CSS** — styling, palette definita in `tailwind.config.ts`

## Setup

1. Installa le dipendenze:
   ```
   npm install
   ```

2. Crea un progetto su [supabase.com](https://supabase.com), poi esegui `supabase/schema.sql` nel SQL Editor del dashboard per creare le tabelle.

3. Copia `.env.example` in `.env.local` e compila con:
   - Le chiavi Supabase (Settings > API nel dashboard Supabase)
   - Una chiave API Anthropic da [console.anthropic.com](https://console.anthropic.com)

4. Avvia in locale:
   ```
   npm run dev
   ```

5. Per il deploy: collega il repository a [Vercel](https://vercel.com) e aggiungi le stesse variabili d'ambiente nel pannello del progetto.

## Struttura del progetto

```
app/
  dashboard/        Vista Servizio (griglia tavoli, status bar, import foto agenda) — IMPLEMENTATA
  prenotazioni/      Timeline + calendario prenotazioni — da implementare
  clienti/           Anagrafica clienti — da implementare
  tavoli/            Gestione anagrafica tavoli — da implementare
  impostazioni/      Orari, turni, staff — da implementare
  api/
    parse-agenda/    Route che invia la foto a Claude ed estrae le prenotazioni — IMPLEMENTATA
    reservations/    CRUD prenotazioni — da implementare
    tables/          CRUD tavoli — da implementare
    customers/       CRUD clienti — da implementare

components/
  ui/                TableCard, ReservationCard, StatusBar, PhotoImportReview — IMPLEMENTATI
  layout/            Sidebar (desktop), BottomNav (mobile) — IMPLEMENTATI

lib/
  supabase/          Client Supabase (browser + server) — IMPLEMENTATI
  parseAgendaPhoto.ts Logica di lettura foto agenda con Claude — IMPLEMENTATA

supabase/
  schema.sql         Schema completo del database — PRONTO da eseguire

types/
  index.ts           Tipi condivisi (Reservation, RestaurantTable, Customer, ecc.)
```

## Principi del tema (da rispettare in ogni nuovo componente)

Vedi `tailwind.config.ts` per la palette completa. Regole chiave:

- **Ogni stato ha SEMPRE lo stesso colore** in tutta l'app: verde = libero/confermato, ambra = in attesa/ritardo, rosso = urgenza/cancellazione, grigio = chiuso.
- **Icona + colore, mai solo colore** — per essere leggibile a colpo d'occhio anche senza soffermarsi.
- **Target touch minimo 44px** (classe `.touch-target`) — pensato per uso rapido con le mani durante il servizio.
- **Numeri sempre in font tabulare** (classe `.num-tabular`) — orari e coperti allineati e leggibili.
- **Azioni rapide sempre nella stessa posizione** (a destra) in ogni card/lista.

## Feature "Foto Agenda" — nota importante

Il flusso in `app/dashboard/page.tsx` + `PhotoImportReview.tsx` NON salva mai le prenotazioni lette dalla foto automaticamente. Lo staff deve sempre confermare (o correggere) ogni riga estratta prima del salvataggio reale, perché la scrittura a mano può essere ambigua. Non rimuovere questo passaggio di conferma in futuri sviluppi.

## Prossimi passi di sviluppo

1. Collegare le pagine placeholder (`prenotazioni`, `clienti`, `tavoli`, `impostazioni`) a Supabase con dati reali (al momento la Dashboard usa dati di esempio `MOCK_TABLES`)
2. Implementare l'endpoint `POST /api/reservations` per salvare le prenotazioni confermate da `PhotoImportReview`
3. Implementare l'autenticazione staff (Supabase Auth)
4. Vista Calendario in `prenotazioni/`
5. Fase 2: interfaccia pubblica di prenotazione per i clienti finali
