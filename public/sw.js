function safeApplicationPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.length > 2048
  ) {
    return "/notifications";
  }

  try {
    const parsed =
      new URL(
        value,
        self.location.origin
      );

    return parsed.origin ===
      self.location.origin
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : "/notifications";
  } catch {
    return "/notifications";
  }
}


self.addEventListener("push", (event) => {
  let data = {};

  try {
    const parsed =
      event.data
        ? event.data.json()
        : {};

    data =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
        ? parsed
        : {};
  } catch {
    data = {
      title: "Jingwuguan Seibukan",
      body:
        event.data?.text() ||
        "You have a new notification.",
      url: "/notifications",
    };
  }

  const title =
    data.title ||
    "Jingwuguan Seibukan";

  const options = {
    body:
      data.body ||
      "You have a new notification.",

    icon: "/logos/organization/logo-js.png",

    badge: "/logos/organization/logo-js.png",

    data: {
      url:
        safeApplicationPath(
          data.url
        ),
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});


self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const url =
      safeApplicationPath(
        event.notification.data?.url
      );

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(async (windowClients) => {
          for (const client of windowClients) {
            if ("focus" in client) {
              if ("navigate" in client) {
                await client.navigate(url);
              }

              return client.focus();
            }
          }

          return clients.openWindow(url);
        })
    );
  }
);
