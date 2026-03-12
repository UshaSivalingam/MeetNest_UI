// src/api/notificationAPI.js
// ── Uses the same ROUTES + request pattern as all other API files ──

import { ROUTES, request } from "./apiConfig";

export const NotificationAPI = {
  // GET /api/notifications — due + unread notifications
  getDue: () =>
    request(ROUTES.notification.getDue),

  // GET /api/notifications/count — { count: number }
  getCount: () =>
    request(ROUTES.notification.getCount),

  // PUT /api/notifications/{id}/read
  markRead: (id) =>
    request(ROUTES.notification.markRead(id), { method: "PUT" }),

  // PUT /api/notifications/read-all
  markAllRead: () =>
    request(ROUTES.notification.markAllRead, { method: "PUT" }),

  // POST /api/notifications/reminder — { bookingId }
  createReminder: (bookingId) =>
    request(ROUTES.notification.reminder, { method: "POST", body: JSON.stringify({ bookingId }) }),
};