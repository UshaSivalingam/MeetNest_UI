// src/api/branchAPI.js
import { ROUTES, request } from "./apiConfig";

export const BranchAPI = {
  getAll:  ()         => request(ROUTES.branch.getAll),
  getById: (id)       => request(ROUTES.branch.getById(id)),
  create:  (data)     => request(ROUTES.branch.create,     { method: "POST", body: JSON.stringify(data) }),
  update:  (id, data) => request(ROUTES.branch.update(id), { method: "PUT",  body: JSON.stringify(data) }),
  delete:  (id)       => request(ROUTES.branch.delete(id), { method: "DELETE" }),
};