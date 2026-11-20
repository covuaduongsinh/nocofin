import { useApiClient, useSubmission, useToaster } from '@nocobase/app-client';
import { useTranslation } from '@nocobase/i18n/client';
import {
  Landmark,
  Wallet,
  Plus,
  Edit2,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { Loading } from '#components/loading';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Button } from '#components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card';
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
import { Switch } from '#components/ui/switch';
import { Textarea } from '#components/ui/textarea';

import { formatVnd } from './format.js';
import type { FinanceAccount } from './types.js';

export default function FinanceAccountsPage(): ReactElement {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();

  const [loading, setLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formKind, setFormKind] = useState<'bank' | 'cash' | 'ewallet'>('bank');
  const [formBankName, setFormBankName] = useState<string>('');
  const [formAccountNumber, setFormAccountNumber] = useState<string>('');
  const [formOpeningBalance, setFormOpeningBalance] = useState<string>('0');
  const [formNote, setFormNote] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const submission = useSubmission({ scope: 'finance-account-mutation' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<{ data: FinanceAccount[] }>({
        path: 'finance/accounts',
      });
      setAccounts(res.data);
    } catch (err: unknown) {
      toaster.show({
        type: 'error',
        title: 'Không thể tải danh sách tài khoản quỹ',
      });
    } finally {
      setLoading(false);
    }
  }, [api, toaster]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Aggregate stats
  const totalFunds = accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  const bankFunds = accounts
    .filter((a) => a.kind === 'bank' && a.isActive)
    .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  const cashFunds = accounts
    .filter((a) => a.kind === 'cash' && a.isActive)
    .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);

  const openCreateDialog = () => {
    setEditingAccount(null);
    setFormCode('');
    setFormName('');
    setFormKind('bank');
    setFormBankName('');
    setFormAccountNumber('');
    setFormOpeningBalance('0');
    setFormNote('');
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (acc: FinanceAccount) => {
    setEditingAccount(acc);
    setFormCode(acc.code);
    setFormName(acc.name);
    setFormKind(acc.kind);
    setFormBankName(acc.bankName ?? '');
    setFormAccountNumber(acc.accountNumber ?? '');
    setFormOpeningBalance(String(acc.openingBalance));
    setFormNote(acc.note ?? '');
    setFormIsActive(acc.isActive);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formCode.trim()) {
      toaster.show({ type: 'error', title: 'Vui lòng nhập mã tài khoản' });
      return;
    }
    if (!formName.trim()) {
      toaster.show({ type: 'error', title: 'Vui lòng nhập tên tài khoản' });
      return;
    }

    const openingNum = Number(formOpeningBalance.replace(/,/g, '')) || 0;

    try {
      const outcome = await submission.run(
        { action: editingAccount ? 'update-account' : 'create-account' },
        async (key) => {
          if (editingAccount) {
            return api.request({
              path: `finance/accounts/${encodeURIComponent(editingAccount.id)}`,
              method: 'PATCH',
              json: {
                name: formName.trim(),
                kind: formKind,
                bankName: formBankName.trim() || null,
                accountNumber: formAccountNumber.trim() || null,
                openingBalance: openingNum,
                note: formNote.trim() || null,
                isActive: formIsActive,
              },
              headers: { 'Idempotency-Key': key },
            });
          }

          return api.request({
            path: 'finance/accounts',
            method: 'POST',
            json: {
              code: formCode.trim().toUpperCase(),
              name: formName.trim(),
              kind: formKind,
              bankName: formBankName.trim() || null,
              accountNumber: formAccountNumber.trim() || null,
              openingBalance: openingNum,
              note: formNote.trim() || null,
              isActive: formIsActive,
            },
            headers: { 'Idempotency-Key': key },
          });
        },
      );

      if (outcome) {
        toaster.show({
          type: 'success',
          title: editingAccount ? 'Cập nhật tài khoản thành công' : 'Thêm tài khoản quỹ thành công',
        });
        setDialogOpen(false);
        void loadData();
      }
    } catch (err: unknown) {
      toaster.show({
        type: 'error',
        title: 'Lỗi khi lưu tài khoản quỹ',
      });
    }
  };

  return (
    <PageContainer className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <PageHeader
          title={t('finance.accounts.title')}
          description={t('finance.accounts.subtitle')}
        />
        <div className='flex items-center gap-2'>
          <Button
            variant='default'
            onClick={openCreateDialog}
            className='bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5'
          >
            <Plus className='size-4' />
            {t('finance.accounts.addAccount')}
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void loadData()}
            disabled={loading}
            className='gap-1.5'
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Aggregate KPI cards */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card className='border-indigo-200/60 bg-indigo-50/20 dark:border-indigo-900/40 dark:bg-indigo-950/10'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xs font-medium text-muted-foreground'>
              Tổng quỹ tiền khả dụng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-indigo-700 dark:text-indigo-400'>
              {formatVnd(totalFunds)}
            </div>
          </CardContent>
        </Card>

        <Card className='border-blue-200/60 bg-blue-50/20 dark:border-blue-900/40 dark:bg-blue-950/10'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xs font-medium text-muted-foreground'>
              Số dư Tài khoản Ngân hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-700 dark:text-blue-400'>
              {formatVnd(bankFunds)}
            </div>
          </CardContent>
        </Card>

        <Card className='border-emerald-200/60 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-xs font-medium text-muted-foreground'>
              Số dư Quỹ Tiền mặt các cơ sở
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-emerald-700 dark:text-emerald-400'>
              {formatVnd(cashFunds)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List Table */}
      <div className='rounded-xl border bg-card shadow-xs overflow-hidden'>
        {loading && accounts.length === 0 ? (
          <div className='p-8'>
            <Loading />
          </div>
        ) : accounts.length === 0 ? (
          <div className='py-12 text-center text-muted-foreground'>
            Chưa có tài khoản quỹ nào được tạo
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50'>
                <TableHead className='w-28'>{t('finance.accounts.code')}</TableHead>
                <TableHead>{t('finance.accounts.name')}</TableHead>
                <TableHead>{t('finance.accounts.kind')}</TableHead>
                <TableHead>{t('finance.accounts.bankName')} / STK</TableHead>
                <TableHead className='text-right'>{t('finance.accounts.openingBalance')}</TableHead>
                <TableHead className='text-right'>{t('finance.accounts.currentBalance')}</TableHead>
                <TableHead className='text-center w-24'>{t('finance.accounts.status')}</TableHead>
                <TableHead className='text-right w-20'>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((acc) => (
                <TableRow key={acc.id} className='hover:bg-muted/30'>
                  <TableCell className='font-mono text-xs font-semibold'>
                    {acc.code}
                  </TableCell>
                  <TableCell className='font-medium'>
                    <div className='flex items-center gap-2'>
                      {acc.kind === 'bank' ? (
                        <Landmark className='size-4 text-blue-600' />
                      ) : (
                        <Wallet className='size-4 text-emerald-600' />
                      )}
                      <span>{acc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className='text-xs'>
                    {acc.kind === 'bank'
                      ? t('finance.accounts.bank')
                      : acc.kind === 'cash'
                      ? t('finance.accounts.cash')
                      : t('finance.accounts.ewallet')}
                  </TableCell>
                  <TableCell className='text-xs text-muted-foreground'>
                    {acc.kind === 'bank' && acc.bankName ? (
                      <div>
                        <span className='font-medium text-foreground'>{acc.bankName}</span>
                        {acc.accountNumber && ` - ${acc.accountNumber}`}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className='text-right text-xs text-muted-foreground'>
                    {formatVnd(acc.openingBalance)}
                  </TableCell>
                  <TableCell className='text-right font-bold text-foreground'>
                    {formatVnd(acc.currentBalance)}
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant={acc.isActive ? 'outline' : 'secondary'}
                      className={
                        acc.isActive
                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/40'
                          : 'text-muted-foreground'
                      }
                    >
                      {acc.isActive ? t('finance.accounts.active') : t('finance.accounts.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      onClick={() => openEditDialog(acc)}
                      title='Chỉnh sửa'
                    >
                      <Edit2 className='size-3.5 text-muted-foreground hover:text-foreground' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add / Edit Account Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingAccount
                ? t('finance.accounts.editAccount')
                : t('finance.accounts.addAccount')}
            </DialogTitle>
            <DialogDescription>
              Thiết lập thông tin tài khoản ngân hàng hoặc quỹ tiền mặt
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-2'>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.accounts.code')} *
                </label>
                <Input
                  placeholder='TK-BANK-02'
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  disabled={Boolean(editingAccount)}
                  className='mt-1 uppercase font-mono text-sm'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-muted-foreground'>
                  {t('finance.accounts.kind')} *
                </label>
                <Select
                  value={formKind}
                  onValueChange={(val) => {
                    if (val === 'bank' || val === 'cash' || val === 'ewallet') {
                      setFormKind(val);
                    }
                  }}
                >
                  <SelectTrigger className='mt-1 w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='bank'>{t('finance.accounts.bank')}</SelectItem>
                    <SelectItem value='cash'>{t('finance.accounts.cash')}</SelectItem>
                    <SelectItem value='ewallet'>{t('finance.accounts.ewallet')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className='text-xs font-medium text-muted-foreground'>
                {t('finance.accounts.name')} *
              </label>
              <Input
                placeholder='Tài khoản MB Bank - Công ty Cờ vua Dương Sinh'
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className='mt-1'
              />
            </div>

            {formKind === 'bank' && (
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='text-xs font-medium text-muted-foreground'>
                    {t('finance.accounts.bankName')}
                  </label>
                  <Input
                    placeholder='MB Bank, Vietcombank...'
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    className='mt-1'
                  />
                </div>
                <div>
                  <label className='text-xs font-medium text-muted-foreground'>
                    {t('finance.accounts.accountNumber')}
                  </label>
                  <Input
                    placeholder='Số tài khoản'
                    value={formAccountNumber}
                    onChange={(e) => setFormAccountNumber(e.target.value)}
                    className='mt-1 font-mono'
                  />
                </div>
              </div>
            )}

            <div>
              <label className='text-xs font-medium text-muted-foreground'>
                {t('finance.accounts.openingBalance')}
              </label>
              <Input
                type='number'
                placeholder='0'
                value={formOpeningBalance}
                onChange={(e) => setFormOpeningBalance(e.target.value)}
                className='mt-1 font-semibold'
              />
              {formOpeningBalance && (
                <div className='mt-1 text-xs text-primary font-medium'>
                  = {formatVnd(Number(formOpeningBalance))}
                </div>
              )}
            </div>

            <div>
              <label className='text-xs font-medium text-muted-foreground'>
                {t('finance.accounts.note')}
              </label>
              <Textarea
                placeholder='Ghi chú về tài khoản này...'
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                rows={2}
                className='mt-1'
              />
            </div>

            <div className='flex items-center justify-between rounded-lg border p-3'>
              <div>
                <div className='text-sm font-medium'>Kích hoạt sử dụng</div>
                <div className='text-xs text-muted-foreground'>
                  Cho phép chọn tài khoản này khi lập phiếu thu chi
                </div>
              </div>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type='button'
              disabled={submission.submitting}
              onClick={() => void handleSave()}
            >
              {submission.submitting ? 'Đang lưu...' : t('finance.accounts.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
