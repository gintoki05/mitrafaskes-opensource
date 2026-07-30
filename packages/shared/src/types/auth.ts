export enum UserRole {
  ADMIN = 'ADMIN',
  DOKTER = 'DOKTER',
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
