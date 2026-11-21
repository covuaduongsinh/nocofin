import { useCan } from '@nocobase/app-plugin-authorization/client';
import { useTranslation } from '@nocobase/i18n/client';
import { CalendarDays, MapPin, Plus, Trophy } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router';

import { Loading } from '#components/loading';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { StatusBadge } from '#components/status-badge';
import { Alert, AlertDescription } from '#components/ui/alert';
import { Button } from '#components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select';
import { useListData } from '#hooks/use-list-data';

import { formatDate } from '../format.js';
import type { FinanceTournamentSummary, TournamentStatus } from '../types.js';
import { Amount } from './amount.js';
import {
  TOURNAMENT_MANAGE_PERMISSION,
  TOURNAMENT_STATUS_TONE,
  TOURNAMENT_STATUSES,
  type TournamentListContext,
} from './types.js';

const ALL = 'all';

export default function FinanceTournamentsPage(): ReactElement {
  const { t } = useTranslation();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const requested = params.get('status');
  const status: TournamentStatus | typeof ALL =
    requested && (TOURNAMENT_STATUSES as readonly string[]).includes(requested)
      ? (requested as TournamentStatus)
      : ALL;
  const list = useListData<{ data: FinanceTournamentSummary[] }>(
    status === ALL
      ? 'finance/tournaments'
      : `finance/tournaments?status=${status}`,
    true,
  );
  const manage = useCan(TOURNAMENT_MANAGE_PERMISSION);
  const canManage = manage.can && !manage.isPending;
  const rows = list.data?.data;
  const context: TournamentListContext = { reload: list.reload };

  return (
    <PageContainer className='space-y-6'>
      <PageHeader
        title={t('finance.tournaments.title')}
        description={t('finance.tournaments.subtitle')}
        actions={
          canManage ? (
            <Button
              nativeButton={false}
              render={
                <Link to={{ pathname: 'new', search: location.search }} />
              }
            >
              <Plus className='size-4' />
              {t('finance.tournaments.add')}
            </Button>
          ) : undefined
        }
      />

      <div className='flex flex-wrap items-center gap-2'>
        <Select
          items={[
            { value: ALL, label: t('finance.tournaments.allStatuses') },
            ...TOURNAMENT_STATUSES.map((item) => ({
              value: item,
              label: t(`finance.tournaments.status.${item}`),
            })),
          ]}
          value={status}
          onValueChange={(value) => {
            if (typeof value !== 'string') return;
            const next = new URLSearchParams(params);
            if (value === ALL) next.delete('status');
            else next.set('status', value);
            setParams(next);
          }}
        >
          <SelectTrigger
            className='w-full sm:w-56'
            aria-label={t('finance.tournaments.statusLabel')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {t('finance.tournaments.allStatuses')}
            </SelectItem>
            {TOURNAMENT_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {t(`finance.tournaments.status.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.error && !rows ? (
        <Alert variant='destructive'>
          <AlertDescription className='flex flex-wrap items-center justify-between gap-2'>
            {t('finance.tournaments.loadFailed')}
            <Button variant='outline' size='sm' onClick={list.reload}>
              {t('finance.tournaments.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : !rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty className='border'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Trophy />
            </EmptyMedia>
            <EmptyTitle>
              {status === ALL
                ? t('finance.tournaments.empty')
                : t('finance.tournaments.emptyFiltered')}
            </EmptyTitle>
            {status === ALL && (
              <EmptyDescription>
                {t('finance.tournaments.emptyDescription')}
              </EmptyDescription>
            )}
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={{ pathname: row.id, search: location.search }}
                className='block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
              >
                <Card className='h-full transition-colors hover:bg-muted/40'>
                  <CardHeader className='gap-2'>
                    <div className='flex items-start justify-between gap-2'>
                      <CardTitle className='leading-snug'>{row.name}</CardTitle>
                      <StatusBadge
                        size='sm'
                        tone={TOURNAMENT_STATUS_TONE[row.status]}
                        className='shrink-0'
                      >
                        {t(`finance.tournaments.status.${row.status}`)}
                      </StatusBadge>
                    </div>
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
                      <span className='font-mono'>{row.code}</span>
                      <span className='inline-flex items-center gap-1'>
                        <CalendarDays className='size-3.5' />
                        {formatDate(row.startDate)}
                        {row.endDate && row.endDate !== row.startDate
                          ? ` – ${formatDate(row.endDate)}`
                          : ''}
                      </span>
                      {(row.branchName || row.venue) && (
                        <span className='inline-flex items-center gap-1'>
                          <MapPin className='size-3.5' />
                          {[row.branchName, row.venue]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <dl className='grid grid-cols-3 gap-2 text-sm'>
                      <div>
                        <dt className='text-xs text-muted-foreground'>
                          {t('finance.tournaments.income')}
                        </dt>
                        <dd>
                          <Amount value={row.totalIncome} />
                        </dd>
                      </div>
                      <div>
                        <dt className='text-xs text-muted-foreground'>
                          {t('finance.tournaments.expense')}
                        </dt>
                        <dd>
                          <Amount value={row.totalExpense} />
                        </dd>
                      </div>
                      <div>
                        <dt className='text-xs text-muted-foreground'>
                          {t('finance.tournaments.net')}
                        </dt>
                        <dd>
                          <Amount value={row.net} signed />
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Outlet context={context} />
    </PageContainer>
  );
}
