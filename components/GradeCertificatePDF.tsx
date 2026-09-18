"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export type CertificateRecord = {
  promotion_history_id: string;
  membership_id: string;
  user_id: string;

  member_id: string | null;
  aikikai_registration_number: string | null;

  full_name: string;

  class_id: string;
  class_name: string;
  class_logo_url: string | null;

  dojo_name: string | null;

  rank_id: string;
  rank_name: string;

  effective_date: string;

  promoted_by: string | null;
  promoted_by_name: string | null;

  assessor_type:
    | "member"
    | "external"
    | null;

  assessor_member_id:
    | string
    | null;

  assessor_name:
    | string
    | null;
};


export type CertificateAudit = {
  certificate_id: string;
  certificate_number: string;

  generated_at: string;
  generated_by: string;

  generated_by_name: string;
  generated_by_role: string;

  print_type:
    | "original"
    | "reprint";
};


type Props = {
  record: CertificateRecord;
  audit: CertificateAudit;

  organisationLogoUrl: string;

  categoryLogoUrl:
    | string
    | null;
};


/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles =
  StyleSheet.create({
    page: {
      padding: 34,

      backgroundColor:
        "#ffffff",

      color:
        "#111111",

      fontFamily:
        "Helvetica",
    },


    borderOuter: {
      position:
        "absolute",

      top: 18,
      bottom: 18,
      left: 18,
      right: 18,

      borderWidth: 2,

      borderColor:
        "#222222",
    },


    borderInner: {
      position:
        "absolute",

      top: 24,
      bottom: 24,
      left: 24,
      right: 24,

      borderWidth: 0.8,

      borderColor:
        "#888888",
    },


    body: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    /*
     * ========================================================
     * LOGOS
     * ========================================================
     */

    logoRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 8,
    },


    organisationLogo: {
      width: 60,
      height: 60,

      objectFit:
        "contain",
    },


    logoDivider: {
      width: 1,
      height: 44,

      backgroundColor:
        "#cccccc",

      marginHorizontal: 14,
    },


    categoryLogo: {
      width: 60,
      height: 60,

      objectFit:
        "contain",
    },


    /*
     * ========================================================
     * HEADER
     * ========================================================
     */

    organisation: {
      fontSize: 15,

      fontFamily:
        "Helvetica-Bold",

      letterSpacing: 1,
    },


    discipline: {
      marginTop: 3,

      fontSize: 8.5,

      fontFamily:
        "Helvetica-Bold",

      letterSpacing: 0.8,
    },


    certificateTitle: {
      fontSize: 19,

      fontFamily:
        "Helvetica-Bold",

      marginTop: 10,

      letterSpacing: 1.4,
    },


    /*
     * ========================================================
     * MEMBER / AWARD
     * ========================================================
     */

    certify: {
      marginTop: 13,

      fontSize: 9.5,
    },


    memberName: {
      marginTop: 8,

      fontSize: 21,

      fontFamily:
        "Helvetica-Bold",
    },


    line: {
      width: 370,

      borderBottomWidth: 1,

      borderBottomColor:
        "#555555",

      marginTop: 4,
    },


    statement: {
      marginTop: 11,

      fontSize: 9.5,

      textAlign:
        "center",

      lineHeight: 1.3,
    },


    rank: {
      marginTop: 8,

      fontSize: 23,

      fontFamily:
        "Helvetica-Bold",

      letterSpacing: 1,
    },


    /*
     * ========================================================
     * DETAILS
     * ========================================================
     */

    details: {
      width: "80%",

      marginTop: 14,
    },


    row: {
      flexDirection:
        "row",

      marginBottom: 3,
    },


    label: {
      width: 170,

      color:
        "#555555",

      fontSize: 8.5,
    },


    value: {
      flex: 1,

      fontFamily:
        "Helvetica-Bold",

      fontSize: 8.5,
    },


    reprintNotice: {
      marginTop: 6,

      paddingVertical: 4,

      paddingHorizontal: 10,

      borderWidth: 1,

      borderColor:
        "#999999",

      fontSize: 8,

      fontFamily:
        "Helvetica-Bold",
    },


    /*
     * ========================================================
     * SIGNATURES
     * ========================================================
     */

    signatures: {
      width: "80%",

      marginTop: 14,

      flexDirection:
        "row",

      justifyContent:
        "space-between",
    },


    signature: {
      width: "42%",

      alignItems:
        "center",
    },


    signatureLine: {
      width: "100%",

      borderBottomWidth: 1,

      borderBottomColor:
        "#444444",

      marginBottom: 5,
    },


    signatureText: {
      fontSize: 8,

      textAlign:
        "center",
    },


    /*
     * ========================================================
     * AUDIT FOOTER
     * ========================================================
     */

    footer: {
      position:
        "absolute",

      bottom: 31,
      left: 42,
      right: 42,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      fontSize: 6.5,

      color:
        "#777777",
    },
  });


/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function formatDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "en-AU",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    }
  );
}


function formatDateTime(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    "en-AU",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}


/*
 * ============================================================
 * CERTIFICATE
 * ============================================================
 */

export default function GradeCertificatePDF({
  record,
  audit,
  organisationLogoUrl,
  categoryLogoUrl,
}: Props) {

  /*
   * ==========================================================
   * MEMBER IDENTIFICATION
   *
   * Aikido Members with an Aikikai registration number use:
   *
   * Member ID / Aikikai Registration Number
   *
   * Everyone else uses the normal Member ID.
   * ==========================================================
   */

  const hasAikikaiNumber =
    record.class_name
      .trim()
      .toLowerCase() ===
      "aikido" &&
    Boolean(
      record.aikikai_registration_number
        ?.trim()
    );


  const identificationLabel =
    hasAikikaiNumber
      ? "Member ID / Aikikai Registration Number"
      : "Member ID";


  const identificationValue =
    hasAikikaiNumber
      ? `${
          record.member_id ??
          "-"
        } / ${
          record.aikikai_registration_number
        }`
      : record.member_id ??
        "-";


  /*
   * ==========================================================
   * ASSESSOR
   *
   * assessor_name is a historical snapshot.
   *
   * Do not resolve the current profile name here because the
   * historical grading record must remain unchanged.
   * ==========================================================
   */

  const assessorName =
    record.assessor_name
      ?.trim() ||
    "Not recorded";


  return (
    <Document
      title={`${record.rank_name} Certificate - ${record.full_name}`}
      author="Jingwuguan Seibukan"
      subject="Certificate of Promotion"
    >
      <Page
        size="A4"
        orientation="landscape"
        style={
          styles.page
        }
      >

        {/*
         * ====================================================
         * BORDERS
         * ====================================================
         */}

        <View
          style={
            styles.borderOuter
          }
          fixed
        />


        <View
          style={
            styles.borderInner
          }
          fixed
        />


        <View
          style={
            styles.body
          }
        >

          {/*
           * ==================================================
           * LOGOS
           * ==================================================
           */}

          <View
            style={
              styles.logoRow
            }
          >
            <Image
              src={
                organisationLogoUrl
              }

              style={
                styles.organisationLogo
              }
            />


            {categoryLogoUrl && (
              <>
                <View
                  style={
                    styles.logoDivider
                  }
                />


                <Image
                  src={
                    categoryLogoUrl
                  }

                  style={
                    styles.categoryLogo
                  }
                />
              </>
            )}
          </View>


          {/*
           * ==================================================
           * ORGANISATION
           * ==================================================
           */}

          <Text
            style={
              styles.organisation
            }
          >
            JINGWUGUAN SEIBUKAN
          </Text>


          <Text
            style={
              styles.discipline
            }
          >
            {record.class_name.toUpperCase()}
          </Text>


          <Text
            style={
              styles.certificateTitle
            }
          >
            CERTIFICATE OF PROMOTION
          </Text>


          {/*
           * ==================================================
           * MEMBER
           * ==================================================
           */}

          <Text
            style={
              styles.certify
            }
          >
            This is to certify that
          </Text>


          <Text
            style={
              styles.memberName
            }
          >
            {record.full_name}
          </Text>


          <View
            style={
              styles.line
            }
          />


          <Text
            style={
              styles.statement
            }
          >
            has successfully completed the required grading
            and has been awarded the grade of
          </Text>


          <Text
            style={
              styles.rank
            }
          >
            {record.rank_name}
          </Text>


          {/*
           * ==================================================
           * CERTIFICATE DETAILS
           * ==================================================
           */}

          <View
            style={
              styles.details
            }
          >

            {/*
             * DISCIPLINE
             */}

            <View
              style={
                styles.row
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Discipline
              </Text>


              <Text
                style={
                  styles.value
                }
              >
                {record.class_name}
              </Text>
            </View>


            {/*
             * MEMBER ID
             *
             * Aikikai number is combined with Member ID when
             * available.
             */}

            <View
              style={
                styles.row
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                {identificationLabel}
              </Text>


              <Text
                style={
                  styles.value
                }
              >
                {identificationValue}
              </Text>
            </View>


            {/*
             * PROMOTION DATE
             */}

            <View
              style={
                styles.row
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Promotion Date
              </Text>


              <Text
                style={
                  styles.value
                }
              >
                {formatDate(
                  record.effective_date
                )}
              </Text>
            </View>


            {/*
             * DOJO
             */}

            <View
              style={
                styles.row
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Dojo
              </Text>


              <Text
                style={
                  styles.value
                }
              >
                {record.dojo_name ??
                  "-"}
              </Text>
            </View>


            {/*
             * GRADING ASSESSOR
             */}

            <View
              style={
                styles.row
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Grading Assessor
              </Text>


              <Text
                style={
                  styles.value
                }
              >
                {assessorName}
              </Text>
            </View>


            {/*
             * CERTIFICATE NUMBER
             */}

            <View
              style={
                styles.row
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Certificate No.
              </Text>


              <Text
                style={
                  styles.value
                }
              >
                {
                  audit.certificate_number
                }
              </Text>
            </View>


            {/*
             * PRINT TYPE
             */}

            <View
              style={
                styles.row
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Print Type
              </Text>


              <Text
                style={
                  styles.value
                }
              >
                {audit.print_type ===
                "reprint"
                  ? "Official Reprint"
                  : "Original"}
              </Text>
            </View>

          </View>


          {/*
           * ==================================================
           * REPRINT NOTICE
           * ==================================================
           */}

          {audit.print_type ===
            "reprint" && (

            <Text
              style={
                styles.reprintNotice
              }
            >
              OFFICIAL REPRINT - ORIGINAL CERTIFICATE NUMBER RETAINED
            </Text>

          )}


          {/*
           * ==================================================
           * SIGNATURES
           * ==================================================
           */}

          <View
            style={
              styles.signatures
            }
          >

            <View
              style={
                styles.signature
              }
            >
              <View
                style={
                  styles.signatureLine
                }
              />


              <Text
                style={
                  styles.signatureText
                }
              >
                Grading Assessor
              </Text>
            </View>


            <View
              style={
                styles.signature
              }
            >
              <View
                style={
                  styles.signatureLine
                }
              />


              <Text
                style={
                  styles.signatureText
                }
              >
                Jingwuguan Seibukan
              </Text>
            </View>

          </View>

        </View>


        {/*
         * ====================================================
         * AUDIT FOOTER
         *
         * This identifies who generated/printed the system
         * certificate. It is intentionally separate from the
         * grading assessor.
         * ====================================================
         */}

        <View
          style={
            styles.footer
          }
        >
          <Text>
            {
              audit.certificate_number
            }
          </Text>


          <Text>
            Generated by{" "}
            {
              audit.generated_by_name
            }
            {" - "}
            {
              audit.generated_by_role
            }
          </Text>


          <Text>
            {formatDateTime(
              audit.generated_at
            )}
          </Text>
        </View>

      </Page>
    </Document>
  );
}
