"use server";

import { signOut } from "@/lib/auth";

/**
 * 退出登录 server action（适配 form action 签名）
 */
export async function logout() {
  await signOut({ redirectTo: "/" });
}
