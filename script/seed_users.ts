import 'dotenv/config';
import { db } from "../server/db";
import { users } from "../shared/schema";
import { hashPassword } from "../server/auth";

async function run() {
  try {
    console.log("Creating super admin...");
    const adminPassword = await hashPassword("admin123");
    await db.insert(users).values({
      username: "admin",
      password: adminPassword,
      companyId: null
    });
    console.log("Created admin user (username: admin, password: admin123)");

    console.log("Creating test company owner...");
    const clientPassword = await hashPassword("client123");
    
    // We assume companyId 1 exists. If not, it will fail due to foreign key constraint.
    // If it fails, the user must create a company first, then run this.
    try {
        await db.insert(users).values({
        username: "client1",
        password: clientPassword,
        companyId: 1
        });
        console.log("Created client1 user (username: client1, password: client123, companyId: 1)");
    } catch (e) {
        console.log("Could not create client1 (Maybe company ID 1 doesn't exist yet). Skipping.");
    }

    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
}

run();
