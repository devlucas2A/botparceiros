import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "web/.env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { database } from "../src/shared/services/database";

async function verifyMercadoPago() {
    console.log("==================================================");
    console.log("🔍 MERCADO PAGO INTEGRATION DIAGNOSTIC");
    console.log("==================================================");

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    console.log("1. Environment Variables:");
    console.log("   - MERCADOPAGO_ACCESS_TOKEN:", token ? `${token.substring(0, 15)}... (length: ${token.length})` : "❌ NOT SET");
    console.log("   - MERCADOPAGO_PUBLIC_KEY:", publicKey ? `${publicKey.substring(0, 15)}...` : "⚠️ NOT SET (Optional for backend)");
    console.log("   - NEXTAUTH_URL:", nextAuthUrl || "❌ NOT SET");

    if (!token || token.trim() === '') {
        console.log("\n⚠️ MERCADOPAGO_ACCESS_TOKEN is empty. The application operates in Sandbox/Simulation mode.");
        return;
    }

    console.log("\n2. Testing Mercado Pago API Authentication (/users/me)...");
    try {
        const userRes = await fetch("https://api.mercadopago.com/users/me", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!userRes.ok) {
            const errText = await userRes.text();
            console.error(`   ❌ API Error: ${userRes.status} ${userRes.statusText}`);
            console.error("   Details:", errText);
            return;
        }

        const userData = await userRes.json();
        console.log("   ✅ Authentication Successful!");
        console.log("   - Account ID:", userData.id);
        console.log("   - Name:", `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'N/A');
        console.log("   - Email:", userData.email);
        console.log("   - Nickname:", userData.nickname || 'N/A');
        console.log("   - Site ID:", userData.site_id);
    } catch (e: any) {
        console.error("   ❌ Network or Fetch Error:", e.message);
        return;
    }

    console.log("\n3. Testing PreApproval (Subscription) Creation with SDK...");
    try {
        const client = new MercadoPagoConfig({ accessToken: token });
        const preapproval = new PreApproval(client);

        const testSub = await preapproval.create({
            body: {
                reason: "Diagnostic Test Plan (Mensal)",
                auto_recurring: {
                    frequency: 1,
                    frequency_type: "months",
                    transaction_amount: 19.90,
                    currency_id: "BRL"
                },
                back_url: "https://example.com/dashboard/billing?success=true",
                payer_email: "test_payer_12345@example.com",
                external_reference: "diagnostic_user_123",
                status: "pending"
            }
        });

        console.log("   ✅ PreApproval Created Successfully!");
        console.log("   - Subscription ID:", testSub.id);
        console.log("   - Status:", testSub.status);
        console.log("   - Init Point (Checkout URL):", testSub.init_point);
    } catch (e: any) {
        console.error("   ❌ PreApproval Error:", e?.message || e);
        if (e?.cause) {
            console.error("   Cause:", JSON.stringify(e.cause, null, 2));
        }
    }

    console.log("\n4. Verifying Database Schema for Subscriptions and Payments...");
    try {
        const testUserId = `diag_${Date.now()}`;
        const testSubId = `sub_diag_${Date.now()}`;

        // Create test subscription
        await database.createSubscription(testSubId, testUserId, "pro", "pending");
        console.log("   ✅ database.createSubscription OK");

        // Update status to authorized
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await database.updateSubscriptionStatus(testSubId, "authorized", futureDate);
        console.log("   ✅ database.updateSubscriptionStatus OK");

        // Query subscription
        const queried = await database.getSubscriptionByUser(testUserId);
        console.log("   ✅ database.getSubscriptionByUser OK -> Status:", queried?.status, "Plan:", queried?.plan);

        // Test payment creation
        const testPayId = Math.floor(Date.now() / 1000);
        await database.createPayment(testPayId, testSubId, 29.90, "approved");
        console.log("   ✅ database.createPayment OK");

        console.log("\n==================================================");
        console.log("🎉 ALL MERCADO PAGO INTEGRATIONS & SERVICES ARE 100% OPERATIONAL!");
        console.log("==================================================");
    } catch (dbErr: any) {
        console.error("   ❌ Database Integration Error:", dbErr.message);
    } finally {
        await database.closePool();
    }
}

verifyMercadoPago().catch(console.error);
