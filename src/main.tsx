
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "@/components/theme-provider";
import { EventNotificationProvider } from "@/components/dashboard/event-notification";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <EventNotificationProvider>
          <App />
        </EventNotificationProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
