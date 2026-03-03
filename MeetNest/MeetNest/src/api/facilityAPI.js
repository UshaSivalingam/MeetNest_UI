// src/api/facilityAPI.js
import { ROUTES, request } from "./apiConfig";

export const FacilityAPI = {
  getAll: () => request(ROUTES.facility.getAll),
  getById: (id) => request(ROUTES.facility.getById(id)),
  create: (data) => request(ROUTES.facility.create, { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(ROUTES.facility.update(id), { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => request(ROUTES.facility.delete(id), { method: "DELETE" }),
};