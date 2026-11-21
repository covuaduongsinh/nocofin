import {
  ApiClientError,
  useApiClient,
  usePageBreadcrumb,
  useSubmission,
  useToaster,
} from '@nocobase/app-client';
import { useAuthentication } from '@nocobase/app-plugin-authentication/client';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import { useTranslation } from '@nocobase/i18n/client';
import {
  CalendarDays,
  Lock,
  MapPin,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Play,
  Wallet,
} from 'lucide-react';
import { useState, type ReactElement, type ReactNode } from 'react';
import {
  Link,
  Outlet,
  useLocation,
  useParams,
  useResolvedPath,
} from 'react-router';
import { cn } from 'cn';

import { Loading } from '#components/loading';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { RouteChildPage } from '#components/route-child-page';
import { StatusBadge } from '#components/status-badge';
import { Alert, AlertDescription } from '#components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#components/ui/alert-dialog';
import { Badge } from '#components/ui/badge';
import { Button } from '#components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '#components/ui/table';
import { useListData } from '#hooks/use-list-data';

import { useAncestorSearch } from '../../../routing/route-context.js';
import { formatDate, formatVnd } from '../format.js';
import type {
  FinanceOptionsData,
  FinanceTournamentCategoryLine,
  FinanceTournamentReport,
  TournamentStatus,
  TransactionType,
} from '../types.js';
import { VoucherDialog, type VoucherRequest } from '../voucher-dialog.js';
import { Amount } from './amount.js';
import {
  TOURNAMENT_LIST_KEYS,
  TOURNAMENT_MANAGE_PERMISSION,
  TOURNAMENT_STATUS_TONE,
  VOUCHER_CREATE_PERMISSION,
  type TournamentDetailContext,
} from './types.js';

/** `/finance/tournaments/:tournamentId`: the tournament's result, budget against actual, and its vouchers. */
export default function FinanceTournamentDetailPage(): ReactElement {
  const { t } = useTranslation();
  const location = useLocation();
  const { tournamentId = '' } = useParams();
  const report = useListData<{ data: FinanceTournamentReport }>(
    `finance/tournaments/${encodeURIComponent(tournamentId)}`,
  );
  const data = report.data?.data;

  // The trail is declared before anything loads and kept on failure (navigation.md).
  const owner = useResolvedPath('..').pathname;
  const detail = useResolvedPath('.').pathname;
  const ownerSearch = useAncestorSearch(owner, TOURNAMENT_LIST_KEYS);
  const detailSearch = useAncestorSearch(detail, TOURNAMENT_LIST_KEYS);
  usePageBreadcrumb([
    {
      label: t('finance.tournaments.title'),
      to: { pathname: owner, search: ownerSearch },
    },
    {
      label: data?.tournament.name ?? t('finance.tournaments.detail'),
      to: { pathname: detail, search: detailSearch },
    },
  ]);

  const context: TournamentDetailContext = {
    report: data,
    reload: report.reload,
  };
  const notFound =
    report.error instanceof ApiClientError && report.error.status === 404;

  return (
    <>
      <RouteChildPage>
        <PageContainer className='space-y-6'>
          {!data ? (
            report.error ? (
              <>
                <PageHeader title={t('finance.tournaments.detail')} />
                <Alert variant='destructive'>
                  <AlertDescription className='flex flex-wrap items-center justify-between gap-2'>
                    {notFound
                      ? t('finance.tournaments.notFound')
                      : t('finance.tournaments.loadFailed')}
                    {!notFound && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={report.reload}
                      >
                        {t('finance.tournaments.retry')}
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <Loading />
            )
          ) : (
            <TournamentReport
              report={data}
              reload={report.reload}
              search={location.search}
            />
          )}
        </PageContainer>
      </RouteChildPage>
      <Outlet context={context} />
    </>
  );
}

function TournamentReport({
  report,
  reload,
  search,
}: {
  readonly report: FinanceTournamentReport;
  readonly reload: () => void;
  readonly search: string;
}): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();
  const { session } = useAuthentication();
  const { tournament, totals } = report;
  const closed = tournament.status === 'closed';
  const manage = useCan(TOURNAMENT_MANAGE_PERMISSION);
  const canManage = manage.can && !manage.isPending;
  const createVoucher = useCan(VOUCHER_CREATE_PERMISSION);
  const canCreateVoucher = createVoucher.can && !createVoucher.isPending;
  // The voucher form's choices; only read by someone who may record vouchers.
  const options = useListData<{ data: FinanceOptionsData }>('finance/options', {
    active: canCreateVoucher,
  });

  const [voucher, setVoucher] = useState<{
    key: number;
    request: VoucherRequest;
  } | null>(null);
  const openVoucher = (type: TransactionType) =>
    setVoucher((current) => ({
      key: (current?.key ?? 0) + 1,
      request: {
        kind: 'create',
        type,
        tournamentId: tournament.id,
        branchId: tournament.branchId,
        fixed: true,
      },
    }));

  const [statusTarget, setStatusTarget] = useState<TournamentStatus | null>(
    null,
  );
  const statusChange = useSubmission({
    scope: `${session?.user.id}:finance:tournament-status:${tournament.id}`,
  });
  const changeStatus = async (status: TournamentStatus) => {
    try {
      const outcome = await statusChange.run(
        { id: tournament.id, status },
        (key, signal, input) =>
          api.request({
            path: `finance/tournaments/${encodeURIComponent(input.id)}`,
            method: 'PATCH',
            json: { status: input.status },
            headers: { 'Idempotency-Key': key },
            signal,
          }),
      );
      if (!outcome) return;
      setStatusTarget(null);
      toaster.show({
        type: 'success',
        title: t('finance.tournaments.statusChanged'),
      });
      reload();
    } catch {
      toaster.show({
        type: 'error',
        title: t('finance.tournaments.actionFailed'),
      });
    }
  };

  const income = report.categories.filter((line) => line.type === 'income');
  const expense = report.categories.filter((line) => line.type === 'expense');

  const actions = (
    <div className='flex flex-wrap items-center gap-2'>
      {canCreateVoucher && !closed && (
        <>
          <Button onClick={() => openVoucher('income')}>
            <Plus className='size-4' />
            {t('finance.tournaments.createIncome')}
          </Button>
          <Button variant='outline' onClick={() => openVoucher('expense')}>
            <Minus className='size-4' />
            {t('finance.tournaments.createExpense')}
          </Button>
        </>
      )}
      {canManage && !closed && (
        <>
          <Button
            variant='outline'
            nativeButton={false}
            render={<Link to={{ pathname: 'budget', search }} />}
          >
            <Wallet className='size-4' />
            {t('finance.tournaments.editBudget')}
          </Button>
          <Button
            variant='outline'
            nativeButton={false}
            render={<Link to={{ pathname: 'edit', search }} />}
          >
            <Pencil className='size-4' />
            {t('finance.tournaments.editInfo')}
          </Button>
          {tournament.status === 'planning' && (
            <Button
              variant='outline'
              onClick={() => setStatusTarget('ongoing')}
            >
              <Play className='size-4' />
              {t('finance.tournaments.start')}
            </Button>
          )}
          <Button variant='outline' onClick={() => setStatusTarget('closed')}>
            <Lock className='size-4' />
            {t('finance.tournaments.close')}
          </Button>
        </>
      )}
      {canManage && closed && (
        <Button variant='outline' onClick={() => setStatusTarget('ongoing')}>
          <RotateCcw className='size-4' />
          {t('finance.tournaments.reopen')}
        </Button>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title={tournament.name}
        description={
          <span className='flex flex-wrap items-center gap-x-3 gap-y-1'>
            <span className='font-mono'>{tournament.code}</span>
            <StatusBadge
              size='sm'
              tone={TOURNAMENT_STATUS_TONE[tournament.status]}
            >
              {t(`finance.tournaments.status.${tournament.status}`)}
            </StatusBadge>
            <span className='inline-flex items-center gap-1'>
              <CalendarDays className='size-3.5' />
              {formatDate(tournament.startDate)}
              {tournament.endDate && tournament.endDate !== tournament.startDate
                ? ` – ${formatDate(tournament.endDate)}`
                : ''}
            </span>
            {(tournament.branchName || tournament.venue) && (
              <span className='inline-flex items-center gap-1'>
                <MapPin className='size-3.5' />
                {[tournament.branchName, tournament.venue]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </span>
        }
      />
      {actions}

      {closed && (
        <Alert>
          <Lock className='size-4' />
          <AlertDescription>
            {t('finance.tournaments.closedNotice')}
          </AlertDescription>
        </Alert>
      )}

      <dl className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <Kpi label={t('finance.tournaments.income')}>
          <Amount value={totals.totalIncome} />
          <Hint>
            {t('finance.tournaments.budget')}: {formatVnd(totals.budgetIncome)}
          </Hint>
        </Kpi>
        <Kpi label={t('finance.tournaments.expense')}>
          <Amount value={totals.totalExpense} />
          <Hint>
            {t('finance.tournaments.budget')}: {formatVnd(totals.budgetExpense)}
          </Hint>
        </Kpi>
        <Kpi label={t('finance.tournaments.net')}>
          <Amount value={totals.net} signed />
          <Hint>
            {t('finance.tournaments.budget')}: {formatVnd(totals.budgetNet)}
          </Hint>
        </Kpi>
        <Kpi label={t('finance.tournaments.spent')}>
          {totals.expenseRatio === null ? (
            <span className='text-sm text-muted-foreground'>
              {t('finance.tournaments.noBudget')}
            </span>
          ) : (
            <span
              className={cn(
                'font-semibold tabular-nums',
                totals.expenseRatio > 100 && 'text-destructive',
              )}
            >
              {totals.expenseRatio}%
            </span>
          )}
        </Kpi>
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>{t('finance.tournaments.budgetVsActual')}</CardTitle>
        </CardHeader>
        <CardContent>
          {report.categories.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              {t('finance.tournaments.noLines')}
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('finance.tournaments.category')}</TableHead>
                    <TableHead className='text-right'>
                      {t('finance.tournaments.budget')}
                    </TableHead>
                    <TableHead className='text-right'>
                      {t('finance.tournaments.actual')}
                    </TableHead>
                    <TableHead className='text-right'>
                      {t('finance.tournaments.variance')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <BudgetSection
                  title={t('finance.tournaments.incomeLines')}
                  lines={income}
                />
                <BudgetSection
                  title={t('finance.tournaments.expenseLines')}
                  lines={expense}
                />
                <TableFooter>
                  <TableRow>
                    <TableCell className='font-medium'>
                      {t('finance.tournaments.net')}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {formatVnd(totals.budgetNet)}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Amount value={totals.net} signed />
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {formatVnd(totals.net - totals.budgetNet)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('finance.tournaments.vouchers')}</CardTitle>
          <CardDescription>
            {t('finance.tournaments.voucherCount', {
              count: totals.voucherCount,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.vouchers.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              {t('finance.tournaments.noVouchers')}
            </p>
          ) : (
            <ul className='divide-y'>
              {report.vouchers.map((item) => (
                <li
                  key={item.id}
                  className='flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3'
                >
                  <div className='min-w-0 space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge variant='outline' className='font-mono'>
                        {item.code}
                      </Badge>
                      <span className='text-xs text-muted-foreground'>
                        {formatDate(item.date)}
                      </span>
                    </div>
                    <p className='text-sm font-medium'>{item.categoryName}</p>
                    <p className='truncate text-xs text-muted-foreground'>
                      {[item.counterparty, item.description, item.accountName]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      item.type === 'income'
                        ? 'text-(--status-success)'
                        : 'text-destructive',
                    )}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {formatVnd(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {voucher && (
        <VoucherDialog
          key={voucher.key}
          request={voucher.request}
          options={options.data?.data}
          onClose={() => setVoucher(null)}
          onSaved={reload}
        />
      )}

      <AlertDialog
        open={statusTarget !== null}
        onOpenChange={(open) => {
          if (!open && !statusChange.submitting) setStatusTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget === 'closed'
                ? t('finance.tournaments.closeConfirmTitle')
                : closed
                  ? t('finance.tournaments.reopenConfirmTitle')
                  : t('finance.tournaments.start')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget === 'closed'
                ? t('finance.tournaments.closeConfirmDescription')
                : closed
                  ? t('finance.tournaments.reopenConfirmDescription')
                  : t('finance.tournaments.startConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('finance.tournaments.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={statusChange.submitting}
              onClick={() => {
                if (statusTarget) void changeStatus(statusTarget);
              }}
            >
              {statusTarget === 'closed'
                ? t('finance.tournaments.close')
                : closed
                  ? t('finance.tournaments.reopen')
                  : t('finance.tournaments.start')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Kpi({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className='space-y-1 rounded-xl border bg-card p-4 shadow-xs'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='space-y-0.5 text-base'>{children}</dd>
    </div>
  );
}

function Hint({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className='block text-xs text-muted-foreground'>{children}</span>
  );
}

function BudgetSection({
  title,
  lines,
}: {
  readonly title: string;
  readonly lines: readonly FinanceTournamentCategoryLine[];
}): ReactElement | null {
  const { t } = useTranslation();
  if (lines.length === 0) return null;
  return (
    <TableBody>
      <TableRow className='bg-muted/40 hover:bg-muted/40'>
        <TableCell
          colSpan={4}
          className='text-xs font-medium uppercase text-muted-foreground'
        >
          {title}
        </TableCell>
      </TableRow>
      {lines.map((line) => (
        <TableRow
          key={line.categoryId}
          data-over-budget={line.overBudget || undefined}
          className={cn(line.overBudget && 'bg-destructive/5')}
        >
          <TableCell>
            <span className='font-medium'>{line.categoryName}</span>
            {line.overBudget && (
              <Badge variant='destructive' className='ml-2' data-size='sm'>
                {t('finance.tournaments.overBudget')}
              </Badge>
            )}
          </TableCell>
          <TableCell className='text-right tabular-nums'>
            {formatVnd(line.budget)}
          </TableCell>
          <TableCell className='text-right tabular-nums'>
            {formatVnd(line.actual)}
          </TableCell>
          <TableCell
            className={cn(
              'text-right tabular-nums',
              line.overBudget && 'font-semibold text-destructive',
            )}
          >
            {line.variance > 0 ? '+' : ''}
            {formatVnd(line.variance)}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
