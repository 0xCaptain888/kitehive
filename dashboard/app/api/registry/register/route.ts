import { NextRequest, NextResponse } from 'next/server';
import { registerAgent } from '@/lib/agent-store';
import { ethers } from 'ethers';

function validateInput(body: any): string | null {
  if (!body.name || body.name.length < 3) {
    return 'Agent name must be at least 3 characters';
  }
  if (!body.walletAddress || !ethers.isAddress(body.walletAddress)) {
    return 'Invalid wallet address format';
  }
  if (!body.capabilities || body.capabilities.length === 0) {
    return 'At least one capability required';
  }
  if (!body.endpoint || !body.endpoint.startsWith('http')) {
    return 'Valid endpoint URL required';
  }
  if (body.name.length > 50) {
    return 'Agent name must be under 50 characters';
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validationError = validateInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const capabilities = Array.isArray(body.capabilities)
      ? body.capabilities
      : body.capabilities.split(',').map((c: string) => c.trim()).filter(Boolean);

    const agent = registerAgent({
      name: body.name.trim(),
      walletAddress: ethers.getAddress(body.walletAddress),
      capabilities,
      endpoint: body.endpoint.trim(),
      contactEmail: body.contactEmail?.trim() || '',
      description: body.description?.trim() || '',
    });

    return NextResponse.json({
      success: true,
      message: 'Agent registered successfully. Status: pending review.',
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        registeredAt: agent.registeredAt,
      },
    }, { status: 201 });

  } catch (error: any) {
    if (error.message === 'Wallet address already registered') {
      return NextResponse.json(
        { error: 'This wallet address is already registered' },
        { status: 409 }
      );
    }
    console.error('Registry API error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
