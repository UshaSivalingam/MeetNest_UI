import { ROUTES, request } from "./apiConfig";

export const BranchAPI = {
  // All branches with TotalRooms / TotalEmployees / TotalBookings — for Branch Management cards
  getWithStats: () => request(ROUTES.branch.getWithStats),           

  // Simple flat list — for dropdowns (no pagination needed)
  getSimple: () => request(`${ROUTES.branch.getAll}?pageSize=1000`),

  // Generic paged fetch — pass query string if needed e.g. "search=foo&page=2"
  getAll: (queryString = "") =>
    request(`${ROUTES.branch.getAll}${queryString ? "?" + queryString : ""}`),

  getById: (id)       => request(ROUTES.branch.getById(id)),
  create:  (data)     => request(ROUTES.branch.create,     { method: "POST",   body: JSON.stringify(data) }),
  update:  (id, data) => request(ROUTES.branch.update(id), { method: "PUT",    body: JSON.stringify(data) }),
  delete:  (id)       => request(ROUTES.branch.delete(id), { method: "DELETE" }),
};