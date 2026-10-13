/**
 * 快递发货时间窗口
 *
 * 业务规则：快递发货时间为每天 18:00 - 20:00
 * 该模块不涉及冷冻时间检查（已移除），仅负责时间窗口判断
 */

/** 快递发货时间窗口 - 开始（24小时制） */
export const DELIVERY_WINDOW_START_HOUR = 18;

/** 快递发货时间窗口 - 结束（24小时制） */
export const DELIVERY_WINDOW_END_HOUR = 20;

/**
 * 判断指定时间是否在快递发货时间窗口内（18:00 - 20:00）
 */
export function isInDeliveryWindow(now: Date = new Date()): boolean {
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const timeValue = hour + minutes / 60;
  return (
    timeValue >= DELIVERY_WINDOW_START_HOUR &&
    timeValue < DELIVERY_WINDOW_END_HOUR
  );
}

/**
 * 获取下一个（或当前）快递发货时间窗口
 * 如果当前在窗口内，返回当前窗口
 * 否则返回今天晚上或明天晚上的窗口
 */
export function getNextDeliveryWindow(
  now: Date = new Date()
): { start: Date; end: Date } {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // 今天的发货窗口
  const todayWindow = {
    start: new Date(today),
    end: new Date(today),
  };
  todayWindow.start.setHours(DELIVERY_WINDOW_START_HOUR, 0, 0, 0);
  todayWindow.end.setHours(DELIVERY_WINDOW_END_HOUR, 0, 0, 0);

  // 如果当前还没到今天的窗口结束，返回今天的窗口
  if (now < todayWindow.end) {
    return todayWindow;
  }

  // 否则返回明天的窗口
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    start: new Date(
      tomorrow.getTime() + DELIVERY_WINDOW_START_HOUR * 60 * 60 * 1000
    ),
    end: new Date(
      tomorrow.getTime() + DELIVERY_WINDOW_END_HOUR * 60 * 60 * 1000
    ),
  };
}
