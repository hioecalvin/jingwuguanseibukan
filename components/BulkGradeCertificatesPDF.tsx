"use client";

import { Document } from "@react-pdf/renderer";

import {
  GradeCertificatePage,
  GradeCertificateProps,
} from "@/components/GradeCertificatePDF";

type Props = {
  certificates: GradeCertificateProps[];
};

export default function BulkGradeCertificatesPDF({ certificates }: Props) {
  return (
    <Document
      title="Bulk Grade Certificates"
      author="Jingwuguan Seibukan"
      subject="Certificates of Promotion"
    >
      {certificates.map((certificate) => (
        <GradeCertificatePage
          key={certificate.audit.certificate_id}
          {...certificate}
        />
      ))}
    </Document>
  );
}
