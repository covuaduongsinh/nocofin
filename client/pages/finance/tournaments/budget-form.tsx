import {
  ApiClientError,
  useApiClient,
  useSubmission,
  useToaster,
} from '@nocobase/app-client';
import { useAuthentication } from '@nocobase/app-plugin-authentication/client';
import { useTranslation } from '@nocobase/i18n/client';
import { useId, useState, type ReactElement } from 'react';
import { useOutletContext } from 'react-router';

import { FeedbackForm } from '#components/feedback-form';
import { Loading } from '#components/loading';
import { PendingButton } from '#components/pending-button';
import { RouteDialog } from '#components/route-dialog';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { Label } from '#components/ui/label';
import { useRouteOverlay } from '#components/use-route-overlay';
import { useListData } from '#hooks/use-list-data';

import { formatVnd } from '../format.js';
import type {
  FinanceOptionsData,
  FinanceTournamentReport,
  TransactionType,
} from '../types.js';
import type { TournamentDetailContext } from './types.js';

interface Line {
  categoryId: string;
  name: string;
  type: TransactionType;
}

/** `/finance/tournaments/:id/budget`: the planned amount of every active category, saved as one whole budget. */
export default function TournamentBudgetPage(): ReactElement {
  const { t } = useTranslation();
  const { report, reload } = useOutletContext<TournamentDetailContext>();
  const options = useListData<{ data: FinanceOptionsData }>('finance/options');
  const ready = Boolean(report && (options.data || options.error));
  return (
    <BudgetForm
      key={ready ? 'ready' : 'loading'}
      title={t('finance.tournaments.budgetForm.title')}
      report={ready ? report : undefined}
      categories={options.data?.data.categories}
      onSaved={reload}
    />
  );
}

function BudgetForm({
  title,
  report,
  categories,
  onSaved,
}: {
  readonly title: string;
  readonly report: FinanceTournamentReport | undefined;
  readonly categories: FinanceOptionsData['categories'] | undefined;
  readonly onSaved: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();
  const overlay = useRouteOverlay();
  const { session } = useAuthentication();
  const formId = useId();
  const id = report?.tournament.id;
  const submission = useSubmission({
    scope: `${session?.user.id}:finance:tournament-budget:${id ?? 'loading'}`,
  });

  // Every active category, plus any the budget or the vouchers already use (a category retired since).
  const lines: Line[] = [
    ...(categories ?? []).map((c) => ({
      categoryId: c.id,
      name: c.name,
      type: c.type,
    })),
    ...(report?.categories ?? [])
      .filter((c) => !categories?.some((item) => item.id === c.categoryId))
      .map((c) => ({
        categoryId: c.categoryId,
        name: c.categoryName,
        type: c.type,
      })),
  ];
  const [saved] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (report?.categories ?? [])
        .filter((c) => c.budget > 0)
        .map((c) => [c.categoryId, String(c.budget)]),
    ),
  );
  const [values, setValues] = useState(saved);
  const [error, setError] = useState<unknown>();
  const closed = report?.tournament.status === 'closed';

  const submit = async () => {
    if (!id || closed) return;
    const budgets = lines
      .map((line) => ({
        categoryId: line.categoryId,
        amount: Math.round(Number(values[line.categoryId] || 0)),
      }))
      .filter((line) => Number.isFinite(line.amount) && line.amount > 0);
    setError(undefined);
    try {
      const outcome = await submission.run(
        { id, budgets },
        (key, signal, input) =>
          api.request({
            path: `finance/tournaments/${encodeURIComponent(input.id)}/budgets`,
            method: 'PUT',
            json: { budgets: input.budgets },
            headers: { 'Idempotency-Key': key },
            signal,
          }),
      );
      if (!outcome) return;
      onSaved();
      toaster.show({
        type: 'success',
        title: t('finance.tournaments.budgetForm.saved'),
      });
      await overlay.close();
    } catch (next) {
      setError(next);
      if (!(next instanceof ApiClientError))
        toaster.show({
          type: 'error',
          title: t('finance.tournaments.actionFailed'),
        });
    }
  };

  const total = (type: TransactionType) =>
    lines
      .filter((line) => line.type === type)
      .reduce((sum, line) => sum + Number(values[line.categoryId] || 0), 0);

  const footer = (
    <>
      <Button
        type='button'
        variant='outline'
        onClick={() => void overlay.close()}
      >
        {t('finance.tournaments.cancel')}
      </Button>
      <PendingButton
        type='submit'
        form={formId}
        busy={submission.submitting}
        disabled={!report || closed}
        pendingLabel={t('finance.tournaments.saving')}
      >
        {t('finance.tournaments.save')}
      </PendingButton>
    </>
  );

  return (
    <RouteDialog
      title={title}
      description={t('finance.tournaments.budgetForm.description')}
      footer={footer}
      className='sm:max-w-2xl'
    >
      {!report ? (
        <Loading />
      ) : (
        <FeedbackForm
          id={formId}
          className='grid gap-6'
          error={error}
          submitting={submission.submitting}
          values={() => values}
          savedValues={saved}
          onSubmit={(event) => {
            event.preventDefault();
            return submit();
          }}
        >
          {closed && (
            <p className='text-sm text-muted-foreground'>
              {t('finance.tournaments.closedNotice')}
            </p>
          )}
          {(['income', 'expense'] as const).map((type) => (
            <fieldset key={type} className='grid gap-3' disabled={closed}>
              <legend className='mb-2 flex w-full items-center justify-between text-sm font-medium'>
                <span>
                  {t(
                    type === 'income'
                      ? 'finance.tournaments.incomeLines'
                      : 'finance.tournaments.expenseLines',
                  )}
                </span>
                <span className='tabular-nums text-muted-foreground'>
                  {formatVnd(total(type))}
                </span>
              </legend>
              {lines
                .filter((line) => line.type === type)
                .map((line) => (
                  <div
                    key={line.categoryId}
                    className='grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[1fr_12rem] sm:gap-3'
                  >
                    <Label htmlFor={`${formId}-${line.categoryId}`}>
                      {line.name}
                    </Label>
                    <Input
                      id={`${formId}-${line.categoryId}`}
                      name={`budget-${line.categoryId}`}
                      type='number'
                      inputMode='numeric'
                      min={0}
                      step={1000}
                      placeholder='0'
                      className='text-right tabular-nums'
                      value={values[line.categoryId] ?? ''}
                      onChange={(e) =>
                        setValues((current) => ({
                          ...current,
                          [line.categoryId]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
            </fieldset>
          ))}
        </FeedbackForm>
      )}
    </RouteDialog>
  );
}
