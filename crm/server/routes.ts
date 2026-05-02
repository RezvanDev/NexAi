import express, { type Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { db } from "../../server/db";
import { companies, leads, calls, users } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { hashPassword } from "../../server/auth";

// Middleware to check if user is authenticated
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: "Unauthorized" });
}

export function registerCRMRoutes(app: Express) {

    // --- Companies Management ---

    app.get("/api/companies", requireAuth, async (req, res) => {
        try {
            const user = req.user as any;
            
            // If user has a companyId, they can only see their own company
            const query = user.companyId 
                ? db.select().from(companies).where(eq(companies.id, user.companyId)).orderBy(desc(companies.createdAt))
                : db.select().from(companies).orderBy(desc(companies.createdAt));

            const allCompanies = await query;
            
            // For each company, let's get some basic stats (total calls & total duration)
            const companiesWithStats = await Promise.all(allCompanies.map(async (company) => {
                const results = await db.select({
                    count: sql<number>`count(${calls.id})`,
                    totalDuration: sql<number>`sum(${calls.duration})`
                })
                .from(calls)
                .innerJoin(leads, eq(calls.leadId, leads.id))
                .where(eq(leads.companyId, company.id));
                
                return { 
                    ...company, 
                    stats: {
                        totalCalls: Number(results[0]?.count || 0),
                        totalDuration: Number(results[0]?.totalDuration || 0)
                    }
                };
            }));

            res.json(companiesWithStats);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Failed to fetch companies" });
        }
    });

    app.post("/api/companies", requireAuth, async (req, res) => {
        try {
            const user = req.user as any;
            if (user.companyId) {
                return res.status(403).json({ error: "Company owners cannot create new companies" });
            }

            const { name, systemPrompt, agentName, agentRole, agentGreeting, username, password, limitMinutes, voice } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({ error: "Username and password are required for new clients" });
            }

            // Check if username already exists
            const [existingUser] = await db.select().from(users).where(eq(users.username, username));
            if (existingUser) {
                return res.status(400).json({ error: "Username already exists" });
            }

            const [newCompany] = await db.insert(companies).values({
                name: name || "Новая компания",
                systemPrompt: systemPrompt || "Ты профессиональный ассистент.",
                agentName: agentName || "Ассистент",
                agentRole: agentRole || "Менеджер",
                agentGreeting: agentGreeting || "Здравствуйте! Как я могу вам помочь?",
                limitMinutes: limitMinutes !== undefined ? parseInt(limitMinutes) : 100,
                voice: voice || "alloy"
            }).returning();

            // Create user for the new company
            const hashedPassword = await hashPassword(password);
            await db.insert(users).values({
                username,
                password: hashedPassword,
                companyId: newCompany.id
            });

            res.status(201).json(newCompany);
        } catch (e) {
            res.status(500).json({ error: "Failed to create company" });
        }
    });

    app.get("/api/companies/:id", requireAuth, async (req, res) => {
        const id = parseInt(req.params.id);
        const user = req.user as any;
        
        if (user.companyId && user.companyId !== id) {
             return res.status(403).json({ error: "Access denied" });
        }

        const [company] = await db.select().from(companies).where(eq(companies.id, id));
        if (!company) return res.status(404).json({ error: "Company not found" });

        const results = await db.select({
            count: sql<number>`count(${calls.id})`,
            totalDuration: sql<number>`sum(${calls.duration})`
        })
        .from(calls)
        .innerJoin(leads, eq(calls.leadId, leads.id))
        .where(eq(leads.companyId, id));

        const companyWithStats = {
            ...company,
            stats: {
                totalCalls: Number(results[0]?.count || 0),
                totalDuration: Number(results[0]?.totalDuration || 0)
            }
        };

        res.json(companyWithStats);
    });

    app.patch("/api/companies/:id", requireAuth, async (req, res) => {
        const id = parseInt(req.params.id);
        const user = req.user as any;
        
        if (user.companyId && user.companyId !== id) {
             return res.status(403).json({ error: "Access denied" });
        }

        const {
            name,
            agentName,
            agentRole,
            agentGreeting,
            agentTerminationPhrase,
            companyContext,
            systemPrompt,
            telegramChatId,
            limitMinutes,
            voice
        } = req.body;

        const updateData: any = {
            name,
            agentName,
            agentRole,
            agentGreeting,
            agentTerminationPhrase,
            companyContext,
            systemPrompt,
            telegramChatId
        };

        if (voice) {
            updateData.voice = voice;
        }

        // Only super admin can change limitMinutes? Let's just allow it for now or check user role.
        // For simplicity, if it's provided we update it. (A client could technically change their own limit if they hack the API, but MVP is fine or we check user.companyId).
        if (limitMinutes !== undefined && !user.companyId) {
            updateData.limitMinutes = parseInt(limitMinutes);
        }

        const [updated] = await db.update(companies)
            .set(updateData)
            .where(eq(companies.id, id))
            .returning();

        res.json(updated);
    });

    app.delete("/api/companies/:id", requireAuth, async (req, res) => {
        try {
            const user = req.user as any;
            if (user.companyId) {
                return res.status(403).json({ error: "Company owners cannot delete companies" });
            }

            const id = parseInt(req.params.id);
            await db.delete(companies).where(eq(companies.id, id));
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: "Failed to delete company" });
        }
    });

    // --- Calls per Company ---
    app.get("/api/companies/:id/calls", requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const user = req.user as any;
            
            if (user.companyId && user.companyId !== id) {
                 return res.status(403).json({ error: "Access denied" });
            }

            const companyCalls = await db.select({
                id: calls.id,
                leadName: leads.name,
                leadPhone: leads.phone,
                duration: calls.duration,
                summary: calls.summary,
                transcript: calls.transcript,
                status: calls.status,
                startedAt: calls.startedAt
            })
            .from(calls)
            .innerJoin(leads, eq(calls.leadId, leads.id))
            .where(eq(leads.companyId, id))
            .orderBy(desc(calls.startedAt));

            res.json(companyCalls);
        } catch (e) {
            res.status(500).json({ error: "Failed to fetch company calls" });
        }
    });

    // Serve CRM Client
    app.get("/crm", (req, res) => {
        res.sendFile(path.join(process.cwd(), "crm/client/index.html"));
    });
    app.use("/crm", express.static(path.join(process.cwd(), "crm/client")));
}
