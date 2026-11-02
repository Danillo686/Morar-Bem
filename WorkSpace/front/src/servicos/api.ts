import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim() ?? "";
const apiBaseUrl = configuredApiUrl
  ? new URL(configuredApiUrl).origin
  : "";

export const api = axios.create({
  baseURL: apiBaseUrl,
});
