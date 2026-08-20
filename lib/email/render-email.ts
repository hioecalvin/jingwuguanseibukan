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
        escapeHtml(
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

      return layout(
        "Password Reset Approved",
        `
          <p>
            Your password reset request
            has been approved.
          </p>

          <p>
            Your temporary password is
            based on your Date of Birth
            using this format:
          </p>

          <p
            style="
              font-size:20px;
              font-weight:700;
            "
          >
            DDMmmYYYY
          </p>

          <p>
            Example:
            <strong>
              05Nov1996
            </strong>
          </p>

          <p>
            After logging in, you will
            be required to choose a
            new password immediately.
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
            Your dojo settlement has
            been approved.
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