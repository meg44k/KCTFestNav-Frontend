/** お知らせが空・取得できないときに帯に出す文 */
export const DEFAULT_ANNOUNCEMENT = "2026 高専祭開催中!!";

export function announcementOrDefault(content: string | undefined): string {
  return content?.trim() ? content : DEFAULT_ANNOUNCEMENT;
}
