import { useApiClient, useSubmission, useToaster } from '@nocobase/app-client';
import { useTranslation } from '@nocobase/i18n/client';
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Wallet,
  Building2,
  Calendar,
  ReceiptText,
  Plus,
  Minus,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router';
import { cn } from 'cn';

import { Loading } from '#components/loading';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Button, buttonVariants } from '#components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#components/ui/card';
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
  FinanceOverviewData,
  FinanceOptionsData,
  TransactionType,
} from './types.js';

export default function FinanceOverviewPage(): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();

  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<FinanceOverviewData | null>(null);
  const [options, setOptions] = useState<FinanceOptionsData | null>(null);

  // Quick transaction dialog state
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [voucherType, setVoucherType] = useState<TransactionType>('income');
  const [formDate, setFormDate] = useState<string>(getTodayDate());
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formAccountId, setFormAccountId] = useState<string>('');
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [formCounterparty, setFormCounterparty] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formReferenceNo, setFormReferenceNo] = useState<string>('');

  const submission = useSubmission({ scope: 'finance-quick-voucher' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (month) queryParams.set('month', month);
      if (selectedBranchId !== 'all') queryParams.set('branchId', selectedBranchId);

      const [overviewRes, optionsRes] = await Promise.all([
        api.request<{ data: FinanceOverviewData }>({
          path: `finance/overview?${queryParams.toString()}`,
        }),
        api.request<{ data: FinanceOptionsData }>({
          path: 'finance/options',
        }),
      ]);

      setOverview(overviewRes.data);
      setOptions(optionsRes.data);
    } catch (err: unknown) {
      toaster.show({
        type: 'error',
        title: 'Không thể tải dữ liệu tài chính',
      });
    } finally {
      setLoading(false);
    }
  }, [api, month, selectedBranchId, toaster]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateDialog = (type: TransactionType) => {
    setVoucherType(type);
    setFormDate(getTodayDate());
    setFormAmount('');
    setFormCounterparty('');
    setFormDescription('');
    setFormReferenceNo('');

    // Pre-select defaults
    if (options) {
      const matchingCats = options.categories.filter((c) => c.type === type && c.isActive);
      if (matchingCats.length > 0) setFormCategoryId(matchingCats[0]!.id);
      if (options.accounts.length > 0) setFormAccountId(options.accounts[0]!.id);
      if (options.branches.length > 0) setFormBranchId(options.branches[0]!.id);
    }

    setDialogOpen(true);
  };

  const handleCreateVoucher = async () => {
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
        { action: 'create-voucher', type: voucherType, amount: numAmount },
        async (key) => {
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

  const shiftMonth = (delta: number) => {
    const [yStr, mStr] = month.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const date = new Date(y, m - 1 + delta, 1);
    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, '0');
    setMonth(`${nextY}-${nextM}`);
  };

  const branches = overview?.branches || [];
  const accounts = overview?.accounts || [];
  const incomeCategories: FinanceOverviewData['incomeCategories'] =
    overview?.incomeCategories || (overview as any)?.breakdown?.income || [];
  const expenseCategories: FinanceOverviewData['expenseCategories'] =
    overview?.expenseCategories || (overview as any)?.breakdown?.expense || [];
  const dailyFlow: FinanceOverviewData['dailyFlow'] =
    overview?.dailyFlow || (overview as any)?.timeline || [];

  return (
    <PageContainer className='space-y-6'>
      {/* Header with Title and Actions */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <PageHeader
          title={t('finance.overview.title')}
          description={t('finance.overview.subtitle')}
        />
        <div className='flex flex-wrap items-center gap-2'>
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
          <Link
            to='/finance/transactions'
            className={cn(buttonVariants({ variant: 'secondary' }), 'gap-1.5')}
          >
            <ReceiptText className='size-4' />
            {t('finance.navigation.transactions')}
          </Link>
        </div>
      </div>

      {/* Filter and Period Bar */}
      <div className='flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs'>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='flex items-center gap-2'>
            <Calendar className='size-4 text-muted-foreground' />
            <span className='text-sm font-medium'>{t('finance.overview.period')}:</span>
            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                size='icon-sm'
                onClick={() => shiftMonth(-1)}
                title='Tháng trước'
              >
                &larr;
              </Button>
              <Input
                type='month'
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className='w-36 h-8 text-sm'
              />
              <Button
                variant='outline'
                size='icon-sm'
                onClick={() => shiftMonth(1)}
                title='Tháng sau'
              >
                &rarr;
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setMonth(getCurrentMonth())}
                className='text-xs text-muted-foreground'
              >
                {t('finance.overview.currentMonth')}
              </Button>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Building2 className='size-4 text-muted-foreground' />
            <span className='text-sm font-medium'>{t('finance.overview.branch')}:</span>
            <Select
              value={selectedBranchId}
              onValueChange={(val) => {
                if (typeof val === 'string') setSelectedBranchId(val);
              }}
            >
              <SelectTrigger className='w-44 h-8'>
                <SelectValue placeholder={t('finance.overview.allBranches')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>{t('finance.overview.allBranches')}</SelectItem>
                {options?.branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant='ghost'
          size='sm'
          onClick={() => void loadData()}
          disabled={loading}
          className='gap-1.5'
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {loading && !overview ? (
        <Loading />
      ) : overview ? (
        <>
          {/* 4 KPI Cards */}
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {/* Total Income */}
            <Card className='border-emerald-200/60 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10'>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  {t('finance.overview.totalIncome')}
                </CardTitle>
                <div className='rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'>
                  <TrendingUp className='size-4' />
                </div>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-emerald-700 dark:text-emerald-400'>
                  {formatVnd(overview.totalIncome)}
                </div>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Kỳ tháng {overview.period}
                </p>
              </CardContent>
            </Card>

            {/* Total Expense */}
            <Card className='border-rose-200/60 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/10'>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  {t('finance.overview.totalExpense')}
                </CardTitle>
                <div className='rounded-full bg-rose-100 p-2 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'>
                  <TrendingDown className='size-4' />
                </div>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-rose-700 dark:text-rose-400'>
                  {formatVnd(overview.totalExpense)}
                </div>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Kỳ tháng {overview.period}
                </p>
              </CardContent>
            </Card>

            {/* Net Cash Flow */}
            <Card
              className={
                overview.netFlow >= 0
                  ? 'border-blue-200/60 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/10'
                  : 'border-amber-200/60 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10'
              }
            >
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  {t('finance.overview.netFlow')}
                </CardTitle>
                <div
                  className={`rounded-full p-2 ${
                    overview.netFlow >= 0
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                  }`}
                >
                  <Wallet className='size-4' />
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    overview.netFlow >= 0
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {formatVnd(overview.netFlow)}
                </div>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Thu trừ Chi tháng {overview.period}
                </p>
              </CardContent>
            </Card>

            {/* Total Available Funds */}
            <Card className='border-indigo-200/60 bg-indigo-50/30 dark:border-indigo-900/40 dark:bg-indigo-950/10'>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  {t('finance.overview.totalAvailableFunds')}
                </CardTitle>
                <div className='rounded-full bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400'>
                  <Landmark className='size-4' />
                </div>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-indigo-700 dark:text-indigo-400'>
                  {formatVnd(overview.totalAvailableFunds)}
                </div>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Tổng số dư thực tế tất cả các quỹ
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 2 Columns: Branches Comparison & Fund Accounts */}
          <div className='grid gap-6 lg:grid-cols-2'>
            {/* Branches Performance */}
            <Card>
              <CardHeader className='flex flex-row items-center justify-between'>
                <div>
                  <CardTitle className='text-base font-semibold'>
                    {t('finance.overview.branchesPerformance')}
                  </CardTitle>
                  <CardDescription>
                    Hiệu quả dòng tiền giữa 2 cơ sở đào tạo cờ vua
                  </CardDescription>
                </div>
                <Link
                  to='/finance/branches'
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1 text-xs')}
                >
                  Quản lý <ArrowRight className='size-3' />
                </Link>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {branches.map((b) => (
                    <div
                      key={b.id}
                      className='rounded-lg border p-4 transition-colors hover:bg-muted/30'
                    >
                      <div className='flex items-center justify-between pb-2 border-b'>
                        <div className='flex items-center gap-2'>
                          <Building2 className='size-4 text-primary' />
                          <span className='font-semibold'>{b.name}</span>
                          <Badge variant='outline' className='text-xs'>
                            {b.code}
                          </Badge>
                        </div>
                        <Badge
                          variant={b.net >= 0 ? 'default' : 'destructive'}
                          className={b.net >= 0 ? 'bg-emerald-600' : ''}
                        >
                          Ròng: {formatVnd(b.net)}
                        </Badge>
                      </div>
                      <div className='grid grid-cols-2 gap-2 pt-3 text-sm'>
                        <div>
                          <span className='text-muted-foreground'>Tổng thu: </span>
                          <span className='font-medium text-emerald-600 dark:text-emerald-400'>
                            +{formatVnd(b.income)}
                          </span>
                        </div>
                        <div>
                          <span className='text-muted-foreground'>Tổng chi: </span>
                          <span className='font-medium text-rose-600 dark:text-rose-400'>
                            -{formatVnd(b.expense)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {branches.length === 0 && (
                    <div className='text-center py-6 text-sm text-muted-foreground'>
                      Chưa có dữ liệu cơ sở
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fund Accounts & Current Balances */}
            <Card>
              <CardHeader className='flex flex-row items-center justify-between'>
                <div>
                  <CardTitle className='text-base font-semibold'>
                    {t('finance.overview.accountsList')}
                  </CardTitle>
                  <CardDescription>
                    Số dư thực tế trong tài khoản ngân hàng & két tiền mặt
                  </CardDescription>
                </div>
                <Link
                  to='/finance/accounts'
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1 text-xs')}
                >
                  Quản lý <ArrowRight className='size-3' />
                </Link>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className='flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='rounded-md bg-primary/10 p-2 text-primary'>
                          {acc.kind === 'bank' ? (
                            <Landmark className='size-5' />
                          ) : (
                            <Wallet className='size-5' />
                          )}
                        </div>
                        <div>
                          <div className='font-medium'>{acc.name}</div>
                          <div className='text-xs text-muted-foreground'>
                            {acc.kind === 'bank'
                              ? `${acc.bankName ?? ''} - ${acc.accountNumber ?? ''}`
                              : 'Két tiền mặt cơ sở'}
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='text-base font-bold text-foreground'>
                          {formatVnd(acc.currentBalance)}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          Đầu kỳ: {formatVnd(acc.openingBalance)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Income & Expense Breakdown */}
          <div className='grid gap-6 lg:grid-cols-2'>
            {/* Income Structure */}
            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold text-emerald-700 dark:text-emerald-400'>
                  {t('finance.overview.incomeBreakdown')}
                </CardTitle>
                <CardDescription>Phân loại các nguồn thu trong tháng</CardDescription>
              </CardHeader>
              <CardContent>
                {incomeCategories.length === 0 ? (
                  <div className='py-6 text-center text-sm text-muted-foreground'>
                    Không có khoản thu nào trong kỳ này
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {incomeCategories.map((cat) => {
                      const pct =
                        overview.totalIncome > 0
                          ? Math.round((cat.total / overview.totalIncome) * 100)
                          : 0;
                      return (
                        <div key={cat.code} className='space-y-1'>
                          <div className='flex justify-between text-sm'>
                            <span className='font-medium'>{cat.name}</span>
                            <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                              {formatVnd(cat.total)} ({pct}%)
                            </span>
                          </div>
                          <div className='h-2 w-full overflow-hidden rounded-full bg-secondary'>
                            <div
                              className='h-full bg-emerald-500 rounded-full'
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Structure */}
            <Card>
              <CardHeader>
                <CardTitle className='text-base font-semibold text-rose-700 dark:text-rose-400'>
                  {t('finance.overview.expenseBreakdown')}
                </CardTitle>
                <CardDescription>Phân loại các khoản chi phí trong tháng</CardDescription>
              </CardHeader>
              <CardContent>
                {expenseCategories.length === 0 ? (
                  <div className='py-6 text-center text-sm text-muted-foreground'>
                    Không có khoản chi nào trong kỳ này
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {expenseCategories.map((cat) => {
                      const pct =
                        overview.totalExpense > 0
                          ? Math.round((cat.total / overview.totalExpense) * 100)
                          : 0;
                      return (
                        <div key={cat.code} className='space-y-1'>
                          <div className='flex justify-between text-sm'>
                            <span className='font-medium'>{cat.name}</span>
                            <span className='font-semibold text-rose-600 dark:text-rose-400'>
                              {formatVnd(cat.total)} ({pct}%)
                            </span>
                          </div>
                          <div className='h-2 w-full overflow-hidden rounded-full bg-secondary'>
                            <div
                              className='h-full bg-rose-500 rounded-full'
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Flow Table */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base font-semibold'>
                {t('finance.overview.dailyFlow')}
              </CardTitle>
              <CardDescription>Dòng tiền biến động theo từng ngày trong tháng</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyFlow.length === 0 ? (
                <div className='py-6 text-center text-sm text-muted-foreground'>
                  Không có phát sinh giao dịch trong tháng {overview.period}
                </div>
              ) : (
                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead className='text-right'>Tổng thu</TableHead>
                        <TableHead className='text-right'>Tổng chi</TableHead>
                        <TableHead className='text-right'>Dòng tiền ròng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyFlow.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className='font-medium'>{formatDate(day.date)}</TableCell>
                          <TableCell className='text-right font-medium text-emerald-600 dark:text-emerald-400'>
                            {day.income > 0 ? `+${formatVnd(day.income)}` : '-'}
                          </TableCell>
                          <TableCell className='text-right font-medium text-rose-600 dark:text-rose-400'>
                            {day.expense > 0 ? `-${formatVnd(day.expense)}` : '-'}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              day.net >= 0
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {formatVnd(day.net)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Quick Create Voucher Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {voucherType === 'income'
                ? t('finance.transactions.createIncome')
                : t('finance.transactions.createExpense')}
            </DialogTitle>
            <DialogDescription>
              Lập chứng từ thu chi trực tiếp cho Công ty Cờ vua Dương Sinh
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-2'>
            {/* Voucher Type selection */}
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
                placeholder='Mã giao dịch ngân hàng, số hóa đơn...'
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
                placeholder='Nội dung chi tiết (ví dụ: Thu học phí khóa K12 bạn An)...'
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
              onClick={() => void handleCreateVoucher()}
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
    </PageContainer>
  );
}
