import {NextResponse} from "next/server";import {logout} from "@/lib/auth";export async function POST(r:Request){await logout();return NextResponse.redirect(new URL("/login",r.url),303);}
