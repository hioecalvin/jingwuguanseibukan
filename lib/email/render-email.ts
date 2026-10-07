type TemplateData =
  Record<
    string,
    unknown
  >;


function escapeHtml(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function safeWebUrl(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  try {
    const parsed =
      new URL(
        value
      );

    if (
      parsed.protocol !== "https:"
    ) {
      return "";
    }

    return escapeHtml(
      parsed.toString()
    );
  } catch {
    return "";
  }
}


function layout(
  title: string,
  body: string
) {
  return `
<!doctype html>

<html>
  <body
    style="
      margin:0;
      padding:0;
      background:#f5f5f5;
      font-family:Arial,Helvetica,sans-serif;
      color:#171717;
    "
  >

    <div
      style="
        max-width:620px;
        margin:0 auto;
        padding:32px 16px;
      "
    >

      <div
        style="
          background:#ffffff;
          border-radius:12px;
          padding:32px;
        "
      >

        <h1
          style="
            margin:0 0 24px;
            font-size:24px;
          "
        >
          ${escapeHtml(
            title
          )}
        </h1>


        ${body}


        <div
          style="
            margin-top:32px;
            padding-top:20px;
            border-top:1px solid #e5e5e5;
            color:#737373;
            font-size:13px;
          "
        >

          Jingwuguan Seibukan

        </div>

      </div>

    </div>

  </body>
</html>
`;
}


export function renderEmail(
  emailType: string,
  data:
    TemplateData
) {
  switch (
    emailType
  ) {

    /*
     * ===============================================
     * MEMBER APPROVED
     * ===============================================
     */

    case "member_approved": {

      const memberName =
        escapeHtml(
          data.member_name
        );

      const memberId =
        escapeHtml(
          data.member_id
        );

      const activationUrl =
        safeWebUrl(
          data.activation_url
        );


      return layout(
        "Membership Approved",
        `
          <p>
            Hello ${memberName},
          </p>

          <p>
            Your Jingwuguan Seibukan
            membership has been approved.
          </p>

          <p>
            Your Member ID is:
          </p>

          <p
            style="
              font-size:22px;
              font-weight:700;
            "
          >
            ${memberId}
          </p>

          <p>
            Use your Member ID and
            Date of Birth to activate
            your account.
          </p>

          ${
            activationUrl
              ? `
                <p>
                  <a
                    href="${activationUrl}"
                    style="
                      display:inline-block;
                      padding:12px 18px;
                      background:#171717;
                      color:#ffffff;
                      text-decoration:none;
                      border-radius:8px;
                    "
                  >
                    Activate Account
                  </a>
                </p>
              `
              : ""
          }

          <p>
            Your Date of Birth and
            password are not included
            in this email for security.
          </p>
        `
      );
    }


    /*
     * ===============================================
     * PASSWORD RESET REQUESTED
     * ===============================================
     */

    case "password_reset_requested": {

      return layout(
        "Password Reset Request",
        `
          <p>
            A Member has requested
            a password reset.
          </p>

          <p>
            Member:
            <strong>
              ${escapeHtml(
                data.member_name
              )}
            </strong>
          </p>

          <p>
            Member ID:
            <strong>
              ${escapeHtml(
                data.member_id
              )}
            </strong>
          </p>

          <p>
            Please review the request
            through the Admin system.
          </p>
        `
      );
    }


    /*
     * ===============================================
     * PASSWORD RESET APPROVED
     * ===============================================
     */

    case "password_reset_approved": {

      const memberName =
        escapeHtml(
          data.member_name
        );

      const temporaryPassword =
        escapeHtml(
          data.temporary_password
        );


      return layout(
        "Password Reset Approved",
        `
          <p>
            Hello ${memberName},
          </p>

          <p>
            Your Jingwuguan Seibukan
            password reset request has
            been approved.
          </p>

          <p>
            Your temporary password is:
          </p>

          <div
            style="
              margin:20px 0;
              padding:16px;
              background:#f5f5f5;
              border-radius:8px;
              font-size:22px;
              font-weight:700;
              letter-spacing:1px;
              text-align:center;
            "
          >
            ${temporaryPassword}
          </div>

          <p>
            Use this temporary password
            to sign in.
          </p>

          <p>
            After signing in, you will
            be required to create a new
            password before continuing.
          </p>

          <p>
            For security, do not share
            this temporary password with
            anyone.
          </p>
        `
      );
    }


    /*
     * ===============================================
     * PASSWORD RESET REJECTED
     * ===============================================
     */

    case "password_reset_rejected": {

      return layout(
        "Password Reset Request",
        `
          <p>
            Your password reset request
            was not approved.
          </p>

          ${
            data.reason
              ? `
                <p>
                  Reason:
                  ${escapeHtml(
                    data.reason
                  )}
                </p>
              `
              : ""
          }

          <p>
            Please contact your
            Administrator if you need
            assistance.
          </p>
        `
      );
    }


    /*
     * ===============================================
     * CLASS EVENT NOTIFICATION
     * ===============================================
     */

    case "class_event_notification": {

      const notificationNumber =
        Number(
          data.notification_number ??
          1
        );

      const emailHeading =
        notificationNumber === 1
          ? "New Class Event"
          : notificationNumber === 2
            ? "Event Reminder"
            : "Final Event Reminder";


      return layout(
        emailHeading,
        `
          <p>
            A
            <strong>
              ${escapeHtml(
                data.class_name
              )}
            </strong>
            event has been scheduled.
          </p>

          <div
            style="
              margin:20px 0;
              padding:20px;
              background:#f5f5f5;
              border-radius:8px;
            "
          >

            <p
              style="
                margin:0 0 14px;
                font-size:20px;
                font-weight:700;
              "
            >
              ${escapeHtml(
                data.title
              )}
            </p>

            ${
              data.description
                ? `
                  <p
                    style="
                      margin:0 0 14px;
                    "
                  >
                    ${escapeHtml(
                      data.description
                    )}
                  </p>
                `
                : ""
            }

            ${
              data.location
                ? `
                  <p
                    style="
                      margin:0 0 8px;
                    "
                  >
                    <strong>
                      Location:
                    </strong>

                    ${escapeHtml(
                      data.location
                    )}
                  </p>
                `
                : ""
            }

            ${
              data.starts_at
                ? `
                  <p
                    style="
                      margin:0 0 8px;
                    "
                  >
                    <strong>
                      Starts:
                    </strong>

                    ${escapeHtml(
                      data.starts_at
                    )}
                  </p>
                `
                : ""
            }

            ${
              data.end_at
                ? `
                  <p
                    style="
                      margin:0;
                    "
                  >
                    <strong>
                      Ends:
                    </strong>

                    ${escapeHtml(
                      data.end_at
                    )}
                  </p>
                `
                : ""
            }

          </div>

          ${
            notificationNumber === 2
              ? `
                <p>
                  This is a reminder
                  about the upcoming
                  event.
                </p>
              `
              : ""
          }

          ${
            notificationNumber >= 3
              ? `
                <p>
                  This is the final
                  reminder for this
                  event.
                </p>
              `
              : ""
          }
        `
      );
    }


    /*
     * ===============================================
     * SETTLEMENT SUBMITTED
     * ===============================================
     */

    case "dojo_settlement_submitted": {

      return layout(
        "Settlement Submitted",
        `
          <p>
            A dojo settlement has been
            submitted for review.
          </p>

          <p>
            Dojo:
            <strong>
              ${escapeHtml(
                data.dojo_name
              )}
            </strong>
          </p>

          <p>
            Month:
            <strong>
              ${escapeHtml(
                data.settlement_month
              )}
            </strong>
          </p>

          <p>
            Share amount:
            <strong>
              ${escapeHtml(
                data.share_amount
              )}
              ${escapeHtml(
                data.currency
              )}
            </strong>
          </p>
        `
      );
    }


    /*
     * ===============================================
     * SETTLEMENT APPROVED
     * ===============================================
     */

    case "dojo_settlement_approved": {

      return layout(
        "Settlement Approved",
        `
          <p>
            Your dojo settlement has been
            approved.
          </p>

          <p>
            Dojo:
            <strong>
              ${escapeHtml(
                data.dojo_name
              )}
            </strong>
          </p>

          <p>
            Month:
            <strong>
              ${escapeHtml(
                data.settlement_month
              )}
            </strong>
          </p>
        `
      );
    }


    /*
     * ===============================================
     * SETTLEMENT REJECTED
     * ===============================================
     */

    case "dojo_settlement_rejected": {

      return layout(
        "Settlement Requires Attention",
        `
          <p>
            Your dojo settlement was
            rejected and can be corrected
            and submitted again.
          </p>

          ${
            data.reason
              ? `
                <p>
                  Reason:
                  ${escapeHtml(
                    data.reason
                  )}
                </p>
              `
              : ""
          }
        `
      );
    }


    /*
     * ===============================================
     * MONTHLY SUBSCRIPTION
     * ===============================================
     */

    case "monthly_subscription": {

      return layout(
        "Monthly Subscription",
        `
          <p>
            Your membership subscription
            for
            <strong>
              ${escapeHtml(
                data.billing_month
              )}
            </strong>
            is now available.
          </p>

          <p>
            Amount:
            <strong>
              ${escapeHtml(
                data.amount
              )}
              ${escapeHtml(
                data.currency
              )}
            </strong>
          </p>
        `
      );
    }


    /*
     * ===============================================
     * PAYMENT REMINDER
     * ===============================================
     */

    case "subscription_reminder": {

      return layout(
        "Subscription Payment Reminder",
        `
          <p>
            Your subscription payment
            is still outstanding.
          </p>

          <p>
            Remaining:
            <strong>
              ${escapeHtml(
                data.outstanding_amount
              )}
              ${escapeHtml(
                data.currency
              )}
            </strong>
          </p>
        `
      );
    }


    /*
     * ===============================================
     * GENERIC FALLBACK
     * ===============================================
     */

    default: {

      return layout(
        String(
          data.title ??
          "Jingwuguan Seibukan"
        ),
        `
          <p>
            ${escapeHtml(
              data.message ??
              ""
            )}
          </p>
        `
      );
    }
  }
}
