import { ROUTES, request } from "./apiConfig";

export const AdminAPI = {

  getDashboard: async () => {
    console.log("📊 Fetching Admin Dashboard");
    debugger;

    const data = await request(ROUTES.admin.dashboard);

    console.log("📊 Dashboard Data:", data);
    return data;
  },

  getBookings: async () => {
    console.log("📅 Fetching Admin Bookings");
    debugger;

    const data = await request(ROUTES.admin.bookings + "?pageSize=1000");

    console.log("📅 Bookings Data:", data);
    return data;
  },

  getBookingById: async (id) => {
    console.log("🔍 Fetch Booking By ID:", id);
    debugger;

    const data = await request(ROUTES.admin.bookingById(id));

    console.log("📄 Booking Detail:", data);
    return data;
  },

  approveBooking: async (id, body = {}) => {
    console.log("✅ Approving Booking:", id);
    console.log("Body:", body);

    debugger;

    const data = await request(ROUTES.admin.approveBooking(id), {
      method: "PUT",
      body: JSON.stringify(body),
    });

    console.log("✅ Booking Approved:", data);
    return data;
  },

  rejectBooking: async (id, body = {}) => {
    console.log("❌ Rejecting Booking:", id);
    console.log("Body:", body);

    debugger;

    const data = await request(ROUTES.admin.rejectBooking(id), {
      method: "PUT",
      body: JSON.stringify(body),
    });

    console.log("❌ Booking Rejected:", data);
    return data;
  },
};