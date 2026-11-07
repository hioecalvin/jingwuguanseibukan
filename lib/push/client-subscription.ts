type BrowserPushSubscription = {
  endpoint: string;
  unsubscribe: () => Promise<boolean>;
};

type PersistSubscription = (
  method: "POST" | "DELETE",
  body: Record<string, unknown>,
) => Promise<void>;


export async function disableExistingPushSubscription(
  subscription: BrowserPushSubscription,
  persist: PersistSubscription,
) {
  await persist(
    "DELETE",
    {
      endpoint:
        subscription.endpoint,
    },
  );

  await subscription.unsubscribe();
}


export async function persistCreatedPushSubscription(
  subscription: BrowserPushSubscription,
  body: Record<string, unknown>,
  persist: PersistSubscription,
) {
  try {
    await persist(
      "POST",
      body,
    );
  } catch (
    persistenceError
  ) {
    await subscription
      .unsubscribe()
      .catch(
        () => false,
      );

    throw persistenceError;
  }
}
