import axios from "axios";

function getBaseUrl(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").trim();
  url = url.replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    url = `${url}/api`;
  }
  return url;
}

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});


api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not intercept auth endpoints themselves to avoid loops
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login/") ||
      originalRequest?.url?.includes("/auth/refresh/") ||
      originalRequest?.url?.includes("/auth/register/");

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (typeof window !== "undefined") {
        const refreshToken = localStorage.getItem("refresh_token");

        if (refreshToken) {
          try {
            const refreshUrl = `${getBaseUrl()}/auth/refresh/`;
            const res = await axios.post(refreshUrl, { refresh: refreshToken });

            const newAccessToken = res.data.access;
            localStorage.setItem("access_token", newAccessToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          } catch (refreshErr) {
            // Refresh token expired or invalid
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_profile");

            if (window.location.pathname.startsWith("/dashboard")) {
              window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
            }
            return Promise.reject(refreshErr);
          }
        } else {
          // No refresh token available
          localStorage.removeItem("access_token");
          localStorage.removeItem("user_profile");

          if (window.location.pathname.startsWith("/dashboard")) {
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;