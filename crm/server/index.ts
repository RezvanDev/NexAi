import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { db } from "../../server/db";

function log(message: string, source = "crm-api") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}

import { registerCRMRoutes } from "./routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS headers for development (allow main client or any)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

// Register Routes
registerCRMRoutes(app);

// Basic Health Check
app.get("/", (req, res) => {
    res.send("<h1>NexPride CRM API Service</h1><p>Status: Running</p>");
});
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "crm-api" });
});

// Port configuration (default to 3001 for CRM)
const PORT = process.env.CRM_PORT || 3001;

app.listen(PORT, () => {
    log(`CRM Service running on port ${PORT}`, "crm");
});
