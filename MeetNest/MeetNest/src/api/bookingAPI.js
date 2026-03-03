// src/api/bookingAPI.js
import { ROUTES, request } from "./apiConfig";

export const BookingAPI = {
  create: (data) => request(ROUTES.booking.create, { method: "POST", body: JSON.stringify(data) }),
  myBookings: () => request(ROUTES.booking.myBookings),
  cancel: (id) => request(ROUTES.booking.cancel(id), { method: "PUT" }),
  approve: (id) => request(ROUTES.booking.approve(id), { method: "PUT" }),
  reject: (id, data = {}) => request(ROUTES.booking.reject(id), { method: "PUT", body: JSON.stringify(data) }),
};