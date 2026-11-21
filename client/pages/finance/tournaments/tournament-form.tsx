import {
  ApiClientError,
  useApiClient,
  useSubmission,
  useToaster,
} from '@nocobase/app-client';
import { useAuthentication } from '@nocobase/app-plugin-authentication/client';
import { useTranslation } from '@nocobase/i18n/client';
import { useId, useState, type ReactElement } from 'react';
import { useNavigate, useOutletContext, useResolvedPath } from 'react-router';

import { FeedbackForm } from '#components/feedback-form';
import { Loading } from '#components/loading';
import { PendingButton } from '#components/pending-button';
import { RouteDialog } from '#components/route-dialog';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { Label } from '#components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select';
import { Textarea } from '#components/ui/textarea';
import { useRouteOverlay } from '#components/use-route-overlay';
import { useListData } from '#hooks/use-list-data';

import { getTodayDate } from '../format.js';
import type { FinanceOptionsData, FinanceTournament } from '../types.js';
import type {
  TournamentDetailContext,
  TournamentListContext,
} from './types.js';

const NONE = 'none';

interface Values {
  name: string;
  startDate: string;
  endDate: string;
  branchId: string;
  venue: string;
  note: string;
}

const blank = (): Values => ({
  name: '',
  startDate: getTodayDate(),
  endDate: '',
  branchId: NONE,
  venue: '',
  note: '',
});

const fromTournament = (tournament: FinanceTournament): Values => ({
  name: tournament.name,
  startDate: tournament.startDate,
  endDate: tournament.endDate ?? '',
  branchId: tournament.branchId ?? NONE,
  venue: tournament.venue ?? '',
  note: tournament.note ?? '',
});

/**
 * Create (`/finance/tournaments/new`, under the list) and edit (`/finance/tournaments/:id/edit`, under the detail) a
 * tournament's details. The status is changed from the detail page's actions, not here.
 */
export default function TournamentFormPage(): ReactElement {
  const { t } = useTranslation();
  const context = useOutletContext<
    Partial<TournamentDetailContext> & TournamentListContext
  >();
  const editing = 'report' in context;
  const report = context.report;
  // The form's fields start from the stored tournament, so it mounts again once the detail has loaded it.
  return (
    <TournamentForm
      key={report?.tournament.id ?? (editing ? 'loading' : 'new')}
      title={t(
        editing ? 'finance.tournaments.edit' : 'finance.tournaments.create',
      )}
      loading={editing && !report}
      tournament={report?.tournament}
      onSaved={context.reload}
    />
  );
}

function TournamentForm({
  title,
  loading,
  tournament,
  onSaved,
}: {
  readonly title: string;
  readonly loading: boolean;
  readonly tournament: FinanceTournament | undefined;
  readonly onSaved: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();
  const navigate = useNavigate();
  const overlay = useRouteOverlay();
  const { session } = useAuthentication();
  const formId = useId();
  const listPath = useResolvedPath('..').pathname;
  const submission = useSubmission({
    scope: `${session?.user.id}:finance:tournament:${tournament?.id ?? 'new'}`,
  });
  const options = useListData<{ data: FinanceOptionsData }>('finance/options');
  const [saved] = useState(() =>
    tournament ? fromTournament(tournament) : blank(),
  );
  const [values, setValues] = useState(saved);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<unknown>();
  const set = (field: keyof Values, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const fieldError = (field: keyof Values): string | undefined => {
    if (!submitted) return;
    if (field === 'name' && !values.name.trim())
      return t('finance.tournaments.nameRequired');
    if (field === 'startDate' && !values.startDate)
      return t('finance.tournaments.startDateRequired');
    if (
      field === 'endDate' &&
      values.endDate &&
      values.startDate &&
      values.endDate < values.startDate
    )
      return t('finance.tournaments.endBeforeStart');
    return;
  };

  const submit = async () => {
    if (loading) return;
    setSubmitted(true);
    if (
      !values.name.trim() ||
      !values.startDate ||
      (values.endDate && values.endDate < values.startDate)
    )
      return;
    const payload = {
      name: values.name.trim(),
      startDate: values.startDate,
      endDate: values.endDate || null,
      branchId: values.branchId === NONE ? null : values.branchId,
      venue: values.venue.trim() || null,
      note: values.note.trim() || null,
    };
    setError(undefined);
    try {
      const outcome = await submission.run(
        { id: tournament?.id ?? null, payload },
        (key, signal, input) =>
          api.request<{ data: FinanceTournament }>({
            path: input.id
              ? `finance/tournaments/${encodeURIComponent(input.id)}`
              : 'finance/tournaments',
            method: input.id ? 'PATCH' : 'POST',
            json: input.payload,
            headers: { 'Idempotency-Key': key },
            signal,
          }),
      );
      if (!outcome) return;
      onSaved();
      toaster.show({
        type: 'success',
        title: tournament
          ? t('finance.tournaments.saved')
          : t('finance.tournaments.created', { code: outcome.data.code }),
      });
      // A new tournament opens its own page, where its budget is planned; an edit returns to the detail.
      if (tournament) await overlay.close();
      else
        void navigate(
          { pathname: `${listPath}/${outcome.data.id}` },
          { replace: true },
        );
    } catch (next) {
      setError(next);
      if (!(next instanceof ApiClientError))
        toaster.show({
          type: 'error',
          title: t('finance.tournaments.actionFailed'),
        });
    }
  };

  const branches = options.data?.data.branches ?? [];
  const field = (name: keyof Values) => ({
    id: `${formId}-${name}`,
    name,
    'aria-invalid': Boolean(fieldError(name)) || undefined,
    'aria-describedby': fieldError(name)
      ? `${formId}-${name}-error`
      : undefined,
  });
  const message = (name: keyof Values) =>
    fieldError(name) ? (
      <p id={`${formId}-${name}-error`} className='text-xs text-destructive'>
        {fieldError(name)}
      </p>
    ) : null;

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
        disabled={loading}
        pendingLabel={t('finance.tournaments.saving')}
      >
        {t('finance.tournaments.save')}
      </PendingButton>
    </>
  );

  if (loading)
    return (
      <RouteDialog title={title} footer={footer} className='sm:max-w-2xl'>
        <Loading />
      </RouteDialog>
    );

  return (
    <RouteDialog title={title} footer={footer} className='sm:max-w-2xl'>
      <FeedbackForm
        id={formId}
        className='grid gap-4'
        noValidate
        error={error}
        submitting={submission.submitting}
        values={() => values}
        savedValues={saved}
        onSubmit={(event) => {
          event.preventDefault();
          return submit();
        }}
      >
        <div className='grid gap-1.5'>
          <Label htmlFor={`${formId}-name`}>
            {t('finance.tournaments.name')} *
          </Label>
          <Input
            {...field('name')}
            maxLength={200}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
          />
          {message('name')}
        </div>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <div className='grid gap-1.5'>
            <Label htmlFor={`${formId}-startDate`}>
              {t('finance.tournaments.startDate')} *
            </Label>
            <Input
              {...field('startDate')}
              type='date'
              value={values.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
            {message('startDate')}
          </div>
          <div className='grid gap-1.5'>
            <Label htmlFor={`${formId}-endDate`}>
              {t('finance.tournaments.endDate')}
            </Label>
            <Input
              {...field('endDate')}
              type='date'
              min={values.startDate || undefined}
              value={values.endDate}
              onChange={(e) => set('endDate', e.target.value)}
            />
            {message('endDate')}
          </div>
        </div>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          <div className='grid gap-1.5'>
            <Label>{t('finance.tournaments.branch')}</Label>
            <Select
              items={[
                { value: NONE, label: t('finance.tournaments.noBranch') },
                ...branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                })),
              ]}
              value={values.branchId}
              onValueChange={(value) => {
                if (typeof value === 'string') set('branchId', value);
              }}
            >
              <SelectTrigger
                className='w-full'
                aria-label={t('finance.tournaments.branch')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  {t('finance.tournaments.noBranch')}
                </SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-1.5'>
            <Label htmlFor={`${formId}-venue`}>
              {t('finance.tournaments.venue')}
            </Label>
            <Input
              {...field('venue')}
              maxLength={200}
              value={values.venue}
              onChange={(e) => set('venue', e.target.value)}
            />
          </div>
        </div>
        <div className='grid gap-1.5'>
          <Label htmlFor={`${formId}-note`}>
            {t('finance.tournaments.note')}
          </Label>
          <Textarea
            {...field('note')}
            maxLength={1000}
            rows={2}
            value={values.note}
            onChange={(e) => set('note', e.target.value)}
          />
        </div>
      </FeedbackForm>
    </RouteDialog>
  );
}
