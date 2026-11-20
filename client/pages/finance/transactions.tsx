import { useApiClient, useSubmission, useToaster } from '@nocobase/app-client';
import { useTranslation } from '@nocobase/i18n/client';
import {
  Plus,
  Minus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  Landmark,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { Loading } from '#components/loading';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Button } from '#components/ui/button';
import { Card, CardContent } from '#components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#components/ui/dialog';
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
import { Textarea } from '#components/ui/textarea';

import { formatDate, formatVnd, getCurrentMonth, getTodayDate } from './format.js';
import type {
  FinanceOptionsData,
  FinanceTransaction,
  TransactionType,
} from './types.js';

export default function FinanceTransactionsPage(): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();

  // Filters
  const [month, setMonth] = useState<string>(getCurrentMonth());
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

  // Dialog State (Create or Edit)
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [voucherType, setVoucherType] = useState<TransactionType>('income');
  const [formDate, setFormDate] = useState<string>(getTodayDate());
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formAccountId, setFormAccountId] = useState<string>('');
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [formCounterparty, setFormCounterparty] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formReferenceNo, setFormReferenceNo] = useState<string>('');

  // Delete State
  const [deletingTransaction, setDeletingTransaction] = useState<FinanceTransaction | null>(null);

  const submission = useSubmission({ scope: 'finance-voucher-mutation' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('pageSize', String(pageSize));
      if (month) queryParams.set('month', month);
      if (selectedBranchId !== 'all') queryParams.set('branchId', selectedBranchId);
      if (selectedAccountId !== 'all') queryParams.set('accountId', selectedAccountId);
      if (selectedType !== 'all') queryParams.set('type', selectedType);
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());

      const [txRes, optionsRes] = await Promise.all([
        api.request<{
          data:
            | {
                rows: FinanceTransaction[];
                total: number;
                page: number;
                pageSize: number;
              }
            | FinanceTransaction[];
          total?: number;
        }>({
          path: `finance/transactions?${queryParams.toString()}`,
        }),
        api.request<{ data: FinanceOptionsData }>({
          path: 'finance/options',
        }),
      ]);

      const rawTx = txRes.data;
      if (Array.isArray(rawTx)) {
        setTransactions(rawTx);
        setTotalCount(txRes.total ?? rawTx.length);
      } else if (rawTx && Array.isArray((rawTx as any).rows)) {
        setTransactions((rawTx as any).rows);
        setTotalCount((rawTx as any).total ?? (rawTx as any).rows.length);
      } else {
        setTransactions([]);
        setTotalCount(0);
      }
      setOptions(optionsRes.data);
    } catch (err: unknown) {
      toaster.show({
        type: 'error',
        title: 'Không thể tải danh sách chứng từ',
      });
    } finally {
      setLoading(false);
    }
  }, [api, month, selectedBranchId, selectedAccountId, selectedType, searchQuery, page, toaster]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Totals in current view
  const safeList = Array.isArray(transactions) ? transactions : [];
  const currentTotalIncome = safeList
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const currentTotalExpense = safeList
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const currentNet = currentTotalIncome - currentTotalExpense;

  const openCreateDialog = (type: TransactionType) => {
    setEditingId(null);
    setVoucherType(type);
    setFormDate(getTodayDate());
    setFormAmount('');
    setFormCounterparty('');
    setFormDescription('');
    setFormReferenceNo('');

    if (options) {
      const matchingCats = options.categories.filter((c) => c.type === type && c.isActive);
      if (matchingCats.length > 0) setFormCategoryId(matchingCats[0]!.id);
      if (options.accounts.length > 0) setFormAccountId(options.accounts[0]!.id);
      if (options.branches.length > 0) setFormBranchId(options.branches[0]!.id);
    }

    setDialogOpen(true);
  };

  const openEditDialog = (tx: FinanceTransaction) => {
    setEditingId(tx.id);
    setVoucherType(tx.type);
    setFormDate((tx.transactionDate || (tx as any).date || '').slice(0, 10));
    setFormAmount(String(tx.amount));
    setFormCategoryId(tx.categoryId);
    setFormAccountId(tx.accountId);
    setFormBranchId(tx.branchId);
    setFormCounterparty(tx.counterparty ?? '');
    setFormDescription(tx.description ?? '');
    setFormReferenceNo(tx.referenceNo ?? '');
    setDialogOpen(true);
  };

  const handleSaveVoucher = async () => {
    const numAmount = Number(formAmount.replace(/,/g, ''));
    if (!numAmount || numAmount <= 0) {
      toaster.show({
        type: 'error',
        title: 'Vui lòng nhập số tiền hợp lệ lớn hơn 0',
      });
      return;
    }
    if (!formCategoryId) {
      toaster.show({
        type: 'error',
        title: 'Vui lòng chọn hạng mục thu/chi',
      });
      return;
    }
    if (!formAccountId) {
      toaster.show({
        type: 'error',
        title: 'Vui lòng chọn tài khoản quỹ',
      });
      return;
    }
    if (!formBranchId) {
      toaster.show({
        type: 'error',
        title: 'Vui lòng chọn cơ sở',
      });
      return;
    }

    try {
      const outcome = await submission.run(
        { action: editingId ? 'update' : 'create', id: editingId, amount: numAmount },
        async (key) => {
          if (editingId) {
            return api.request({
              path: `finance/transactions/${encodeURIComponent(editingId)}`,
              method: 'PATCH',
              json: {
                branchId: formBranchId,
                accountId: formAccountId,
                categoryId: formCategoryId,
                amount: numAmount,
                transactionDate: formDate,
                counterparty: formCounterparty.trim() || undefined,
                description: formDescription.trim() || undefined,
                referenceNo: formReferenceNo.trim() || undefined,
              },
              headers: {
                'Idempotency-Key': key,
              },
            });
          }

          return api.request({
            path: 'finance/transactions',
            method: 'POST',
            json: {
              type: voucherType,
              branchId: formBranchId,
              accountId: formAccountId,
              categoryId: formCategoryId,
              amount: numAmount,
              transactionDate: formDate,
              counterparty: formCounterparty.trim() || undefined,
              description: formDescription.trim() || undefined,
              referenceNo: formReferenceNo.trim() || undefined,
            },
            headers: {
              'Idempotency-Key': key,
            },
          });
        },
      );

      if (outcome) {
        toaster.show({
          type: 'success',
          title: t('finance.transactions.saveSuccess'),
        });
        setDialogOpen(false);
        void loadData();
      }
    } catch (err: unknown) {
      toaster.show({
        type: 'error',
        title: 'Lỗi khi lưu phiếu thu/chi',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingTransaction) return;
    try {
      const outcome = await submission.run(
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
    } catch (err: unknown) {
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
            onClick={() => openCreateDialog('income')}
          >
            <Plus className='size-4' />
            {t('finance.transactions.createIncome')}
          </Button>
          <Button
            variant='outline'
            className='border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50 gap-1.5'
            onClick={() => openCreateDialog('expense')}
          >
            <Minus className='size-4' />
            {t('finance.transactions.createExpense')}
          </Button>
        </div>
      </div>

      {/* Summary KPI Bar for filtered view */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='flex items-center justify-between rounded-xl border bg-card p-3 shadow-2xs'>
          <div className='text-xs text-muted-foreground'>Tổng thu danh sách:</div>
          <div className='font-bold text-emerald-600 dark:text-emerald-400'>
            +{formatVnd(currentTotalIncome)}
          </div>
        </div>
        <div className='flex items-center justify-between rounded-xl border bg-card p-3 shadow-2xs'>
          <div className='text-xs text-muted-foreground'>Tổng chi danh sách:</div>
          <div className='font-bold text-rose-600 dark:text-rose-400'>
            -{formatVnd(currentTotalExpense)}
          </div>
        </div>
        <div className='flex items-center justify-between rounded-xl border bg-card p-3 shadow-2xs'>
          <div className='text-xs text-muted-foreground'>Dòng tiền chênh lệch:</div>
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
              value={selectedBranchId}
              onValueChange={(val) => {
                if (typeof val === 'string') {
                  setSelectedBranchId(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className='h-9 w-full'>
                <SelectValue placeholder={t('finance.transactions.allBranches')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>{t('finance.transactions.allBranches')}</SelectItem>
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
                <SelectItem value='all'>{t('finance.transactions.allTypes')}</SelectItem>
                <SelectItem value='income'>{t('finance.transactions.income')}</SelectItem>
                <SelectItem value='expense'>{t('finance.transactions.expense')}</SelectItem>
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
              value={selectedAccountId}
              onValueChange={(val) => {
                if (typeof val === 'string') {
                  setSelectedAccountId(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className='h-8 w-48 text-xs'>
                <SelectValue placeholder={t('finance.transactions.allAccounts')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>{t('finance.transactions.allAccounts')}</SelectItem>
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
              <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
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
            <p className='text-base font-medium'>{t('finance.transactions.empty')}</p>
            <p className='text-xs mt-1'>Thử thay đổi bộ lọc hoặc tạo phiếu thu chi mới</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead className='w-28'>{t('finance.transactions.code')}</TableHead>
                  <TableHead className='w-24'>{t('finance.transactions.date')}</TableHead>
                  <TableHead className='w-20'>{t('finance.transactions.type')}</TableHead>
                  <TableHead className='w-36'>{t('finance.transactions.category')}</TableHead>
                  <TableHead className='text-right'>{t('finance.transactions.amount')}</TableHead>
                  <TableHead>{t('finance.transactions.account')}</TableHead>
                  <TableHead>{t('finance.transactions.branch')}</TableHead>
                  <TableHead>{t('finance.transactions.counterparty')}</TableHead>
                  <TableHead>{t('finance.transactions.description')}</TableHead>
                  <TableHead className='text-right w-20'>{t('finance.transactions.actions')}</TableHead>
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
                      {formatDate(tx.transactionDate || (tx as any).date)}
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
                      <Badge variant='secondary' className='text-[11px] font-normal'>
                        {tx.branchName ?? tx.branchId}
                      </Badge>
                    </TableCell>

                    {/* Counterparty */}
                    <TableCell className='text-xs max-w-36 truncate' title={tx.counterparty ?? ''}>
                      {tx.counterparty || '-'}
                    </TableCell>

                    {/* Description & Reference */}
                    <TableCell className='text-xs max-w-48 truncate text-muted-foreground' title={tx.description ?? ''}>
                      {tx.description || '-'}
                      {tx.referenceNo && (
                        <span className='ml-1 text-[10px] text-muted-foreground/80 font-mono'>
                          (Ref: {tx.referenceNo})
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          onClick={() => openEditDialog(tx)}
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t('finance.transactions.editVoucher')
                : voucherType === 'income'
                ? t('finance.transactions.createIncome')
                : t('finance.transactions.createExpense')}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Cập nhật thông tin chứng từ tài chính'
                : 'Lập chứng từ thu chi mới cho Công ty Cờ vua Dương Sinh'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-2'>
            {/* If creating: Type switcher */}
            {!editingId && (
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  type='button'
                  variant={voucherType === 'income' ? 'default' : 'outline'}
                  className={
                    voucherType === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : ''
                  }
                  onClick={() => {
                    setVoucherType('income');
                    if (options) {
                      const match = options.categories.find(
                        (c) => c.type === 'income' && c.isActive,
                      );
                      if (match) setFormCategoryId(match.id);
                    }
                  }}
                >
                  + Phiếu Thu
                </Button>
                <Button
                  type='button'
                  variant={voucherType === 'expense' ? 'destructive' : 'outline'}
                  onClick={() => {
                    setVoucherType('expense');
                    if (options) {
                      const match = options.categories.find(
                        (c) => c.type === 'expense' && c.isActive,
                      );
                      if (match) setFormCategoryId(match.id);
                    }
                  }}
                >
                  - Phiếu Chi
                </Button>
              </div>
            )}

            {/* Date and Amount */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.transactions.date')} *
                </label>
                <Input
                  type='date'
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className='mt-1'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.transactions.amount')} *
                </label>
                <Input
                  type='number'
                  placeholder='0'
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className='mt-1 font-semibold'
                />
                {formAmount && Number(formAmount) > 0 && (
                  <div className='mt-1 text-xs text-primary font-medium'>
                    = {formatVnd(Number(formAmount))}
                  </div>
                )}
              </div>
            </div>

            {/* Category and Account */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.transactions.category')} *
                </label>
                <Select
                  value={formCategoryId}
                  onValueChange={(val) => {
                    if (typeof val === 'string') setFormCategoryId(val);
                  }}
                >
                  <SelectTrigger className='mt-1 w-full'>
                    <SelectValue placeholder='Chọn hạng mục' />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.categories
                      .filter((c) => c.type === voucherType && c.isActive)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.transactions.account')} *
                </label>
                <Select
                  value={formAccountId}
                  onValueChange={(val) => {
                    if (typeof val === 'string') setFormAccountId(val);
                  }}
                >
                  <SelectTrigger className='mt-1 w-full'>
                    <SelectValue placeholder='Chọn quỹ / TK' />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.accounts
                      .filter((a) => a.isActive)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Branch and Counterparty */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.transactions.branch')} *
                </label>
                <Select
                  value={formBranchId}
                  onValueChange={(val) => {
                    if (typeof val === 'string') setFormBranchId(val);
                  }}
                >
                  <SelectTrigger className='mt-1 w-full'>
                    <SelectValue placeholder='Chọn cơ sở' />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.branches
                      .filter((b) => b.isActive)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.transactions.counterparty')}
                </label>
                <Input
                  placeholder='Học viên, Phụ huynh, Đối tác...'
                  value={formCounterparty}
                  onChange={(e) => setFormCounterparty(e.target.value)}
                  className='mt-1'
                />
              </div>
            </div>

            {/* Reference Bill No and Description */}
            <div>
              <label className='text-xs font-medium text-muted-foreground'>
                Mã giao dịch / Bill tham chiếu
              </label>
              <Input
                placeholder='Mã giao dịch ngân hàng, số ủy nhiệm chi...'
                value={formReferenceNo}
                onChange={(e) => setFormReferenceNo(e.target.value)}
                className='mt-1'
              />
            </div>

            <div>
              <label className='text-xs font-medium text-muted-foreground'>
                {t('finance.transactions.description')}
              </label>
              <Textarea
                placeholder='Nội dung chi tiết giao dịch...'
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className='mt-1'
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setDialogOpen(false)}
            >
              {t('finance.transactions.cancel')}
            </Button>
            <Button
              type='button'
              disabled={submission.submitting}
              onClick={() => void handleSaveVoucher()}
              className={
                voucherType === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : ''
              }
            >
              {submission.submitting
                ? t('finance.transactions.saving')
                : t('finance.transactions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <strong className='text-foreground'>{deletingTransaction?.code}</strong> - số tiền{' '}
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
