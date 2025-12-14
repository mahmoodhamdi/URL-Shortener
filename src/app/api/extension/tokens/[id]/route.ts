import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteExtensionToken } from '@/lib/extension';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/extension/tokens/[id]
 * Delete an extension token
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const tokenId = resolvedParams.id;
    const userId = session.user.id;

    const result = await deleteExtensionToken(tokenId, userId);

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Token not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting extension token:', error);
    return NextResponse.json(
      { error: 'Failed to delete extension token' },
      { status: 500 }
    );
  }
}
