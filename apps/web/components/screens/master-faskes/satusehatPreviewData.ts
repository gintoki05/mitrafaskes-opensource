import {
  Building2,
  CircleDot,
  ContactRound,
  CalendarDays,
  Info,
  Link2,
  MapPin,
  MapPinned,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  EMPTY_PREVIEW_VALUE,
  asPreviewRecord,
  firstPreviewCoding,
  firstPreviewRecord,
  formatPreviewAddress,
  formatPreviewCoding,
  formatPreviewMode,
  formatPreviewPosition,
  formatPreviewReference,
  formatPreviewResourceLabel,
  formatPreviewStatus,
  formatPreviewTelecom,
  readPreviewText,
} from "./satusehatPreviewFormatters";

export type PreviewField = {
  label: string;
  value: ReactNode;
  mono?: boolean;
  wide?: boolean;
};

export type PreviewSection = {
  title: string;
  icon: LucideIcon;
  fields: PreviewField[];
};

type RecordValue = Record<string, unknown>;

export function buildSatusehatPreviewSections(
  payload: unknown,
  externalResourceId?: string,
): PreviewSection[] {
  const record = asPreviewRecord(payload);
  if (!record) {
    return [
      {
        title: "Informasi data",
        icon: Info,
        fields: [
          {
            label: "Status",
            value: "Data siap dikirim ke SATUSEHAT.",
            wide: true,
          },
        ],
      },
    ];
  }

  const resourceType = readPreviewText(record.resourceType);
  if (resourceType === "Patient") {
    return buildPatientSections(record, externalResourceId);
  }
  if (resourceType !== "Organization" && resourceType !== "Location") {
    return buildGenericSections(record, externalResourceId);
  }

  const identifier = firstPreviewRecord(record.identifier);
  const typeCoding = firstPreviewCoding(record.type);
  const sections: PreviewSection[] = [
    {
      title: "Identitas",
      icon: resourceType === "Location" ? MapPinned : Building2,
      fields: [
        {
          label: "ID SATUSEHAT",
          value:
            externalResourceId ??
            readPreviewText(record.id) ??
            "Akan dibuat saat sinkronisasi pertama",
          mono: true,
        },
        {
          label: "Kode data",
          value: readPreviewText(identifier?.value) ?? EMPTY_PREVIEW_VALUE,
          mono: true,
        },
        {
          label: "Nama",
          value: readPreviewText(record.name) ?? EMPTY_PREVIEW_VALUE,
        },
      ],
    },
    {
      title:
        resourceType === "Location"
          ? "Status & jenis lokasi"
          : "Status & jenis organisasi",
      icon: CircleDot,
      fields: [
        {
          label: "Status",
          value: formatPreviewStatus(record),
        },
        {
          label:
            resourceType === "Location"
              ? "Penggunaan lokasi"
              : "Jenis organisasi",
          value:
            resourceType === "Location"
              ? formatPreviewMode(record.mode)
              : formatPreviewCoding(typeCoding),
        },
        ...(resourceType === "Location"
          ? [
              {
                label: "Tipe fisik",
                value: formatPreviewCoding(
                  firstPreviewCoding(record.physicalType),
                ),
              },
            ]
          : []),
      ],
    },
  ];

  if (resourceType === "Location") {
    sections.push({
      title: "Hubungan lokasi",
      icon: Link2,
      fields: [
        {
          label: "Fasilitas kesehatan",
          value: formatPreviewReference(record.managingOrganization),
          wide: true,
        },
        {
          label: "Lokasi induk",
          value: formatPreviewReference(record.partOf),
          wide: true,
        },
      ],
    });
    sections.push({
      title: "Alamat & lokasi peta",
      icon: MapPin,
      fields: [
        {
          label: "Alamat",
          value: formatPreviewAddress(record.address),
          wide: true,
        },
        {
          label: "Lintang",
          value: formatPreviewPosition(record.position, "latitude"),
          mono: true,
        },
        {
          label: "Bujur",
          value: formatPreviewPosition(record.position, "longitude"),
          mono: true,
        },
        {
          label: "Ketinggian (opsional)",
          value: formatPreviewPosition(record.position, "altitude"),
          mono: true,
        },
      ],
    });
    if (readPreviewText(record.description)) {
      sections.push({
        title: "Keterangan",
        icon: Info,
        fields: [
          {
            label: "Deskripsi",
            value: readPreviewText(record.description),
            wide: true,
          },
        ],
      });
    }
    return sections;
  }

  sections.push({
    title: "Organisasi induk",
    icon: Link2,
    fields: [
      {
        label: "Organisasi induk",
        value: formatPreviewReference(record.partOf),
        wide: true,
      },
    ],
  });
  sections.push({
    title: "Kontak dan alamat",
    icon: ContactRound,
    fields: [
      {
        label: "Telepon",
        value: formatPreviewTelecom(record.telecom, "phone"),
      },
      {
        label: "Email",
        value: formatPreviewTelecom(record.telecom, "email"),
      },
      {
        label: "Alamat",
        value: formatPreviewAddress(record.address),
        wide: true,
      },
    ],
  });
  return sections;
}

function buildPatientSections(
  record: RecordValue,
  externalResourceId?: string,
): PreviewSection[] {
  const identifier = firstPreviewRecord(record.identifier);
  const name = firstPreviewRecord(record.name);
  return [
    {
      title: "Identitas pasien",
      icon: UserRound,
      fields: [
        {
          label: "ID SATUSEHAT",
          value:
            externalResourceId ??
            readPreviewText(record.id) ??
            "Akan dibuat saat sinkronisasi pertama",
          mono: true,
        },
        {
          label: "NIK / identifier utama",
          value: readPreviewText(identifier?.value) ?? EMPTY_PREVIEW_VALUE,
          mono: true,
        },
        {
          label: "Nama",
          value: readPreviewText(name?.text) ?? EMPTY_PREVIEW_VALUE,
        },
      ],
    },
    {
      title: "Demografi",
      icon: CalendarDays,
      fields: [
        { label: "Status", value: formatPreviewStatus(record) },
        {
          label: "Gender",
          value: readPreviewText(record.gender) ?? EMPTY_PREVIEW_VALUE,
        },
        {
          label: "Tanggal lahir",
          value: readPreviewText(record.birthDate) ?? EMPTY_PREVIEW_VALUE,
        },
        {
          label: "Telepon",
          value: formatPreviewTelecom(record.telecom, "phone"),
        },
        {
          label: "Email",
          value: formatPreviewTelecom(record.telecom, "email"),
        },
        {
          label: "Alamat",
          value: formatPreviewAddress(record.address),
          wide: true,
        },
      ],
    },
  ];
}

export function readSatusehatPreviewResourceType(payload: unknown): string {
  return formatPreviewResourceLabel(asPreviewRecord(payload)?.resourceType);
}

function buildGenericSections(
  record: RecordValue,
  externalResourceId?: string,
): PreviewSection[] {
  return [
    {
      title: "Identitas",
      icon: Info,
      fields: [
        {
          label: "ID SATUSEHAT",
          value:
            externalResourceId ??
            readPreviewText(record.id) ??
            "Akan dibuat saat sinkronisasi pertama",
          mono: true,
        },
        {
          label: "Nama",
          value: readPreviewText(record.name) ?? EMPTY_PREVIEW_VALUE,
        },
        {
          label: "Jenis data",
          value: formatPreviewResourceLabel(record.resourceType),
        },
      ],
    },
    {
      title: "Informasi data",
      icon: CircleDot,
      fields: [
        {
          label: "Status",
          value: formatPreviewStatus(record),
        },
        {
          label: "Keterangan",
          value: readPreviewText(record.description) ?? EMPTY_PREVIEW_VALUE,
          wide: true,
        },
      ],
    },
  ];
}
