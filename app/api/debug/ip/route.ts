import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return NextResponse.json({
            ip: data.ip,
            message: "请将此 IP 添加到微信公众号白名单 (Please add this IP to WeChat whitelist)"
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch IP' }, { status: 500 });
    }
}
