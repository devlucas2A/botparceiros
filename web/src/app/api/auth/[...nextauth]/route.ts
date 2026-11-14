import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

if (process.env.NODE_ENV === "production") {
    process.env.AUTH_TRUST_HOST = "true";
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
