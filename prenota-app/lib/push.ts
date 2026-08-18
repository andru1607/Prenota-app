import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

webpush.setVapidDetails(
  "mailto:alexandrut04@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToRestaurant(
  restaurantId: string,
  payload: { title: string; body: string; url?: string }
) {
  const supabase = createAdminClient();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("restaurant_id", restaurantId);

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
