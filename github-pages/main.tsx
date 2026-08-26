import React from "react";
import { createRoot } from "react-dom/client";
import SignalWorkspace from "../app/signal-workspace";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SignalWorkspace />
  </React.StrictMode>,
);
