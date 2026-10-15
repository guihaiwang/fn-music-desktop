import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";

/* 原版飞牛音乐 web 样式（NAS /music/static/assets 同源文件，仅字体路径已本地化） */
import "./assets/original/01-base.css";
import "./assets/original/02-main.css";
import "./assets/original/03-components.css";
import "./assets/original/04-page.css";
import "./assets/original/05-semi.css";

/* 桌面端基础 reset（原版 CSS 之后的少量补充） */
import "./assets/main.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
