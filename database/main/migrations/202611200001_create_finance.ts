import { defineMigration, type MigrationDefinition } from '@nocobase/db';

// The cash book of phase 1: branches (cost centres), fund accounts, income/expense categories, receipt and payment
// vouchers, and the counters voucher numbers are allocated from. Amounts are whole VND.
const migration: MigrationDefinition = defineMigration({
  name: '202611200001_create_finance',
  async up({ builder }) {
    await builder.createCollection('finBranches', (collection) => {
      collection.string('id', { length: 64 }).notNull();
      collection.string('code', { length: 32 }).notNull();
      collection.string('name', { length: 120 }).notNull();
      collection.string('kind', { length: 16 }).notNull();
      collection.boolean('active').notNull().defaultTo(true);
      collection.string('note', { length: 500 }).nullable();
      collection.primary('id', { name: 'pk_fin_branches' });
      collection.unique('code', { name: 'uq_fin_branches_code' });
    });
    await builder.createCollection('finAccounts', (collection) => {
      collection.string('id', { length: 64 }).notNull();
      collection.string('code', { length: 32 }).notNull();
      collection.string('name', { length: 120 }).notNull();
      collection.string('kind', { length: 16 }).notNull();
      collection.string('bankName', { length: 120 }).nullable();
      collection.string('accountNumber', { length: 64 }).nullable();
      collection.bigInt('openingBalance').notNull().defaultTo(0);
      collection.boolean('active').notNull().defaultTo(true);
      collection.string('note', { length: 500 }).nullable();
      collection.primary('id', { name: 'pk_fin_accounts' });
      collection.unique('code', { name: 'uq_fin_accounts_code' });
    });
    await builder.createCollection('finCategories', (collection) => {
      collection.string('id', { length: 64 }).notNull();
      collection.string('code', { length: 32 }).notNull();
      collection.string('name', { length: 120 }).notNull();
      collection.string('type', { length: 16 }).notNull();
      collection.integer('sort').notNull().defaultTo(0);
      collection.boolean('active').notNull().defaultTo(true);
      collection.primary('id', { name: 'pk_fin_categories' });
      collection.unique('code', { name: 'uq_fin_categories_code' });
    });
    await builder.createCollection('finTransactions', (collection) => {
      collection.string('id', { length: 64 }).notNull();
      collection.string('code', { length: 32 }).notNull();
      collection.string('type', { length: 16 }).notNull();
      // The voucher's business date as YYYY-MM-DD, and its month as YYYY-MM for period reports.
      collection.date('date').notNull();
      collection.string('period', { length: 7 }).notNull();
      collection.bigInt('amount').notNull();
      collection.string('categoryId', { length: 64 }).notNull();
      collection.string('accountId', { length: 64 }).notNull();
      collection.string('branchId', { length: 64 }).nullable();
      collection.string('counterparty', { length: 200 }).nullable();
      collection.string('description', { length: 1000 }).nullable();
      collection.string('createdById', { length: 64 }).notNull();
      collection.datetime('createdAt').notNull();
      collection.datetime('updatedAt').notNull();
      collection.primary('id', { name: 'pk_fin_transactions' });
      collection.unique('code', { name: 'uq_fin_transactions_code' });
      collection.foreignKey('categoryId', {
        references: { collection: 'finCategories', fields: ['id'] },
        name: 'fk_fin_transactions_category',
      });
      collection.foreignKey('accountId', {
        references: { collection: 'finAccounts', fields: ['id'] },
        name: 'fk_fin_transactions_account',
      });
      collection.foreignKey('branchId', {
        references: { collection: 'finBranches', fields: ['id'] },
        name: 'fk_fin_transactions_branch',
      });
      collection.index(['date', 'code'], { name: 'ix_fin_transactions_date' });
      collection.index(['period', 'type'], {
        name: 'ix_fin_transactions_period',
      });
      collection.index('accountId', { name: 'ix_fin_transactions_account' });
      collection.index('categoryId', { name: 'ix_fin_transactions_category' });
      collection.index('branchId', { name: 'ix_fin_transactions_branch' });
    });
    await builder.createCollection('finCounters', (collection) => {
      collection.string('key', { length: 32 }).notNull();
      collection.integer('value').notNull();
      collection.primary('key', { name: 'pk_fin_counters' });
    });
  },
  async down({ builder }) {
    await builder.dropCollection('finCounters');
    await builder.dropCollection('finTransactions');
    await builder.dropCollection('finCategories');
    await builder.dropCollection('finAccounts');
    await builder.dropCollection('finBranches');
  },
});

export default migration;
