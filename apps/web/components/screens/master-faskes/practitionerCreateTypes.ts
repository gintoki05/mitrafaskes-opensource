import type {
  LocationSummary,
  OrganizationSummary,
  PractitionerCreateRequest,
} from '@mitrafaskes/shared';

export type PractitionerCreateDialogProps = {
  open: boolean;
  canWrite: boolean;
  organizations: OrganizationSummary[];
  locations: LocationSummary[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export type PractitionerFormState = Omit<PractitionerCreateRequest, 'active'> & {
  active: string;
};

export type PractitionerFormFieldUpdater = <K extends keyof PractitionerFormState>(
  field: K,
  value: PractitionerFormState[K],
) => void;

export const initialPractitionerForm: PractitionerFormState = {
  username: '',
  password: '',
  fullName: '',
  role: 'DOKTER',
  nik: '',
  birthDate: '',
  gender: null,
  sipNumber: '',
  strNumber: '',
  organizationId: null,
  locationId: null,
  active: 'true',
};
