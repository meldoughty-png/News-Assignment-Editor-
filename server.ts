import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import cron from "node-cron";
import nodemailer from "nodemailer";
import fs from "fs";
import http from "http";
import { Server } from "socket.io";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Engagement Tracking
const STATS_FILE = "engagement_stats.json";

interface Stats {
  newsroomsCreated: number;
  assignmentsCreated: number;
  appOpens: number;
  salesCount: number;
  totalRevenue: number;
  platformRevenue: number; // The 30% cut for the creator
  creatorPayoutDetails?: {
    paypal?: string;
    bank?: string;
    crypto?: string;
  };
  lastReportDate: string;
  payouts: Array<{
    id: string;
    newsroomId: string;
    amount: number;
    status: 'Pending' | 'Processed';
    method: string;
    details: string;
    timestamp: number;
  }>;
}

function getStats(): Stats {
  if (fs.existsSync(STATS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATS_FILE, "utf-8"));
      return {
        ...data,
        payouts: data.payouts || [],
        platformRevenue: data.platformRevenue || 0,
        creatorPayoutDetails: data.creatorPayoutDetails || {}
      };
    } catch (e) {
      console.error("Failed to read stats file", e);
    }
  }
  return {
    newsroomsCreated: 0,
    assignmentsCreated: 0,
    appOpens: 0,
    salesCount: 0,
    totalRevenue: 0,
    platformRevenue: 0,
    lastReportDate: new Date().toISOString().split('T')[0],
    payouts: []
  };
}

function saveStats(stats: Stats) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

async function sendDailyReport() {
  const stats = getStats();
  const recipient = process.env.REPORT_RECIPIENT || "mel.doughty@gmail.com";
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const reportHtml = `
    <h2>Daily Engagement & Sales Report</h2>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    <ul>
      <li><strong>App Opens:</strong> ${stats.appOpens}</li>
      <li><strong>Newsrooms Created:</strong> ${stats.newsroomsCreated}</li>
      <li><strong>Assignments Created:</strong> ${stats.assignmentsCreated}</li>
      <li><strong>Total Sales:</strong> ${stats.salesCount}</li>
      <li><strong>Total Revenue:</strong> $${(stats.totalRevenue / 100).toFixed(2)}</li>
      <li><strong>Creator Earnings (30%):</strong> $${(stats.platformRevenue / 100).toFixed(2)}</li>
    </ul>
    <p><em>This is an automated report from Newsroom AI.</em></p>
  `;

  try {
    if (!process.env.SMTP_HOST) {
      console.warn("SMTP_HOST not configured. Skipping daily report email.");
      return;
    }

    await transporter.sendMail({
      from: `"Newsroom AI Reports" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: `Daily Report - ${new Date().toLocaleDateString()}`,
      html: reportHtml,
    });

    console.log("Daily report sent to", recipient);
    
    // Reset daily stats after report
    const oldStats = getStats();
    saveStats({
      newsroomsCreated: 0,
      assignmentsCreated: 0,
      appOpens: 0,
      salesCount: 0,
      totalRevenue: 0,
      platformRevenue: oldStats.platformRevenue, // Keep cumulative platform revenue
      creatorPayoutDetails: oldStats.creatorPayoutDetails, // Keep creator details
      lastReportDate: new Date().toISOString().split('T')[0],
      payouts: oldStats.payouts // Keep payouts across resets
    });
  } catch (error) {
    console.error("Failed to send daily report:", error);
  }
}

// Schedule report for midnight every day
cron.schedule("0 0 * * *", () => {
  console.log("Running daily report job...");
  sendDailyReport();
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  const PORT = 3000;

  app.use(express.json());

  // Real-time Collaboration State
  const users: Record<string, { id: string, name: string, newsroomId: string }> = {};
  const messages: Array<{ id: string, user: string, text: string, newsroomId: string, timestamp: number }> = [];

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", ({ name, newsroomId }) => {
      users[socket.id] = { id: socket.id, name, newsroomId };
      socket.join(newsroomId);
      
      // Broadcast updated user list for this newsroom
      const newsroomUsers = Object.values(users).filter(u => u.newsroomId === newsroomId);
      io.to(newsroomId).emit("users:update", newsroomUsers);
      
      // Send message history
      const newsroomMessages = messages.filter(m => m.newsroomId === newsroomId);
      socket.emit("chat:history", newsroomMessages);
      
      console.log(`${name} joined newsroom ${newsroomId}`);
    });

    socket.on("chat:message", (text) => {
      const user = users[socket.id];
      if (user) {
        const message = {
          id: Math.random().toString(36).substr(2, 9),
          user: user.name,
          text,
          newsroomId: user.newsroomId,
          timestamp: Date.now()
        };
        messages.push(message);
        if (messages.length > 100) messages.shift(); // Keep last 100
        io.to(user.newsroomId).emit("chat:message", message);
      }
    });

    socket.on("activity:edit", (assignmentTitle) => {
      const user = users[socket.id];
      if (user) {
        socket.to(user.newsroomId).emit("activity:edit", {
          user: user.name,
          assignmentTitle
        });
      }
    });

    socket.on("disconnect", () => {
      const user = users[socket.id];
      if (user) {
        const newsroomId = user.newsroomId;
        delete users[socket.id];
        const newsroomUsers = Object.values(users).filter(u => u.newsroomId === newsroomId);
        io.to(newsroomId).emit("users:update", newsroomUsers);
      }
      console.log("User disconnected:", socket.id);
    });
  });

  // Engagement Tracking Endpoints
  app.post("/api/track/app_open", (req, res) => {
    const stats = getStats();
    stats.appOpens++;
    saveStats(stats);
    res.json({ success: true });
  });

  app.post("/api/track/newsroom", (req, res) => {
    const stats = getStats();
    stats.newsroomsCreated++;
    saveStats(stats);
    res.json({ success: true });
  });

  app.post("/api/track/assignment", (req, res) => {
    const stats = getStats();
    stats.assignmentsCreated++;
    saveStats(stats);
    res.json({ success: true });
  });

  app.post("/api/track/newsletter_signup", (req, res) => {
    const stats = getStats();
    // For now we just track it in a generic way or add a field if we wanted
    // But since the Stats interface doesn't have it, let's just log it for now
    // or we could add it to the Stats interface.
    console.log("Newsletter signup tracked");
    res.json({ success: true });
  });

  app.post("/api/articles/generate", async (req, res) => {
    const { title, description, category, style, region } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const prompt = `You are an expert award-winning journalist. Write a comprehensive, professionally polished, high-fidelity breaking news article draft based on the following assignment topic.
Topic Title: "${title}"
Description & Angle: "${description || 'None provided.'}"
Category: "${category || 'General'}"
Regional Setting: "${region || 'Global'}"
Editorial Style Guide: "${style || 'Standard investigative journalism style.'}"

Instructions:
1. Compose a highly captivating news headline (the article title).
2. Write an engaging subtitle/lead that instantly summarizes the core hook of the story.
3. Write a deep, detailed, multi-paragraph news report (the article body). It should follow high journalistic standards, include hypothetical quotes from relevant stakeholders if applicable, and present a balanced overview.
4. Ensure the body does NOT contain markdown tags; instead, it should be well-structured into normal paragraphs separated by double-newlines.

Please output the result as a structured JSON object.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              body: { type: Type.STRING }
            },
            required: ["title", "subtitle", "body"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (e: any) {
      console.error("Gemini article generation failed:", e);
      res.status(500).json({ error: e.message || "Failed to generate article" });
    }
  });

  app.post("/api/admin/send-report", async (req, res) => {
    try {
      await sendDailyReport();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Payout Endpoints
  app.get("/api/admin/payouts", (req, res) => {
    const stats = getStats();
    res.json({
      payouts: stats.payouts,
      platformRevenue: stats.platformRevenue,
      creatorPayoutDetails: stats.creatorPayoutDetails || {}
    });
  });

  app.post("/api/admin/creator-details", (req, res) => {
    const { paypal, bank, crypto } = req.body;
    const stats = getStats();
    stats.creatorPayoutDetails = { paypal, bank, crypto };
    saveStats(stats);
    res.json({ success: true });
  });

  app.post("/api/admin/payouts/process", (req, res) => {
    const { payoutId } = req.body;
    const stats = getStats();
    const payout = stats.payouts.find(p => p.id === payoutId);
    if (payout) {
      payout.status = 'Processed';
      saveStats(stats);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Payout not found" });
    }
  });

  app.post("/api/payouts/request", (req, res) => {
    const { newsroomId, amount, method, details } = req.body;
    const stats = getStats();
    const newPayout = {
      id: Math.random().toString(36).substr(2, 9),
      newsroomId,
      amount,
      status: 'Pending' as const,
      method,
      details,
      timestamp: Date.now()
    };
    stats.payouts.push(newPayout);
    saveStats(stats);
    res.json({ success: true, payout: newPayout });
  });

  // Stripe Checkout Endpoint
  app.post("/api/create-checkout-session", async (req, res) => {
    const { tier, newsroomId } = req.body;

    if (!stripe) {
      return res.status(400).json({ error: "Stripe is not configured on this server." });
    }

    let priceId = "";
    const amount = tier === "Pro" ? 4900 : 24900;
    if (tier === "Pro") priceId = "price_pro_placeholder";
    else if (tier === "Enterprise") priceId = "price_enterprise_placeholder";

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card", "paypal"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Newsroom AI ${tier} Plan`,
                description: `Subscription for ${newsroomId}`,
              },
              unit_amount: amount,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.APP_URL || "http://localhost:3000"}/?success=true&newsroomId=${newsroomId}&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/?canceled=true`,
      });

      // Track sale and create pending payout (e.g., 70% to newsroom, 30% platform fee)
      const stats = getStats();
      stats.salesCount++;
      stats.totalRevenue += amount;
      
      const newsroomAmount = Math.floor(amount * 0.7);
      const platformAmount = amount - newsroomAmount;
      stats.platformRevenue += platformAmount;

      stats.payouts.push({
        id: Math.random().toString(36).substr(2, 9),
        newsroomId,
        amount: newsroomAmount,
        status: 'Pending',
        method: 'Automatic',
        details: `Subscription Sale: ${tier} Plan`,
        timestamp: Date.now()
      });

      saveStats(stats);

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
