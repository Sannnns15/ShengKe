import ProfileScreen from "./index";

/**
 * 用户个人主页 — 路由入口
 *
 * `profile/[id].tsx` 复用 ProfileScreen 的逻辑，后者通过
 * `useLocalSearchParams` 获取 `id` 参数，自动判断是查看自己
 * 还是他人主页。
 */
export default ProfileScreen;
