import { defineMigration, type MigrationDefinition } from '@nocobase/db';

// Phase 3, tournament finance: a tournament is a finance project with its own budget per category. Its receipts and
// payments stay in finTransactions (so fund balances stay whole) and only carry the tournament they belong to.
const migration: MigrationDefinition = defineMigration({
  name: '202611210001_create_tournaments',
  async up({ builder }) {
    await builder.createCollection('finTournaments', (collection) => {
      collection.string('id', { length: 64 }).notNull();
      // GD-YYYY-NN, allocated from finCounters in the transaction that creates the tournament.
      collection.string('code', { length: 32 }).notNull();
      collection.string('name', { length: 200 }).notNull();
      // Calendar dates as YYYY-MM-DD.
      collection.date('startDate').notNull();
      collection.date('endDate').nullable();
      // The hosting branch, if any.
      collection.string('branchId', { length: 64 }).nullable();
      collection.string('venue', { length: 200 }).nullable();
      // planning | ongoing | closed (settled: no new or edited vouchers, budget read-only).
      collection.string('status', { length: 16 }).notNull().defaultTo('planning');
      collection.string('note', { length: 1000 }).nullable();
      collection.datetime('createdAt').notNull();
      collection.datetime('updatedAt').notNull();
      collection.primary('id', { name: 'pk_fin_tournaments' });
      collection.unique('code', { name: 'uq_fin_tournaments_code' });
      collection.foreignKey('branchId', {
        references: { collection: 'finBranches', fields: ['id'] },
        name: 'fk_fin_tournaments_branch',
      });
      collection.index(['status', 'startDate'], {
        name: 'ix_fin_tournaments_status',
      });
      collection.index('branchId', { name: 'ix_fin_tournaments_branch' });
    });
    await builder.createCollection('finTournamentBudgets', (collection) => {
      collection.string('id', { length: 64 }).notNull();
      collection.string('tournamentId', { length: 64 }).notNull();
      collection.string('categoryId', { length: 64 }).notNull();
      // Whole VND.
      collection.bigInt('amount').notNull().defaultTo(0);
      collection.primary('id', { name: 'pk_fin_tournament_budgets' });
      collection.unique(['tournamentId', 'categoryId'], {
        name: 'uq_fin_tournament_budgets_category',
      });
      collection.foreignKey('tournamentId', {
        references: { collection: 'finTournaments', fields: ['id'] },
        name: 'fk_fin_tournament_budgets_tournament',
      });
      collection.foreignKey('categoryId', {
        references: { collection: 'finCategories', fields: ['id'] },
        name: 'fk_fin_tournament_budgets_category',
      });
      collection.index('categoryId', {
        name: 'ix_fin_tournament_budgets_category',
      });
    });
    await builder.alterCollection('finTransactions', (collection) => {
      collection.string('tournamentId', { length: 64 }).nullable();
      collection.foreignKey('tournamentId', {
        references: { collection: 'finTournaments', fields: ['id'] },
        name: 'fk_fin_transactions_tournament',
      });
      collection.index('tournamentId', {
        name: 'ix_fin_transactions_tournament',
      });
    });
  },
  async down({ builder }) {
    // One step at a time, the reverse of up: SQLite rebuilds the table for the constraint, so batching them would
    // ask it to drop an index the rebuild already removed.
    await builder.dropIndex('finTransactions', 'ix_fin_transactions_tournament');
    await builder.dropConstraint(
      'finTransactions',
      'fk_fin_transactions_tournament',
    );
    await builder.dropField('finTransactions', 'tournamentId');
    await builder.dropCollection('finTournamentBudgets');
    await builder.dropCollection('finTournaments');
  },
});

export default migration;
