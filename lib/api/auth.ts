import apiClient from "./client";
import type { UserProfile, Organization } from "@/types";

export interface LoginResponse {
  message: string;
  status: number;
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    expires_at: string;
    user: UserProfile;
  };
}

export const loginUser = async (
  data: Record<string, string>,
): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>("/auth/login", data);
  return response.data;
};

export const logoutUser = async (): Promise<void> => {
  await apiClient.post("/auth/logout");
};

export const requestPasswordReset = async (data: {
  email: string;
  type?: string;
}): Promise<{ data: Record<string, string>; message: string }> => {
  const response = await apiClient.post("/auth/otp/request", data);
  return response.data;
};

export interface VerifyOtpResponse {
  message: string;
  data: {
    verified: boolean;
    token: string;
  };
}

export const verifyOtp = async (data: {
  email: string;
  code: string;
  type?: "password_reset" | "registration";
}): Promise<VerifyOtpResponse> => {
  const response = await apiClient.post("/auth/otp/verify", data);
  return response.data;
};

export const resetPassword = async (
  data: Record<string, string>,
): Promise<{ message: string }> => {
  const response = await apiClient.post("/auth/password/set", data);
  return response.data;
};
