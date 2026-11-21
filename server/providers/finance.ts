import { authorizationToken } from '@nocobase/app-plugin-authorization/server';
import type { Application } from '@nocobase/app-server/application';
import { ServiceProvider } from '@nocobase/service-provider';
import {
  accounts,
  branches,
  categoriesSetting,
  financeCollections,
  reports,
  tournaments,
  transactions,
} from '../finance/resources.js';

const title = (key: string) => ({
  key: `finance.permissions.${key}`,
  ns: 'nocofin',
});

/**
 * Registers what the finance module can do. Registration grants nobody anything: roles come from the seed and are
 * assigned to named users in User management.
 */
export default class FinanceProvider extends ServiceProvider<Application> {
  readonly name = 'app.finance';
  override boot(): Promise<void> {
    if (!this.app.container.has(authorizationToken)) return Promise.resolve();
    const authz = this.app.container.resolve(authorizationToken);
    for (const collection of financeCollections)
      authz.database.collections.add(collection);
    authz.ui.sections.add({
      name: 'finance',
      title: title('section'),
      parent: 'business',
    });
    for (const resource of [
      transactions,
      accounts,
      branches,
      reports,
      tournaments,
    ])
      authz.ui.place(authz.compositeResources.define(resource), {
        section: 'finance',
      });
    // Categories are a dictionary administrators maintain from System settings.
    authz.ui.sections.add({
      name: 'finance.admin',
      title: title('section'),
      parent: 'administration',
    });
    authz.settings.add({
      id: categoriesSetting,
      title: title('categories'),
      actions: [{ name: 'read' }, { name: 'create' }, { name: 'update' }],
    });
    authz.ui.place(
      { type: 'settings', id: categoriesSetting },
      { section: 'finance.admin' },
    );
    return Promise.resolve();
  }
}
