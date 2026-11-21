import { randomUUID } from 'node:crypto';
import { defineSeed } from '@nocobase/db';

// Adds tournament finance to the three finance roles 202611200002_seed_finance_roles created:
//   finance.tournaments:view   — director, accountant, cashier
//   finance.tournaments:manage — director, accountant
// and the page grant for /finance/tournaments to all three. Only these named permission sets change; nothing is
// granted to authenticated:* or to the member role. Existing grants, including ones an administrator added or
// removed in Permission management, are kept: an action is only added when the set does not already hold it.

interface Grant {
  resource: { type: string; id: string };
  actions: Array<{ action: string; policy?: unknown }>;
}

const pageGrant: Grant = {
  resource: { type: 'page', id: 'finance.tournaments' },
  actions: [{ action: 'access' }],
};

const viewAction = {
  action: 'view',
  policy: {
    type: 'composite',
    scopes: {
      finTournaments: 'allRecords',
      finTournamentBudgets: 'allRecords',
      finTransactions: 'allRecords',
      finCategories: 'allRecords',
      finAccounts: 'allRecords',
      finBranches: 'allRecords',
    },
  },
};

const manageAction = {
  action: 'manage',
  policy: {
    type: 'composite',
    scopes: {
      finTournaments: 'allRecords',
      finTournamentBudgets: 'allRecords',
      finCategories: 'allRecords',
      finBranches: 'allRecords',
    },
  },
};

const additions: Record<string, Grant[]> = {
  'finance-director': [
    pageGrant,
    {
      resource: { type: 'composite', id: 'finance.tournaments' },
      actions: [viewAction, manageAction],
    },
  ],
  'finance-accountant': [
    pageGrant,
    {
      resource: { type: 'composite', id: 'finance.tournaments' },
      actions: [viewAction, manageAction],
    },
  ],
  'finance-cashier': [
    pageGrant,
    {
      resource: { type: 'composite', id: 'finance.tournaments' },
      actions: [viewAction],
    },
  ],
};

function merge(current: Grant[], extra: Grant[]): Grant[] {
  const result = current.map((grant) => ({
    ...grant,
    actions: [...grant.actions],
  }));
  for (const grant of extra) {
    const existing = result.find(
      (item) =>
        item.resource.type === grant.resource.type &&
        item.resource.id === grant.resource.id,
    );
    if (!existing) {
      result.push(structuredClone(grant));
      continue;
    }
    for (const action of grant.actions)
      if (!existing.actions.some((item) => item.action === action.action))
        existing.actions.push(structuredClone(action));
  }
  return result;
}

export default defineSeed({
  name: '202611210002_seed_tournament_roles',
  transaction: true,
  async run({ query }) {
    for (const [key, grants] of Object.entries(additions)) {
      const row = await query
        .selectFrom('authorizationPermissionSets')
        .select(['id', 'grants'])
        .where('key', '=', key)
        .executeTakeFirst<{ id: string; grants: unknown }>();
      // An administrator may have deleted the role; do not bring it back.
      if (!row) continue;
      // SQLite returns the JSON column as text, Postgres as a parsed value.
      const current = (
        typeof row.grants === 'string' ? JSON.parse(row.grants) : row.grants
      ) as Grant[];
      const next = merge(Array.isArray(current) ? current : [], grants);
      if (JSON.stringify(next) === JSON.stringify(current)) continue;
      await query
        .updateTable('authorizationPermissionSets')
        .set({
          grants: JSON.stringify(next),
          updatedAt: new Date(),
          // A new revision, so an editor holding the old one gets a conflict instead of overwriting these grants.
          revision: randomUUID(),
        })
        .where('id', '=', row.id)
        .execute();
    }
  },
});
