import { ROUTES, request } from "./apiConfig";

export const RoomAPI = {
  getAll: () => request(`${ROUTES.room.getAll}?pageSize=1000`),
  getByBranch: (branchId) => request(ROUTES.room.getByBranch(branchId)),
  getById: (id) => request(ROUTES.room.getById(id)),
  create: (data) => request(ROUTES.room.create, { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(ROUTES.room.update(id), { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => request(ROUTES.room.delete(id), { method: "DELETE" }),
  getEmployeeRooms: () => request(ROUTES.room.employeeRooms),
};