import "dotenv/config";
import { db } from "../server/db";
import { calls, leads, companies } from "../shared/schema";
import { sql } from "drizzle-orm";

async function clearDb() {
    console.log("🗑️ Clearing database...");

    try {
        await db.delete(calls);
        console.log("✅ Calls deleted");

        await db.delete(leads);
        console.log("✅ Leads deleted");

        console.log("🎉 Database cleared successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error clearing database:", error);
        process.exit(1);
    }
}

clearDb();
