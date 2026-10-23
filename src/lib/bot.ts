import { checkBotId } from "botid/server";

/**
 * プログラムからの大量の操作(投票・ログインの総当たり)を入口で止める(Vercel BotID。`next dev` では常に人として通る)。
 * Server Action の中で呼ぶ。BotID 自体が失敗したとき(Vercel の外・一時的な障害)は止めない。
 * 全部止めて本人まで締め出すより、通して他の守り(回数の上限など)に任せるほうを選ぶ
 */
export async function isBot(): Promise<boolean> {
  try {
    return (await checkBotId()).isBot;
  } catch (e) {
    console.error("BotID の判定に失敗しました。止めずに通します", e);
    return false;
  }
}
