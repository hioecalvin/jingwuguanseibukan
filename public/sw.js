self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
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

    icon: "/js-logo.jpeg",

    badge: "/js-logo.jpeg",

    data: {
      url:
        data.url ||
        "/notifications",
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
      event.notification.data?.url ||
      "/notifications";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((windowClients) => {
          for (const client of windowClients) {
            if ("focus" in client) {
              if ("navigate" in client) {
                client.navigate(url);
              }

              return client.focus();
            }
          }

          return clients.openWindow(url);
        })
    );
  }
);