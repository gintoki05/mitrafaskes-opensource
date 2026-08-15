export enum UserRole {
  ADMIN = 'ADMIN',
  DOKTER = 'DOKTER',
  /** Clinical nurse role for triage and initial clinical documentation. */
  PERAWAT = 'PERAWAT',
  /** Non-clinical registration/queue operator role. */
  PETUGAS_PENDAFTARAN = 'PETUGAS_PENDAFTARAN',
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  sipNumber?: string;
  strNumber?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserProfile;
}

export interface TokenResponse {
  accessToken: string;
  user: UserProfile;
}
