# Phase 3.2: Team/Workspace Implementation Plan

## Overview
Team/Workspace features allow users to collaborate on links with team members. Users can create workspaces, invite members, and share links within a team. This is a premium feature available on paid plans.

## Feature Components

### 1. Database Schema

**Workspace Model:**
```prisma
model Workspace {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  logo        String?

  ownerId     String
  owner       User     @relation("WorkspaceOwner", fields: [ownerId], references: [id])

  members     WorkspaceMember[]
  links       Link[]
  folders     Folder[]
  invitations WorkspaceInvitation[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([ownerId])
  @@index([slug])
}

model WorkspaceMember {
  id          String        @id @default(cuid())
  workspaceId String
  workspace   Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  role        WorkspaceRole @default(MEMBER)

  joinedAt    DateTime      @default(now())

  @@unique([workspaceId, userId])
  @@index([userId])
}

model WorkspaceInvitation {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  email       String
  role        WorkspaceRole @default(MEMBER)
  token       String    @unique
  expiresAt   DateTime

  createdAt   DateTime  @default(now())

  @@unique([workspaceId, email])
  @@index([token])
}

enum WorkspaceRole {
  OWNER    // Full access, can delete workspace
  ADMIN    // Can manage members, settings, all links
  MEMBER   // Can create/edit own links
  VIEWER   // Can only view links and analytics
}
```

### 2. Files to Create/Modify

**New Files:**
- `src/lib/workspace/index.ts` - Workspace business logic
- `src/lib/workspace/permissions.ts` - Role-based permissions
- `src/lib/workspace/invitations.ts` - Invitation logic
- `src/app/api/workspaces/route.ts` - List/Create workspaces
- `src/app/api/workspaces/[id]/route.ts` - Get/Update/Delete workspace
- `src/app/api/workspaces/[id]/members/route.ts` - Members management
- `src/app/api/workspaces/[id]/invitations/route.ts` - Invitations
- `src/app/api/invitations/[token]/route.ts` - Accept invitation
- `src/app/[locale]/workspaces/page.tsx` - Workspaces list
- `src/app/[locale]/workspaces/[slug]/page.tsx` - Workspace dashboard
- `src/app/[locale]/workspaces/[slug]/settings/page.tsx` - Settings
- `src/app/[locale]/workspaces/[slug]/members/page.tsx` - Members
- `src/components/workspace/WorkspaceCard.tsx`
- `src/components/workspace/WorkspaceSelector.tsx`
- `src/components/workspace/MembersList.tsx`
- `src/components/workspace/InviteMemberDialog.tsx`

**Modified Files:**
- `prisma/schema.prisma` - Add workspace models
- `src/types/index.ts` - Add workspace types
- `src/messages/en.json` - Add translations
- `src/messages/ar.json` - Add Arabic translations
- Link model - Add workspaceId relation
- Folder model - Add workspaceId relation

### 3. Role Permissions Matrix

| Action              | OWNER | ADMIN | MEMBER | VIEWER |
|---------------------|-------|-------|--------|--------|
| View workspace      |   ✓   |   ✓   |   ✓    |   ✓    |
| View all links      |   ✓   |   ✓   |   ✓    |   ✓    |
| Create links        |   ✓   |   ✓   |   ✓    |   ✗    |
| Edit own links      |   ✓   |   ✓   |   ✓    |   ✗    |
| Edit all links      |   ✓   |   ✓   |   ✗    |   ✗    |
| Delete own links    |   ✓   |   ✓   |   ✓    |   ✗    |
| Delete all links    |   ✓   |   ✓   |   ✗    |   ✗    |
| Invite members      |   ✓   |   ✓   |   ✗    |   ✗    |
| Remove members      |   ✓   |   ✓   |   ✗    |   ✗    |
| Edit workspace      |   ✓   |   ✓   |   ✗    |   ✗    |
| Delete workspace    |   ✓   |   ✗   |   ✗    |   ✗    |
| Transfer ownership  |   ✓   |   ✗   |   ✗    |   ✗    |

### 4. API Endpoints

**Workspaces:**
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/[id]` - Get workspace details
- `PUT /api/workspaces/[id]` - Update workspace
- `DELETE /api/workspaces/[id]` - Delete workspace

**Members:**
- `GET /api/workspaces/[id]/members` - List members
- `PUT /api/workspaces/[id]/members/[userId]` - Update member role
- `DELETE /api/workspaces/[id]/members/[userId]` - Remove member

**Invitations:**
- `GET /api/workspaces/[id]/invitations` - List invitations
- `POST /api/workspaces/[id]/invitations` - Send invitation
- `DELETE /api/workspaces/[id]/invitations/[invId]` - Cancel invitation
- `POST /api/invitations/[token]/accept` - Accept invitation

### 5. Plan Limits

| Plan       | Workspaces | Members per Workspace |
|------------|------------|----------------------|
| FREE       | 0          | 0                    |
| STARTER    | 1          | 2                    |
| PRO        | 3          | 5                    |
| BUSINESS   | 10         | 25                   |
| ENTERPRISE | Unlimited  | Unlimited            |

### 6. Implementation Steps

1. ✅ Create implementation plan
2. Add Prisma schema changes
3. Create workspace library (CRUD, permissions)
4. Create invitation logic
5. Create API endpoints
6. Create UI components
7. Add workspace selector to dashboard
8. Add translations
9. Write unit tests
10. Write integration tests
11. Write E2E tests
12. Commit and push
