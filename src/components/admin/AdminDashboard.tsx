import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Link2, MousePointerClick, CreditCard } from 'lucide-react';

type Stats = {
  users: number;
  links: number;
  clicks: number;
  activeSubscriptions: number;
  planBreakdown: Array<{ plan: string; count: number }>;
};

type RecentUser = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  subscription: { plan: string; status: string } | null;
  _count: { links: number };
};

type RecentLink = {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  user: { email: string } | null;
  _count: { clicks: number };
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function AdminDashboard({
  stats,
  recentUsers,
  recentLinks,
}: {
  stats: Stats;
  recentUsers: RecentUser[];
  recentLinks: RecentLink[];
}) {
  const tiles = [
    { label: 'Users', value: stats.users, icon: Users },
    { label: 'Links', value: stats.links, icon: Link2 },
    { label: 'Clicks', value: stats.clicks, icon: MousePointerClick },
    { label: 'Active subs', value: stats.activeSubscriptions, icon: CreditCard },
  ];

  return (
    <div className="container py-8 space-y-8" data-testid="admin-dashboard">
      <header>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm">
          Read-only snapshot. Mutations land in a Phase-2 milestone — see
          <code className="ms-1 px-1 py-0.5 rounded bg-muted text-xs">sales/CLIENT-ONBOARDING.md</code>.
        </p>
      </header>

      <section
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        data-testid="admin-stats"
      >
        {tiles.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(value)}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section data-testid="admin-plan-breakdown">
        <Card>
          <CardHeader>
            <CardTitle>Plan distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.planBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
            ) : (
              <ul className="space-y-2">
                {stats.planBreakdown.map((row) => (
                  <li
                    key={row.plan}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{row.plan}</span>
                    <span className="text-muted-foreground">{formatNumber(row.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section data-testid="admin-recent-users">
        <Card>
          <CardHeader>
            <CardTitle>Recent sign-ups</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pe-3">Email</th>
                  <th className="py-2 pe-3">Plan</th>
                  <th className="py-2 pe-3">Links</th>
                  <th className="py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-muted-foreground">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="py-2 pe-3 truncate max-w-xs">{u.email}</td>
                      <td className="py-2 pe-3">{u.subscription?.plan ?? 'FREE'}</td>
                      <td className="py-2 pe-3">{u._count.links}</td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section data-testid="admin-recent-links">
        <Card>
          <CardHeader>
            <CardTitle>Recent links</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pe-3">Short code</th>
                  <th className="py-2 pe-3">Owner</th>
                  <th className="py-2 pe-3">Original URL</th>
                  <th className="py-2 pe-3">Clicks</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentLinks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-muted-foreground">
                      No links yet.
                    </td>
                  </tr>
                ) : (
                  recentLinks.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="py-2 pe-3 font-mono">{l.shortCode}</td>
                      <td className="py-2 pe-3 truncate max-w-[180px]">
                        {l.user?.email ?? <em className="text-muted-foreground">anonymous</em>}
                      </td>
                      <td className="py-2 pe-3 truncate max-w-xs">
                        <a
                          href={l.originalUrl}
                          className="hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {l.originalUrl}
                        </a>
                      </td>
                      <td className="py-2 pe-3">{l._count.clicks}</td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
