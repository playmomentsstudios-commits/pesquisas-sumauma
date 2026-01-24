import "./map.js";
import { initRouter } from "./router.js";
import { setYear } from "./utils.js";
import { withBase } from "./basepath.js";

setYear();
const headerLogo = document.querySelector(".header-logo");
if (headerLogo) headerLogo.setAttribute("href", withBase("/"));
initRouter();
