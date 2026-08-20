"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export type PromotionRecord = {
  id: string;

  effective_date: string;

  rank_id?: string | null;
  rank_name: string | null;

  tier_id?: string | null;
  tier_name: string | null;

  recorded_at: string;
  recorded_by_id?: string | null;
  recorded_by_name: string | null;

  revoked: boolean;

  revoked_at: string | null;
  revoked_by_id?: string | null;
  revoked_by_name: string | null;

  revoke_reason: string | null;

  assessor_type: "member" | "external" | null;
  assessor_member_id: string | null;
  assessor_name: string | null;
};

export type TitleAppointmentRecord = {
  id: string;

  title_level: number;
  title_name: string | null;

  effective_date: string;

  granted_by_id?: string | null;
  granted_by_name: string | null;

  created_at: string;

  revoked: boolean;

  revoked_at: string | null;

  revoked_by_id?: string | null;
  revoked_by_name: string | null;

  revoke_reason: string | null;
};


export type OfficialRecord = {
  member: {
    membership_id: string;
    user_id: string;

    member_id: string | null;
    aikikai_registration_number: string | null;

    full_name: string;

    email: string;
    phone: string;

    whatsapp_number: string | null;

    date_of_birth: string | null;

    avatar_url: string | null;
  };

  membership: {
    class_id: string;
    class_name: string;

    dojo_id: string | null;
    dojo_name: string | null;

    status:
      | "Active"
      | "Break"
      | "Inactive"
      | string;

    role: string;

    title_system:
      | "japanese"
      | "chinese"
      | "none"
      | null;

    title_level: number | null;
    title_name: string | null;
  };

  current_grade: {
    rank_id: string | null;
    rank_name: string | null;

    tier_id: string | null;
    tier_name: string | null;

    category: string;
  };

  promotion_history: PromotionRecord[];

  title_history: TitleAppointmentRecord[];
};

export type AuditInfo = {
  audit_id?: string;

  document_reference: string;

  generated_at: string;

  generated_by?: string;

  generated_by_name: string;

  generated_by_role: string;
};

type Props = {
  record: OfficialRecord;
  audit: AuditInfo;
  logoUrl: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 48,
    paddingHorizontal: 36,

    fontFamily: "Helvetica",
    fontSize: 9,

    color: "#111111",
    backgroundColor: "#ffffff",
  },

  header: {
    alignItems: "center",
    marginBottom: 14,
  },

  logo: {
    width: 66,
    height: 66,
    objectFit: "contain",
    marginBottom: 8,
  },

  organisation: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    letterSpacing: 0.8,
  },

  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginTop: 4,
  },

  subtitle: {
    marginTop: 3,
    color: "#666666",
    fontSize: 8,
  },

  topRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#222222",
    marginTop: 12,
  },

  documentBox: {
    borderWidth: 1,
    borderColor: "#bbbbbb",
    padding: 9,
    marginTop: 12,
  },

  row: {
    flexDirection: "row",
    marginBottom: 4,
  },

  metaLabel: {
    width: 112,
    color: "#666666",
  },

  metaValue: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },

  section: {
    marginTop: 16,
  },

  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 0.4,

    borderBottomWidth: 1,
    borderBottomColor: "#bdbdbd",

    paddingBottom: 4,
    marginBottom: 9,
  },

  profileLayout: {
    flexDirection: "row",
    gap: 14,
  },

  profilePhoto: {
    width: 74,
    height: 74,

    borderWidth: 1,
    borderColor: "#cccccc",

    objectFit: "cover",
  },

  profilePlaceholder: {
    width: 74,
    height: 74,

    borderWidth: 1,
    borderColor: "#cccccc",

    alignItems: "center",
    justifyContent: "center",
  },

  profilePlaceholderText: {
    color: "#888888",
    fontSize: 8,
  },

  profileDetails: {
    flex: 1,
  },

  twoColumns: {
    flexDirection: "row",
    gap: 18,
  },

  column: {
    flex: 1,
  },

  infoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },

  infoLabel: {
    width: 90,
    color: "#666666",
  },

  infoValue: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },

  statusActive: {
    color: "#176a2f",
    fontFamily: "Helvetica-Bold",
  },

  statusBreak: {
    color: "#946200",
    fontFamily: "Helvetica-Bold",
  },

  statusInactive: {
    color: "#9a1111",
    fontFamily: "Helvetica-Bold",
  },

  gradeBox: {
    borderWidth: 1,
    borderColor: "#888888",

    padding: 12,
  },

  gradeMain: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
  },

  gradeTier: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginTop: 4,
  },

  gradeCategory: {
    marginTop: 6,
    color: "#555555",
  },

  titleBox: {
    borderWidth: 1,
    borderColor: "#b28a21",
    backgroundColor: "#fffaf0",
    padding: 12,
  },

  titleMain: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },

  titleMeta: {
    marginTop: 5,
    color: "#666666",
    fontSize: 8,
  },

  titleNameColumn: {
    width: "24%",
  },

  titleGrantedColumn: {
    width: "24%",
  },

  titleStatusColumn: {
    width: "12%",
  },

  titleNotesColumn: {
    width: "25%",
  },

  table: {
    borderWidth: 1,
    borderColor: "#aaaaaa",
  },

  tableHeader: {
    flexDirection: "row",

    backgroundColor: "#ededed",

    borderBottomWidth: 1,
    borderBottomColor: "#aaaaaa",
  },

  tableRow: {
    flexDirection: "row",

    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
  },

  tableRowRevoked: {
    flexDirection: "row",

    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",

    backgroundColor: "#fff1f1",
  },

  headerCell: {
    padding: 5,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
  },

  cell: {
    padding: 5,
    fontSize: 7.5,
  },

  dateColumn: {
    width: "15%",
  },

  promotionColumn: {
    width: "20%",
  },

  assessorColumn: {
    width: "20%",
  },

  recordedColumn: {
    width: "17%",
  },

  statusColumn: {
    width: "10%",
  },

  notesColumn: {
    width: "18%",
  },

  valid: {
    color: "#176a2f",
    fontFamily: "Helvetica-Bold",
  },

  revoked: {
    color: "#a00000",
    fontFamily: "Helvetica-Bold",
  },

  reportBox: {
    borderWidth: 1,
    borderColor: "#cccccc",

    padding: 9,
  },

  disclaimer: {
    marginTop: 16,

    color: "#666666",

    fontSize: 7.5,
    lineHeight: 1.45,
  },

  footer: {
    position: "absolute",

    bottom: 18,
    left: 36,
    right: 36,

    paddingTop: 6,

    borderTopWidth: 1,
    borderTopColor: "#cccccc",

    flexDirection: "row",
    justifyContent: "space-between",

    fontSize: 7,
    color: "#666666",
  },
});

function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "-";
  }

  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
      ? new Date(
          `${value}T00:00:00`
        )
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-AU",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatDateTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-AU",
    {
      day: "numeric",
      month: "long",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatWhatsApp(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  if (
    value.startsWith("62")
  ) {
    return `+${value}`;
  }

  return value;
}

function getStatusStyle(
  status: string
) {
  const normalized =
    status
      .trim()
      .toLowerCase();

  if (
    normalized === "active"
  ) {
    return styles.statusActive;
  }

  if (
    normalized === "break"
  ) {
    return styles.statusBreak;
  }

  return styles.statusInactive;
}

export default function MemberRecordPDF({
  record,
  audit,
  logoUrl,
}: Props) {
  const currentRank =
    record.current_grade
      .rank_name ??
    "Unranked";

  const currentTier =
    record.current_grade
      .tier_name ??
    "-";

  return (
    <Document
      title={`Official Member Record - ${record.member.full_name}`}
      author="Jingwuguan Seibukan"
      subject="Official Member Record"
      keywords="Jingwuguan Seibukan, member record, grading, promotion, title appointment"
    >
      <Page
        size="A4"
        style={styles.page}
        wrap
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Image
            src={logoUrl}
            style={styles.logo}
          />

          <Text
            style={
              styles.organisation
            }
          >
            JINGWUGUAN SEIBUKAN
          </Text>

          <Text
            style={styles.title}
          >
            OFFICIAL MEMBER RECORD
          </Text>

          <Text
            style={styles.subtitle}
          >
            Membership, Grading and Title Record
          </Text>

          <View
            style={styles.topRule}
          />
        </View>


        {/* DOCUMENT DETAILS */}

        <View
          style={
            styles.documentBox
          }
        >
          <View style={styles.row}>
            <Text
              style={
                styles.metaLabel
              }
            >
              Document Reference
            </Text>

            <Text
              style={
                styles.metaValue
              }
            >
              {
                audit.document_reference
              }
            </Text>
          </View>


          <View style={styles.row}>
            <Text
              style={
                styles.metaLabel
              }
            >
              Generated
            </Text>

            <Text
              style={
                styles.metaValue
              }
            >
              {formatDateTime(
                audit.generated_at
              )}
            </Text>
          </View>


          <View style={styles.row}>
            <Text
              style={
                styles.metaLabel
              }
            >
              Generated By
            </Text>

            <Text
              style={
                styles.metaValue
              }
            >
              {
                audit.generated_by_name
              }
            </Text>
          </View>


          <View style={styles.row}>
            <Text
              style={
                styles.metaLabel
              }
            >
              Administrator Role
            </Text>

            <Text
              style={
                styles.metaValue
              }
            >
              {
                audit.generated_by_role
              }
            </Text>
          </View>
        </View>


        {/* MEMBER DETAILS */}

        <View
          style={styles.section}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            MEMBER DETAILS
          </Text>


          <View
            style={
              styles.profileLayout
            }
          >
            {record.member
              .avatar_url ? (
              <Image
                src={
                  record.member
                    .avatar_url
                }
                style={
                  styles.profilePhoto
                }
              />
            ) : (
              <View
                style={
                  styles.profilePlaceholder
                }
              >
                <Text
                  style={
                    styles.profilePlaceholderText
                  }
                >
                  NO PHOTO
                </Text>
              </View>
            )}


            <View
              style={
                styles.profileDetails
              }
            >
              <View
                style={
                  styles.twoColumns
                }
              >
                <View
                  style={
                    styles.column
                  }
                >
                  <View
                    style={
                      styles.infoRow
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Member ID
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {record.member
                        .member_id ??
                        "-"}
                    </Text>
                  </View>


                  {record.member.aikikai_registration_number && (
                    <View
                      style={
                        styles.infoRow
                      }
                    >
                      <Text
                        style={
                          styles.infoLabel
                        }
                      >
                        Aikikai Reg. No.
                      </Text>

                      <Text
                        style={
                          styles.infoValue
                        }
                      >
                        {record.member.aikikai_registration_number}
                      </Text>
                    </View>
                  )}


                  <View
                    style={
                      styles.infoRow
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Full Name
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {
                        record.member
                          .full_name
                      }
                    </Text>
                  </View>


                  <View
                    style={
                      styles.infoRow
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Date of Birth
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {formatDate(
                        record.member
                          .date_of_birth
                      )}
                    </Text>
                  </View>
                </View>


                <View
                  style={
                    styles.column
                  }
                >
                  <View
                    style={
                      styles.infoRow
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Email
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {record.member
                        .email ||
                        "-"}
                    </Text>
                  </View>


                  <View
                    style={
                      styles.infoRow
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Phone
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {record.member
                        .phone ||
                        "-"}
                    </Text>
                  </View>


                  <View
                    style={
                      styles.infoRow
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      WhatsApp
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {formatWhatsApp(
                        record.member
                          .whatsapp_number
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>


        {/* MEMBERSHIP */}

        <View
          style={styles.section}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            MEMBERSHIP INFORMATION
          </Text>


          <View
            style={
              styles.twoColumns
            }
          >
            <View
              style={styles.column}
            >
              <View
                style={
                  styles.infoRow
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Class
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {
                    record.membership
                      .class_name
                  }
                </Text>
              </View>


              <View
                style={
                  styles.infoRow
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Dojo
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {record.membership
                    .dojo_name ??
                    "-"}
                </Text>
              </View>
            </View>


            <View
              style={styles.column}
            >
              <View
                style={
                  styles.infoRow
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Status
                </Text>

                <Text
                  style={
                    getStatusStyle(
                      record
                        .membership
                        .status
                    )
                  }
                >
                  {
                    record.membership
                      .status
                  }
                </Text>
              </View>


              <View
                style={
                  styles.infoRow
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Role
                </Text>

                <Text
                  style={
                    styles.infoValue
                  }
                >
                  {
                    record.membership
                      .role
                  }
                </Text>
              </View>


              {record.membership.title_name && (

                <View
                  style={
                    styles.infoRow
                  }
                >
                  <Text
                    style={
                      styles.infoLabel
                    }
                  >
                    Title
                  </Text>

                  <Text
                    style={
                      styles.infoValue
                    }
                  >
                    {
                      record.membership
                        .title_name
                    }
                  </Text>
                </View>

              )}

            </View>
          </View>
        </View>


        {/* CURRENT TITLE */}

        {record.membership.title_name && (

          <View
            style={styles.section}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              CURRENT TITLE
            </Text>


            <View
              style={
                styles.titleBox
              }
            >
              <Text
                style={
                  styles.titleMain
                }
              >
                {
                  record.membership
                    .title_name
                }
              </Text>


              <Text
                style={
                  styles.titleMeta
                }
              >
                Title Level:{" "}
                {
                  record.membership
                    .title_level ??
                    "-"
                }
                {" · "}
                System:{" "}
                {
                  record.membership
                    .title_system ===
                    "chinese"
                      ? "Chinese"
                      : record.membership
                          .title_system ===
                          "japanese"
                      ? "Japanese"
                      : "-"
                }
              </Text>
            </View>
          </View>

        )}


        {/* CURRENT GRADE */}

        <View
          style={styles.section}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            CURRENT GRADE
          </Text>


          <View
            style={
              styles.gradeBox
            }
          >
            <Text
              style={
                styles.gradeMain
              }
            >
              {currentRank}
            </Text>

            <Text
              style={
                styles.gradeTier
              }
            >
              Tier: {currentTier}
            </Text>

            <Text
              style={
                styles.gradeCategory
              }
            >
              Category:{" "}
              {
                record
                  .current_grade
                  .category
              }
            </Text>
          </View>
        </View>


        {/* PROMOTION HISTORY */}

        <View
          style={styles.section}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            OFFICIAL PROMOTION RECORD
          </Text>


          {record
            .promotion_history
            .length === 0 ? (
            <Text>
              No promotion records have been recorded.
            </Text>
          ) : (
            <View
              style={styles.table}
            >
              {/* HEADER */}

              <View
                style={
                  styles.tableHeader
                }
              >
                <Text
                  style={[
                    styles.headerCell,
                    styles.dateColumn,
                  ]}
                >
                  Effective
                </Text>

                <Text
                  style={[
                    styles.headerCell,
                    styles.promotionColumn,
                  ]}
                >
                  Promotion
                </Text>

                <Text
                  style={[
                    styles.headerCell,
                    styles.assessorColumn,
                  ]}
                >
                  Assessor
                </Text>


                <Text
                  style={[
                    styles.headerCell,
                    styles.recordedColumn,
                  ]}
                >
                  Recorded By
                </Text>

                <Text
                  style={[
                    styles.headerCell,
                    styles.statusColumn,
                  ]}
                >
                  Status
                </Text>

                <Text
                  style={[
                    styles.headerCell,
                    styles.notesColumn,
                  ]}
                >
                  Notes
                </Text>
              </View>


              {record.promotion_history.map(
                (item) => {
                  const notes =
                    item.revoked
                      ? [
                          item.revoke_reason
                            ? `Reason: ${item.revoke_reason}`
                            : null,

                          item.revoked_by_name
                            ? `Revoked by: ${item.revoked_by_name}`
                            : null,

                          item.revoked_at
                            ? `Revoked: ${formatDateTime(
                                item.revoked_at
                              )}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join("\n")
                      : "-";

                  return (
                    <View
                      key={
                        item.id
                      }
                      style={
                        item.revoked
                          ? styles.tableRowRevoked
                          : styles.tableRow
                      }
                      wrap={false}
                    >
                      <Text
                        style={[
                          styles.cell,
                          styles.dateColumn,
                        ]}
                      >
                        {formatDate(
                          item.effective_date
                        )}
                      </Text>


                      <Text
                        style={[
                          styles.cell,
                          styles.promotionColumn,
                        ]}
                      >
                        {item.rank_name ??
                          "Unranked"}

                        {item.tier_name
                          ? `\n${item.tier_name}`
                          : ""}
                      </Text>


                      <Text
                        style={[
                          styles.cell,
                          styles.assessorColumn,
                        ]}
                      >
                        {item.assessor_name ??
                          "Not recorded"}

                        {item.assessor_type
                          ? `\n${item.assessor_type === "external" ? "External" : "Member"}`
                          : ""}
                      </Text>


                      <Text
                        style={[
                          styles.cell,
                          styles.recordedColumn,
                        ]}
                      >
                        {item.recorded_by_name ??
                          "Unknown"}

                        {"\n"}

                        {formatDateTime(
                          item.recorded_at
                        )}
                      </Text>


                      <Text
                        style={[
                          styles.cell,
                          styles.statusColumn,

                          item.revoked
                            ? styles.revoked
                            : styles.valid,
                        ]}
                      >
                        {item.revoked
                          ? "REVOKED"
                          : "VALID"}
                      </Text>


                      <Text
                        style={[
                          styles.cell,
                          styles.notesColumn,
                        ]}
                      >
                        {notes}
                      </Text>
                    </View>
                  );
                }
              )}
            </View>
          )}
        </View>


        {/* TITLE APPOINTMENT HISTORY */}

        {record.title_history &&
          record.title_history.length >
            0 && (

          <View
            style={styles.section}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              TITLE APPOINTMENT HISTORY
            </Text>


            <View
              style={styles.table}
            >

              <View
                style={
                  styles.tableHeader
                }
              >
                <Text
                  style={[
                    styles.headerCell,
                    styles.dateColumn,
                  ]}
                >
                  Effective
                </Text>

                <Text
                  style={[
                    styles.headerCell,
                    styles.titleNameColumn,
                  ]}
                >
                  Title
                </Text>

                <Text
                  style={[
                    styles.headerCell,
                    styles.titleGrantedColumn,
                  ]}
                >
                  Appointed By
                </Text>

                <Text
                  style={[
                    styles.headerCell,
                    styles.titleStatusColumn,
                  ]}
                >
                  Status
                </Text>

                <Text
                  style={[
                    styles.headerCell,
                    styles.titleNotesColumn,
                  ]}
                >
                  Notes
                </Text>
              </View>


              {record.title_history.map(
                (
                  item
                ) => {
                  const notes =
                    item.revoked
                      ? [
                          item.revoke_reason
                            ? `Reason: ${item.revoke_reason}`
                            : null,

                          item.revoked_by_name
                            ? `Revoked by: ${item.revoked_by_name}`
                            : null,

                          item.revoked_at
                            ? `Revoked: ${formatDateTime(
                                item.revoked_at
                              )}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join("\n")
                      : "-";


                  return (
                    <View
                      key={
                        item.id
                      }
                      style={
                        item.revoked
                          ? styles.tableRowRevoked
                          : styles.tableRow
                      }
                      wrap={false}
                    >

                      <Text
                        style={[
                          styles.cell,
                          styles.dateColumn,
                        ]}
                      >
                        {formatDate(
                          item.effective_date
                        )}
                      </Text>


                      <Text
                        style={[
                          styles.cell,
                          styles.titleNameColumn,
                        ]}
                      >
                        {item.title_name ??
                          `Title Level ${item.title_level}`}
                      </Text>


                      <Text
                        style={[
                          styles.cell,
                          styles.titleGrantedColumn,
                        ]}
                      >
                        {item.granted_by_name ??
                          "Jingwuguan Seibukan"}

                        {"\n"}

                        {formatDateTime(
                          item.created_at
                        )}
                      </Text>


                      <Text
                        style={[
                          styles.cell,
                          styles.titleStatusColumn,

                          item.revoked
                            ? styles.revoked
                            : styles.valid,
                        ]}
                      >
                        {item.revoked
                          ? "REVOKED"
                          : "VALID"}
                      </Text>


                      <Text
                        style={[
                          styles.cell,
                          styles.titleNotesColumn,
                        ]}
                      >
                        {notes}
                      </Text>

                    </View>
                  );
                }
              )}

            </View>
          </View>

        )}


        {/* REPORT INFORMATION */}

        <View
          style={styles.section}
          wrap={false}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            REPORT INFORMATION
          </Text>


          <View
            style={
              styles.reportBox
            }
          >
            <View
              style={
                styles.infoRow
              }
            >
              <Text
                style={
                  styles.infoLabel
                }
              >
                Generated By
              </Text>

              <Text
                style={
                  styles.infoValue
                }
              >
                {
                  audit.generated_by_name
                }
              </Text>
            </View>


            <View
              style={
                styles.infoRow
              }
            >
              <Text
                style={
                  styles.infoLabel
                }
              >
                Role
              </Text>

              <Text
                style={
                  styles.infoValue
                }
              >
                {
                  audit.generated_by_role
                }
              </Text>
            </View>


            <View
              style={
                styles.infoRow
              }
            >
              <Text
                style={
                  styles.infoLabel
                }
              >
                Generated
              </Text>

              <Text
                style={
                  styles.infoValue
                }
              >
                {formatDateTime(
                  audit.generated_at
                )}
              </Text>
            </View>


            <View
              style={
                styles.infoRow
              }
            >
              <Text
                style={
                  styles.infoLabel
                }
              >
                Reference
              </Text>

              <Text
                style={
                  styles.infoValue
                }
              >
                {
                  audit.document_reference
                }
              </Text>
            </View>
          </View>
        </View>


        <Text
          style={
            styles.disclaimer
          }
        >
          This document was generated electronically by the
          Jingwuguan Seibukan Management System. The promotion
          history and title appointment history form part of
          the official administrative record. Revoked entries
          are intentionally retained to preserve the integrity
          of the historical record.
        </Text>


        {/* FOOTER */}

        <View
          style={styles.footer}
          fixed
        >
          <Text>
            {
              audit.document_reference
            }
          </Text>

          <Text
            render={({
              pageNumber,
              totalPages,
            }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}