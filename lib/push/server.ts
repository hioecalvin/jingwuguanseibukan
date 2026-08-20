import webpush from "web-push";


const publicKey =
  process.env
    .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const privateKey =
  process.env
    .VAPID_PRIVATE_KEY;

const subject =
  process.env
    .VAPID_SUBJECT;


if (
  !publicKey ||
  !privateKey ||
  !subject
) {
  throw new Error(
    "VAPID configuration is incomplete."
  );
}


webpush.setVapidDetails(
  subject,
  publicKey,
  privateKey
);


export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};


export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};


export async function sendWebPush(
  subscription:
    StoredPushSubscription,

  payload:
    PushPayload
) {
  return webpush.sendNotification(
    {
      endpoint:
        subscription.endpoint,

      keys: {
        p256dh:
          subscription.p256dh,

        auth:
          subscription.auth,
      },
    },

    JSON.stringify(
      payload
    )
  );
}
