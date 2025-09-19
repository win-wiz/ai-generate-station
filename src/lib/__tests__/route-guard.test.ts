// /**
//  * 路由守卫测试用例
//  * 验证路由验证逻辑的正确性
//  */

// import { getRouteType, RouteType, ROUTE_CONFIG, getLoginRedirectUrl, getLogoutRedirectUrl } from '../route-guard';

// describe('Route Guard Tests', () => {
//   describe('getRouteType', () => {
//     test('应该正确识别公开路径', () => {
//       expect(getRouteType('/')).toBe(RouteType.PUBLIC);
//       expect(getRouteType('/about')).toBe(RouteType.PUBLIC);
//     });

//     test('应该正确识别认证路径', () => {
//       expect(getRouteType('/login')).toBe(RouteType.AUTH);
//     });

//     test('应该正确识别受保护路径', () => {
//       expect(getRouteType('/dashboard')).toBe(RouteType.PROTECTED);
//       expect(getRouteType('/dashboard/settings')).toBe(RouteType.PROTECTED);
//       expect(getRouteType('/profile')).toBe(RouteType.PROTECTED);
//     });
//   });

//   describe('getLoginRedirectUrl', () => {
//     test('应该返回有效的受保护路径', () => {
//       expect(getLoginRedirectUrl('/dashboard')).toBe('/dashboard');
//       expect(getLoginRedirectUrl('/profile')).toBe('/profile');
//     });

//     test('应该返回默认路径对于无效回调URL', () => {
//       expect(getLoginRedirectUrl('/invalid')).toBe(ROUTE_CONFIG.DEFAULT_REDIRECT.AUTHENTICATED);
//       expect(getLoginRedirectUrl()).toBe(ROUTE_CONFIG.DEFAULT_REDIRECT.AUTHENTICATED);
//     });
//   });

//   describe('getLogoutRedirectUrl', () => {
//     test('应该返回默认的未认证重定向路径', () => {
//       expect(getLogoutRedirectUrl()).toBe(ROUTE_CONFIG.DEFAULT_REDIRECT.UNAUTHENTICATED);
//     });
//   });

//   describe('ROUTE_CONFIG', () => {
//     test('路由配置应该包含所有必要的路径', () => {
//       expect(ROUTE_CONFIG.PUBLIC_ROUTES).toContain('/');
//       expect(ROUTE_CONFIG.PUBLIC_ROUTES).toContain('/about');
//       expect(ROUTE_CONFIG.AUTH_ROUTES).toContain('/login');
//       expect(ROUTE_CONFIG.PROTECTED_ROUTES).toContain('/dashboard');
//       expect(ROUTE_CONFIG.PROTECTED_ROUTES).toContain('/profile');
//     });

//     test('默认重定向配置应该正确', () => {
//       expect(ROUTE_CONFIG.DEFAULT_REDIRECT.AUTHENTICATED).toBe('/dashboard');
//       expect(ROUTE_CONFIG.DEFAULT_REDIRECT.UNAUTHENTICATED).toBe('/');
//     });
//   });
// });