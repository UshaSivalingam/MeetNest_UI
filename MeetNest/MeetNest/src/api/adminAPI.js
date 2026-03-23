import { ROUTES, request } from "./apiConfig";

export const AdminAPI = {

  getDashboard: async () => {
    return await request(ROUTES.admin.dashboard);
  },

  getBookings: async () => {
    return await request(ROUTES.admin.bookings + "?pageSize=1000");
  },

  getBookingById: async (id) => {
    return await request(ROUTES.admin.bookingById(id));
  },

  approveBooking: async (id, body = {}) => {
    return await request(ROUTES.admin.approveBooking(id), {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  rejectBooking: async (id, body = {}) => {
    return await request(ROUTES.admin.rejectBooking(id), {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
};