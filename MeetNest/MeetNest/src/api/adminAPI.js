// src/api/adminAPI.js
import { ROUTES, request } from "./apiConfig";

export const AdminAPI = {
  getDashboard: () => request(ROUTES.admin.dashboard),
  getBookings: () => request(ROUTES.admin.bookings),
  getBookingById: (id) => request(ROUTES.admin.bookingById(id)),

  approveBooking: (id, body = {}) =>
    request(ROUTES.admin.approveBooking(id), {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  rejectBooking: (id, body = {}) =>
    request(ROUTES.admin.rejectBooking(id), {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};