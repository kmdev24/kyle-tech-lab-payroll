import { withAuth } from "next-auth/middleware";

// First line of defense only; every admin page/action/route also calls requireAdmin().
export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ token, req }) {
      if (!token) return false;
      if (req.nextUrl.pathname.startsWith("/admin")) return token.role === "ADMIN";
      return true;
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/payslip/:path*"],
};
