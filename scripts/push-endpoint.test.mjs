import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";


function loadTypeScript(
  relativePath,
  dependencies = {},
  env = {},
) {
  const filename =
    new URL(
      `../${relativePath}`,
      import.meta.url,
    );

  const {
    outputText,
  } = ts.transpileModule(
    fs.readFileSync(
      filename,
      "utf8",
    ),
    {
      fileName:
        filename.pathname,
      compilerOptions: {
        esModuleInterop:
          true,
        module:
          ts.ModuleKind.CommonJS,
        target:
          ts.ScriptTarget.ES2022,
      },
    },
  );

  const loaded = {
    exports: {},
  };

  vm.runInNewContext(
    outputText,
    {
      module:
        loaded,
      exports:
        loaded.exports,
      require(name) {
        if (
          Object.hasOwn(
            dependencies,
            name,
          )
        ) {
          return dependencies[name];
        }

        throw new Error(
          `Unexpected dependency: ${name}`,
        );
      },
      process: {
        env: {
          ...env,
        },
      },
      Error,
      JSON,
      Set,
      URL,
    },
    {
      filename:
        filename.pathname,
      timeout: 1000,
    },
  );

  return loaded.exports;
}


test(
  "push endpoints accept only reviewed browser push services",
  () => {
    const {
      trustedPushEndpoint,
    } = loadTypeScript(
      "lib/push/endpoint.ts",
    );

    assert.equal(
      trustedPushEndpoint(
        "https://FCM.GOOGLEAPIS.COM/fcm/send/browser-token",
      ),
      "https://fcm.googleapis.com/fcm/send/browser-token",
    );
    assert.equal(
      trustedPushEndpoint(
        "https://updates.push.services.mozilla.com/wpush/v2/browser-token",
      ),
      "https://updates.push.services.mozilla.com/wpush/v2/browser-token",
    );
    assert.equal(
      trustedPushEndpoint(
        "https://web.push.apple.com/Qbrowser-token?topic=unit",
      ),
      "https://web.push.apple.com/Qbrowser-token?topic=unit",
    );

    for (const endpoint of [
      undefined,
      "",
      "not-a-url",
      "http://fcm.googleapis.com/fcm/send/token",
      "https://user:password@fcm.googleapis.com/fcm/send/token",
      "https://fcm.googleapis.com:8443/fcm/send/token",
      "https://fcm.googleapis.com/fcm/send/token#fragment",
      "https://fcm.googleapis.com/",
      "https://fcm.googleapis.com//fcm/send/token",
      "https://fcm.googleapis.com.evil.test/fcm/send/token",
      "https://push.example.invalid/token",
      "https://127.0.0.1/token",
      "https://localhost/token",
      "https://fcm.googleapis.com/fcm/send/token\nhttps://evil.test",
      `https://fcm.googleapis.com/fcm/send/${"a".repeat(4096)}`,
    ]) {
      assert.equal(
        trustedPushEndpoint(
          endpoint,
        ),
        null,
        String(endpoint),
      );
    }
  },
);


test(
  "browser subscription replacement preserves a consistent database boundary",
  async () => {
    const {
      disableExistingPushSubscription,
      persistCreatedPushSubscription,
    } = loadTypeScript(
      "lib/push/client-subscription.ts",
    );

    const order = [];
    const subscription = {
      endpoint:
        "https://fcm.googleapis.com/fcm/send/browser-token",
      async unsubscribe() {
        order.push(
          "unsubscribe",
        );
        return true;
      },
    };

    await disableExistingPushSubscription(
      subscription,
      async (
        method,
        body,
      ) => {
        order.push(
          `${method}:${body.endpoint}`,
        );
      },
    );
    assert.deepEqual(
      order,
      [
        "DELETE:https://fcm.googleapis.com/fcm/send/browser-token",
        "unsubscribe",
      ],
    );

    order.length = 0;
    const disableFailure =
      new Error(
        "database disable failed",
      );
    await assert.rejects(
      disableExistingPushSubscription(
        subscription,
        async () => {
          order.push(
            "DELETE",
          );
          throw disableFailure;
        },
      ),
      error =>
        error === disableFailure,
    );
    assert.deepEqual(
      order,
      ["DELETE"],
    );

    order.length = 0;
    const saveFailure =
      new Error(
        "database save failed",
      );
    await assert.rejects(
      persistCreatedPushSubscription(
        subscription,
        {
          endpoint:
            subscription.endpoint,
        },
        async () => {
          order.push(
            "POST",
          );
          throw saveFailure;
        },
      ),
      error =>
        error === saveFailure,
    );
    assert.deepEqual(
      order,
      [
        "POST",
        "unsubscribe",
      ],
    );
  },
);


test(
  "server delivery revalidates stored endpoints before provider access",
  async () => {
    const endpoint =
      loadTypeScript(
        "lib/push/endpoint.ts",
      );
    const calls = [];
    const webpush = {
      setVapidDetails(
        subject,
        publicKey,
        privateKey,
      ) {
        calls.push({
          name:
            "configure",
          subject,
          publicKey,
          privateKey,
        });
      },
      async sendNotification(
        subscription,
        payload,
      ) {
        calls.push({
          name:
            "send",
          subscription,
          payload,
        });
        return {
          statusCode: 201,
        };
      },
    };
    const {
      sendWebPush,
    } = loadTypeScript(
      "lib/push/server.ts",
      {
        "server-only": {},
        "web-push":
          webpush,
        "@/lib/push/endpoint":
          endpoint,
      },
      {
        NEXT_PUBLIC_VAPID_PUBLIC_KEY:
          "unit-public",
        VAPID_PRIVATE_KEY:
          "unit-private",
        VAPID_SUBJECT:
          "mailto:unit@example.invalid",
      },
    );

    await assert.rejects(
      sendWebPush(
        {
          endpoint:
            "https://127.0.0.1/private",
          p256dh:
            "key",
          auth:
            "auth",
        },
        {
          title:
            "Unit",
          body:
            "Unit",
        },
      ),
      /not trusted/,
    );
    assert.deepEqual(
      calls,
      [],
    );

    await sendWebPush(
      {
        endpoint:
          "https://fcm.googleapis.com/fcm/send/browser-token",
        p256dh:
          "key",
        auth:
          "auth",
      },
      {
        title:
          "Unit",
        body:
          "Unit body",
      },
    );
    assert.equal(
      calls[0].name,
      "configure",
    );
    assert.equal(
      calls[1].name,
      "send",
    );
    assert.equal(
      calls[1].subscription.endpoint,
      "https://fcm.googleapis.com/fcm/send/browser-token",
    );
  },
);
