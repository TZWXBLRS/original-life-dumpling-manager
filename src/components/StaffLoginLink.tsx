import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * 顾客端的「后台登录」入口
 * 供客服 / 门店员工快速跳转到登录页；样式不显眼，避免打扰顾客正常下单。
 */
export function StaffLoginLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/auth/login"
      title="员工后台登录"
      aria-label="员工后台登录"
      className={`inline-flex items-center gap-1 text-stone-400 hover:text-primary-600 ${className}`}
    >
      <Lock className="w-4 h-4" />
      <span className="hidden text-xs sm:inline">后台登录</span>
    </Link>
  );
}
