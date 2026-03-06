// src/api/apiConfig.js
const BASE_URL = "https://localhost:7198/api";

export const ROUTES = {
  auth: {
    login:            `${BASE_URL}/auth/login`,
    registerAdmin:    `${BASE_URL}/auth/register/admin`,
    registerEmployee: `${BASE_URL}/auth/register/employee`,
    refreshToken:     `${BASE_URL}/auth/refresh-token`,
  },
  branch: {
    getAll:       `${BASE_URL}/branches`,
    getWithStats: `${BASE_URL}/branches/stats`,           // ← ADD (Bug 1 fix)
    getSimple:    `${BASE_URL}/branches/simple`,
    getById: (id) => `${BASE_URL}/branches/${id}`,
    create:  `${BASE_URL}/branches`,
    update:  (id) => `${BASE_URL}/branches/${id}`,
    delete:  (id) => `${BASE_URL}/branches/${id}`,
  },
  room: {
    getAll:        `${BASE_URL}/rooms`,
    getByBranch:   (branchId) => `${BASE_URL}/rooms/branch/${branchId}`,
    getById:       (id)       => `${BASE_URL}/rooms/${id}`,
    create:        `${BASE_URL}/rooms`,
    update:        (id)       => `${BASE_URL}/rooms/${id}`,
    delete:        (id)       => `${BASE_URL}/rooms/${id}`,
    employeeRooms: `${BASE_URL}/rooms/employee`,
  },
  facility: {
    getAll:  `${BASE_URL}/facilities`,
    getById: (id) => `${BASE_URL}/facilities/${id}`,
    create:  `${BASE_URL}/facilities`,
    update:  (id) => `${BASE_URL}/facilities/${id}`,
    delete:  (id) => `${BASE_URL}/facilities/${id}`,
  },
  roomFacility: {
    assign:    `${BASE_URL}/room-facilities/assign`,
    getByRoom: (roomId) => `${BASE_URL}/room-facilities/room/${roomId}`,
    remove:    `${BASE_URL}/room-facilities/remove`,
  },
  booking: {
    create:     `${BASE_URL}/bookings`,
    myBookings: `${BASE_URL}/bookings/my`,
    cancel:     (id) => `${BASE_URL}/bookings/${id}/cancel`,
    approve:    (id) => `${BASE_URL}/bookings/${id}/approve`,
    reject:     (id) => `${BASE_URL}/bookings/${id}/reject`,
  },
  admin: {
    dashboard:      `${BASE_URL}/admin/dashboard`,
    bookings:       `${BASE_URL}/admin/bookings`,
    bookingById:    (id) => `${BASE_URL}/admin/bookings/${id}`,
    approveBooking: (id) => `${BASE_URL}/admin/bookings/${id}/approve`,
    rejectBooking:  (id) => `${BASE_URL}/admin/bookings/${id}/reject`,
  },
};

// ---------------- TOKEN & USER ----------------
export const TokenService = {
  get:        ()      => localStorage.getItem("accessToken"),
  set:        (token) => localStorage.setItem("accessToken", token),
  getRefresh: ()      => localStorage.getItem("refreshToken"),
  setRefresh: (token) => localStorage.setItem("refreshToken", token),
  clear: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },
};

export const UserService = {
  get:    ()     => JSON.parse(localStorage.getItem("user") || "null"),
  set:    (user) => localStorage.setItem("user", JSON.stringify(user)),
  remove: ()     => localStorage.removeItem("user"),
};

// ---------------- CORE REQUEST ----------------
export async function request(url, options = {}) {
  const token = TokenService.get();
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    let response = await fetch(url, config);

    if (response.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        config.headers.Authorization = `Bearer ${TokenService.get()}`;
        response = await fetch(url, config);
      } else {
        TokenService.clear();
        window.location.href = "/";
        return;
      }
    }

    return handleResponse(response);
  } catch (err) {
    console.error("Network error:", err);
    throw new Error(`Cannot reach server. Is backend running at ${BASE_URL}?`);
  }
}

async function handleResponse(response) {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  let data = null;

  try {
    data = isJson ? await response.json() : await response.text();
  } catch {}

  if (!response.ok) {
    console.error("❌ Backend Error Status:", response.status);
    console.error("❌ Backend Error Body:", data);
    throw new Error(
      typeof data === "string"
        ? data
        : data?.message || data?.Message || data?.title || `Error ${response.status}`
    );
  }

  // Unwrap PagedResult { items: [...], totalCount, page, pageSize }
  // but only when items is an array — plain arrays and plain objects pass through as-is
  if (isJson && data && typeof data === "object" && Array.isArray(data.items)) {
    return data.items;
  }

  return data;
}

async function tryRefreshToken() {
  const refreshToken = TokenService.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(ROUTES.auth.refreshToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    TokenService.set(data.accessToken);
    if (data.refreshToken) TokenService.setRefresh(data.refreshToken);
    return true;
  } catch {
    return false;
  }
}