import { ROUTES, request, TokenService, UserService } from "./apiConfig";

export const AuthAPI = {
  login: async ({ email, password }) => {
    const data = await request(ROUTES.auth.login, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.accessToken)  TokenService.set(data.accessToken);
    if (data.refreshToken) TokenService.setRefresh(data.refreshToken);
    if (data.user)         UserService.set(data.user);
    return data;
  },

  registerAdmin: ({ fullName, email, password }) =>
    request(ROUTES.auth.registerAdmin, {
      method: "POST",
      body: JSON.stringify({ fullName, email, password }),
    }),

  registerEmployee: ({ fullName, email, password, branchId }) =>
    request(ROUTES.auth.registerEmployee, {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, branchId: Number(branchId) }), // ← fix
    }),

  logout: () => TokenService.clear(),
};