import { ROUTES, request } from "./apiConfig";

export const RoomFacilityAPI = {
  getByRoom: (roomId) => request(ROUTES.roomFacility.getByRoom(roomId)),
  assign: (data) => request(ROUTES.roomFacility.assign, { method: "POST", body: JSON.stringify(data) }),
  remove: (data) => request(ROUTES.roomFacility.remove, { method: "DELETE", body: JSON.stringify(data) }),
};