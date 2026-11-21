import { useApiClient, useSubmission, useToaster } from '@nocobase/app-client';
import { useAuthentication } from '@nocobase/app-plugin-authentication/client';
import { useTranslation } from '@nocobase/i18n/client';
import {
  Plus,
  Minus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Landmark,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { Loading } from '#components/loading';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Button } from '#components/ui/button';
import { Badge } from '#components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#components/ui/table';
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
import { Input } from '#components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select';

import { formatDate, formatVnd, getCurrentMonth } from './format.js';
import { VoucherDialog, type VoucherRequest } from './voucher-dialog.js';
import type {
  FinanceOptionsData,
  FinanceTransaction,
  FinanceTransactionPage,
} from './types.js';

export default function FinanceTransactionsPage(): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();

  // Filters
  const [month, setMonth] = useState<string>(getCurrentMonth);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // Data
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [options, setOptions] = useState<FinanceOptionsData | null>(null);

  // The voucher form, mounted per opening (see VoucherDialog).
  const [voucherRequest, setVoucherRequest] = useState<{
    key: number;
    request: VoucherRequest;
  } | null>(null);
  const openVoucher = (request: VoucherRequest) =>
    setVoucherRequest((current) => ({
      key: (current?.key ?? 0) + 1,
      request,
    }));

  // Delete State
  const [deletingTransaction, setDeletingTransaction] =
    useState<FinanceTransaction | null>(null);

  const { session } = useAuthentication();
  const deletion = useSubmission({
    scope: `${session?.user.id}:finance:voucher-delete`,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('pageSize', String(pageSize));
      if (month) queryParams.set('period', month);
      if (selectedBranchId !== 'all')
        queryParams.set('branchId', selectedBranchId);
      if (selectedAccountId !== 'all')
        queryParams.set('accountId', selectedAccountId);
      if (selectedType !== 'all') queryParams.set('type', selectedType);
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());

      const [txRes, optionsRes] = await Promise.all([
        api.request<{ data: FinanceTransactionPage }>({
          path: `finance/transactions?${queryParams.toString()}`,
        }),
        api.request<{ data: FinanceOptionsData }>({
          path: 'finance/options',
        }),
      ]);

      setTransactions(txRes.data.rows);
      setTotalCount(txRes.data.total);
      setOptions(optionsRes.data);
    } catch {
      toaster.show({
        type: 'error',
        title: 'Không thể tải danh sách chứng từ',
      });
    } finally {
      setLoading(false);
    }
  }, [
    api,
    month,
    selectedBranchId,
    selectedAccountId,
    selectedType,
    searchQuery,
    page,
    toaster,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Totals in current view
  const currentTotalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const currentTotalExpense = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const currentNet = currentTotalIncome - currentTotalExpense;

  const handleDelete = async () => {
    if (!deletingTransaction) return;
    try {
      const outcome = await deletion.run(
        { action: 'delete-voucher', id: deletingTransaction.id },
        async (key) => {
          return api.request({
            path: `finance/transactions/${encodeURIComponent(deletingTransaction.id)}`,
            method: 'DELETE',
            headers: {
              'Idempotency-Key': key,
            },
          });
        },
      );
      if (outcome) {
        toaster.show({
          type: 'success',
          title: t('finance.transactions.deleteSuccess'),
        });
        setDeletingTransaction(null);
        void loadData();
      }
    } catch {
      toaster.show({
        type: 'error',
        title: 'Lỗi khi xóa chứng từ',
      });
    }
  };

  return (
    <PageContainer className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <PageHeader
          title={t('finance.transactions.title')}
          description={t('finance.transactions.subtitle')}
        />
        <div className='flex items-center gap-2'>
          <Button
            variant='default'
            className='bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5'
            onClick={() => openVoucher({ kind: 'create', type: 'income' })}
          >
            <Plus className='size-4' />
            {t('finance.transactions.createIncome')}
          </Button>
          <Button
            variant='outline'
            className='border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50 gap-1.5'
            onClick={() => openVoucher({ kind: 'create', type: 'expense' })}
          >
            <Minus className='size-4' />
            {t('finance.transactions.createExpense')}
          </Button>
        </div>
      </div>

      {/* Summary KPI Bar for filtered view */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='flex items-center justify-between rounded-xl border bg-card p-3 shadow-2xs'>
          <div className='text-xs text-muted-foreground'>
            Tổng thu danh sách:
          </div>
          <div className='font-bold text-emerald-600 dark:text-emerald-400'>
            +{formatVnd(currentTotalIncome)}
          </div>
        </div>
        <div className='flex items-center justify-between rounded-xl border bg-card p-3 shadow-2xs'>
          <div className='text-xs text-muted-foreground'>
            Tổng chi danh sách:
          </div>
          <div className='font-bold text-rose-600 dark:text-rose-400'>
            -{formatVnd(currentTotalExpense)}
          </div>
        </div>
        <div className='flex items-center justify-between rounded-xl border bg-card p-3 shadow-2xs'>
          <div className='text-xs text-muted-foreground'>
            Dòng tiền chênh lệch:
          </div>
          <div
            className={`font-bold ${
              currentNet >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {formatVnd(currentNet)}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className='space-y-3 rounded-xl border bg-card p-4 shadow-xs'>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5'>
          {/* Search Query */}
          <div className='md:col-span-2'>
            <div className='relative'>
              <Search className='absolute left-2.5 top-2.5 size-4 text-muted-foreground' />
              <Input
                placeholder={t('finance.transactions.filterPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className='pl-9 h-9'
              />
            </div>
          </div>

          {/* Month */}
          <div>
            <Input
              type='month'
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
              className='h-9 text-sm'
            />
          </div>

          {/* Branch filter */}
          <div>
            <Select
              items={[
                { value: 'all', label: t('finance.transactions.allBranches') },
                ...(options?.branches ?? []).map((b) => ({
                  value: b.id,
                  label: b.name,
                })),
              ]}
              value={selectedBranchId}
              onValueChange={(val) => {
                if (typeof val === 'string') {
                  setSelectedBranchId(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className='h-9 w-full'>
                <SelectValue
                  placeholder={t('finance.transactions.allBranches')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>
                  {t('finance.transactions.allBranches')}
                </SelectItem>
                {options?.branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type filter */}
          <div>
            <Select
              items={[
                { value: 'all', label: t('finance.transactions.allTypes') },
                { value: 'income', label: t('finance.transactions.income') },
                { value: 'expense', label: t('finance.transactions.expense') },
              ]}
              value={selectedType}
              onValueChange={(val) => {
                if (typeof val === 'string') {
                  setSelectedType(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className='h-9 w-full'>
                <SelectValue placeholder={t('finance.transactions.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>
                  {t('finance.transactions.allTypes')}
                </SelectItem>
                <SelectItem value='income'>
                  {t('finance.transactions.income')}
                </SelectItem>
                <SelectItem value='expense'>
                  {t('finance.transactions.expense')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second row of filters */}
        <div className='flex flex-wrap items-center justify-between gap-3 border-t pt-3'>
          <div className='flex items-center gap-2'>
            <Landmark className='size-4 text-muted-foreground' />
            <span className='text-xs text-muted-foreground'>Quỹ/TK:</span>
            <Select
              items={[
                { value: 'all', label: t('finance.transactions.allAccounts') },
                ...(options?.accounts ?? []).map((a) => ({
                  value: a.id,
                  label: a.name,
                })),
              ]}
              value={selectedAccountId}
              onValueChange={(val) => {
                if (typeof val === 'string') {
                  setSelectedAccountId(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className='h-8 w-48 text-xs'>
                <SelectValue
                  placeholder={t('finance.transactions.allAccounts')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>
                  {t('finance.transactions.allAccounts')}
                </SelectItem>
                {options?.accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setMonth('');
                setSelectedBranchId('all');
                setSelectedAccountId('all');
                setSelectedType('all');
                setSearchQuery('');
                setPage(1);
              }}
              className='text-xs'
            >
              Xóa bộ lọc
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => void loadData()}
              disabled={loading}
              className='gap-1.5 text-xs'
            >
              <RefreshCw
                className={`size-3 ${loading ? 'animate-spin' : ''}`}
              />
              Tải lại
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className='rounded-xl border bg-card shadow-xs overflow-hidden'>
        {loading && transactions.length === 0 ? (
          <div className='p-8'>
            <Loading />
          </div>
        ) : transactions.length === 0 ? (
          <div className='py-12 text-center text-muted-foreground'>
            <p className='text-base font-medium'>
              {t('finance.transactions.empty')}
            </p>
            <p className='text-xs mt-1'>
              Thử thay đổi bộ lọc hoặc tạo phiếu thu chi mới
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead className='w-28'>
                    {t('finance.transactions.code')}
                  </TableHead>
                  <TableHead className='w-24'>
                    {t('finance.transactions.date')}
                  </TableHead>
                  <TableHead className='w-20'>
                    {t('finance.transactions.type')}
                  </TableHead>
                  <TableHead className='w-36'>
                    {t('finance.transactions.category')}
                  </TableHead>
                  <TableHead className='text-right'>
                    {t('finance.transactions.amount')}
                  </TableHead>
                  <TableHead>{t('finance.transactions.account')}</TableHead>
                  <TableHead>{t('finance.transactions.branch')}</TableHead>
                  <TableHead>
                    {t('finance.transactions.counterparty')}
                  </TableHead>
                  <TableHead>{t('finance.transactions.description')}</TableHead>
                  <TableHead className='text-right w-20'>
                    {t('finance.transactions.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className='hover:bg-muted/30'>
                    {/* Code */}
                    <TableCell className='font-mono text-xs font-semibold'>
                      <Badge
                        variant='outline'
                        className={
                          tx.type === 'income'
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/40'
                            : 'border-rose-300 text-rose-700 bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:bg-rose-950/40'
                        }
                      >
                        {tx.code}
                      </Badge>
                    </TableCell>

                    {/* Date */}
                    <TableCell className='text-xs whitespace-nowrap text-muted-foreground'>
                      {formatDate(tx.date)}
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <span
                        className={`text-xs font-medium ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? 'Thu' : 'Chi'}
                      </span>
                    </TableCell>

                    {/* Category */}
                    <TableCell className='text-xs font-medium'>
                      {tx.categoryName ?? tx.categoryId}
                      {tx.tournamentCode && (
                        <Badge
                          variant='outline'
                          className='ml-1 text-[11px] font-normal'
                          title={tx.tournamentName}
                        >
                          {tx.tournamentCode}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Amount */}
                    <TableCell className='text-right font-semibold whitespace-nowrap'>
                      <span
                        className={
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatVnd(tx.amount)}
                      </span>
                    </TableCell>

                    {/* Account */}
                    <TableCell className='text-xs'>
                      {tx.accountName ?? tx.accountId}
                    </TableCell>

                    {/* Branch */}
                    <TableCell className='text-xs'>
                      <Badge
                        variant='secondary'
                        className='text-[11px] font-normal'
                      >
                        {tx.branchName ?? tx.branchId}
                      </Badge>
                    </TableCell>

                    {/* Counterparty */}
                    <TableCell
                      className='text-xs max-w-36 truncate'
                      title={tx.counterparty ?? ''}
                    >
                      {tx.counterparty || '-'}
                    </TableCell>

                    {/* Description */}
                    <TableCell
                      className='text-xs max-w-48 truncate text-muted-foreground'
                      title={tx.description ?? ''}
                    >
                      {tx.description || '-'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          onClick={() =>
                            openVoucher({ kind: 'edit', voucher: tx })
                          }
                          title='Chỉnh sửa'
                        >
                          <Edit2 className='size-3.5 text-muted-foreground hover:text-foreground' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          onClick={() => setDeletingTransaction(tx)}
                          title='Xóa'
                        >
                          <Trash2 className='size-3.5 text-rose-500 hover:text-rose-700' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className='flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground'>
          <div>
            Hiển thị {transactions.length} / tổng {totalCount} chứng từ
          </div>
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='sm'
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className='h-7 text-xs'
            >
              Trang trước
            </Button>
            <span className='px-2'>
              Trang {page} / {Math.max(1, Math.ceil(totalCount / pageSize))}
            </span>
            <Button
              variant='outline'
              size='sm'
              disabled={page >= Math.ceil(totalCount / pageSize)}
              onClick={() => setPage((p) => p + 1)}
              className='h-7 text-xs'
            >
              Trang sau
            </Button>
          </div>
        </div>
      </div>

      {voucherRequest && (
        <VoucherDialog
          key={voucherRequest.key}
          request={voucherRequest.request}
          options={options ?? undefined}
          onClose={() => setVoucherRequest(null)}
          onSaved={() => void loadData()}
        />
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deletingTransaction)}
        onOpenChange={(open) => {
          if (!open) setDeletingTransaction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa chứng từ</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa chứng từ{' '}
              <strong className='text-foreground'>
                {deletingTransaction?.code}
              </strong>{' '}
              - số tiền{' '}
              <strong className='text-foreground'>
                {formatVnd(deletingTransaction?.amount)}
              </strong>
              ? Thao tác này sẽ cập nhật lại số dư các quỹ liên quan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className='bg-rose-600 hover:bg-rose-700 text-white'
            >
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
