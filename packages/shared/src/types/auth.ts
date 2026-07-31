export enum UserRole {
  ADMIN = 'ADMIN',
  DOKTER = 'DOKTER',
  /**
   * Legacy persisted value for the phase-one registration officer role.
   * The product-facing label is "Petugas pendaftaran".
   */
  PERAWAT = 'PERAWAT',
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
  passwordHash: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserProfile;
}
