"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

interface RestaurantInfo {
  name: string;
  contact_phone: string | null;
}

export default function PrivacyClientePage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.restaurantId as string;
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    fetch(`/api/richiesta?restaurantId=${restaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.restaurant) setRestaurant(body.restaurant);
      })
      .catch(() => {});
  }, [restaurantId]);

  const nome = restaurant?.name || "il locale";

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mx-auto w-full max-w-md">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[#A69686]"
        >
          <ArrowLeft size={16} />
          Torna alla prenotazione
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#C17F45]/40 bg-[#251C17] text-[#C17F45]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F0E9E0]">Come trattiamo i tuoi dati</h1>
            <p className="text-xs text-[#A69686]">Informativa privacy per {nome}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-5 text-sm leading-relaxed text-[#D9CFC4]">
          <p>
            Quando prenoti un tavolo presso <strong className="text-[#F0E9E0]">{nome}</strong> attraverso
            questo modulo, {nome} raccoglie alcuni tuoi dati personali per gestire la tua richiesta. Questa
            pagina spiega quali dati, perché, e quali diritti hai.
          </p>

          <div>
            <p className="mb-1 font-semibold text-[#F0E9E0]">Chi tratta i tuoi dati</p>
            <p>
              Titolare del trattamento è <strong className="text-[#F0E9E0]">{nome}</strong>, che riceve e
              gestisce direttamente la tua prenotazione. L'app utilizzata dal locale per raccogliere e
              conservare questi dati agisce come responsabile del trattamento per conto del locale.
            </p>
          </div>

          <div>
            <p className="mb-1 font-semibold text-[#F0E9E0]">Quali dati raccogliamo</p>
            <p>
              Nome, numero di telefono, data e orario richiesti, numero di persone, ed eventuali note che
              scegli di aggiungere (es. allergie o richieste particolari).
            </p>
          </div>

          <div>
            <p className="mb-1 font-semibold text-[#F0E9E0]">Perché li raccogliamo</p>
            <p>
              Esclusivamente per organizzare, confermare e gestire la tua prenotazione — ad esempio per
              contattarti in caso di problemi con il tavolo o per ricordarti l'appuntamento.
            </p>
          </div>

          <div>
            <p className="mb-1 font-semibold text-[#F0E9E0]">Per quanto tempo</p>
            <p>
              I dati restano associati alla prenotazione per il tempo necessario alla gestione del rapporto
              con il locale, salvo tua richiesta di cancellazione anticipata.
            </p>
          </div>

          <div>
            <p className="mb-1 font-semibold text-[#F0E9E0]">I tuoi diritti</p>
            <p>
              Puoi in qualsiasi momento chiedere di vedere, correggere o cancellare i tuoi dati, o opporti al
              loro trattamento, contattando direttamente {nome}
              {restaurant?.contact_phone ? ` al numero ${restaurant.contact_phone}` : ""}.
            </p>
          </div>

          <p className="text-xs text-[#A69686]">
            I tuoi dati non vengono venduti né condivisi con terzi per scopi pubblicitari.
          </p>
        </div>
      </div>
    </div>
  );
}
