import { useApiClient, useSubmission, useToaster } from '@nocobase/app-client';
import { useAuthentication } from '@nocobase/app-plugin-authentication/client';
import { useTranslation } from '@nocobase/i18n/client';
import { useId, useState, type ReactElement } from 'react';

import { FeedbackForm } from '#components/feedback-form';
import { PendingButton } from '#components/pending-button';
import { Button } from '#components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#components/ui/dialog';
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

import { formatVnd, getTodayDate } from './format.js';
import type {
  FinanceOptionsData,
  FinanceTransaction,
  TransactionType,
} from './types.js';

/** What the dialog opens for: a new voucher (with optional prefilled tournament and branch) or an existing one. */
export type VoucherRequest =
  | {
      readonly kind: 'create';
      readonly type: TransactionType;
      readonly tournamentId?: string | null;
      readonly branchId?: string | null;
      /** The tournament page fixes the tournament and the voucher type. */
      readonly fixed?: boolean;
    }
  | { readonly kind: 'edit'; readonly voucher: FinanceTransaction };

export interface VoucherDialogProps {
  readonly request: VoucherRequest;
  readonly options: FinanceOptionsData | undefined;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

const NONE = 'none';

/**
 * The receipt/payment form of the cash book, shared by the cash book and the tournament page. Mount it with a `key`
 * per opening: its fields start from `request`. One submission controller covers every way to save (the button and
 * Enter), so a double click sends one operation key and the server answers the second from its receipt.
 */
export function VoucherDialog({
  request,
  options,
  onClose,
  onSaved,
}: VoucherDialogProps): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();
  const { session } = useAuthentication();
  const formId = useId();
  const editing = request.kind === 'edit' ? request.voucher : null;
  const submission = useSubmission({
    scope: `${session?.user.id}:finance:voucher:${editing?.id ?? 'new'}`,
  });

  const firstOf = <T extends { id: string }>(items: readonly T[] | undefined) =>
    items?.[0]?.id ?? '';
  const initial = () => {
    if (editing)
      return {
        type: editing.type,
        date: editing.date,
        amount: String(editing.amount),
        categoryId: editing.categoryId,
        accountId: editing.accountId,
        branchId: editing.branchId ?? '',
        tournamentId: editing.tournamentId ?? NONE,
        counterparty: editing.counterparty ?? '',
        description: editing.description ?? '',
      };
    const create = request as Extract<VoucherRequest, { kind: 'create' }>;
    return {
      type: create.type,
      date: getTodayDate(),
      amount: '',
      categoryId: firstOf(
        options?.categories.filter((c) => c.type === create.type),
      ),
      accountId: firstOf(options?.accounts),
      branchId: create.branchId || firstOf(options?.branches),
      tournamentId: create.tournamentId || NONE,
      counterparty: '',
      description: '',
    };
  };
  const [saved] = useState(initial);
  const [values, setValues] = useState(saved);
  const [error, setError] = useState<unknown>();
  const set = <K extends keyof typeof values>(
    field: K,
    value: (typeof values)[K],
  ) => setValues((current) => ({ ...current, [field]: value }));

  const fixed = request.kind === 'create' && request.fixed === true;
  const tournaments = options?.tournaments ?? [];
  // A voucher already linked to a tournament no longer offered (settled) still shows what it is linked to.
  const linkedElsewhere =
    editing?.tournamentId &&
    !tournaments.some((item) => item.id === editing.tournamentId)
      ? {
          id: editing.tournamentId,
          code: editing.tournamentCode,
          name: editing.tournamentName,
        }
      : null;

  const submit = async () => {
    const amount = Number(values.amount.replace(/[,.\s]/g, ''));
    const missing =
      !amount || amount <= 0
        ? 'amountRequired'
        : !values.categoryId
          ? 'categoryRequired'
          : !values.accountId
            ? 'accountRequired'
            : !values.branchId
              ? 'branchRequired'
              : undefined;
    if (missing) {
      toaster.show({
        type: 'error',
        title: t(`finance.voucherForm.${missing}`),
      });
      return;
    }
    const payload = {
      ...(editing ? {} : { type: values.type }),
      date: values.date,
      amount,
      categoryId: values.categoryId,
      accountId: values.accountId,
      branchId: values.branchId,
      counterparty: values.counterparty.trim() || null,
      description: values.description.trim() || null,
      tournamentId: values.tournamentId === NONE ? null : values.tournamentId,
    };
    setError(undefined);
    try {
      const outcome = await submission.run(
        { id: editing?.id ?? null, payload },
        (key, signal, input) =>
          api.request({
            path: input.id
              ? `finance/transactions/${encodeURIComponent(input.id)}`
              : 'finance/transactions',
            method: input.id ? 'PATCH' : 'POST',
            json: input.payload,
            headers: { 'Idempotency-Key': key },
            signal,
          }),
      );
      if (!outcome) return;
      toaster.show({
        type: 'success',
        title: t('finance.transactions.saveSuccess'),
      });
      onSaved();
      onClose();
    } catch (next) {
      setError(next);
      toaster.show({
        type: 'error',
        title: t('finance.voucherForm.saveFailed'),
      });
    }
  };

  const categories =
    options?.categories.filter((c) => c.type === values.type) ?? [];
  // Select shows the label of the chosen value only when it is given the items (Base UI).
  const toItems = (rows: ReadonlyArray<{ id: string; name: string }>) =>
    rows.map((row) => ({ value: row.id, label: row.name }));
  const tournamentItems = [
    { value: NONE, label: t('finance.voucherForm.noTournament') },
    ...(linkedElsewhere
      ? [
          {
            value: linkedElsewhere.id,
            label: [linkedElsewhere.code, linkedElsewhere.name]
              .filter(Boolean)
              .join(' · '),
          },
        ]
      : []),
    ...tournaments.map((item) => ({
      value: item.id,
      label: `${item.code} · ${item.name}`,
    })),
  ];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submission.submitting) onClose();
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t('finance.transactions.editVoucher')
              : values.type === 'income'
                ? t('finance.transactions.createIncome')
                : t('finance.transactions.createExpense')}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? t('finance.voucherForm.editDescription')
              : t('finance.voucherForm.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <FeedbackForm
          id={formId}
          className='grid gap-4 py-2'
          error={error}
          submitting={submission.submitting}
          values={() => values}
          savedValues={saved}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {!editing && !fixed && (
            <div className='grid grid-cols-2 gap-2'>
              {(['income', 'expense'] as const).map((type) => (
                <Button
                  key={type}
                  type='button'
                  variant={values.type === type ? 'default' : 'outline'}
                  aria-pressed={values.type === type}
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      type,
                      categoryId: firstOf(
                        options?.categories.filter((c) => c.type === type),
                      ),
                    }))
                  }
                >
                  {t(
                    type === 'income'
                      ? 'finance.voucherForm.incomeType'
                      : 'finance.voucherForm.expenseType',
                  )}
                </Button>
              ))}
            </div>
          )}

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='grid gap-1.5'>
              <Label htmlFor={`${formId}-date`}>
                {t('finance.transactions.date')} *
              </Label>
              <Input
                id={`${formId}-date`}
                name='date'
                type='date'
                required
                value={values.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label htmlFor={`${formId}-amount`}>
                {t('finance.transactions.amount')} *
              </Label>
              <Input
                id={`${formId}-amount`}
                name='amount'
                type='number'
                inputMode='numeric'
                min={1}
                placeholder='0'
                value={values.amount}
                onChange={(e) => set('amount', e.target.value)}
                className='font-semibold'
              />
              {Number(values.amount) > 0 && (
                <div className='text-xs font-medium text-primary'>
                  = {formatVnd(Number(values.amount))}
                </div>
              )}
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='grid gap-1.5'>
              <Label>{t('finance.transactions.category')} *</Label>
              <Select
                items={toItems(categories)}
                value={values.categoryId}
                onValueChange={(val) => {
                  if (typeof val === 'string') set('categoryId', val);
                }}
              >
                <SelectTrigger
                  className='w-full'
                  aria-label={t('finance.transactions.category')}
                >
                  <SelectValue
                    placeholder={t('finance.voucherForm.categoryPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-1.5'>
              <Label>{t('finance.transactions.account')} *</Label>
              <Select
                items={toItems(options?.accounts ?? [])}
                value={values.accountId}
                onValueChange={(val) => {
                  if (typeof val === 'string') set('accountId', val);
                }}
              >
                <SelectTrigger
                  className='w-full'
                  aria-label={t('finance.transactions.account')}
                >
                  <SelectValue
                    placeholder={t('finance.voucherForm.accountPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {options?.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='grid gap-1.5'>
              <Label>{t('finance.transactions.branch')} *</Label>
              <Select
                items={toItems(options?.branches ?? [])}
                value={values.branchId}
                onValueChange={(val) => {
                  if (typeof val === 'string') set('branchId', val);
                }}
              >
                <SelectTrigger
                  className='w-full'
                  aria-label={t('finance.transactions.branch')}
                >
                  <SelectValue
                    placeholder={t('finance.voucherForm.branchPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {options?.branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-1.5'>
              <Label htmlFor={`${formId}-counterparty`}>
                {t('finance.transactions.counterparty')}
              </Label>
              <Input
                id={`${formId}-counterparty`}
                name='counterparty'
                maxLength={200}
                placeholder={t('finance.voucherForm.counterpartyPlaceholder')}
                value={values.counterparty}
                onChange={(e) => set('counterparty', e.target.value)}
              />
            </div>
          </div>

          <div className='grid gap-1.5'>
            <Label>{t('finance.voucherForm.tournament')}</Label>
            <Select
              items={tournamentItems}
              value={values.tournamentId}
              disabled={fixed}
              onValueChange={(val) => {
                if (typeof val === 'string') set('tournamentId', val);
              }}
            >
              <SelectTrigger
                className='w-full'
                aria-label={t('finance.voucherForm.tournament')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  {t('finance.voucherForm.noTournament')}
                </SelectItem>
                {linkedElsewhere && (
                  <SelectItem value={linkedElsewhere.id} disabled>
                    {[linkedElsewhere.code, linkedElsewhere.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </SelectItem>
                )}
                {tournaments.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground'>
              {t('finance.voucherForm.tournamentHint')}
            </p>
          </div>

          <div className='grid gap-1.5'>
            <Label htmlFor={`${formId}-description`}>
              {t('finance.transactions.description')}
            </Label>
            <Textarea
              id={`${formId}-description`}
              name='description'
              maxLength={1000}
              placeholder={t('finance.voucherForm.descriptionPlaceholder')}
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
            />
          </div>
        </FeedbackForm>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onClose}>
            {t('finance.transactions.cancel')}
          </Button>
          <PendingButton
            type='submit'
            form={formId}
            busy={submission.submitting}
            pendingLabel={t('finance.transactions.saving')}
          >
            {t('finance.transactions.save')}
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
