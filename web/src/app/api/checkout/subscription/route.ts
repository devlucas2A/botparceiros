import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { SUBSCRIPTION_PLANS, PlanId } from "@/config/subscription";
import { database } from "@shared/services/database";

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || ''
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { plan, interval = 'monthly' } = body;

        const selectedPlanConfig = SUBSCRIPTION_PLANS[plan as PlanId];

        if (!selectedPlanConfig) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        const isYearly = interval === 'yearly';
        // Use exact yearly price from config to avoid floating point issues or mismatches
        const price = isYearly ? selectedPlanConfig.price_yearly * 12 : selectedPlanConfig.price;
        const frequency = isYearly ? 12 : 1;

        const payerEmail = session.user.email || `${session.user.id}@users.corebot.app`;

        const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

        // Modo Simulação/Dev se não houver Token configurado
        if (!mpToken || mpToken.trim() === '') {
            console.log(`[Subscription Sandbox] Simulating instant upgrade for plan: ${plan}`);
            const mockSubId = `sub_sandbox_${Date.now()}`;
            await database.createSubscription(
                mockSubId,
                session.user.id,
                plan,
                "authorized",
                new Date(Date.now() + (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000)
            );
            return NextResponse.json({ url: `/dashboard/billing?success=true&plan=${plan}` });
        }

        const preapproval = new PreApproval(client);

        // Mercado Pago exige HTTPS real. Em dev (localhost), usamos example.com para não quebrar a API.
        const baseUrl = process.env.NEXTAUTH_URL?.includes('localhost')
            ? 'https://example.com'
            : (process.env.NEXTAUTH_URL || 'https://corebot.app');

        const backUrl = `${baseUrl}/dashboard/billing?success=true&plan=${plan}`;
        console.log("Creating PreApproval for", selectedPlanConfig.title, "Back URL:", backUrl);

        const response = await preapproval.create({
            body: {
                reason: `CoreBot ${selectedPlanConfig.title} Subscription (${isYearly ? 'Anual' : 'Mensal'})`,
                auto_recurring: {
                    frequency: frequency,
                    frequency_type: "months",
                    transaction_amount: Number(price.toFixed(2)),
                    currency_id: "BRL"
                },
                back_url: backUrl,
                payer_email: payerEmail,
                external_reference: session.user.id,
                status: "pending"
            }
        });

        // 🎯 Gravar assinatura inicial no banco de dados com status pending
        if (response.id) {
            await database.createSubscription(
                response.id,
                session.user.id,
                plan,
                "pending"
            );
        }

        return NextResponse.json({ url: response.init_point });
    } catch (error: any) {
        console.error("MercadoPago Error:", error);
        return NextResponse.json({ 
            error: error?.message || "Falha ao iniciar checkout no Mercado Pago" 
        }, { status: 500 });
    }
}
