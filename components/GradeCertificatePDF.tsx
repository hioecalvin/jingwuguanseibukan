"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

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

  assessor_type: "member" | "external" | null;
  assessor_member_id: string | null;
  assessor_name: string | null;
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

const styles =
  StyleSheet.create({
    page: {
      padding: 38,
      backgroundColor:
        "#ffffff",
      color: "#111111",
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

    logoRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 14,
    },

    organisationLogo: {
      width: 82,
      height: 82,

      objectFit:
        "contain",
    },

    logoDivider: {
      width: 1,
      height: 62,

      backgroundColor:
        "#cccccc",

      marginHorizontal: 20,
    },

    categoryLogo: {
      width: 82,
      height: 82,

      objectFit:
        "contain",
    },

    organisation: {
      fontSize: 17,
      fontFamily:
        "Helvetica-Bold",
      letterSpacing: 1,
    },

    discipline: {
      marginTop: 5,

      fontSize: 10,

      fontFamily:
        "Helvetica-Bold",

      letterSpacing: 0.8,
    },

    certificateTitle: {
      fontSize: 24,
      fontFamily:
        "Helvetica-Bold",

      marginTop: 20,

      letterSpacing: 1.4,
    },

    certify: {
      marginTop: 28,
      fontSize: 11,
    },

    memberName: {
      marginTop: 15,

      fontSize: 25,

      fontFamily:
        "Helvetica-Bold",
    },

    line: {
      width: 330,

      borderBottomWidth: 1,

      borderBottomColor:
        "#555555",

      marginTop: 5,
    },

    statement: {
      marginTop: 25,

      fontSize: 11,

      textAlign:
        "center",

      lineHeight: 1.6,
    },

    rank: {
      marginTop: 16,

      fontSize: 29,

      fontFamily:
        "Helvetica-Bold",

      letterSpacing: 1,
    },

    details: {
      width: "80%",
      marginTop: 30,
    },

    row: {
      flexDirection:
        "row",

      marginBottom: 7,
    },

    label: {
      width: 130,

      color:
        "#555555",

      fontSize: 9,
    },

    value: {
      flex: 1,

      fontFamily:
        "Helvetica-Bold",

      fontSize: 9,
    },

    reprintNotice: {
      marginTop: 12,

      paddingVertical: 5,

      paddingHorizontal: 10,

      borderWidth: 1,

      borderColor:
        "#999999",

      fontSize: 8,

      fontFamily:
        "Helvetica-Bold",
    },

    signatures: {
      width: "80%",

      marginTop: 38,

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


function formatDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "en-AU",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
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
      day: "numeric",
      month: "long",
      year: "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}


export default function GradeCertificatePDF({
  record,
  audit,
  organisationLogoUrl,
  categoryLogoUrl,
}: Props) {
  return (
    <Document
      title={`${record.rank_name} Certificate - ${record.full_name}`}
      author="Jingwuguan Seibukan"
      subject="Certificate of Promotion"
    >
      <Page
        size="A4"
        orientation="landscape"
        style={styles.page}
      >

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
          style={styles.body}
        >

          {/* LOGOS */}

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
            style={styles.line}
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
            style={styles.rank}
          >
            {record.rank_name}
          </Text>


          {/* DETAILS */}

          <View
            style={styles.details}
          >

            <View
              style={styles.row}
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


            <View
              style={styles.row}
            >
              <Text
                style={
                  styles.label
                }
              >
                Member ID
              </Text>

              <Text
                style={
                  styles.value
                }
              >
                {record.member_id ??
                  "-"}
              </Text>
            </View>


            {record.aikikai_registration_number && (
              <View
                style={styles.row}
              >
                <Text
                  style={
                    styles.label
                  }
                >
                  Aikikai Registration No.
                </Text>

                <Text
                  style={
                    styles.value
                  }
                >
                  {record.aikikai_registration_number}
                </Text>
              </View>
            )}


            <View
              style={styles.row}
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


            <View
              style={styles.row}
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


            <View
              style={styles.row}
            >
              <Text
                style={
                  styles.label
                }
              >
                Assessor
              </Text>

              <Text
                style={
                  styles.value
                }
              >
                {record.assessor_name ??
                  "Not recorded"}
                {record.assessor_type
                  ? ` (${record.assessor_type === "external" ? "External" : "Member"})`
                  : ""}
              </Text>
            </View>


            <View
              style={styles.row}
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


            <View
              style={styles.row}
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


          {audit.print_type ===
            "reprint" && (

            <Text
              style={
                styles.reprintNotice
              }
            >
              OFFICIAL REPRINT — ORIGINAL CERTIFICATE NUMBER RETAINED
            </Text>

          )}


          {/* SIGNATURES */}

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
                Authorised Instructor / Examiner
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


        {/* AUDIT FOOTER */}

        <View
          style={styles.footer}
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
            {" · "}
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