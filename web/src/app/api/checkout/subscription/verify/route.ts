import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { database } from "@shared/services/database";

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || ''
});

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const subscription = await database.getSubscriptionByUser(session.user.id);

        if (!subscription) {
            return NextResponse.json({ subscription: null, isAuthorized: false });
        }

        // Se a assinatura estiver pendente e tivermos token do Mercado Pago, consulta status em tempo real
        const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (subscription.status === 'pending' && mpToken && mpToken.trim() !== '') {
            try {
                const preapproval = new PreApproval(client);
                const mpSub = await preapproval.get({ id: subscription.id });

                if (mpSub && mpSub.status && mpSub.status !== subscription.status) {
                    const nextPayment = mpSub.next_payment_date ? new Date(mpSub.next_payment_date) : undefined;
                    const updated = await database.updateSubscriptionStatus(
                        subscription.id,
                        mpSub.status,
                        nextPayment
                    );

                    return NextResponse.json({
                        subscription: updated,
                        isAuthorized: mpSub.status === 'authorized'
                    });
                }
            } catch (mpErr: any) {
                console.warn("[Subscription Verify] Mercado Pago lookup warning:", mpErr?.message || mpErr);
            }
        }

        return NextResponse.json({
            subscription,
            isAuthorized: subscription.status === 'authorized'
        });
    } catch (error: any) {
        console.error("[Subscription Verify Error]:", error);
        return NextResponse.json({ error: "Failed to verify subscription status" }, { status: 500 });
    }
}
