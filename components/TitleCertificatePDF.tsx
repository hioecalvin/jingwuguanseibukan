"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";


export type TitleCertificateRecord = {
  title_history_id: string;

  membership_id: string;
  user_id: string;

  member_id: string | null;
  full_name: string;

  class_id: string;
  class_name: string;
  class_logo_url: string | null;

  dojo_name: string | null;

  title_level: number;
  title_name: string;

  effective_date: string;

  granted_by: string | null;
  granted_by_name: string | null;
};


export type TitleCertificateAudit = {
  certificate_id: string;
  certificate_number: string;
  print_count: number;
  generated_at: string;

  print_type: "original" | "reprint";

  generated_by_name: string;
  generated_by_role: string;
};


type Props = {
  record: TitleCertificateRecord;
  audit: TitleCertificateAudit;

  organisationLogoUrl: string;
  categoryLogoUrl?: string | null;
};


const styles =
  StyleSheet.create({
    page: {
      position: "relative",

      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 44,

      fontFamily: "Helvetica",

      color: "#111111",
      backgroundColor: "#ffffff",
    },

    borderOuter: {
      position: "absolute",

      top: 18,
      bottom: 18,
      left: 18,
      right: 18,

      borderWidth: 2,
      borderColor: "#333333",
    },

    borderInner: {
      position: "absolute",

      top: 24,
      bottom: 24,
      left: 24,
      right: 24,

      borderWidth: 0.7,
      borderColor: "#999999",
    },

    body: {
      alignItems: "center",
    },

    logoRow: {
      height: 66,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    organisationLogo: {
      width: 58,
      height: 58,
      objectFit: "contain",
    },

    logoDivider: {
      height: 40,
      marginHorizontal: 12,

      borderLeftWidth: 0.8,
      borderLeftColor: "#bbbbbb",
    },

    categoryLogo: {
      width: 58,
      height: 58,
      objectFit: "contain",
    },

    organisation: {
      marginTop: 12,

      fontSize: 17,
      fontFamily: "Helvetica-Bold",

      letterSpacing: 2.2,
    },

    discipline: {
      marginTop: 4,

      fontSize: 9,
      color: "#666666",

      letterSpacing: 1.5,
    },

    certificateTitle: {
      marginTop: 18,

      fontSize: 14,
      fontFamily: "Helvetica-Bold",

      letterSpacing: 1.4,
    },

    certify: {
      marginTop: 22,

      fontSize: 10,
      color: "#555555",
    },

    memberName: {
      marginTop: 10,

      fontSize: 25,
      fontFamily: "Helvetica-Bold",

      letterSpacing: 0.6,
    },

    line: {
      width: "58%",

      marginTop: 7,

      borderBottomWidth: 0.8,
      borderBottomColor: "#555555",
    },

    statement: {
      width: "78%",

      marginTop: 22,

      fontSize: 11,

      textAlign: "center",
      lineHeight: 1.6,
    },

    titleName: {
      marginTop: 14,

      fontSize: 30,
      fontFamily: "Helvetica-Bold",

      letterSpacing: 1.2,
    },

    details: {
      width: "80%",
      marginTop: 28,
    },

    row: {
      flexDirection: "row",
      marginBottom: 7,
    },

    label: {
      width: 145,

      color: "#555555",

      fontSize: 9,
    },

    value: {
      flex: 1,

      fontFamily: "Helvetica-Bold",

      fontSize: 9,
    },

    reprintNotice: {
      marginTop: 10,

      paddingVertical: 5,
      paddingHorizontal: 10,

      borderWidth: 1,
      borderColor: "#999999",

      fontSize: 8,
      fontFamily: "Helvetica-Bold",
    },

    signatures: {
      width: "80%",

      marginTop: 34,

      flexDirection: "row",

      justifyContent: "space-between",
    },

    signature: {
      width: "42%",

      alignItems: "center",
    },

    signatureLine: {
      width: "100%",

      borderBottomWidth: 1,
      borderBottomColor: "#444444",

      marginBottom: 5,
    },

    signatureText: {
      fontSize: 8,

      textAlign: "center",
    },

    footer: {
      position: "absolute",

      bottom: 31,
      left: 42,
      right: 42,

      flexDirection: "row",

      justifyContent: "space-between",

      fontSize: 6.5,

      color: "#777777",
    },
  });


function formatDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
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
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",

      hour12: false,
    }
  );
}


export default function TitleCertificatePDF({
  record,
  audit,
  organisationLogoUrl,
  categoryLogoUrl,
}: Props) {
  return (
    <Document
      title={`${record.title_name} Appointment - ${record.full_name}`}
      author="Jingwuguan Seibukan"
      subject="Certificate of Title Appointment"
    >
      <Page
        size="A4"
        orientation="landscape"
        style={styles.page}
      >

        <View
          style={styles.borderOuter}
          fixed
        />

        <View
          style={styles.borderInner}
          fixed
        />


        <View
          style={styles.body}
        >

          <View
            style={styles.logoRow}
          >

            <Image
              src={organisationLogoUrl}
              style={styles.organisationLogo}
            />


            {categoryLogoUrl && (
              <>
                <View
                  style={styles.logoDivider}
                />

                <Image
                  src={categoryLogoUrl}
                  style={styles.categoryLogo}
                />
              </>
            )}

          </View>


          <Text
            style={styles.organisation}
          >
            JINGWUGUAN SEIBUKAN
          </Text>


          <Text
            style={styles.discipline}
          >
            {record.class_name.toUpperCase()}
          </Text>


          <Text
            style={styles.certificateTitle}
          >
            CERTIFICATE OF TITLE APPOINTMENT
          </Text>


          <Text
            style={styles.certify}
          >
            This is to certify that
          </Text>


          <Text
            style={styles.memberName}
          >
            {record.full_name}
          </Text>


          <View
            style={styles.line}
          />


          <Text
            style={styles.statement}
          >
            has been formally appointed and recognised by Jingwuguan Seibukan
            with the title of
          </Text>


          <Text
            style={styles.titleName}
          >
            {record.title_name}
          </Text>


          <View
            style={styles.details}
          >

            <View
              style={styles.row}
            >
              <Text
                style={styles.label}
              >
                Discipline
              </Text>

              <Text
                style={styles.value}
              >
                {record.class_name}
              </Text>
            </View>


            <View
              style={styles.row}
            >
              <Text
                style={styles.label}
              >
                Member ID
              </Text>

              <Text
                style={styles.value}
              >
                {record.member_id ?? "-"}
              </Text>
            </View>


            <View
              style={styles.row}
            >
              <Text
                style={styles.label}
              >
                Dojo
              </Text>

              <Text
                style={styles.value}
              >
                {record.dojo_name ?? "-"}
              </Text>
            </View>


            <View
              style={styles.row}
            >
              <Text
                style={styles.label}
              >
                Effective Date
              </Text>

              <Text
                style={styles.value}
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
                style={styles.label}
              >
                Appointed By
              </Text>

              <Text
                style={styles.value}
              >
                {record.granted_by_name ??
                  "Jingwuguan Seibukan"}
              </Text>
            </View>


            <View
              style={styles.row}
            >
              <Text
                style={styles.label}
              >
                Certificate No.
              </Text>

              <Text
                style={styles.value}
              >
                {audit.certificate_number}
              </Text>
            </View>


            <View
              style={styles.row}
            >
              <Text
                style={styles.label}
              >
                Print Type
              </Text>

              <Text
                style={styles.value}
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
              style={styles.reprintNotice}
            >
              OFFICIAL REPRINT — ORIGINAL CERTIFICATE NUMBER RETAINED
            </Text>

          )}


          <View
            style={styles.signatures}
          >

            <View
              style={styles.signature}
            >

              <View
                style={styles.signatureLine}
              />

              <Text
                style={styles.signatureText}
              >
                Appointing Authority
              </Text>

            </View>


            <View
              style={styles.signature}
            >

              <View
                style={styles.signatureLine}
              />

              <Text
                style={styles.signatureText}
              >
                Jingwuguan Seibukan
              </Text>

            </View>

          </View>

        </View>


        <View
          style={styles.footer}
        >

          <Text>
            {audit.certificate_number}
          </Text>


          <Text>
            Generated by{" "}
            {audit.generated_by_name}
            {" · "}
            {audit.generated_by_role}
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
