import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Termini e Privacy — Prenota",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 font-semibold text-[#F0E9E0]">{title}</p>
      <div className="space-y-2 text-sm leading-relaxed text-[#D9CFC4]">{children}</div>
    </div>
  );
}

export default function TerminiPage() {
  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#C17F45]/40 bg-[#251C17] text-[#C17F45]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F0E9E0]">Termini di Servizio e Informativa Privacy</h1>
            <p className="text-xs text-[#A69686]">Per chi si registra come gestore di un locale su Prenota</p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-[#E3A857]/30 bg-[#E3A857]/10 p-4 text-xs leading-relaxed text-[#E3A857]">
          Bozza di lavoro. Le parti tra parentesi quadre [ ] vanno completate con i dati reali della tua
          attività prima di pubblicare questa pagina a clienti veri. Consigliata una revisione da parte di
          un consulente legale prima dell'avvio di pagamenti a pagamento.
        </div>

        <div className="rounded-2xl border border-[#3A2C22] bg-[#251C17] p-5">
          <p className="mb-4 text-xs uppercase tracking-widest text-[#A69686]">Termini di Servizio</p>

          <Section title="1. Il servizio">
            <p>
              Prenota ("il Servizio") è un'applicazione web per la gestione di prenotazioni, sala e menu
              (per ristoranti) o di ricette, dosi e magazzino (per bar), fornita da{" "}
              <strong className="text-[#F0E9E0]">[Ragione sociale / Nome e cognome, P.IVA/CF, indirizzo]</strong>{" "}
              ("noi", "il Fornitore").
            </p>
          </Section>

          <Section title="2. Prova gratuita">
            <p>
              Ogni nuova registrazione include 14 giorni di prova gratuita, senza carta di pagamento
              richiesta, con accesso alle funzioni del piano Base (Sala, Prenotazioni, Tavoli, QR per i
              clienti, lettura automatica dell'agenda e delle fatture; per i bar: enciclopedia cocktail,
              dosatore, magazzino).
            </p>
            <p>
              Al termine della prova, per continuare a usare il Servizio è necessario scegliere un piano a
              pagamento. In assenza di scelta, l'accesso alle funzioni si blocca fino alla scelta di un piano.
            </p>
          </Section>

          <Section title="3. Piani e prezzi">
            <p>
              <strong className="text-[#F0E9E0]">Base</strong> — 150€/mese: le funzioni incluse nella prova.
            </p>
            <p>
              <strong className="text-[#F0E9E0]">Premium</strong> — 200€/mese: tutto il piano Base, più
              Comande, Clienti e fedeltà, Statistiche, Registro HACCP, Turni, Fornitori e ordini, Cestino.
            </p>
            <p>
              Puoi passare da un piano all'altro (o disdire) in qualsiasi momento; il cambio è immediato e
              non richiede alcuna procedura particolare.
            </p>
          </Section>

          <Section title="4. Pagamento">
            <p>
              [Da completare quando sarà attivo il pagamento online: metodo di pagamento, data di
              addebito, gestione dei mancati pagamenti.] Fino a quel momento, l'attivazione dei piani a
              pagamento avviene manualmente da parte del Fornitore.
            </p>
          </Section>

          <Section title="5. Durata, disdetta e cancellazione dei dati">
            <p>
              Non c'è alcun vincolo di durata minima. Puoi interrompere l'uso del Servizio quando vuoi. Puoi
              inoltre eliminare in autonomia, in qualsiasi momento, il tuo locale e tutti i suoi dati dalla
              sezione Profilo dell'app — l'operazione è immediata e irreversibile.
            </p>
          </Section>

          <Section title="6. Le tue responsabilità">
            <p>
              Sei responsabile dell'esattezza dei dati che inserisci nel Servizio e della liceità del
              trattamento dei dati dei tuoi clienti (vedi anche l'Informativa Privacy qui sotto). Il Servizio
              è uno strumento di supporto gestionale e non sostituisce gli obblighi fiscali e normativi della
              tua attività (es. registratore di cassa telematico, scontrini, normativa HACCP): resti l'unico
              responsabile del rispetto di tali obblighi.
            </p>
          </Section>

          <Section title="7. Disponibilità del servizio">
            <p>
              Ci impegniamo a mantenere il Servizio disponibile e funzionante, ma non garantiamo continuità
              assoluta. Il Servizio si appoggia a infrastrutture cloud di terze parti (hosting e database),
              soggette a loro volta a eventuali interruzioni.
            </p>
          </Section>

          <Section title="8. Limitazione di responsabilità">
            <p>
              Nei limiti consentiti dalla legge, il Fornitore non risponde di danni indiretti derivanti
              dall'uso del Servizio. Nulla in questi termini esclude responsabilità che non possono essere
              escluse per legge.
            </p>
          </Section>

          <Section title="9. Modifiche ai termini">
            <p>
              Possiamo aggiornare questi termini nel tempo; le modifiche rilevanti verranno comunicate con
              ragionevole anticipo tramite l'app o via email.
            </p>
          </Section>

          <Section title="10. Legge applicabile">
            <p>
              Questi termini sono regolati dalla legge italiana. Foro competente:{" "}
              <strong className="text-[#F0E9E0]">[città da inserire]</strong>.
            </p>
          </Section>
        </div>

        <div className="mt-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-5">
          <p className="mb-4 text-xs uppercase tracking-widest text-[#A69686]">Informativa Privacy — Gestori</p>

          <Section title="1. Titolare del trattamento">
            <p>
              Per i dati che riguardano te come utente del Servizio (nome, email, telefono, dati del tuo
              account), titolare del trattamento è{" "}
              <strong className="text-[#F0E9E0]">[Ragione sociale / Nome e cognome, contatti]</strong>.
            </p>
          </Section>

          <Section title="2. Dati raccolti su di te">
            <p>
              Nome, email, numero di telefono (se fornito), nome e dati del tuo locale, e i contenuti che
              inserisci usando il Servizio (es. menu, turni, fornitori).
            </p>
          </Section>

          <Section title="3. Perché li trattiamo">
            <p>
              Per fornirti il Servizio, gestire il tuo account, comunicarti informazioni rilevanti (es.
              scadenza della prova gratuita) e, quando attiva, la fatturazione.
            </p>
          </Section>

          <Section title="4. Il tuo ruolo verso i dati dei tuoi clienti">
            <p>
              Quando un cliente prenota tramite il tuo link o QR code, <strong className="text-[#F0E9E0]">tu</strong>{" "}
              sei il titolare del trattamento dei suoi dati (nome, telefono, eventuali note). Il Fornitore
              agisce come responsabile del trattamento per tuo conto, ai sensi dell'art. 28 del Regolamento
              (UE) 2016/679, trattando quei dati esclusivamente secondo le tue istruzioni e per erogare il
              Servizio.
            </p>
          </Section>

          <Section title="5. Dove sono conservati i dati">
            <p>
              I dati sono conservati su infrastrutture cloud fornite da terzi (database e hosting), con
              misure di sicurezza standard di settore. Alcune funzioni (lettura automatica di foto e
              fatture, assistente di supporto) utilizzano un servizio di intelligenza artificiale di terze
              parti per elaborare il contenuto delle immagini o dei messaggi che invii.
            </p>
          </Section>

          <Section title="6. Per quanto tempo">
            <p>
              I dati restano conservati finché il tuo account resta attivo. Puoi cancellare definitivamente
              il tuo locale e tutti i suoi dati in qualsiasi momento dalla sezione Profilo.
            </p>
          </Section>

          <Section title="7. I tuoi diritti">
            <p>
              Hai diritto di accedere, correggere, cancellare i tuoi dati, richiederne la portabilità, e
              opporti al loro trattamento. Puoi esercitare questi diritti scrivendo a{" "}
              <strong className="text-[#F0E9E0]">[email di contatto]</strong>, oltre a poter cancellare il
              tuo locale autonomamente dall'app. Hai inoltre diritto di proporre reclamo al Garante per la
              protezione dei dati personali.
            </p>
          </Section>
        </div>

        <p className="mt-4 text-center text-xs text-[#A69686]">Ultimo aggiornamento: [data]</p>
      </div>
    </div>
  );
}
