import { ActivityClient } from "@/components/activity/ActivityClient";

interface Props {
    params: Promise<{
        guildId: string;
        locale: string;
    }>;
}

export default async function BotActivityPage({ params }: Props) {
    const { guildId, locale } = await params;

    return (
        <main className="w-full">
            <ActivityClient guildId={guildId} locale={locale} />
        </main>
    );
}
