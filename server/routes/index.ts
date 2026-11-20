import type { Application } from '@nocobase/app-server/application';
import type { AppRouteContribution } from '@nocobase/app-server/router';

import financeRoutes from './finance.js';

const routes: readonly AppRouteContribution<Application>[] = [financeRoutes];

export default routes;
