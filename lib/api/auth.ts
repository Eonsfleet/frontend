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

export const requestPasswordReset = async (data: {
  email: string;
}): Promise<{ message: string }> => {
  const response = await apiClient.post("/auth/password/new-otp", data);
  return response.data;
};

export const verifyOtp = async (data: {
  email: string;
  otp: string;
}): Promise<{ message: string }> => {
  const response = await apiClient.post("/auth/verify-otp", data);
  return response.data;
};

export const resetPassword = async (
  data: Record<string, string>,
): Promise<{ message: string }> => {
  const response = await apiClient.put("/auth/password/reset", data);
  return response.data;
};
