import { initBotId } from "botid/client/core";

// いいねの Server Action を呼ぶページ。ここに挙げたページからの POST に、
// BotID がボットかどうかを見分けるための情報を付ける(付いていないと checkBotId で弾かれる)
initBotId({
  protect: [
    { path: "/class-booth", method: "POST" },
    { path: "/bazaar", method: "POST" },
    { path: "/map", method: "POST" },
  ],
});
