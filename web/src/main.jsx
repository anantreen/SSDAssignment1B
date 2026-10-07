/**
 * Browser bootstrap.
 *
 * Mount the Member 1 application shell into the HTML root element.
 * All screen logic lives in members/; the existing stylesheet owns the unchanged
 * visuals.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../members/member1/web/App.jsx";
import "./style.css";

createRoot(document.getElementById("root")).render(<App />);
