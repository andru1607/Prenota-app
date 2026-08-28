import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.warn("Chiavi VAPID non configurate: notifiche push disattivate.");
    return false;
  }

  webpush.setVapidDetails("mailto:alexandrut04@gmail.com", publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendPushToRestaurant(
  restaurantId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!ensureVapidConfigured()) return;

  const supabase = createAdminClient();

  const { data: subscriptions, error: fetchError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("restaurant_id", restaurantId);

  if (fetchError) {
    console.error("Errore lettura iscrizioni push:", fetchError);
    return;
  }

  console.log(`Trovate ${subscriptions?.length ?? 0} iscrizioni per il ristorante ${restaurantId}`);

  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          {
            urgency: "high",
            TTL: 60,
          }
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Errore invio notifica push:", err);
        }
      }
    })
  );
}
